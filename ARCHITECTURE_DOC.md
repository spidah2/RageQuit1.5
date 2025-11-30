# RageQuit 1.5 - Architecture Documentation
## "The Bible" for Future Development

**Last Updated:** November 30, 2025  
**Version:** 2.1 (Post-Refactoring)  
**Status:** Production-Ready with Modular Architecture

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Core Modules](#core-modules)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Adding New Maps](#adding-new-maps)
5. [Adding New Skins](#adding-new-skins)
6. [Server-Client Protocol](#server-client-protocol)
7. [Asset Management](#asset-management)
8. [Game State Management](#game-state-management)

---

## System Overview

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ Three.js Scene │  │ AssetManager │  │ Socket.IO      │   │
│  │  (Rendering)   │  │ (Assets)     │  │ (Network)      │   │
│  └────────────────┘  └──────────────┘  └────────────────┘   │
│                                                               │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ GameState      │  │ Event System │  │ Socket Handlers│   │
│  │ Manager        │  │ (Passive)    │  │ (Validators)   │   │
│  └────────────────┘  └──────────────┘  └────────────────┘   │
└────────────────────────┬─────────────────────────────────────┘
                         │ WebSocket
                         │ (JSON events)
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                     SERVER LAYER                             │
│  ┌────────────────┐  ┌──────────────┐                       │
│  │ GameStateManager   │ Match Logic    │                       │
│  │ (Authority)    │  │ (Core Game)    │                       │
│  └────────────────┘  └──────────────┘                       │
│                                                               │
│  Validates:                                                 │
│  ✓ Hit distance (no wallhacks)                              │
│  ✓ Friendly fire (no fragging teammates)                    │
│  ✓ Damage values (spell config matches)                     │
│  ✓ Kill tracking (accurate leaderboard)                     │
│  ✓ HP updates (health state authority)                      │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**
   - LOGIC: player.js, game.js, spells.js
   - RENDERING: AssetManager.js, Three.js
   - STATE: GameStateManager.js (server + client)

2. **Server Authority**
   - Client NEVER predicts damage
   - Server is SINGLE SOURCE OF TRUTH
   - Client displays what server validates

3. **Modularity**
   - Each config file = easy to extend
   - Each manager = easy to replace
   - Each asset = easy to substitute

4. **No Hardcoding**
   - All spawn points → WorldConfig
   - All spell parameters → GameConfig
   - All asset creation → AssetManager

---

## Core Modules

### 1. **WorldConfig.js** (`public/js/config/WorldConfig.js`)

**Responsibility:** Static world data (spawn zones, map bounds, decorations)

**Key Exports:**
```javascript
WORLD_CONFIG = {
    SPAWN_ZONES: {
        red: { center: {x, z}, variance, color },
        black: { center: {x, z}, variance, color },
        green: { center: {x, z}, variance, color },
        purple: { center: {x, z}, variance, color }
    },
    HEALING_TOTEM: { position: {x, y, z}, radius },
    MAP_BOUNDS: { DEATH_PLANE_Y, GROUND_LEVEL },
    ARENA: { platform_radius, wall_dimensions }
}
```

**Usage:**
```javascript
// In player.js getSpawnPosition()
const spawn = WORLD_CONFIG.SPAWN_ZONES[myTeam];

// In player.js healing check
if (dist < WORLD_CONFIG.HEALING_TOTEM.radius) {
    // heal player
}
```

**To Add New Map:**
1. Add new map definition:
   ```javascript
   WORLD_CONFIG.MAPS = {
       'team-arena': { spawn_zones, healing_totem, bounds },
       'deathmatch': { spawn_zones, healing_totem, bounds }
   }
   ```
2. Update asset creation in AssetManager

---

### 2. **GameConfig.js** (`public/js/config/GameConfig.js`)

**Responsibility:** All gameplay parameters (spell costs, damage, team colors)

**Key Exports:**
```javascript
GAME_CONFIG = {
    TEAM_COLORS: { red: 0x..., black: 0x..., ... },
    SPELL_COSTS: [0, stamina1, stamina2, ... ],
    SPELL_CAST_TIMES: [0, time1, time2, ... ],
    SPELL_PARAMS: {
        MISSILE: { speed, damage, radius },
        FIREBALL: { speed, damage, radius, splash },
        // ... 6 more spells
    }
}
```

**Usage in spells.js:**
```javascript
case GAME_CONFIG.SPELLS.MISSILE:
    const dmg = GAME_CONFIG.SPELL_PARAMS.MISSILE.damage;
    socket.emit('playerAttack', { damage: dmg });
    break;
```

**To Add New Spell:**
1. Add spell to `GAME_CONFIG.SPELL_PARAMS`
2. Implement client visual in `spells.js`
3. Implement server validation in `GameStateManager`
4. Spell is AUTOMATICALLY available to all clients

---

### 3. **GameStateManager.js** (Server: `server/GameStateManager.js`)

**Responsibility:** Server-side game state authority

**Key Methods:**
```javascript
// Hit validation - ALWAYS called before damage applies
validateAndApplyHit(shooterId, targetId, spellData) {
    // Checks:
    // 1. Is target within spell range?
    // 2. Is it friendly fire? (same team?)
    // 3. Are resources correct?
    // 4. Is cooldown respected?
    // Returns: {success, damage, targetHp, killConfirmed}
}

// Kill tracking
_recordKill(killerId, victimTeam) {
    // Increments: playerKills[killerId]++, teamKills[victimTeam]++
}

// Match stats broadcast
getMatchStats() {
    return {playerKills, teamKills, matchPhase, duration}
}

// Healing application
applyHealing(targetId, amount) {
    // Updates HP, broadcasts updateHealth event
}
```

**Flow:**
```
Client shoots spell
    ↓
server.on('playerAttack', data) {
    const result = gameStateManager.validateAndApplyHit(...);
    if (result.success) {
        // Broadcast to victim: updateHealth event
        io.to(victimId).emit('updateHealth', {hp: result.targetHp});
        
        // Broadcast to everyone: matchStats event
        io.emit('matchStats', gameStateManager.getMatchStats());
    }
})
```

---

### 4. **GameStateManager.js** (Client: `public/js/GameStateManager.js`)

**Responsibility:** Client-side passive cache of game state

**Key Methods:**
```javascript
// ONLY called when server sends updateHealth
updateHealth(targetId, newHp) {
    this.playerStats.hp = newHp;  // NEVER predict
    updateUI();
}

// ONLY called when server sends matchStats
updateFromMatchStats(playerKills, teamKills) {
    this.playerKills = playerKills;  // Cache server data
    this.teamKills = teamKills;
    updateKillCounter();
}

// Record local player death (server-confirmed)
recordDeath() {
    this.myDeaths++;
}
```

**Critical Design:**
```
Client CANNOT modify this.playerStats directly.
ONLY server events can update it.
This prevents desync and client-side hacking.
```

---

### 5. **AssetManager.js** (`public/js/AssetManager.js`)

**Responsibility:** ALL visual assets (models, textures, maps)

**Key Methods:**
```javascript
// Create player mesh for a team color
getPlayerMesh(teamColor, skinId = 'default') {
    // Returns THREE.Group with:
    // - Head, torso, chest, arms, legs
    // - Materials already applied
    // - Ready to add to scene
}

// Load entire map
loadMap(mapId = 'team-arena') {
    // Creates:
    // - Floor with procedural texture
    // - Team spawn zones
    // - Central platform
    // - Trees and obstacles
}

// Update player mesh colors
updatePlayerColor(playerMesh, newColor) {
    // Traverses mesh and updates armor materials
}

// Create weapon meshes
getSwordMesh() {
    // Returns sword Group for animations
}
```

**Cache System:**
```javascript
this.cache = {
    playerMeshes: {},  // Template meshes for each color+skin
    materials: {},      // Reusable materials
    geometries: {}      // Shared geometries
}
```

**Design Principle:**
```
AssetManager.getPlayerMesh() returns complete 3D model.
player.js NEVER touches mesh creation directly.

If tomorrow you replace model with GLB:
    Only change: AssetManager.getPlayerMesh()
    All other files: UNCHANGED
```

---

## Data Flow Architecture

### Attack Flow: Input → Validation → Display

#### Step 1: Client Input (Instant Visual Feedback)

**File:** `public/js/spells.js`

```javascript
function castSpell(spellId) {
    // 1. Play particle effect IMMEDIATELY (game feel)
    spawnParticles(origin, color, count);
    
    // 2. Play sound effect IMMEDIATELY
    playSound('spell_cast');
    
    // 3. Consume resources LOCALLY (stamina, mana)
    playerStats.stamina -= GAME_CONFIG.SPELL_COSTS[spellId];
    
    // 4. Send input to server (NOT damage calculation)
    socket.emit('playerAttack', {
        spellId: spellId,
        targetId: targetId,
        origin: {x, y, z},
        direction: {x, y, z}
    });
    // NOTE: NO damage calculation happens here
    // NO target.hp modification
    // Just: send input + visual feedback
}
```

#### Step 2: Server Validation (Authority)

**File:** `server.js` and `server/GameStateManager.js`

```javascript
io.on('playerAttack', (data) => {
    const result = gameStateManager.validateAndApplyHit(
        socket.id,              // shooter ID
        data.targetId,          // victim ID
        {damage: data.damage, spellId: data.spellId}
    );
    
    // validateAndApplyHit checks:
    // 1. Is target within spell range?
    // 2. Is target alive?
    // 3. Is it NOT friendly fire?
    // 4. Are cooldowns respected?
    // 5. Is spell valid for this team?
    
    if (result.success) {
        // Broadcast new HP to victim
        io.to(result.targetId).emit('updateHealth', {
            id: result.targetId,
            hp: result.targetHp
        });
        
        // Check if target died
        if (result.targetHp <= 0) {
            io.emit('playerDied', {
                id: result.targetId,
                killerId: socket.id
            });
            
            // Increment kill count
            gameStateManager._recordKill(socket.id, victimTeam);
        }
        
        // Broadcast updated match stats to all
        io.emit('matchStats', gameStateManager.getMatchStats());
    } else {
        // Hit rejected (wallhack attempt, friendly fire, etc.)
        io.to(socket.id).emit('hitRejected', {reason: result.message});
    }
});
```

#### Step 3: Client UI Update (Server-Authoritative)

**File:** `public/js/socketHandlers.js`

```javascript
// CRITICAL: HP ONLY updated when server sends it
socket.on('updateHealth', (data) => {
    // PASSIVE: Just display what server sent
    gameStateManager.updateHealth(data.id, data.hp);
    
    // Update UI
    if (data.id === myId) {
        updateUI();  // Update own HP bar
    } else {
        updateEnemyHealthBar(otherPlayers[data.id], data.hp);
    }
});

// CRITICAL: Kill count ONLY updated when server sends it
socket.on('matchStats', (data) => {
    // PASSIVE: Cache server's authoritative data
    gameStateManager.updateFromMatchStats(
        data.playerKills,
        data.teamKills
    );
    
    // Update leaderboard UI
    updateKillCounter();
});

// CRITICAL: Death ONLY when server confirms
socket.on('playerDied', (data) => {
    // VISUAL effects only, NO state modification yet
    if (data.id === myId) {
        gameStateManager.recordDeath();  // Record in cache
        showDeathScreen();
    } else {
        // Enemy died - show death particles
        spawnParticles(otherPlayers[data.id].position, 0xff0000);
    }
});
```

### State Flow Diagram

```
TIME →

[Client]
T0: Cast spell
    ├─ Particles: IMMEDIATE ✓
    ├─ Sound: IMMEDIATE ✓
    └─ Send: playerAttack event

T1-50ms: Wait for server

[Server]
T50: Validate hit
    ├─ Check range, friendly fire, cooldown
    ├─ Apply damage
    ├─ Update HP
    └─ Broadcast: updateHealth event

[Client]
T51: Receive updateHealth
    ├─ Update: playerStats.hp
    ├─ Update: UI HP bar
    └─ Display: floating damage number

T52-T100: Server checks if dead

[Server]
T100: Victim dead → broadcast playerDied + matchStats

[Client]
T101: Receive playerDied + matchStats
    ├─ recordDeath() in GameStateManager
    ├─ Update kill counter
    └─ Show death particles
```

---

## Adding New Maps

### Complete Checklist

#### 1. Create Map Config in WorldConfig.js

```javascript
// public/js/config/WorldConfig.js

const WORLD_CONFIG = {
    // ... existing content ...
    
    MAPS: {
        'team-arena': {
            SPAWN_ZONES: { red: {...}, black: {...}, ... },
            HEALING_TOTEM: { position: {...}, radius: 40 },
            MAP_BOUNDS: { DEATH_PLANE_Y: 0, GROUND_LEVEL: 6 }
        },
        
        // NEW MAP ↓
        'deathmatch-arena': {
            SPAWN_ZONES: {
                red: { center: {x: -100, z: -100}, variance: 30 },
                black: { center: {x: 100, z: -100}, variance: 30 },
                green: { center: {x: -100, z: 100}, variance: 30 },
                purple: { center: {x: 100, z: 100}, variance: 30 }
            },
            HEALING_TOTEM: { position: {x: 0, y: 12.5, z: 0}, radius: 45 },
            MAP_BOUNDS: { DEATH_PLANE_Y: -10, GROUND_LEVEL: 10 }
        }
    }
};
```

#### 2. Create Map Loader in AssetManager

```javascript
// public/js/AssetManager.js

loadMap(mapId = 'team-arena') {
    if (mapId === 'team-arena') {
        this._loadTeamArena();
    } else if (mapId === 'deathmatch-arena') {
        this._loadDeathmatchArena();  // ← NEW
    } else {
        logGame(`Unknown map: ${mapId}`, 'ASSET', 'WARNING');
        this._loadTeamArena();  // Fallback
    }
}

_loadDeathmatchArena() {
    // Load floor texture
    const floorTexture = this._createFloorTexture();
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(1500, 1500),  // Different size
        new THREE.MeshStandardMaterial({map: floorTexture})
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    
    // Create custom obstacles
    // Add different decorations
    // Load custom spawn zones
    // etc.
}
```

#### 3. Update game.js to Use New Map

```javascript
// public/js/game.js in initGame()

const selectedMap = localStorage.getItem('selectedMap') || 'team-arena';
assetManager.loadMap(selectedMap);
```

#### 4. Test Map Loading

```javascript
// In browser console:
assetManager.loadMap('deathmatch-arena');
```

---

## Adding New Skins

### Complete Checklist

#### 1. Add Skin Config to GameConfig

```javascript
// public/js/config/GameConfig.js

GAME_CONFIG.SKINS = {
    'default': {
        torso_geo: new THREE.BoxGeometry(4.5, 6.5, 3),
        helmet_type: 'standard',
        armor_coverage: 'full'
    },
    'cyberpunk': {
        torso_geo: new THREE.BoxGeometry(4, 6, 3),  // Different proportions
        helmet_type: 'visor',
        armor_coverage: 'heavy',
        glow: true
    },
    'assassin': {
        torso_geo: new THREE.BoxGeometry(4, 6.5, 2.5),  // Slimmer
        helmet_type: 'hood',
        armor_coverage: 'light',
        speed_bonus: 1.1
    }
};
```

#### 2. Create Skin in AssetManager

```javascript
// public/js/AssetManager.js

getPlayerMesh(teamColor = 0x2c3e50, skinId = 'default') {
    const cacheKey = `${teamColor}_${skinId}`;
    if (this.cache.playerMeshes[cacheKey]) {
        return this.cache.playerMeshes[cacheKey].clone();
    }

    const playerGroup = new THREE.Group();
    const skinConfig = GAME_CONFIG.SKINS[skinId] || GAME_CONFIG.SKINS['default'];
    
    // Create components based on skin config
    const torso = new THREE.Mesh(skinConfig.torso_geo, armorMat);
    // ... assemble rest of mesh
    
    // Apply skin-specific properties
    if (skinConfig.glow) {
        torso.material.emissiveIntensity = 0.5;
    }
    
    // Cache template
    this.cache.playerMeshes[cacheKey] = playerGroup;
    return playerGroup;
}
```

#### 3. Update Player Creation

```javascript
// public/js/player.js

function createPlayer() {
    const teamColor = myTeamColor;
    const skinId = localStorage.getItem('selectedSkin') || 'default';
    
    playerMesh = assetManager.getPlayerMesh(teamColor, skinId);
    // ... rest of setup
}
```

#### 4. Test Skin

```javascript
// In browser console:
createPlayer();  // Uses selected skin
```

---

## Server-Client Protocol

### Core Socket Events

#### Client → Server

```javascript
// Player input
socket.emit('playerAttack', {
    spellId: number,
    targetId: string,
    origin: {x, y, z},
    direction: {x, y, z}
});

// Player movement (position sync)
socket.emit('playerMoved', {
    position: {x, y, z},
    rotation: {x, y, z}
});

// Team change request
socket.emit('changeTeam', {
    newTeam: 'red' | 'black' | 'green' | 'purple'
});

// Spell cast (for effect sync)
socket.emit('castSpell', {
    spellId: number,
    position: {x, y, z}
});
```

#### Server → Client

```javascript
// HP update (AUTHORITATIVE)
io.emit('updateHealth', {
    id: playerId,
    hp: newHp
});

// Kill notification
io.emit('playerDied', {
    id: victimId,
    killerId: shooterId
});

// Match stats (AUTHORITATIVE)
io.emit('matchStats', {
    playerKills: {playerId: count, ...},
    teamKills: {red: count, black: count, ...},
    matchPhase: 'active' | 'ended'
});

// Player joined
io.emit('newPlayer', {
    id: playerId,
    username: string,
    team: string,
    hp: number
});

// Enemy spell visual effect
io.emit('enemyAttacked', {
    id: shooterId,
    type: spellId,
    position: {x, y, z}
});
```

---

## Asset Management

### File Structure

```
public/
├── js/
│   ├── config/
│   │   ├── WorldConfig.js      ← Map data, spawn zones
│   │   └── GameConfig.js       ← Spell data, team colors
│   │
│   ├── AssetManager.js         ← CENTRAL: All asset creation
│   │
│   ├── player.js               ← LOGIC: HP, movement, physics
│   ├── game.js                 ← LOGIC: Game loop, main
│   ├── spells.js               ← LOGIC: Spell input, effects
│   │
│   ├── GameStateManager.js     ← PASSIVE: Client cache
│   ├── socketHandlers.js       ← EVENTS: Server validation
│   │
│   └── world.js                ← Uses AssetManager.loadMap()
│
└── models/
    ├── player.default.glb      ← Future: GLB models
    └── maps/
        └── deathmatch.glb      ← Future: Map models
```

### How to Replace Player Model with GLB

```javascript
// In AssetManager.getPlayerMesh()

if (skinId === 'custom') {
    // Load GLB instead of procedural
    const loader = new THREE.GLTFLoader();
    return new Promise((resolve) => {
        loader.load('models/player.default.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.color.setHex(teamColor);
                }
            });
            resolve(model);
        });
    });
}
```

---

## Game State Management

### Client State Structure

```javascript
// GameStateManager maintains ONLY what server sends

this.playerStats = {
    hp: 100,              // Updated by: updateHealth event
    maxHp: 100,
    mana: 100,            // Regenerated locally
    stamina: 100,         // Consumed locally, regenerated
    isDead: false         // Updated by: playerDied event
};

this.playerKills = {      // Updated by: matchStats event
    playerId1: 5,
    playerId2: 3,
    // ...
};

this.teamKills = {        // Updated by: matchStats event
    red: 10,
    black: 8,
    green: 5,
    purple: 2
};
```

### Server State Structure

```javascript
// GameStateManager (server) is SOURCE OF TRUTH

this.playerKills = {
    playerId1: 5,
    playerId2: 3,
    // ...
};

this.teamKills = {
    red: 10,
    black: 8,
    green: 5,
    purple: 2
};

this.matchStartTime = Date.now();
this.matchPhase = 'active' | 'paused' | 'ended';
```

### Key Principle

```
Server state is computed/stored.
Client state is cached/displayed.

NEVER modify client state directly.
ALWAYS wait for server confirmation.

Example WRONG:
    target.hp -= damage;  // ✗ Client predicts damage

Example CORRECT:
    socket.emit('playerAttack', {...});
    // Wait for:
    socket.on('updateHealth', (data) => {
        gameStateManager.updateHealth(data.id, data.hp);  // ✓
    });
```

---

## Testing Checklist

### Unit Testing

- [ ] AssetManager creates player meshes with correct colors
- [ ] AssetManager loads different map configurations
- [ ] GameStateManager validates hits correctly
- [ ] GameStateManager tracks kills accurately

### Integration Testing

- [ ] Client connects to server
- [ ] Spell cast triggers server validation
- [ ] Damage updates broadcast to all clients
- [ ] Kill counter synchronizes across clients
- [ ] Death respawns player correctly

### Functional Testing

- [ ] 4 players join game
- [ ] Each player can cast all 8 spells
- [ ] Damage is deducted from HP
- [ ] Kill counter increments
- [ ] Team scoreboard updates
- [ ] Leaving player disconnects cleanly

### Performance Testing

- [ ] AssetManager caching reduces memory usage
- [ ] Map loads without lag
- [ ] 4 concurrent players maintain 30+ FPS
- [ ] Network latency < 200ms acceptable

---

## Troubleshooting

### Issue: AssetManager is undefined

**Solution:**
```html
<!-- In index.html, ensure AssetManager loads first -->
<script src="./js/AssetManager.js"></script>
<script src="./js/player.js"></script>  <!-- Uses AssetManager -->
```

### Issue: Player model not visible

**Solution:**
```javascript
// In createPlayer(), verify:
playerMesh = assetManager.getPlayerMesh(teamColor);
scene.add(playerMesh);  // Must add to scene
playerMesh.position.copy(spawnPos);  // Must set position
```

### Issue: New skin not loading

**Solution:**
```javascript
// Verify in GameConfig.SKINS
GAME_CONFIG.SKINS['newskin'] = { ... };  // Exists?

// Verify in AssetManager.getPlayerMesh()
const skinConfig = GAME_CONFIG.SKINS[skinId] || GAME_CONFIG.SKINS['default'];
// Has fallback?
```

### Issue: Map not rendering

**Solution:**
```javascript
// Verify in WorldConfig
WORLD_CONFIG.MAPS['newmap'] = { ... };  // Exists?

// Verify in AssetManager.loadMap()
if (mapId === 'newmap') {
    this._loadNewmap();  // Method implemented?
}
```

---

## Future Roadmap

### Phase 1: Enhanced Visuals
- [ ] Import GLB character models
- [ ] Advanced spell effects (trails, impact)
- [ ] Terrain height maps

### Phase 2: New Content
- [ ] 5+ new maps
- [ ] 10+ skins per team
- [ ] Custom weapon skins

### Phase 3: Advanced Features
- [ ] Weapon loadouts (different spell combinations)
- [ ] Cosmetics (trails, particles)
- [ ] Progression system (levels, unlocks)

### Phase 4: Optimization
- [ ] GPU instancing for effects
- [ ] Mesh optimization for models
- [ ] Network compression for updates

---

## Key Files Reference

| File | Purpose | Modified |
|------|---------|----------|
| `WorldConfig.js` | Static map data | Step 1 |
| `GameConfig.js` | Spell & team data | Step 1 |
| `server/GameStateManager.js` | Server authority | Step 2 |
| `public/js/GameStateManager.js` | Client cache | Step 3 |
| `AssetManager.js` | Asset creation | Step 4 |
| `player.js` | Player logic | Step 4 |
| `world.js` | Map loading | Step 4 |
| `socketHandlers.js` | Event validation | Step 3 |

---

## Quick Start for New Developers

### To Add a New Spell:
1. Add to `GameConfig.SPELL_PARAMS`
2. Add visual in `spells.js` castSpell()
3. Add server validation in `GameStateManager.validateAndApplyHit()`

### To Add a New Map:
1. Add to `WorldConfig.MAPS`
2. Add loader in `AssetManager._load<MapName>()`
3. Add case in `AssetManager.loadMap()`

### To Add a New Skin:
1. Add to `GameConfig.SKINS`
2. Add creation in `AssetManager.getPlayerMesh()`
3. Test with `assetManager.getPlayerMesh(0xff0000, 'newskin')`

---

## Contact & Versions

**Current Version:** 2.1  
**Last Updated:** November 30, 2025  
**Status:** ✅ Production Ready

---

**This document is the single source of truth for RageQuit architecture.**  
**Refer here before making any major changes.**
