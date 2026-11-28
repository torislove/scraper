"""
server/python/tls_engine.py
Zero-Browser TLS & JA3 Impersonation Sidecar Service
Powered by primp (Rust) and curl_cffi (C) with Scrapling & Botasaurus.
Exposes high-speed HTTP API on http://127.0.0.1:5003 for Node.js backend.
"""

import sys
import json
import re
import base64
import threading
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

try:
    import primp
except ImportError:
    primp = None

try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

from gmap_rpc import (
    scrape_gmap_paginated,
    lookup_gmap_place,
    scrape_justdial_web_tls,
    scrape_yellowpages_paginated,
)
from directories import dispatch_directory_scrape
from distiller import query_journal_duckdb, score_relevance_remote


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 128


_HTTP_LOCAL = threading.local()


def _tls_fetch_text(url, impersonate="chrome", impersonate_os="windows", timeout=5):
    try:
        if curl_requests is not None:
            sess = getattr(_HTTP_LOCAL, "curl_sess", None)
            if sess is None:
                sess = curl_requests.Session(impersonate=impersonate)
                _HTTP_LOCAL.curl_sess = sess
            r = sess.get(url, timeout=timeout)
            return r.status_code, r.text
        if primp is not None:
            c = primp.Client(impersonate=impersonate, impersonate_os=impersonate_os)
            r = c.get(url, timeout=timeout)
            return r.status_code, r.text
    except Exception:
        pass
    return 0, ""


def unwrap_bing_urls(html):
    """Decodes Bing ck/a base64 redirect URLs inline so social/website extractors see real URLs."""
    if not html or "bing.com/ck/a" not in html:
        return html or ""

    def _repl(m):
        raw = m.group(0).replace("&amp;", "&")
        try:
            u = urllib.parse.parse_qs(urllib.parse.urlparse(raw).query).get("u", [""])[0]
            if u.startswith("a1"):
                b64 = u[2:].replace("-", "+").replace("_", "/")
                b64 += "=" * (-len(b64) % 4)
                decoded = base64.b64decode(b64).decode("utf-8", "ignore")
                if decoded.startswith("http"):
                    return decoded
        except Exception:
            pass
        return raw

    return re.sub(r'https?://(?:www\.)?bing\.com/ck/a\?[^"\'\s<>]+', _repl, html, flags=re.I)


