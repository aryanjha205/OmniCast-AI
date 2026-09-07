// WORLD IPTV - FRONTEND PWA APPLICATION CODE

let state = {
  channels: [],
  featuredChannels: [],
  countries: [],
  categories: [],
  activeCountry: 'ALL',
  activeCategory: 'ALL',
  activeHd: 'ALL',
  searchQuery: '',
  favorites: JSON.parse(localStorage.getItem('world_iptv_favs') || '[]'),
  currentChannel: null,
  hlsPlayer: null,
  deferredPrompt: null
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initPWA();
  const page = document.body.getAttribute('data-page') || 'home';
  fetchInitialData().then(() => {
    if (page === 'livetv') {
      filterCategory('Live TV');
      const titleEl = document.getElementById('channelsSectionTitle');
      if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-tv"></i> Live TV Stream Directory`;
    } else if (page === 'mylist') {
      showFavorites();
    } else if (page === 'countries') {
      const titleEl = document.getElementById('channelsSectionTitle');
      if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-globe"></i> Browse Channels by Country`;
    }
  });
});

// MULTI-PAGE ROUTING CONTROLLER
function switchTab(tabName, event) {
  if (event && event.preventDefault) event.preventDefault();

  const currentPage = document.body.getAttribute('data-page') || 'home';
  
  if (tabName === 'home' && currentPage !== 'home') {
    window.location.href = '/index.html';
    return;
  }
  if (tabName === 'livetv' && currentPage !== 'livetv') {
    window.location.href = '/livetv.html';
    return;
  }
  if (tabName === 'countries' && currentPage !== 'countries') {
    window.location.href = '/countries.html';
    return;
  }
  if (tabName === 'mylist' && currentPage !== 'mylist') {
    window.location.href = '/mylist.html';
    return;
  }
}

// PWA SERVICE WORKER & INSTALL PROMPT
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.register('/sw.js').then(reg => {
      console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
    }).catch(err => console.error('[PWA] ServiceWorker registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    const pwaBtn = document.getElementById('pwaInstallBtn');
    if (pwaBtn) pwaBtn.style.display = 'flex';
  });
}

function installPWA() {
  if (state.deferredPrompt) {
    state.deferredPrompt.prompt();
    state.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('App installed successfully!');
      }
      state.deferredPrompt = null;
    });
  } else {
    showToast('App is already installed or open in desktop browser.');
  }
}

// DATA FETCHING
async function fetchInitialData() {
  renderSkeletons();
  await Promise.all([
    fetchFeaturedChannels(),
    fetchCountries(),
    fetchCategories(),
    fetchChannels()
  ]);
}

async function fetchChannels() {
  try {
    let url = `/api/channels?limit=20000`;
    if (state.searchQuery) url += `&q=${encodeURIComponent(state.searchQuery)}`;
    if (state.activeCountry !== 'ALL') url += `&country=${encodeURIComponent(state.activeCountry)}`;
    if (state.activeCategory !== 'ALL') url += `&category=${encodeURIComponent(state.activeCategory)}`;
    if (state.activeHd === 'HD') url += `&hd=true`;

    const res = await fetch(url);
    const data = await res.json();
    state.channels = data;
    renderChannels(data);
  } catch (err) {
    console.error('Error fetching channels:', err);
    showToast('Unable to load channels. Offline fallback active.');
  }
}

async function fetchFeaturedChannels() {
  try {
    const res = await fetch('/api/channels/featured');
    const data = await res.json();
    state.featuredChannels = data;
    if (data.length > 0) {
      renderHero(data[0]);
    }
  } catch (err) {
    console.error('Error fetching featured channels:', err);
  }
}

async function fetchCountries() {
  try {
    const res = await fetch('/api/countries');
    const data = await res.json();
    state.countries = data;
    renderCountries(data);
    populateCountryDropdown(data);
  } catch (err) {
    console.error('Error fetching countries:', err);
  }
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    state.categories = data;
    renderCategories(data);
    populateCategoryDropdown(data);
  } catch (err) {
    console.error('Error fetching categories:', err);
  }
}

