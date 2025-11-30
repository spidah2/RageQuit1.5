// menu.js - Menu & Team Selection
// Handles: player selection, team selection, menu audio

let currentGameMode = 'team'; // Solo modalità squadre
let selectedTeam = null; // 'red', 'black', 'green', 'purple'
let playerUsername = '';
let menuSocket = null; // Socket unico per il menu, evita duplicati

// Use TEAM_COLORS from config.js (if available) or fallback
const TEAM_COLORS = (typeof GAME_CONFIG !== 'undefined') 
    ? GAME_CONFIG.TEAM_COLORS 
    : {
        red: 0x8B0000,
        black: 0x003300,
        green: 0x1B2F2F,
        purple: 0x550055
    };

// ===== SIMPLIFIED MENU AUDIO SYSTEM =====
// Button to control menu music: ON/OFF

let menuMusicState = true; // true = on, false = off

/**
 * Simple toggle: turn music on/off
 */
function toggleMenuMusic() {
    const menuMusic = document.getElementById('menu-music');
    const btn = document.getElementById('menu-audio-btn');
    
    if (!menuMusic) {
        console.error('[AUDIO] Audio element not found');
        return;
    }
    
    if (!btn) {
        console.error('[AUDIO] Audio button not found');
        return;
    }
    
    if (menuMusicState) {
        // Music on -> turn it off
        menuMusic.pause();
        menuMusicState = false;
        btn.textContent = '🔊 MUSIC: OFF';
        console.log('[AUDIO] Music stopped');
    } else {
        // Music off -> turn it on
        menuMusic.volume = 0.15;
        menuMusic.play();
        menuMusicState = true;
        btn.textContent = '🔊 MUSIC: ON';
        console.log('[AUDIO] Music playing');
    }
}

// NEW: Function to show error when username is missing
function showUsernameError() {
    const usernameInput = document.getElementById('username-input');
    const teamBtn = document.getElementById('team-btn');
    
    usernameInput.focus();
    
    // Animazione intensa del bordo rosso con bagliore più forte
    usernameInput.style.border = 'none';
    usernameInput.style.boxShadow = '0 0 30px rgba(255,0,0,1), 0 0 60px rgba(255,0,0,0.8), inset 0 0 30px rgba(255,0,0,0.4)';
    usernameInput.style.backgroundColor = 'rgba(255,0,0,0.15)';
    
    // Anima il bottone GIOCA con bagliore più intenso
    teamBtn.style.backgroundColor = 'rgba(255,0,0,0.6)';
    teamBtn.style.boxShadow = '0 0 40px rgba(255,0,0,1), 0 0 80px rgba(255,0,0,0.6)';
    
    // Suono di errore più forte e distintivo
    playErrorSound();
    
    // Vibrazione più marcata (se disponibile)
    if (navigator.vibrate) {
        navigator.vibrate([150, 100, 150, 100, 150]);
    }
    
    // Animazione di shake più violenta
    const originalPosition = usernameInput.style.transform;
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            usernameInput.style.transform = i % 2 === 0 ? 'translateX(-8px)' : 'translateX(8px)';
        }, i * 40);
    }
    setTimeout(() => {
        usernameInput.style.transform = originalPosition;
    }, 240);
    
    // Reset degli stili dopo 2 secondi
    setTimeout(() => {
        usernameInput.style.border = 'none';
        usernameInput.style.boxShadow = 'none';
        usernameInput.style.backgroundColor = '';
        teamBtn.style.backgroundColor = '';
        teamBtn.style.boxShadow = '';
    }, 2000);
}

// Funzione per riprodurre suono di errore potenziato
function playErrorSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        // Primo beep: basso e inquietante
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(300, now);
        osc1.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc1.start(now);
        osc1.stop(now + 0.25);
        
        // Secondo beep: più acuto
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(500, now + 0.3);
        osc2.frequency.exponentialRampToValueAtTime(150, now + 0.55);
        gain2.gain.setValueAtTime(0.35, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc2.start(now + 0.3);
        osc2.stop(now + 0.55);
    } catch (e) {
        console.warn('Errore nel riprodurre suono di errore:', e);
    }
}

