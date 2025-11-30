/**
 * abilityManager.js - Manages ability cooldowns and casting states
 * Consolidated from scattered lastXTime variables and cooldown checks
 */

class AbilityManager {
    constructor() {
        // Cooldown tracking for all abilities
        this._cooldowns = {
            // Spell cooldowns (in milliseconds) - from GAME_CONFIG.SPELL_PARAMS
            spell1: { cooldown: GAME_CONFIG.SPELL_PARAMS.MISSILE_COOLDOWN, lastUsed: -Infinity },
            spell2: { cooldown: GAME_CONFIG.SPELL_PARAMS.BEGONE_COOLDOWN, lastUsed: -Infinity },
            spell3: { cooldown: GAME_CONFIG.SPELL_PARAMS.FIREBALL_COOLDOWN, lastUsed: -Infinity },
            spell4: { cooldown: GAME_CONFIG.SPELL_PARAMS.IMPALE_COOLDOWN, lastUsed: -Infinity },
            spell5: { cooldown: GAME_CONFIG.SPELL_PARAMS.ARROW_COOLDOWN || 800, lastUsed: -Infinity },
            
            // Ability cooldowns - from GAME_CONFIG.SPELL_PARAMS
            melee: { cooldown: GAME_CONFIG.SPELL_PARAMS.MELEE_RATE, lastUsed: -Infinity },
            heal: { cooldown: GAME_CONFIG.SPELL_PARAMS.HEAL_COOLDOWN, lastUsed: -Infinity },
            conversion: { cooldown: GAME_CONFIG.SPELL_PARAMS.CONVERSION_COOLDOWN, lastUsed: -Infinity },
            whirlwind: { cooldown: GAME_CONFIG.SPELL_PARAMS.WHIRLWIND_COOLDOWN, lastUsed: -Infinity }
        };
        
        // Cast state
        this._castingState = {
            active: false,
            currentSpell: 0,
            timer: 0,
            maxTime: 0,
            ready: false,
            keyHeld: null
        };
        
        // Observers for cooldown changes
        this._cooldownObservers = {};
        this._castObservers = [];
    }
    
    /**
     * Check if an ability is on cooldown
     */
    isOnCooldown(ability) {
        if (!(ability in this._cooldowns)) {
            logGame(`Unknown ability: ${ability}`, 'GAME');
            return false;
        }
        
        const now = performance.now();
        const { lastUsed, cooldown } = this._cooldowns[ability];
        const timeElapsed = now - lastUsed;
        
        return timeElapsed < cooldown;
    }
    
    /**
     * Get remaining cooldown time in milliseconds
     */
    getRemainingCooldown(ability) {
        if (!(ability in this._cooldowns)) return 0;
        
        const now = performance.now();
        const { lastUsed, cooldown } = this._cooldowns[ability];
        const remaining = cooldown - (now - lastUsed);
        
        return Math.max(0, remaining);
    }
    
    /**
     * Get cooldown as percentage (0-1)
     */
    getCooldownPercent(ability) {
        if (!(ability in this._cooldowns)) return 0;
        
        const remaining = this.getRemainingCooldown(ability);
        const { cooldown } = this._cooldowns[ability];
        
        return 1 - (remaining / cooldown);
    }
    
    /**
     * Use an ability (starts its cooldown)
     */
    use(ability) {
        if (!(ability in this._cooldowns)) {
            logGame(`Cannot use unknown ability: ${ability}`, 'GAME');
            return false;
        }
        
        if (this.isOnCooldown(ability)) {
            logGame(`${ability} is on cooldown (${this.getRemainingCooldown(ability).toFixed(0)}ms remaining)`, 'GAME');
            return false;
        }
        
        this._cooldowns[ability].lastUsed = performance.now();
        this._notifyCooldownChange(ability);
        logGame(`${ability} used`, 'GAME');
        
        return true;
    }
    
    /**
     * Reset a specific ability's cooldown
     */
    reset(ability) {
        if (ability in this._cooldowns) {
            this._cooldowns[ability].lastUsed = -Infinity;
            this._notifyCooldownChange(ability);
            logGame(`${ability} cooldown reset`, 'GAME');
        }
    }
    
    /**
     * Reset all cooldowns
     */
    resetAll() {
        for (const ability in this._cooldowns) {
            this._cooldowns[ability].lastUsed = -Infinity;
            this._notifyCooldownChange(ability);
        }
        logGame('All cooldowns reset', 'GAME');
    }
    
