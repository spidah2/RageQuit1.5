// AssetManager.js - Gestione centralizzata di TUTTI gli asset visivi
// Decoupling completo tra LOGICA (player.js, game.js) e RENDERING (Three.js meshes)
// Questa classe gestisce: modelli giocatore, mappa, texture, materiali, suoni

console.log("✅ [SYSTEM] AssetManager caricato correttamente.");

class AssetManager {
    constructor(scene) {
        this.scene = scene;
        this.cache = {
            playerMeshes: {},    // Cache per modelli giocatore
            materials: {},        // Cache per materiali
            geometries: {}        // Cache per geometrie riutilizzabili
        };
        this.mapId = 'team-arena'; // Mappa attualmente caricata
    }

    /**
     * Crea un modello di giocatore completo pronto per l'uso
     * @param {number} teamColor - Colore esadecimale della squadra (es. 0xff0000)
     * @param {string} skinId - ID della skin (per future espansioni)
     * @returns {THREE.Group} Gruppo 3D con il modello giocatore completo
     */
    getPlayerMesh(teamColor = 0x2c3e50, skinId = 'default') {
        const cacheKey = `${teamColor}_${skinId}`;
        
        // Se già in cache, clona per evitare condivisione di riferimenti
        if (this.cache.playerMeshes[cacheKey]) {
            return this.cache.playerMeshes[cacheKey].clone();
        }

        // Crea nuovo modello
        const playerGroup = new THREE.Group();
        
        // Materiali
        const armorMat = new THREE.MeshLambertMaterial({
            color: teamColor,
            emissive: teamColor,
            emissiveIntensity: 0.3,
            flatShading: true
        });
        const metalMat = new THREE.MeshLambertMaterial({
            color: 0x95a5a6,
            flatShading: true
        });

        // TORSO
        const torso = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 3), armorMat);
        torso.position.y = 3.5;
        playerGroup.add(torso);
        torso.userData.partName = 'torso';

        // CHEST (metallo)
        const chest = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.5, 3.2), metalMat);
        chest.position.y = 5.0;
        playerGroup.add(chest);
        chest.userData.isTorsoPart = true;
        chest.userData.partName = 'chest';

        // HEAD (con helmet)
        const head = this._createHelmetMesh(armorMat, metalMat);
        head.position.y = 9.5;
        playerGroup.add(head);

        // LEGS
        const legUpperGeo = new THREE.BoxGeometry(1.6, 3.25, 1.6);
        const legLowerGeo = new THREE.BoxGeometry(1.6, 3.25, 1.6);

        // Left leg
        const legL = new THREE.Mesh(legUpperGeo, armorMat);
        legL.geometry.translate(0, -3.25 / 2, 0);
        legL.position.set(-1.4, 3.5, 0);
        const bootL = new THREE.Mesh(legLowerGeo, armorMat);
        bootL.geometry.translate(0, -3.25 / 2, 0);
        bootL.position.y = -3.25;
        legL.add(bootL);
        playerGroup.add(legL);
        legL.userData.partName = 'legL';

        // Right leg
        const legR = new THREE.Mesh(legUpperGeo, armorMat);
        legR.geometry.translate(0, -3.25 / 2, 0);
        legR.position.set(1.4, 3.5, 0);
        const bootR = new THREE.Mesh(legLowerGeo, armorMat);
        bootR.geometry.translate(0, -3.25 / 2, 0);
        bootR.position.y = -3.25;
        legR.add(bootR);
        playerGroup.add(legR);
        legR.userData.partName = 'legR';

        // ARMS
        const armGeo = new THREE.BoxGeometry(1.4, 6, 1.4);
        const armL = new THREE.Mesh(armGeo, armorMat);
        armL.geometry.translate(0, -2.5, 0);
        armL.position.set(-3, 8.0, 0);
        playerGroup.add(armL);
        armL.userData.partName = 'armL';

        const armR = new THREE.Mesh(armGeo, armorMat);
        armR.geometry.translate(0, -2.5, 0);
        armR.position.set(3, 8.0, 0);
        playerGroup.add(armR);
        armR.userData.partName = 'armR';

        // Cache il template
        this.cache.playerMeshes[cacheKey] = playerGroup;
        
        logGame(`[AssetManager] Created player mesh: ${cacheKey}`, 'ASSET');
        return playerGroup;
    }

    /**
     * Crea il modello dell'elmo/testa
     * @private
     */
    _createHelmetMesh(armorMat, metalMat) {
        const head = new THREE.Group();
        
        // Head base
        const headGeom = new THREE.SphereGeometry(1.8, 8, 8);
        const headMesh = new THREE.Mesh(headGeom, armorMat);
        headMesh.scale.set(1, 1.3, 0.9);
        head.add(headMesh);
        headMesh.userData.partName = 'head';

        // Helmet top
        const helmetTop = new THREE.Mesh(
            new THREE.SphereGeometry(2, 8, 8),
            metalMat
        );
        helmetTop.scale.set(1.1, 1.5, 0.95);
        helmetTop.position.y = 0.5;
        head.add(helmetTop);
        helmetTop.userData.partName = 'helmetTop';

        // Visor
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 1.2, 0.6),
            new THREE.MeshLambertMaterial({ color: 0x111111 })
        );
        visor.position.set(0, -0.2, 1.3);
        head.add(visor);
        visor.userData.partName = 'visor';

        head.userData.partName = 'head';
        return head;
    }

    /**
     * Carica/crea una mappa completa
     * @param {string} mapId - ID della mappa (default 'team-arena')
     */
    loadMap(mapId = 'team-arena') {
        if (mapId === 'team-arena') {
            this._loadTeamArena();
        } else {
            logGame(`[AssetManager] Unknown map: ${mapId}`, 'ASSET', 'WARNING');
            this._loadTeamArena(); // Fallback a default
        }
        this.mapId = mapId;
        logGame(`[AssetManager] Loaded map: ${mapId}`, 'ASSET');
    }

    /**
     * Crea la mappa Team Arena
     * @private
     */
    _loadTeamArena() {
        // Floor con texture gore
        const floorTexture = this._createFloorTexture();
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            new THREE.MeshStandardMaterial({
                map: floorTexture,
                roughness: 0.95,
                metalness: 0.05,
                emissive: 0x050000,
                emissiveIntensity: 0.05
            })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid helper
        const gridHelper = new THREE.GridHelper(2000, 100, 0x004444, 0x002222);
        this.scene.add(gridHelper);

        // Team zones (from WorldConfig)
        const teamZones = [
            { team: 'red', x: -300, z: -300, color: 0x8B0000 },
            { team: 'black', x: 300, z: -300, color: 0x003300 },
            { team: 'green', x: -300, z: 300, color: 0x1B2F2F },
            { team: 'purple', x: 300, z: 300, color: 0x550055 }
        ];

        teamZones.forEach(zone => {
            // Base colorata
            const base = new THREE.Mesh(
                new THREE.CircleGeometry(80, 32),
                new THREE.MeshStandardMaterial({
                    color: zone.color,
                    emissive: zone.color,
                    emissiveIntensity: 0.3,
                    roughness: 0.6
                })
            );
            base.rotation.x = -Math.PI / 2;
            base.position.set(zone.x, 0.1, zone.z);
            this.scene.add(base);
            base.userData.mapElement = `zone_${zone.team}`;

            // Alberi attorno alla base
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = zone.x + Math.cos(angle) * 120;
                const z = zone.z + Math.sin(angle) * 120;
                const tree = this._createPineTree(x, z);
                this.scene.add(tree);
            }
        });

        // Central platform
        const centralPlatform = new THREE.Mesh(
            new THREE.CylinderGeometry(60, 60, 5, 32),
            new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.5,
                roughness: 0.5
            })
        );
        centralPlatform.position.set(0, 2.5, 0);
        centralPlatform.castShadow = true;
        centralPlatform.receiveShadow = true;
        this.scene.add(centralPlatform);
        centralPlatform.userData.mapElement = 'central_platform';

        // Ostacoli sparsi
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 150 + Math.random() * 50;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const rock = this._createRock(x, z);
            this.scene.add(rock);
        }
    }

    /**
     * Crea una texture per il pavimento (gore/blood pattern)
     * @private
     */
    _createFloorTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Pattern terreno scuro con schizzi di sangue
        for (let i = 0; i < 512; i += 16) {
            for (let j = 0; j < 512; j += 16) {
                const rand = Math.random();
                if (rand < 0.15) {
                    const gradient = ctx.createRadialGradient(i + 8, j + 8, 2, i + 8, j + 8, 10);
                    gradient.addColorStop(0, '#1a0000');
                    gradient.addColorStop(0.5, '#100000');
                    gradient.addColorStop(1, '#0a0000');
                    ctx.fillStyle = gradient;
                } else if (rand < 0.3) {
                    ctx.fillStyle = `rgb(${10 + Math.random() * 15}, ${2 + Math.random() * 8}, ${2 + Math.random() * 8})`;
                } else if (rand < 0.5) {
                    ctx.fillStyle = `rgb(${8 + Math.random() * 12}, ${5 + Math.random() * 10}, ${5 + Math.random() * 10})`;
                } else {
                    const base = 5 + Math.random() * 10;
                    ctx.fillStyle = `rgb(${base}, ${base * 0.5}, ${base * 0.5})`;
                }
                ctx.fillRect(i, j, 16, 16);

                if (Math.random() < 0.2) {
                    ctx.strokeStyle = 'rgba(30,0,0,0.5)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(i + Math.random() * 16, j + Math.random() * 16);
                    ctx.lineTo(i + Math.random() * 16, j + Math.random() * 16);
                    ctx.stroke();
                }

                if (Math.random() < 0.1) {
                    ctx.fillStyle = '#220000';
                    ctx.beginPath();
                    ctx.arc(i + Math.random() * 16, j + Math.random() * 16, 1 + Math.random() * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        return texture;
    }

    /**
     * Crea un albero
     * @private
     */
    _createPineTree(x, z) {
        const tree = new THREE.Group();
        
        // Trunk
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(3, 4, 15, 8),
            new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        trunk.position.y = 7.5;
        tree.add(trunk);

        // Foliage (multiple cones)
        for (let i = 0; i < 3; i++) {
            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(8 - i * 2, 10, 8),
                new THREE.MeshStandardMaterial({ color: 0x1a5c1a })
            );
            foliage.position.y = 15 + i * 6;
            tree.add(foliage);
        }

        tree.position.set(x, 0, z);
        tree.userData.mapElement = 'tree';
        return tree;
    }

    /**
     * Crea un sasso/roccia
     * @private
     */
    _createRock(x, z) {
        const rock = new THREE.Mesh(
            new THREE.SphereGeometry(8 + Math.random() * 8, 6, 6),
            new THREE.MeshStandardMaterial({
                color: 0x663333,
                roughness: 0.8
            })
        );
        rock.position.set(x, 10, z);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.userData.mapElement = 'rock';
        return rock;
    }

    /**
     * Crea una spada per le animazioni
     * @returns {THREE.Group} Modello della spada
     */
    getSwordMesh() {
        const swordContainer = new THREE.Group();
        
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 18, 0.2),
            new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9 })
        );
        blade.position.y = 10;
        swordContainer.add(blade);

        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(6, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xf39c12 })
        );
        guard.position.y = 1;
        swordContainer.add(guard);

        const hilt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.4, 4),
            new THREE.MeshStandardMaterial({ color: 0x5a3a22 })
        );
        hilt.position.y = -1.5;
        swordContainer.add(hilt);

        swordContainer.position.set(0, -5, 0.5);
        swordContainer.rotation.x = -Math.PI / 2;

        swordContainer.userData.meshType = 'sword';
        return swordContainer;
    }

    /**
     * Aggiorna il colore di un modello giocatore
     * @param {THREE.Group} playerMesh - Il mesh del giocatore
     * @param {number} newColor - Il nuovo colore esadecimale
     */
    updatePlayerColor(playerMesh, newColor) {
        if (!playerMesh) return;

        playerMesh.traverse((child) => {
            if (child.isMesh && child.material) {
                // Salta solo le parti metalliche (grigio)
                const isMetalPiece = (child.material.color && child.material.color.getHex() === 0x95a5a6) ||
                    (child.material.color && child.material.color.getHex() === 0x555555) ||
                    (child.material.color && child.material.color.getHex() === 0x111111);

                if (!isMetalPiece && child.material.color) {
                    child.material.color.setHex(newColor);
                    if (child.material.emissive) {
                        child.material.emissive.setHex(newColor);
                    }
                    child.material.needsUpdate = true;
                }
            }
        });

        logGame(`[AssetManager] Player color updated to ${newColor.toString(16)}`, 'ASSET');
    }

    /**
     * Clearing delle risorse
     */
    dispose() {
        // Clear cache
        Object.keys(this.cache).forEach(key => {
            if (this.cache[key]) {
                Object.keys(this.cache[key]).forEach(cacheKey => {
                    // Dispose geometries and materials se necessario
                });
            }
        });
        logGame('[AssetManager] Assets disposed', 'ASSET');
    }
}

// Create global instance if THREE and scene are available
let assetManager = null;
if (typeof scene !== 'undefined' && typeof THREE !== 'undefined') {
    assetManager = new AssetManager(scene);
}
