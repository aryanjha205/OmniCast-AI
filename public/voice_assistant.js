/**
 * ARYAN AI - HANDS-FREE VOICE ASSISTANT FOR WORLD IPTV
 * Wake word: "Hey Aryan" or "Aryan"
 * Free AI (No API Key Required) via Web Speech API & Pollinations AI Text Engine
 */

class AryanVoiceAssistant {
  constructor() {
    this.wakeWord = 'aryan'; // Wake word trigger (case-insensitive substring)
    this.isListening = false;
    this.isSpeaking = false;
    this.isAwake = false; // State after wake word is recognized
    this.awakeTimeout = null;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.selectedVoice = null;
    this.pollinationsApiUrl = 'https://text.pollinations.ai/';

    // Bind event handlers
    this.initSpeechEngine();
    this.initVoices();
  }

  setLanguage(langCode) {
    const langMap = {
      EN: 'en-US',
      ES: 'es-ES',
      FR: 'fr-FR',
      DE: 'de-DE',
      HI: 'hi-IN',
      AR: 'ar-SA'
    };
    const speechLang = langMap[langCode] || 'en-US';
    if (this.recognition) {
      this.recognition.lang = speechLang;
    }
    if (this.synthesis) {
      const voices = this.synthesis.getVoices();
      const prefix = speechLang.split('-')[0];
      this.selectedVoice = voices.find(v => v.lang.startsWith(prefix)) || this.selectedVoice;
    }
    console.log(`[Aryan AI] Voice language set to ${speechLang}`);
  }

