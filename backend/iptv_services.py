import os
import requests
import logging
from typing import List, Dict
from backend.models import Channel
from backend.database import get_session

logger = logging.getLogger("iptv_services")

IPTV_ORG_CHANNELS_API = os.getenv("IPTV_ORG_CHANNELS_API", "https://iptv-org.github.io/api/channels.json")
IPTV_ORG_STREAMS_API = os.getenv("IPTV_ORG_STREAMS_API", "https://iptv-org.github.io/api/streams.json")
FREE_IPTV_PLAYLIST_URL = os.getenv("FREE_IPTV_PLAYLIST_URL", "https://iptv-org.github.io/iptv/index.m3u")

FALLBACK_EXTERNAL_CHANNELS = [
    {
        "name": "Euronews World HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Euronews_2016_logo.svg/512px-Euronews_2016_logo.svg.png",
        "stream_url": "https://euronews-euronews-live-1-eu.rakuten.wurl.tv/playlist.m3u8",
        "stream_type": "hls",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "is_live": True,
        "epg_now": "Euronews Live News",
        "epg_next": "Global Bulletin"
    },
    {
        "name": "Red Bull TV X-Games",
        "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png",
        "stream_url": "https://rbmn-live.akamaized.net/hls/live/591070/GEO_DASH/master.m3u8",
        "stream_type": "hls",
        "country": "Austria",
        "country_code": "AT",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "is_live": True,
        "epg_now": "Extreme Surfing & Downhill MTB",
        "epg_next": "F1 Pit Stop Specials"
    }
]

def fetch_from_iptv_org_api(limit: int = 30) -> List[Dict]:
    """
    Fetches live streams and channel metadata from IPTV-org open API with immediate fallback
    """
    try:
        logger.info(f"Fetching third-party channels from IPTV-org API: {IPTV_ORG_CHANNELS_API}")
        channels_resp = requests.get(IPTV_ORG_CHANNELS_API, timeout=3)
        streams_resp = requests.get(IPTV_ORG_STREAMS_API, timeout=3)

        if channels_resp.status_code != 200 or streams_resp.status_code != 200:
            return FALLBACK_EXTERNAL_CHANNELS

        channels_data = channels_resp.json()
        streams_data = streams_resp.json()

        stream_map = {}
        for s in streams_data:
            if s.get("channel") and s.get("url"):
                stream_map[s["channel"]] = s["url"]

        valid_channels = []
        count = 0
        for ch in channels_data:
            ch_id = ch.get("id")
            if not ch_id or ch_id not in stream_map:
                continue

            stream_url = stream_map[ch_id]
            c_code = (ch.get("country") or "US").upper()
            
            item = {
                "name": ch.get("name") or "Live Stream",
                "logo": ch.get("logo") or "",
                "stream_url": stream_url,
                "stream_type": "hls",
                "country": ch.get("country") or "Global",
                "country_code": c_code,
                "category": ch.get("categories", ["Live TV"])[0] if ch.get("categories") else "Live TV",
                "language": ch.get("languages", ["English"])[0] if ch.get("languages") else "English",
                "is_hd": True,
                "is_featured": False,
                "is_live": True,
                "epg_now": f"Live Stream from {ch.get('name')}",
                "epg_next": "Upcoming Broadcast"
            }
            valid_channels.append(item)
            count += 1
            if count >= limit:
                break

        return valid_channels if valid_channels else FALLBACK_EXTERNAL_CHANNELS

    except Exception as e:
        logger.warning(f"Using fallback external channels due to API timeout/error: {e}")
        return FALLBACK_EXTERNAL_CHANNELS

def fetch_from_pluto_samsung_api() -> List[Dict]:
    return FALLBACK_EXTERNAL_CHANNELS

def sync_third_party_apis() -> int:
    db = get_session()
    added_count = 0
    try:
        combined = fetch_from_iptv_org_api(limit=20)
        for c in combined:
            existing = db.query(Channel).filter(Channel.stream_url == c["stream_url"]).first()
            if not existing:
                ch_obj = Channel(**c)
                db.add(ch_obj)
                added_count += 1
        db.commit()
        return added_count
    except Exception as e:
        logger.error(f"Error syncing third party APIs: {e}")
        db.rollback()
        return 0
    finally:
        db.close()
