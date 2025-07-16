// FM Radio App JavaScript

class RadioApp {
    constructor() {
        this.apiBaseUrl = 'https://de1.api.radio-browser.info';
        this.userAgent = 'FM Radio App/1.0';
        this.currentStation = null;
        this.currentStations = [];
        this.audioElement = null;
        this.isPlaying = false;
        this.stations = [];
        this.countries = [];
        this.languages = [];
        this.favorites = JSON.parse(localStorage.getItem('radioFavorites')) || [];
        this.currentTab = 'home';
        
        this.init();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupTheme();
        await this.loadInitialData();
    }

    setupElements() {
        // Get DOM elements
        this.elements = {
            countrySelect: document.getElementById('countrySelect'),
            languageSelect: document.getElementById('languageSelect'),
            searchBtn: document.getElementById('searchBtn'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            retryBtn: document.getElementById('retryBtn'),
            stationsGrid: document.getElementById('stationsGrid'),
            stationCount: document.getElementById('stationCount'),
            audioPlayer: document.getElementById('audioPlayer'),
            audioElement: document.getElementById('audioElement'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            currentStationName: document.getElementById('currentStationName'),
            currentStationCountry: document.getElementById('currentStationCountry'),
            currentStationLogo: document.getElementById('currentStationLogo'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            minimizeBtn: document.getElementById('minimizeBtn'),
            themeToggle: document.getElementById('themeToggle'),
            // Bottom navigation elements
            homeTab: document.getElementById('homeTab'),
            favoritesTab: document.getElementById('favoritesTab'),
            searchTab: document.getElementById('searchTab'),
            settingsTab: document.getElementById('settingsTab'),
            homeContent: document.getElementById('homeContent'),
            favoritesContent: document.getElementById('favoritesContent'),
            searchContent: document.getElementById('searchContent'),
            settingsContent: document.getElementById('settingsContent'),
            // Search tab elements
            stationSearchInput: document.getElementById('stationSearchInput'),
            stationSearchBtn: document.getElementById('stationSearchBtn'),
            searchResults: document.getElementById('searchResults'),
            // Favorites elements
            favoritesGrid: document.getElementById('favoritesGrid'),
            // Settings elements
            themeSettingToggle: document.getElementById('themeSettingToggle'),
            autoPlayToggle: document.getElementById('autoPlayToggle'),
            defaultVolumeSlider: document.getElementById('defaultVolumeSlider'),
            clearFavoritesBtn: document.getElementById('clearFavoritesBtn')
        };

        this.audioElement = this.elements.audioElement;
    }

    setupEventListeners() {
        // Search functionality
        this.elements.searchBtn.addEventListener('click', () => this.searchStations());
        this.elements.retryBtn.addEventListener('click', () => this.searchStations());
        
        // Audio player controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.stopBtn.addEventListener('click', () => this.stopAudio());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.elements.minimizeBtn.addEventListener('click', () => this.minimizePlayer());
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Audio element events
        this.audioElement.addEventListener('loadstart', () => this.updateStatus('Loading...'));
        this.audioElement.addEventListener('canplay', () => this.updateStatus('Ready'));
        this.audioElement.addEventListener('playing', () => this.updateStatus('Playing'));
        this.audioElement.addEventListener('pause', () => this.updateStatus('Paused'));
        this.audioElement.addEventListener('error', () => this.handleAudioError());
        this.audioElement.addEventListener('ended', () => this.handleAudioEnded());

        // Bottom navigation
        this.elements.homeTab.addEventListener('click', () => this.switchTab('home'));
        this.elements.favoritesTab.addEventListener('click', () => this.switchTab('favorites'));
        this.elements.searchTab.addEventListener('click', () => this.switchTab('search'));
        this.elements.settingsTab.addEventListener('click', () => this.switchTab('settings'));

        // Search tab functionality
        this.elements.stationSearchBtn.addEventListener('click', () => this.performStationSearch());
        this.elements.stationSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performStationSearch();
        });

        // Settings functionality
        this.elements.themeSettingToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.autoPlayToggle.addEventListener('change', (e) => this.toggleAutoPlay(e.target.checked));
        this.elements.defaultVolumeSlider.addEventListener('input', (e) => this.setDefaultVolume(e.target.value));
        this.elements.clearFavoritesBtn.addEventListener('click', () => this.clearFavorites());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.currentStation) {
                e.preventDefault();
                this.togglePlayPause();
            }
        });
    }

    async loadInitialData() {
        try {
            this.showLoading();
            await Promise.all([
                this.loadCountries(),
                this.loadLanguages()
            ]);
            this.hideLoading();
            await this.searchStations(); // Load initial stations
        } catch (error) {
            this.showError('Failed to load initial data. Please check your internet connection.');
            console.error('Error loading initial data:', error);
        }
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.elements.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    async loadCountries() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/json/countries`);
            if (!response.ok) throw new Error('Failed to fetch countries');
            
            this.countries = await response.json();
            this.populateCountrySelect();
        } catch (error) {
            console.error('Error loading countries:', error);
            throw error;
        }
    }

    async loadLanguages() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/json/languages`);
            if (!response.ok) throw new Error('Failed to fetch languages');
            
            this.languages = await response.json();
            this.populateLanguageSelect();
        } catch (error) {
            console.error('Error loading languages:', error);
            throw error;
        }
    }

    populateCountrySelect() {
        const select = this.elements.countrySelect;
        select.innerHTML = '<option value="">All Countries</option>';
        
        this.countries
            .filter(country => country.stationcount > 0)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(country => {
                const option = document.createElement('option');
                option.value = country.name;
                option.textContent = `${country.name} (${country.stationcount})`;
                select.appendChild(option);
            });
    }

    populateLanguageSelect() {
        const select = this.elements.languageSelect;
        select.innerHTML = '<option value="">All Languages</option>';
        
        this.languages
            .filter(language => language.stationcount > 0)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(language => {
                const option = document.createElement('option');
                option.value = language.name;
                option.textContent = `${language.name} (${language.stationcount})`;
                select.appendChild(option);
            });
    }

    async searchStations() {
        try {
            this.showLoading();
            this.hideError();

            const country = this.elements.countrySelect.value;
            const language = this.elements.languageSelect.value;

            let url = `${this.apiBaseUrl}/json/stations/search?limit=50&hidebroken=true&order=clickcount&reverse=true`;
            
            if (country) {
                url += `&country=${encodeURIComponent(country)}`;
            }
            if (language) {
                url += `&language=${encodeURIComponent(language)}`;
            }

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.stations = await response.json();
            this.currentStations = this.stations;
            this.displayStations();
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            this.showError('Failed to load radio stations. Please try again.');
            console.error('Error searching stations:', error);
        }
    }

    displayStations() {
        const grid = this.elements.stationsGrid;
        const count = this.elements.stationCount;

        if (this.stations.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-radio" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No radio stations found. Try adjusting your filters.</p>
                </div>
            `;
            count.textContent = '0 stations found';
            return;
        }

        count.textContent = `${this.stations.length} stations found`;
        
        grid.innerHTML = this.stations.map(station => this.createStationCard(station)).join('');

        // Add click listeners to play buttons
        grid.querySelectorAll('.play-button').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playStation(this.stations[index]);
            });
        });

        // Add click listeners to station cards
        grid.querySelectorAll('.station-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.playStation(this.stations[index]);
            });
        });
    }

    createStationCard(station) {
        const country = station.country || 'Unknown';
        const language = station.language || '';
        const tags = station.tags ? station.tags.split(',').slice(0, 3).join(', ') : '';
        const favicon = station.favicon || '';
        const isFav = this.isFavorite(station);
        
        return `
            <div class="station-card">
                <div class="station-header">
                    <div class="station-logo">
                        ${favicon ? `<img src="${favicon}" alt="${station.name} logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                        <div class="default-logo" ${favicon ? 'style="display: none;"' : ''}>
                            <i class="fas fa-radio"></i>
                        </div>
                    </div>
                    <button class="favorite-btn ${isFav ? 'favorited' : ''}" data-station-uuid="${station.stationuuid}" onclick="radioApp.toggleFavorite(${JSON.stringify(station).replace(/"/g, '&quot;')})">
                        <i class="fas fa-heart${isFav ? '' : '-o'}"></i>
                    </button>
                </div>
                
                <div class="station-info">
                    <h3 class="station-name">${station.name}</h3>
                    <div class="station-details">
                        <span class="station-country">${country}</span>
                        ${language ? `<span class="station-language">${language}</span>` : ''}
                    </div>
                    ${tags ? `<div class="station-tags">${tags}</div>` : ''}
                </div>
                
                <button class="play-btn" onclick="radioApp.playStation(${JSON.stringify(station).replace(/"/g, '&quot;')})" title="Play ${station.name}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
    }

    async playStation(station) {
        try {
            if (this.currentStation && this.currentStation.stationuuid === station.stationuuid) {
                this.togglePlayPause();
                return;
            }

            this.currentStation = station;
            this.updatePlayerInfo(station);
            this.showPlayer();

            // Update play button states
            this.updatePlayButtonStates(station.stationuuid);

            // Use url_resolved if available, otherwise use url
            const streamUrl = station.url_resolved || station.url;
            
            if (!streamUrl) {
                throw new Error('No stream URL available for this station');
            }

            this.audioElement.src = streamUrl;
            this.audioElement.load();
            
            // Send click tracking to API
            this.trackStationClick(station.stationuuid);
            
            await this.audioElement.play();
            this.isPlaying = true;
            this.updatePlayPauseButton();

        } catch (error) {
            console.error('Error playing station:', error);
            this.showError(`Failed to play ${station.name}. The stream might be unavailable.`);
            this.updateStatus('Error');
        }
    }

    async trackStationClick(stationUuid) {
        try {
            await fetch(`${this.apiBaseUrl}/json/url/${stationUuid}`, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent
                }
            });
        } catch (error) {
            console.error('Error tracking station click:', error);
        }
    }

    togglePlayPause() {
        if (!this.currentStation) return;

        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            this.audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
                this.showError('Failed to play audio. The stream might be unavailable.');
            });
            this.isPlaying = true;
        }
        this.updatePlayPauseButton();
    }

    stopAudio() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.updateStatus('Stopped');
        this.updatePlayButtonStates(null);
    }

    setVolume(value) {
        this.audioElement.volume = value / 100;
    }

    updatePlayerInfo(station) {
        this.elements.currentStationName.textContent = station.name;
        this.elements.currentStationCountry.textContent = station.country || 'Unknown Country';
        
        if (station.favicon) {
            this.elements.currentStationLogo.src = station.favicon;
            this.elements.currentStationLogo.style.display = 'block';
            this.elements.currentStationLogo.nextElementSibling.style.display = 'none';
        } else {
            this.elements.currentStationLogo.style.display = 'none';
            this.elements.currentStationLogo.nextElementSibling.style.display = 'flex';
        }
    }

    updatePlayPauseButton() {
        const icon = this.elements.playPauseBtn.querySelector('i');
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            this.elements.playPauseBtn.classList.add('active');
        } else {
            icon.className = 'fas fa-play';
            this.elements.playPauseBtn.classList.remove('active');
        }
    }

    updatePlayButtonStates(activeStationUuid) {
        document.querySelectorAll('.play-button').forEach(btn => {
            const card = btn.closest('.station-card');
            const stationUuid = card.dataset.stationUuid;
            const icon = btn.querySelector('i');
            
            if (stationUuid === activeStationUuid && this.isPlaying) {
                btn.classList.add('playing');
                icon.className = 'fas fa-pause';
            } else {
                btn.classList.remove('playing');
                icon.className = 'fas fa-play';
            }
        });
    }

    updateStatus(text, isPlaying = false) {
        this.elements.statusText.textContent = text;
        const dot = this.elements.statusIndicator.querySelector('.status-dot');
        
        if (isPlaying) {
            dot.classList.add('playing');
        } else {
            dot.classList.remove('playing');
        }
    }

    showPlayer() {
        this.elements.audioPlayer.classList.add('active');
    }

    minimizePlayer() {
        this.elements.audioPlayer.classList.remove('active');
    }

    showLoading() {
        this.elements.loadingSpinner.style.display = 'flex';
        this.elements.stationsGrid.style.display = 'none';
    }

    hideLoading() {
        this.elements.loadingSpinner.style.display = 'none';
        this.elements.stationsGrid.style.display = 'grid';
    }

    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.style.display = 'flex';
    }

    hideError() {
        this.elements.errorMessage.style.display = 'none';
    }

    handleAudioError(event) {
        console.error('Audio error:', event);
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.updateStatus('Error');
        this.updatePlayButtonStates(null);
        
        const errorMessages = {
            1: 'Audio loading was aborted',
            2: 'Network error occurred while loading audio',
            3: 'Audio decoding failed',
            4: 'Audio format not supported'
        };
        
        const errorCode = this.audioElement.error ? this.audioElement.error.code : 0;
        const message = errorMessages[errorCode] || 'Unknown audio error occurred';
        
        this.showError(`${message}. Please try another station.`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Bottom Navigation Methods
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.getElementById(`${tabName}Tab`).classList.add('active');
        document.getElementById(`${tabName}Content`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load content based on tab
        if (tabName === 'favorites') {
            this.loadFavorites();
        } else if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    // Favorites Management
    toggleFavorite(station) {
        const index = this.favorites.findIndex(fav => fav.stationuuid === station.stationuuid);
        
        if (index === -1) {
            this.favorites.push(station);
        } else {
            this.favorites.splice(index, 1);
        }
        
        localStorage.setItem('radioFavorites', JSON.stringify(this.favorites));
        
        // Update UI
        if (this.currentTab === 'favorites') {
            this.loadFavorites();
        }
        
        // Update heart icons in current view
        this.updateFavoriteIcons();
    }

    isFavorite(station) {
        return this.favorites.some(fav => fav.stationuuid === station.stationuuid);
    }

    loadFavorites() {
        const favoritesGrid = this.elements.favoritesGrid;
        
        if (this.favorites.length === 0) {
            favoritesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No favorites yet</h3>
                    <p>Add stations to your favorites by clicking the heart icon</p>
                </div>
            `;
            return;
        }
        
        favoritesGrid.innerHTML = this.favorites.map(station => this.createStationCard(station)).join('');
    }

    updateFavoriteIcons() {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            const stationUuid = btn.dataset.stationUuid;
            const station = this.currentStations?.find(s => s.stationuuid === stationUuid);
            
            if (station) {
                const isFav = this.isFavorite(station);
                btn.innerHTML = `<i class="fas fa-heart${isFav ? '' : '-o'}"></i>`;
                btn.classList.toggle('favorited', isFav);
            }
        });
    }

    // Search Functionality
    async performStationSearch() {
        const query = this.elements.stationSearchInput.value.trim();
        
        if (!query) {
            this.elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Search for stations</h3>
                    <p>Enter a station name or genre to find radio stations</p>
                </div>
            `;
            return;
        }
        
        try {
            this.elements.searchResults.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Searching...</p></div>';
            
            const response = await fetch(`${this.apiBaseUrl}/json/stations/search?name=${encodeURIComponent(query)}&limit=50`, {
                headers: { 'User-Agent': this.userAgent }
            });
            
            if (!response.ok) throw new Error('Search failed');
            
            const stations = await response.json();
            this.currentStations = stations;
            
            if (stations.length === 0) {
                this.elements.searchResults.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>No results found</h3>
                        <p>Try searching with different keywords</p>
                    </div>
                `;
                return;
            }
            
            this.elements.searchResults.innerHTML = stations.map(station => this.createStationCard(station)).join('');
            
        } catch (error) {
            console.error('Search error:', error);
            this.elements.searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Search failed</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    // Settings Management
    loadSettings() {
        // Load current settings
        const autoPlay = localStorage.getItem('autoPlay') === 'true';
        const defaultVolume = localStorage.getItem('defaultVolume') || '50';
        
        this.elements.autoPlayToggle.checked = autoPlay;
        this.elements.defaultVolumeSlider.value = defaultVolume;
        
        // Update theme toggle icon
        const currentTheme = document.documentElement.getAttribute('data-theme');
        this.elements.themeSettingToggle.innerHTML = `<i class="fas fa-${currentTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    }

    toggleAutoPlay(enabled) {
        localStorage.setItem('autoPlay', enabled.toString());
    }

    setDefaultVolume(volume) {
        localStorage.setItem('defaultVolume', volume);
        this.elements.volumeSlider.value = volume;
        this.setVolume(volume);
    }

    clearFavorites() {
        if (confirm('Are you sure you want to clear all favorites?')) {
            this.favorites = [];
            localStorage.removeItem('radioFavorites');
            this.loadFavorites();
            this.updateFavoriteIcons();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.radioApp = new RadioApp();
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}