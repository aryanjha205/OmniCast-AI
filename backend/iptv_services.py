import os
import requests
import logging
from typing import List, Dict
from backend.models import Channel
from backend.database import get_session
from backend.m3u_parser import fetch_and_parse_m3u

logger = logging.getLogger("iptv_services")

# High-reliability Working Public IPTV Playlists (Category-specific & Global)
IPTV_CATEGORY_PLAYLISTS = {
    "News": "https://iptv-org.github.io/iptv/categories/news.m3u",
    "Sports": "https://iptv-org.github.io/iptv/categories/sports.m3u",
    "Entertainment": "https://iptv-org.github.io/iptv/categories/entertainment.m3u",
    "Movies": "https://iptv-org.github.io/iptv/categories/movies.m3u",
    "Music": "https://iptv-org.github.io/iptv/categories/music.m3u",
    "Kids": "https://iptv-org.github.io/iptv/categories/kids.m3u",
    "Documentary": "https://iptv-org.github.io/iptv/categories/documentary.m3u",
    "Lifestyle": "https://iptv-org.github.io/iptv/categories/lifestyle.m3u"
}

# Guaranteed 24/7 Working Live Streams (Direct HLS feeds)
RELIABLE_CURATED_STREAMS = [
    {
        "name": "France 24 English HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/d/d7/France_24_logo.svg",
        "stream_url": "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8",
        "stream_type": "hls",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "is_live": True,
        "epg_now": "France 24 Live Headlines & Analysis",
        "epg_next": "The Debate & World Focus"
    },
    {
        "name": "Deutsche Welle EN HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/7/75/Deutsche_Welle_symbol_2012.svg",
        "stream_url": "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
        "stream_type": "hls",
        "country": "Germany",
        "country_code": "DE",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "is_live": True,
        "epg_now": "DW News Live from Berlin",
        "epg_next": "Conflict Zone & Tech Asia"
    },
    {
        "name": "Red Bull TV HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/f/f5/Red_Bull_TV_logo.svg",
        "stream_url": "https://rbmn-live.akamaized.net/hls/live/591070/GEO_DASH/master.m3u8",
        "stream_type": "hls",
        "country": "Austria",
        "country_code": "AT",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "is_live": True,
        "epg_now": "Extreme X-Games & Downhill MTB",
        "epg_next": "F1 Pit Stop Specials"
    },
    {
        "name": "NASA TV Public HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
        "stream_url": "https://ntv1.akamaized.net/hls/live/2014075/NASA-TV-Public/master.m3u8",
        "stream_type": "hls",
        "country": "USA",
        "country_code": "US",
        "category": "Documentary",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "is_live": True,
        "epg_now": "ISS Live Stream & Space Operations",
        "epg_next": "Artemis Mission Updates"
    },
    {
        "name": "Euronews World HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/0/09/Euronews_2016_logo.svg",
        "stream_url": "https://euronews-euronews-live-1-eu.rakuten.wurl.tv/playlist.m3u8",
        "stream_type": "hls",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "is_live": True,
        "epg_now": "Europe Live News Bulletin",
        "epg_next": "No Comment & Climate Now"
    },
    {
        "name": "Al Jazeera English",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/7/77/Al_Jazeera_English_logo.svg",
        "stream_url": "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
        "stream_type": "hls",
        "country": "Qatar",
        "country_code": "QA",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "is_live": True,
        "epg_now": "Al Jazeera Global News",
        "epg_next": "Inside Story & Earthrise"
    }
]

MASTER_INDEX_URL = "https://iptv-org.github.io/iptv/index.m3u"

def fetch_from_iptv_org_api(limit: int = None) -> List[Dict]:
    """
    Fetches active streams from master index.m3u and category playlists.
    If limit is specified, returns up to limit channels.
    """
    fetched_channels = []
    seen_urls = set()

    # Always include curated guaranteed streams first
    for ch in RELIABLE_CURATED_STREAMS:
        if ch["stream_url"] not in seen_urls:
            seen_urls.add(ch["stream_url"])
            fetched_channels.append(ch)

    # Fetch working channels across each category
    for cat_name, playlist_url in IPTV_CATEGORY_PLAYLISTS.items():
        if limit and len(fetched_channels) >= limit:
            break
        try:
            logger.info(f"Fetching IPTV playlist for {cat_name}: {playlist_url}")
            channels = fetch_and_parse_m3u(playlist_url)
            for c in channels:
                stream_url = c.get("stream_url")
                if stream_url and stream_url.startswith("http") and stream_url not in seen_urls:
                    seen_urls.add(stream_url)
                    c["category"] = cat_name
                    c["is_hd"] = True
                    c["is_live"] = True
                    fetched_channels.append(c)
                    if limit and len(fetched_channels) >= limit:
                        break
        except Exception as e:
            logger.warning(f"Could not load playlist for {cat_name}: {e}")

    if not limit or len(fetched_channels) < limit:
        # Parse channels from Master index.m3u
        try:
            logger.info(f"Parsing channels from IPTV-Org Master Index: {MASTER_INDEX_URL}")
            master_channels = fetch_and_parse_m3u(MASTER_INDEX_URL)
            for c in master_channels:
                stream_url = c.get("stream_url")
                if stream_url and (stream_url.startswith("http://") or stream_url.startswith("https://")) and stream_url not in seen_urls:
                    seen_urls.add(stream_url)
                    c["is_hd"] = True
                    c["is_live"] = True
                    fetched_channels.append(c)
                    if limit and len(fetched_channels) >= limit:
                        break
        except Exception as e:
            logger.warning(f"Could not load master index: {e}")

    return fetched_channels[:limit] if limit else fetched_channels

def sync_third_party_apis() -> int:
    """
    Syncs ALL working channels into the database using fast bulk insertion
    """
    db = get_session()
    added_count = 0
    try:
        existing_urls = set(row[0] for row in db.query(Channel.stream_url).all())
        channels = fetch_from_iptv_org_api()
        
        new_objects = []
        for c in channels:
            if c["stream_url"] not in existing_urls:
                existing_urls.add(c["stream_url"])
                new_objects.append(Channel(**c))
                added_count += 1
                
        if new_objects:
            db.bulk_save_objects(new_objects)
            db.commit()
            
        logger.info(f"Synced {added_count} new channels to database.")
        return added_count
    except Exception as e:
        logger.error(f"Error syncing third party APIs: {e}")
        db.rollback()
        return 0
    finally:
        db.close()
