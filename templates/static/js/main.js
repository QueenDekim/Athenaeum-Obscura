// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('athenaeum-theme') || 'midnight-bloom';
        this.applyTheme(this.currentTheme);
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        localStorage.setItem('athenaeum-theme', themeName);
        
        document.querySelectorAll('.color-scheme').forEach(scheme => {
            scheme.classList.remove('selected');
        });
        
        const selectedScheme = document.querySelector(`.color-scheme[data-theme="${themeName}"]`);
        if (selectedScheme) {
            selectedScheme.classList.add('selected');
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Grid Pattern Generator
// function generateGridPattern() {
//     const gridPattern = document.querySelector('.grid-pattern');
//     if (!gridPattern) return;

//     const existingCanvas = gridPattern.querySelector('canvas');
//     if (existingCanvas) {
//         existingCanvas.remove();
//     }

//     const gridSize = 140;
//     const canvas = document.createElement('canvas');
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
    
//     const ctx = canvas.getContext('2d');
//     const gridColor = getComputedStyle(document.documentElement)
//         .getPropertyValue('--grid-line').trim();
    
//     ctx.strokeStyle = gridColor;
//     ctx.lineWidth = 1;
    
//     for (let x = 0; x <= canvas.width; x += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(x, 0);
//         ctx.lineTo(x, canvas.height);
//         ctx.stroke();
//     }
    
//     for (let y = 0; y <= canvas.height; y += gridSize) {
//         ctx.beginPath();
//         ctx.moveTo(0, y);
//         ctx.lineTo(canvas.width, y);
//         ctx.stroke();
//     }
    
//     gridPattern.appendChild(canvas);
// }

// Modal Management
class ModalManager {
    constructor() {
        this.modal = document.getElementById('settings-modal');
        this.closeBtn = this.modal?.querySelector('.close-btn');
        this.settingsBtn = document.querySelector('.settings-btn');
        
        this.bindEvents();
    }

    bindEvents() {
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.open());
        }
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('active');
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    }

    isOpen() {
        return this.modal?.classList.contains('active');
    }
}

// Tab Manager for Settings
class TabManager {
    constructor() {
        this.sidebarItems = document.querySelectorAll('.sidebar-item');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.bindEvents();
    }

    bindEvents() {
        this.sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                this.switchTab(tabId, item);
            });
        });
    }

    switchTab(tabId, activeItem) {
        this.sidebarItems.forEach(item => item.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));
        
        activeItem.classList.add('active');
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }
}

// Settings Manager
class SettingsManager {
    constructor() {
        this.settings = {
            autoRefresh: localStorage.getItem('athenaeum-auto-refresh') === 'true',
            refreshInterval: parseInt(localStorage.getItem('athenaeum-refresh-interval')) || 60
        };
        
        this.initializeSettings();
        this.bindEvents();
    }

    initializeSettings() {
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        const refreshIntervalSlider = document.getElementById('refresh-interval');
        const sliderValue = document.querySelector('.slider-value');

        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.checked = this.settings.autoRefresh;
        }

        if (refreshIntervalSlider) {
            refreshIntervalSlider.value = this.settings.refreshInterval;
        }

