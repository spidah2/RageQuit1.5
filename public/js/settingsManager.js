/**
 * settingsManager.js - Centralized game settings and preferences
 * Manages graphics, audio, gameplay, and control preferences
 */

class SettingsManager {
    constructor() {
        // Default settings
        this._settings = {
            // Graphics
            graphics: {
                shadowsEnabled: false,
                particlesEnabled: true,
                maxParticles: 100,
                fpsLimit: 144,
                antialiasing: false
            },
            
            // Audio
            audio: {
                masterVolume: 1.0,
                effectsVolume: 0.6,
                musicVolume: 0.3,
                voiceEnabled: true,
                soundEnabled: true
            },
            
            // Gameplay
            gameplay: {
                difficulty: 'normal', // 'easy', 'normal', 'hard'
                autoRespawn: true,
                respawnTime: 3000, // milliseconds
                killNotifications: true,
                damageNumbers: true,
                colorBlindMode: false
            },
            
            // Controls
            controls: {
                mouseSensitivity: 1.0,
                invertY: false,
                holdToSprintInstead: false,
                alwaysRun: false,
                fieldOfView: 75
            },
            
            // UI
            ui: {
                hudScale: 1.0,
                showFPS: true,
                showPing: true,
                chatOpacity: 0.8,
                miniMapEnabled: true
            },
            
            // Advanced
            advanced: {
                interpolationDelay: 100,
                lodEnabled: true,
                spawnProtection: 3000
            }
        };
        
        // Observers for setting changes
        this._observers = {};
        
        // Load from storage
        this._loadFromStorage();
    }
    
