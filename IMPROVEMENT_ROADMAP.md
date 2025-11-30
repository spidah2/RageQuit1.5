# 🚀 RAGEQUIT 1.5 - IMPROVEMENT ROADMAP
**Priority-Based Action Plan**

---

## FASE 1: CRITICAL FIXES (2-3 ore)

### 1.1 Fix Memory Leaks
**Files:** spells.js, game.js  
**Changes:**
```javascript
// spells.js - Add at top
const MAX_FLOATING_TEXTS = 20;
const MAX_LOG_ENTRIES = 50;

// In createFloatingText():
if (floatingTexts.length >= MAX_FLOATING_TEXTS) {
    const oldest = floatingTexts.shift();
    scene.remove(oldest.mesh);
}

// In addToLog():
const log = document.getElementById('log');
while (log.children.length >= MAX_LOG_ENTRIES) {
    log.lastChild.remove();
}
```

### 1.2 Fix XSS Vulnerability
**File:** game.js (addChatMessage)  
**Change:**
```javascript
// BEFORE (Unsafe):
chatContainer.innerHTML += `<div>${username}: ${message}</div>`;

// AFTER (Safe):
const msgDiv = document.createElement('div');
const userSpan = document.createElement('span');
userSpan.className = 'username';
userSpan.textContent = username + ': ';

const textSpan = document.createElement('span');
textSpan.className = 'message-text';
textSpan.textContent = message;

msgDiv.appendChild(userSpan);
msgDiv.appendChild(textSpan);
chatContainer.appendChild(msgDiv);
```

### 1.3 Remove Dead Code
**File:** world.js  
**Action:** Delete these functions (never called):
- Line 159: `createHealingTemple()`
- Line 230: `createArenaWalls()` (already commented out)
- Line 279: `createPillar()`
- Line 312: `createFantasyHouse()`
- Line 336: `createTrainingDummy()`

**File:** game.js  
**Action:** Remove unused variables (line 38-40):
```javascript
// DELETE these:
let isSpectating = false;
let spectateTarget = null;
let spectateIndex = 0;
```

### 1.4 Add Error Handling
**File:** game.js - animate() function  
**Change:**
```javascript
function animate() {
    try {
        requestAnimationFrame(animate);
        // ... existing code ...
    } catch (error) {
        logGame(`FATAL ERROR in game loop: ${error.message}`, 'GAME', 'ERROR');
        console.error('[GAME] Animation loop crashed:', error);
        // Optionally: attempt recovery or show error screen
    }
}
```

### 1.5 Fix Spell Cost Lookup
**File:** spells.js line 71  
**Action:** Update config.js SPELL_PARAMS to include:
```javascript
// In config.js SPELL_PARAMS section, add:
SPELL_COSTS: {
    1: 5,     // MISSILE/BOLT
    2: 15,    // BEGONE/SHOCKWAVE
    3: 20,    // FIREBALL
    4: 5      // IMPALE
}

// Then in spells.js, replace:
let cost = (id===1)?GAME_CONFIG.SPELL_COSTS[1]:(id===2)?...:...;
// WITH:
let cost = GAME_CONFIG.SPELL_PARAMS.SPELL_COSTS[id] || 0;
```

---

## FASE 2: MISSING ASSETS (CRITICAL - 4-8 ore depending on model sources)

### 2.1 3D Model Sources (Free/Cheap)
1. **Sketchfab** (sketchfab.com) - Free under CC License
   - Search: "staff 3d model", "sword", "bow", "shield"
   - Download .glb format
   
2. **TurboSquid Free** (turbosquid.com)
   - Limited free models but high quality
   
3. **BlenderKit** (blenderkit.org)
   - Hundreds of free assets
   - Export to .glb

4. **OpenGameArt** (opengameart.org)
   - Game-specific assets (spells, weapons)
   - Always licensed for games

5. **Quaternius** (quaternius.com)
   - Low-poly game assets (best for this art style)
   - FREE and game-friendly