// LOGO FALLBACK & SVG AVATAR GENERATOR
function getLogoFallbackSvg(name) {
  const words = (name || 'TV').trim().split(/\s+/);
  const initials = words.length > 1 
    ? (words[0][0] + words[1][0]).toUpperCase() 
    : (name || 'TV').slice(0, 2).toUpperCase();
  
  const gradients = [
    ['#3B82F6', '#1D4ED8'],
    ['#10B981', '#047857'],
    ['#8B5CF6', '#6D28D9'],
    ['#F59E0B', '#B45309'],
    ['#EC4899', '#BE185D'],
    ['#06B6D4', '#0E7490']
  ];
  let charCodeSum = 0;
  for (let i = 0; i < (name || '').length; i++) charCodeSum += name.charCodeAt(i);
  const grad = gradients[charCodeSum % gradients.length];
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g_${charCodeSum}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${grad[0]}" />
        <stop offset="100%" stop-color="${grad[1]}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="18" fill="url(#g_${charCodeSum})" />
    <text x="50" y="59" font-family="'Plus Jakarta Sans', sans-serif" font-size="38" font-weight="800" fill="#FFFFFF" text-anchor="middle">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function handleLogoError(imgEl, channelName) {
  if (imgEl) {
    imgEl.onerror = null;
    imgEl.src = getLogoFallbackSvg(channelName);
  }
}

// RENDERERS
function renderHero(channel) {
  state.currentHeroChannel = channel;
  const titleEl = document.getElementById('heroTitle');
  if (!titleEl) return;
  
  titleEl.innerText = channel.name;
  const logoEl = document.getElementById('heroLogo');
  if (logoEl) {
    logoEl.onerror = () => handleLogoError(logoEl, channel.name);
    logoEl.src = channel.logo || getLogoFallbackSvg(channel.name);
  }
  const descEl = document.getElementById('heroDesc');
  if (descEl) descEl.innerText = channel.epg_now || `${channel.name} Live Streaming HD.`;
  const catEl = document.getElementById('heroTagCat');
  if (catEl) catEl.innerText = channel.category || 'Live TV';
  const countryEl = document.getElementById('heroTagCountry');
  if (countryEl) countryEl.innerText = channel.country || 'Global';
  const bgEl = document.getElementById('heroBgOverlay');
  if (bgEl) bgEl.style.backgroundImage = `url('${channel.logo || getLogoFallbackSvg(channel.name)}')`;
  
  const isFav = state.favorites.includes(channel.id);
  const heroFavIcon = document.getElementById('heroFavIcon');
  if (heroFavIcon) {
    heroFavIcon.className = isFav ? 'fa-solid fa-check' : 'fa-solid fa-plus';
  }
}

function renderCountries(countries) {
  const container = document.getElementById('countriesContainer');
  if (!container) return;
  
  let html = `
    <div class="country-pill ${state.activeCountry === 'ALL' ? 'active' : ''}" onclick="filterCountry('ALL')">
      <span class="country-flag-icon">🌐</span>
      <span class="country-name">All Countries</span>
    </div>
  `;
  countries.forEach(c => {
    const isActive = state.activeCountry === c.code || state.activeCountry === c.name;
    html += `
      <div class="country-pill ${isActive ? 'active' : ''}" onclick="filterCountry('${c.code}')">
        <span class="country-flag-icon">${c.flag}</span>
        <span class="country-name">${c.name} (${c.count})</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderCategories(categories) {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  
  let html = '';
  const defaultCats = [
    { name: 'Live TV', icon: 'fa-tv' },
    { name: 'News', icon: 'fa-newspaper' },
    { name: 'Sports', icon: 'fa-football' },
    { name: 'Entertainment', icon: 'fa-film' },
    { name: 'Music', icon: 'fa-music' },
    { name: 'Kids', icon: 'fa-face-smile' },
    { name: 'Documentary', icon: 'fa-mountain' },
    { name: 'Lifestyle', icon: 'fa-leaf' }
  ];

  defaultCats.forEach(cat => {
    const isActive = state.activeCategory === cat.name;
    html += `
      <div class="category-card ${isActive ? 'active' : ''}" onclick="filterCategory('${cat.name}')">
        <div class="category-icon">
          <i class="fa-solid ${cat.icon}"></i>
        </div>
        <span class="category-title">${cat.name}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderChannels(channels) {
  const container = document.getElementById('channelsContainer');
  if (!container) return;

  if (!channels || channels.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-tv" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3 style="font-size: 18px; font-weight: 700;">No Channels Found</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Try searching for another country or category.</p>
      </div>
    `;
    return;
  }

  let html = '';
  channels.forEach(ch => {
    const isFav = state.favorites.includes(ch.id);
    const cleanName = (ch.name || 'Channel').replace(/'/g, "\\'");
    const logoSrc = ch.logo || getLogoFallbackSvg(ch.name);
    
    html += `
      <div class="channel-card">
        <div class="card-top">
          <div class="card-logo-container">
            <img class="card-logo" src="${logoSrc}" alt="${cleanName}" onerror="handleLogoError(this, '${cleanName}')">
          </div>
          <div class="card-badges">
            ${ch.is_hd ? '<span class="hd-badge">HD</span>' : ''}
            <span class="channel-live-pill"><span class="live-dot" style="width: 6px; height: 6px;"></span> LIVE</span>
          </div>
        </div>

        <div class="card-body">
          <h4 class="card-title">${ch.name}</h4>
          <div class="card-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${ch.country}</span> • 
            <span>${ch.category}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${ch.id})" title="Add to Favorites">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>

          <button class="play-btn-circle" onclick="openPlayerModal(${ch.id})" title="Play Live Stream">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderSkeletons() {
  const container = document.getElementById('channelsContainer');
  let html = '';
  for (let i = 0; i < 8; i++) {
    html += `
      <div class="channel-card" style="opacity: 0.6; min-height: 160px; animation: pulse 1.5s infinite;">
        <div style="width: 48px; height: 48px; background: #E2E8F0; border-radius: 12px; margin-bottom: 12px;"></div>
        <div style="width: 70%; height: 16px; background: #E2E8F0; border-radius: 4px; margin-bottom: 8px;"></div>
        <div style="width: 40%; height: 12px; background: #E2E8F0; border-radius: 4px;"></div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// DROPDOWN POPULATORS
function populateCountryDropdown(countries) {
  const select = document.getElementById('countryFilter');
  if (!select) return;
  select.innerHTML = '<option value="ALL">All Countries</option>';
  countries.forEach(c => {
    select.innerHTML += `<option value="${c.code}">${c.flag} ${c.name} (${c.count})</option>`;
  });
}

function populateCategoryDropdown(categories) {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  select.innerHTML = '<option value="ALL">All Categories</option>';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c.name}">${c.name} (${c.count})</option>`;
  });
}

// FILTERS & ACTIONS
function filterCountry(code) {
  state.activeCountry = code;
  renderCountries(state.countries);
  fetchChannels();
  document.getElementById('channelsSectionTitle').innerText = `Live TV - ${code === 'ALL' ? 'Global' : code}`;
}

function filterCategory(categoryName) {
  state.activeCategory = categoryName;
  renderCategories(state.categories);
  fetchChannels();
}

function filterHd(value) {
  state.activeHd = value;
  fetchChannels();
}

let searchTimeout = null;
function handleSearch(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = val.trim();
    fetchChannels();
  }, 300);
}

function showFavorites() {
  const favChannels = state.channels.filter(ch => state.favorites.includes(ch.id));
  renderChannels(favChannels);
  document.getElementById('channelsSectionTitle').innerText = `My Favorite Channels (${favChannels.length})`;
  showToast(`Displaying ${favChannels.length} favorite channels`);
}

function toggleFavorite(id) {
  const index = state.favorites.indexOf(id);
  if (index > -1) {
    state.favorites.splice(index, 1);
    showToast('Removed from My List');
  } else {
    state.favorites.push(id);
    showToast('Added to My List');
  }
  localStorage.setItem('world_iptv_favs', JSON.stringify(state.favorites));
  renderChannels(state.channels);

  if (state.currentChannel && state.currentChannel.id === id) {
    updatePlayerFavButton();
  }
}

// VIDEO PLAYER MODAL & HLS STREAMING ENGINE
function openPlayerModal(channelId) {
  const channel = state.channels.find(c => c.id === channelId) || state.featuredChannels.find(c => c.id === channelId);
  if (!channel) return;

  state.currentChannel = channel;
  const modal = document.getElementById('playerModal');
  document.getElementById('playerTitle').innerText = channel.name;
  document.getElementById('playerLogo').src = channel.logo || 'https://img.icons8.com/neon/192/play.png';
  document.getElementById('playerMeta').innerText = `${channel.country} | ${channel.category} | ${channel.language}`;
  document.getElementById('epgNowTitle').innerText = channel.epg_now || 'Live Broadcast Streaming';
  document.getElementById('epgNextTitle').innerText = channel.epg_next || 'Upcoming Program';

  updatePlayerFavButton();
  renderRelatedChannels(channel);

  modal.classList.add('active');

  // Initialize Video Stream with HLS.js
  const video = document.getElementById('hlsVideoPlayer');
  const streamUrl = channel.stream_url;

  if (state.hlsPlayer) {
    state.hlsPlayer.destroy();
    state.hlsPlayer = null;
  }

  if (Hls.isSupported()) {
    state.hlsPlayer = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    state.hlsPlayer.loadSource(streamUrl);
    state.hlsPlayer.attachMedia(video);
    state.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log('Autoplay prevented:', e));
    });
    state.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        showToast('Stream error encountered. Retrying...');
        state.hlsPlayer.startLoad();
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    video.play();
  } else {
    video.src = streamUrl;
  }
}