function initMenu() {
    const mainMenu = document.getElementById('main-menu');
    const teamSelectionScreen = document.getElementById('team-selection-screen');
    const usernameInput = document.getElementById('username-input');
    const teamBtn = document.getElementById('team-btn');
    const teamOptions = document.querySelectorAll('.team-option');
    const menuKeybindsBtn = document.getElementById('menu-keybinds-btn');
    const menuAudioBtn = document.getElementById('menu-audio-btn');
    
    // === UNLOCK AUDIO CON PRIMO CLICK ===
    // Il browser blocca l'autoplay finché l'utente non interagisce
    // Questo listener avvia la musica al primo click
    function unlockAudioOnFirstInteraction() {
        const menuMusic = document.getElementById('menu-music');
        if (menuMusic && menuMusicState && menuMusic.paused) {
            menuMusic.volume = 0.15;
            menuMusic.play().then(() => {
                console.log('[AUDIO] Musica sbloccata dopo primo click');
            }).catch(e => console.warn('[AUDIO] Failed to play:', e));
        }
        // Rimuovi il listener dopo il primo click
        document.removeEventListener('click', unlockAudioOnFirstInteraction);
    }
    
    // Aggiungi listener al primo click
    document.addEventListener('click', unlockAudioOnFirstInteraction, { once: true });
    
    // === BOTTONE MUSICA ===
    // Semplice toggle ON/OFF della musica
    if (menuAudioBtn) {
        menuAudioBtn.textContent = menuMusicState ? '🔊 MUSICA: ON' : '🔊 MUSICA: OFF';
        menuAudioBtn.addEventListener('click', () => {
            toggleMenuMusic();
        });
        
        // Avvia la musica automaticamente all'apertura del menu (fallback se il click non funziona)
        if (menuMusicState) {
            const menuMusic = document.getElementById('menu-music');
            if (menuMusic && menuMusic.paused) {
                menuMusic.volume = 0.15;
                menuMusic.play().catch(e => console.warn('Failed to play:', e));
                console.log('[AUDIO] Musica avviata automaticamente');
            }
        }
    }
    
    // Bottone Comandi nel menu - apre il pannello keybinds
    if (menuKeybindsBtn) {
        menuKeybindsBtn.addEventListener('click', () => {
            const keybindsPanel = document.getElementById('keybinds-panel');
            if (keybindsPanel) {
                keybindsPanel.style.display = 'block';
                // Chiama la funzione per popolare il pannello
                if (typeof window.initKeybindsUI === 'function') {
                    window.initKeybindsUI();
                }
            }
        });
    }
    
    // Bottone Chiudi nel pannello keybinds
    const closeKeybindsBtn = document.getElementById('close-keybinds');
    if (closeKeybindsBtn) {
        closeKeybindsBtn.addEventListener('click', () => {
            const keybindsPanel = document.getElementById('keybinds-panel');
            if (keybindsPanel) {
                keybindsPanel.style.display = 'none';
            }
        });
    }

    // Carica username salvato
    const savedUsername = loadUsername();
    if (savedUsername) {
        usernameInput.value = savedUsername;
        playerUsername = savedUsername;
    }

    // Aggiorna username quando cambia
    usernameInput.addEventListener('input', (e) => {
        playerUsername = e.target.value.trim();
        if (playerUsername) {
            saveUsername(playerUsername);
        }
    });

    // Click su SQUADRE -> Mostra selezione squadre
    teamBtn.addEventListener('click', () => {
        if (!playerUsername) {
            showUsernameError();
            return;
        }

        currentGameMode = 'team';
        
        // Salva username
        window.myUsername = playerUsername;
        saveUsername(playerUsername);
        
        // Nascondi menu principale e mostra selezione squadre
        mainMenu.style.display = 'none';
        teamSelectionScreen.style.display = 'flex';
        
        // Richiedi conteggio squadre - usa un socket unico
        if (typeof io !== 'undefined') {
            // Se il socket non esiste ancora, crealo UNA SOLA VOLTA
            if (!menuSocket || !menuSocket.connected) {
                menuSocket = io();
                menuSocket.on('teamCounts', (counts) => {
                    updateTeamCounts(counts);
                });
                console.log('[MENU] Socket creato per team counts');
            }
            menuSocket.emit('requestTeamCounts');
        }
    });

    // Click su una squadra -> Entra nel gioco con quella squadra
    teamOptions.forEach(option => {
        option.addEventListener('click', () => {
            const team = option.dataset.team;
            selectedTeam = team;
            
            // Imposta colore squadra
            window.myTeam = team;
            window.myTeamColor = TEAM_COLORS[team];
            console.log('[MENU] Team selected:', team, 'Color:', window.myTeamColor.toString(16));
            
            // Nascondi selezione squadre e avvia gioco
            teamSelectionScreen.style.display = 'none';
            startGame('team');
        });
    });
}

