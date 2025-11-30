// socketHandlers.js - Gestori Socket Centralizzati
// Consolida TUTTI gli eventi socket.io in un unico posto
// Evita duplicazioni e mantiene le logiche ordinate

/**
 * Registra tutti gli event listener del socket
 * Deve essere chiamato da initMultiplayer() dopo la connessione
 */
function registerAllSocketHandlers(socket) {
    if (!socket) {
        logGame('registerAllSocketHandlers called with null socket', 'NETWORK', 'ERROR');
        return;
    }

    // ===== CONNECTION EVENTS =====
    socket.on('connect', () => {
        logGame(`Connected to server. ID: ${socket.id}`, 'NETWORK');
    });

    socket.on('disconnect', () => {
        logGame('Disconnected from server', 'NETWORK', 'WARNING');
        document.getElementById('connection-status').innerText = "DISCONNESSO";
        document.getElementById('connection-status').style.color = "red";
    });

    socket.on('pong', (timestamp) => {
        currentPing = Date.now() - timestamp;
        const pingEl = document.getElementById('ping-counter');
        if (pingEl) {
            pingEl.innerText = 'PING: ' + currentPing + 'ms';
            pingEl.style.color = currentPing < 50 ? '#00ff00' : currentPing < 100 ? '#ffff00' : '#ff0000';
        }
    });

    // ===== MESSAGING EVENTS =====
    socket.on('serverMsg', (msg) => {
        logGame(`Server message: ${msg}`, 'NETWORK');
        addToLog(msg, 'server-msg');
    });

    socket.on('chatMessage', (data) => {
        if (typeof addChatMessage === 'function') {
            addChatMessage(data.username, data.text, false);
        }
    });

    // ===== GAME STATE EVENTS =====
    socket.on('currentPlayers', (players) => {
        logGame(`Received currentPlayers: ${Object.keys(players).length} players`, 'NETWORK');
        Object.keys(players).forEach((id) => {
            if (id === myId || id === socket.id) return;
            if (!otherPlayers[id]) addOtherPlayer(players[id]);
        });
    });

    socket.on('newPlayer', (playerInfo) => {
        logGame(`New player joined: ${playerInfo.username} (${playerInfo.id})`, 'NETWORK');
        
        if (playerInfo.id === myId || playerInfo.id === socket.id) {
            logGame('Blocked self-add attempt', 'NETWORK');
            return;
        }
        
        if (typeof recentlyRemoved !== 'undefined' && recentlyRemoved[playerInfo.id]) {
            logGame(`Skipping duplicate add for ${playerInfo.id}`, 'NETWORK');
            return;
        }
        
        addToLog(playerInfo.username + " joined!", "heal");
        
        if (!otherPlayers[playerInfo.id]) {
            addOtherPlayer(playerInfo);
        } else {
            otherPlayers[playerInfo.id].mesh.visible = true;
            otherPlayers[playerInfo.id].mesh.userData.isDead = false;
            updateEnemyHealthBar(otherPlayers[playerInfo.id], playerInfo.hp || 100);
        }
    });

    socket.on('playerDisconnected', (id) => {
        logGame(`Player disconnected: ${id}`, 'NETWORK');
        if (otherPlayers[id]) {
            addToLog(otherPlayers[id].username + " left.", "kill");
            removeOtherPlayer(id);
        }
    });

    // ===== TEAM EVENTS =====
    socket.on('teamCounts', (counts) => {
        if (typeof updateTeamCounts === 'function') {
            updateTeamCounts(counts);
        }
    });

    socket.on('playerTeamChanged', (data) => {
        logGame(`Player ${data.playerName} changed team to ${data.newTeam}`, 'NETWORK');
        if (otherPlayers[data.playerId]) {
            otherPlayers[data.playerId].team = data.newTeam;
            otherPlayers[data.playerId].teamColor = data.teamColor;
            
            if (otherPlayers[data.playerId].mesh) {
                const newColor = data.teamColor || 0x2c3e50;
                otherPlayers[data.playerId].mesh.traverse((child) => {
                    if (child.material && child.material.color) {
                        child.material.color.setHex(newColor);
                    }
                });
            }
            
            addToLog(`${data.playerName} switched to ${data.newTeam}`, 'server-msg');
        }
    });

    socket.on('teamChangeConfirmed', (data) => {
        logGame(`Team change confirmed: ${data.team}`, 'NETWORK');
        window.myTeam = data.team;
        window.myTeamColor = data.teamColor;
        
        if (typeof myTeam !== 'undefined') myTeam = data.team;
        if (typeof myTeamColor !== 'undefined') myTeamColor = data.teamColor;
        if (typeof updatePlayerColor === 'function') updatePlayerColor();
        
        addToLog(`You switched to team ${data.team}`, 'server-msg');
    });

    // ===== PLAYER MOVEMENT & STATE =====
    socket.on('playerMoved', (playerInfo) => {
        if (otherPlayers[playerInfo.id]) {
            const p = otherPlayers[playerInfo.id];
            
            if (p.mesh.userData.isDead) {
                p.mesh.userData.isDead = false;
                p.mesh.visible = true;
            }
            
            if (p.mesh.userData.isDead) return;
            
            p.mesh.userData.targetPos = playerInfo.position;
            p.mesh.userData.targetRot = playerInfo.rotation;
            p.mesh.userData.animState = playerInfo.animState;
            
            if (playerInfo.weaponMode && p.mesh.userData.weaponMode !== playerInfo.weaponMode) {
                p.mesh.userData.weaponMode = playerInfo.weaponMode;
                updateOpponentWeaponVisuals(otherPlayers[playerInfo.id], playerInfo.weaponMode);
            }
        }
    });

    socket.on('forcePositionUpdate', () => {
        if (myId && !playerStats.isDead) {
            const animState = isSprinting ? 'run' : (moveForward || moveBackward) ? 'walk' : 'idle';
            socket.emit('playerMovement', {
                position: playerMesh.position,
                rotation: { x: playerMesh.rotation.x, y: playerMesh.rotation.y, z: playerMesh.rotation.z },
                animState: animState,
                weaponMode: weaponMode
            });
        }
    });

    // ===== HEALTH & DAMAGE EVENTS =====
    socket.on('updateHealth', (data) => {
        if (data.id === myId) {
            playerStats.hp = data.hp;
            updateUI();
        } else if (otherPlayers[data.id]) {
            updateEnemyHealthBar(otherPlayers[data.id], data.hp);
        }
    });

    socket.on('remoteDamageTaken', (data) => {
        if (data.id === myId) {
            spawnParticles(playerMesh.position, 0xff0000, 5, 20, 0.5, false);
        } else if (otherPlayers[data.id]) {
            if (!otherPlayers[data.id].mesh.userData.isDead) {
                spawnParticles(otherPlayers[data.id].mesh.position, 0xff0000, 5, 20, 0.5, false);
            }
        }
    });

    socket.on('playerHitResponse', (data) => {
        const diff = -data.damage;
        playerStats.hp = Math.max(0, playerStats.hp + diff);
        updateUI();
        if (diff < 0) flashScreen('red');
        
        if (playerStats.hp <= 0 && !playerStats.isDead) {
            playerStats.isDead = true;
            playerStats.hp = 0;
            if (typeof activeConversions !== 'undefined') activeConversions.length = 0;
            document.getElementById('message').innerHTML = "SEI STATO SCONFITTO<br><span style='font-size:16px'>Premi RESPAWN</span>";
            document.getElementById('message').style.display = "block";
            document.exitPointerLock();
            spawnParticles(playerMesh.position, 0xff0000, 50, 50, 1.0, true);
            playSound('death');
        }
    });

    // ===== RESPAWN & DEATH =====
    socket.on('playerDied', (data) => {
        if (data.id === myId) {
            playerStats.isDead = true;
            playerStats.hp = 0;
            document.getElementById('message').innerHTML = "SEI STATO SCONFITTO<br><span style='font-size:16px'>Respawn in 3 secondi...</span>";
            document.getElementById('message').style.display = "block";
            document.exitPointerLock();
            spawnParticles(playerMesh.position, 0xff0000, 50, 50, 1.0, true);
            playerMesh.visible = false;
            logGame('Auto-respawn in 3 seconds', 'NETWORK');
            
            setTimeout(() => {
                if (playerStats.isDead) {
                    logGame('Auto-respawn activated', 'NETWORK');
                    respawnPlayer();
                }
            }, 3000);
        } else if (otherPlayers[data.id]) {
            otherPlayers[data.id].mesh.userData.isDead = true;
            otherPlayers[data.id].mesh.visible = false;
            addToLog(otherPlayers[data.id].username + " eliminated!", "kill");
            spawnParticles(otherPlayers[data.id].mesh.position, 0xff0000, 50, 50, 1.0, true);
        }
        
        if (data.killerId === myId) {
            const victimTeam = otherPlayers[data.id]?.team || null;
            incrementKill(myId, myTeam);
            addFloatingText(playerMesh.position.clone().add(new THREE.Vector3(0, 12, 0)), '☠️ KILL!', 0xff0000, 1.5);
            playSound('kill');
        } else if (data.killerId && otherPlayers[data.killerId]) {
            const killerTeam = otherPlayers[data.killerId].team || null;
            incrementKill(data.killerId, killerTeam);
        }
    });

    socket.on('playerRespawned', (data) => {
        if (data.id === myId || data.id === socket.id) {
            logGame('Ignored playerRespawned for self', 'NETWORK');
            return;
        }
        
        if (otherPlayers[data.id]) {
            otherPlayers[data.id].mesh.userData.isDead = false;
            otherPlayers[data.id].mesh.visible = true;
            
            if (data.team !== undefined) otherPlayers[data.id].team = data.team;
            if (data.teamColor !== undefined) otherPlayers[data.id].teamColor = data.teamColor;
            if (data.hp !== undefined) updateEnemyHealthBar(otherPlayers[data.id], data.hp);
            
            otherPlayers[data.id].mesh.traverse((child) => { child.visible = true; });
            logGame(`Player ${data.id} respawned`, 'NETWORK');
        } else {
            logGame(`Player ${data.id} respawned but not found - creating`, 'NETWORK');
            
            if (otherPlayers[data.id]) {
                logGame('Player exists but wasnt found - race condition detected', 'NETWORK', 'WARNING');
                return;
            }
            
            const playerInfo = {
                id: data.id,
                username: data.username || 'Player',
                hp: data.hp || 100,
                maxHp: data.hp || 100,
                position: data.position || { x: 0, y: 6, z: 0 },
                rotation: data.rotation || { x: 0, y: 0, z: 0 },
                team: data.team,
                teamColor: data.teamColor || 0x2c3e50,
                animState: 'idle',
                weaponMode: 'ranged',
                isBlocking: false,
                isDead: false
            };
            
            addOtherPlayer(playerInfo);
        }
    });

    // ===== MATCH STATS =====
    socket.on('matchStats', (data) => {
        if (data.playerKills && typeof playerKills !== 'undefined') Object.assign(playerKills, data.playerKills);
        if (data.teamKills && typeof teamKills !== 'undefined') Object.assign(teamKills, data.teamKills);
        if (typeof updateKillCounter === 'function') updateKillCounter();
        logGame('Match stats updated', 'NETWORK');
    });

    // ===== ATTACK & EFFECTS =====
    socket.on('enemyAttacked', (data) => {
        if (otherPlayers[data.id]) {
            if (data.type === 'melee') {
                otherPlayers[data.id].mesh.userData.isAttacking = true;
                otherPlayers[data.id].mesh.userData.attackTimer = 0;
                playSound('swing_heavy', otherPlayers[data.id].mesh.position);
            } else if (data.type === 'whirlwind') {
                otherPlayers[data.id].mesh.userData.isWhirlwinding = true;
                setTimeout(() => {
                    if (otherPlayers[data.id]) otherPlayers[data.id].mesh.userData.isWhirlwinding = false;
                }, 500);
                playSound('whirlwind', otherPlayers[data.id].mesh.position);
            } else if (data.type === 'spikes') {
                if (data.targetId === myId) spawnStoneSpikes(playerMesh, true);
                else if (otherPlayers[data.targetId]) spawnStoneSpikes(otherPlayers[data.targetId].mesh, true);
                else spawnStoneSpikes(data.origin, false);
            } else if ([1, 2, 3, 4, 5].includes(data.type)) {
                // Spell projectile: Missile(1), Begone(2), Fireball(3), Impale(4), Arrow(5)
                // For impale, just show effect - it's hitscan
                if (data.type === 4) {
                    spawnStoneSpikes(data.origin, false);
                } else if (data.origin && data.direction) {
                    // Spawn visible projectile with height offset
                    const spawnPos = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
                    // Alza leggermente tutti gli spell per evitare di sparare a terra
                    if (data.type === 3) {
                        spawnPos.y += 1.5; // Fireball più alto
                    } else {
                        spawnPos.y += 0.8; // Missile, Begone, Arrow
                    }
                    spawnEnemyProjectile(
                        spawnPos,
                        new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z),
                        data.type
                    );
                    playSound(data.type === 3 ? 'shoot_fire' : 'shoot_bolt', data.origin);
                }
            }
        }
    });

    socket.on('remoteEffect', (data) => {
        if (otherPlayers[data.id]) {
            let color = 0xffffff;
            if (data.type === 'heal') color = 0x00ff00;
            else if (data.type === 'mana') color = 0x0000ff;
            else if (data.type === 'stamina') color = 0xffff00;
            
            spawnParticles(otherPlayers[data.id].mesh.position, color, 15, 15, 0.4, false);
            const light = new THREE.PointLight(color, 5, 20);
            light.position.copy(otherPlayers[data.id].mesh.position).add(new THREE.Vector3(0, 5, 0));
            scene.add(light);
            setTimeout(() => scene.remove(light), 300);
            if (data.type === 'heal') playSound('heal', otherPlayers[data.id].mesh.position);
        }
    });

    socket.on('updateEnemyBlock', (data) => {
        if (otherPlayers[data.id]) {
            otherPlayers[data.id].mesh.userData.isBlocking = data.isBlocking;
            updateEnemyShield(otherPlayers[data.id], data.isBlocking);
        }
    });

    socket.on('playerPushed', (data) => {
        if (data.forceY) velocity.y = data.forceY;
        if (data.forceVec) velocity.add(new THREE.Vector3(data.forceVec.x, data.forceVec.y, data.forceVec.z));
        
        if (!data.forceY && !data.forceVec && data.pushOrigin) {
            const origin = new THREE.Vector3(data.pushOrigin.x, data.pushOrigin.y, data.pushOrigin.z);
            const dir = new THREE.Vector3().subVectors(playerMesh.position, origin).normalize();
            velocity.add(dir.multiplyScalar(300)); // PUSH_FORCE
            velocity.y += 100;
        }
        
        playerStats.isFalling = true;
        // NOTA: NON setta canJump = false qui - lascia che player.js lo gestisca quando controlla ground collision
        // Questa linea causava jump permanentemente disabilitato dopo essere stati spinti
        playerMesh.position.y += 0.5;
    });

    // ===== ERROR HANDLING =====
    socket.on('hitRejected', (data) => {
        logGame(`Hit rejected for target ${data.targetId} - desync detected`, 'NETWORK', 'WARNING');
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = registerAllSocketHandlers;
}