function playHeroChannel() {
  if (state.currentHeroChannel) {
    openPlayerModal(state.currentHeroChannel.id);
  }
}

function toggleHeroFavorite() {
  if (state.currentHeroChannel) {
    toggleFavorite(state.currentHeroChannel.id);
    renderHero(state.currentHeroChannel);
  }
}

function closePlayerModal() {
  const modal = document.getElementById('playerModal');
  modal.classList.remove('active');
  const video = document.getElementById('hlsVideoPlayer');
  video.pause();
  if (state.hlsPlayer) {
    state.hlsPlayer.destroy();
    state.hlsPlayer = null;
  }
}

function updatePlayerFavButton() {
  const btn = document.getElementById('playerFavBtn');
  if (!btn || !state.currentChannel) return;
  const isFav = state.favorites.includes(state.currentChannel.id);
  btn.innerHTML = `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${isFav ? 'Favorited' : 'Favorite'}`;
}

function toggleCurrentFavorite() {
  if (state.currentChannel) {
    toggleFavorite(state.currentChannel.id);
  }
}

function shareCurrentChannel() {
  if (!state.currentChannel) return;
  if (navigator.share) {
    navigator.share({
      title: `Watch ${state.currentChannel.name} on World IPTV`,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('Channel link copied to clipboard!');
  }
}

function renderRelatedChannels(currentCh) {
  const container = document.getElementById('relatedChannelsContainer');
  const related = state.channels.filter(c => c.category === currentCh.category && c.id !== currentCh.id).slice(0, 6);
  
  let html = '';
  related.forEach(r => {
    html += `
      <div class="country-pill" onclick="openPlayerModal(${r.id})" style="padding: 6px 12px;">
        <img src="${r.logo || 'https://img.icons8.com/neon/192/play.png'}" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain;">
        <span class="country-name">${r.name}</span>
      </div>
    `;
  });
  container.innerHTML = html || '<span style="color: #94A3B8; font-size: 12px;">No additional channels in category.</span>';
}

async function syncThirdPartyAPIs() {
  showToast('Syncing channels from Third-Party IPTV APIs...');
  try {
    const res = await fetch('/api/external/sync', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Third-Party APIs synced!');
      fetchInitialData();
    } else {
      showToast('API sync failed.');
    }
  } catch (err) {
    showToast('Failed to connect to API sync service');
  }
}

// IMPORT M3U MODAL
function openImportModal() {
  document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
}

async function submitImportPlaylist() {
  const name = document.getElementById('m3uName').value.trim();
  const url = document.getElementById('m3uUrl').value.trim();
  const content = document.getElementById('m3uContent').value.trim();

  if (!url && !content) {
    showToast('Please enter an M3U URL or paste content');
    return;
  }

  showToast('Parsing and importing channels...');
  try {
    const res = await fetch('/api/playlists/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, content })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message);
      closeImportModal();
      fetchInitialData();
    } else {
      showToast(`Import error: ${data.detail}`);
    }
  } catch (err) {
    showToast('Failed to import playlist');
  }
}

// UTILITIES
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--parrot-neon);"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  document.getElementById('themeIcon').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  showToast(`Switched to ${isDark ? 'Dark' : 'Light'} theme`);
}

