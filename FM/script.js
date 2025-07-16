// FM Radio App JavaScript

class RadioApp {
    constructor() {
        this.apiBaseUrl = 'https://de1.api.radio-browser.info';
        this.currentStation = null;
        this.audioElement = null;
        this.isPlaying = false;
        this.stations = [];
        this.countries = [];
        this.languages = [];
        
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
            themeToggle: document.getElementById('themeToggle')
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
        this.audioElement.addEventListener('canplay', () => this.updateStatus('Ready to play'));
        this.audioElement.addEventListener('playing', () => this.updateStatus('Playing', true));
        this.audioElement.addEventListener('pause', () => this.updateStatus('Paused'));
        this.audioElement.addEventListener('error', (e) => this.handleAudioError(e));
        this.audioElement.addEventListener('ended', () => this.stopAudio());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.currentStation) {
                e.preventDefault();
                this.togglePlayPause();
            }
        });
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
                    'User-Agent': 'FM Radio App/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.stations = await response.json();
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
        const logoUrl = station.favicon || '';
        const country = station.country || 'Unknown';
        const language = station.language || '';
        const tags = station.tags ? station.tags.split(',').slice(0, 3) : [];

        return `
            <div class="station-card" data-station-uuid="${station.stationuuid}">
                <div class="station-card-header">
                    <div class="station-logo">
                        <img src="${logoUrl}" alt="${station.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="default-logo" style="display: none;">
                            <i class="fas fa-radio"></i>
                        </div>
                    </div>
                    <div class="station-info">
                        <h3>${this.escapeHtml(station.name)}</h3>
                        <div class="station-meta">
                            <span class="station-tag">${country}</span>
                            ${language ? `<span class="station-tag">${language}</span>` : ''}
                            ${tags.map(tag => `<span class="station-tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                        </div>
                    </div>
                    <button class="play-button" title="Play ${this.escapeHtml(station.name)}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
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
                    'User-Agent': 'FM Radio App/1.0'
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RadioApp();
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

