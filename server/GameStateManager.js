// server/GameStateManager.js
// Centralizza la "Verità del Gioco" - unica fonte di autorità per punteggi, kill, e stato della partita

class GameStateManager {
    constructor() {
        // ===== STATE MANAGEMENT =====
        this.playerKills = {};      // {playerId: killCount}
        this.teamKills = {          // Kill per team
            red: 0,
            black: 0,
            green: 0,
            purple: 0
        };
        
        // ===== GAME STATE =====
        this.matchStartTime = Date.now();
        this.matchPhase = 'active';  // 'setup' | 'active' | 'ended'
        this.activePlayers = {};     // Riferimento a players object dal server
        
        // ===== VALIDATION CONSTANTS =====
        this.HIT_VALIDATION_DISTANCE = 15;      // Max distance for hit to be valid
        this.FRIENDLY_FIRE_ENABLED = false;     // Disabilita friendly fire tra squadre
        
        console.log('[GameStateManager] Inizializzato - Gestione centralizzata dello stato di gioco');
    }
    
    // ===== INITIALIZATION =====
    // Collega il game state manager ai players del server
    setActivePlayers(playersReference) {
        this.activePlayers = playersReference;
    }
    
    // ===== HIT VALIDATION & DAMAGE APPLICATION =====
    /**
     * Valida un colpo e applica danni
     * @param {string} shooterId - Socket ID di chi spara
     * @param {string} targetId - Socket ID del bersaglio
     * @param {object} spellData - Dati del colpo {damage, spellType, position}
     * @returns {object} - {success: bool, damage: number, killConfirmed: bool, message: string}
     */
    validateAndApplyHit(shooterId, targetId, spellData) {
        // Validazione base
        const shooter = this.activePlayers[shooterId];
        const target = this.activePlayers[targetId];
        
        // Check: players exist
        if (!shooter) {
            return { success: false, message: 'Shooter not found' };
        }
        if (!target) {
            return { success: false, message: 'Target not found' };
        }
        
        // Check: target not already dead
        if (target.isDead || target.hp <= 0) {
            return { success: false, message: 'Target already dead' };
        }
        
        // Check: friendly fire (same team check)
        if (!this.FRIENDLY_FIRE_ENABLED && shooter.team === target.team) {
            return { success: false, message: 'Friendly fire disabled' };
        }
        
        // Check: hit distance validation (lag tolerance)
        const distance = this._distance3D(target.position, spellData.hitPosition || target.position);
        if (distance > this.HIT_VALIDATION_DISTANCE) {
            return { 
                success: false, 
                message: `Hit distance too great (${distance.toFixed(1)} > ${this.HIT_VALIDATION_DISTANCE})` 
            };
        }
        
        // APPLY DAMAGE
        const actualDamage = Math.max(0, spellData.damage || 0);
        target.hp = Math.max(0, target.hp - actualDamage);
        
        const result = {
            success: true,
            damage: actualDamage,
            targetHp: target.hp,
            killConfirmed: false,
            killerId: shooterId,
            targetId: targetId,
            message: `Hit validated: ${actualDamage} damage to ${targetId}`
        };
        
        // CHECK: Kill confirmation
        if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;
            result.killConfirmed = true;
            result.message = `Kill confirmed: ${shooterId} killed ${targetId}`;
            
            // Track the kill
            this._recordKill(shooterId, target.team);
        }
        