// MULTI-LANGUAGE INTERNATIONALIZATION (i18n)
const TRANSLATIONS = {
  EN: {
    home: "Home",
    livetv: "Live TV",
    countries: "Countries",
    mylist: "My List",
    search: "Search channels, news, sports...",
    browse_categories: "Browse Categories",
    live_channels: "Live TV Channels",
    my_list_title: "My Favorite Channels",
    watch_live: "Watch Live",
    install_app: "Install App",
    live_now: "Live Now",
    all_countries: "All Countries",
    all_categories: "All Categories",
    quality_all: "Quality (All)",
    hd_only: "HD Only",
    now_playing: "Now Playing",
    up_next: "Up Next",
    lang_name: "English"
  },
  ES: {
    home: "Inicio",
    livetv: "TV en Vivo",
    countries: "Países",
    mylist: "Mi Lista",
    search: "Buscar canales, noticias, deportes...",
    browse_categories: "Explorar Categorías",
    live_channels: "Canales de TV en Vivo",
    my_list_title: "Mis Canales Favoritos",
    watch_live: "Ver en Vivo",
    install_app: "Instalar App",
    live_now: "En Vivo Ahora",
    all_countries: "Todos los Países",
    all_categories: "Todas las Categorías",
    quality_all: "Calidad (Todas)",
    hd_only: "Solo HD",
    now_playing: "Reproduciendo",
    up_next: "A Continuación",
    lang_name: "Español"
  },
  FR: {
    home: "Accueil",
    livetv: "TV en Direct",
    countries: "Pays",
    mylist: "Ma Liste",
    search: "Rechercher des chaînes, actus, sports...",
    browse_categories: "Parcourir les Catégories",
    live_channels: "Chaînes TV en Direct",
    my_list_title: "Mes Chaînes Préférées",
    watch_live: "Regarder en Direct",
    install_app: "Installer l'application",
    live_now: "En Direct Now",
    all_countries: "Tous les Pays",
    all_categories: "Toutes les Catégories",
    quality_all: "Qualité (Toutes)",
    hd_only: "HD Uniquement",
    now_playing: "En Cours",
    up_next: "À Suivre",
    lang_name: "Français"
  },
  DE: {
    home: "Startseite",
    livetv: "Live-TV",
    countries: "Länder",
    mylist: "Meine Liste",
    search: "Sender, Nachrichten, Sport suchen...",
    browse_categories: "Kategorien durchsuchen",
    live_channels: "Live-TV-Sender",
    my_list_title: "Meine Lieblingssender",
    watch_live: "Live Ansehen",
    install_app: "App Installieren",
    live_now: "Jetzt Live",
    all_countries: "Alle Länder",
    all_categories: "Alle Kategorien",
    quality_all: "Qualität (Alle)",
    hd_only: "Nur HD",
    now_playing: "Läuft Jetzt",
    up_next: "Als Nächstes",
    lang_name: "Deutsch"
  },
  HI: {
    home: "होम",
    livetv: "लाइव टीवी",
    countries: "देश",
    mylist: "मेरी सूची",
    search: "चैनल, समाचार, खेल खोजें...",
    browse_categories: "श्रेणियां देखें",
    live_channels: "लाइव टीवी चैनल",
    my_list_title: "मेरे पसंदीदा चैनल",
    watch_live: "लाइव देखें",
    install_app: "ऐप इंस्टॉल करें",
    live_now: "अभी लाइव",
    all_countries: "सभी देश",
    all_categories: "सभी श्रेणियां",
    quality_all: "गुणवत्ता (सभी)",
    hd_only: "केवल HD",
    now_playing: "अभी चल रहा है",
    up_next: "आगे देखिए",
    lang_name: "हिंदी"
  },
  AR: {
    home: "الرئيسية",
    livetv: "البث المباشر",
    countries: "الدول",
    mylist: "قائمتي",
    search: "ابحث عن القنوات، الأخبار، الرياضة...",
    browse_categories: "تصفح الفئات",
    live_channels: "قنوات التلفزيون المباشر",
    my_list_title: "قنواتي المفضلة",
    watch_live: "شاهد مباشر",
    install_app: "تثبيت التطبيق",
    live_now: "مباشر الآن",
    all_countries: "جميع الدول",
    all_categories: "جميع الفئات",
    quality_all: "الجودة (الكل)",
    hd_only: "عالي الدقة فقط",
    now_playing: "يعرض الآن",
    up_next: "التالي",
    lang_name: "العربية"
  }
};

