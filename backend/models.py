from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from backend.database import Base

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    logo = Column(Text, nullable=True)
    stream_url = Column(Text, nullable=False)
    stream_type = Column(String(50), default="hls") # hls, iframe, mp4
    country = Column(String(100), index=True, default="Global")
    country_code = Column(String(10), index=True, default="US")
    category = Column(String(100), index=True, default="Live TV")
    language = Column(String(50), index=True, default="English")
    is_hd = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_live = Column(Boolean, default=True)
    epg_now = Column(String(255), nullable=True)
    epg_next = Column(String(255), nullable=True)
    views_count = Column(Integer, default=1200)
    created_at = Column(DateTime, default=datetime.utcnow)

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=True)
    channel_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
