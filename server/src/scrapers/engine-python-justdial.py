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
    parser = argparse.ArgumentParser(description="Gomandap JustDial Engine")
    parser.add_argument('--query', required=True)
    parser.add_argument('--category', required=True)
    parser.add_argument('--location', required=True)
    args = parser.parse_args()

    query = args.query.strip()
    category = args.category.strip()
    location = args.location.strip()

    emit_log("[SYSTEM] Python JustDial Automation Booted.")

    if not sync_playwright:
        emit_log("[ERROR] Playwright for Python is not installed. Please run: pip install playwright && playwright install")
        sys.exit(1)

    # Convert spaces to hyphens for JustDial URL format
    safe_location = location.lower().replace(" ", "-")
    safe_query = query.lower().replace(" ", "-")
    search_url = f"https://www.justdial.com/{safe_location}/{safe_query}"

    emit_log(f"[Agent] Navigating to JustDial: {search_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        # Abort images to speed up loading
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

        cards = page.locator('.resultbox_info').all()
        if not cards:
            cards = page.locator('div[data-testid="result-card"]').all()
            
        emit_log(f"[Agent] Found {len(cards)} vendor cards on JustDial.")

        for i, card in enumerate(cards):
            try:
                name = card.locator('h2').first.inner_text() if card.locator('h2').count() > 0 else ""
                if not name:
                    name_el = card.locator('.resultbox_title_anchor').first
                    name = name_el.inner_text() if name_el.count() > 0 else ""
                
                if not name: continue

                emit_log(f"[Extracting] {i+1}/{len(cards)}: {name}")

                address = ""
                addr_el = card.locator('.resultbox_address').first
                if addr_el.count() > 0:
                    address = addr_el.inner_text()

                phone = ""
                # JD sometimes shows buttons or texts
                phone_btn = card.locator('button:has-text("Show Number"), a[href^="tel:"]').first
                if phone_btn.count() > 0:
                    href = phone_btn.get_attribute('href')
                    if href and href.startswith('tel:'):
                        phone = href.replace('tel:', '').strip()
                    else:
                        # try to click show number
                        try:
                            phone_btn.click(timeout=2000)
                            time.sleep(1)
                            phone = card.locator('.contact-number').first.inner_text()
                        except:
                            pass
                else:
                    # try to extract from raw text
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
                    "source": "Python JustDial Automation"
                }

                emit_lead(lead)
                
            except Exception as e:
                emit_log(f"[WARN] Failed to process card {i+1}: {str(e)}")

        emit_log("[SYSTEM] Python JustDial Automation completed successfully.")
        browser.close()

if __name__ == "__main__":
    main()
