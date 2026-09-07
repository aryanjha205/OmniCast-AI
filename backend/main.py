import os
from dotenv import load_dotenv

# Load environment configuration (.env)
load_dotenv()

from typing import List, Optional
from fastapi import FastAPI, Depends, Query, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.database import get_db, get_engine, Base
from backend.models import Channel, Playlist
from backend.schemas import ChannelResponse, CountryInfo, CategoryInfo, PlaylistImportRequest
from backend.seed_data import seed_database
from backend.m3u_parser import parse_m3u_content, fetch_and_parse_m3u
from backend.iptv_services import sync_third_party_apis, fetch_from_iptv_org_api

app = FastAPI(
    title="World IPTV API",
    description="Backend API service for World IPTV PWA application with Third-Party IPTV API Integrations",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    try:
        seed_database()
        print("FastAPI startup complete. Database ready!")
    except Exception as e:
        print(f"Startup notice: {e}")

# Flag Emoji Helper
def get_flag_emoji(country_code: str) -> str:
    if not country_code or len(country_code) != 2:
        return "🌐"
    country_code = country_code.upper()
    return chr(ord(country_code[0]) + 127397) + chr(ord(country_code[1]) + 127397)

COUNTRY_NAMES = {
    "US": "USA", "GB": "United Kingdom", "IN": "India", "CA": "Canada",
    "DE": "Germany", "FR": "France", "IT": "Italy", "ES": "Spain",
    "JP": "Japan", "KR": "South Korea", "AE": "UAE", "AU": "Australia",
    "QA": "Qatar", "AT": "Austria", "GL": "Global"
}

# --- API ROUTES ---

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    count = db.query(Channel).count()
    return {
        "status": "online",
        "service": "World IPTV API",
        "total_channels": count,
        "database": "Configured via .env (PostgreSQL / SQLite Active)",
        "third_party_apis": ["IPTV-Org API", "Samsung/Pluto Public Feeds"]
    }

@app.get("/api/channels", response_model=List[ChannelResponse])
def get_channels(
    q: Optional[str] = Query(None, description="Search query by channel name or country"),
    country: Optional[str] = Query(None, description="Filter by country or country code"),
    category: Optional[str] = Query(None, description="Filter by category"),
    language: Optional[str] = Query(None, description="Filter by language"),
    hd: Optional[bool] = Query(None, description="Filter HD channels"),
    featured: Optional[bool] = Query(None, description="Filter featured channels"),
    limit: int = Query(20000, ge=1, le=50000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Channel)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Channel.name.ilike(search_pattern),
                Channel.country.ilike(search_pattern),
                Channel.category.ilike(search_pattern),
                Channel.language.ilike(search_pattern)
            )
        )

    if country and country.upper() != "ALL":
        query = query.filter(
            or_(
                Channel.country.ilike(f"%{country}%"),
                Channel.country_code.ilike(country)
            )
        )

    if category and category.upper() != "ALL":
        query = query.filter(Channel.category.ilike(f"%{category}%"))

    if language and language.upper() != "ALL":
        query = query.filter(Channel.language.ilike(f"%{language}%"))

    if hd is not None:
        query = query.filter(Channel.is_hd == hd)

    if featured is not None:
        query = query.filter(Channel.is_featured == featured)

    channels = query.order_by(Channel.is_featured.desc(), Channel.id.asc()).offset(offset).limit(limit).all()
    return channels

@app.get("/api/channels/featured", response_model=List[ChannelResponse])
def get_featured_channels(db: Session = Depends(get_db)):
    featured = db.query(Channel).filter(Channel.is_featured == True).all()
    if not featured:
        featured = db.query(Channel).limit(5).all()
    return featured

