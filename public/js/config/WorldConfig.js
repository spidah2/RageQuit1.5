// WorldConfig.js - Configurazione mappa e spawn del gioco
// Centralizza tutte le coordinate e limiti geografici della mappa

// Proteggi da duplicate loading
if (typeof window.WORLD_CONFIG !== 'undefined') {
    console.log("⚠️ [CONFIG] WORLD_CONFIG già caricato, skipping duplicate");
} else {
    const WORLD_CONFIG = {
    
    // ===== SPAWN ZONES =====
    // Zone di respawn per ogni squadra - 4 angoli della mappa
    SPAWN_ZONES: {
        red: {
            center: { x: -300, y: 6, z: -300 },
            variance: 60,  // ±30 units da center
            color: 0x8B0000
        },
        black: {
            center: { x: 300, y: 6, z: -300 },
            variance: 60,
            color: 0x003300
        },
        green: {
            center: { x: -300, y: 6, z: 300 },
            variance: 60,
            color: 0x1B2F2F
        },
        purple: {
            center: { x: 300, y: 6, z: 300 },
            variance: 60,
            color: 0x550055
        }
    },
    
    // Fallback spawn se squadra non definita
    DEFAULT_SPAWN: { x: 0, y: 6, z: 0 },
    
    // ===== HEALING TOTEM =====
    // Posizione del totem di cura centrale
    HEALING_TOTEM: {
        position: { x: 0, y: 12.5, z: 0 },
        radius: 40,  // Distance in units to trigger healing
        color: 0x00ff00
    },
    
    // ===== TRAINING DUMMY =====
    // Posizione del manichino di allenamento
    TRAINING_DUMMY: {
        position: { x: 0, y: 10, z: 0 }
    },
    
    // ===== MAP BOUNDARIES =====
    // Limiti della mappa e condizioni di morte
    MAP_BOUNDS: {
        // Y coordinate - sotto questo valore = morte (caduta nel vuoto)
        DEATH_PLANE_Y: 0,
        
        // Coordinate X e Z della mappa (per future estensioni)
        MIN_X: -500,
        MAX_X: 500,
        MIN_Z: -500,
        MAX_Z: 500,
        
        // Ground level (y coordinate where player stands)
        GROUND_LEVEL: 6
    },
    
    // ===== ARENA CONFIGURATION =====
    ARENA: {
        // Central platform
        CENTER_X: 0,
        CENTER_Z: 0,
        CENTRAL_PLATFORM_RADIUS: 60,
        
        // Team zones dimensions
        TEAM_BASE_RADIUS: 80,
        TEAM_BASE_DISTANCE_FROM_CENTER: 300,
        
        // Arena walls (decorative, not collision)
        ARENA_WALL_HEIGHT: 15,
        ARENA_WALL_RADIUS: 90
    },
    
    // ===== WORLD DECORATIONS =====
    // Coordinate di oggetti decorativi (alberi, case, rocce)
    DECORATIONS: {
        TREES_PER_BASE: 8,
        TREES_DISTANCE_FROM_BASE: 120,
        
        HOUSES_POSITION: {
            near_red: { x: -200, z: -200 },
            near_black: { x: 200, z: -200 },
            near_green: { x: -200, z: 200 },
            near_purple: { x: 200, z: 200 }
        },
        
        ROCKS_SCATTERED: 12,  // Number of rocks scattered around map
        PILLARS_SCATTERED: 6   // Number of pillars scattered around map
    },
    
    // ===== COLLISION MESH =====
    // Mesh che causano collisione con i giocatori
    OBSTACLES: {
        // Solo rocce e alcuni pilastri
        // Muri dell'arena NON collidono
        // Alberi e case NON collidono
        COLLISION_ROCKS: true,
        COLLISION_PILLARS: false,
        COLLISION_WALLS: false,
        COLLISION_TREES: false,
        COLLISION_HOUSES: false
    },
    
    // ===== PHYSICS PROPERTIES =====
    PHYSICS: {
        // Ground detection y-level
        GROUND_Y: 6,
        
        // Gravity applied to all objects
        GRAVITY: 800  // Units/sec²
    }
};

// Esponi globalmente
window.WORLD_CONFIG = WORLD_CONFIG;
console.log("✅ [CONFIG] WORLD_CONFIG caricato correttamente");
}
