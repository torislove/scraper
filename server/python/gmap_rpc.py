"""
server/python/gmap_rpc.py
High-Speed Parallel Google Maps `tbm=map` Paginator, Place Lookup, JustDial TLS & YellowPages TLS.
Uses curl_cffi Chrome impersonation + ThreadPoolExecutor with zero Chromium browsers.
"""

import base64
import json
import re
import threading
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    import phonenumbers
except ImportError:
    phonenumbers = None

try:
    import h3
except ImportError:
    h3 = None

COUNTRY_GL_HL = {
    "IN": ("in", "en"),
    "US": ("us", "en"),
    "GB": ("gb", "en"),
    "UK": ("gb", "en"),
    "AU": ("au", "en"),
    "CA": ("ca", "en"),
    "DE": ("de", "de"),
    "FR": ("fr", "fr"),
    "AE": ("ae", "en"),
    "SG": ("sg", "en"),
    "NZ": ("nz", "en"),
    "IE": ("ie", "en"),
}

COUNTRY_DEFAULT_COORDS = {
    "IN": (19.0760, 72.8777),
    "US": (40.7128, -74.0060),
    "GB": (51.5074, -0.1278),
    "AU": (-33.8688, 151.2093),
    "CA": (43.6532, -79.3832),
    "DE": (52.5200, 13.4050),
    "FR": (48.8566, 2.3522),
    "AE": (25.2048, 55.2708),
    "SG": (1.3521, 103.8198),
    "NZ": (-36.8485, 174.7633),
    "IE": (53.3498, -6.2603),
}


_TLS_LOCAL = threading.local()


def _get_session():
    if curl_requests is None:
        return None
    sess = getattr(_TLS_LOCAL, "session", None)
    if sess is None:
        sess = curl_requests.Session(impersonate="chrome")
        _TLS_LOCAL.session = sess
    return sess


def _http_get(url, timeout=6):
    sess = _get_session()
    if sess is None:
        return ""
    try:
        r = sess.get(url, timeout=timeout)
        return r.text if r.status_code == 200 else ""
    except Exception:
        return ""


_IN_MOBILE_FALLBACK_RE = re.compile(r'(?:(?:\+|00)?91|0)[\s.-]*([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{9})\b')


def _extract_phones_from_place(p, country="IN"):
    phones = []
    seen = set()
    cc = str(country or "IN").upper()

    def add_phone(val):
        s = str(val or "").replace("tel:", "").strip()
        if not s or len(s) < 7 or len(s) > 28:
            return
        digits = re.sub(r"\D", "", s)[-10:]
        if not digits or len(digits) < 7 or digits in seen:
            return
        seen.add(digits)
        phones.append(s)

    if len(p) > 178 and isinstance(p[178], list):
        for entry in p[178]:
            if isinstance(entry, list) and entry:
                if len(entry) > 1 and isinstance(entry[1], list):
                    for fmt in entry[1]:
                        if isinstance(fmt, list) and fmt and isinstance(fmt[0], str):
                            add_phone(fmt[0])
                add_phone(entry[0])
                if len(entry) > 3:
                    add_phone(entry[3])

    def walk(obj, depth=0):
        if depth > 6:
            return
        if isinstance(obj, str):
            if obj.startswith("tel:"):
                add_phone(obj)
            elif not obj.startswith("http") and 7 <= len(obj) <= 36 and any(c.isdigit() for c in obj):
                if phonenumbers is not None:
                    try:
                        parsed = phonenumbers.parse(obj, cc)
                        if phonenumbers.is_valid_number(parsed):
                            add_phone(phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164))
                            return
                    except Exception:
                        pass
                if cc == "IN":
                    m = _IN_MOBILE_FALLBACK_RE.search(obj)
                    if m:
                        add_phone(m.group(0))
        elif isinstance(obj, list):
            for x in obj:
                walk(x, depth + 1)

    walk(p)
    return phones


def _extract_business_status(p):
    """Detects Permanently/Temporarily closed markers in Google Maps protobuf arrays."""
    try:
        blob = json.dumps(p[:90] if len(p) > 90 else p, ensure_ascii=False).lower()
        if "permanently closed" in blob:
            return "CLOSED_PERMANENTLY"
        if "temporarily closed" in blob:
            return "CLOSED_TEMPORARILY"
    except Exception:
        pass
    return "OPERATIONAL"


