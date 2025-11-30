// Verifica che THREE.js sia caricato
if (typeof THREE === 'undefined') {
    throw new Error('[GAME] THREE.js not loaded! Check script loading order.');
}
console.log('[GAME] THREE.js ready, version r' + THREE.REVISION);

let socket = null;
        const otherPlayers = {}; 
        let myId = null;
        let myUsername = loadUsername() || "Player";
        let myTeamColor = 0x2c3e50; // Colore dell'armatura del giocatore
        let myGameMode = 'team'; // Solo modalità team
        let myTeam = null; // 'red', 'black', 'green', 'purple'
        let isPvEMode = false; // Flag per modalità PvE
        let aiMonster = null; // Riferimento al mostro IA
        let myKills = loadKills(); // Carica da localStorage
        const playerKills = {}; // Kill di tutti i player {playerId: kills}
        const teamKills = {red: 0, black: 0, green: 0, purple: 0}; // Kill per squadra
        
        const WORLD_SEED = 123456;
        let seed = WORLD_SEED;
        function random() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

        let camera, scene, renderer;
        let playerMesh, swordContainer, staffContainer, shieldMesh, bowContainer;
        let playerLimbs = { legL: null, legR: null, armL: null, armR: null, head: null, torso: null, helmet: null };
        let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
        let canJump = false; let isSprinting = false;
        let isBlocking = false; 
        let prevTime = performance.now();
        const velocity = new THREE.Vector3();
        let isCtrlPressed = false; // Flag per Ctrl
        let weaponMode = 'ranged'; let currentSpell = 1; 
        let isAttacking = false; let attackTimer = 0; let isWhirlwinding = false; 
        const playerStats = { hp: 100, maxHp: 100, mana: 100, maxMana: 100, stamina: 100, maxStamina: 100, isDead: false, isFalling: false };
        const projectiles = [], obstacles = [], particles = [];
        let frameCount = 0; // Per throttling UI
        const particlePool = []; // Object pooling per particelle
        const maxParticles = 100; // Limita particelle attive
        
        // Networking avanzato - Lag compensation
        const positionBuffer = {}; // Buffer posizioni per interpolazione
        const INTERPOLATION_DELAY = 50; // Reduced from 100ms for snappier feel (FPS mode)
        let serverTime = 0;
        let clientTimeOffset = 0;
        
        // LOD System
        const LOD_DISTANCES = { HIGH: 50, MEDIUM: 150, LOW: 300 };
        let lodObjects = [];
        
        // Spectator mode
        let isSpectating = false;
        let spectateTarget = null;
        let spectateIndex = 0;
        
        // Match statistics
        const matchStats = {
            kills: 0, deaths: 0, damage: 0, healing: 0,
            accuracy: { shots: 0, hits: 0 },
            startTime: Date.now(),
            matchHistory: JSON.parse(localStorage.getItem('ragequit_match_history') || '[]')
        };
        
        // FPS Counter
        let fpsFrames = 0;
        let fpsLastTime = performance.now();
        let currentFPS = 0;
        
        // Ping Counter
        let lastPingTime = 0;
        let currentPing = 0;
        let floatingTexts = [];
        const activeConversions = []; 
        let castingState = { active: false, currentSpell: 0, timer: 0, maxTime: 0, ready: false, keyHeld: null };
        let lastAttackTime = 0; let lastHealTime = -10000; let lastConversionTime = 0; let lastWhirlwindTime = 0; let lastSpikesTime = 0;
        let keyToRebind = null; // Variabile per gestire il rebinding dei tasti 
        const savedSens = localStorage.getItem('ragequit_mouse_sensitivity');
        let mouseSensitivity = (savedSens && !isNaN(parseFloat(savedSens))) ? parseFloat(savedSens) : 1.0;
        
        // Deduplication for player removal
        const recentlyRemoved = {};
        const DEDUPE_WINDOW_MS = 500;
        
        // Jump Vars
        let lastJumpTime = 0;
        let lastFootstepTime = 0;
        let distanceSinceStep = 0;

        let euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // NOTE: All spell parameters now loaded from GAME_CONFIG.SPELL_PARAMS in config.js
        // This is the single source of truth for all game values
        // Legacy SETTINGS object removed - use GAME_CONFIG.SPELL_PARAMS directly
        
        
        const loginModal = document.getElementById('login-modal');
        const obstacleRaycaster = new THREE.Raycaster();

        // Draggable UI Container
        const uiContainer = document.getElementById('ui-container');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        uiContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragOffsetX = e.clientX - uiContainer.offsetLeft;
            dragOffsetY = e.clientY - uiContainer.offsetTop;
            uiContainer.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                uiContainer.style.left = (e.clientX - dragOffsetX) + 'px';
                uiContainer.style.bottom = 'auto';
                uiContainer.style.top = (e.clientY - dragOffsetY) + 'px';
            }
            if (isChatDragging) {
                chatContainer.style.right = 'auto';
                chatContainer.style.left = (e.clientX - chatDragOffsetX) + 'px';
                chatContainer.style.bottom = 'auto';
                chatContainer.style.top = (e.clientY - chatDragOffsetY) + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                uiContainer.classList.remove('dragging');
            }
            if (isChatDragging) {
                isChatDragging = false;
                chatContainer.classList.remove('dragging');
            }
        });
        
        // Draggable Chat Container
        const chatContainer = document.getElementById('chat-container');
        const chatHeader = document.getElementById('chat-header');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const chatCloseBtn = document.getElementById('chat-close-btn');
        let isChatDragging = false;
        let chatDragOffsetX = 0;
        let chatDragOffsetY = 0;
        let isChatMinimized = false;

        chatHeader.addEventListener('mousedown', (e) => {
            // Non iniziare drag se click sul bottone close
            if (e.target === chatCloseBtn) return;
            isChatDragging = true;
            const rect = chatContainer.getBoundingClientRect();
            chatDragOffsetX = e.clientX - rect.left;
            chatDragOffsetY = e.clientY - rect.top;
            chatContainer.classList.add('dragging');
        });
        
        // Bottone chiudi/minimizza chat
        chatCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isChatMinimized = !isChatMinimized;
            if (isChatMinimized) {
                chatContainer.classList.add('minimized');
                chatCloseBtn.textContent = '+';
            } else {
                chatContainer.classList.remove('minimized');
                chatCloseBtn.textContent = '×';
            }
        });
        
        // Chat input handling
        let isChatFocused = false;
        chatInput.addEventListener('focus', () => {
            isChatFocused = true;
        });
        chatInput.addEventListener('blur', () => {
            isChatFocused = false;
            // Riattiva pointer lock quando si esce dalla chat
            if (!playerStats.isDead && document.pointerLockElement !== document.body) {
                setTimeout(() => {
                    try {
                        document.body.requestPointerLock();
                    } catch(e) {
                        console.log('Pointer lock error:', e);
                    }
                }, 100);
            }
        });
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim()) {
                sendChatMessage(chatInput.value.trim());
                chatInput.value = '';
                chatInput.blur();
            }
            e.stopPropagation();
        });
        
        function sendChatMessage(message) {
            if (socket && socket.connected) {
                socket.emit('chatMessage', { username: myUsername, text: message });
            }
        }
        
        function addChatMessage(username, text, isSystem = false) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'chat-message' + (isSystem ? ' system' : '');
            msgDiv.innerHTML = `<span class="chat-username">${username}:</span><span class="chat-text">${text}</span>`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Limita messaggi a 50
            while (chatMessages.children.length > 50) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
        }

        document.addEventListener('contextmenu', event => event.preventDefault());

        // Il login è gestito da menu.js

        // Pulsante Torna al Menu Principale
        document.getElementById('menu-btn').addEventListener('click', () => {
            document.exitPointerLock();
            if (socket) socket.disconnect();
            
            // Ripristina le variabili di gioco
            myId = null;
            myUsername = "Player";
            myTeamColor = 0x2c3e50;
            myGameMode = 'team';
            myTeam = null;
            playerStats.hp = 100;
            playerStats.mana = 100;
            playerStats.stamina = 100;
            playerStats.isDead = false;
            
            // Ricrea il game (azzera il mondo)
            location.reload();
        });

        

        // --- SISTEMA KEYBINDS COMPLETO ---
        const KEYBINDS = { 
            SPELL_1: 'Digit1',      // Bolt
            SPELL_2: 'KeyX',        // Begone
            SPELL_3: 'KeyF',        // Fireball
            SPELL_4: 'KeyE',        // Impale
            WEAPON_SWITCH: 'KeyQ',
            BOW_EQUIP: 'KeyC',      // Arco
            HEAL: 'KeyR',
            MOVE_FORWARD: 'KeyW',
            MOVE_LEFT: 'KeyA',
            MOVE_BACKWARD: 'KeyS',
            MOVE_RIGHT: 'KeyD',
            JUMP: 'Space',
            SPRINT: 'ShiftLeft',
            CONVERT_1: 'Digit2',    // Stamina → HP
            CONVERT_2: 'Digit3',    // HP → Mana
            CONVERT_3: 'Digit4'     // Mana → Stamina
        };
        
        const KEY_NAMES = {
            SPELL_1: '🔹 Bolt',
            SPELL_2: '💨 Begone',
            SPELL_3: '🔥 Fireball',
            SPELL_4: '⛰️ Impale',
            WEAPON_SWITCH: '⚔️ Cambia Arma/Melee',
            BOW_EQUIP: '🏹 Arco',
            HEAL: '💚 Cura',
            MOVE_FORWARD: '⬆️ Avanti',
            MOVE_LEFT: '⬅️ Sinistra',
            MOVE_BACKWARD: '⬇️ Indietro',
            MOVE_RIGHT: '➡️ Destra',
            JUMP: '🔼 Salto',
            SPRINT: '⚡ Scatto',
            CONVERT_1: '♥ Stamina → HP',
            CONVERT_2: '💧 HP → Mana',
            CONVERT_3: '⚡ Mana → Stamina'
        };

        const STORAGE_KEY = 'ragequit_keybinds_v2';
        let currentBindingAction = null;

        // Carica keybinds salvati
        function loadKeybinds() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    Object.assign(KEYBINDS, JSON.parse(saved));
                }
            } catch(e) {
                console.error('Error loading keybinds:', e);
            }
        }

        // Salva keybinds
        function saveKeybinds() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(KEYBINDS));
            } catch(e) {
                console.error('Errore salvataggio keybinds:', e);
            }
        }

        // Formatta il codice tasto per visualizzazione
        function formatKey(code) {
            // Gestisci mouse button
            if (code === 'MouseButton3') return '🖱️ Mouse Indietro';
            if (code === 'MouseButton4') return '🖱️ Mouse Avanti';
            
            return code
                .replace('Key', '')
                .replace('Digit', '')
                .replace('Space', 'SPAZIO')
                .replace('ShiftLeft', 'SHIFT')
                .replace('ShiftRight', 'SHIFT')
                .replace('ControlLeft', 'CTRL')
                .replace('ControlRight', 'CTRL')
                .toUpperCase();
        }

        // Inizializza UI keybinds
        function initKeybindsUI() {
            console.log('initKeybindsUI called');
            const content = document.getElementById('keybinds-content');
            console.log('keybinds-content element:', content);
            if (!content) {
                console.error('keybinds-content not found!');
                return;
            }
            
            content.innerHTML = '';
            
            // Aggiungi slider sensibilità mouse
            const sensRow = document.createElement('div');
            sensRow.className = 'sensitivity-row';
            sensRow.style.gridColumn = '1 / -1';
            sensRow.style.marginBottom = '20px';
            
            const sensLabel = document.createElement('div');
            sensLabel.style.display = 'flex';
            sensLabel.style.justifyContent = 'space-between';
            sensLabel.style.marginBottom = '10px';
            sensLabel.innerHTML = `<span class="keybind-label">🎯 SENSIBILITÀ MOUSE</span><span class="keybind-label" id="sens-value">${(mouseSensitivity * 100).toFixed(0)}%</span>`;
            
            const sensSlider = document.createElement('input');
            sensSlider.type = 'range';
            sensSlider.min = '0.1';
            sensSlider.max = '3.0';
            sensSlider.step = '0.1';
            sensSlider.value = mouseSensitivity;
            sensSlider.className = 'sensitivity-slider';
            sensSlider.oninput = (e) => {
                mouseSensitivity = parseFloat(e.target.value);
                document.getElementById('sens-value').textContent = `${(mouseSensitivity * 100).toFixed(0)}%`;
                localStorage.setItem('ragequit_mouse_sensitivity', mouseSensitivity);
            };
            
            sensRow.appendChild(sensLabel);
            sensRow.appendChild(sensSlider);
            content.appendChild(sensRow);
            
            for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                const row = document.createElement('div');
                row.className = 'keybind-row';
                
                const label = document.createElement('span');
                label.className = 'keybind-label';
                label.textContent = KEY_NAMES[action] || action;
                
                const keyBtn = document.createElement('button');
                keyBtn.className = 'keybind-btn';
                keyBtn.textContent = formatKey(keyCode);
                keyBtn.onclick = () => startRebind(action, keyBtn);
                
                row.appendChild(label);
                row.appendChild(keyBtn);
                content.appendChild(row);
            }
            
            console.log('Created', Object.keys(KEYBINDS).length, 'keybind rows');
            updateActionBarLabels();
        }
        
        // Esponi la funzione globalmente per il menu
        window.initKeybindsUI = initKeybindsUI;

        // Inizia il rebinding di un tasto
        function startRebind(action, btnElement) {
            if (currentBindingAction) return;
            
            currentBindingAction = action;
            btnElement.classList.add('listening');
            btnElement.textContent = 'PREMI UN TASTO O MOUSE...';
            
            const handleKey = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Ignora ESC per cancellare
                if (e.code === 'Escape') {
                    btnElement.classList.remove('listening');
                    btnElement.textContent = formatKey(KEYBINDS[action]);
                    currentBindingAction = null;
                    document.removeEventListener('mousedown', handleMouse);
                    return;
                }
                
                KEYBINDS[action] = e.code;
                saveKeybinds();
                
                btnElement.classList.remove('listening');
                btnElement.textContent = formatKey(e.code);
                currentBindingAction = null;
                document.removeEventListener('mousedown', handleMouse);
                
                updateActionBarLabels();
            };
            
            const handleMouse = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Cattura button 3 (mouse indietro) e 4 (mouse avanti)
                if (e.button === 3) {
                    KEYBINDS[action] = 'MouseButton3';
                    saveKeybinds();
                    btnElement.classList.remove('listening');
                    btnElement.textContent = formatKey('MouseButton3');
                    currentBindingAction = null;
                    document.removeEventListener('keydown', handleKey);
                    return;
                } else if (e.button === 4) {
                    KEYBINDS[action] = 'MouseButton4';
                    saveKeybinds();
                    btnElement.classList.remove('listening');
                    btnElement.textContent = formatKey('MouseButton4');
                    currentBindingAction = null;
                    document.removeEventListener('keydown', handleKey);
                    return;
                }
            };
            
            document.addEventListener('keydown', handleKey, { once: true });
            document.addEventListener('mousedown', handleMouse);
        }

        // Aggiorna le label nella action bar
        function updateActionBarLabels() {
            const set = (id, action) => {
                const el = document.getElementById(id);
                if (el) el.textContent = formatKey(KEYBINDS[action]);
            };
            
            set('lbl-switch', 'WEAPON_SWITCH');
            set('lbl-bow', 'BOW_EQUIP');
            set('lbl-spell1', 'SPELL_1');
            set('lbl-spell2', 'SPELL_2');
            set('lbl-spell3', 'SPELL_3');
            set('lbl-spell4', 'SPELL_4');
            set('lbl-heal', 'HEAL');
            set('lbl-conv1', 'CONVERT_1');
            set('lbl-conv2', 'CONVERT_2');
            set('lbl-conv3', 'CONVERT_3');
        }

        // Carica i keybinds all'avvio
        loadKeybinds();
        
        // === KILL COUNTER SYSTEM ===
        function updateKillCounter() {
            // Aggiorna il team scoreboard
            const teams = ['red', 'black', 'green', 'purple'];
            const teamNames = {red: 'CARNAGE', black: 'GRAVES', green: 'SLAUGHTER', purple: 'VISCERA'};
            // Usa window.myTeam se disponibile, altrimenti usa la variabile locale
            const currentTeam = window.myTeam || myTeam;
            
            teams.forEach(team => {
                // Aggiorna il punteggio della squadra
                const scoreElement = document.querySelector(`.team-score[data-team="${team}"] .team-score-value`);
                if (scoreElement) {
                    scoreElement.textContent = teamKills[team] || 0;
                }
                
                // Aggiorna la lista dei giocatori
                const playersContainer = document.querySelector(`.team-players[data-team="${team}"]`);
                if (playersContainer) {
                    playersContainer.innerHTML = '';
                    
                    // Aggiungi i giocatori della squadra
                    Object.entries(otherPlayers).forEach(([id, player]) => {
                        if (player.team === team) {
                            const playerDiv = document.createElement('div');
                            playerDiv.className = 'player-item';
                            playerDiv.innerHTML = `
                                <span class="player-name">${player.username}</span>
                                <span class="player-kills">${playerKills[id] || 0}</span>
                            `;
                            playersContainer.appendChild(playerDiv);
                        }
                    });
                    
                    // Aggiungi il player stesso se è in questa squadra
                    if (currentTeam === team) {
                        const myPlayerDiv = document.createElement('div');
                        myPlayerDiv.className = 'player-item';
                        myPlayerDiv.style.borderLeftColor = 'rgba(255,215,0,0.5)';
                        myPlayerDiv.innerHTML = `
                            <span class="player-name" style="color:#ffd700; font-weight:700;">${myUsername} (TU)</span>
                            <span class="player-kills">${myKills}</span>
                        `;
                        playersContainer.appendChild(myPlayerDiv);
                    }
                }
            });
        }
        
        function incrementKill(playerId, team) {
            if (!playerKills[playerId]) playerKills[playerId] = 0;
            playerKills[playerId]++;
            
            if (playerId === myId) {
                myKills++;
                saveKills(myKills);
            }
            
            if (team && teamKills[team] !== undefined) {
                teamKills[team]++;
            }
            
            updateKillCounter();
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let audioEnabled = true; // Default: on
        function toggleAudio() { 
            audioEnabled = !audioEnabled; 
            document.getElementById('audio-btn').innerText = audioEnabled ? "🔊 SUONI: ON" : "🔊 SUONI: OFF"; 
            if(audioEnabled && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(e => console.warn("Audio resume failed:", e));
            }
        }
        
        // NUOVO: Fullscreen toggle function
        let isFullscreen = false;
        function toggleFullscreen() {
            const doc = document.documentElement;
            const fullscreenBtn = document.getElementById('fullscreen-btn');
            
            if (!isFullscreen) {
                // Entra in fullscreen
                const requestFullscreen = doc.requestFullscreen || doc.webkitRequestFullscreen || doc.mozRequestFullScreen || doc.msRequestFullscreen;
                if (requestFullscreen) {
                    requestFullscreen.call(doc).then(() => {
                        isFullscreen = true;
                        fullscreenBtn.innerText = '📺 ESCI FULLSCREEN';
                        fullscreenBtn.style.backgroundColor = '#4CAF50';
                    }).catch(err => {
                        console.warn('Fullscreen error:', err);
                        alert('Fullscreen non disponibile nel tuo browser');
                    });
                }
            } else {
                // Esci da fullscreen
                const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
                if (exitFullscreen) {
                    exitFullscreen.call(document).then(() => {
                        isFullscreen = false;
                        fullscreenBtn.innerText = '🖥️ FULLSCREEN';
                        fullscreenBtn.style.backgroundColor = '';
                    }).catch(err => {
                        console.warn('Exit fullscreen error:', err);
                    });
                }
            }
        }
        
        // Ascolta i cambiamenti di fullscreen (per sincronizzare quando l'utente preme ESC)
        document.addEventListener('fullscreenchange', () => {
            isFullscreen = !!document.fullscreenElement;
            const fullscreenBtn = document.getElementById('fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.innerText = isFullscreen ? '📺 ESCI FULLSCREEN' : '🖥️ FULLSCREEN';
                fullscreenBtn.style.backgroundColor = isFullscreen ? '#4CAF50' : '';
            }
        });
        
        // Fallback per webkit
        document.addEventListener('webkitfullscreenchange', () => {
            isFullscreen = !!document.webkitFullscreenElement;
            const fullscreenBtn = document.getElementById('fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.innerText = isFullscreen ? '📺 ESCI FULLSCREEN' : '🖥️ FULLSCREEN';
                fullscreenBtn.style.backgroundColor = isFullscreen ? '#4CAF50' : '';
            }
        });
        
        function playSound(type, pos = null) {
            if (!audioEnabled) return; 
            let vol = 0.1;
            if (pos) {
                const dist = playerMesh.position.distanceTo(pos);
                if (dist > 100) return;
                vol = 0.1 * (1 - (dist / 100));
            }

            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); const now = audioCtx.currentTime;
            
            if (type === 'shoot_bolt') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.15); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } 
            else if (type === 'shoot_fire') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now + 0.3); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); } 
            else if (type === 'hit') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); } 
            else if (type === 'jump') { osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.2); gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); } 
            else if (type === 'heal') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.5); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.5); osc.start(now); osc.stop(now + 0.5); } 
            else if (type === 'swing') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.2); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
            else if (type === 'swing_heavy') {
                const osc2 = audioCtx.createOscillator(); osc2.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 0.3);
                osc2.frequency.setValueAtTime(160, now); osc2.frequency.linearRampToValueAtTime(60, now + 0.3);
                osc2.connect(gain);
                gain.gain.setValueAtTime(vol * 1.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc2.start(now); osc.stop(now + 0.3); osc2.stop(now + 0.3);
            }
            else if (type === 'whirlwind') {
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(400, now + 0.25); osc.frequency.linearRampToValueAtTime(100, now + 0.5);
                gain.gain.setValueAtTime(vol, now); gain.gain.linearRampToValueAtTime(vol, now + 0.4); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc.start(now); osc.stop(now + 0.5);
            }
            else if (type === 'step') {
                osc.type = 'triangle';
                const pitch = 80 + Math.random() * 20;
                osc.frequency.setValueAtTime(pitch, now); osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, now + 0.08);
                gain.gain.setValueAtTime(vol * 0.5, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now); osc.stop(now + 0.08);
            }
            else if (type === 'death') {
                // Suono di morte: basso e inquietante, frequenza che scende bruscamente
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                osc.start(now);
                osc.stop(now + 0.8);
            }
            else if (type === 'kill') {
                // Suono di vittoria: ascesa veloce della frequenza, suono vittorioso
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
            }
        }

        // MUSICA DI BACKGROUND - 8bit Metal Gore
        let backgroundMusicOscillators = [];
        let musicLoopTimeout = null;

        function startBackgroundMusic() {
            if (!audioEnabled || audioCtx.state === 'suspended') return;
            
            // Ferma la musica precedente
            backgroundMusicOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            backgroundMusicOscillators = [];
            if (musicLoopTimeout) clearTimeout(musicLoopTimeout);
            
            // Pattern metallico ritmato 8bit - BPM 140
            const bpm = 140;
            const beatDuration = (60 / bpm) / 1000; // Convert to seconds
            const now = audioCtx.currentTime;
            
            // Note in Hz per il pattern metal
            const notes = {
                E2: 82.41,   // Nota bassa per il riff
                G2: 98.00,
                A2: 110.00,
                B2: 123.47,
                E3: 164.81,
                G3: 196.00,
                A3: 220.00,
                B3: 246.94
            };
            
            // Pattern del riff (8 beat)
            const pattern = [
                { note: notes.E2, duration: 0.25 },
                { note: notes.E2, duration: 0.25 },
                { note: notes.G2, duration: 0.25 },
                { note: notes.E2, duration: 0.25 },
                { note: notes.A2, duration: 0.5 },
                { note: notes.E2, duration: 0.25 },
                { note: notes.E2, duration: 0.25 },
                { note: notes.B2, duration: 0.5 }
            ];
            
            let time = now;
            
            pattern.forEach((note, idx) => {
                // Oscillatore principale (square wave per suono metallico)
                const osc1 = audioCtx.createOscillator();
                const gain1 = audioCtx.createGain();
                
                osc1.type = 'square';
                osc1.frequency.setValueAtTime(note.note, time);
                osc1.connect(gain1);
                gain1.connect(audioCtx.destination);
                
                // Envelope ADSR
                const dur = (note.duration * beatDuration);
                gain1.gain.setValueAtTime(0.15, time);
                gain1.gain.linearRampToValueAtTime(0.12, time + dur * 0.1);
                gain1.gain.linearRampToValueAtTime(0.05, time + dur * 0.8);
                gain1.gain.linearRampToValueAtTime(0, time + dur);
                
                osc1.start(time);
                osc1.stop(time + dur);
                backgroundMusicOscillators.push(osc1);
                
                // Oscillatore armonica (aggiunge carattere metallico)
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(note.note * 2, time); // Armonica superiore
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                
                gain2.gain.setValueAtTime(0.05, time);
                gain2.gain.linearRampToValueAtTime(0, time + dur);
                
                osc2.start(time);
                osc2.stop(time + dur);
                backgroundMusicOscillators.push(osc2);
                
                time += dur;
            });
            
            // Loop della musica
            const totalDuration = pattern.reduce((sum, note) => sum + note.duration * beatDuration, 0);
            musicLoopTimeout = setTimeout(() => {
                startBackgroundMusic();
            }, (totalDuration + 0.1) * 1000);
        }

        function stopBackgroundMusic() {
            backgroundMusicOscillators.forEach(osc => {
                try { osc.stop(); } catch(e) {}
            });
            backgroundMusicOscillators = [];
            if (musicLoopTimeout) clearTimeout(musicLoopTimeout);
        }

        function init() {
            scene = new THREE.Scene(); 
            
            // Initialize all manager systems
            playerStateManager = new PlayerStateManager();
            inputManager = new InputManager();
            audioManager = new AudioManager();
            animationManager = new AnimationManager(scene);
            playerStatsManager = new PlayerStatsManager();
            abilityManager = new AbilityManager();
            settingsManager = new SettingsManager();
            playerEventSystem = new PlayerEventSystem();
            
            // Load saved preferences
            inputManager.loadKeybinds();
            playerStatsManager.loadFromStorage();
            
            // Setup stats observers for UI updates
            playerStatsManager.subscribe('hp', (newVal, oldVal) => {
                playerStateManager.updateHealthBar();
                if (newVal < oldVal) {
                    playerEventSystem.emitDamage(oldVal - newVal);
                }
            });
            playerStatsManager.subscribe('mana', () => playerStateManager.updateManaBar());
            playerStatsManager.subscribe('stamina', () => playerStateManager.updateStaminaBar());
            
            // Setup ability cooldown UI observers
            for (const ability of Object.keys(abilityManager._cooldowns)) {
                abilityManager.subscribeToCooldown(ability, (cooldownData) => {
                    // Update UI cooldown overlay here
                    logGame(`${ability} cooldown: ${cooldownData.remaining.toFixed(0)}ms`, 'GAME');
                });
            }
            
            // Background semplice per performance
            scene.background = new THREE.Color(0x2a2a3a);
            scene.fog = new THREE.Fog(0x2a2a3a, 150, 600); // Fog più aggressiva per nascondere pop-in
            
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
            createPlayer(); createSword(); createStaff(); createShield(); createBow();
            
            // Luci ottimizzate per FPS - ridotte al minimo
            const ambientLight = new THREE.AmbientLight(0x888899, 1.2); // Solo ambient per performance
            scene.add(ambientLight);
            
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
            dirLight.position.set(150, 250, 100);
            dirLight.castShadow = false; // Ombre disabilitate per FPS
            scene.add(dirLight);
            
            seed = WORLD_SEED; setupWorld(); setupControls(); setupUIEvents();
            renderer = new THREE.WebGLRenderer({ 
                antialias: false,
                powerPreference: 'high-performance',
                precision: 'mediump',
                alpha: false,
                stencil: false
            }); 
            renderer.setPixelRatio(1);
            renderer.setSize(window.innerWidth, window.innerHeight); 
            renderer.shadowMap.enabled = false;
            renderer.sortObjects = false;
            
            // Compatibilità con versioni diverse di THREE.js
            if (THREE.REVISION >= 150) {
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.0;
            } else {
                renderer.gammaOutput = true;
                renderer.gammaFactor = 2.2;
            }
            console.log('[RENDERER] THREE.js r' + THREE.REVISION + ' inizializzato');
            renderer.domElement.style.position = 'fixed';
            renderer.domElement.style.top = '0';
            renderer.domElement.style.left = '0';
            renderer.domElement.style.zIndex = '1';
            document.body.appendChild(renderer.domElement); 
            window.addEventListener('resize', () => { 
                camera.aspect = window.innerWidth/window.innerHeight; 
                camera.updateProjectionMatrix(); 
                renderer.setSize(window.innerWidth, window.innerHeight); 
            });
            checkLogin(); toggleWeapon(true); updateActionBarUI(); initKeybindsUI(); 
            
            // Sync player state with managers from menu globals
            if (typeof window.myUsername !== 'undefined') {
                myUsername = window.myUsername;
                playerStateManager.myUsername = myUsername;
            }
            if (typeof window.myGameMode !== 'undefined') {
                myGameMode = window.myGameMode;
                playerStateManager.myGameMode = myGameMode;
            }
            if (typeof window.myTeamColor !== 'undefined') {
                myTeamColor = window.myTeamColor;
                playerStateManager.myTeamColor = myTeamColor;
                console.log('[INIT] Synced myTeamColor:', myTeamColor.toString(16));
                updatePlayerColor(); // Aggiorna il colore del player dopo la sincronizzazione
            }
            if (typeof window.myTeam !== 'undefined') {
                myTeam = window.myTeam;
                playerStateManager.myTeam = myTeam;
                console.log('[INIT] Synced myTeam:', myTeam);
                // Aggiorna il scoreboard quando la squadra è sincronizzata
                playerStateManager.updateKillCounter();
            }
            if (typeof window.isPvEMode !== 'undefined') {
                isPvEMode = window.isPvEMode;
                console.log("init(): isPvEMode sincronizzata a", isPvEMode);
            }
            
            // Inizializza il mostro PvE se in modalità PvE
            if (isPvEMode) {
                console.log("init(): Creazione mostro PvE...");
                createAIMonster();
            }
            
            // Ferma la musica del menu quando il gioco inizia
            stopBackgroundMusic();
            
            // Inizializza la posizione della camera prima di iniziare il loop
            if (typeof updateCamera === 'function' && playerMesh) {
                console.log('[INIT] Initializing camera position for player');
                updateCamera();
            }
            
            animate();
        }

        

        

        

        
        
        
        
        
        

        
        
        
        
        

        
        
        
        
        
        
        
        

        
        
        
        

        

        
        

        
        
        
        
        
        
        
        
        window.performConversion = performConversion;
        
        
        
        
        
        function updateActionBarUI() { document.querySelectorAll('.action-slot').forEach(el => el.classList.remove('active')); if (weaponMode === 'ranged') document.getElementById(`slot-${currentSpell}`).classList.add('active'); else if (weaponMode === 'melee') document.getElementById('slot-q').classList.add('active'); else if (weaponMode === 'bow') document.getElementById('slot-e').classList.add('active'); }
        function updateStaffColor(id) { if(!staffContainer || !staffContainer.userData.gem) return; const colors = [0xffffff, 0x00ffff, 0xffffff, 0xff6600, 0xaa00ff]; staffContainer.userData.gem.material.color.setHex(colors[id]); }
        function getStaffTip() { const vec = new THREE.Vector3(); if(staffContainer?.userData.gem) staffContainer.userData.gem.getWorldPosition(vec); else vec.copy(playerMesh.position).add(new THREE.Vector3(0,5,0)); return vec; }
        
        

        

        

        
        
        
        
        

        
        
        function startBlocking() {
            if (weaponMode !== 'melee' || isBlocking || playerStats.stamina < 5) return;
            isBlocking = true;
            document.getElementById('block-text').style.display = 'block';
            if (socket) socket.emit('playerBlock', true);
        }
        function stopBlocking() {
            if (!isBlocking) return;
            isBlocking = false;
            document.getElementById('block-text').style.display = 'none';
            if (socket) socket.emit('playerBlock', false);
        }

        

        
        
        function addToLog(msg, typeClass) { const log = document.getElementById('log'); const entry = document.createElement('div'); entry.className = 'log-entry ' + (typeClass || ''); entry.innerText = msg; log.prepend(entry); if(log.children.length > 8) log.lastChild.remove(); }
        
        function respawnPlayer() {
            // Track death for statistics
            matchStats.deaths++;
            isSpectating = false;
            spectateTarget = null;
            
            // Resetta le statistiche del giocatore
            playerStats.hp = playerStats.maxHp;
            playerStats.mana = playerStats.maxMana;
            playerStats.stamina = playerStats.maxStamina;
            playerStats.isDead = false;
            playerStats.isFalling = false;
            
            // Determina la posizione di respawn in base alla modalità
            let spawnPos = getSpawnPosition();
            playerMesh.position.copy(spawnPos);
            velocity.set(0, 0, 0);
            
            // IMPORTANTE: Ricrea il giocatore con il colore di squadra corretto
            // Questo evita i bug di armatura visibile durante il respawn
            if (typeof createPlayer === 'function') {
                // Rimuovi il vecchio mesh
                try { scene.remove(playerMesh); } catch (e) {}
                // Ricrea il giocatore con il colore squadra corrente
                createPlayer();
            }
            
            // Resetta tutti i flag di movimento
            moveForward = false;
            moveBackward = false;
            moveLeft = false;
            moveRight = false;
            isSprinting = false;
            canJump = true;
            
            // Resetta lo stato di combattimento
            isAttacking = false;
            attackTimer = 0;
            isBlocking = false;
            
            // NUOVO: Resetta il weaponMode e aggiorna la grafica
            weaponMode = 'ranged';
            currentSpell = 1;
            
            // Forza nascondere tutti gli weapon containers
            swordContainer.visible = false;
            staffContainer.visible = true;
            bowContainer.visible = false;
            
            toggleWeapon(true); // Aggiorna la visualizzazione delle armi
            updateActionBarUI(); // Aggiorna la UI della action bar
            
            // Mostra il messaggio
            document.getElementById('message').style.display = 'none';
            
            console.log('[CLIENT] respawnPlayer - recreated with team color:', window.myTeamColor?.toString(16), 'isDead:', playerStats.isDead);
            
            // Notifica il server del respawn e richiedi lo stato aggiornato di tutti i player
            if (socket && socket.connected) {
                socket.emit('playerRespawned', {
                    position: playerMesh.position,
                    rotation: playerMesh.rotation,
                    hp: playerStats.hp,
                    isDead: false // ESPLICITA che NON siamo più morti
                });
                socket.emit('requestPosition'); // Richiedi posizioni aggiornate
            }
            
            // Aggiorna l'UI
            updateUI();
            
            addToLog('You respawned!', 'heal');
            
            // Riattiva il pointer lock
            setTimeout(() => {
                try {
                    const promise = document.body.requestPointerLock();
                    if (promise && typeof promise.catch === 'function') {
                        promise.catch(e => console.log('Pointer lock non attivato'));
                    }
                } catch(e) {
                    console.log('Errore pointer lock:', e);
                }
            }, 100);
        }
        
        // Esponi respawnPlayer globalmente per poterla chiamare da socketHandlers
        window.respawnPlayer = respawnPlayer;
        
        // Ottieni la posizione di spawn per la squadra
        function getSpawnPosition() {
            const team = window.myTeam;
            
            if (team && WORLD_CONFIG.SPAWN_ZONES[team]) {
                // Spawn nelle zone colorate per le squadre (da WORLD_CONFIG)
                const spawnZone = WORLD_CONFIG.SPAWN_ZONES[team];
                const spawn = spawnZone.center;
                
                // Aggiungi variazione casuale entro il variance della zona
                const offsetX = (Math.random() - 0.5) * spawnZone.variance;
                const offsetZ = (Math.random() - 0.5) * spawnZone.variance;
                return new THREE.Vector3(spawn.x + offsetX, spawn.y, spawn.z + offsetZ);
            }
            
            // Fallback: spawn al centro se squadra non definita (da WORLD_CONFIG)
            const defaultSpawn = WORLD_CONFIG.DEFAULT_SPAWN;
            return new THREE.Vector3(defaultSpawn.x, defaultSpawn.y, defaultSpawn.z);
        }
        
        function setupUIEvents() {
            document.getElementById('reset-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                e.target.blur(); // Rimuovi focus dal pulsante
                respawnPlayer(); 
            });
            document.getElementById('keybinds-btn').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                console.log('TASTI button clicked');
                // Chiudi TUTTI gli altri modali
                const gamemodal = document.getElementById('gamemode-modal');
                const loginmodal = document.getElementById('login-modal');
                const keybindsPanel = document.getElementById('keybinds-panel');
                
                if(gamemodal) gamemodal.style.display='none';
                if(loginmodal) loginmodal.style.display='none';
                
                // Apri il pannello tasti
                if(keybindsPanel) {
                    keybindsPanel.style.display='block';
                    console.log('Keybinds panel opened');
                    initKeybindsUI();
                }
                document.exitPointerLock(); 
            });
            document.getElementById('audio-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleAudio(); });
            
            // NUOVO: Fullscreen button handler
            document.getElementById('fullscreen-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFullscreen();
            });
            
            // Team selection button handler
            document.getElementById('team-select-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Rilascia il pointer lock
                if (document.pointerLockElement === document.body) {
                    document.exitPointerLock();
                }
                
                // Mostra la schermata di selezione squadra
                const teamSelectionScreen = document.getElementById('team-selection-screen');
                if (teamSelectionScreen) {
                    teamSelectionScreen.style.display = 'flex';
                }
                
                // Reinizializza e mostra la selezione squadra
                if (window.reinitializeTeamSelection) {
                    window.reinitializeTeamSelection();
                }
            });
            
            document.getElementById('close-keybinds').addEventListener('click', (e) => { 
                e.stopPropagation(); 
                const keybindsPanel = document.getElementById('keybinds-panel');
                if (keybindsPanel) {
                    keybindsPanel.style.display = 'none';
                }
                
                // Riattiva il pointer lock solo se il menu principale è nascosto (gioco attivo)
                const mainMenu = document.getElementById('main-menu');
                const isInMenu = mainMenu && mainMenu.style.display !== 'none';
                
                if (!isInMenu) {
                    setTimeout(() => {
                        try {
                            const promise = document.body.requestPointerLock();
                            if (promise && typeof promise.catch === 'function') {
                                promise.catch(err => console.log('Pointer lock non attivato'));
                            }
                        } catch(e) {
                            console.log('Errore pointer lock:', e);
                        }
                    }, 100);
                }
            });
        }
        function setupControls() {
            document.addEventListener('pointerlockchange', () => { 
                // Non fare nulla quando perdi il pointer lock - mantieni il gioco attivo
            });
            document.addEventListener('keydown', (e) => {
                // Se la chat è attiva, ignora tutti i comandi tranne Enter per aprire la chat
                if (isChatFocused) return;
                
                // Enter per aprire la chat
                if (e.code === 'Enter') {
                    chatInput.focus();
                    return;
                }
                
                // Previeni chiusura browser con Ctrl+W
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
                    e.preventDefault();
                }
                
                // Blocca Alt sinistro e destro dal far uscire il cursore
                if (e.code === 'AltLeft' || e.code === 'AltRight') {
                    e.preventDefault();
                    return;
                }
                
                // Gestione Ctrl per free mouse (ALT rimosso)
                if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                    if (!isCtrlPressed) { // Previeni attivazione multipla
                        isCtrlPressed = true;
                        // Update freelook button
                        const btn = document.getElementById('freelook-button');
                        if (btn) btn.classList.add('active');
                        // Esci dal pointer lock per permettere il movimento del mouse
                        if (document.pointerLockElement === document.body) {
                            document.exitPointerLock();
                        }
                    }
                    return;
                }
                
                if (keyToRebind || playerStats.isDead) return; 
                switch(e.code) {
                    case KEYBINDS.MOVE_FORWARD: moveForward=true; break; case KEYBINDS.MOVE_LEFT: moveLeft=true; break; case KEYBINDS.MOVE_BACKWARD: moveBackward=true; break; case KEYBINDS.MOVE_RIGHT: moveRight=true; break;
                    case KEYBINDS.JUMP: 
                        const now = performance.now();
                        if(canJump && (now - lastJumpTime > GAME_CONFIG.SPELL_PARAMS.JUMP_COOLDOWN) && playerStats.stamina >= GAME_CONFIG.SPELL_PARAMS.JUMP_COST) {
                            velocity.y += GAME_CONFIG.SPELL_PARAMS.JUMP_FORCE; playerStats.stamina -= GAME_CONFIG.SPELL_PARAMS.JUMP_COST; lastJumpTime = now; canJump = false;
                        }
                        break;
                    case KEYBINDS.SPRINT: isSprinting=true; break; 
                    case KEYBINDS.WEAPON_SWITCH: 
                        // Se sono già in Melee, faccio il Whirlwind
                        if (weaponMode === 'melee') { 
                            performWhirlwind(); 
                        } else { 
                            // Altrimenti passo alla modalità Melee
                            weaponMode = 'melee'; 
                            toggleWeapon(true);
                            updateActionBarUI();
                        } 
                        break;
                    case KEYBINDS.BOW_EQUIP:
                        // Select Bow directly
                        if (weaponMode !== 'bow') { weaponMode = 'bow'; toggleWeapon(true); updateActionBarUI(); }
                        break;
                    case KEYBINDS.HEAL: performHeal(); break;
                    case 84: // T key - Toggle spectator (when dead)
                        if (playerStats.isDead) toggleSpectator();
                        break;
                    case 188: // < key - Previous spectate target
                        if (isSpectating) cycleSpectate(-1);
                        break;
                    case 190: // > key - Next spectate target
                        if (isSpectating) cycleSpectate(1);
                        break;
                    case 72: // H key - Show match history
                        showMatchStats();
                        break;
                    // Gestione dinamica dei keybind per spell e conversioni
                    default:
                        // Controlla tutti i keybind configurati
                        for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                            if (e.code === keyCode) {
                                if (action === 'SPELL_1') { selectSpell(1); startCasting(1, 'attack', keyCode); }
                                else if (action === 'SPELL_2') { selectSpell(2); startCasting(2, 'attack', keyCode); }
                                else if (action === 'SPELL_3') { selectSpell(3); startCasting(3, 'attack', keyCode); }
                                else if (action === 'SPELL_4') { selectSpell(4); startCasting(4, 'attack', keyCode); }
                                else if (action === 'CONVERT_1') performConversion(1);
                                else if (action === 'CONVERT_2') performConversion(2);
                                else if (action === 'CONVERT_3') performConversion(3);
                                return;
                            }
                        }
                        break;
                }
            });
            document.addEventListener('keyup', (e) => {
                // Gestione rilascio Ctrl (ALT rimosso)
                if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                    if (isCtrlPressed) { // Solo se era effettivamente premuto
                        isCtrlPressed = false;
                        // Update freelook button
                        const btn = document.getElementById('freelook-button');
                        if (btn) btn.classList.remove('active');
                        // Rientra nel pointer lock se il giocatore non è morto
                        const mainMenu = document.getElementById('main-menu');
                        const keybindsPanel = document.getElementById('keybinds-panel');
                        const isMenuVisible = mainMenu && mainMenu.style.display !== 'none';
                        const isPanelVisible = keybindsPanel && keybindsPanel.style.display === 'block';
                        
                        if (!playerStats.isDead && document.pointerLockElement !== document.body && !isMenuVisible && !isPanelVisible) {
                            setTimeout(() => {
                                if (!isCtrlPressed && !playerStats.isDead && document.pointerLockElement !== document.body) {
                                    try {
                                        document.body.requestPointerLock();
                                    } catch(err) {
                                        console.log('Pointer lock error:', err);
                                    }
                                }
                            }, 150);
                        }
                    }
                    return;
                }
                
                if(keyToRebind || playerStats.isDead) return;
                switch(e.code) { 
                    case KEYBINDS.MOVE_FORWARD: moveForward=false; break; 
                    case KEYBINDS.MOVE_LEFT: moveLeft=false; break; 
                    case KEYBINDS.MOVE_BACKWARD: moveBackward=false; break; 
                    case KEYBINDS.MOVE_RIGHT: moveRight=false; break; 
                    case KEYBINDS.SPRINT: isSprinting=false; break; 
                    default:
                        // Gestione dinamica per spell
                        for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                            if (e.code === keyCode && action.startsWith('SPELL_')) {
                                stopCasting(keyCode);
                                return;
                            }
                        }
                        break;
                }
            });
            document.body.addEventListener('mousemove', (e) => { if(document.pointerLockElement===document.body && !playerStats.isDead) { euler.y-=e.movementX*0.002*mouseSensitivity; euler.x-=e.movementY*0.002*mouseSensitivity; euler.x=Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x)); playerMesh.rotation.y=euler.y; } });
            
            document.addEventListener('mousedown', (e) => { 
                if(document.pointerLockElement===document.body && !playerStats.isDead) {
                    // Gestisci mouse button bindati
                    const mouseButtonCode = e.button === 3 ? 'MouseButton3' : (e.button === 4 ? 'MouseButton4' : null);
                    
                    if (mouseButtonCode) {
                        // Controlla quale comando è bindato a questo mouse button
                        for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                            if (keyCode === mouseButtonCode) {
                                // Esegui l'azione corrispondente
                                if (action === 'SPELL_1') selectSpell(1), startCasting(1, 'attack', mouseButtonCode);
                                else if (action === 'SPELL_2') selectSpell(2), startCasting(2, 'attack', mouseButtonCode);
                                else if (action === 'SPELL_3') selectSpell(3), startCasting(3, 'attack', mouseButtonCode);
                                else if (action === 'SPELL_4') selectSpell(4), startCasting(4, 'attack', mouseButtonCode);
                                else if (action === 'WEAPON_SWITCH') {
                                    if (weaponMode === 'melee') { performWhirlwind(); } 
                                    else { weaponMode = 'melee'; toggleWeapon(true); }
                                }
                                else if (action === 'BOW_EQUIP') { if (weaponMode !== 'bow') { weaponMode = 'bow'; toggleWeapon(true); updateActionBarUI(); } }
                                else if (action === 'HEAL') performHeal();
                                else if (action === 'CONVERT_1') performConversion(1);
                                else if (action === 'CONVERT_2') performConversion(2);
                                else if (action === 'CONVERT_3') performConversion(3);
                                return;
                            }
                        }
                    }
                    
                    // Gestisci mouse button standard (non bindati)
                    if (e.button === 0) { 
                        if (weaponMode === 'ranged') { startCasting(currentSpell, 'attack', 'Mouse'); }
                        else if (weaponMode === 'bow') { startCasting(null, 'bow_shot', 'Mouse'); }
                        else { performAttack(); } 
                    } else if (e.button === 2) { 
                        if (weaponMode === 'ranged' || weaponMode === 'bow') { 
                            weaponMode = 'melee'; toggleWeapon(true); // Auto-switch to Melee on block attempt
                        }
                        startBlocking();
                    }
                } 
            });
            document.addEventListener('mouseup', (e) => { 
                if (!playerStats.isDead) {
                    // Gestisci mouse button bindati
                    const mouseButtonCode = e.button === 3 ? 'MouseButton3' : (e.button === 4 ? 'MouseButton4' : null);
                    
                    if (mouseButtonCode) {
                        for (const [action, keyCode] of Object.entries(KEYBINDS)) {
                            if (keyCode === mouseButtonCode) {
                                // Ferma le azioni che vanno fermate
                                if (action.startsWith('SPELL_')) stopCasting(mouseButtonCode);
                                return;
                            }
                        }
                    }
                    
                    // Gestisci mouse button standard
                    if (e.button === 0) {
                         if(weaponMode === 'ranged') stopCasting('Mouse');
                         if(weaponMode === 'bow') stopCasting('Mouse');
                    }
                    if (e.button === 2) stopBlocking();
                }
            });
        }
        function resetGame() { 
            saveMatchStats();
            location.reload(); 
        }
        
        // Lag Compensation - Client-side prediction
        function updatePositionBuffer(playerId, position, timestamp) {
            if (!positionBuffer[playerId]) positionBuffer[playerId] = [];
            positionBuffer[playerId].push({ pos: position.clone(), time: timestamp });
            // Keep only last 500ms of positions
            const cutoff = Date.now() - 500;
            positionBuffer[playerId] = positionBuffer[playerId].filter(p => p.time > cutoff);
        }
        
        function interpolatePosition(playerId) {
            const buffer = positionBuffer[playerId];
            if (!buffer || buffer.length < 2) return null;
            
            const renderTime = Date.now() - INTERPOLATION_DELAY;
            let i = 0;
            while (i < buffer.length - 1 && buffer[i + 1].time <= renderTime) i++;
            
            if (i >= buffer.length - 1) return buffer[buffer.length - 1].pos;
            
            const p1 = buffer[i], p2 = buffer[i + 1];
            const t = (renderTime - p1.time) / (p2.time - p1.time);
            return p1.pos.clone().lerp(p2.pos, t);
        }
        
        // LOD System
        function updateLOD() {
            if (!playerMesh || !camera) return;
            lodObjects.forEach(obj => {
                const dist = obj.position.distanceTo(camera.position);
                if (dist < LOD_DISTANCES.HIGH) {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = true;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = false;
                } else if (dist < LOD_DISTANCES.MEDIUM) {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = false;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = true;
                } else {
                    if (obj.userData.highDetail) obj.userData.highDetail.visible = false;
                    if (obj.userData.lowDetail) obj.userData.lowDetail.visible = false;
                }
            });
        }
        
        // Spectator Mode
        function toggleSpectator() {
            if (!playerStats.isDead) return;
            isSpectating = !isSpectating;
            if (isSpectating) {
                const players = Object.values(otherPlayers);
                if (players.length > 0) {
                    spectateIndex = 0;
                    spectateTarget = players[0];
                    showFloatingText('SPECTATING: ' + spectateTarget.mesh.userData.username, camera.position, 0xffffff, 2000);
                }
            }
        }
        
        function cycleSpectate(direction) {
            if (!isSpectating) return;
            const players = Object.values(otherPlayers).filter(p => !p.isDead);
            if (players.length === 0) return;
            spectateIndex = (spectateIndex + direction + players.length) % players.length;
            spectateTarget = players[spectateIndex];
            showFloatingText('SPECTATING: ' + spectateTarget.mesh.userData.username, camera.position, 0xffffff, 1500);
        }
        
        // Match Statistics
        function saveMatchStats() {
            const duration = Math.floor((Date.now() - matchStats.startTime) / 1000);
            const kd = matchStats.deaths > 0 ? (matchStats.kills / matchStats.deaths).toFixed(2) : matchStats.kills;
            const acc = matchStats.accuracy.shots > 0 ? ((matchStats.accuracy.hits / matchStats.accuracy.shots) * 100).toFixed(1) : 0;
            
            const match = {
                date: new Date().toISOString(),
                duration: duration,
                kills: matchStats.kills,
                deaths: matchStats.deaths,
                kd: kd,
                damage: matchStats.damage,
                healing: matchStats.healing,
                accuracy: acc + '%',
                team: myTeam
            };
            
            matchStats.matchHistory.unshift(match);
            if (matchStats.matchHistory.length > 50) matchStats.matchHistory.pop();
            localStorage.setItem('ragequit_match_history', JSON.stringify(matchStats.matchHistory));
        }
        
        function showMatchStats() {
            console.log('=== MATCH STATISTICS ===');
            console.log('K/D:', matchStats.kills + '/' + matchStats.deaths);
            console.log('Damage:', matchStats.damage);
            console.log('Healing:', matchStats.healing);
            console.log('Accuracy:', matchStats.accuracy.shots > 0 ? ((matchStats.accuracy.hits / matchStats.accuracy.shots) * 100).toFixed(1) + '%' : '0%');
            console.log('Match History (last 10):');
            matchStats.matchHistory.slice(0, 10).forEach((m, i) => {
                console.log(`${i+1}. ${m.date} | K/D: ${m.kd} | Acc: ${m.accuracy} | Duration: ${m.duration}s`);
            });
        }
        function updateUI() {
            document.getElementById('hp-bar').style.width = `${playerStats.hp}%`; 
            document.getElementById('mana-bar').style.width = `${playerStats.mana}%`; 
            document.getElementById('stamina-bar').style.width = `${playerStats.stamina}%`;
            
            document.getElementById('hp-value').textContent = `${Math.round(playerStats.hp)}/${playerStats.maxHp}`;
            document.getElementById('mana-value').textContent = `${Math.round(playerStats.mana)}/${playerStats.maxMana}`;
            document.getElementById('stamina-value').textContent = `${Math.round(playerStats.stamina)}/${playerStats.maxStamina}`;
            
            const now = performance.now();
            const gcdProgress = Math.max(0, (GAME_CONFIG.SPELL_PARAMS.MISSILE_COOLDOWN - (now - lastAttackTime)) / GAME_CONFIG.SPELL_PARAMS.MISSILE_COOLDOWN);
            if (weaponMode === 'ranged') { for(let i=1; i<=4; i++) { const el = document.querySelector(`#slot-${i} .cooldown-overlay`); if(el) el.style.height = (gcdProgress * 100) + '%'; } }
            const wwProgress = Math.max(0, (GAME_CONFIG.SPELL_PARAMS.WHIRLWIND_COOLDOWN - (now - lastWhirlwindTime)) / GAME_CONFIG.SPELL_PARAMS.WHIRLWIND_COOLDOWN);
            const wwOverlay = document.querySelector('#slot-q .cooldown-overlay'); if(wwOverlay) wwOverlay.style.height = (wwProgress * 100) + '%';
            const spikesProgress = Math.max(0, (GAME_CONFIG.SPELL_PARAMS.IMPALE_COOLDOWN - (now - lastSpikesTime)) / GAME_CONFIG.SPELL_PARAMS.IMPALE_COOLDOWN);
            const spikesOverlay = document.getElementById('spikes-cd'); if(spikesOverlay) spikesOverlay.style.height = (spikesProgress * 100) + '%';
            const healProgress = Math.max(0, (GAME_CONFIG.SPELL_PARAMS.HEAL_COOLDOWN - (now - lastHealTime)) / GAME_CONFIG.SPELL_PARAMS.HEAL_COOLDOWN);
            const healOverlay = document.getElementById('heal-cd'); if(healOverlay) healOverlay.style.height = (healProgress * 100) + '%';
            const convProgress = Math.max(0, (GAME_CONFIG.SPELL_PARAMS.CONVERSION_COOLDOWN - (now - lastConversionTime)) / GAME_CONFIG.SPELL_PARAMS.CONVERSION_COOLDOWN);
            ['conv1-cd', 'conv2-cd', 'conv3-cd'].forEach(id => { const el = document.getElementById(id); if(el) el.style.height = (convProgress * 100) + '%'; });
        }
        function animate() {
            requestAnimationFrame(animate);
            const time = performance.now(); const delta = (time - prevTime) / 1000; prevTime = time;
            
            // FPS Counter
            fpsFrames++;
            if (time - fpsLastTime >= 1000) {
                currentFPS = fpsFrames;
                fpsFrames = 0;
                fpsLastTime = time;
                document.getElementById('fps-counter').innerText = 'FPS: ' + currentFPS;
            }
            
            // Spectator camera
            if (isSpectating && spectateTarget && spectateTarget.mesh) {
                camera.position.copy(spectateTarget.mesh.position).add(new THREE.Vector3(0, 10, 15));
                camera.lookAt(spectateTarget.mesh.position);
            }
            
            if (!playerStats.isDead && !isSpectating) { 
                // SAFETY CHECK: Assicura che playerMesh sia sempre visibile quando vivo
                if (!playerMesh.visible) {
                    console.warn('[GAME LOOP] playerMesh invisibile ma player vivo - FIXING');
                    playerMesh.visible = true;
                }
                
                try {
                    updatePhysics(delta); 
                    updateCamera(); // Moved here to fix lag
                    sendPositionUpdate(); // Invia posizione ad alta frequenza
                    updateProjectiles(delta); updateCasting(delta);
                    updateParticles(delta); // Aggiorna particelle (sangue, gibs, ecc)
                    updateConversions(delta); updateFloatingTexts(delta);
                    updateSwordAnimation(delta);
                    
                    // Aggiorna il mostro IA se in modalità PvE
                    if (isPvEMode && aiMonster) {
                        updateAIMonster(delta);
                    }
                } catch(e) { console.error(e); }
                // updateCamera(); // Previously here
            }
            
            // Update LOD every 5 frames for performance
            if (frameCount % 5 === 0) updateLOD();
            
            updateAnimations(delta); 
            frameCount++;
            if (frameCount % 2 === 0) updateUI(); // Aggiorna UI ogni 2 frame per performance
            renderer.render(scene, camera);
        }
        
        // Non inizializzare subito - aspetta che menu.js chiami startGame()
        // init();