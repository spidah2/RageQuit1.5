/**
 * playerMeshFactory.js - Factory pattern for creating player meshes
 * Consolidates duplicate player mesh creation logic from player.js and network.js
 */

class PlayerMeshFactory {
    /**
     * Create a complete player mesh with armor and equipment
     * @param {number} color - Team color (hex)
     * @param {boolean} isLocalPlayer - Whether this is the local player (uses better materials)
     * @returns {THREE.Group} Complete player mesh group
     */
    static createPlayerMesh(color = 0x2c3e50, isLocalPlayer = false) {
        const group = new THREE.Group();
        
        // Material selection based on player type
        const armorMatType = isLocalPlayer ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
        const armorMat = new armorMatType({ 
            color: color, 
            metalness: isLocalPlayer ? undefined : 0.6,
            roughness: isLocalPlayer ? undefined : 0.4
        });
        
        const metalMat = new armorMatType({
            color: 0x95a5a6,
            metalness: isLocalPlayer ? undefined : 0.9,
            roughness: isLocalPlayer ? undefined : 0.2
        });
        
        // Create torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 3), armorMat);
        torso.position.y = 3.5;
        group.add(torso);
        
        // Create chest plate
        const chest = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.5, 3.2), metalMat);
        chest.position.y = 5.0;
        group.add(chest);
        chest.userData.isTorsoPart = true;
        
        // Create legs
        const legUpperGeo = new THREE.BoxGeometry(1.5, 4, 2);
        const legLowerGeo = new THREE.BoxGeometry(1.8, 3.25, 2);
        
        const legL = new THREE.Mesh(legUpperGeo, armorMat);
        legL.geometry.translate(0, -3.25 / 2, 0);
        legL.position.set(-1.5, 2, 0);
        group.add(legL);
        
        const bootL = new THREE.Mesh(legLowerGeo, armorMat);
        bootL.geometry.translate(0, -3.25 / 2, 0);
        bootL.position.set(-1.5, -1.5, 0);
        group.add(bootL);
        
        const legR = new THREE.Mesh(legUpperGeo, armorMat);
        legR.geometry.translate(0, -3.25 / 2, 0);
        legR.position.set(1.5, 2, 0);
        group.add(legR);
        
        const bootR = new THREE.Mesh(legLowerGeo, armorMat);
        bootR.geometry.translate(0, -3.25 / 2, 0);
        bootR.position.set(1.5, -1.5, 0);
        group.add(bootR);
        
        // Create arms
        const armGeo = new THREE.BoxGeometry(1.2, 5, 1.5);
        
        const armL = new THREE.Mesh(armGeo, armorMat);
        armL.geometry.translate(0, -2.5, 0);
        armL.position.set(-3, 8.0, 0);
        group.add(armL);
        
        const armR = new THREE.Mesh(armGeo, armorMat);
        armR.geometry.translate(0, -2.5, 0);
        armR.position.set(3, 8.0, 0);
        group.add(armR);
        
        // Create head
        const headGeo = new THREE.BoxGeometry(2.5, 3.5, 2.5);
        const head = new THREE.Mesh(headGeo, armorMat);
        head.position.set(0, 10, 0);
        group.add(head);
        
        // Store limb references for animation
        group.userData.limbs = {
            torso: torso,
            chest: chest,
            legL: legL,
            legR: legR,
            armL: armL,
            armR: armR,
            head: head
        };
        
        return group;
    }
    
    /**
     * Create a staff weapon mesh
     * @returns {THREE.Group} Staff with gem socket
     */
    static createStaffMesh() {
        const group = new THREE.Group();
        
        const staffGeo = new THREE.CylinderGeometry(0.2, 0.3, 22);
        const staffMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
        const staff = new THREE.Mesh(staffGeo, staffMat);
        staff.position.y = 11;
        group.add(staff);
        
        // Gem socket at top
        const gemGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const gemMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const gem = new THREE.Mesh(gemGeo, gemMat);
        gem.position.y = 21;
        group.add(gem);
        
        group.userData.gem = gem;
        
        return group;
    }
    
    /**
     * Create a sword weapon mesh
     * @returns {THREE.Group} Sword with blade and guard
     */
    static createSwordMesh() {
        const group = new THREE.Group();
        
        // Blade
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 18, 0.2),
            new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.9 })
        );
        blade.position.y = 10;
        group.add(blade);
        
        // Guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(6, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xf39c12 })
        );
        guard.position.y = 1;
        group.add(guard);
        
        // Hilt
        const hilt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.4, 4),
            new THREE.MeshStandardMaterial({ color: 0x5a3a22 })
        );
        hilt.position.y = -2;
        group.add(hilt);
        
        return group;
    }
    
    /**
     * Create a shield mesh
     * @returns {THREE.Mesh} Shield
     */
    static createShieldMesh() {
        const shield = new THREE.Mesh(
            new THREE.BoxGeometry(4, 8, 1),
            new THREE.MeshBasicMaterial({ 
                color: 0x00aaff, 
                transparent: true, 
                opacity: 0.4 
            })
        );
        shield.position.set(-5, 5, -2);
        shield.userData.isShield = true;
        return shield;
    }
    
    /**
     * Create a bow weapon mesh
     * @returns {THREE.Group} Bow with string
     */
    static createBowMesh() {
        const group = new THREE.Group();
        
        // Bow curve
        const bowCurve = new THREE.Mesh(
            new THREE.TorusGeometry(3, 0.2, 8, 12, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        group.add(bowCurve);
        
        // String
        const stringGeo = new THREE.BufferGeometry();
        stringGeo.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([0, 3, 0, 0, -3, 0]),
            3
        ));
        const string = new THREE.Mesh(
            stringGeo,
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        group.add(string);
        
        return group;
    }
    
    /**
     * Create player nametag with health bar
     * @param {string} name - Player name
     * @returns {THREE.Group} Label group with name and health bar
     */
    static createPlayerLabel(name) {
        const group = new THREE.Group();
        
        // Background
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x330000 })
        );
        group.add(bg);
        
        // Health bar
        const fg = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 0.5),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        fg.position.z = 0.01;
        group.add(fg);
        
        // Store for updates
        group.userData.healthBarBg = bg;
        group.userData.healthBar = fg;
        
        // Canvas text for name
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(name, 128, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const textMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), textMat);
        textMesh.position.z = 0.02;
        group.add(textMesh);
        
        group.position.y = 15; // Above player head
        
        return group;
    }
}

// Global reference
let playerMeshFactory = PlayerMeshFactory;
