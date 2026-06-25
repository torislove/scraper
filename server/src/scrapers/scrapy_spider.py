import scrapy
from scrapy.crawler import CrawlerProcess
import sys
import json
import urllib.request
import re

class WeddingSpider(scrapy.Spider):
    name = "wedding_spider"
    
    def __init__(self, query=None, location=None, *args, **kwargs):
        super(WeddingSpider, self).__init__(*args, **kwargs)
        self.query = query
        self.location = location
        # A simple broad crawl strategy: search Google or DuckDuckGo and extract links, then crawl them
        self.start_urls = [
            f"https://html.duckduckgo.com/html/?q={query}+in+{location}"
        ]
        self.extracted_count = 0

    def parse(self, response):
        # Extract links from search results
        for a in response.css('a.result__url::attr(href)').getall():
            if 'instagram.com' not in a and 'facebook.com' not in a and 'justdial.com' not in a:
                yield response.follow(a, self.parse_website)

    def parse_website(self, response):
        text = response.css('body *::text').getall()
        body_text = ' '.join(text)

        # Basic Email Regex
        emails = re.findall(r'[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+', body_text)
        # Basic Phone Regex (Indian)
        phones = re.findall(r'(?:\+91|0)?[ -]?\d{4}[ -]?\d{3}[ -]?\d{3}', body_text)

        if emails or phones:
            valid_emails = list(set([e.lower() for e in emails if not e.endswith('.png') and not e.endswith('.jpg')]))
            valid_phones = list(set([p.replace(' ', '').replace('-', '') for p in phones if len(p.replace(' ', '').replace('-', '')) >= 10]))

            if valid_emails or valid_phones:
                self.extracted_count += 1
                
                vendor = {
                    "name": response.css('title::text').get() or self.query,
                    "category": self.query,
                    "city": self.location,
                    "address": "Unknown",
                    "phone": valid_phones[0] if valid_phones else None,
                    "email": valid_emails[0] if valid_emails else None,
                    "website": response.url,
                    "source": "Scrapy (Spider)"
                }
                
                # Push directly to Node.js backend (we can post it to an internal API, but since this runs via child_process, we can just print it as JSON)
                print(f"SCRAPY_LEAD: {json.dumps(vendor)}")
                
        # Follow contact pages
        for a in response.css('a::attr(href)').getall():
            if 'contact' in a.lower() or 'about' in a.lower():
                yield response.follow(a, self.parse_website)

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "Caterers"
    location = sys.argv[2] if len(sys.argv) > 2 else "India"
    
    process = CrawlerProcess({
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'LOG_LEVEL': 'ERROR',
        'CLOSESPIDER_PAGECOUNT': 50 # Prevent endless crawling for now
    })
    
    process.crawl(WeddingSpider, query=query, location=location)
    process.start()