def _parse_gmap_items(raw_text, country="IN", default_category=""):
    if not raw_text:
        return []
    clean = raw_text.lstrip(")]}'\n ")
    try:
        data = json.loads(clean)
    except Exception:
        return []

    items = data[0][1] if isinstance(data, list) and data and isinstance(data[0], list) and len(data[0]) > 1 and isinstance(data[0][1], list) else []
    places = []
    for entry in items:
        if not isinstance(entry, list) or len(entry) < 15 or not isinstance(entry[14], list):
            continue
        p = entry[14]
        name = str(p[11]).strip() if len(p) > 11 and p[11] else ""
        if not name:
            continue
        b_status = _extract_business_status(p)
        if b_status == "CLOSED_PERMANENTLY":
            continue

        phones = _extract_phones_from_place(p, country)
        primary_phone = phones[0] if phones else ""
        # Prefer +91 / 0-prefixed mobile or intl (+...) phone as primary if present
        for ph in phones:
            digits_only = re.sub(r"\D", "", ph)
            if str(country or "IN").upper() == "IN" and (
                (len(digits_only) == 11 and digits_only.startswith("0") and digits_only[1] in "6789")
                or (len(digits_only) == 12 and digits_only.startswith("91") and digits_only[2] in "6789")
                or (len(digits_only) == 10 and digits_only[0] in "6789")
            ):
                primary_phone = ph
                break
            if ph.startswith("+"):
                primary_phone = ph
                break

        website = str(p[7][0]).strip() if len(p) > 7 and isinstance(p[7], list) and p[7] and isinstance(p[7][0], str) else ""
        lat = p[9][2] if len(p) > 9 and isinstance(p[9], list) and len(p[9]) > 3 else None
        lng = p[9][3] if len(p) > 9 and isinstance(p[9], list) and len(p[9]) > 3 else None
        place_id = str(p[78]).strip() if len(p) > 78 and isinstance(p[78], str) else ""
        cats = p[13] if len(p) > 13 and isinstance(p[13], list) else []
        category = str(cats[0]).strip() if cats else ""
        locality = str(p[14]).strip() if len(p) > 14 and isinstance(p[14], str) else ""

        addr_parts = [str(x).strip() for x in p[2]] if len(p) > 2 and isinstance(p[2], list) else []
        address = ", ".join([a for a in addr_parts if a])
        if not address and len(p) > 18 and isinstance(p[18], str):
            address = p[18].replace(name, "").lstrip(", ").strip()

        rating = None
        reviews_count = None
        if len(p) > 4 and isinstance(p[4], list):
            if len(p[4]) > 7 and isinstance(p[4][7], (int, float)):
                rating = float(p[4][7])
            if len(p[4]) > 8 and isinstance(p[4][8], (int, float)):
                reviews_count = int(p[4][8])

        maps_link = f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else (
            f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(name + ' ' + locality)}"
        )

        places.append({
            "name": name,
            "phone": primary_phone,
            "phones": phones,
            "website": website,
            "address": address,
            "locality": locality,
            "lat": lat,
            "lng": lng,
            "rating": rating,
            "reviewsCount": reviews_count,
            "businessStatus": b_status,
            "placeId": place_id,
            "mapsLink": maps_link,
            "category": category,
            "country": country.upper(),
            "source": "gmap_direct_rpc",
        })
    return places


def _fetch_gmap_offset(query, lat, lng, country="IN", offset=0, radius_m=12000):
    cc = str(country or "IN").upper()
    gl, hl = COUNTRY_GL_HL.get(cc, ("in", "en"))
    if lat is None or lng is None:
        lat, lng = COUNTRY_DEFAULT_COORDS.get(cc, (19.0760, 72.8777))
    pb = f"!4m12!1m3!1d{int(max(3000, radius_m))}!2d{lng}!3d{lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!7i20!8i{int(offset)}!10b1!12m8!1m1!18b1!2m3!5m1!6e2!20e3!10b1!16b1!19m4!2m3!1i360!2i120!4i8"
    url = f"https://www.google.com/search?tbm=map&authuser=0&hl={hl}&gl={gl}&pb={pb}&q={urllib.parse.quote(query)}"
    raw = _http_get(url, timeout=6)
    return _parse_gmap_items(raw, cc, query)


