// network.js - Multiplayer Network Management
// Gestisce socket.io, connessioni, e sincronizzazione giocatori
// REFACTORED: Usa socketHandlers.js per mantenere i listener organizzati

// ===== VARIABLES (condivise con game.js) =====
// NOTA: socket, otherPlayers, myId, currentPing sono dichiarate in game.js
// Questo file le userà direttamente come variabili globali

// ===== POSITION UPDATES =====
let lastPositionSent = Date.now();
let lastSentPos = { x: 0, y: 0, z: 0 };
let lastSentRot = { x: 0, y: 0, z: 0 };

/**
 * Invia aggiornamento posizione giocatore al server
 * Ottimizzato per non inviare ogni frame + delta compression
 */
function sendPositionUpdate() {
    const now = Date.now();
    const POSITION_UPDATE_RATE = 30; // Reduced from 50ms for faster responsiveness (33 updates/sec)
    if (socket && socket.connected && playerMesh && !playerStats.isDead) {
        if (now - lastPositionSent >= POSITION_UPDATE_RATE) {
            // Only send if position changed significantly (delta compression)
            const posChanged = Math.abs(playerMesh.position.x - lastSentPos.x) > 0.5 ||
                             Math.abs(playerMesh.position.y - lastSentPos.y) > 0.5 ||
                             Math.abs(playerMesh.position.z - lastSentPos.z) > 0.5;
            const rotChanged = Math.abs(playerMesh.rotation.y - lastSentRot.y) > 0.05;
            
            if (posChanged || rotChanged) {
                const animState = isSprinting ? 'run' : (moveForward || moveBackward || moveLeft || moveRight) ? 'walk' : 'idle';
                socket.emit('playerMovement', {
                    position: playerMesh.position,
                    rotation: { x: playerMesh.rotation.x, y: playerMesh.rotation.y, z: playerMesh.rotation.z },
                    animState: animState,
                    weaponMode: weaponMode,
                    velocity: velocity
                });
                lastSentPos = { x: playerMesh.position.x, y: playerMesh.position.y, z: playerMesh.position.z };
                lastSentRot = { x: playerMesh.rotation.x, y: playerMesh.rotation.y, z: playerMesh.rotation.z };
                lastPositionSent = now;
            } else {
                lastPositionSent = now; // Update timer anyway
            }
        }
    }
}

/**
 * Inizializza il multiplayer
 * Crea socket e registra tutti gli event listener
 */
function initMultiplayer() {
    if (typeof io === 'undefined') {
        logGame('Socket.IO not available - Offline mode', 'NETWORK', 'WARNING');
        document.getElementById('connection-status').innerText = "OFFLINE";
        return;
    }

    // Previeni inizializzazioni duplicate
    if (typeof socket !== 'undefined' && socket && socket.connected) {
        logGame('initMultiplayer called but socket already connected', 'NETWORK');
        return;
    }

    socket = createGameSocket();

    // Gestione connessione iniziale
    socket.on('connect', () => {
        logGame(`Connected. Socket ID: ${socket.id}`, 'NETWORK');
        document.getElementById('connection-status').innerText = "CONNESSO: " + myUsername;
        myId = socket.id;

        // Sincronizza variabili da window (impostate da menu.js)
        const joinTeam = window.myTeam || myTeam;
        const joinTeamColor = window.myTeamColor || myTeamColor;
        const joinGameMode = window.myGameMode || myGameMode;
        const joinUsername = window.myUsername || myUsername;

        logGame(`Joining with team=${joinTeam}, color=${joinTeamColor?.toString(16)}, username=${joinUsername}`, 'NETWORK');

        socket.emit('joinGame', {
            username: joinUsername,
            teamColor: joinTeamColor,
            gameMode: joinGameMode,
            team: joinTeam
        });

        socket.emit('requestPosition');

        // Inizializza kill counter
        playerKills[myId] = myKills;
        updateKillCounter();

        // Ping measurement ogni 2 secondi
        setInterval(() => {
            const start = Date.now();
            socket.emit('ping', start);
        }, 2000);

        // Sincronizzazione punteggi ogni 3 secondi
        setInterval(() => {
            if (socket && socket.connected) {
                socket.emit('requestMatchStats');
            }
        }, 3000);
    });

    // Register all other event listeners from socketHandlers.js
    registerAllSocketHandlers(socket);

    logGame('Multiplayer initialized', 'NETWORK');
}

