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
            // ... (previous elements remain the same) ...
            favoriteBtn: document.getElementById('favoriteBtn'),
            playerFavoriteIcon: document.getElementById('playerFavoriteIcon'),
            // Add responsive elements
            playerControls: document.getElementById('playerControls'),
            playerInfo: document.getElementById('playerInfo'),
            playerStatus: document.getElementById('playerStatus')
        };

        this.audioElement = this.elements.audioElement;
    }

    setupEventListeners() {
        // ... (previous event listeners remain the same) ...
        
        // Favorite button in player
        this.elements.favoriteBtn.addEventListener('click', () => {
            if (this.currentStation) {
                this.toggleFavorite(null, this.currentStation);
                this.updatePlayerFavoriteButton();
            }
        });
    }

    // ... (previous methods remain the same until updatePlayerInfo) ...

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
        
        this.updatePlayerFavoriteButton();
    }

    updatePlayerFavoriteButton() {
        if (!this.currentStation) return;
        
        const isFavorite = this.isFavorite(this.currentStation);
        const icon = this.elements.playerFavoriteIcon;
        icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        this.elements.favoriteBtn.classList.toggle('active', isFavorite);
    }

    // ... (previous methods remain the same until createStationCard) ...

    createStationCard(station) {
        const country = station.country || 'Unknown';
        const language = station.language || '';
        const tags = station.tags ? station.tags.split(',').slice(0, 3).join(', ') : '';
        const favicon = station.favicon || '';
        const isFav = this.isFavorite(station);
        
        return `
            <div class="station-card" data-station-uuid="${station.stationuuid}">
                <div class="station-header">
                    <div class="station-logo">
                        ${favicon ? `<img src="${favicon}" alt="${station.name}" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
                        <div class="default-logo" ${favicon ? 'style="display:none"' : ''}>
                            <i class="fas fa-radio"></i>
                        </div>
                    </div>
                    <button class="favorite-btn ${isFav ? 'active' : ''}" data-station-uuid="${station.stationuuid}">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
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
                
                <button class="play-btn" title="Play ${station.name}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        `;
    }

    // ... (rest of the methods remain the same) ...
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.radioApp = new RadioApp();
});

// Service Worker registration
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
