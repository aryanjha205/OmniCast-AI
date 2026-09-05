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
  fetchInitialData();
});

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
    let url = `/api/channels?limit=100`;
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

// RENDERERS
function renderHero(channel) {
  state.currentHeroChannel = channel;
  document.getElementById('heroTitle').innerText = channel.name;
  document.getElementById('heroLogo').src = channel.logo || 'https://img.icons8.com/neon/192/play.png';
  document.getElementById('heroDesc').innerText = channel.epg_now || `${channel.name} Live Streaming HD.`;
  document.getElementById('heroTagCat').innerText = channel.category || 'Live TV';
  document.getElementById('heroTagCountry').innerText = channel.country || 'Global';
  document.getElementById('heroBgOverlay').style.backgroundImage = `url('${channel.logo || 'https://img.icons8.com/neon/192/play.png'}')`;
  
  const isFav = state.favorites.includes(channel.id);
  const heroFavIcon = document.getElementById('heroFavIcon');
  if (heroFavIcon) {
    heroFavIcon.className = isFav ? 'fa-solid fa-check' : 'fa-solid fa-plus';
  }
}

function renderCountries(countries) {
  const container = document.getElementById('countriesContainer');
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
    html += `
      <div class="channel-card">
        <div class="card-top">
          <div class="card-logo-container">
            <img class="card-logo" src="${ch.logo || 'https://img.icons8.com/neon/192/play.png'}" alt="${ch.name}" onerror="this.src='https://img.icons8.com/neon/192/play.png'">
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

function handleLangChange(lang) {
  showToast(`Language set to ${lang}`);
}

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

  showFavorites: function() {
    showFavorites();
    scrollToSection('channels-section');
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
  },

  getEpgInfo: function() {
    if (state.currentChannel) {
      return `Currently playing ${state.currentChannel.name}. Live program: ${state.currentChannel.epg_now || 'Live Broadcast'}. Up next: ${state.currentChannel.epg_next || 'Upcoming Show'}.`;
    }
    return `No channel is currently playing. Ask me to open BBC News or play Sports channels!`;
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

