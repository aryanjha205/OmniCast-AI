import re
import requests
from typing import List, Dict

def parse_m3u_content(content: str) -> List[Dict]:
    channels = []
    lines = content.strip().splitlines()
    current_channel = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith("#EXTINF:"):
            current_channel = {
                "name": "Live Channel",
                "logo": "",
                "country": "Global",
                "country_code": "US",
                "category": "Live TV",
                "language": "English",
                "is_hd": True,
                "is_featured": False,
                "is_live": True,
                "epg_now": "Live Broadcast",
                "epg_next": "Upcoming Program"
            }

            # Parse tvg-name or title
            name_match = re.search(r'tvg-name="([^"]+)"', line)
            if name_match:
                current_channel["name"] = name_match.group(1)
            else:
                # Comma separated title at end of line
                comma_split = line.rsplit(",", 1)
                if len(comma_split) > 1 and comma_split[1].strip():
                    current_channel["name"] = comma_split[1].strip()

            # Parse logo
            logo_match = re.search(r'tvg-logo="([^"]+)"', line)
            if logo_match:
                current_channel["logo"] = logo_match.group(1)

            # Parse group-title (category)
            group_match = re.search(r'group-title="([^"]+)"', line)
            if group_match:
                cat = group_match.group(1).strip()
                if cat:
                    current_channel["category"] = cat

            # Parse country code
            country_match = re.search(r'tvg-country="([^"]+)"', line) or re.search(r'tvg-language="([^"]+)"', line)
            if country_match:
                current_channel["country_code"] = country_match.group(1).upper()

        elif not line.startswith("#") and (line.startswith("http://") or line.startswith("https://")):
            if current_channel:
                current_channel["stream_url"] = line
                current_channel["stream_type"] = "hls" if ".m3u8" in line or "m3u8" in line else "hls"
                channels.append(current_channel)
                current_channel = {}

    return channels

def fetch_and_parse_m3u(url: str) -> List[Dict]:
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return parse_m3u_content(resp.text)
    except Exception as e:
        print(f"Error fetching M3U playlist from {url}: {e}")
        return []