/**
 * Creates remote player instance in scene
 */
function addOtherPlayer(info) {
    if (!info || !info.id) return;

    // CRITICAL: Previeni aggiunta di se stesso
    if (info.id === myId || info.id === socket.id) {
        logGame(`Blocked self-add: ${info.id}`, 'NETWORK', 'ERROR');
        return;
    }

    // Skip se rimosso di recente (dedupe window)
    if (recentlyRemoved[info.id]) {
        logGame(`Skipped dedup: ${info.id}`, 'NETWORK');
        return;
    }

    // If already exists, remove old one
    if (otherPlayers[info.id]) {
        logGame(`Player exists - removing old: ${info.id}`, 'NETWORK');
        removeOtherPlayer(info.id);
    }

    const mesh = new THREE.Group();
    const playerTeamColor = info.teamColor || 0x2c3e50;
    const armorMat = new THREE.MeshStandardMaterial({
        color: playerTeamColor,
        metalness: 0.7,
        emissive: playerTeamColor,
        emissiveIntensity: 0.3
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.9 });

    // Corpo
    const torso = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 3), armorMat);
    torso.position.y = 3.5;
    mesh.add(torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.5, 3.2), metalMat);
    chest.position.y = 5.0;
    mesh.add(chest);

    const headGroup = createHelmet(mesh);

    // Gambe
    const legUpperGeo = new THREE.BoxGeometry(1.6, 3.25, 1.6);
    const legLowerGeo = new THREE.BoxGeometry(1.6, 3.25, 1.6);

    const legL = new THREE.Mesh(legUpperGeo, armorMat);
    legL.geometry.translate(0, -3.25 / 2, 0);
    legL.position.set(-1.4, 3.5, 0);
    const bootL = new THREE.Mesh(legLowerGeo, armorMat);
    bootL.geometry.translate(0, -3.25 / 2, 0);
    bootL.position.y = -3.25;
    legL.add(bootL);
    mesh.add(legL);

    const legR = new THREE.Mesh(legUpperGeo, armorMat);
    legR.geometry.translate(0, -3.25 / 2, 0);
    legR.position.set(1.4, 3.5, 0);
    const bootR = new THREE.Mesh(legLowerGeo, armorMat);
    bootR.geometry.translate(0, -3.25 / 2, 0);
    bootR.position.y = -3.25;
    legR.add(bootR);
    mesh.add(legR);

    // Braccia
    const armGeo = new THREE.BoxGeometry(1.4, 6, 1.4);
    const armL = new THREE.Mesh(armGeo, armorMat);
    armL.geometry.translate(0, -2.5, 0);
    armL.position.set(-3, 8.0, 0);
    mesh.add(armL);

    const armR = new THREE.Mesh(armGeo, armorMat);
    armR.geometry.translate(0, -2.5, 0);
    armR.position.set(3, 8.0, 0);
    mesh.add(armR);

    // Staff
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 22), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    staff.position.set(0, -4, 0);
    staff.rotation.x = -Math.PI / 6;
    armR.add(staff);

    // Sword
    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18, 0.2), new THREE.MeshStandardMaterial({ color: 0xecf0f1 }));
    blade.position.y = 10;
    swordGroup.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
    guard.position.y = 1;
    swordGroup.add(guard);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0x5a3a22 }));
    hilt.position.y = -1.5;
    swordGroup.add(hilt);

    swordGroup.position.set(0, -5, 0.5);
    swordGroup.rotation.x = -Math.PI / 2;
    swordGroup.rotation.z = Math.PI / 2;
    swordGroup.visible = false;
    armR.add(swordGroup);

    // Shield
    const shield = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 1), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 }));
    shield.position.set(3, -2, 0);
    shield.rotation.y = -Math.PI / 2;
    shield.visible = false;
    armL.add(shield);

    // Bow
    const bowGroup = new THREE.Group();
    const bowCurve = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 8, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    bowCurve.rotation.z = -Math.PI / 2;
    bowGroup.add(bowCurve);
    const stringGeo = new THREE.CylinderGeometry(0.05, 0.05, 6);
    const string = new THREE.Mesh(stringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    string.rotation.z = -Math.PI / 2;
    string.position.x = -0.5;
    bowGroup.add(string);
    bowGroup.position.set(0, -2, 0);
    bowGroup.visible = false;
    armL.add(bowGroup);

    // Posizionamento e etichetta
    mesh.position.set(info.position.x, info.position.y, info.position.z);
    const label = createPlayerLabel(info.username);
    label.position.y = 14;
    label.userData.isLabel = true;
    mesh.add(label);
    mesh.userData.hpBar = label.userData.hpBar;

    // Ensure visibility
    mesh.visible = true;
    mesh.traverse((child) => {
        if (!child.userData.isLabel) child.visible = true;
    });

    scene.add(mesh);

    otherPlayers[info.id] = {
        username: info.username,
        team: info.team || null,
        teamColor: info.teamColor || 0x2c3e50,
        mesh: mesh,
        limbs: { armL, armR, legL, legR, bootL, bootR, head: headGroup, torso },
        weaponMeshes: { staff, sword: swordGroup, shield, bow: bowGroup },
        isAttacking: false,
        attackTimer: 0,
        isWhirlwinding: false,
        isDead: info.isDead || false,
        lastStepPos: new THREE.Vector3()
    };

    logGame(`Added player ${info.id}`, 'NETWORK');
    updateKillCounter();
}