function handleLangChange(lang) {
  state.currentLang = lang;
  localStorage.setItem('omnicast_lang', lang);
  applyLanguage(lang);
  showToast(`Language updated to ${TRANSLATIONS[lang]?.lang_name || lang}`);
}

function applyLanguage(lang) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.EN;
  state.currentLang = lang;
  
  // Set Text Direction for Arabic (RTL) vs LTR
  document.documentElement.dir = lang === 'AR' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang.toLowerCase();

  // Update Language Dropdown
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = lang;

  // Update Search Inputs
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.placeholder = t.search;

  const apiSearchInput = document.getElementById('apiSearchInput');
  if (apiSearchInput) apiSearchInput.placeholder = t.search;

  // Update Nav Links
  const navLinks = document.querySelectorAll('.nav-link');
  if (navLinks && navLinks.length >= 4) {
    if (navLinks[0]) navLinks[0].innerHTML = `<i class="fa-solid fa-house"></i> ${t.home}`;
    if (navLinks[1]) navLinks[1].innerHTML = `<i class="fa-solid fa-tv"></i> ${t.livetv}`;
    if (navLinks[2]) navLinks[2].innerHTML = `<i class="fa-solid fa-globe"></i> ${t.countries}`;
    if (navLinks[3]) navLinks[3].innerHTML = `<i class="fa-solid fa-heart"></i> ${t.mylist}`;
  }

  // Update Bottom Nav (Mobile)
  const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
  if (bottomNavItems && bottomNavItems.length >= 4) {
    if (bottomNavItems[0]?.querySelector('span')) bottomNavItems[0].querySelector('span').innerText = t.home;
    if (bottomNavItems[1]?.querySelector('span')) bottomNavItems[1].querySelector('span').innerText = t.livetv;
    if (bottomNavItems[2]?.querySelector('span')) bottomNavItems[2].querySelector('span').innerText = t.countries;
    if (bottomNavItems[3]?.querySelector('span')) bottomNavItems[3].querySelector('span').innerText = t.mylist;
  }

  // Update Filter Select Default Options
  const countryFilter = document.getElementById('countryFilter');
  if (countryFilter && countryFilter.options[0]) {
    countryFilter.options[0].text = t.all_countries;
  }

  const categoryFilter = document.getElementById('categoryFilter');
  if (categoryFilter && categoryFilter.options[0]) {
    categoryFilter.options[0].text = t.all_categories;
  }

  const hdFilter = document.getElementById('hdFilter');
  if (hdFilter && hdFilter.options.length >= 2) {
    hdFilter.options[0].text = t.quality_all;
    hdFilter.options[1].text = t.hd_only;
  }

  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.innerText = t[key];
    }
  });

  if (window.aryanAI && window.aryanAI.setLanguage) {
    window.aryanAI.setLanguage(lang);
  }
}