@app.get("/api/channels/{channel_id}", response_model=ChannelResponse)
def get_channel_detail(channel_id: int, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel.views_count = (channel.views_count or 1000) + 1
    db.commit()
    db.refresh(channel)
    return channel

@app.get("/api/countries", response_model=List[CountryInfo])
def get_countries(db: Session = Depends(get_db)):
    results = db.query(Channel.country, Channel.country_code, func.count(Channel.id)).group_by(Channel.country, Channel.country_code).all()
    countries = []
    for c_name, c_code, count in results:
        code = c_code.upper() if c_code else "US"
        name = c_name or COUNTRY_NAMES.get(code, code)
        flag = get_flag_emoji(code)
        countries.append({
            "name": name,
            "code": code,
            "flag": flag,
            "count": count
        })
    countries.sort(key=lambda x: x["count"], reverse=True)
    return countries

@app.get("/api/categories", response_model=List[CategoryInfo])
def get_categories(db: Session = Depends(get_db)):
    results = db.query(Channel.category, func.count(Channel.id)).group_by(Channel.category).all()
    
    icon_map = {
        "Live TV": "tv",
        "News": "newspaper",
        "Sports": "football",
        "Entertainment": "clapperboard",
        "Music": "music",
        "Kids": "smile",
        "Documentary": "mountain",
        "Lifestyle": "leaf"
    }

    categories = []
    for cat_name, count in results:
        cat_clean = cat_name or "Live TV"
        categories.append({
            "name": cat_clean,
            "icon": icon_map.get(cat_clean, "tv"),
            "count": count
        })
    categories.sort(key=lambda x: x["count"], reverse=True)
    return categories

# --- THIRD PARTY API ENDPOINTS ---
@app.post("/api/external/sync")
def sync_external_apis():
    added = sync_third_party_apis()
    return {
        "status": "success",
        "message": f"Successfully synced {added} channels from third-party IPTV APIs",
        "added_count": added
    }

@app.get("/api/external/search")
def search_external_apis(
    q: Optional[str] = Query(None, description="Search term for external channel name or country"),
    limit: int = Query(30, ge=1, le=200)
):
    live_channels = fetch_from_iptv_org_api(limit=limit * 2)
    if q and q.strip():
        query_str = q.strip().lower()
        live_channels = [
            c for c in live_channels 
            if query_str in c.get("name", "").lower() 
            or query_str in c.get("country", "").lower() 
            or query_str in c.get("category", "").lower()
        ]
    results = live_channels[:limit]
    return {
        "provider": "IPTV-Org Live TV Index & Samsung/Pluto Feeds",
        "query": q,
        "count": len(results),
        "results": results
    }

@app.get("/api/external/providers")
def get_external_providers():
    return {
        "providers": [
            {
                "name": "IPTV-Org Master Index",
                "description": "Global crowdsourced database of public IPTV streams from 100+ countries",
                "type": "M3U8 / HLS",
                "status": "Active"
            },
            {
                "name": "Samsung TV Plus Public Feeds",
                "description": "Curated news, sports, entertainment, and documentary channels",
                "type": "HLS Stream",
                "status": "Active"
            },
            {
                "name": "Pluto TV & Rakuten FAST Channels",
                "description": "Free ad-supported television feeds with 24/7 linear playback",
                "type": "HLS Stream",
                "status": "Active"
            }
        ]
    }

@app.post("/api/playlists/import")
def import_playlist(payload: PlaylistImportRequest, db: Session = Depends(get_db)):
    channels_data = []
    if payload.url:
        channels_data = fetch_and_parse_m3u(payload.url)
    elif payload.content:
        channels_data = parse_m3u_content(payload.content)
    else:
        raise HTTPException(status_code=400, detail="Provide either url or content")

    if not channels_data:
        raise HTTPException(status_code=400, detail="No valid M3U channels parsed")

    added = 0
    for ch_dict in channels_data:
        ch = Channel(**ch_dict)
        db.add(ch)
        added += 1

    playlist_rec = Playlist(name=payload.name or "Imported Playlist", url=payload.url, channel_count=added)
    db.add(playlist_rec)
    db.commit()

    return {"status": "success", "message": f"Successfully imported {added} channels", "imported_count": added}

# Static file serving for PWA frontend
public_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
if os.path.exists(public_path):
    app.mount("/static", StaticFiles(directory=public_path), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(public_path, "index.html"))

    @app.get("/livetv")
    def read_livetv():
        return FileResponse(os.path.join(public_path, "livetv.html"))

    @app.get("/countries")
    def read_countries():
        return FileResponse(os.path.join(public_path, "countries.html"))

    @app.get("/mylist")
    def read_mylist():
        return FileResponse(os.path.join(public_path, "mylist.html"))

    @app.get("/{file_name:path}")
    def serve_frontend_files(file_name: str):
        target_file = os.path.join(public_path, file_name)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(public_path, "index.html"))
