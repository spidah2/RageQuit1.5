/**
 * playerStateManager.js - Manages player state, stats, UI updates, and related logic
 * Consolidated from scattered playerStats, UI updates, and player-related variables
 */

class PlayerStateManager {
    constructor() {
        // Player basic info
        this.myId = null;
        this.myUsername = loadUsername() || "Player";
        this.myTeamColor = 0x2c3e50;
        this.myGameMode = 'team';
        this.myTeam = null;
        this.myKills = loadKills();
        
        // Player stats
        this.playerStats = { 
            hp: 100, maxHp: 100, 
            mana: 100, maxMana: 100, 
            stamina: 100, maxStamina: 100, 
            isDead: false, 
            isFalling: false 
        };
        
        // Match statistics
        this.matchStats = {
            kills: 0, 
            deaths: 0, 
            damage: 0, 
            healing: 0,
            accuracy: { shots: 0, hits: 0 },
            startTime: Date.now(),
            matchHistory: JSON.parse(localStorage.getItem('ragequit_match_history') || '[]')
        };
        
        // Kill tracking
        this.playerKills = {};
        this.teamKills = { red: 0, black: 0, green: 0, purple: 0 };
        
        // Spectator mode
        this.isSpectating = false;
        this.spectateTarget = null;
        this.spectateIndex = 0;
        
        // FPS and Ping
        this.fpsFrames = 0;
        this.fpsLastTime = performance.now();
        this.currentFPS = 0;
        this.lastPingTime = 0;
        this.currentPing = 0;
    }
    
    /**
     * Updates player HP display
     */
    updateHealthBar() {
        const healthPercent = (this.playerStats.hp / this.playerStats.maxHp) * 100;
        document.getElementById('health-bar-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = Math.round(this.playerStats.hp) + ' / ' + this.playerStats.maxHp;
        
        // Change color based on health percentage
        const healthBarFill = document.getElementById('health-bar-fill');
        if (healthPercent > 50) healthBarFill.className = 'health-bar-fill';
        else if (healthPercent > 25) healthBarFill.className = 'health-bar-fill low';
        else healthBarFill.className = 'health-bar-fill critical';
    }
    
    /**
     * Updates mana display
     */
    updateManaBar() {
        const manaPercent = (this.playerStats.mana / this.playerStats.maxMana) * 100;
        document.getElementById('mana-bar-fill').style.width = manaPercent + '%';
        document.getElementById('mana-text').textContent = Math.round(this.playerStats.mana) + ' / ' + this.playerStats.maxMana;
    }
    
    /**
     * Updates stamina display
     */
    updateStaminaBar() {
        const staminaPercent = (this.playerStats.stamina / this.playerStats.maxStamina) * 100;
        document.getElementById('stamina-bar-fill').style.width = staminaPercent + '%';
        document.getElementById('stamina-text').textContent = Math.round(this.playerStats.stamina) + ' / ' + this.playerStats.maxStamina;
    }
    
    /**
     * Updates all UI elements at once
     */
    updateAllUI() {
        this.updateHealthBar();
        this.updateManaBar();
        this.updateStaminaBar();
        this.updateKillCounter();
    }
    
    /**
     * Updates kill counter display
     */
    updateKillCounter() {
        const killsContainer = document.getElementById('kills');
        const deathsContainer = document.getElementById('deaths');
        if (killsContainer) killsContainer.textContent = this.myKills || 0;
        if (deathsContainer) deathsContainer.textContent = this.matchStats.deaths || 0;
    }
    
    /**
     * Increment kill count when player gets a kill
     */
    incrementKill(playerId, team) {
        this.myKills = (this.myKills || 0) + 1;
        saveKills(this.myKills);
        this.matchStats.kills++;
        
        if (team && this.teamKills.hasOwnProperty(team)) {
            this.teamKills[team]++;
        }
        
        this.playerKills[playerId] = (this.playerKills[playerId] || 0) + 1;
        this.updateKillCounter();
        
        logGame(`Kill recorded: ${this.myKills} total`, 'GAME', { playerId, team });
    }
    
    /**
     * Increment death count
     */
    incrementDeath() {
        this.matchStats.deaths++;
        this.updateKillCounter();
        logGame(`Death recorded: ${this.matchStats.deaths} total`, 'GAME');
    }
    
    /**
     * Saves match statistics to localStorage
     */
    saveMatchStats() {
        this.matchStats.matchHistory.push({
            timestamp: Date.now(),
            kills: this.matchStats.kills,
            deaths: this.matchStats.deaths,
            damage: this.matchStats.damage,
            healing: this.matchStats.healing,
            duration: (Date.now() - this.matchStats.startTime) / 1000
        });
        localStorage.setItem('ragequit_match_history', JSON.stringify(this.matchStats.matchHistory));
    }
    
    /**
     * Shows match statistics overlay
     */
    showMatchStats() {
        const duration = ((Date.now() - this.matchStats.startTime) / 1000).toFixed(1);
        const kd = (this.matchStats.deaths === 0) ? this.matchStats.kills : (this.matchStats.kills / this.matchStats.deaths).toFixed(2);
        const statsHTML = `K: ${this.matchStats.kills} D: ${this.matchStats.deaths} KD: ${kd}<br/>Dmg: ${this.matchStats.damage} Heal: ${this.matchStats.healing}<br/>Time: ${duration}s`;
        document.getElementById('match-stats').innerHTML = statsHTML;
        document.getElementById('match-stats').style.display = 'block';
    }
    
    /**
     * Update FPS counter
     */
    updateFPS() {
        this.fpsFrames++;
        const now = performance.now();
        const delta = now - this.fpsLastTime;
        
        if (delta >= 1000) {
            this.currentFPS = Math.round(this.fpsFrames * 1000 / delta);
            this.fpsFrames = 0;
            this.fpsLastTime = now;
            
            const fpsDisplay = document.getElementById('fps');
            if (fpsDisplay) fpsDisplay.textContent = `FPS: ${this.currentFPS}`;
        }
    }
    
    /**
     * Update ping display
     */
    updatePing(ping) {
        this.currentPing = ping;
        const pingDisplay = document.getElementById('ping');
        if (pingDisplay) pingDisplay.textContent = `Ping: ${ping}ms`;
    }
    
    /**
     * Toggle spectator mode
     */
    toggleSpectator() {
        this.isSpectating = !this.isSpectating;
        logGame(`Spectator mode: ${this.isSpectating}`, 'GAME');
    }
    
    /**
     * Cycle through spectate targets
     */
    cycleSpectate(direction) {
        const players = Object.values(otherPlayers);
        if (players.length === 0) return;
        
        this.spectateIndex = (this.spectateIndex + direction + players.length) % players.length;
        this.spectateTarget = players[this.spectateIndex];
    }
}

// Global instance
let playerStateManager = null;
