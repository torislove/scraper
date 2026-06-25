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

def determine_tier(score):
    if score >= 80: return 'Premium'
    if score >= 50: return 'Standard'
    return 'Basic'

def main():
    parser = argparse.ArgumentParser(description="Gomandap Python Engine")
    parser.add_argument('--query', required=True)
    parser.add_argument('--category', required=True)
    parser.add_argument('--location', required=True)
    parser.add_argument('--apikey', required=False)
    args = parser.parse_args()

    query = args.query.strip()
    category = args.category.strip()
    location = args.location.strip()

    emit_log("[SYSTEM] Python Google Maps Automation Booted.")

    if not sync_playwright:
        emit_log("[ERROR] Playwright for Python is not installed. Please run: pip install playwright && playwright install")
        sys.exit(1)

    search_query = f"{query} {location}".strip()
    search_url = f"https://www.google.com/maps/search/{urllib.parse.quote(search_query)}"

    emit_log(f"[Agent] Navigating to Maps: {search_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        # Abort images to speed up loading
        page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] else route.continue_())

        try:
            page.goto(search_url, wait_until="load", timeout=30000)
        except Exception as e:
            emit_log(f"[WARN] Page load timed out, but continuing... {e}")

        # Try to accept cookies if prompted
        try:
            page.locator('button:has-text("Accept all")').first.click(timeout=3000)
        except:
            pass

        time.sleep(2)

        # Check if redirected directly to a single business
        if page.locator('div[role="feed"]').count() == 0 and page.locator('[data-item-id="address"]').count() > 0:
            emit_log("[Agent] Redirected directly to a single business page.")
            name = page.locator('h1.DUwDvf').inner_text() if page.locator('h1.DUwDvf').count() > 0 else search_query
            address = page.locator('[data-item-id="address"]').first.get_attribute('aria-label') or ""
            
            phone = ""
            phone_el = page.locator('button[data-item-id^="phone:tel:"], button[data-tooltip="Copy phone number"]').first
            if phone_el.count() > 0:
                phone = phone_el.get_attribute('aria-label') or phone_el.inner_text()
            
            if phone: phone = re.sub(r'^Phone:\s*', '', phone, flags=re.IGNORECASE).strip()
            if address: address = re.sub(r'^Address:\s*', '', address, flags=re.IGNORECASE).strip()

            lead = {
                "businessName": name,
                "category": category,
                "city": location,
                "address": address,
                "phones": [phone] if phone else [],
                "emails": [],
                "mapsLink": page.url,
                "qualityScore": 50 if phone else 10,
                "source": "Python Maps Automation"
            }
            emit_lead(lead)
            emit_log("[SYSTEM] Single extraction complete.")
            browser.close()
            return

        # Feed Scrolling
        scrollable = page.locator('div[role="feed"]')
        if scrollable.count() > 0:
            emit_log("[Agent] Feed detected. Scrolling for leads...")
            for _ in range(15):
                scrollable.evaluate("node => node.scrollBy(0, 5000)")
                time.sleep(0.5)
                if page.locator('a.hfpxzc').count() >= 30:
                    break
        else:
            emit_log("[ERROR] Could not find feed or single listing. Aborting.")
            browser.close()
            return

        cards = page.locator('a.hfpxzc').all()
        emit_log(f"[Agent] Found {len(cards)} vendor cards. Clicking sequentially...")

        for i, card in enumerate(cards):
            try:
                name = card.get_attribute('aria-label')
                maps_link = card.get_attribute('href')
                if not name: continue

                emit_log(f"[Extracting] {i+1}/{len(cards)}: {name}")
                
                # Click the card to open side panel
                card.click()
                
                # Wait for panel to load
                page.wait_for_selector('h1.DUwDvf', timeout=3000)
                time.sleep(0.5)

                address = ""
                addr_el = page.locator('[data-item-id="address"]').first
                if addr_el.count() > 0:
                    address = addr_el.get_attribute('aria-label') or ""
                    if address: address = re.sub(r'^Address:\s*', '', address, flags=re.IGNORECASE).strip()

                phone = ""
                phone_el = page.locator('button[data-item-id^="phone:tel:"], button[data-tooltip="Copy phone number"]').first
                if phone_el.count() > 0:
                    phone = phone_el.get_attribute('aria-label') or phone_el.inner_text()
                    if phone: phone = re.sub(r'^Phone:\s*', '', phone, flags=re.IGNORECASE).strip()

                website = ""
                web_el = page.locator('a[data-item-id="authority"]').first
                if web_el.count() > 0:
                    website = web_el.get_attribute('href') or ""

                score = 10
                if phone: score += 40
                if website: score += 20
                if address: score += 10

                lead = {
                    "businessName": name,
                    "category": category,
                    "city": location,
                    "address": address,
                    "phones": [phone] if phone else [],
                    "emails": [],
                    "website": website,
                    "mapsLink": maps_link or page.url,
                    "qualityScore": score,
                    "source": "Python Maps Automation"
                }

                emit_lead(lead)
                
            except Exception as e:
                emit_log(f"[WARN] Failed to process card {i+1}: {str(e)}")

        emit_log("[SYSTEM] Python Maps Automation completed successfully.")
        browser.close()

if __name__ == "__main__":
    main()