/**
 * Creates player label with HP bar
 */
function createPlayerLabel(name) {
    const group = new THREE.Group();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.scale.set(10, 2.5, 1);
    group.add(sprite);

    // HP bar background
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), new THREE.MeshBasicMaterial({ color: 0x330000 }));
    bg.position.y = 1.2;
    group.add(bg);

    // HP bar foreground
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    fg.position.y = 1.2;
    fg.position.z = 0.01;
    fg.geometry.translate(2.5, 0, 0);
    fg.position.x = -2.5;
    group.add(fg);

    group.userData.hpBar = fg;
    return group;
}

/**
 * Updates enemy HP bar
 */
function updateEnemyHealthBar(playerObj, hp) {
    if (playerObj && playerObj.mesh.userData.hpBar) {
        const scale = Math.max(0, hp / 100);
        playerObj.mesh.userData.hpBar.scale.x = scale;
        playerObj.mesh.userData.hpBar.material.color.setHex(
            scale > 0.5 ? 0x00ff00 : (scale > 0.2 ? 0xffa500 : 0xff0000)
        );
    }
}

/**
 * Removes remote player from scene
 */
function removeOtherPlayer(id) {
    if (!otherPlayers[id]) return;

    const player = otherPlayers[id];
    scene.remove(player.mesh);
    delete otherPlayers[id];

    // Marca come rimosso di recente per dedupe window
    recentlyRemoved[id] = Date.now();
    setTimeout(() => {
        delete recentlyRemoved[id];
    }, DEDUPE_WINDOW_MS);

    logGame(`Removed player ${id}`, 'NETWORK');
    updateKillCounter();
}

/**
 * Updates enemy weapon visuals
 */
function updateOpponentWeaponVisuals(p, mode) {
    if (p.weaponMeshes) {
        p.weaponMeshes.staff.visible = (mode === 'ranged');
        p.weaponMeshes.sword.visible = (mode === 'melee');
        p.weaponMeshes.bow.visible = (mode === 'bow');
    }
}

/**
 * Updates enemy shield
 */
function updateEnemyShield(p, blocking) {
    if (p.weaponMeshes && p.weaponMeshes.shield) {
        p.weaponMeshes.shield.visible = blocking;
        if (blocking) {
            p.limbs.armL.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        } else {
            p.limbs.armL.rotation.set(0, 0, 0);
        }
    }
}

/**
 * Checks login (legacy - maintained for compatibility)
 */
function checkLogin() {
    const savedName = loadUsername();
    if (savedName) {
        myUsername = savedName;
    }
}