def extract_contacts_from_html(html, base_url=""):
    """Extracts emails, phone numbers, WhatsApp links, and social URLs from HTML."""
    if not html:
        return {"emails": [], "phones": [], "whatsapp": "", "socials": {}}

    # Emails regex (strictly alphabetic TLD 2-15 chars, blocks react@18.2.0 / js-cookie@2.2.1 / wix-fonts@1.14.0)
    email_re = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,15}\b'
    raw_emails = set(re.findall(email_re, html))
    _npm_bad = ('react@', 'react-dom@', 'wix-fonts@', 'js-cookie@', 'polyfill@', 'gumlet', 'lodash@', 'jquery@', 'webpack@')
    valid_emails = [
        e for e in raw_emails
        if not any(b in e.lower() for b in ['example.com', 'wixpress', 'sentry', 'domain.com', 'john@email.com', 'robert@broofa.com', '@broofa.com', '@email.com', '@crazygames.com', '@test.com', '@yourdomain', '.png', '.jpg', '.webp', '.js', '.css', *_npm_bad])
        and not e.split('@', 1)[1].split('.', 1)[0].isdigit()
        and len(e) <= 60
    ]

    # WhatsApp link regex
    wa_match = re.search(r'https?://(?:api\.whatsapp\.com/send\?phone=|wa\.me/)([0-9+]+)', html, re.I)
    whatsapp_link = f"https://wa.me/{wa_match.group(1).replace('+', '')}" if wa_match else ""

    # Social links
    socials = {}
    ig_bad = {'p', 'reel', 'reels', 'stories', 'explore', 'about', 'legal', 'accounts', 'o1'}
    for ig_m in re.finditer(r'https?://(?:www\.)?instagram\.com/([a-zA-Z0-9_.-]+)', html, re.I):
        h = ig_m.group(1).strip()
        if len(h) >= 3 and h.lower() not in ig_bad:
            socials['instagram'] = f"https://instagram.com/{h}"
            break

    fb_bad = {'2008', 'people', 'p', 'sharer', 'sharer.php', 'share', 'share.php', 'wordpresscom', 'groups', 'events', 'help', 'pages', 'tr', 'plugins', 'dialog', 'privacy', 'policies', 'login', 'recover', 'watch', 'pg'}
    for fb_m in re.finditer(r'https?://(?:www\.)?facebook\.com/([a-zA-Z0-9_.-]+)', html, re.I):
        h = fb_m.group(1).strip()
        if len(h) >= 3 and h.lower() not in fb_bad:
            socials['facebook'] = f"https://facebook.com/{h}"
            break

    li_m = re.search(r'https?://(?:www\.)?linkedin\.com/company/([a-zA-Z0-9_.-]{3,})', html, re.I)
    if li_m:
        socials['linkedin'] = f"https://linkedin.com/company/{li_m.group(1)}"

    yt_m = re.search(r'https?://(?:www\.)?youtube\.com/(?:@|channel/|c/)([a-zA-Z0-9_.-]{3,})', html, re.I)
    if yt_m:
        yh = yt_m.group(1).strip()
        socials['youtube'] = f"https://youtube.com/channel/{yh}" if re.match(r'^UC[a-zA-Z0-9_-]{20,}$', yh) else f"https://youtube.com/@{yh}"

    tw_m = re.search(r'https?://(?:www\.)?(?:twitter|x)\.com/([a-zA-Z0-9_]{3,})', html, re.I)
    if tw_m and tw_m.group(1).lower() not in ['intent', 'share', 'home']:
        socials['twitter'] = f"https://x.com/{tw_m.group(1)}"

    # Strip script/style/svg blocks before scanning phone digits so DOM/JS IDs never leak
    clean_html_for_phones = re.sub(
        r'<(script|style|noscript|svg)\b[^>]*>[\s\S]*?</\1>',
        ' ',
        html,
        flags=re.I
    )

    # Phone numbers (captures spaced/hyphenated/0-prefixed Indian mobiles & US/EU numbers)
    raw_matches = re.findall(
        r'(?:(?:\+|0{0,2})91|0)?[\s.-]*(?:[6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|[6-9]\d{9})\b|\b0[1-9]\d{1,4}[\s.-]?\d{6,8}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
        clean_html_for_phones
    )
    raw_phones = list(dict.fromkeys([m.strip() for m in raw_matches if m.strip()]))[:8]

    return {
        "emails": valid_emails[:5],
        "phones": raw_phones[:5],
        "whatsapp": whatsapp_link,
        "socials": socials
    }


BLACKLISTED_PHONES = {
    '7326059369', '6393138454', '9938012595', '9967462575',
    '8124222266', '8888888888', '9999999999', '1141444444',
    '9925252525', '1800200000', '1800102030'
}


