from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChannelBase(BaseModel):
    name: str
    logo: Optional[str] = None
    stream_url: str
    stream_type: Optional[str] = "hls"
    country: Optional[str] = "Global"
    country_code: Optional[str] = "US"
    category: Optional[str] = "Live TV"
    language: Optional[str] = "English"
    is_hd: Optional[bool] = True
    is_featured: Optional[bool] = False
    is_live: Optional[bool] = True
    epg_now: Optional[str] = None
    epg_next: Optional[str] = None

class ChannelCreate(ChannelBase):
    pass

class ChannelResponse(ChannelBase):
    id: int
    views_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class CountryInfo(BaseModel):
    name: str
    code: str
    flag: str
    count: int

class CategoryInfo(BaseModel):
    name: str
    icon: str
    count: int

class PlaylistImportRequest(BaseModel):
    url: Optional[str] = None
    content: Optional[str] = None
    name: Optional[str] = "Custom Playlist"