function startGame(mode) {
    console.log(`[MENU] Starting game - Mode: ${mode}, Team: ${selectedTeam || 'none'}`);
    
    // === GESTIONE AUDIO AL LANCIO DEL GIOCO ===
    // Ferma la musica del menu
    const menuMusic = document.getElementById('menu-music');
    if (menuMusic) {
        menuMusic.pause();
        menuMusic.currentTime = 0;
    }
    menuMusicState = false; // Stato offline durante il gioco
    console.log('[AUDIO] Musica del menu fermata per il gioco');
    
    // Imposta variabili globali (solo team mode)
    window.myGameMode = 'team';
    
    if (selectedTeam) {
        window.myTeamColor = TEAM_COLORS[selectedTeam];
        window.myTeam = selectedTeam;
    }

    // INITIALIZE THE GAME - Fundamental call!
    if (typeof init === 'function') {
        console.log('[MENU] Calling init() to start Three.js');
        init();
    } else {
        console.error('[MENU] Function init() not found!');
    }

    // Inizializza multiplayer se disponibile
    if (typeof initMultiplayer === 'function' && mode !== 'pve') {
        // Disconnetti il socket del menu prima di creare il socket del gioco
        if (menuSocket) {
            menuSocket = safeDisconnectSocket(menuSocket);
        }
        initMultiplayer();
    }

    // Richiedi pointer lock dopo breve delay
    setTimeout(() => {
        try {
            const promise = document.body.requestPointerLock();
            if (promise && typeof promise.catch === 'function') {
                promise.catch(e => console.log('[MENU] Pointer lock non attivato:', e));
            }
        } catch(e) {
            console.log('[MENU] Errore pointer lock:', e);
        }
    }, 100);

    console.log('[MENU] Game started successfully');
}

function returnToMenu() {
    // Reload page to return to menu
    location.reload();
}

function updateTeamCounts(counts) {
    Object.keys(counts).forEach(team => {
        const countEl = document.getElementById(`team-count-${team}`);
        if (countEl) {
            const count = counts[team];
            countEl.textContent = count === 1 ? '1 giocatore' : `${count} giocatori`;
        }
    });
}

// Esponi la funzione globalmente per aggiornamenti in tempo reale
window.updateTeamCounts = updateTeamCounts;

// Funzione per reinizializzare la selezione squadra durante il gioco
function reinitializeTeamSelection() {
    const teamSelectionScreen = document.getElementById('team-selection-screen');
    if (!teamSelectionScreen) return;
    
    // Mostra lo schermo di selezione squadra
    teamSelectionScreen.style.display = 'flex';
    
    const teamOptions = document.querySelectorAll('.team-option');
    teamOptions.forEach(option => {
        // Rimuovi gli event listener vecchi
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
    });
    
    // Aggiungi nuovi event listener
    const newTeamOptions = document.querySelectorAll('.team-option');
    newTeamOptions.forEach(option => {
        option.addEventListener('click', () => {
            const team = option.dataset.team;
            selectedTeam = team;
            
            // Imposta colore squadra
            window.myTeam = team;
            window.myTeamColor = TEAM_COLORS[team];
            console.log('[MENU] Team changed to:', team, 'Color:', window.myTeamColor.toString(16));
            
            // Nascondi selezione squadre e torna al gioco
            teamSelectionScreen.style.display = 'none';
            
            // Aggiorna subito il colore della squadra nel client (non aspettare il server)
            window.myTeam = team;
            window.myTeamColor = TEAM_COLORS[team];
            if (typeof myTeam !== 'undefined') myTeam = team;
            if (typeof myTeamColor !== 'undefined') myTeamColor = TEAM_COLORS[team];
            
            // Riattiva il pointer lock
            if (document.pointerLockElement !== document.body) {
                try {
                    document.body.requestPointerLock();
                } catch(err) {
                    console.log('Pointer lock error:', err);
                }
            }
            
            // Emetti evento di cambio squadra al server
            if (window.socket && typeof window.socket.emit === 'function') {
                window.socket.emit('changeTeam', team);
            }
        });
    });
    
    teamSelectionScreen.style.display = 'flex';
}

// Esponi la funzione globalmente
window.reinitializeTeamSelection = reinitializeTeamSelection;

// Initialize menu when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
} else {
    initMenu();
}
