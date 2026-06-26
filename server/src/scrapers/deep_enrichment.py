import sys
import json
import re
import argparse
from urllib.parse import urlparse
import phonenumbers
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

def emit_log(message):
    print(json.dumps({"type": "log", "message": message}), flush=True)

def extract_contact_info(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    text = soup.get_text(separator=' ')
    
    # 1. Extract Emails
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    emails = list(set(re.findall(email_pattern, text)))
    
    # Check mailto links in BeautifulSoup
    for a in soup.find_all('a', href=True):
        if a['href'].startswith('mailto:'):
            mail = a['href'].replace('mailto:', '').split('?')[0].strip()
            if '@' in mail:
                emails.append(mail)

    emails = list(set([e.lower() for e in emails if not any(e.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])]))

    # 2. Extract Phones using phonenumbers library
    valid_phones = []
    
    # Find all possible phone number matches in the raw text using phonenumbers library (assuming India 'IN' by default)
    for match in phonenumbers.PhoneNumberMatcher(text, "IN"):
        try:
            formatted = phonenumbers.format_number(match.number, phonenumbers.PhoneNumberFormat.E164)
            valid_phones.append(formatted)
        except:
            pass

    # Check tel: links in BeautifulSoup
    for a in soup.find_all('a', href=True):
        if a['href'].startswith('tel:'):
            tel = a['href'].replace('tel:', '').replace(' ', '').strip()
            try:
                # Try parsing as international, then fallback to IN
                if tel.startswith('+'):
                    p = phonenumbers.parse(tel, None)
                else:
                    p = phonenumbers.parse(tel, "IN")
                
                if phonenumbers.is_valid_number(p):
                    valid_phones.append(phonenumbers.format_number(p, phonenumbers.PhoneNumberFormat.E164))
            except:
                pass

    return list(set(emails)), list(set(valid_phones))

def main():
    parser = argparse.ArgumentParser(description="Deep Enrichment AI Extractor")
    parser.add_argument('--url', required=True)
    args = parser.parse_args()

    url = args.url.strip()
    
    if not url.startswith('http'):
        url = 'https://' + url

    emit_log(f"[Deep AI] Booting robust extraction for {url}")

    if not sync_playwright:
        emit_log("[ERROR] Playwright not found.")
        sys.exit(1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        page = context.new_page()

        # Abort heavy resources to keep memory low
        page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font", "stylesheet"] else route.continue_())

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
            # Grab full HTML for beautifulsoup
            html_content = page.content()
            
            emails, phones = extract_contact_info(html_content)
            
            # If not enough, try finding 'Contact' page link and visit it
            if not emails or not phones:
                contact_links = page.locator('a:has-text("Contact"), a:has-text("About")').all()
                if contact_links:
                    contact_url = contact_links[0].get_attribute('href')
                    if contact_url:
                        if not contact_url.startswith('http'):
                            parsed_uri = urlparse(url)
                            base = '{uri.scheme}://{uri.netloc}'.format(uri=parsed_uri)
                            contact_url = base + contact_url if contact_url.startswith('/') else base + '/' + contact_url
                        
                        emit_log(f"[Deep AI] Navigating to sub-page: {contact_url}")
                        try:
                            page.goto(contact_url, wait_until="domcontentloaded", timeout=10000)
                            sub_html = page.content()
                            sub_e, sub_p = extract_contact_info(sub_html)
                            emails.extend(sub_e)
                            phones.extend(sub_p)
                        except:
                            pass

            result = {
                "emails": list(set(emails)),
                "phones": list(set(phones))
            }
            
            print(json.dumps({"type": "enrichment_result", "data": result}), flush=True)

        except Exception as e:
            emit_log(f"[WARN] Enrichment failed for {url}: {str(e)}")
            print(json.dumps({"type": "enrichment_result", "data": {"emails": [], "phones": []}}), flush=True)
            
        finally:
            browser.close()

if __name__ == "__main__":
    main()