// Apply saved language on load
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('omnicast_lang') || 'EN';
  applyLanguage(savedLang);
});

// ==========================================================================
// ARYAN AI VOICE CONTROL APP INTERFACE
// ==========================================================================
window.appVoiceControls = {
  playChannelByName: function(name) {
    if (!state.channels || state.channels.length === 0) return { found: false };
    const query = name.toLowerCase().trim();
    
    // Exact or substring match search
    let target = state.channels.find(c => c.name.toLowerCase() === query) ||
                 state.channels.find(c => c.name.toLowerCase().includes(query)) ||
                 state.featuredChannels.find(c => c.name.toLowerCase().includes(query));

    if (target) {
      openPlayerModal(target.id);
      return { found: true, channel: target };
    } else {
      handleSearch(name);
      return { found: false };
    }
  },

  playChannelByIndex: function(index) {
    if (state.channels && state.channels[index]) {
      const ch = state.channels[index];
      openPlayerModal(ch.id);
      return ch.name;
    }
    return null;
  },

  nextChannel: function() {
    if (!state.channels || state.channels.length === 0) return;
    let currentIndex = 0;
    if (state.currentChannel) {
      currentIndex = state.channels.findIndex(c => c.id === state.currentChannel.id);
    }
    const nextIndex = (currentIndex + 1) % state.channels.length;
    openPlayerModal(state.channels[nextIndex].id);
  },

  previousChannel: function() {
    if (!state.channels || state.channels.length === 0) return;
    let currentIndex = 0;
    if (state.currentChannel) {
      currentIndex = state.channels.findIndex(c => c.id === state.currentChannel.id);
    }
    const prevIndex = (currentIndex - 1 + state.channels.length) % state.channels.length;
    openPlayerModal(state.channels[prevIndex].id);
  },

  pauseVideo: function() {
    const video = document.getElementById('hlsVideoPlayer');
    if (video) video.pause();
  },

  resumeVideo: function() {
    const video = document.getElementById('hlsVideoPlayer');
    if (video) video.play();
  },

  toggleMute: function(muteState) {
    const video = document.getElementById('hlsVideoPlayer');
    if (video) {
      if (typeof muteState === 'boolean') {
        video.muted = muteState;
      } else {
        video.muted = !video.muted;
      }
    }
  },

  setVolume: function(percent) {
    const video = document.getElementById('hlsVideoPlayer');
    if (video) {
      const val = Math.max(0, Math.min(100, percent)) / 100;
      video.volume = val;
      video.muted = false;
      showToast(`Volume set to ${percent}%`);
    }
  },

  changeVolume: function(delta) {
    const video = document.getElementById('hlsVideoPlayer');
    if (video) {
      video.volume = Math.max(0, Math.min(1, video.volume + delta));
      video.muted = false;
      showToast(`Volume: ${Math.round(video.volume * 100)}%`);
    }
  },

  toggleFullscreen: function() {
    const wrapper = document.querySelector('.video-wrapper') || document.getElementById('hlsVideoPlayer');
    if (!wrapper) return;
    if (!document.fullscreenElement) {
      if (wrapper.requestFullscreen) wrapper.requestFullscreen();
      else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  },

  closePlayer: function() {
    closePlayerModal();
  },

  searchChannels: function(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = query;
    handleSearch(query);
    scrollToSection('channels-section');
  },

  filterCategory: function(cat) {
    filterCategory(cat);
    scrollToSection('channels-section');
  },

  switchTab: function(tabName) {
    switchTab(tabName);
  },

  showFavorites: function() {
    switchTab('mylist');
  },

  addCurrentToFavorites: function() {
    toggleCurrentFavorite();
  },

  toggleTheme: function() {
    toggleTheme();
  },

  openImportModal: function() {
    openImportModal();
  },

  syncThirdPartyAPIs: function() {
    syncThirdPartyAPIs();
  }
};

// VOICE ASSISTANT UI HELPERS
function toggleVoiceAssistant() {
  if (window.aryanAI) {
    if (!window.aryanAI.isListening) {
      window.aryanAI.startListening();
      showToast('Aryan AI Assistant Activated! Say "Hey Aryan"...');
    }
    window.aryanAI.triggerWakeState();
  }
}

function handleOrbClick() {
  if (window.aryanAI) {
    window.aryanAI.startListening();
    window.aryanAI.triggerWakeState();
    window.aryanAI.speak('Yes? I am listening. Say a command or channel name!');
  }
}

function openVoiceHelpModal() {
  const modal = document.getElementById('voiceHelpModal');
  if (modal) modal.classList.add('active');
}

function closeVoiceHelpModal() {
  const modal = document.getElementById('voiceHelpModal');
  if (modal) modal.classList.remove('active');
}

// Auto-start hands-free listening when user interacts with page
document.addEventListener('click', () => {
  if (window.aryanAI && !window.aryanAI.isListening) {
    window.aryanAI.startListening();
  }
}, { once: true });

// DIRECT PLAYER OPENER FOR THIRD PARTY STREAMS
function openPlayerModalDirect(channel) {
  state.currentChannel = channel;
  const modal = document.getElementById('playerModal');
  if (!modal) return;

  const titleEl = document.getElementById('playerTitle');
  if (titleEl) titleEl.innerText = channel.name;

  const logoEl = document.getElementById('playerLogo');
  if (logoEl) {
    logoEl.onerror = () => handleLogoError(logoEl, channel.name);
    logoEl.src = channel.logo || getLogoFallbackSvg(channel.name);
  }

  const metaEl = document.getElementById('playerMeta');
  if (metaEl) metaEl.innerText = `${channel.country || 'Global'} | ${channel.category || 'Live TV'}`;

  const epgNow = document.getElementById('epgNowTitle');
  if (epgNow) epgNow.innerText = channel.epg_now || 'Live Broadcast Stream';

  updatePlayerFavButton();
  renderRelatedChannels(channel);

  modal.classList.add('active');

  const video = document.getElementById('hlsVideoPlayer');
  const streamUrl = channel.stream_url;

  if (state.hlsPlayer) {
    state.hlsPlayer.destroy();
    state.hlsPlayer = null;
  }

  if (Hls.isSupported()) {
    state.hlsPlayer = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    state.hlsPlayer.loadSource(streamUrl);
    state.hlsPlayer.attachMedia(video);
    state.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(e => console.log('Autoplay prevented:', e));
    });
    state.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        showToast('Stream connection re-establishing...');
        state.hlsPlayer.startLoad();
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    video.play();
  } else {
    video.src = streamUrl;
  }
}