        if (sliderValue) {
            sliderValue.textContent = `${this.settings.refreshInterval}s`;
        }
    }

    bindEvents() {
        const autoRefreshCheckbox = document.getElementById('auto-refresh');
        const refreshIntervalSlider = document.getElementById('refresh-interval');
        const sliderValue = document.querySelector('.slider-value');

        if (autoRefreshCheckbox) {
            autoRefreshCheckbox.addEventListener('change', (e) => {
                this.settings.autoRefresh = e.target.checked;
                localStorage.setItem('athenaeum-auto-refresh', this.settings.autoRefresh);
                
                if (this.settings.autoRefresh) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            });
        }

        if (refreshIntervalSlider && sliderValue) {
            refreshIntervalSlider.addEventListener('input', (e) => {
                this.settings.refreshInterval = parseInt(e.target.value);
                sliderValue.textContent = `${this.settings.refreshInterval}s`;
                localStorage.setItem('athenaeum-refresh-interval', this.settings.refreshInterval);
                
                if (this.settings.autoRefresh) {
                    this.restartAutoRefresh();
                }
            });
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => {
            this.performRefresh();
        }, this.settings.refreshInterval * 1000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    restartAutoRefresh() {
        if (this.settings.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    performRefresh() {
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) {
            refreshButton.click();
        }
    }
}

// Refresh Manager
class RefreshManager {
    constructor() {
        this.refreshButton = document.getElementById('refresh-button');
        this.refreshModal = document.getElementById('refresh-modal');
        this.loadingText = document.querySelector('.loading-text');
        this.resultText = document.querySelector('.result-text');
        this.requestTimeout = 30000;
        
        this.bindEvents();
    }

    bindEvents() {
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.performRefresh();
            });
        }
    }

    performRefresh() {
        if (!this.refreshModal || !this.loadingText || !this.resultText) return;

        this.refreshModal.style.display = 'flex';
        this.loadingText.style.display = 'block';
        this.resultText.style.display = 'none';

        const timeoutId = setTimeout(() => {
            this.showResult('Превышено время ожидания ответа сервера');
        }, this.requestTimeout);

        fetch('/refresh', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            this.showResult(data.message, data.changes_count);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            console.error('Error:', error);
            this.showResult('Ошибка при обновлении: ' + error.message);
        });
    }

    showResult(message, changesCount = 0) {
        this.loadingText.style.display = 'none';
        this.resultText.style.display = 'block';
        this.resultText.textContent = message;

        if (changesCount > 0) {
            this.resultText.textContent += '. Страница будет обновлена...';
            setTimeout(() => window.location.reload(), 1000);
        } else {
            this.resultText.textContent += '.';
            setTimeout(() => {
                this.refreshModal.style.display = 'none';
            }, 3000);
            setTimeout(() => window.location.reload(), 1000);
        }
    }
}

// Main Application Class
class AthenaeumApp {
    constructor() {
        this.themeManager = new ThemeManager();
        this.modalManager = new ModalManager();
        this.tabManager = new TabManager();
        this.settingsManager = new SettingsManager();
        this.refreshManager = new RefreshManager();
        
        this.init();
    }

    init() {
        // generateGridPattern();
        // window.addEventListener('resize', () => generateGridPattern());
        this.initThemeSelector();
        this.initPagination();

        if (this.settingsManager.settings.autoRefresh) {
            this.settingsManager.startAutoRefresh();
        }
    }

    initThemeSelector() {
        const colorSchemes = document.querySelectorAll('.color-scheme');
        
        this.themeManager.applyTheme(this.themeManager.getCurrentTheme());
        
        colorSchemes.forEach(scheme => {
            scheme.addEventListener('click', () => {
                const themeName = scheme.getAttribute('data-theme');
                if (themeName) {
                    this.themeManager.applyTheme(themeName);
                    // setTimeout(() => generateGridPattern(), 100);
                }
            });
        });
    }

    initPagination() {
        const paginationButtons = document.querySelectorAll('.page-btn[data-page]');
        paginationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = button.getAttribute('data-page');
                window.location.href = `/?page=${page}`;
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const refreshModal = document.getElementById('refresh-modal');
    if (refreshModal) {
        refreshModal.style.display = 'none';
    }

    window.athenaeumApp = new AthenaeumApp();
});

document.addEventListener('visibilitychange', function() {
    if (window.athenaeumApp && window.athenaeumApp.settingsManager) {
        if (document.hidden) {
            window.athenaeumApp.settingsManager.stopAutoRefresh();
        } else if (window.athenaeumApp.settingsManager.settings.autoRefresh) {
            window.athenaeumApp.settingsManager.startAutoRefresh();
        }
    }
});

window.addEventListener('beforeunload', function() {
    if (window.athenaeumApp && window.athenaeumApp.settingsManager) {
        window.athenaeumApp.settingsManager.stopAutoRefresh();
    }
});

