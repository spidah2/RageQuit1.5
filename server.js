const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const GameStateManager = require('./server/GameStateManager');

// ===== CONFIGURAZIONE SOCKET.IO =====
// Rileva ambiente e configura CORS dinamicamente
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = isProduction 
    ? ['https://ragequit1-5-1.onrender.com', 'https://ragequit1-5.onrender.com']
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:3000', 'http://127.0.0.1:5500'];

// Funzione per verificare origin dynamicamente in dev
function corsOriginHandler(origin, callback) {
    if (isProduction) {
        // Production: strict origins only
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    } else {
        // Development: allow localhost and 127.0.0.1 on any port
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    }
}

const io = new Server(server, {
    cors: { 
        origin: corsOriginHandler,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 10000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    // FPS Optimizations
    maxHttpBufferSize: 1e6,       // 1MB max per message
    perMessageDeflate: false,     // Disable compression for speed
    serveClient: false            // Don't serve Socket.IO client (we load it from CDN)
});

const path = require('path');

// ===== CONFIGURAZIONE CENTRALIZZATA SERVER =====
const SERVER_CONFIG = {
    // Colori squadre - UNICA FONTE DI VERITÀ (sincronizzata con client)
    TEAM_COLORS: {
        red: 0x8B0000,
        black: 0x003300,
        green: 0x1B2F2F,
        purple: 0x550055
    },
    
    MAX_PLAYERS: 10,
    DEFAULT_HP: 100,
    DEFAULT_SPAWN: { x: 0, y: 6, z: 0 },
    HIT_VALIDATION_DISTANCE: 15  // Increased from 10 for better lag tolerance in FPS mode
};

// Variabili globali
let players = {};
let lastSeen = {};
let serverStartTime = Date.now();

// ===== GAME STATE MANAGER - CENTRALIZZATO =====
// Crea un'istanza del game state manager
const gameStateManager = new GameStateManager();

// Serviamo i file statici dalla cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// Middleware CORS per Express (aggiuntivo a Socket.IO)
app.use((req, res, next) => {
    const origin = req.get('origin');
    
    if (isProduction) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            res.header('Access-Control-Allow-Origin', origin || '*');
        }
    } else {
        // Development: permetti localhost e 127.0.0.1
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            res.header('Access-Control-Allow-Origin', origin || '*');
        }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Gestisci favicon e altri asset mancanti
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No Content
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint per Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    players: Object.keys(players).length,
    uptime: Date.now() - serverStartTime
  });
});

// ===== CONNETTI GAME STATE MANAGER A PLAYERS =====
// Questo deve accadere DOPO che players è definito ma PRIMA dei socket handlers
gameStateManager.setActivePlayers(players);
console.log('[Server] GameStateManager initialized and linked to players object');

// --- LOGICA MULTIPLAYER ORIGINALE ---