def enrich_lead_dossier(name, locality, city, country="IN", website=""):
    """Online deep dossier hunter via TLS Chrome impersonation: Maps, Socials, Mobiles."""
    result = {
        "name": name,
        "city": city,
        "country": country,
        "mobilePhone": "",
        "landlinePhone": "",
        "whatsappLink": "",
        "email": "",
        "emails": [],
        "instagram": "",
        "instagramFollowers": "",
        "facebook": "",
        "facebookFollowers": "",
        "linkedin": "",
        "youtube": "",
        "twitter": "",
        "mapsLink": "",
        "rating": None,
        "reviewsCount": None,
        "address": ""
    }

    # 1. Crawl website if present
    if website:
        try:
            target_url = website if website.startswith('http') else f"https://{website}"
            _, html = _tls_fetch_text(target_url, timeout=4)
            if html:
                contacts = extract_contacts_from_html(html, target_url)
                if contacts.get("emails"):
                    result["emails"] = contacts["emails"]
                    result["email"] = contacts["emails"][0]
                if contacts.get("whatsapp"):
                    result["whatsappLink"] = contacts["whatsapp"]
                socs = contacts.get("socials", {})
                for k in ["instagram", "facebook", "linkedin", "youtube", "twitter"]:
                    if socs.get(k):
                        result[k] = socs[k]
        except Exception:
            pass

    # 2. Search Online Dossier in parallel (Bing w/ ck/a unwrapping -> real IG/FB/LI/Email/Phones)
    queries = [
        f'"{name}" "{city}" phone OR mobile OR contact OR email',
        f'"{name}" "{city}" (site:instagram.com OR site:facebook.com OR site:linkedin.com)'
    ]

    def _run_bing(q):
        url = f"https://www.bing.com/search?adlt=strict&q={urllib.parse.quote(q)}"
        _, raw_html = _tls_fetch_text(url, timeout=4.5)
        return unwrap_bing_urls(raw_html)

    with ThreadPoolExecutor(max_workers=2) as pool:
        html_pages = list(pool.map(_run_bing, queries))

    for html in html_pages:
        try:
            if not html:
                continue

            # Social links in search results (reuse shared strict extractor)
            d_soc = extract_contacts_from_html(html).get("socials", {})
            for sk in ("instagram", "facebook", "linkedin", "youtube", "twitter"):
                if not result[sk] and d_soc.get(sk):
                    result[sk] = d_soc[sk]

            # Google Maps link in search results
            if not result["mapsLink"]:
                gm = re.search(r'https?://(?:maps\.google\.com|www\.google\.com/maps|maps\.app\.goo\.gl)/[^\s"\'<>]+', html, re.I)
                if gm:
                    result["mapsLink"] = gm.group(0)

            # Clean text for phone extraction
            clean_text = html
            if BeautifulSoup:
                soup = BeautifulSoup(html, 'html.parser')
                for s in soup(['script', 'style', 'noscript', 'head', 'header', 'footer']):
                    s.decompose()
                clean_text = soup.get_text(separator=' ')
            else:
                clean_text = re.sub(r'<[^>]+>', ' ', html)

            # Extract Mobiles & International Phones (strictly validated; never capture arbitrary numeric noise)
            if not result["mobilePhone"] and country == "IN":
                mobs = re.findall(r'(?:(?:\+|00)?91|0)?[\s.-]*([6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4}|[6-9]\d{9})\b', clean_text)
                for m in mobs:
                    d10 = re.sub(r'\D', '', m)[-10:]
                    if len(d10) == 10 and d10 not in BLACKLISTED_PHONES:
                        result["mobilePhone"] = f"+91{d10}"
                        if not result["whatsappLink"]:
                            result["whatsappLink"] = f"https://wa.me/91{d10}"
                        break
            elif not result["mobilePhone"] and country != "IN":
                country_prefix_map = {
                    "GB": r'(?:\+44\s*7\d{3}|\b0?7\d{3})[\s.-]?\d{3}[\s.-]?\d{3}\b',
                    "US": r'(?:\+1[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?[2-9]\d{2}[\s.-]?\d{4}\b',
                    "AU": r'(?:\+61\s*4|\b04)\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b',
                    "AE": r'(?:\+971\s*5|\b05)[024568][\s.-]?\d{3}[\s.-]?\d{4}\b',
                }
                tel_hits = re.findall(r'tel:([^"\'\s<>]+)', html, re.I)
                wa_hits = re.findall(r'(?:wa\.me|api\.whatsapp\.com/send\?phone=)/?(\d{8,15})', html, re.I)
                pat = country_prefix_map.get(country)
                cands = [*wa_hits, *tel_hits]
                if pat:
                    cands.extend(re.findall(pat, clean_text))
                for cand in cands:
                    s = str(cand).strip()
                    digits = re.sub(r'\D', '', s)
                    if len(digits) < 8 or digits.startswith('91'):
                        continue
                    if s and not re.match(r'^(\d)\1{6,}$', digits):
                        result["mobilePhone"] = s
                        break

            # Extract Landlines (never hijack 06/07/08/09 11-digit mobiles unless STD)
            if not result["landlinePhone"] and country == "IN":
                std = re.search(r'\b(0[1-5]\d{1,4}[-\s]?\d{6,8})\b', clean_text)
                if std:
                    result["landlinePhone"] = std.group(1).strip()

            # Extract Email
            if not result["email"]:
                em = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', clean_text)
                if em and not any(b in em.group(0).lower() for b in ['bing.com', 'microsoft.com', 'example.com', 'john@email.com', 'robert@broofa.com', '@broofa.com', '@email.com', '@crazygames.com', '@test.com', '.png']):
                    result["email"] = em.group(0)
                    result["emails"].append(em.group(0))

        except Exception:
            continue

    return result


class TLSEngineHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def setup(self):
        super().setup()
        try:
            self.request.settimeout(18.0)
        except Exception:
            pass

    def log_message(self, format, *args):
        # Quiet standard HTTP logs
        return

    def _send_json(self, status_code, data):
        body = json.dumps(data).encode('utf-8')
        self.close_connection = True
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/health' or self.path == '/':
            self._send_json(200, {
                "status": "ok",
                "engine": "tls_sidecar",
                "primp_available": primp is not None,
                "curl_cffi_available": curl_requests is not None
            })
        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            self._send_json(400, {"error": "Invalid JSON body"})
            return

        endpoint = self.path.rstrip('/')

        # 1. Generic TLS-Spoofed Fetch
        if endpoint == '/fetch':
            url = payload.get('url')
            if not url:
                self._send_json(400, {"error": "Missing 'url' parameter"})
                return

            impersonate = payload.get('impersonate', 'chrome')
            impersonate_os = payload.get('os', 'windows')
            timeout = payload.get('timeout', 15)

            try:
                if primp:
                    client = primp.Client(impersonate=impersonate, impersonate_os=impersonate_os)
                    resp = client.get(url, timeout=timeout)
                    self._send_json(200, {
                        "status_code": resp.status_code,
                        "text": resp.text,
                        "headers": dict(resp.headers)
                    })
                elif curl_requests:
                    resp = curl_requests.get(url, impersonate=impersonate, timeout=timeout)
                    self._send_json(200, {
                        "status_code": resp.status_code,
                        "text": resp.text,
                        "headers": dict(resp.headers)
                    })
                else:
                    self._send_json(500, {"error": "Neither primp nor curl_cffi is available"})
            except Exception as e:
                self._send_json(502, {"error": str(e)})

        # 2. In-Flight Website Contact Crawl (Homepage + up to 2 /contact or /about subpages)
        elif endpoint == '/crawl/website':
            url = payload.get('url')
            if not url:
                self._send_json(400, {"error": "Missing 'url' parameter"})
                return

            try:
                if not url.startswith('http'):
                    url = 'https://' + url
                base_url = url.rstrip('/')
                t_out = payload.get('timeout', 6)

                def _tls_get(target_u):
                    if primp:
                        c = primp.Client(impersonate="chrome", impersonate_os="windows")
                        return c.get(target_u, timeout=t_out).text
                    elif curl_requests:
                        return curl_requests.get(target_u, impersonate="chrome", timeout=t_out).text
                    return ""

                home_html = _tls_get(url)
                sub_urls = [f"{base_url}/contact", f"{base_url}/contact-us"]
                if home_html:
                    for m in re.findall(r'href=["\']([^"\']*(?:contact|reach|about)[^"\']*)["\']', home_html, re.I):
                        abs_u = urllib.parse.urljoin(base_url + '/', m).split('#')[0]
                        if abs_u.startswith(base_url) and abs_u not in sub_urls and not re.search(r'\.(pdf|jpg|png|css|js)$', abs_u, re.I):
                            sub_urls.append(abs_u)
                        if len(sub_urls) >= 3:
                            break

                combined_html = home_html or ""
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=2) as pool:
                    for sub_html in pool.map(lambda u: _tls_get(u) if u else "", sub_urls[:2]):
                        if sub_html:
                            combined_html += "\n" + sub_html

                contacts = extract_contacts_from_html(combined_html, url)
                self._send_json(200, {
                    "url": url,
                    "contacts": contacts
                })
            except Exception as e:
                self._send_json(200, {
                    "url": url,
                    "contacts": {"emails": [], "phones": [], "whatsapp": "", "socials": {}},
                    "error": str(e)
                })

        # 3. Direct Google Maps tbm=map Parallel Paginator (All 11 Countries)
        elif endpoint == '/scrape/gmap':
            query = str(payload.get('query', '')).strip()
            if not query:
                self._send_json(400, {"error": "query is required", "leads": []})
                return
            try:
                leads = scrape_gmap_paginated(
                    query,
                    lat=payload.get('lat'),
                    lng=payload.get('lng'),
                    country=payload.get('country', 'IN'),
                    max_pages=int(payload.get('maxPages', 5) or 5),
                    radius_m=int(payload.get('radius', 12000) or 12000),
                )
                self._send_json(200, {"success": True, "count": len(leads), "leads": leads})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e), "leads": []})

        # 3b. Direct Google Maps Single Place Lookup (Direction / Card Rescue)
        elif endpoint == '/lookup/gmap-place':
            name = str(payload.get('name', '')).strip()
            if not name:
                self._send_json(400, {"error": "name is required"})
                return
            try:
                place = lookup_gmap_place(
                    name,
                    locality=payload.get('locality', ''),
                    city=payload.get('city', ''),
                    lat=payload.get('lat'),
                    lng=payload.get('lng'),
                    country=payload.get('country', 'IN'),
                    place_id=payload.get('placeId', ''),
                )
                self._send_json(200, {"success": True, "place": place})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})

        # 4. Justdial High-Speed Directory Scrape (India, Paginated TLS)
        elif endpoint == '/scrape/justdial':
            category = payload.get('category', '').strip()
            city = payload.get('city', '').strip()
            if not category or not city:
                self._send_json(400, {"error": "category and city are required"})
                return
            try:
                leads = scrape_justdial_web_tls(category, city, max_pages=int(payload.get('maxPages', 3) or 3))
                self._send_json(200, {"success": True, "count": len(leads), "leads": leads})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e), "leads": []})

        # 5. YellowPages High-Speed Directory Scrape (US, CA, Paginated)
        elif endpoint == '/scrape/yellowpages':
            category = payload.get('category', '').strip()
            city = payload.get('city', '').strip()
            state = payload.get('state', '').strip()
            country = payload.get('country', 'US').upper()
            try:
                leads = scrape_yellowpages_paginated(category, city, state, country, max_pages=int(payload.get('maxPages', 3) or 3))
                self._send_json(200, {"success": True, "count": len(leads), "leads": leads})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e), "leads": []})

        # 5. Real-Time Deep Lead Dossier Enricher (Maps, Mobiles, Socials)
        elif endpoint == '/enrich/lead':
            name = payload.get('name', '').strip()
            city = payload.get('city', '').strip()
            locality = payload.get('locality', '').strip()
            country = payload.get('country', 'IN').strip().upper()
            website = payload.get('website', '').strip()

            if not name:
                self._send_json(400, {"success": False, "error": "name is required"})
                return

            try:
                enriched = enrich_lead_dossier(name, locality, city, country, website)
                self._send_json(200, {"success": True, "lead": enriched})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})

        # 6. Country-Routed Structured Directory Scrapers (GB Yell, AU YP, AE YP-UAE, Bing Local)
        elif endpoint == '/scrape/directory':
            category = str(payload.get('category', '')).strip()
            city = str(payload.get('city', '')).strip()
            country = str(payload.get('country', 'GB')).strip().upper()
            max_pages = int(payload.get('maxPages', 2) or 2)
            try:
                leads = dispatch_directory_scrape(country, category, city, max_pages=max_pages)
                self._send_json(200, {"success": True, "count": len(leads), "leads": leads})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e), "leads": []})

        # 7. Read-Only DuckDB Distillation & SQL Export Filter
        elif endpoint == '/distill/query':
            journal_path = str(payload.get('journalPath', '')).strip()
            filters = payload.get('filters') or {}
            limit = int(payload.get('limit', 5000) or 5000)
            try:
                out = query_journal_duckdb(journal_path, filters=filters, limit=limit)
                self._send_json(200, out)
            except Exception as e:
                self._send_json(500, {"ok": False, "error": str(e), "leads": []})

        # 8. FastEmbed Relevance Proxy (routes to shared :5004 when configured, or lexical fallback)
        elif endpoint == '/score/relevance':
            subcat = str(payload.get('subcategory', '')).strip()
            texts = [str(t or '') for t in (payload.get('texts') or [])]
            scores = score_relevance_remote(subcat, texts)
            if scores is None:
                q_toks = set(subcat.lower().split())
                scores = [round(len(q_toks & set(t.lower().split())) / max(1, len(q_toks)), 4) for t in texts]
            self._send_json(200, {"ok": True, "scores": scores})

        else:
            self._send_json(404, {"error": f"Unknown endpoint: {endpoint}"})


def run_server(port=5003):
    server = ThreadedHTTPServer(('127.0.0.1', port), TLSEngineHandler)
    print(f"[*] TLS Impersonation Sidecar Engine listening on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[*] Stopping TLS engine...")
        server.server_close()


if __name__ == '__main__':
    port = 5003
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
