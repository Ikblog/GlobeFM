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
        this.elements = {
            // Navigation
            homeTab: document.getElementById('homeTab'),
            favoritesTab: document.getElementById('favoritesTab'),
            searchTab: document.getElementById('searchTab'),
            settingsTab: document.getElementById('settingsTab'),
            
            // Content sections
            homeContent: document.getElementById('homeContent'),
            favoritesContent: document.getElementById('favoritesContent'),
            searchContent: document.getElementById('searchContent'),
            settingsContent: document.getElementById('settingsContent'),
            
            // Player elements
            audioElement: document.getElementById('audioElement'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            favoriteBtn: document.getElementById('favoriteBtn'),
            playerFavoriteIcon: document.getElementById('playerFavoriteIcon'),
            currentStationName: document.getElementById('currentStationName'),
            currentStationCountry: document.getElementById('currentStationCountry'),
            currentStationLogo: document.getElementById('currentStationLogo'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.getElementById('statusText'),
            minimizeBtn: document.getElementById('minimizeBtn'),
            
            // Other UI elements
            countrySelect: document.getElementById('countrySelect'),
            languageSelect: document.getElementById('languageSelect'),
            searchBtn: document.getElementById('searchBtn'),
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            retryBtn: document.getElementById('retryBtn'),
            stationCount: document.getElementById('stationCount'),
            stationsGrid: document.getElementById('stationsGrid'),
            favoritesGrid: document.getElementById('favoritesGrid'),
            stationSearchInput: document.getElementById('stationSearchInput'),
            stationSearchBtn: document.getElementById('stationSearchBtn'),
            searchResults: document.getElementById('searchResults'),
            themeToggle: document.getElementById('themeToggle'),
            themeSettingToggle: document.getElementById('themeSettingToggle'),
            autoPlayToggle: document.getElementById('autoPlayToggle'),
            defaultVolumeSlider: document.getElementById('defaultVolumeSlider'),
            clearFavoritesBtn: document.getElementById('clearFavoritesBtn')
        };

        this.audioElement = this.elements.audioElement;
    }

    setupEventListeners() {
        // Navigation tabs
        this.elements.homeTab.addEventListener('click', () => this.switchTab('home'));
        this.elements.favoritesTab.addEventListener('click', () => this.switchTab('favorites'));
        this.elements.searchTab.addEventListener('click', () => this.switchTab('search'));
        this.elements.settingsTab.addEventListener('click', () => this.switchTab('settings'));

        // Theme toggles
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.themeSettingToggle.addEventListener('click', () => this.toggleTheme());

        // Player controls
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
        this.elements.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.elements.minimizeBtn.addEventListener('click', () => this.togglePlayer());

        // Favorite button in player
        this.elements.favoriteBtn.addEventListener('click', () => {
            if (this.currentStation) {
                this.toggleFavorite(null, this.currentStation);
                this.updatePlayerFavoriteButton();
            }
        });

        // Search and filter controls
        this.elements.searchBtn.addEventListener('click', () => this.searchStations());
        this.elements.retryBtn.addEventListener('click', () => this.searchStations());
        this.elements.stationSearchBtn.addEventListener('click', () => this.searchByNameOrGenre());
        this.elements.stationSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchByNameOrGenre();
        });

        // Settings controls
        this.elements.clearFavoritesBtn.addEventListener('click', () => this.clearFavorites());
        this.elements.defaultVolumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
            this.elements.volumeSlider.value = e.target.value;
        });

        // Audio element events
        this.audioElement.addEventListener('play', () => this.onPlay());
        this.audioElement.addEventListener('pause', () => this.onPause());
        this.audioElement.addEventListener('error', () => this.onAudioError());
        this.audioElement.addEventListener('ended', () => this.onAudioEnded());
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('radioTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            this.elements.themeSettingToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.fetchCountries(),
                this.fetchLanguages()
            ]);
            this.searchStations();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data. Please try again.');
        }
    }
async fetchCountries() {
    try {
        const response = await fetch(`${this.apiBaseUrl}/json/countries`, {
            headers: {
                'User-Agent': this.userAgent
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch countries');
        }
        
        const countries = await response.json();
        this.countries = countries.sort((a, b) => a.name.localeCompare(b.name));
        
        // Populate country select dropdown
        this.elements.countrySelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Countries';
        this.elements.countrySelect.appendChild(defaultOption);
        
        this.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.name;
            option.textContent = country.name;
            this.elements.countrySelect.appendChild(option);
        });
        
        return this.countries;
    } catch (error) {
        console.error('Error fetching countries:', error);
        this.showError('Failed to load countries. Please try again.');
        throw error;
    }
}

