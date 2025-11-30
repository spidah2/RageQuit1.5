// config.js - Configurazione centralizzata del gioco
// Unifica tutte le costanti e configurazioni sparse nei vari file

// ===== TEAM CONFIGURATION =====
const GAME_CONFIG = {
    // Colori squadre - UNICA FONTE DI VERITÀ
    TEAM_COLORS: {
        red: 0x8B0000,
        black: 0x003300,
        green: 0x1B2F2F,
        purple: 0x550055
    },
    
    // Team mapping display
    TEAM_NAMES: {
        red: 'CARNAGE',
        black: 'GRAVES',
        green: 'SLAUGHTER',
        purple: 'VISCERA'
    },
    
    // Emoji per teams
    TEAM_EMOJIS: {
        red: '🔴',
        black: '🔵',
        green: '🟢',
        purple: '🟣'
    },
    
    // ===== GAME SETTINGS =====
    MAX_PLAYERS: 10,
    DEFAULT_HP: 100,
    DEFAULT_MANA: 100,
    DEFAULT_STAMINA: 100,
    SPAWN_POSITION: { x: 0, y: 6, z: 0 },
    
    // ===== NETWORK SETTINGS =====
    SOCKET_CONFIG: {
        url: 'http://localhost:3000',  // Server address - IMPORTANTE per sviluppo con Live Server
        reconnection: true,
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
    },
    
    POSITION_UPDATE_RATE: 50, // ms tra aggiornamenti posizione
    DEDUPE_WINDOW_MS: 500,    // Finestra di dedupe per giocatori
    
    // ===== GAME MODES =====
    GAME_MODES: {
        TEAM: 'team',
        PVE: 'pve'
    },
    
    // ===== AUDIO SETTINGS =====
    AUDIO: {
        MENU_MUSIC_VOLUME: 0.15,
        SOUND_EFFECTS_VOLUME: 0.7
    },
    
    // ===== WEAPON MODES (MODALITÀ ARMI) =====
    // 1. RANGED (Magia - Bastone) - Spells: Missile, Begone, Fireball, Impale
    // 2. MELEE (Spada) - Attacks: Sword Swing, Whirlwind
    // 3. BOW (Arco) - Attack: Arrow (uses stamina)
    WEAPON_MODES: {
        RANGED: 'ranged',
        MELEE: 'melee',
        BOW: 'bow'
    },
    
    // ===== SPELL IDs =====
    SPELLS: {
        MISSILE: 1,
        BEGONE: 2,
        FIREBALL: 3,
        IMPALE: 4,
        ARROW: 5,
        MELEE: 6,
        WHIRLWIND: 7,
        HEAL: 8
    },
    
    // ===== SPELL COSTS (indexed by spell ID) =====
    SPELL_COSTS: {
        1: 5,    // MISSILE
        2: 15,   // BEGONE
        3: 20,   // FIREBALL
        4: 5,    // IMPALE
        5: 5,    // ARROW
        6: 5,    // MELEE
        7: 10,   // WHIRLWIND
        8: 10    // HEAL
    },
    
    // ===== SPELL CAST TIMES (indexed by spell ID) =====
    SPELL_CAST_TIMES: {
        1: 0.2,   // MISSILE - Fast cast
        2: 0.5,   // BEGONE - Medium cast
        3: 0.5,   // FIREBALL - Medium cast
        4: 0.0,   // IMPALE - Instant
        5: 0.3,   // ARROW - Medium cast
        6: 0.0,   // MELEE - Instant
        7: 0.0,   // WHIRLWIND - Instant
        8: 0.0    // HEAL - Instant
    },
    
    // ===== SPELL PARAMETERS (CONSOLIDATED) - Fonte unica di verità =====
    SPELL_PARAMS: {
        
        // ===== 1. DARDO MAGICO (Missile) =====
        MISSILE_COST: 5,              // Mana cost
        MISSILE_DMG: 10,              // HP damage
        MISSILE_SPEED: 900,           // Units/sec
        MISSILE_GRAVITY: 300,         // Gravity units/sec²
        MISSILE_LIFETIME: 2000,       // ms
        MISSILE_CAST_TIME: 0.2,       // seconds
        MISSILE_RADIUS: 1.0,          // Collision radius
        MISSILE_COLOR: 0x00ffff,      // Cyan
        MISSILE_COOLDOWN: 400,        // ms
        
        // ===== 2. ONDA D'URTO (Begone/Shockwave) =====
        BEGONE_COST: 15,              // Mana cost
        BEGONE_DMG: 10,               // HP damage
        BEGONE_SPEED: 700,            // Units/sec
        BEGONE_LIFETIME: 2000,        // ms
        BEGONE_CAST_TIME: 0.5,        // seconds
        BEGONE_RADIUS: 45,            // Explosion radius
        BEGONE_VISUAL_RADIUS: 20,     // Visual size
        BEGONE_FORCE_HORIZONTAL: 900, // Knockback force
        BEGONE_FORCE_VERTICAL: 300,   // Vertical push (from original repo)
        BEGONE_COLOR: 0xffffff,       // White
        BEGONE_COOLDOWN: 3000,        // ms
        
        // ===== 3. PALLA DI FUOCO (Fireball) =====
        FIREBALL_COST: 20,            // Mana cost
        FIREBALL_DMG: 30,             // Direct damage HP
        FIREBALL_DMG_SPLASH: 5,       // Splash damage in radius
        FIREBALL_SPEED: 380,          // Units/sec (reduced for shorter range, more controllable)
        FIREBALL_LIFETIME: 2000,      // ms
        FIREBALL_CAST_TIME: 0.5,      // seconds
        FIREBALL_RADIUS: 35,          // Explosion radius
        FIREBALL_FORCE_VERTICAL: 600, // Vertical push (from original repo)
        FIREBALL_COLOR: 0xff6600,     // Orange
        FIREBALL_COOLDOWN: 2000,      // ms
        
        // ===== 4. SPUNTONI DI PIETRA (Impale/Stone Spikes) =====
        IMPALE_COST: 5,               // Mana cost
        IMPALE_DMG: 25,               // HP damage
        IMPALE_RANGE: 200,            // Raycaster range
        IMPALE_COOLDOWN: 3000,        // ms
        IMPALE_CAST_TIME: 0,          // Instant
        IMPALE_VISUAL_DURATION: 1500, // ms
        IMPALE_COLOR: 0x888888,       // Gray
        
        // ===== 5. FRECCIA (Arrow) =====
        ARROW_COST: 5,                // Stamina cost
        ARROW_DMG: 15,                // HP damage
        ARROW_SPEED: 1000,            // Units/sec
        ARROW_GRAVITY: 5,             // Light gravity
        ARROW_LIFETIME: 5000,         // ms
        ARROW_CAST_TIME: 0.3,         // seconds
        ARROW_COLLISION_RADIUS: 0.5,
        ARROW_COLOR: 0x8B4513,        // Brown
        ARROW_COOLDOWN: 800,          // ms
        
        // ===== 6. FENDENTE (Melee Sword Swing) =====
        MELEE_COST: 5,                // Stamina cost
        MELEE_DMG: 15,                // HP damage
        MELEE_RATE: 500,              // ms between attacks
        MELEE_RANGE: 32,              // Hitbox radius
        MELEE_ANGLE: Math.PI / 2,     // 90° cone
        MELEE_KNOCKBACK: 100,         // Push units
        MELEE_EFFECT_DURATION: 200,   // Trail ms
        MELEE_COLOR: 0xffffff,        // White
        
        // ===== 7. TURBINE (Whirlwind) =====
        WHIRLWIND_COST: 10,           // Stamina cost
        WHIRLWIND_DMG: 30,            // HP damage
        WHIRLWIND_RADIUS: 25,         // AoE radius (360°)
        WHIRLWIND_COOLDOWN: 2000,     // ms
        WHIRLWIND_JUMP_FORCE: 150,    // Vertical jump (from original repo)
        WHIRLWIND_EFFECT_DURATION: 500, // ms
        WHIRLWIND_PARTICLES_MIN: 40,
        WHIRLWIND_PARTICLES_MAX: 60,
        WHIRLWIND_COLOR: 0xffffff,    // White
        
        // ===== 8. CURA ISTANTANEA (Heal) =====
        HEAL_COST: 10,                // Mana cost
        HEAL_AMOUNT: 20,              // HP restored
        HEAL_COOLDOWN: 10000,         // ms
        HEAL_COLOR: 0x00ff00,         // Green
        
        // ===== CONVERSIONI (Transfer) =====
        // Meccanica: Canale 5 secondi, 1 tick per secondo (5 tick totali)
        // Costo/Guadagno: 5 unità per tick
        CONVERSION_CHANNEL_DURATION: 5000,  // ms
        CONVERSION_TICK_RATE: 1000,         // ms per tick
        CONVERSION_COOLDOWN: 1000,          // ms tra conversioni
        
        // 9. CONVERSIONE STAMINA → HP
        CONVERSION_STAMINA_TO_HP_COST: 5,   // Stamina per tick
        CONVERSION_STAMINA_TO_HP_GAIN: 5,   // HP per tick
        CONVERSION_STAMINA_TO_HP_COLOR: 0xff0000, // Red glow
        
        // 10. CONVERSIONE HP → MANA
        CONVERSION_HP_TO_MANA_COST: 5,      // HP per tick
        CONVERSION_HP_TO_MANA_GAIN: 5,      // Mana per tick
        CONVERSION_HP_TO_MANA_COLOR: 0x0000ff, // Blue glow
        
        // 11. CONVERSIONE MANA → STAMINA
        CONVERSION_MANA_TO_STAMINA_COST: 5, // Mana per tick
        CONVERSION_MANA_TO_STAMINA_GAIN: 5, // Stamina per tick
        CONVERSION_MANA_TO_STAMINA_COLOR: 0xffff00, // Yellow glow
        
        // ===== 12. PARATA (Block) =====
        BLOCK_MITIGATION: 0.7,        // 70% damage reduction
        BLOCK_STAMINA_COST_PER_SEC: 0.5,
        BLOCK_COLOR: 0x00aaff,        // Cyan blue
        BLOCK_OPACITY: 0.4,
        
        // ===== 13. SALTO (Jump) =====
        JUMP_COST: 5,                 // Stamina cost
        JUMP_FORCE: 200,              // Vertical force (from original repo)
        JUMP_COOLDOWN: 300,           // ms between jumps
        JUMP_GRAVITY: 800,            // Units/sec² fall
        
        // ===== 14. SPRINT =====
        SPRINT_MULTIPLIER: 1.4,       // 140% speed
        SPRINT_BASE_SPEED: 400,       // Units/sec (from original repo - matches PHYSICS.SPEED)
        SPRINT_STAMINA_COST: 1.0,     // Per second
        
        // ===== RESOURCE REGENERATION =====
        MANA_REGEN: 2.0,              // Points/sec
        STAMINA_REGEN: 3.0,           // Points/sec
        HP_REGEN: 0,                  // No natural regen
        
        // ===== FLOATING TEXT & EFFECTS =====
        FLOATING_TEXT_HIT_COLOR: '#ff3333',
        FLOATING_TEXT_BLOCK_COLOR: '#aaa',
        FLOATING_TEXT_HEAL_COLOR: '#00ff00',
        FLOATING_TEXT_KILL_COLOR: '#ff0000',
        
        // ===== ALIASES FOR SPELL PUSH UP FORCES =====
        PUSH_UP_FORCE: 300,            // Alias for BEGONE_FORCE_VERTICAL (Shockwave vertical push)
        FIREBALL_UP_FORCE: 600,        // Alias for FIREBALL_FORCE_VERTICAL (Fireball vertical push)
        
        // ===== ALIASES FOR PHYSICS CONSTANTS =====
        PUSH_FORCE: 900,               // Alias for BEGONE_FORCE_HORIZONTAL (Shockwave horizontal knockback)
        PUSH_RADIUS: 45,               // Alias for BEGONE_RADIUS
        PUSH_VISUAL_RADIUS: 20         // Alias for BEGONE_VISUAL_RADIUS
    },
    
    // ===== PHYSICS & MOVEMENT CONSTANTS =====
    PHYSICS: {
        GRAVITY: 800,                   // Gravity acceleration (from original repo)
        SPEED: 400,                     // Base movement speed (from original repo)
        SPRINT_MULTIPLIER: 1.4,         // Sprint speed multiplier
        SPRINT_STAMINA_COST: 30,        // Stamina cost per second while sprinting
        BLOCK_STAMINA_COST: 5,          // Stamina cost per second while blocking
        MANA_REGEN: 2.0,                // Mana regenerated per second
        STAMINA_REGEN: 3.0,             // Stamina regenerated per second
        PUSH_FORCE: 900,                // Shockwave horizontal knockback force
        MISSILE_SPEED: 900,             // Missile projectile speed
        MISSILE_GRAVITY: 300,           // Gravity for missiles
        PUSH_SPEED: 700,                // Shockwave projectile speed
        PUSH_GRAVITY: 300,              // Gravity for push spell
        FIREBALL_SPEED: 380,            // Fireball projectile speed (reduced for shorter range, more controllable)
        FIREBALL_GRAVITY: 600,          // Gravity for fireball (increased for steep arc descent)
        ARROW_SPEED: 1000,              // Arrow projectile speed
        ARROW_GRAVITY: 5                // Light gravity for arrows
    },
    
    // ===== DEBUG FLAGS =====
    DEBUG: {
        NETWORK_TRACE: false,
        PLAYER_TRACE: false,
        SPELL_TRACE: false
    }
};

// Export per compatibilità
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONFIG;
}