    /**
     * Get a setting value
     */
    get(path) {
        const parts = path.split('.');
        let value = this._settings;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                logGame(`Setting not found: ${path}`, 'GAME');
                return undefined;
            }
        }
        
        return value;
    }
    
    /**
     * Set a setting value
     */
    set(path, value) {
        const parts = path.split('.');
        const lastPart = parts.pop();
        
        let obj = this._settings;
        for (const part of parts) {
            if (!(part in obj)) {
                obj[part] = {};
            }
            obj = obj[part];
        }
        
        const oldValue = obj[lastPart];
        obj[lastPart] = value;
        
        // Notify observers
        this._notifyObservers(path, value, oldValue);
        
        // Save to storage
        this._saveToStorage();
        
        logGame(`Setting changed: ${path} = ${value}`, 'GAME');
    }
    
    /**
     * Set multiple settings at once
     */
    setMultiple(updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.set(path, value);
        }
    }
    
    /**
     * Get all settings
     */
    getAll() {
        return JSON.parse(JSON.stringify(this._settings));
    }
    
    /**
     * Get settings for a category
     */
    getCategory(category) {
        if (category in this._settings) {
            return JSON.parse(JSON.stringify(this._settings[category]));
        }
        return null;
    }
    
    /**
     * Subscribe to setting changes
     */
    subscribe(path, callback) {
        if (!(path in this._observers)) {
            this._observers[path] = [];
        }
        
        this._observers[path].push(callback);
        
        return () => {
            const idx = this._observers[path].indexOf(callback);
            if (idx >= 0) this._observers[path].splice(idx, 1);
        };
    }
    
    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this._settings = this._getDefaultSettings();
        this._saveToStorage();
        logGame('Settings reset to defaults', 'GAME');
    }
    
    /**
     * Reset a category to defaults
     */
    resetCategory(category) {
        const defaults = this._getDefaultSettings();
        if (category in defaults) {
            this._settings[category] = JSON.parse(JSON.stringify(defaults[category]));
            this._saveToStorage();
            logGame(`${category} settings reset to defaults`, 'GAME');
        }
    }
    
    /**
     * Export settings as JSON
     */
    export() {
        return JSON.stringify(this._settings, null, 2);
    }
    
    /**
     * Import settings from JSON
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this._settings = this._mergeSettings(this._settings, imported);
            this._saveToStorage();
            logGame('Settings imported', 'GAME');
            return true;
        } catch (e) {
            logGame('Failed to import settings', 'GAME', e);
            return false;
        }
    }
    
    /**
     * Validate settings (check values are in valid ranges)
     */
    validate() {
        const issues = [];
        
        // Graphics
        if (this.get('graphics.maxParticles') < 1) issues.push('maxParticles must be >= 1');
        if (this.get('graphics.fpsLimit') < 30) issues.push('fpsLimit must be >= 30');
        
        // Audio
        const masterVol = this.get('audio.masterVolume');
        if (masterVol < 0 || masterVol > 1) issues.push('masterVolume must be 0-1');
        
        // Controls
        const sens = this.get('controls.mouseSensitivity');
        if (sens < 0.1 || sens > 5) issues.push('mouseSensitivity must be 0.1-5');
        
        const fov = this.get('controls.fieldOfView');
        if (fov < 30 || fov > 120) issues.push('fieldOfView must be 30-120');
        
        if (issues.length > 0) {
            logGame(`Settings validation issues: ${issues.join(', ')}`, 'GAME');
            return false;
        }
        
        return true;
    }
    
    /**
     * Debug print all settings
     */
    debugPrint() {
        console.log('[SettingsManager]', this._settings);
    }
    
    // ============ Private Methods ============
    
    /**
     * Get default settings
     */
    _getDefaultSettings() {
        return {
            graphics: {
                shadowsEnabled: false,
                particlesEnabled: true,
                maxParticles: 100,
                fpsLimit: 144,
                antialiasing: false
            },
            audio: {
                masterVolume: 1.0,
                effectsVolume: 0.6,
                musicVolume: 0.3,
                voiceEnabled: true,
                soundEnabled: true
            },
            gameplay: {
                difficulty: 'normal',
                autoRespawn: true,
                respawnTime: 3000,
                killNotifications: true,
                damageNumbers: true,
                colorBlindMode: false
            },
            controls: {
                mouseSensitivity: 1.0,
                invertY: false,
                holdToSprintInstead: false,
                alwaysRun: false,
                fieldOfView: 75
            },
            ui: {
                hudScale: 1.0,
                showFPS: true,
                showPing: true,
                chatOpacity: 0.8,
                miniMapEnabled: true
            },
            advanced: {
                interpolationDelay: 100,
                lodEnabled: true,
                spawnProtection: 3000
            }
        };
    }
    
    /**
     * Load settings from localStorage
     */
    _loadFromStorage(key = 'ragequit_settings') {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const loaded = JSON.parse(saved);
                this._settings = this._mergeSettings(this._settings, loaded);
                logGame('Settings loaded from storage', 'GAME');
            }
        } catch (e) {
            logGame('Failed to load settings', 'GAME', e);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    _saveToStorage(key = 'ragequit_settings') {
        try {
            localStorage.setItem(key, JSON.stringify(this._settings));
        } catch (e) {
            logGame('Failed to save settings', 'GAME', e);
        }
    }
    
    /**
     * Deep merge settings objects
     */
    _mergeSettings(defaults, overrides) {
        const result = JSON.parse(JSON.stringify(defaults));
        
        const merge = (target, source) => {
            for (const key in source) {
                if (typeof source[key] === 'object' && source[key] !== null) {
                    if (!(key in target)) target[key] = {};
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };
        
        merge(result, overrides);
        return result;
    }
    
    /**
     * Notify observers of setting change
     */
    _notifyObservers(path, newValue, oldValue) {
        // Notify specific observers
        if (path in this._observers) {
            this._observers[path].forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (e) {
                    logGame(`Settings observer error for ${path}`, 'GAME', e);
                }
            });
        }
        
        // Notify wildcard observers if they exist
        const wildcardPath = path.split('.')[0] + '.*';
        if (wildcardPath in this._observers) {
            this._observers[wildcardPath].forEach(callback => {
                try {
                    callback(path, newValue, oldValue);
                } catch (e) {
                    logGame(`Settings wildcard observer error`, 'GAME', e);
                }
            });
        }
    }
}

// Global instance
let settingsManager = null;