async fetchLanguages() {
    try {
        const response = await fetch(`${this.apiBaseUrl}/json/languages`, {
            headers: {
                'User-Agent': this.userAgent
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch languages');
        }
        
        const languages = await response.json();
        this.languages = languages.sort((a, b) => a.name.localeCompare(b.name));
        
        // Populate language select dropdown
        this.elements.languageSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'All Languages';
        this.elements.languageSelect.appendChild(defaultOption);
        
        this.languages.forEach(language => {
            const option = document.createElement('option');
            option.value = language.name;
            option.textContent = language.name;
            this.elements.languageSelect.appendChild(option);
        });
        
        return this.languages;
    } catch (error) {
        console.error('Error fetching languages:', error);
        this.showError('Failed to load languages. Please try again.');
        throw error;
    }
}

async searchStations() {
    try {
        this.showLoading();
        this.hideError();
        
        const country = this.elements.countrySelect.value;
        const language = this.elements.languageSelect.value;
        
        let url = `${this.apiBaseUrl}/json/stations`;
        const params = [];
        
        if (country) params.push(`country=${encodeURIComponent(country)}`);
        if (language) params.push(`language=${encodeURIComponent(language)}`);
        
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch stations');
        }
        
        let stations = await response.json();
        
        // Filter out stations without working URLs
        stations = stations.filter(station => 
            station.url_resolved && 
            (station.url_resolved.startsWith('http') || station.url_resolved.startsWith('https'))
        );
        
        // Limit to 100 stations for performance
        stations = stations.slice(0, 100);
        
        this.stations = stations;
        this.currentStations = stations;
        this.displayStations(stations);
        this.updateStationCount(stations.length);
        
        return stations;
    } catch (error) {
        console.error('Error searching stations:', error);
        this.showError('Failed to load stations. Please try again.');
        throw error;
    } finally {
        this.hideLoading();
    }
}

async searchByNameOrGenre() {
    try {
        this.showLoading();
        this.hideError();
        
        const searchTerm = this.elements.stationSearchInput.value.trim();
        
        if (!searchTerm) {
            this.showError('Please enter a search term');
            return;
        }
        
        const url = `${this.apiBaseUrl}/json/stations/search?name=${encodeURIComponent(searchTerm)}&limit=100`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to search stations');
        }
        
        let stations = await response.json();
        
        // Filter out stations without working URLs
        stations = stations.filter(station => 
            station.url_resolved && 
            (station.url_resolved.startsWith('http') || station.url_resolved.startsWith('https'))
        );
        
        this.currentStations = stations;
        this.displaySearchResults(stations);
        this.updateStationCount(stations.length);
        
        return stations;
    } catch (error) {
        console.error('Error searching stations by name:', error);
        this.showError('Failed to search stations. Please try again.');
        throw error;
    } finally {
        this.hideLoading();
    }
}

displayStations(stations) {
    this.elements.stationsGrid.innerHTML = '';
    
    if (stations.length === 0) {
        this.elements.stationsGrid.innerHTML = '<p class="no-stations">No stations found</p>';
        return;
    }
    
    stations.forEach(station => {
        const stationCard = this.createStationCard(station);
        this.elements.stationsGrid.appendChild(stationCard);
    });
}

displaySearchResults(stations) {
    this.elements.searchResults.innerHTML = '';
    
    if (stations.length === 0) {
        this.elements.searchResults.innerHTML = '<p class="no-stations">No stations found</p>';
        return;
    }
    
    stations.forEach(station => {
        const stationCard = this.createStationCard(station);
        this.elements.searchResults.appendChild(stationCard);
    });
}

createStationCard(station) {
    const card = document.createElement('div');
    card.className = 'station-card';
    
    const isFavorite = this.favorites.some(fav => fav.stationuuid === station.stationuuid);
    
    card.innerHTML = `
        <div class="station-logo">
            ${station.favicon ? `<img src="${station.favicon}" alt="${station.name}" onerror="this.src='default-station.png'">` : '<div class="no-logo"><i class="fas fa-radio"></i></div>'}
        </div>
        <div class="station-info">
            <h3 class="station-name">${station.name}</h3>
            <p class="station-country">${station.country || 'Unknown'}</p>
            <p class="station-genre">${station.tags || station.genre || 'Various'}</p>
        </div>
        <div class="station-actions">
            <button class="play-btn" data-id="${station.stationuuid}">
                <i class="fas fa-play"></i>
            </button>
            <button class="favorite-btn" data-id="${station.stationuuid}">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
    `;
    
    // Add event listeners to the buttons
    const playBtn = card.querySelector('.play-btn');
    playBtn.addEventListener('click', () => this.playStation(station));
    
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(favoriteBtn, station);
    });
    
    return card;
}

playStation(station) {
    if (!station.url_resolved) {
        this.showError('This station has no playable URL');
        return;
    }
    
    try {
        this.currentStation = station;
        this.audioElement.src = station.url_resolved;
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                this.updatePlayerInfo(station);
                this.updatePlayerFavoriteButton();
            })
            .catch(error => {
                console.error('Error playing station:', error);
                this.showError('Failed to play station. Please try another one.');
            });
    } catch (error) {
        console.error('Error playing station:', error);
        this.showError('Failed to play station. Please try another one.');
    }
}

togglePlayPause() {
    if (!this.currentStation) {
        this.showError('No station selected');
        return;
    }
    
    if (this.isPlaying) {
        this.audioElement.pause();
    } else {
        this.audioElement.play()
            .catch(error => {
                console.error('Error playing station:', error);
                this.showError('Failed to play station. Please try another one.');
            });
    }
}