  initVoices() {
    if (!this.synthesis) return;
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Prefer natural, English voices (Siri-like)
      this.selectedVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.lang.startsWith('en')) || voices[0];
    };
    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  initSpeechEngine() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Aryan AI] Speech Recognition API is not supported in this browser.');
      this.updateUIStatus('Browser Not Supported', 'error');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateUIStatus('Listening for "Hey Aryan"...', 'listening');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimTranscript += transcriptText;
        }
      }

      const currentText = (finalTranscript || interimTranscript).trim();
      if (!currentText) return;

      this.showTranscript(currentText, 'user');

      // Check for Wake Word Activation
      const lower = currentText.toLowerCase();
      if (lower.includes('hey aryan') || lower.includes('aryan') || lower.includes('hey ai')) {
        this.triggerWakeState();
        
        // Strip wake word to extract actual command
        let command = lower
          .replace(/hey aryan/g, '')
          .replace(/aryan/g, '')
          .replace(/hey ai/g, '')
          .trim();

        if (command && finalTranscript) {
          this.processCommand(command);
        }
      } else if (this.isAwake && finalTranscript) {
        // AI is already awake listening for command
        this.processCommand(lower);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[Aryan AI] Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.updateUIStatus('Microphone Access Denied', 'error');
        this.speak('Microphone access was denied. Please allow microphone permissions.');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Auto restart background listening for continuous hands-free experience
      if (this.autoRestartEnabled) {
        setTimeout(() => this.startListening(), 400);
      } else {
        this.updateUIStatus('Voice Inactive', 'idle');
      }
    };
  }

  startListening() {
    this.autoRestartEnabled = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.log('[Aryan AI] Recognition start skipped:', e.message);
      }
    }
  }

  stopListening() {
    this.autoRestartEnabled = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  triggerWakeState() {
    this.isAwake = true;
    this.pulseOrb(true);
    this.updateUIStatus('Aryan Active - Listening...', 'awake');
    
    // Play subtle wake sound cue (synthesized audio beep)
    this.playWakeSound();

    clearTimeout(this.awakeTimeout);
    // Keep awake state active for 8 seconds after wake word
    this.awakeTimeout = setTimeout(() => {
      this.isAwake = false;
      this.pulseOrb(false);
      this.updateUIStatus('Listening for "Hey Aryan"...', 'listening');
    }, 8000);
  }

  playWakeSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // AudioContext fallback
    }
  }

  async processCommand(cmd) {
    console.log('[Aryan AI] Processing Command:', cmd);
    this.showTranscript(`Command: "${cmd}"`, 'command');
    this.updateUIStatus('Processing...', 'processing');

    // 1. CHANNEL CONTROL COMMANDS
    if (cmd.includes('open') || cmd.includes('play') || cmd.includes('switch to') || cmd.includes('watch') || cmd.includes('channel')) {
      // Check for Next / Previous channel
      if (cmd.includes('next channel') || cmd.includes('channel next')) {
        window.appVoiceControls.nextChannel();
        this.speak('Switching to the next channel');
        return;
      }
      if (cmd.includes('previous channel') || cmd.includes('prev channel') || cmd.includes('back channel')) {
        window.appVoiceControls.previousChannel();
        this.speak('Switching to the previous channel');
        return;
      }

      // Check for channel number (e.g., "play channel 3", "channel 5")
      const numMatch = cmd.match(/(?:channel|number)\s+(\d+)/);
      if (numMatch) {
        const chIndex = parseInt(numMatch[1], 10) - 1;
        const channelName = window.appVoiceControls.playChannelByIndex(chIndex);
        if (channelName) {
          this.speak(`Playing channel ${numMatch[1]}: ${channelName}`);
        } else {
          this.speak(`Channel number ${numMatch[1]} is not available.`);
        }
        return;
      }

      // Extract target channel name
      let searchTarget = cmd
        .replace(/open|play|switch to|watch|channel/g, '')
        .trim();

      if (searchTarget.length > 0) {
        const result = window.appVoiceControls.playChannelByName(searchTarget);
        if (result.found) {
          this.speak(`Opening ${result.channel.name} live stream now.`);
        } else {
          this.speak(`I searched for ${searchTarget}, but couldn't find an exact match. Displaying matching results.`);
        }
        return;
      }
    }

    // 2. PLAYER MEDIA CONTROLS
    if (cmd.includes('pause') || cmd.includes('stop video')) {
      window.appVoiceControls.pauseVideo();
      this.speak('Playback paused.');
      return;
    }

    if (cmd.includes('resume') || cmd.includes('start video') || (cmd === 'play')) {
      window.appVoiceControls.resumeVideo();
      this.speak('Resuming playback.');
      return;
    }

    if (cmd.includes('mute') && !cmd.includes('unmute')) {
      window.appVoiceControls.toggleMute(true);
      this.speak('Muted live audio.');
      return;
    }

    if (cmd.includes('unmute')) {
      window.appVoiceControls.toggleMute(false);
      this.speak('Audio unmuted.');
      return;
    }

    if (cmd.includes('volume')) {
      const volMatch = cmd.match(/(\d+)/);
      if (volMatch) {
        const volNum = parseInt(volMatch[1], 10);
        window.appVoiceControls.setVolume(volNum);
        this.speak(`Volume set to ${volNum} percent.`);
      } else if (cmd.includes('up') || cmd.includes('increase') || cmd.includes('higher')) {
        window.appVoiceControls.changeVolume(0.2);
        this.speak('Increased volume.');
      } else if (cmd.includes('down') || cmd.includes('decrease') || cmd.includes('lower')) {
        window.appVoiceControls.changeVolume(-0.2);
        this.speak('Decreased volume.');
      }
      return;
    }

    if (cmd.includes('full screen') || cmd.includes('fullscreen')) {
      window.appVoiceControls.toggleFullscreen();
      this.speak('Toggled fullscreen mode.');
      return;
    }

    if (cmd.includes('close player') || cmd.includes('exit player') || cmd.includes('close video')) {
      window.appVoiceControls.closePlayer();
      this.speak('Closed video player.');
      return;
    }

    // 3. SEARCH & CATEGORY FILTERS
    if (cmd.includes('search') || cmd.includes('find')) {
      const query = cmd.replace(/search|find|for/g, '').trim();
      window.appVoiceControls.searchChannels(query);
      this.speak(`Searching channels for ${query}`);
      return;
    }

    if (cmd.includes('show sports') || cmd.includes('sports channels')) {
      window.appVoiceControls.filterCategory('Sports');
      this.speak('Showing Sports channels.');
      return;
    }

    if (cmd.includes('show news') || cmd.includes('news channels')) {
      window.appVoiceControls.filterCategory('News');
      this.speak('Showing News channels.');
      return;
    }

    if (cmd.includes('show movies') || cmd.includes('entertainment')) {
      window.appVoiceControls.filterCategory('Entertainment');
      this.speak('Showing Entertainment channels.');
      return;
    }

    if (cmd.includes('show music')) {
      window.appVoiceControls.filterCategory('Music');
      this.speak('Showing Music channels.');
      return;
    }

    if (cmd.includes('show kids')) {
      window.appVoiceControls.filterCategory('Kids');
      this.speak('Showing Kids channels.');
      return;
    }

    if (cmd.includes('show favorites') || cmd.includes('my list') || cmd.includes('my favorites')) {
      window.appVoiceControls.switchTab('mylist');
      this.speak('Displaying your favorite channels in My List.');
      return;
    }

    if (cmd.includes('show countries') || cmd.includes('browse countries')) {
      window.appVoiceControls.switchTab('countries');
      this.speak('Displaying channels by country.');
      return;
    }

    if (cmd.includes('show live tv') || cmd.includes('open live tv')) {
      window.appVoiceControls.switchTab('livetv');
      this.speak('Opening Live TV directory.');
      return;
    }

    if (cmd.includes('add to favorite') || cmd.includes('save to my list') || cmd.includes('favorite this')) {
      window.appVoiceControls.addCurrentToFavorites();
      this.speak('Added channel to your list.');
      return;
    }

    // 4. NAVIGATION & THEMES
    if (cmd.includes('go home') || cmd.includes('show home') || cmd.includes('show all channels') || cmd.includes('reset filters')) {
      window.appVoiceControls.switchTab('home');
      this.speak('Returned to home section.');
      return;
    }

    if (cmd.includes('dark mode') || cmd.includes('light mode') || cmd.includes('toggle theme') || cmd.includes('change theme')) {
      window.appVoiceControls.toggleTheme();
      this.speak('Toggled theme background.');
      return;
    }

    if (cmd.includes('scroll down')) {
      window.scrollBy({ top: 500, behavior: 'smooth' });
      this.speak('Scrolling down.');
      return;
    }

    if (cmd.includes('scroll up') || cmd.includes('top of page')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.speak('Scrolling to top.');
      return;
    }

    if (cmd.includes('import playlist') || cmd.includes('add playlist')) {
      window.appVoiceControls.openImportModal();
      this.speak('Opened M3U playlist import dialog.');
      return;
    }

    if (cmd.includes('sync channels') || cmd.includes('update apis')) {
      window.appVoiceControls.syncThirdPartyAPIs();
      this.speak('Syncing channels from public IPTV APIs.');
      return;
    }

    // 5. EPG & INFO
    if (cmd.includes('what is playing') || cmd.includes('what is on now') || cmd.includes('channel info')) {
      const info = window.appVoiceControls.getEpgInfo();
      this.speak(info);
      return;
    }

    // 6. GENERAL AI ASSISTANCE FALLBACK (FREE AI POLLINATIONS API - NO KEY NEEDED)
    this.askFreeAI(cmd);
  }

  async askFreeAI(promptText) {
    try {
      this.updateUIStatus('Thinking (AI)...', 'thinking');
      const response = await fetch(`${this.pollinationsApiUrl}${encodeURIComponent(promptText)}?system=${encodeURIComponent('You are Aryan, an intelligent, polite AI voice assistant for OmniCast AI. Keep answers under 30 words so they sound great when spoken out loud.')}`);
      
      if (response.ok) {
        const text = await response.text();
        const cleanAnswer = text.replace(/[*#]/g, '').trim();
        this.speak(cleanAnswer || 'I am Aryan, your TV assistant. How can I help you?');
      } else {
        this.speak('I am here to assist you with channel playback and TV controls. Try asking to open BBC News or play Sports!');
      }
    } catch (err) {
      console.warn('[Aryan AI] Free AI API fallback error:', err);
      this.speak(`I heard you say ${promptText}. Say open BBC News or play Sports to watch live TV.`);
    }
  }

  speak(text) {
    if (!this.synthesis) return;
    
    // Stop any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    if (this.selectedVoice) utterance.voice = this.selectedVoice;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.pulseOrb(true, 'speaking');
      this.showTranscript(text, 'aryan');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.pulseOrb(false);
      this.updateUIStatus(this.isAwake ? 'Aryan Active - Listening...' : 'Listening for "Hey Aryan"...', this.isAwake ? 'awake' : 'listening');
    };

    this.synthesis.speak(utterance);
  }

  pulseOrb(active, mode = 'active') {
    const orb = document.getElementById('aryanAiOrb');
    if (!orb) return;

    if (active) {
      orb.classList.add('active');
      if (mode === 'speaking') {
        orb.classList.add('speaking');
      } else {
        orb.classList.remove('speaking');
      }
    } else {
      orb.classList.remove('active', 'speaking');
    }
  }

  updateUIStatus(statusText, stateClass) {
    const badge = document.getElementById('aryanStatusBadge');
    if (badge) {
      badge.innerText = statusText;
      badge.className = `aryan-status-badge ${stateClass}`;
    }
  }

  showTranscript(text, sender = 'aryan') {
    const box = document.getElementById('aryanTranscriptBox');
    if (!box) return;

    box.innerHTML = `
      <div class="aryan-transcript-content ${sender}">
        <span class="transcript-icon">${sender === 'user' ? '🗣️' : sender === 'command' ? '⚡' : '✨'}</span>
        <span class="transcript-text">${text}</span>
      </div>
    `;

    box.classList.add('show');
    clearTimeout(this.transcriptTimeout);
    this.transcriptTimeout = setTimeout(() => {
      box.classList.remove('show');
    }, 6000);
  }
}

// Global instance initialization
window.aryanAI = new AryanVoiceAssistant();
