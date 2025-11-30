// utils.js - Utilità Centralizzate
// Consolidate funzioni comuni sparse nei file

// ===== SOCKET MANAGEMENT =====
/**
 * Crea un socket.io configurato correttamente
 * @returns {SocketIOClient}
 */
function createGameSocket() {
    const config = (typeof GAME_CONFIG !== 'undefined') ? GAME_CONFIG.SOCKET_CONFIG : {
        reconnection: true,
        transports: ['websocket', 'polling']
    };
    
    // Auto-detect server URL based on current location
    let url = config.url || 'http://localhost:3000';
    
    // Se siamo su HTTPS (Render usa sempre HTTPS), usa il server Render
    if (window.location.protocol === 'https:') {
        // Extract hostname per connettersi al server Render
        url = window.location.origin; // e.g., https://ragequit1-5-1.onrender.com
        console.log('[SOCKET] HTTPS detected, using server URL:', url);
    } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // Se siamo su un server diverso da localhost, usa quello
        url = window.location.origin;
        console.log('[SOCKET] Non-localhost detected, using server URL:', url);
    }
    
    const options = {
        reconnection: config.reconnection !== undefined ? config.reconnection : true,
        transports: ['websocket', 'polling'],  // Polling fallback per Firefox
        reconnectionDelay: config.reconnectionDelay || 1000,
        reconnectionDelayMax: config.reconnectionDelayMax || 5000,
        reconnectionAttempts: config.reconnectionAttempts || 10,  // Aumentato per Firefox
        // Aggiungi path esplicito per Socket.IO
        path: '/socket.io/',
        // Timeout di connessione più alto per server remoti
        connectTimeout: 10000,
        // Upgrade timeout per Firefox polling
        upgradeTimeout: 10000,
        // Disable websocket upgrade per Firefox se problematico
        rememberUpgrade: false
    };
    
    console.log('[SOCKET] Connecting to:', url, 'with options:', options);
    return io(url, options);
}

/**
 * Disconnette un socket in sicurezza
 * @param {SocketIOClient} socket
 */
function safeDisconnectSocket(socket) {
    if (socket && socket.connected) {
        console.log('[UTILS] Disconnecting socket:', socket.id);
        socket.disconnect();
        return null;
    }
    return socket;
}

// ===== LOGGING E DEBUG =====
/**
 * Log strutturato con categoria
 * @param {string} message - Messaggio
 * @param {string} category - Categoria (NETWORK, GAME, SPELL, PLAYER, etc)
 * @param {any} data - Dati opzionali
 */
function logGame(message, category = 'DEBUG', data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${category}]`;
    
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
}

// ===== VALIDAZIONE =====
/**
 * Valida un ID player
 * @param {string} id
 * @returns {boolean}
 */
function isValidPlayerId(id) {
    return typeof id === 'string' && id.length > 0;
}

/**
 * Valida un team
 * @param {string} team
 * @returns {boolean}
 */
function isValidTeam(team) {
    const validTeams = ['red', 'black', 'green', 'purple'];
    return validTeams.includes(team);
}

/**
 * Ottiene il colore team da un team string
 * @param {string} team
 * @returns {number} Colore esadecimale
 */
function getTeamColor(team) {
    if (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TEAM_COLORS[team]) {
        return GAME_CONFIG.TEAM_COLORS[team];
    }
    // Fallback
    const colors = { red: 0x8B0000, black: 0x003300, green: 0x1B2F2F, purple: 0x550055 };
    return colors[team] || 0x2c3e50;
}

/**
 * Ottiene il nome team
 * @param {string} team
 * @returns {string}
 */
function getTeamName(team) {
    if (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.TEAM_NAMES[team]) {
        return GAME_CONFIG.TEAM_NAMES[team];
    }
    const names = { red: 'CARNAGE', black: 'GRAVES', green: 'SLAUGHTER', purple: 'VISCERA' };
    return names[team] || 'Unknown';
}

// ===== MATH UTILITIES =====
/**
 * Calcola distanza 3D tra due punti
 * @param {object} pos1 - {x, y, z}
 * @param {object} pos2 - {x, y, z}
 * @returns {number}
 */
function distance3D(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Clona un oggetto posizione
 * @param {object} pos - {x, y, z}
 * @returns {object}
 */
function clonePosition(pos) {
    return { x: pos.x, y: pos.y, z: pos.z };
}

// ===== STORAGE UTILITIES =====
/**
 * Salva username in localStorage
 * @param {string} username
 */
function saveUsername(username) {
    if (username && username.length > 0) {
        localStorage.setItem('ragequit_username', username);
    }
}

/**
 * Carica username da localStorage
 * @returns {string}
 */
function loadUsername() {
    return localStorage.getItem('ragequit_username') || '';
}

/**
 * Salva kills in localStorage
 * @param {number} kills
 */
function saveKills(kills) {
    localStorage.setItem('ragequit_kills', kills.toString());
}

/**
 * Carica kills da localStorage
 * @returns {number}
 */
function loadKills() {
    return parseInt(localStorage.getItem('ragequit_kills')) || 0;
}

// ===== DOM UTILITIES =====
/**
 * Nasconde elemento DOM in sicurezza
 * @param {string|HTMLElement} element - Selettore CSS o elemento
 */
function hideElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) el.style.display = 'none';
}

/**
 * Mostra elemento DOM in sicurezza
 * @param {string|HTMLElement} element - Selettore CSS o elemento
 * @param {string} displayType - 'block', 'flex', 'grid', etc (default: 'block')
 */
function showElement(element, displayType = 'block') {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) el.style.display = displayType;
}

// ===== WINDOW GLOBALS SYNC =====
/**
 * Sincronizza variabili globali fra window e variabili locali
 * Usato per sincronizzare menu.js -> game.js
 */
function syncWindowGlobals() {
    if (typeof window === 'undefined') return;
    
    // Sincronizza team
    if (typeof myTeam !== 'undefined' && window.myTeam !== undefined) {
        myTeam = window.myTeam;
    }
    
    // Sincronizza team color
    if (typeof myTeamColor !== 'undefined' && window.myTeamColor !== undefined) {
        myTeamColor = window.myTeamColor;
    }
    
    // Sincronizza username
    if (typeof myUsername !== 'undefined' && window.myUsername !== undefined) {
        myUsername = window.myUsername;
    }
    
    // Sincronizza game mode
    if (typeof myGameMode !== 'undefined' && window.myGameMode !== undefined) {
        myGameMode = window.myGameMode;
    }
}

// Export per commonjs (server-side, se necessario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createGameSocket,
        safeDisconnectSocket,
        logGame,
        isValidPlayerId,
        isValidTeam,
        getTeamColor,
        getTeamName,
        distance3D,
        clonePosition,
        saveUsername,
        loadUsername,
        saveKills,
        loadKills,
        hideElement,
        showElement,
        syncWindowGlobals
    };
}