### 2.2 Models Needed (Priority Order)
| Model | Use | Source | Estimated Size |
|-------|-----|--------|-----------------|
| **staff.glb** | Ranged weapon | Sketchfab | 1-3 MB |
| **sword.glb** | Melee weapon | Sketchfab | 1-2 MB |
| **player.glb** | Main character | Sketchfab | 2-5 MB |
| **enemy.glb** | NPC character | Sketchfab | 2-5 MB |
| **bow.glb** | Bow weapon | Sketchfab | 1-2 MB |
| **shield.glb** | Defense | Sketchfab | 1-2 MB |
| **fireball.glb** | Spell effect | Sketchfab | 0.5-1 MB |
| **missile.glb** | Bolt projectile | Sketchfab | 0.5-1 MB |

### 2.3 How to Add Models
**Step 1:** Download .glb files to `public/models/`

**Step 2:** Update `player.js` loadPlayerModel():
```javascript
async function loadPlayerModel() {
    try {
        const gltf = await loader.loadAsync('/models/player.glb');
        const model = gltf.scene;
        // Setup animations, scale, etc.
        return model;
    } catch (error) {
        console.error('Failed to load player model:', error);
        // Fallback to geometric placeholder
        return createFallbackPlayerMesh();
    }
}
```

**Step 3:** Update weapon loading in `toggleWeapon()`:
```javascript
async function loadWeaponModels() {
    const staffModel = await loader.loadAsync('/models/staff.glb');
    const swordModel = await loader.loadAsync('/models/sword.glb');
    const bowModel = await loader.loadAsync('/models/bow.glb');
    // Store in global scope for reuse
}
```

---

## FASE 3: ARCHITECTURE IMPROVEMENTS (3-4 ore)

### 3.1 DOM Selector Caching
**File:** game.js - Add at initialization:
```javascript
// Cache all frequently used DOM elements
const DOM_CACHE = {
    // Stats display
    hpValue: document.getElementById('hp-value'),
    manaValue: document.getElementById('mana-value'),
    staminaValue: document.getElementById('stamina-value'),
    
    // Action bar
    slot1: document.getElementById('slot-1'),
    slot2: document.getElementById('slot-2'),
    slot3: document.getElementById('slot-3'),
    slot4: document.getElementById('slot-4'),
    
    // Cooldown overlays
    spikesCD: document.getElementById('spikes-cd'),
    healCD: document.getElementById('heal-cd'),
    
    // UI containers
    log: document.getElementById('log'),
    chat: document.getElementById('chat-container'),
    blockText: document.getElementById('block-text'),
    
    // Utility
    castBar: document.getElementById('cast-bar-container'),
    castFill: document.getElementById('cast-bar-fill'),
    castText: document.getElementById('cast-text')
};

// Then replace all:
document.getElementById('hp-value').textContent = ...;
// WITH:
DOM_CACHE.hpValue.textContent = ...;
```

### 3.2 Feature Completion Checklist
#### Spectator Mode - Option A: Implement (4 hours)
```javascript
// In socketHandlers.js add:
function startSpectating(targetPlayerId) {
    isSpectating = true;
    spectateTarget = otherPlayers[targetPlayerId];
    
    // Follow target player
    camera.position.copy(spectateTarget.mesh.position).add(new THREE.Vector3(0, 5, -10));
    camera.lookAt(spectateTarget.mesh.position);
}

function updateSpectator() {
    if (!isSpectating || !spectateTarget) return;
    
    // Smooth camera follow
    const targetPos = spectateTarget.mesh.position.clone().add(new THREE.Vector3(0, 5, -10));
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(spectateTarget.mesh.position);
}
```

#### Spectator Mode - Option B: Remove (15 minutes)
- Delete `isSpectating`, `spectateTarget`, `spectateIndex` variables
- Remove from updateUI() cooldown display

#### PvE Mode - Option A: Implement (6 hours)
- Would require AIMonster class extending Player
- Implement pathfinding (A* or simpler grid-based)
- Hook into existing spell system

#### PvE Mode - Option B: Remove (15 minutes)
- Delete `isPvEMode` flag
- Remove from team selection screen

### 3.3 Cache Audio Context
**File:** game.js & menu.js  
**Problem:** Both create separate AudioContexts  
**Solution:**
```javascript
// Create global audioManager.js
class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.volume = 0.5;
    }
    
    static getInstance() {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }
    
    playSound(frequency, duration, volume = this.volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // ... setup ...
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}

// Then use everywhere:
const audioMgr = AudioManager.getInstance();
audioMgr.playSound(440, 0.1);
```

