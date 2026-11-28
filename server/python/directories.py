"""
server/python/directories.py
Native TLS + Selectolax Country-Routed Directory Scrapers for GB, AU, AE & Bing Local:
  - GB: Yell.com
  - AU: YellowPages.com.au
  - AE: YellowPages-UAE / Connect.ae
  - Global (IN/US/GB/AU/AE): Bing Local / Maps card extraction
"""

import re
import urllib.parse

try:
    from selectolax.parser import HTMLParser
except ImportError:
    HTMLParser = None

from gmap_rpc import _http_get


def _text(node):
    return node.text(strip=True) if node is not None else ""


def scrape_yell_uk(category, location, max_pages=2):
    """Scrapes Yell.com (GB) structured business listings."""
    leads = []
    if not category or not location or HTMLParser is None:
        return leads
    seen = set()
    for page in range(1, max(1, min(3, int(max_pages))) + 1):
        url = f"https://www.yell.com/ucs/UcsSearchAction.do?keywords={urllib.parse.quote(category)}&location={urllib.parse.quote(location)}&pageNum={page}"
        html = _http_get(url, timeout=8)
        if not html:
            break
        tree = HTMLParser(html)
        for card in tree.css("article.businessCapsule"):
            name = _text(card.css_first(".businessCapsule--name"))
            if not name:
                continue
            phone_el = card.css_first(".business--telephoneNumber") or card.css_first('a[href^="tel:"]')
            phone = (_text(phone_el) or (phone_el.attributes.get("href", "") if phone_el else "")).replace("tel:", "").strip()
            addr = _text(card.css_first(".businessCapsule--address"))
            site_el = card.css_first('a[data-tracking="WL:WEBSITE"]') or card.css_first("a.businessCapsule--ctaItem[href^='http']")
            website = site_el.attributes.get("href", "") if site_el else ""
            cat = _text(card.css_first(".businessCapsule--classification"))
            k = f"{name.lower()}::{phone}"
            if k in seen:
                continue
            seen.add(k)
            leads.append({
                "name": name, "phone": phone, "website": website,
                "address": addr or f"{location}, UK", "city": location.split(",")[0].strip(),
                "country": "GB", "category": cat, "matchedSubcategory": category,
                "source": "yell_directory",
            })
    return leads


def scrape_yp_au(category, location, max_pages=2):
    """Scrapes YellowPages.com.au (AU) structured listings."""
    leads = []
    if not category or not location or HTMLParser is None:
        return leads
    seen = set()
    for page in range(1, max(1, min(3, int(max_pages))) + 1):
        url = f"https://www.yellowpages.com.au/search/listings?clue={urllib.parse.quote(category)}&locationClue={urllib.parse.quote(location)}&pageNumber={page}"
        html = _http_get(url, timeout=8)
        if not html:
            break
        tree = HTMLParser(html)
        for card in tree.css(".search-result, .listing-data, article"):
            name = _text(card.css_first(".listing-name, h3, a.listing-name"))
            if not name or len(name) < 2:
                continue
            tel_el = card.css_first('a[href^="tel:"]')
            phone = (tel_el.attributes.get("href", "") if tel_el else "").replace("tel:", "").strip()
            addr = _text(card.css_first(".listing-address, .mappable-address"))
            site_el = card.css_first("a.contact-url, a[data-click-event='website']")
            website = site_el.attributes.get("href", "") if site_el else ""
            k = f"{name.lower()}::{phone}"
            if k in seen:
                continue
            seen.add(k)
            leads.append({
                "name": name, "phone": phone, "website": website,
                "address": addr or f"{location}, Australia", "city": location.split(",")[0].strip(),
                "country": "AU", "category": category, "matchedSubcategory": category,
                "source": "yp_au_directory",
            })
    return leads


def scrape_yp_ae(category, location, max_pages=2):
    """Scrapes YellowPages-UAE / Connect.ae structured listings."""
    leads = []
    if not category or not location or HTMLParser is None:
        return leads
    seen = set()
    slug_cat = re.sub(r"[^a-z0-9]+", "-", category.lower()).strip("-")
    slug_loc = re.sub(r"[^a-z0-9]+", "-", location.split(",")[0].lower()).strip("-")
    for page in range(1, max(1, min(3, int(max_pages))) + 1):
        url = f"https://www.yellowpages-uae.com/uae/{slug_loc}/{slug_cat}?page={page}"
        html = _http_get(url, timeout=8)
        if not html:
            break
        tree = HTMLParser(html)
        for card in tree.css(".box, .listing, .search-item, article"):
            name = _text(card.css_first("h2 a, .title a, h3 a"))
            if not name or len(name) < 2:
                continue
            tel_el = card.css_first('a[href^="tel:"]')
            phone = (tel_el.attributes.get("href", "") if tel_el else "").replace("tel:", "").strip()
            addr = _text(card.css_first(".address, .location"))
            site_el = card.css_first('a[rel*="nofollow"][href^="http"]:not([href*="yellowpages-uae"])')
            website = site_el.attributes.get("href", "") if site_el else ""
            k = f"{name.lower()}::{phone}"
            if k in seen:
                continue
            seen.add(k)
            leads.append({
                "name": name, "phone": phone, "website": website,
                "address": addr or f"{location}, UAE", "city": location.split(",")[0].strip(),
                "country": "AE", "category": category, "matchedSubcategory": category,
                "source": "uae_directory",
            })
    return leads


def scrape_bing_local(category, location, country="US"):
    """Extracts structured Bing Local / Maps pack cards without loose Web SERP blog noise."""
    leads = []
    if not category or not location:
        return leads
    cc = str(country or "US").upper()
    q = f"{category} in {location}"
    url = f"https://www.bing.com/maps/default.aspx?q={urllib.parse.quote(q)}"
    html = _http_get(url, timeout=7)
    if not html:
        return leads
    # Extract Bing entity JSON payloads embedded in local cards (lat/lon/title/phone/address)
    for m in re.finditer(r'"title"\s*:\s*"([^"]{3,90})"[^}]*?"latitude"\s*:\s*([-\d.]+)[^}]*?"longitude"\s*:\s*([-\d.]+)', html):
        name = m.group(1).strip()
        lat = float(m.group(2))
        lng = float(m.group(3))
        chunk = html[max(0, m.start() - 300):m.end() + 500]
        ph_m = re.search(r'"phone"\s*:\s*"([^"]{6,24})"', chunk)
        ws_m = re.search(r'"website"\s*:\s*"(https?://[^"]+)"', chunk)
        ad_m = re.search(r'"addressLine"\s*:\s*"([^"]{3,120})"', chunk)
        leads.append({
            "name": name,
            "lat": lat,
            "lng": lng,
            "phone": ph_m.group(1) if ph_m else "",
            "website": ws_m.group(1) if ws_m else "",
            "address": ad_m.group(1) if ad_m else location,
            "city": location.split(",")[0].strip(),
            "country": cc,
            "category": category,
            "matchedSubcategory": category,
            "source": "bing_local",
        })
    return leads


def dispatch_directory_scrape(country, category, location, max_pages=2):
    cc = str(country or "US").upper()
    if cc == "GB":
        return scrape_yell_uk(category, location, max_pages)
    if cc == "AU":
        return scrape_yp_au(category, location, max_pages)
    if cc == "AE":
        return scrape_yp_ae(category, location, max_pages)
    if cc == "BING_LOCAL":
        return scrape_bing_local(category, location, country)
    return []
