/**
 * animationManager.js - Manages game animations, visual effects, and rendering states
 * Consolidated from scattered animation and effect functions
 */

class AnimationManager {
    constructor(scene) {
        this.scene = scene;
        
        // Animation states
        this.isAttacking = false;
        this.attackTimer = 0;
        this.isWhirlwinding = false;
        
        // Casting and abilities
        this.castingState = { 
            active: false, 
            currentSpell: 0, 
            timer: 0, 
            maxTime: 0, 
            ready: false, 
            keyHeld: null 
        };
        
        // Time tracking
        this.lastAttackTime = 0;
        this.lastHealTime = -10000;
        this.lastConversionTime = 0;
        this.lastWhirlwindTime = 0;
        this.lastSpikesTime = 0;
        this.lastJumpTime = 0;
        this.lastFootstepTime = 0;
        this.distanceSinceStep = 0;
        
        // Active effects
        this.floatingTexts = [];
        this.activeConversions = [];
        this.projectiles = [];
        this.particles = [];
        this.obstacles = [];
        
        // Particle pooling
        this.particlePool = [];
        this.maxParticles = 100;
    }
    
    /**
     * Start attack animation
     */
    startAttack() {
        this.isAttacking = true;
        this.attackTimer = 0;
    }
    
    /**
     * Update attack animation state
     */
    updateAttack(delta) {
        if (!this.isAttacking) return;
        this.attackTimer += delta;
        if (this.attackTimer > 0.5) { // 500ms attack duration
            this.isAttacking = false;
        }
    }
    
    /**
     * Start casting animation
     */
    startCasting(spellId, type, key) {
        if (this.castingState.active) return;
        
        let castTime = 0.5;
        if (spellId === 1) castTime = 0.2;
        if (spellId === 4) castTime = 0.0;
        
        if (castTime === 0) {
            return; // Instant cast - will be handled by caller
        }
        
        this.castingState.active = true;
        this.castingState.timer = 0;
        this.castingState.maxTime = castTime;
        this.castingState.currentSpell = spellId;
        this.castingState.type = type;
        this.castingState.ready = false;
        this.castingState.keyHeld = key;
        
        // Show cast bar
        const castBar = document.getElementById('cast-bar-container');
        if (castBar) {
            castBar.style.display = 'block';
            document.getElementById('cast-text').innerText = "CHARGING...";
            document.getElementById('cast-bar-fill').className = '';
        }
    }
    
    /**
     * Stop casting (may complete or cancel)
     */
    stopCasting(key) {
        if (!this.castingState.active) return;
        if (this.castingState.keyHeld === key) {
            const wasReady = this.castingState.ready;
            this.castingState.active = false;
            const castBar = document.getElementById('cast-bar-container');
            if (castBar) castBar.style.display = 'none';
            return wasReady;
        }
        return false;
    }
    
    /**
     * Update casting progress
     */
    updateCasting(delta) {
        if (!this.castingState.active) return;
        
        this.castingState.timer += delta;
        const progress = Math.min(1, this.castingState.timer / this.castingState.maxTime);
        
        const fillBar = document.getElementById('cast-bar-fill');
        if (fillBar) fillBar.style.width = (progress * 100) + '%';
        
        if (progress >= 1 && !this.castingState.ready) {
            this.castingState.ready = true;
            const castText = document.getElementById('cast-text');
            if (castText) castText.innerText = "READY!";
            if (fillBar) fillBar.className = 'ready';
        }
    }
    
    /**
     * Create floating damage/heal text
     */
    createFloatingText(position, text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(10, 5);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(position);
        mesh.userData = {
            velocity: new THREE.Vector3(0, 20, 0),
            life: 1.5,
            maxLife: 1.5
        };
        
        this.scene.add(mesh);
        this.floatingTexts.push(mesh);
        
        return mesh;
    }
    
    /**
     * Update floating texts
     */
    updateFloatingTexts(delta) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.position.add(text.userData.velocity.clone().multiplyScalar(delta));
            text.userData.life -= delta;
            
            // Fade out
            text.material.opacity = text.userData.life / text.userData.maxLife;
            
            if (text.userData.life <= 0) {
                this.scene.remove(text);
                this.floatingTexts.splice(i, 1);
            }
        }
    }
    
    /**
     * Create particle effect
     */
    createParticles(position, color, count, lifetime, spread, gravity = true) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions.push(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread
            );
            
            velocities.push(
                (Math.random() - 0.5) * 100,
                Math.random() * 100,
                (Math.random() - 0.5) * 100
            );
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: 2,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(position);
        particles.userData = {
            velocities: velocities,
            life: lifetime,
            maxLife: lifetime,
            gravity: gravity
        };
        
        this.scene.add(particles);
        this.particles.push(particles);
        
        return particles;
    }
    
    /**
     * Update particles
     */
    updateParticles(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= delta;
            
            // Apply gravity
            if (p.userData.gravity) {
                for (let j = 0; j < p.userData.velocities.length; j += 3) {
                    p.userData.velocities[j + 1] -= 9.8 * 100 * delta; // gravity
                }
            }
            
            // Update positions
            const positions = p.geometry.attributes.position.array;
            for (let j = 0; j < positions.length; j += 3) {
                positions[j] += (p.userData.velocities[j] * delta) / 1000;
                positions[j + 1] += (p.userData.velocities[j + 1] * delta) / 1000;
                positions[j + 2] += (p.userData.velocities[j + 2] * delta) / 1000;
            }
            p.geometry.attributes.position.needsUpdate = true;
            
            // Fade out
            p.material.opacity = 0.8 * (p.userData.life / p.userData.maxLife);
            
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * Spawn explosion visual effect
     */
    spawnExplosionVisual(position, color, radius) {
        this.createParticles(position, color, 30, 0.5, radius, true);
    }
    
    /**
     * Spawn glow effect
     */
    spawnGlowEffect(color) {
        // Create a glowing sphere effect at player position
        const particles = this.createParticles(
            new THREE.Vector3(0, 10, 0),
            color,
            20,
            0.8,
            15,
            false
        );
        return particles;
    }
    
    /**
     * Flash screen with color
     */
    flashScreen(color) {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = color;
        flash.style.opacity = '0.5';
        flash.style.zIndex = '999';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            flash.style.transition = 'opacity 0.3s';
            setTimeout(() => flash.remove(), 300);
        }, 100);
    }
}

// Global instance
let animationManager = null;