    /**
     * Subscribe to cooldown changes for an ability
     */
    subscribeToCooldown(ability, callback) {
        if (!(ability in this._cooldownObservers)) {
            this._cooldownObservers[ability] = [];
        }
        
        this._cooldownObservers[ability].push(callback);
        
        // Return unsubscribe function
        return () => {
            const idx = this._cooldownObservers[ability].indexOf(callback);
            if (idx >= 0) this._cooldownObservers[ability].splice(idx, 1);
        };
    }
    
    /**
     * Start casting an ability
     */
    startCasting(spellId, castTime, keyHeld) {
        this._castingState.active = true;
        this._castingState.currentSpell = spellId;
        this._castingState.timer = 0;
        this._castingState.maxTime = castTime;
        this._castingState.ready = false;
        this._castingState.keyHeld = keyHeld;
        
        this._notifyCastStateChange('start', spellId);
    }
    
    /**
     * Stop casting (may complete or cancel)
     */
    stopCasting(keyHeld) {
        if (!this._castingState.active) return false;
        
        if (this._castingState.keyHeld !== keyHeld) return false;
        
        const wasReady = this._castingState.ready;
        const spell = this._castingState.currentSpell;
        
        this._castingState.active = false;
        this._notifyCastStateChange('stop', spell, wasReady);
        
        return wasReady;
    }
    
    /**
     * Update casting progress
     */
    updateCasting(delta) {
        if (!this._castingState.active) return;
        
        this._castingState.timer += delta;
        const progress = Math.min(1, this._castingState.timer / this._castingState.maxTime);
        
        if (progress >= 1 && !this._castingState.ready) {
            this._castingState.ready = true;
            this._notifyCastStateChange('ready', this._castingState.currentSpell);
        }
    }
    
    /**
     * Get current casting progress (0-1)
     */
    getCastingProgress() {
        if (!this._castingState.active) return 0;
        return Math.min(1, this._castingState.timer / this._castingState.maxTime);
    }
    
    /**
     * Check if currently casting
     */
    isCasting() {
        return this._castingState.active;
    }
    
    /**
     * Check if cast is ready to execute
     */
    isCastReady() {
        return this._castingState.active && this._castingState.ready;
    }
    
    /**
     * Get current cast state
     */
    getCastState() {
        return { ...this._castingState };
    }
    
    /**
     * Subscribe to cast state changes
     */
    subscribeToCast(callback) {
        this._castObservers.push(callback);
        
        return () => {
            const idx = this._castObservers.indexOf(callback);
            if (idx >= 0) this._castObservers.splice(idx, 1);
        };
    }
    
    /**
     * Get all cooldown info for UI updates
     */
    getAllCooldowns() {
        const result = {};
        for (const [ability, data] of Object.entries(this._cooldowns)) {
            result[ability] = {
                remaining: this.getRemainingCooldown(ability),
                percent: this.getCooldownPercent(ability),
                isActive: this.isOnCooldown(ability)
            };
        }
        return result;
    }
    
    /**
     * Debug print all cooldowns
     */
    debugPrint() {
        console.log('[AbilityManager] Cooldowns:');
        for (const [ability, data] of Object.entries(this._cooldowns)) {
            const remaining = this.getRemainingCooldown(ability);
            console.log(`  ${ability}: ${remaining.toFixed(0)}ms / ${data.cooldown}ms`);
        }
    }
    
    // ============ Private Methods ============
    
    /**
     * Notify observers of cooldown change
     */
    _notifyCooldownChange(ability) {
        if (this._cooldownObservers[ability]) {
            const remaining = this.getRemainingCooldown(ability);
            const percent = this.getCooldownPercent(ability);
            const isActive = this.isOnCooldown(ability);
            
            this._cooldownObservers[ability].forEach(callback => {
                try {
                    callback({ remaining, percent, isActive });
                } catch (e) {
                    logGame(`Cooldown observer error for ${ability}`, 'GAME', e);
                }
            });
        }
    }
    
    /**
     * Notify cast observers
     */
    _notifyCastStateChange(event, spellId, wasReady = false) {
        this._castObservers.forEach(callback => {
            try {
                callback({
                    event: event,
                    spellId: spellId,
                    progress: this.getCastingProgress(),
                    wasReady: wasReady
                });
            } catch (e) {
                logGame('Cast observer error', 'GAME', e);
            }
        });
    }
}

// Global instance
let abilityManager = null;