// THIRD-PARTY LIVE TV API EXPLORER
function openApiExplorerModal() {
  const modal = document.getElementById('externalApiModal');
  if (modal) {
    modal.classList.add('active');
    searchThirdPartyApi('');
  }
}

function closeApiExplorerModal() {
  const modal = document.getElementById('externalApiModal');
  if (modal) modal.classList.remove('active');
}

let apiSearchTimeout = null;
function handleApiSearchInput(val) {
  clearTimeout(apiSearchTimeout);
  apiSearchTimeout = setTimeout(() => {
    searchThirdPartyApi(val);
  }, 300);
}

async function searchThirdPartyApi(query = '') {
  const container = document.getElementById('apiResultsContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--parrot-neon);"></i>
      <p style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">Fetching live streams from Third-Party IPTV APIs...</p>
    </div>
  `;

  try {
    const url = `/api/external/search?q=${encodeURIComponent(query)}&limit=40`;
    const res = await fetch(url);
    const data = await res.json();
    renderThirdPartyResults(data.results || []);
  } catch (err) {
    console.error('Error fetching external API streams:', err);
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted);">
        Unable to load third-party live stream index.
      </div>
    `;
  }
}

function renderThirdPartyResults(results) {
  const container = document.getElementById('apiResultsContainer');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        No live API streams matching your search.
      </div>
    `;
    return;
  }

  let html = '';
  results.forEach(stream => {
    const fallbackSrc = getLogoFallbackSvg(stream.name);
    const logoSrc = stream.logo || fallbackSrc;
    const cleanName = (stream.name || 'Live Channel').replace(/'/g, "\\'");
    const cleanUrl = (stream.stream_url || '').replace(/'/g, "\\'");
    
    html += `
      <div class="api-stream-card">
        <div class="api-stream-header">
          <img class="api-stream-logo" src="${logoSrc}" alt="${cleanName}" onerror="handleLogoError(this, '${cleanName}')">
          <div>
            <div class="api-stream-title">${stream.name}</div>
            <div class="api-stream-meta">${stream.country || 'Global'} • ${stream.category || 'Live TV'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="btn-primary-neon" style="padding: 6px 14px; font-size: 12px; flex: 1; justify-content: center;" onclick="playExternalStream('${cleanUrl}', '${cleanName}', '${logoSrc}', '${stream.country || 'Global'}', '${stream.category || 'Live TV'}')">
            <i class="fa-solid fa-play"></i> Watch Live
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function playExternalStream(streamUrl, channelName, logoUrl, country, category) {
  const channelObj = {
    id: 999999,
    name: channelName,
    stream_url: streamUrl,
    logo: logoUrl,
    country: country,
    category: category,
    epg_now: `${channelName} Live Stream (Third-Party API Feed)`
  };
  
  closeApiExplorerModal();
  openPlayerModalDirect(channelObj);
}