stop() {
    this.audioElement.pause();
    this.audioElement.src = '';
    this.isPlaying = false;
    this.updatePlayerState();
}

setVolume(volume) {
    this.audioElement.volume = volume / 100;
}

updatePlayerInfo(station) {
    this.elements.currentStationName.textContent = station.name;
    this.elements.currentStationCountry.textContent = station.country || 'Unknown';
    
    if (station.favicon) {
        this.elements.currentStationLogo.src = station.favicon;
        this.elements.currentStationLogo.style.display = 'block';
        this.elements.currentStationLogo.onerror = () => {
            this.elements.currentStationLogo.style.display = 'none';
        };
    } else {
        this.elements.currentStationLogo.style.display = 'none';
    }
    
    this.updatePlayerState();
}

updatePlayerState() {
    if (this.isPlaying) {
        this.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        this.elements.statusIndicator.className = 'status-indicator playing';
        this.elements.statusText.textContent = 'Now Playing';
    } else {
        this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.elements.statusIndicator.className = 'status-indicator paused';
        this.elements.statusText.textContent = 'Paused';
    }
}

updatePlayerFavoriteButton() {
    if (!this.currentStation) return;
    
    const isFavorite = this.favorites.some(fav => fav.stationuuid === this.currentStation.stationuuid);
    this.elements.playerFavoriteIcon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
}

toggleFavorite(button, station) {
    const index = this.favorites.findIndex(fav => fav.stationuuid === station.stationuuid);
    
    if (index === -1) {
        // Add to favorites
        this.favorites.push(station);
        if (button) {
            button.innerHTML = '<i class="fas fa-heart"></i>';
        }
    } else {
        // Remove from favorites
        this.favorites.splice(index, 1);
        if (button) {
            button.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
    
    // Save to localStorage
    localStorage.setItem('radioFavorites', JSON.stringify(this.favorites));
    
    // Update favorites display if we're on the favorites tab
    if (this.currentTab === 'favorites') {
        this.displayFavorites();
    }
}

displayFavorites() {
    this.elements.favoritesGrid.innerHTML = '';
    
    if (this.favorites.length === 0) {
        this.elements.favoritesGrid.innerHTML = '<p class="no-favorites">No favorite stations yet</p>';
        return;
    }
    
    this.favorites.forEach(station => {
        const stationCard = this.createStationCard(station);
        this.elements.favoritesGrid.appendChild(stationCard);
    });
}

clearFavorites() {
    if (confirm('Are you sure you want to clear all favorites?')) {
        this.favorites = [];
        localStorage.setItem('radioFavorites', JSON.stringify(this.favorites));
        this.displayFavorites();
        this.updatePlayerFavoriteButton();
    }
}

switchTab(tabName) {
    this.currentTab = tabName;
    
    // Hide all content sections
    this.elements.homeContent.style.display = 'none';
    this.elements.favoritesContent.style.display = 'none';
    this.elements.searchContent.style.display = 'none';
    this.elements.settingsContent.style.display = 'none';
    
    // Remove active class from all tabs
    this.elements.homeTab.classList.remove('active');
    this.elements.favoritesTab.classList.remove('active');
    this.elements.searchTab.classList.remove('active');
    this.elements.settingsTab.classList.remove('active');
    
    // Show selected content and mark tab as active
    switch (tabName) {
        case 'home':
            this.elements.homeContent.style.display = 'block';
            this.elements.homeTab.classList.add('active');
            break;
        case 'favorites':
            this.elements.favoritesContent.style.display = 'block';
            this.elements.favoritesTab.classList.add('active');
            this.displayFavorites();
            break;
        case 'search':
            this.elements.searchContent.style.display = 'block';
            this.elements.searchTab.classList.add('active');
            break;
        case 'settings':
            this.elements.settingsContent.style.display = 'block';
            this.elements.settingsTab.classList.add('active');
            break;
    }
}

toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('radioTheme', newTheme);
    
    if (newTheme === 'dark') {
        this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        this.elements.themeSettingToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        this.elements.themeSettingToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

togglePlayer() {
    const player = document.querySelector('.player-container');
    player.classList.toggle('minimized');
    
    if (player.classList.contains('minimized')) {
        this.elements.minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
    } else {
        this.elements.minimizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
    }
}

updateStationCount(count) {
    this.elements.stationCount.textContent = `${count} stations found`;
}

showLoading() {
    this.elements.loadingSpinner.style.display = 'block';
}

hideLoading() {
    this.elements.loadingSpinner.style.display = 'none';
}

showError(message) {
    this.elements.errorText.textContent = message;
    this.elements.errorMessage.style.display = 'block';
}

hideError() {
    this.elements.errorMessage.style.display = 'none';
}

onPlay() {
    this.isPlaying = true;
    this.updatePlayerState();
}

onPause() {
    this.isPlaying = false;
    this.updatePlayerState();
}

onAudioError() {
    this.showError('Error playing station. Please try another one.');
    this.isPlaying = false;
    this.updatePlayerState();
}

onAudioEnded() {
    this.isPlaying = false;
    this.updatePlayerState();
}
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const radioApp = new RadioApp();
});
