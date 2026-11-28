import os
import urllib.request
import sys

os.makedirs('server/bin', exist_ok=True)
dest = os.path.abspath('server/bin/google_maps_scraper.exe')

if not os.path.exists(dest) or os.path.getsize(dest) < 1000000:
    url = 'https://github.com/gosom/google-maps-scraper/releases/download/v1.21.0/google_maps_scraper-1.21.0-windows-amd64.exe'
    print(f"Downloading google_maps_scraper from {url} to {dest}...")
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded: {os.path.getsize(dest)} bytes")
else:
    print(f"Binary already exists: {os.path.getsize(dest)} bytes")

# Verify Python tools
try:
    import primp
    import curl_cffi
    import scrapling
    import botasaurus
    print("Python engines ready: primp, curl_cffi, scrapling, botasaurus")
except Exception as e:
    print(f"Python tool verification error: {e}", file=sys.stderr)
    sys.exit(1)