def scrape_gmap_paginated(query, lat=None, lng=None, country="IN", max_pages=6, radius_m=12000):
    if not query or curl_requests is None:
        return []
    pages = max(1, min(7, int(max_pages)))
    all_places = []
    seen = set()

    def collect(batches):
        added = 0
        for batch in batches:
            for item in batch:
                key = item.get("placeId") or f"{item['name'].lower()}::{(item.get('phone') or '')}"
                if key in seen:
                    continue
                seen.add(key)
                all_places.append(item)
                added += 1
        return added

    # Adaptive Stage 1: fetch offsets 0 & 20 first (~400ms). Only fan deeper if zone is dense (>= 14 results).
    stage1_offsets = [i * 20 for i in range(min(2, pages))]
    with ThreadPoolExecutor(max_workers=len(stage1_offsets)) as pool:
        s1_res = list(pool.map(lambda off: _fetch_gmap_offset(query, lat, lng, country, off, radius_m), stage1_offsets))
    s1_count = collect(s1_res)

    if pages > 2 and s1_count >= 14:
        stage2_offsets = [i * 20 for i in range(2, pages)]
        with ThreadPoolExecutor(max_workers=min(4, len(stage2_offsets))) as pool:
            s2_res = list(pool.map(lambda off: _fetch_gmap_offset(query, lat, lng, country, off, radius_m), stage2_offsets))
        collect(s2_res)

    # Adaptive H3 Cell Subdivision: when dense metros saturate near ~95+ results, sweep 6 child hex centers
    if h3 is not None and lat is not None and lng is not None and len(all_places) >= 90 and pages >= 4:
        try:
            center_cell = h3.latlng_to_cell(float(lat), float(lng), 7)
            ring = [c for c in h3.grid_ring(center_cell, 1) if c != center_cell][:6]
            sub_centers = [h3.cell_to_latlng(c) for c in ring]
            with ThreadPoolExecutor(max_workers=min(3, len(sub_centers))) as pool:
                sub_res = list(pool.map(lambda pt: _fetch_gmap_offset(query, pt[0], pt[1], country, 0, max(2500, int(radius_m // 2))), sub_centers))
            collect(sub_res)
        except Exception:
            pass

    return all_places


def _rescue_place_page_phones(place_id, country="IN"):
    if not place_id:
        return []
    cc = str(country or "IN").upper()
    gl, hl = COUNTRY_GL_HL.get(cc, ("in", "en"))
    url = f"https://www.google.com/maps/place/?q=place_id:{urllib.parse.quote(place_id)}&hl={hl}&gl={gl}"
    html = _http_get(url, timeout=6)
    if not html:
        return []
    found = []
    for m in re.findall(r'tel:([^"\'\s<>]+)', html, re.I):
        if m not in found:
            found.append(m)
    if cc == "IN":
        for m in re.findall(r'(?:(?:\+|00)?91|0)[\s.-]*[6-9]\d{4}[\s.-]?\d{5}', html):
            if m not in found:
                found.append(m)
    elif cc == "GB":
        for m in re.findall(r'(?:\+44\s?|0)(?:20|1\d{2,3}|7\d{3}|8\d{2})[\s.-]?\d{3,4}[\s.-]?\d{3,4}', html):
            if m not in found:
                found.append(m)
    return found[:5]


def _pick_best_place(items, name, place_id):
    if not items:
        return None
    target_tokens = set(re.findall(r"[a-z0-9]{3,}", name.lower()))
    best = items[0]
    best_score = -1
    for item in items[:5]:
        if place_id and item.get("placeId") == place_id:
            return item
        cand_tokens = set(re.findall(r"[a-z0-9]{3,}", item["name"].lower()))
        score = len(target_tokens & cand_tokens) + (2 if item.get("phone") else 0)
        if score > best_score:
            best_score = score
            best = item
    return best


def lookup_gmap_place(name, locality="", city="", lat=None, lng=None, country="IN", place_id=""):
    if (not name and not place_id) or curl_requests is None:
        return None
    q_primary = " ".join([x for x in [name, locality, city] if x]).strip()
    items = _fetch_gmap_offset(q_primary, lat, lng, country, 0, 15000) if q_primary else []
    best = _pick_best_place(items, name, place_id)

    # Fallback retry without locality (e.g. mismatched OSM locality like Chelsea vs Kensington W2)
    if (not best or not best.get("phone")) and locality and city:
        q_city = f"{name} {city}".strip()
        if q_city.lower() != q_primary.lower():
            city_items = _fetch_gmap_offset(q_city, lat, lng, country, 0, 20000)
            alt_best = _pick_best_place(city_items, name, place_id)
            if alt_best and (alt_best.get("phone") or not best):
                best = alt_best

    pid = (best.get("placeId") if best else "") or place_id
    if pid and (not best or not best.get("phone")):
        extra_phones = _rescue_place_page_phones(pid, country)
        if extra_phones:
            if not best:
                best = {"name": name, "placeId": pid, "phones": extra_phones, "phone": extra_phones[0], "country": str(country).upper(), "source": "gmap_direct_rpc"}
            else:
                merged = list(dict.fromkeys((best.get("phones") or []) + extra_phones))
                best["phones"] = merged
                if not best.get("phone"):
                    best["phone"] = merged[0]
    if not best:
        return None
    return best if (best.get("phone") or best.get("website") or best.get("mapsLink")) else None


def scrape_justdial_web_tls(category, city, max_pages=3):
    leads = []
    if not category or not city or curl_requests is None or BeautifulSoup is None:
        return leads
    clean_cat = urllib.parse.quote(category.replace(" ", "-"))
    clean_city = urllib.parse.quote(city.replace(" ", "-"))
    seen = set()

    def fetch_page(page_no):
        suffix = f"/page-{page_no}" if page_no > 1 else ""
        url = f"https://www.justdial.com/{clean_city}/{clean_cat}{suffix}"
        html = _http_get(url, timeout=9)
        if not html:
            return []
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for card in soup.select(".resultbox, .jsx-1647039535, li.cntanr"):
            name_el = card.select_one(".resultbox_title_anchor, .lng_cont_name, a.resultbox_title")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name or len(name) < 2:
                continue
            phone_el = card.select_one('.callcontent, .contact-info, a[href^="tel:"]')
            phone = ""
            if phone_el:
                phone = (phone_el.get("href") or "").replace("tel:", "").strip() or phone_el.get_text(strip=True)
            addr_el = card.select_one(".resultbox_address, .cont_fl_addr, .address-info")
            address = addr_el.get_text(strip=True) if addr_el else city
            rating_el = card.select_one(".resultbox_totalrate, .star_val")
            r_txt = rating_el.get_text(strip=True) if rating_el else ""
            rating = float(r_txt) if re.match(r"^\d+(\.\d+)?$", r_txt) else None
            out.append({
                "name": name, "phone": phone, "address": address,
                "locality": city, "city": city, "country": "IN",
                "category": "", "matchedSubcategory": category, "rating": rating, "source": "justdial_tls",
            })
        return out

    with ThreadPoolExecutor(max_workers=min(3, max_pages)) as pool:
        for batch in pool.map(fetch_page, range(1, max(1, min(4, int(max_pages))) + 1)):
            for item in batch:
                k = f"{item['name'].lower()}::{item['phone']}"
                if k not in seen:
                    seen.add(k)
                    leads.append(item)
    return leads


def scrape_yellowpages_paginated(category, city, state="", country="US", max_pages=3):
    leads = []
    if not category or not city or curl_requests is None or BeautifulSoup is None:
        return leads
    clean_term = urllib.parse.quote(category)
    clean_loc = urllib.parse.quote(f"{city}, {state}".strip(", "))
    seen = set()

    def fetch_page(page_no):
        cc = str(country or "US").upper()
        if cc == "CA":
            url = f"https://www.yellowpages.ca/search/si/{page_no}/{clean_term}/{clean_loc}"
        else:
            url = f"https://www.yellowpages.com/search?search_terms={clean_term}&geo_location_terms={clean_loc}&page={page_no}"
        html = _http_get(url, timeout=9)
        if not html:
            return []
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for item in soup.select(".result, .v-card"):
            name_el = item.select_one(".business-name")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            phone_el = item.select_one(".phones")
            phone = phone_el.get_text(strip=True) if phone_el else ""
            street_el = item.select_one(".street-address")
            locality_el = item.select_one(".locality")
            addr = ", ".join([el.get_text(strip=True) for el in (street_el, locality_el) if el]) or f"{city}, {state}".strip(", ")
            site_el = item.select_one("a.track-visit-website")
            website = site_el.get("href", "") if site_el else ""
            out.append({
                "name": name, "phone": phone, "address": addr,
                "locality": city, "city": city, "country": country.upper(),
                "website": website, "category": "", "matchedSubcategory": category, "source": "yellowpages_tls",
            })
        return out

    with ThreadPoolExecutor(max_workers=min(3, max_pages)) as pool:
        for batch in pool.map(fetch_page, range(1, max(1, min(4, int(max_pages))) + 1)):
            for item in batch:
                k = f"{item['name'].lower()}::{item['phone']}"
                if k not in seen:
                    seen.add(k)
                    leads.append(item)
    return leads
