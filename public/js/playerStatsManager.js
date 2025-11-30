/**
 * playerStatsManager.js - Centralized player stats management with reactive updates
 * Replaces scattered playerStats object with a manager that tracks changes and notifies observers
 */

class PlayerStatsManager {
    constructor() {
        // Core stats object - private internal state
        this._stats = {
            hp: 100,
            maxHp: 100,
            mana: 100,
            maxMana: 100,
            stamina: 100,
            maxStamina: 100,
            isDead: false,
            isFalling: false
        };
        
        // Observer callbacks for stat changes
        this._observers = {
            hp: [],
            mana: [],
            stamina: [],
            isDead: [],
            isFalling: []
        };
        
        // Change history for debugging
        this._changeHistory = [];
        this._maxHistory = 100;
    }
    
    /**
     * Get stat value
     */
    get(stat) {
        return this._stats[stat];
    }
    
    /**
     * Set stat value with change notification
     */
    set(stat, value) {
        if (!(stat in this._stats)) {
            logGame(`Unknown stat: ${stat}`, 'GAME');
            return;
        }
        
        const oldValue = this._stats[stat];
        const newValue = this._clampStat(stat, value);
        
        // Only notify if value changed
        if (oldValue !== newValue) {
            this._stats[stat] = newValue;
            this._recordChange(stat, oldValue, newValue);
            this._notifyObservers(stat, newValue, oldValue);
        }
    }
    
    /**
     * Modify stat by delta (for incremental changes)
     */
    modify(stat, delta) {
        const current = this._stats[stat];
        this.set(stat, current + delta);
    }
    
    /**
     * Get all stats as object
     */
    getAll() {
        return { ...this._stats };
    }
    
    /**
     * Set multiple stats at once
     */
    setMultiple(updates) {
        for (const [stat, value] of Object.entries(updates)) {
            this.set(stat, value);
        }
    }
    
    /**
     * Subscribe to stat change notifications
     */
    subscribe(stat, callback) {
        if (!(stat in this._observers)) {
            logGame(`Cannot subscribe to unknown stat: ${stat}`, 'GAME');
            return;
        }
        
        this._observers[stat].push(callback);
        
        // Return unsubscribe function
        return () => {
            const idx = this._observers[stat].indexOf(callback);
            if (idx >= 0) this._observers[stat].splice(idx, 1);
        };
    }
    
    /**
     * Subscribe to all stat changes
     */
    subscribeAll(callback) {
        const unsubscribes = [];
        for (const stat in this._observers) {
            unsubscribes.push(this.subscribe(stat, (newVal, oldVal) => {
                callback(stat, newVal, oldVal);
            }));
        }
        
        // Return function to unsubscribe from all
        return () => unsubscribes.forEach(fn => fn());
    }
    
    /**
     * Restore stats from checkpoint (e.g., on respawn)
     */
    restore(checkpoint) {
        this.setMultiple(checkpoint);
    }
    
    /**
     * Create a checkpoint of current stats
     */
    checkpoint() {
        return this.getAll();
    }
    
    /**
     * Reset to default values
     */
    reset() {
        this.setMultiple({
            hp: 100,
            maxHp: 100,
            mana: 100,
            maxMana: 100,
            stamina: 100,
            maxStamina: 100,
            isDead: false,
            isFalling: false
        });
    }
    
    /**
     * Reset to respawn values (full health, mana, stamina but not dead)
     */
    respawn() {
        this.setMultiple({
            hp: this._stats.maxHp,
            mana: this._stats.maxMana,
            stamina: this._stats.maxStamina,
            isDead: false,
            isFalling: false
        });
    }
    
    /**
     * Save stats to localStorage for persistence
     */
    saveToStorage(key = 'ragequit_player_stats') {
        try {
            localStorage.setItem(key, JSON.stringify(this._stats));
            logGame('Player stats saved', 'GAME');
        } catch (e) {
            logGame('Failed to save player stats', 'GAME', e);
        }
    }
    
    /**
     * Load stats from localStorage
     */
    loadFromStorage(key = 'ragequit_player_stats') {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const data = JSON.parse(saved);
                this.setMultiple(data);
                logGame('Player stats loaded', 'GAME');
            }
        } catch (e) {
            logGame('Failed to load player stats', 'GAME', e);
        }
    }
    
    /**
     * Get change history for debugging
     */
    getHistory() {
        return [...this._changeHistory];
    }
    
    /**
     * Clear change history
     */
    clearHistory() {
        this._changeHistory = [];
    }
    
    /**
     * Print stats to console (debug helper)
     */
    debugPrint() {
        const stats = this.getAll();
        console.log('[PlayerStats]', stats);
        logGame(`HP: ${stats.hp}/${stats.maxHp} | Mana: ${stats.mana}/${stats.maxMana} | Stamina: ${stats.stamina}/${stats.maxStamina}`, 'GAME');
    }
    
    // ============ Private Methods ============
    
    /**
     * Clamp stat to valid range
     */
    _clampStat(stat, value) {
        const numValue = Math.max(0, value);
        
        // Clamp to max values
        if (stat === 'hp') return Math.min(numValue, this._stats.maxHp);
        if (stat === 'mana') return Math.min(numValue, this._stats.maxMana);
        if (stat === 'stamina') return Math.min(numValue, this._stats.maxStamina);
        
        // Boolean stats
        if (stat === 'isDead' || stat === 'isFalling') return !!value;
        
        // Max stats (no upper limit)
        if (stat.startsWith('max')) return numValue;
        
        return numValue;
    }
    
    /**
     * Record change for history
     */
    _recordChange(stat, oldValue, newValue) {
        const entry = {
            timestamp: performance.now(),
            stat: stat,
            from: oldValue,
            to: newValue,
            delta: typeof oldValue === 'number' ? newValue - oldValue : null
        };
        
        this._changeHistory.push(entry);
        
        // Trim history to max size
        if (this._changeHistory.length > this._maxHistory) {
            this._changeHistory.shift();
        }
    }
    
    /**
     * Notify all observers of a stat change
     */
    _notifyObservers(stat, newValue, oldValue) {
        if (this._observers[stat]) {
            this._observers[stat].forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (e) {
                    logGame(`Observer error for ${stat}`, 'GAME', e);
                }
            });
        }
    }
}

// Global instance
let playerStatsManager = null;