        return result;
    }
    
    // ===== KILL TRACKING =====
    /**
     * Registra un kill nel sistema di tracking
     * @param {string} killerId - Socket ID del killer
     * @param {string} victimTeam - Team della vittima
     */
    _recordKill(killerId, victimTeam) {
        // Track player kills
        if (!this.playerKills[killerId]) {
            this.playerKills[killerId] = 0;
        }
        this.playerKills[killerId]++;
        
        // Track team kills (usa il team del killer, non della vittima)
        const killer = this.activePlayers[killerId];
        if (killer && killer.team && this.teamKills[killer.team] !== undefined) {
            this.teamKills[killer.team]++;
        }
        
        console.log(
            `[KILL] ${killerId} (${killer?.team}) killed ${victimTeam} player - ` +
            `Player kills: ${this.playerKills[killerId]}, Team kills: ${killer?.team} = ${this.teamKills[killer?.team] || 0}`
        );
    }
    
    /**
     * Restituisce un snapshot del match stats corrente
     * @returns {object} - {playerKills, teamKills, matchPhase, matchDuration}
     */
    getMatchStats() {
        return {
            playerKills: this.playerKills,
            teamKills: this.teamKills,
            matchPhase: this.matchPhase,
            matchDuration: Date.now() - this.matchStartTime,
            timestamp: Date.now()
        };
    }
    
    /**
     * Restituisce i kill di un giocatore specifico
     * @param {string} playerId - Socket ID del giocatore
     * @returns {number} - Numero di kill
     */
    getPlayerKills(playerId) {
        return this.playerKills[playerId] || 0;
    }
    
    /**
     * Restituisce i kill di una squadra
     * @param {string} team - Nome della squadra
     * @returns {number} - Numero di kill
     */
    getTeamKills(team) {
        return this.teamKills[team] || 0;
    }
    
    // ===== HEALING & SUPPORT =====
    /**
     * Applica cura ad un giocatore
     * @param {string} targetId - Socket ID del giocatore
     * @param {number} amount - Quantità di cura
     * @returns {object} - {success: bool, newHp: number, amountHealed: number}
     */
    applyHealing(targetId, amount) {
        const target = this.activePlayers[targetId];
        
        if (!target || target.isDead) {
            return { success: false, message: 'Target not found or is dead' };
        }
        
        const healAmount = Math.max(0, amount || 0);
        const oldHp = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        const actualHeal = target.hp - oldHp;
        
        return {
            success: true,
            newHp: target.hp,
            amountHealed: actualHeal,
            message: `${targetId} healed for ${actualHeal} HP`
        };
    }
    
    // ===== KNOCKBACK/PUSH =====
    /**
     * Applica knockback ad un giocatore (non danneggia, solo push)
     * @param {string} targetId - Socket ID del giocatore
     * @param {number} force - Intensità della spinta
     * @returns {object} - {success: bool}
     */
    applyKnockback(targetId, force) {
        const target = this.activePlayers[targetId];
        
        if (!target || target.isDead) {
            return { success: false, message: 'Target not found or is dead' };
        }
        
        // Server-side knockback è principalmente informativo
        // Il client applica la physics effect basato su socket event
        return {
            success: true,
            force: force,
            message: `Knockback applied to ${targetId}`
        };
    }
    
    // ===== PLAYER STATE MANAGEMENT =====
    /**
     * Registra un nuovo giocatore nello stato di gioco
     * @param {string} playerId - Socket ID
     * @param {object} playerData - Dati del giocatore
     */
    registerPlayer(playerId, playerData) {
        // Inizializza il conteggio kill a 0
        if (!this.playerKills[playerId]) {
            this.playerKills[playerId] = 0;
        }
        console.log(`[GameStateManager] Player registered: ${playerId} (${playerData.team})`);
    }
    
    /**
     * Rimuove un giocatore dallo stato di gioco
     * @param {string} playerId - Socket ID
     */
    unregisterPlayer(playerId) {
        // Mantieni i kill stats anche dopo disconnect (per match stats finali)
        console.log(
            `[GameStateManager] Player disconnected: ${playerId} (Final kills: ${this.playerKills[playerId] || 0})`
        );
    }
    
    /**
     * Reset del match stats (per nuova partita)
     */
    resetMatchStats() {
        this.playerKills = {};
        this.teamKills = { red: 0, black: 0, green: 0, purple: 0 };
        this.matchStartTime = Date.now();
        this.matchPhase = 'active';
        console.log('[GameStateManager] Match stats resetted');
    }
    
    // ===== UTILITY FUNCTIONS =====
    /**
     * Calcola distanza 3D tra due punti
     * @private
     */
    _distance3D(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // ===== DEBUG & STATS =====
    /**
     * Stampa lo stato corrente del gioco per debug
     */
    debugState() {
        console.log('\n[GameStateManager] DEBUG STATE:');
        console.log('Player Kills:', this.playerKills);
        console.log('Team Kills:', this.teamKills);
        console.log('Match Phase:', this.matchPhase);
        console.log('Duration:', Math.round((Date.now() - this.matchStartTime) / 1000) + 's\n');
    }
}

// Export per Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateManager;
}
