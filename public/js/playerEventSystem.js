/**
 * playerEventSystem.js - Player-specific event dispatcher
 * Handles all player-related events: damage, heal, kill, death, ability use, etc.
 */

class PlayerEventSystem {
    constructor() {
        // Event listeners organized by event type
        this._listeners = {
            // Damage events
            'player:damage': [],
            'player:critical': [],
            'player:blocked': [],
            
            // Healing events
            'player:heal': [],
            'player:overheal': [],
            
            // Ability events
            'ability:cast': [],
            'ability:cast-start': [],
            'ability:cast-complete': [],
            'ability:cooldown': [],
            
            // Combat events
            'player:hit': [],
            'player:kill': [],
            'player:death': [],
            'player:respawn': [],
            
            // Status events
            'player:status': [],
            'player:block-start': [],
            'player:block-stop': [],
            'player:sprint-start': [],
            'player:sprint-stop': [],
            
            // Movement events
            'player:jump': [],
            'player:land': [],
            'player:move': [],
            'player:fall': [],
            
            // Team events
            'player:team-change': [],
            
            // Custom events
            'custom': []
        };
        
        // Event history for debugging
        this._eventHistory = [];
        this._maxHistory = 50;
    }
    
    /**
     * Subscribe to an event
     */
    on(eventName, callback) {
        if (!(eventName in this._listeners)) {
            logGame(`Unknown event: ${eventName}`, 'GAME');
            return () => {};
        }
        
        this._listeners[eventName].push(callback);
        
        // Return unsubscribe function
        return () => {
            const idx = this._listeners[eventName].indexOf(callback);
            if (idx >= 0) this._listeners[eventName].splice(idx, 1);
        };
    }
    
    /**
     * Subscribe to event once (auto-unsubscribe after first fire)
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }
    
    /**
     * Emit an event
     */
    emit(eventName, data = {}) {
        if (!(eventName in this._listeners)) {
            logGame(`Unknown event: ${eventName}`, 'GAME');
            return;
        }
        
        // Record in history
        this._recordEvent(eventName, data);
        
        // Notify all listeners
        this._listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                logGame(`Event listener error for ${eventName}`, 'GAME', e);
            }
        });
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            if (eventName in this._listeners) {
                this._listeners[eventName] = [];
            }
        } else {
            // Remove all listeners for all events
            for (const event in this._listeners) {
                this._listeners[event] = [];
            }
        }
    }
    
    /**
     * Get listener count for an event
     */
    listenerCount(eventName) {
        return (eventName in this._listeners) ? this._listeners[eventName].length : 0;
    }
    
    /**
     * Get all registered events
     */
    getRegisteredEvents() {
        return Object.keys(this._listeners);
    }
    
    /**
     * Get event history
     */
    getHistory() {
        return [...this._eventHistory];
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
        this._eventHistory = [];
    }
    
    // ============ Convenience Emitters ============
    
    /**
     * Emit damage event
     */
    emitDamage(damage, isCritical = false, isBlocked = false) {
        if (isBlocked) {
            this.emit('player:blocked', { damage, isCritical });
        } else if (isCritical) {
            this.emit('player:critical', { damage });
        } else {
            this.emit('player:damage', { damage });
        }
    }
    
    /**
     * Emit heal event
     */
    emitHeal(amount, isOverheal = false) {
        const eventType = isOverheal ? 'player:overheal' : 'player:heal';
        this.emit(eventType, { amount, isOverheal });
    }
    
    /**
     * Emit ability cast event
     */
    emitAbilityCast(abilityName, abilityId) {
        this.emit('ability:cast', { name: abilityName, id: abilityId });
    }
    
    /**
     * Emit ability cooldown event
     */
    emitAbilityCooldown(abilityName, remaining) {
        this.emit('ability:cooldown', { name: abilityName, remaining });
    }
    
    /**
     * Emit kill event
     */
    emitKill(targetId, targetName, team) {
        this.emit('player:kill', { targetId, targetName, team });
    }
    
    /**
     * Emit death event
     */
    emitDeath(killerId = null, killerName = null) {
        this.emit('player:death', { killerId, killerName });
    }
    
    /**
     * Emit respawn event
     */
    emitRespawn(position) {
        this.emit('player:respawn', { position });
    }
    
    /**
     * Emit jump event
     */
    emitJump() {
        this.emit('player:jump', {});
    }
    
    /**
     * Emit landing event
     */
    emitLand() {
        this.emit('player:land', {});
    }
    
    /**
     * Emit sprint start event
     */
    emitSprintStart() {
        this.emit('player:sprint-start', {});
    }
    
    /**
     * Emit sprint stop event
     */
    emitSprintStop() {
        this.emit('player:sprint-stop', {});
    }
    
    /**
     * Emit block start event
     */
    emitBlockStart() {
        this.emit('player:block-start', {});
    }
    
    /**
     * Emit block stop event
     */
    emitBlockStop() {
        this.emit('player:block-stop', {});
    }
    
    /**
     * Emit team change event
     */
    emitTeamChange(newTeam, oldTeam) {
        this.emit('player:team-change', { newTeam, oldTeam });
    }
    
    /**
     * Debug print event counts
     */
    debugPrint() {
        console.log('[PlayerEventSystem] Event listener counts:');
        for (const [event, listeners] of Object.entries(this._listeners)) {
            if (listeners.length > 0) {
                console.log(`  ${event}: ${listeners.length} listener(s)`);
            }
        }
    }
    
    // ============ Private Methods ============
    
    /**
     * Record event in history
     */
    _recordEvent(eventName, data) {
        const entry = {
            timestamp: performance.now(),
            event: eventName,
            data: data
        };
        
        this._eventHistory.push(entry);
        
        // Trim history
        if (this._eventHistory.length > this._maxHistory) {
            this._eventHistory.shift();
        }
    }
}

// Global instance
let playerEventSystem = null;
