const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");

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
let playerKills = {}; // Tracking dei kill per player {playerId: killCount}
let teamKills = { red: 0, black: 0, green: 0, purple: 0 }; // Tracking dei kill per team

const TEAM_COLORS = SERVER_CONFIG.TEAM_COLORS;

// Helper per calcolare distanza 3D
function distance3D(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Server-side hit detection autoritativo
function validateHit(shooterId, targetId, hitPosition) {
    const shooter = players[shooterId];
    const target = players[targetId];
    
    if (!shooter || !target || target.isDead) return false;
    
    // Verifica che il target sia abbastanza vicino alla posizione dell'hit
    const dist = distance3D(target.position, hitPosition);
    const maxHitDistance = 10; // Tolleranza massima per lag
    
    return dist <= maxHitDistance;
}

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
        socket.emit('matchStats', {
            playerKills: playerKills,
            teamKills: teamKills
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
        socket.emit('matchStats', {
            playerKills: playerKills,
            teamKills: teamKills
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
        if (players[targetId]) {
            let actualDamage = 0;
            if (pushData.damage) {
                // Assicurati che il danno sia sempre positivo
                actualDamage = Math.max(0, pushData.damage);
                players[targetId].hp -= actualDamage;
                // Clamp HP a 0 per evitare valori negativi
                players[targetId].hp = Math.max(0, players[targetId].hp);
            }
            // Emit to the target player so they can execute the push effect
            io.to(targetId).emit('playerPushed', {
                forceY: pushData.forceY, 
                forceVec: pushData.forceVec, 
                pushOrigin: pushData.pushOrigin
            });
            
            // Emit health update and damage effect to all players
            io.emit('updateHealth', { id: targetId, hp: players[targetId].hp });
            if (actualDamage > 0) {
                io.emit('remoteDamageTaken', { id: targetId }); // Notify all for blood/damage effect
            }

            if (players[targetId].hp <= 0 && !players[targetId].isDead) {
                players[targetId].isDead = true;
                console.log(`[SERVER] Player ${targetId} morto (PUSH) - broadcasting a tutti`);
                
                // Tracking kill per killer
                if (!playerKills[socket.id]) playerKills[socket.id] = 0;
                playerKills[socket.id]++;
                
                // Tracking kill per team del killer
                if (players[socket.id] && players[socket.id].team && teamKills[players[socket.id].team] !== undefined) {
                    teamKills[players[socket.id].team]++;
                }
                
                // Broadcast morte a TUTTI i client immediatamente
                io.emit('playerDied', { 
                    id: targetId, 
                    killerId: socket.id,
                    position: players[targetId].position
                });
                
                // Invia aggiornamento punteggi a tutti
                io.emit('matchStats', {
                    playerKills: playerKills,
                    teamKills: teamKills
                });
            }
        }
    });

    socket.on('playerHit', (dmgData) => {
        const targetId = dmgData.targetId;
        
        // Verifica che il target esista e non sia già morto
        if (!players[targetId] || players[targetId].isDead || players[targetId].hp <= 0) {
            console.log(`[HIT REJECTED] ${socket.id} -> ${targetId} (target morto o inesistente)`);
            socket.emit('hitRejected', { targetId: targetId });
            return;
        }
        
        // VALIDAZIONE SERVER-SIDE DELL'HIT
        if (!validateHit(socket.id, targetId, dmgData.hitPosition || players[targetId]?.position)) {
            console.log(`[HIT REJECTED] ${socket.id} -> ${targetId} (posizione non valida)`);
            // Informa il shooter che l'hit è stato respinto
            socket.emit('hitRejected', { targetId: targetId });
            return;
        }
        
        if (players[targetId]) {
            const actualDamage = Math.max(0, dmgData.damage); // Assicurati che sia positivo
            players[targetId].hp -= actualDamage;
            
            // Clamp HP a 0 per evitare valori negativi
            players[targetId].hp = Math.max(0, players[targetId].hp);
            
            console.log(`[HIT VALIDATED] ${socket.id} -> ${targetId} (${actualDamage} dmg, hp: ${players[targetId].hp})`);
            
            // Send health update to all
            io.emit('updateHealth', { id: targetId, hp: players[targetId].hp });
            
            // Send specific damage response to the target for local effects (like screen flash)
            io.to(targetId).emit('playerHitResponse', { damage: actualDamage });

            // Notify all for blood/damage effect
            if (actualDamage > 0) {
                io.emit('remoteDamageTaken', { id: targetId });
            }
            
            if (players[targetId].hp <= 0 && !players[targetId].isDead) {
                players[targetId].isDead = true;
                console.log(`[SERVER] Player ${targetId} morto (HIT) - broadcasting a tutti`);
                
                // Tracking kill per killer
                if (!playerKills[socket.id]) playerKills[socket.id] = 0;
                playerKills[socket.id]++;
                
                // Tracking kill per team del killer
                if (players[socket.id] && players[socket.id].team && teamKills[players[socket.id].team] !== undefined) {
                    teamKills[players[socket.id].team]++;
                }
                
                // Broadcast morte a TUTTI i client immediatamente
                io.emit('playerDied', { 
                    id: targetId, 
                    killerId: socket.id,
                    position: players[targetId].position
                });
                
                // Invia aggiornamento punteggi a tutti
                io.emit('matchStats', {
                    playerKills: playerKills,
                    teamKills: teamKills
                });
            }
        }
    });
    
    socket.on('playerHealed', (healData) => {
        // IMPORTANTE: playerHealed deve applicare SOLO al player che la invia, non agli avversari
        if (players[socket.id]) {
            const healAmount = Math.max(0, healData.amount || 0);
            players[socket.id].hp = Math.min(players[socket.id].maxHp, players[socket.id].hp + healAmount);
            io.emit('updateHealth', { id: socket.id, hp: players[socket.id].hp });
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