---

## FASE 4: OPTIONAL ENHANCEMENTS (Lower Priority)

### 4.1 Add Debug Panel
```javascript
// Create debug-panel.js
const DEBUG_PANEL = {
    enabled: false,
    
    toggle() {
        this.enabled = !this.enabled;
        document.getElementById('debug-panel').style.display = this.enabled ? 'block' : 'none';
    },
    
    update() {
        if (!this.enabled) return;
        
        const panel = document.getElementById('debug-panel');
        panel.innerHTML = `
            <div>FPS: ${currentFPS}</div>
            <div>Ping: ${currentPing}ms</div>
            <div>Players: ${Object.keys(otherPlayers).length}</div>
            <div>Projectiles: ${projectiles.length}</div>
            <div>Particles: ${particles.length}</div>
            <div>Floating Texts: ${floatingTexts.length}</div>
            <div>HP: ${playerStats.hp}/${playerStats.maxHp}</div>
            <div>Mana: ${playerStats.mana}/${playerStats.maxMana}</div>
            <div>Stamina: ${playerStats.stamina}/${playerStats.maxStamina}</div>
        `;
    }
};

// Toggle with F12 key
window.addEventListener('keydown', (e) => {
    if (e.key === 'F12') DEBUG_PANEL.toggle();
});
```

### 4.2 Add Replay System
```javascript
// Simple recording - record all socket events
const gameRecorder = {
    events: [],
    recording: false,
    startTime: 0,
    
    start() {
        this.recording = true;
        this.startTime = Date.now();
        this.events = [];
    },
    
    record(eventName, data) {
        if (!this.recording) return;
        
        this.events.push({
            timestamp: Date.now() - this.startTime,
            event: eventName,
            data: data
        });
    },
    
    save() {
        const json = JSON.stringify(this.events);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `replay_${Date.now()}.json`;
        a.click();
    }
};
```

### 4.3 Add Match Statistics Dashboard
```javascript
// Detailed stats tracking
const matchAnalytics = {
    kills: 0,
    deaths: 0,
    damageDealt: 0,
    damageReceived: 0,
    healingDone: 0,
    spellsHit: 0,
    spellsMissed: 0,
    
    getAccuracy() {
        const total = this.spellsHit + this.spellsMissed;
        return total === 0 ? 0 : (this.spellsHit / total * 100).toFixed(1);
    },
    
    getKDA() {
        const deaths = this.deaths || 1;
        const assists = 0; // Would track team damage
        return ((this.kills + assists) / deaths).toFixed(2);
    },
    
    display() {
        return `
            <h2>Match Statistics</h2>
            <p>Kills: ${this.kills}</p>
            <p>Deaths: ${this.deaths}</p>
            <p>K/D: ${this.getKDA()}</p>
            <p>Damage: ${this.damageDealt}</p>
            <p>Healing: ${this.healingDone}</p>
            <p>Accuracy: ${this.getAccuracy()}%</p>
        `;
    }
};
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Week 1: Critical Fixes + Assets
- [ ] Fix memory leaks (floating texts, log)
- [ ] Fix XSS vulnerability
- [ ] Remove dead code
- [ ] Add try-catch to animate()
- [ ] Download/Create 3D models
- [ ] Add models to public/models/
- [ ] Update model loaders
- [ ] Test in browser

### Week 2: Architecture
- [ ] Cache DOM selectors
- [ ] Complete or remove Spectator mode
- [ ] Complete or remove PvE mode
- [ ] Fix spell cost lookup
- [ ] Create AudioManager singleton
- [ ] Test all features

### Week 3: Polish
- [ ] Add debug panel
- [ ] Implement replay system
- [ ] Add match statistics
- [ ] Performance optimization
- [ ] Full playtesting

---

## 🎯 SUCCESS METRICS

After implementing FASE 1-2:
- ✅ No memory leaks (constant memory usage over 1 hour)
- ✅ All assets visible (weapons, spells, models)
- ✅ No XSS vulnerabilities
- ✅ Clean codebase (dead code removed)
- ✅ Stable gameplay (no crashes)
- ✅ FPS: 60+ on modern hardware

---

**Version:** 1.0  
**Created:** November 30, 2025  
**Status:** Ready to implement