io.on('connection', (socket) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] New connection: ${socket.id} (Total: ${Object.keys(players).length + 1})`);
    console.log(`[${timestamp}] Remote address: ${socket.handshake.address}`);
    lastSeen[socket.id] = Date.now();

    socket.on('joinGame', (userData) => {
        // Reset completo del player (rimuove flag isDead)
        if (players[socket.id]) delete players[socket.id];
        
        if (Object.keys(players).length >= 10) {
            console.log(`[${new Date().toLocaleTimeString()}] Server full! Rejecting player: ${userData.username}`);
            socket.emit('serverMsg', 'Server full!');
            return;
        }

        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Player joined: ${userData.username} (ID: ${socket.id.substring(0, 8)}...)`);
        console.log(`[${timestamp}] Team: ${userData.team}, Players online: ${Object.keys(players).length + 1}`);

        players[socket.id] = {
            id: socket.id,
            username: userData.username || "Warrior",
            hp: 100,
            maxHp: 100,
            position: { x: 0, y: 6, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            animState: 'idle',
            weaponMode: 'ranged',
            isBlocking: false,
            isDead: false,
            teamColor: userData.teamColor || 0x2c3e50,
            gameMode: 'team',
            team: userData.team || null
        };

        // Debug trace: emit currentPlayers to the joining socket and broadcast newPlayer
        console.log(`TRACE: emitting currentPlayers to ${socket.id} (playersCount=${Object.keys(players).length})`);
        socket.emit('currentPlayers', players);
        
        // NUOVO: Invia i dati di kill e team al client al momento del join
        // Usa GameStateManager per ottenere match stats
        const matchStats = gameStateManager.getMatchStats();
        socket.emit('matchStats', {
            playerKills: matchStats.playerKills,
            teamKills: matchStats.teamKills
        });
        
        console.log(`TRACE: broadcasting newPlayer from ${socket.id} -> id=${players[socket.id].id}`);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        
        // Broadcast team counts
        broadcastTeamCounts();
    });
    
    socket.on('requestTeamCounts', () => {
        const counts = getTeamCounts();
        socket.emit('teamCounts', counts);
    });
    
    // Handler per cambio squadra durante il gioco
    socket.on('changeTeam', (newTeam) => {
        if (players[socket.id]) {
            const oldTeam = players[socket.id].team;
            players[socket.id].team = newTeam;
            players[socket.id].teamColor = TEAM_COLORS[newTeam] || 0x2c3e50;
            
            console.log(`Player ${socket.id} changed team: ${oldTeam} -> ${newTeam}, teamColor: ${players[socket.id].teamColor.toString(16)}`);
            
            // Notifica tutti gli altri giocatori del cambio squadra
            socket.broadcast.emit('playerTeamChanged', {
                playerId: socket.id,
                newTeam: newTeam,
                teamColor: players[socket.id].teamColor,
                playerName: players[socket.id].username
            });
            
            // Invia conferma al client
            socket.emit('teamChangeConfirmed', { team: newTeam, teamColor: players[socket.id].teamColor });
            
            // Aggiorna il conteggio squadre
            broadcastTeamCounts();
        }
    });
    
    // NUOVO: Handler per richiedere i dati di match stats
    socket.on('requestMatchStats', () => {
        const matchStats = gameStateManager.getMatchStats();
        socket.emit('matchStats', {
            playerKills: matchStats.playerKills,
            teamKills: matchStats.teamKills
        });
    });
    
    // Ping handler
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp);
    });
    
    function getTeamCounts() {
        const counts = {red: 0, black: 0, green: 0, purple: 0};
        Object.values(players).forEach(p => {
            if (p.team && counts[p.team] !== undefined) {
                counts[p.team]++;
            }
        });
        return counts;
    }
    
    function broadcastTeamCounts() {
        const counts = getTeamCounts();
        io.emit('teamCounts', counts);
    }
    
    socket.on('requestPosition', () => {
        socket.broadcast.emit('forcePositionUpdate');
    });

    socket.on('updateUsername', (username) => {
        if(players[socket.id]) {
            players[socket.id].username = username;
            io.emit('updateUsername', { id: socket.id, username: username });
        }
    });
    
    socket.on('chatMessage', (data) => {
        if (players[socket.id]) {
            // Broadcast messaggio a tutti
            io.emit('chatMessage', {
                id: socket.id,
                username: data.username || players[socket.id].username,
                text: data.text
            });
        }
    });

    socket.on('updateTeamColor', (data) => {
        if(players[socket.id]) {
            players[socket.id].teamColor = data.teamColor;
            io.emit('playerTeamColorChanged', { id: socket.id, teamColor: data.teamColor });
        }
    });

    socket.on('playerMovement', (data) => {
        const now = Date.now();
        lastSeen[socket.id] = now;
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            players[socket.id].animState = data.animState;
            players[socket.id].weaponMode = data.weaponMode;
            players[socket.id].lastUpdate = now; // Timestamp per lag compensation
            
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                timestamp: now, // Invia timestamp server
                ...data
            });
        }
    });

    socket.on('playerBlock', (isBlocking) => {
        if (players[socket.id]) {
            players[socket.id].isBlocking = isBlocking;
            socket.broadcast.emit('updateEnemyBlock', { id: socket.id, isBlocking: isBlocking });
        }
    });

    socket.on('remoteEffect', (data) => {
        socket.broadcast.emit('remoteEffect', { id: socket.id, ...data });
    });

    socket.on('playerAttack', (attackData) => {
        socket.broadcast.emit('enemyAttacked', {
            id: socket.id,
            ...attackData
        });
    });

    socket.on('playerPushed', (pushData) => {
        const targetId = pushData.targetId;
        
        // Usa GameStateManager per applicare danno da push (se presente)
        let pushResult = null;
        if (pushData.damage && pushData.damage > 0) {
            pushResult = gameStateManager.validateAndApplyHit(
                socket.id,
                targetId,
                { damage: pushData.damage, hitPosition: players[targetId]?.position }
            );
        } else {
            // Push senza danno - solo knockback
            pushResult = gameStateManager.applyKnockback(targetId, pushData.forceY || 300);
        }
        
        if (!pushResult || !pushResult.success) {
            return; // Push non validato, ignora
        }
        
        // Emit to the target player so they can execute the push effect
        io.to(targetId).emit('playerPushed', {
            forceY: pushData.forceY, 
            forceVec: pushData.forceVec, 
            pushOrigin: pushData.pushOrigin
        });
        
        // Se c'era danno, propaga gli effetti
        if (pushData.damage && pushData.damage > 0) {
            const actualDamage = pushResult.damage || pushData.damage;
            const targetHp = pushResult.targetHp || players[targetId].hp;
            
            // Emit health update and damage effect to all players
            io.emit('updateHealth', { id: targetId, hp: targetHp });
            if (actualDamage > 0) {
                io.emit('remoteDamageTaken', { id: targetId });
            }

            // Se è un kill, propaga e aggiorna stats
            if (pushResult.killConfirmed) {
                console.log(`[SERVER] ${socket.id} killed ${targetId} (PUSH) - broadcasting death event`);
                
                // Broadcast morte a TUTTI i client immediatamente
                io.emit('playerDied', { 
                    id: targetId, 
                    killerId: socket.id,
                    position: players[targetId].position
                });
                
                // Invia aggiornamento punteggi a tutti (dal GameStateManager)
                const stats = gameStateManager.getMatchStats();
                io.emit('matchStats', {
                    playerKills: stats.playerKills,
                    teamKills: stats.teamKills
                });
            }
        }
    });

    socket.on('playerHit', (dmgData) => {
        const targetId = dmgData.targetId;
        
        // Usa GameStateManager per validare e applicare danno
        const hitResult = gameStateManager.validateAndApplyHit(
            socket.id,
            targetId,
            { damage: dmgData.damage, hitPosition: dmgData.hitPosition }
        );
        
        // Se validazione fallisce, notifica il client
        if (!hitResult.success) {
            console.log(`[HIT REJECTED] ${socket.id} -> ${targetId} (${hitResult.message})`);
            socket.emit('hitRejected', { targetId: targetId });
            return;
        }
        
        // HIT VALIDATO - Propaga gli effetti ai client
        console.log(`[HIT VALIDATED] ${socket.id} -> ${targetId} (${hitResult.damage} dmg, hp: ${hitResult.targetHp})`);
        
        // Send health update to all
        io.emit('updateHealth', { id: targetId, hp: hitResult.targetHp });
        
        // Send specific damage response to the target for local effects (like screen flash)
        io.to(targetId).emit('playerHitResponse', { damage: hitResult.damage });

        // Notify all for blood/damage effect
        if (hitResult.damage > 0) {
            io.emit('remoteDamageTaken', { id: targetId });
        }
        
        // Se è un kill, propaga e aggiorna stats
        if (hitResult.killConfirmed) {
            console.log(`[SERVER] ${socket.id} killed ${targetId} - broadcasting death event`);
            
            // Broadcast morte a TUTTI i client immediatamente
            io.emit('playerDied', { 
                id: targetId, 
                killerId: socket.id,
                position: players[targetId].position
            });
            
            // Invia aggiornamento punteggi a tutti (dal GameStateManager)
            const stats = gameStateManager.getMatchStats();
            io.emit('matchStats', {
                playerKills: stats.playerKills,
                teamKills: stats.teamKills
            });
        }
    });
    
    socket.on('playerHealed', (healData) => {
        // IMPORTANTE: playerHealed deve applicare SOLO al player che la invia, non agli avversari
        // Usa GameStateManager per applicare cura
        const healResult = gameStateManager.applyHealing(socket.id, healData.amount);
        
        if (healResult.success) {
            io.emit('updateHealth', { id: socket.id, hp: healResult.newHp });
        }
    });
    
    socket.on('playerRespawned', (data) => {
        if (players[socket.id]) {
            // Reset completo stato player sul server
            players[socket.id].hp = players[socket.id].maxHp;
            players[socket.id].isDead = false;
            
            // Aggiorna posizione se fornita
            if (data && data.position) {
                players[socket.id].position = data.position;
            }
            if (data && data.rotation) {
                players[socket.id].rotation = data.rotation;
            }
            
            console.log(`[RESPAWN] ${socket.id} respawnato - team: ${players[socket.id].team}, teamColor: ${players[socket.id].teamColor}`);
            
            // Notifica tutti i client dello stato aggiornato con dati completi
            io.emit('updateHealth', { id: socket.id, hp: players[socket.id].hp });
            
            // Emit multipli per garantire sincronizzazione - INCLUDE TEAM E TEAMCOLOR
            io.emit('playerRespawned', { 
                id: socket.id,
                hp: players[socket.id].hp,
                position: players[socket.id].position,
                rotation: players[socket.id].rotation,
                team: players[socket.id].team,
                teamColor: players[socket.id].teamColor,
                username: players[socket.id].username,
                timestamp: Date.now() // Timestamp per debug
            });
            
            // Broadcast newPlayer COMPLETO per assicurare visibilità (importante per respawn ritardati)
            socket.broadcast.emit('newPlayer', players[socket.id]);
            
            // Doppio check: forza aggiornamento posizione
            setTimeout(() => {
                if (players[socket.id] && !players[socket.id].isDead) {
                    socket.broadcast.emit('updatePosition', {
                        id: socket.id,
                        position: players[socket.id].position,
                        rotation: players[socket.id].rotation
                    });
                }
            }, 100);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnesso: ' + socket.id);
        if (players[socket.id]) {
            delete players[socket.id];
            io.emit('playerDisconnected', socket.id);
            // Broadcast aggiornamento conteggio squadre
            broadcastTeamCounts();
        }
        delete lastSeen[socket.id];
    });
});

setInterval(() => {
    const now = Date.now();
    Object.keys(players).forEach(id => {
        if (lastSeen[id] && (now - lastSeen[id] > 10000)) {
            delete players[id];
            delete lastSeen[id];
            io.emit('playerDisconnected', id);
        }
    });
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n===== RAGEQUIT SERVER ONLINE =====`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    console.log(`=====================================\n`);
});

// ===== ERROR HANDLING =====
server.on('error', (err) => {
    console.error('[SERVER] Error:', err);
});

io.on('error', (err) => {
    console.error('[SOCKET.IO] Error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SERVER] SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('[SERVER] HTTP server closed');
        process.exit(0);
    });
});