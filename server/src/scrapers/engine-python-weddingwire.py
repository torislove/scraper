import sys
import json
import time
import argparse
import urllib.parse
import re

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

def emit_log(message):
    print(json.dumps({"type": "log", "message": message}), flush=True)

def emit_lead(data):
    print(json.dumps({"type": "lead", "data": data}), flush=True)

def main():
    parser = argparse.ArgumentParser(description="Gomandap WeddingWire Engine")
    parser.add_argument('--query', required=True)
    parser.add_argument('--category', required=True)
    parser.add_argument('--location', required=True)
    args = parser.parse_args()

    query = args.query.strip()
    category = args.category.strip()
    location = args.location.strip()

    emit_log("[SYSTEM] Python WeddingWire Automation Booted.")

    if not sync_playwright:
        emit_log("[ERROR] Playwright for Python is not installed. Please run: pip install playwright && playwright install")
        sys.exit(1)

    safe_location = urllib.parse.quote(location)
    safe_query = urllib.parse.quote(query)
    search_url = f"https://www.weddingwire.in/wedding-venues/{safe_location}"

    emit_log(f"[Agent] Navigating to WeddingWire: {search_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] else route.continue_())

        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)
        except Exception as e:
            emit_log(f"[WARN] Page load timeout, but continuing... {e}")

        # Feed Scrolling
        emit_log("[Agent] Scrolling for leads...")
        for _ in range(8):
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            time.sleep(1)

        cards = page.locator('.vendor-tile, .directory-item').all()
        
        emit_log(f"[Agent] Found {len(cards)} vendor cards on WeddingWire.")

        for i, card in enumerate(cards):
            try:
                name = ""
                name_el = card.locator('.vendor-tile-title, .directory-item-title').first
                if name_el.count() > 0:
                    name = name_el.inner_text()
                
                if not name: continue

                emit_log(f"[Extracting] {i+1}/{len(cards)}: {name}")

                address = ""
                addr_el = card.locator('.vendor-tile-location, .directory-item-location').first
                if addr_el.count() > 0:
                    address = addr_el.inner_text()

                phone = ""
                phone_btn = card.locator('a[href^="tel:"]').first
                if phone_btn.count() > 0:
                    href = phone_btn.get_attribute('href')
                    if href:
                        phone = href.replace('tel:', '').strip()
                
                if not phone:
                    raw_text = card.inner_text()
                    phone_match = re.search(r"(?:\+91|0)?[-\s]*[6789]\d{2}[-\s]*\d{3}[-\s]*\d{4}", raw_text)
                    if phone_match:
                        phone = phone_match.group(0).strip()

                score = 10
                if phone: score += 40
                if address: score += 20

                lead = {
                    "businessName": name,
                    "category": category,
                    "city": location,
                    "address": address,
                    "phones": [phone] if phone else [],
                    "emails": [],
                    "website": "",
                    "mapsLink": page.url,
                    "qualityScore": score,
                    "source": "Python WeddingWire Automation"
                }

                emit_lead(lead)
                
            except Exception as e:
                emit_log(f"[WARN] Failed to process card {i+1}: {str(e)}")

        emit_log("[SYSTEM] Python WeddingWire Automation completed successfully.")
        browser.close()

if __name__ == "__main__":
    main()
