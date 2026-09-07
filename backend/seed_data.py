from backend.database import get_engine, get_session, Base
from backend.models import Channel, Playlist

INITIAL_CHANNELS = [
    # --- HERO / FEATURED NEWS ---
    {
        "name": "BBC World News",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/6/62/BBC_World_News_2022.svg",
        "stream_url": "https://d2e1asnsl7br7b.cloudfront.net/token=bg_ebd/04f137e651515f40398f5a2b/c/bbc_world_news/master.m3u8",
        "country": "United Kingdom",
        "country_code": "GB",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "epg_now": "Global News Today - Trusted Worldwide Insights",
        "epg_next": "World Business Report"
    },
    {
        "name": "France 24 English",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/France_24_logo.svg/512px-France_24_logo.svg.png",
        "stream_url": "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "epg_now": "Live International Headlines & Analysis",
        "epg_next": "The Debate & World Focus"
    },
    {
        "name": "NASA TV HD",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
        "stream_url": "https://ntv1.akamaized.net/hls/live/2014075/NASA-TV-Public/master.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Documentary",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "epg_now": "ISS Live Stream & Deep Space Operations",
        "epg_next": "Artemis Mission Updates & Cosmos"
    },
    {
        "name": "Red Bull TV",
        "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png",
        "stream_url": "https://rbmn-live.akamaized.net/hls/live/591070/GEO_DASH/master.m3u8",
        "country": "Austria",
        "country_code": "AT",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "epg_now": "Extreme X-Games & Downhill MTB Finals",
        "epg_next": "Formula 1 Pit Stop Documentaries"
    },
    {
        "name": "Deutsche Welle EN",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol_2012.svg/512px-Deutsche_Welle_symbol_2012.svg.png",
        "stream_url": "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
        "country": "Germany",
        "country_code": "DE",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": True,
        "epg_now": "DW News Live from Berlin",
        "epg_next": "Conflict Zone & Tech Asia"
    },

    # --- NEWS ---
    {
        "name": "Al Jazeera English",
        "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Al_Jazeera_English_logo.svg/512px-Al_Jazeera_English_logo.svg.png",
        "stream_url": "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
        "country": "Qatar",
        "country_code": "QA",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Al Jazeera News Live - Global Coverage",
        "epg_next": "Inside Story & Counting the Cost"
    },
    {
        "name": "EuroNews English",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Euronews_2016_logo.svg/512px-Euronews_2016_logo.svg.png",
        "stream_url": "https://euronews-euronews-live-1-eu.rakuten.wurl.tv/playlist.m3u8",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Europe Live News Bulletin",
        "epg_next": "No Comment & Climate Now"
    },
    {
        "name": "Sky News UK",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Sky_News_2017_logo.svg/512px-Sky_News_2017_logo.svg.png",
        "stream_url": "https://skynewsus-live.akamaized.net/hls/live/2012920/skynewsus/master.m3u8",
        "country": "United Kingdom",
        "country_code": "GB",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Sky News Today with Sarah-Jane Mee",
        "epg_next": "Press Preview & Business Live"
    },
    {
        "name": "Bloomberg Television",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bloomberg_logo.svg/512px-Bloomberg_logo.svg.png",
        "stream_url": "https://live-bloomberg-tv.akamaized.net/hls/live/2039981/event/master.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Bloomberg Surveillance & Markets",
        "epg_next": "Technology & Global Finance"
    },
    {
        "name": "CNN International",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/512px-CNN.svg.png",
        "stream_url": "https://cnn-cnninternational-1-eu.rakuten.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "CNN Newsroom Live",
        "epg_next": "Amanpour International Focus"
    },
    {
        "name": "NHK World Japan",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/NHK_World-Japan_2020.svg/512px-NHK_World-Japan_2020.svg.png",
        "stream_url": "https://nhkworld.akamaized.net/hls/live/2003459/nhkworld/gs_hls.m3u8",
        "country": "Japan",
        "country_code": "JP",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "NHK Newsline Live from Tokyo",
        "epg_next": "Grand Sumo Highlights & Tokyo Eye"
    },
    {
        "name": "Arirang TV Korea",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Arirang_TV_logo.svg/512px-Arirang_TV_logo.svg.png",
        "stream_url": "https://ambrpl.akamaized.net/hls/live/2040183/arirangtv/master.m3u8",
        "country": "South Korea",
        "country_code": "KR",
        "category": "Entertainment",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "K-Pop Simply Concerts Live",
        "epg_next": "Arirang News & Korea Today"
    },
    {
        "name": "ABC News Australia",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/ABC_News_Australia_2021.svg/512px-ABC_News_Australia_2021.svg.png",
        "stream_url": "https://abc-iview-mediapackagestream-2.akamaized.net/out/v1/6e1548679d6342b498f3c7e4bd4e5f73/index.m3u8",
        "country": "Australia",
        "country_code": "AU",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "ABC News Hour with Joe O'Brien",
        "epg_next": "Pacific Beat & The Drum"
    },
    {
        "name": "CBC News Canada",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/CBC_News_logo.svg/512px-CBC_News_logo.svg.png",
        "stream_url": "https://cbcnewssn-lh.akamaihd.net/i/cbcnewssn_1@382583/master.m3u8",
        "country": "Canada",
        "country_code": "CA",
        "category": "News",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "The National Live",
        "epg_next": "Power & Politics Canada"
    },
    {
        "name": "France 24 Français",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/France_24_logo.svg/512px-France_24_logo.svg.png",
        "stream_url": "https://static.france24.com/live/F24_FR_LO_HLS/live_tv.m3u8",
        "country": "France",
        "country_code": "FR",
        "category": "News",
        "language": "French",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Journal En Direct de Paris",
        "epg_next": "Actu Monde & Culture"
    },
    {
        "name": "France 24 Español",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/France_24_logo.svg/512px-France_24_logo.svg.png",
        "stream_url": "https://static.france24.com/live/F24_ES_LO_HLS/live_tv.m3u8",
        "country": "Spain",
        "country_code": "ES",
        "category": "News",
        "language": "Spanish",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Noticias Mundo Hoy",
        "epg_next": "El Debate Latino"
    },

    # --- SPORTS ---
    {
        "name": "ESPN Sports Highlights",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/512px-ESPN_wordmark.svg.png",
        "stream_url": "https://d15e98ebfa9043ca9ee9cb5f3b79d20c.mediatailor.us-east-1.amazonaws.com/v1/master/04f137e651515f40398f5a2b/ESPN_FAST/index.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "SportsCenter Live & NBA Game Recap",
        "epg_next": "NFL Live & College Football Breakdown"
    },
    {
        "name": "World Motorsport Network",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Motorsport.com_Logo.png/512px-Motorsport.com_Logo.png",
        "stream_url": "https://motorsport-motorsporttv-1-us.samsung.wurl.tv/playlist.m3u8",
        "country": "Germany",
        "country_code": "DE",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "GT3 Championship Sprint Race Live",
        "epg_next": "Superbike World Championship Highlights"
    },
    {
        "name": "EDGE Extreme Sports",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Extreme_Sports_Channel_Logo.png/512px-Extreme_Sports_Channel_Logo.png",
        "stream_url": "https://edge-edgesport-1-us.wurl.tv/playlist.m3u8",
        "country": "United Kingdom",
        "country_code": "GB",
        "category": "Sports",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "World Surf League Tahiti Pro",
        "epg_next": "BMX Freestyle Park Finals"
    },

    # --- ENTERTAINMENT & MOVIES ---
    {
        "name": "Fashion TV International",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/FashionTV_logo.svg/512px-FashionTV_logo.svg.png",
        "stream_url": "https://fashiontv-fashiontv-1-eu.rakuten.wurl.tv/playlist.m3u8",
        "country": "France",
        "country_code": "FR",
        "category": "Entertainment",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Paris Fashion Week Catwalk Live",
        "epg_next": "Milan Haute Couture & Model Profiles"
    },
    {
        "name": "Hollywood Movie Channel",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hollywood_Channel_logo.png/512px-Hollywood_Channel_logo.png",
        "stream_url": "https://freeup-filmriseaction-1-us.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Entertainment",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Action Blockbuster: The Matrix Revolutions",
        "epg_next": "Sci-Fi Thriller Hour"
    },
    {
        "name": "Zee Cinema International",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Zee_TV_logo.png/512px-Zee_TV_logo.png",
        "stream_url": "https://zeebollywood-fast-us.rakuten.wurl.tv/playlist.m3u8",
        "country": "India",
        "country_code": "IN",
        "category": "Entertainment",
        "language": "Hindi",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Bollywood Superhit Movie Matinee",
        "epg_next": "Classic Retro Melodies & Star Interviews"
    },
    {
        "name": "Star Plus Entertainment",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Star_Plus_2018.png/512px-Star_Plus_2018.png",
        "stream_url": "https://d35j504z0x1be1.cloudfront.net/out/v1/0879edff54ae460f9976eb6d3d4b6ecf/index.m3u8",
        "country": "India",
        "country_code": "IN",
        "category": "Entertainment",
        "language": "Hindi",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Prime Drama Special Episode",
        "epg_next": "Celebrity Dance Reality Show"
    },

    # --- MUSIC ---
    {
        "name": "MTV Music Hits",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/MTV_logo_2021.svg/512px-MTV_logo_2021.svg.png",
        "stream_url": "https://mtv-live-1-us.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Music",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Global Top 40 Music Video Countdown",
        "epg_next": "Unplugged Live Sessions"
    },
    {
        "name": "Clubbing TV Dance & EDM",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Clubbing_TV_logo.png/512px-Clubbing_TV_logo.png",
        "stream_url": "https://clubbingtv-fast-1-us.wurl.tv/playlist.m3u8",
        "country": "France",
        "country_code": "FR",
        "category": "Music",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Tomorrowland Live DJ Set Special",
        "epg_next": "Ibiza Sunset Deep House Mix"
    },

    # --- KIDS & CARTOONS ---
    {
        "name": "Cartoon Network Kids",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cartoon_Network_2010_logo.svg/512px-Cartoon_Network_2010_logo.svg.png",
        "stream_url": "https://freeup-pocketwatch-1-us.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Kids",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Adventure Time Marathon",
        "epg_next": "The Amazing World of Gumball"
    },
    {
        "name": "Duck TV Junior",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Ducktv_logo.png/512px-Ducktv_logo.png",
        "stream_url": "https://ducktv-fast-1-us.wurl.tv/playlist.m3u8",
        "country": "Germany",
        "country_code": "DE",
        "category": "Kids",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Fun Educational Cartoons for Toddlers",
        "epg_next": "Bedtime Lullaby Animations"
    },

    # --- DOCUMENTARY & NATURE ---
    {
        "name": "Discovery Science & Earth",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Discovery_Channel_logo.svg/512px-Discovery_Channel_logo.svg.png",
        "stream_url": "https://discovery-fast-1-us.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Documentary",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "MythBusters Extreme Engineering",
        "epg_next": "Deep Sea Secrets & Volcanology"
    },
    {
        "name": "National Geographic Wild",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/National_Geographic_logo.svg/512px-National_Geographic_logo.svg.png",
        "stream_url": "https://natgeo-fast-1-us.wurl.tv/playlist.m3u8",
        "country": "USA",
        "country_code": "US",
        "category": "Documentary",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "African Safari Wildlife Survival",
        "epg_next": "Kingdom of the Polar Bears"
    },

    # --- LIFESTYLE & COOKING ---
    {
        "name": "Gourmet Food & Travel",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Food_Network_logo.svg/512px-Food_Network_logo.svg.png",
        "stream_url": "https://tastemade-tastemade-1-us.wurl.tv/playlist.m3u8",
        "country": "Italy",
        "country_code": "IT",
        "category": "Lifestyle",
        "language": "English",
        "is_hd": True,
        "is_featured": False,
        "epg_now": "Italian Chef Secret Pasta Masterclass",
        "epg_next": "Street Food Adventures Tokyo"
    }
]

def seed_database():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    db = get_session()
    try:
        existing_count = db.query(Channel).count()
        if existing_count == 0:
            print(f"Seeding database with {len(INITIAL_CHANNELS)} channels...")
            for ch in INITIAL_CHANNELS:
                channel_obj = Channel(**ch)
                db.add(channel_obj)
            db.commit()
            print("Database successfully seeded!")
        else:
            print(f"Database already contains {existing_count} channels. Skipping initial seed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
