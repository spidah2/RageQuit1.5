# 🎨 RAGEQUIT 1.5 - 3D ASSET REQUIREMENTS SPECIFICATION

## Overview
This document specifies all 3D models, textures, and audio files needed to complete RageQuit 1.5 visual and audio experience.

---

## 🎮 CHARACTER MODELS

### Player Character (player.glb)
**Usage:** Main playable character visible in first-person and multiplayer  
**Requirements:**
- Humanoid rig with arms, legs, torso, head
- Height: ~2 units (Three.js scale)
- LOD levels: High (close), Medium (mid-distance)
- Animations: idle, walk, run, jump, attack, death
- Optional: facial rigging for expressions
- Format: .glb (binary GLTF)
- Size: 2-5 MB max

**Recommended Source:**
- Quaternius (quaternius.com) - Low-poly humanoid
- Sketchfab search: "character rig glb"
- License requirement: CC0 or CC-BY (game-friendly)

**Technical Notes:**
- Must have armor layer (customizable by team color)
- Arms should have separate identifiers for weapon attachment
- Skeleton bones: Root, Spine, Chest, LeftArm, RightArm, LeftLeg, RightLeg, Head

---

### Enemy/NPC Character (enemy.glb)
**Usage:** Other players on enemy teams, AI enemies  
**Requirements:**
- Same structure as player.glb
- Can be different silhouette to distinguish
- Same animation skeleton (for code compatibility)
- Format: .glb
- Size: 2-5 MB max

**Recommended Source:**
- Quaternius (different style)
- Sketchfab: "npc character glb"

---

## ⚔️ WEAPON MODELS

### Staff (staff.glb) - RANGED MODE
**Usage:** Displayed in ranged combat mode for magic spells  
**Requirements:**
- Length: 1.5-2 units
- Orb/crystal top for magical aesthetic
- Attachable to hand socket
- Emissive material for glow effect
- Format: .glb
- Size: 0.5-1 MB

**Visual Style:** Magical, glowing orb/crystal at top  
**Recommended Colors:** Blue/cyan glow (matches missile color)  
**Examples on Sketchfab:**
- Search: "magic staff glb" or "wizard staff"

**Technical Notes:**
- Origin point at hand grip (for attachment)
- Can have emissive map for glowing orb
- Smooth, curved design for magic feel

---

### Sword (sword.glb) - MELEE MODE
**Usage:** Melee combat weapon  
**Requirements:**
- Length: 1.0-1.3 units
- Handle + blade visible
- Sharp-looking design
- Format: .glb
- Size: 0.5-1 MB

**Visual Style:** Medieval/fantasy, steel look  
**Recommended Finishes:** Metallic silver blade, leather grip  
**Examples:**
- Sketchfab: "medieval sword glb"
- Quaternius: low-poly sword

**Technical Notes:**
- Origin at hilt (hand grip)
- Trail particle effect in combat (handled by code)
- Blade should look effective

---

### Bow (bow.glb) - BOW MODE
**Usage:** Arrow attacks  
**Requirements:**
- Drawn/ready position
- Visible arrow nocked
- Asymmetrical (left/right doesn't matter, can be mirrored)
- Format: .glb
- Size: 0.5-1 MB

**Visual Style:** Wooden/fantasy bow  
**Examples:**
- Sketchfab: "bow glb" or "archery bow"
- Quaternius: bow model

**Technical Notes:**
- Origin at bowstring/player hand
- Arrow should have bone or separate mesh for removal after shot

---

### Shield (shield.glb) - DEFENSIVE EQUIPMENT
**Usage:** Passive defense visual, optional equip slot  
**Requirements:**
- Round or kite shield design
- Attachable to forearm
- Format: .glb
- Size: 0.5-1 MB

**Visual Style:** Protective, sturdy  
**Recommended Colors:** Team-color customizable  
**Examples:**
- Sketchfab: "shield glb"
- Quaternius: shield model

**Technical Notes:**
- Origin at arm attachment point
- Can have team crest texture
- Emissive effect when blocking

---

## ✨ SPELL EFFECT MODELS

### Fireball (fireball.glb)
**Usage:** Fireball projectile visual  
**Requirements:**
- Sphere or spherical design
- Orange/yellow color
- Size: 0.3-0.5 units diameter
- Emissive glow
- Format: .glb
- Size: <0.5 MB

**Visual Style:** Blazing fire sphere  
**Recommended:**
- Simple sphere with fire texture
- Emissive map for glow
- Orange + yellow colors

**Technical Notes:**
- Should rotate/tumble during flight (handled by code)
- Trail particle effect (separate)
- Collision: code detects, visual explodes

---

### Missile (missile.glb) - BOLT
**Usage:** Magic missile projectile  
**Requirements:**
- Small pointed shape (arrow-like or energy bolt)
- Cyan/blue color
- Size: 0.2-0.3 units
- Emissive glow
- Format: .glb
- Size: <0.5 MB

**Visual Style:** Energy bolt, magical  
**Examples:**
- Quaternius: projectile model
- Sketchfab: "magic missile glb"

**Technical Notes:**
- Should point in direction of travel
- Glow trail behind it (particle effect)
- Fast-moving (code already handles physics)

---

### Impale Effect (impale_effect.glb) - STONE SPIKES
**Usage:** Stone spikes summoned at target location  
**Requirements:**
- Multiple spike geometry (3-8 spikes)
- Gray stone color
- Jagged, sharp appearance
- Temporary visual (2-3 seconds duration)
- Format: .glb
- Size: <0.5 MB

**Visual Style:** Emerging stone spikes  
**Recommended:**
- Create group of cone shapes
- Gray/brown colors
- Rough texture

**Technical Notes:**
- Can be simple cone geometry
- Spawned at impact point
- Auto-removed after duration (code handles)
- Scale: 1-1.5 units diameter at base

---

### Whirlwind Effect (whirlwind_effect.glb) - OPTIONAL
**Usage:** Melee whirlwind attack visual  
**Requirements:**
- Swirling spiral/vortex design
- WHITE color (matches particle effect)
- Temporary visual
- Format: .glb
- Size: <0.5 MB

**Visual Style:** Energy whirl  
**Alternatives:**
- Can use particle effect only (code already has 40-60 white particles)
- Model is optional enhancement

**Technical Notes:**
- Spawned at player position
- Duration: ~500ms
- Rotates around player Y axis

---

## 🎵 AUDIO FILES

### Game Sounds (Needed)
All formats: .wav or .mp3 (22050 Hz minimum, 44100 Hz recommended)

| Sound | Usage | Duration | Notes |
|-------|-------|----------|-------|
| **shoot_bolt.wav** | Missile/Arrow cast | 0.2-0.3s | Sharp, magical "pew" sound |
| **shoot_fire.wav** | Fireball/Spikes cast | 0.3-0.5s | Deep whoosh + spark sound |
| **swing_heavy.wav** | Sword swing | 0.3-0.4s | Metallic swoosh + impact |
| **whirlwind.wav** | Whirlwind activation | 0.5-0.7s | Spinning wind sound |
| **heal.wav** | Healing effect | 0.4-0.6s | Magical chime + sparkle |
| **hit.wav** | Damage taken | 0.2-0.3s | Impact thud |
| **jump.wav** | Jump/knockback | 0.1-0.2s | Light whoosh |

**Volume Levels:**
- shoot_bolt: 0.3 (light)
- shoot_fire: 0.4 (medium)
- swing_heavy: 0.35 (medium-light)
- whirlwind: 0.4 (medium)
- heal: 0.3 (gentle)
- hit: 0.25 (medium)
- jump: 0.2 (light)

**Recommended Sources:**
- freesound.org (free with account)
- zapsplat.com (free)
- soundbible.com (free)
- OpenGameArt.org (game assets)

---

### Music (Optional)

#### Menu Music (menu_music.wav)
**Usage:** Main menu background  
**Duration:** 60-120 seconds (loops)  
**Style:** Calm, atmospheric, fantasy  
**Current Status:** Synthesized in menu.js (can keep or replace)

#### Game Music (ingame_music.wav)
**Usage:** Combat background music  
**Duration:** 90-180 seconds (loops)  
**Style:** Epic, dynamic, battle theme  
**Current Status:** Currently missing (optional)

**Recommended Sources:**
- OpenGameArt.org (game music)
- incompetech.com (royalty-free)
- freepd.com (free download)

---

## 📁 FILE STRUCTURE

After collecting all assets, organize as:

```
public/
├── models/
│   ├── player.glb              (2-5 MB)
│   ├── enemy.glb               (2-5 MB)
│   ├── staff.glb               (0.5-1 MB)
│   ├── sword.glb               (0.5-1 MB)
│   ├── bow.glb                 (0.5-1 MB)
│   ├── shield.glb              (0.5-1 MB)
│   ├── fireball.glb            (<0.5 MB)
│   ├── missile.glb             (<0.5 MB)
│   ├── impale_effect.glb       (<0.5 MB)
│   └── whirlwind_effect.glb    (<0.5 MB - optional)
│
└── audio/
    ├── sounds/
    │   ├── shoot_bolt.mp3      (100-200 KB)
    │   ├── shoot_fire.mp3      (100-200 KB)
    │   ├── swing_heavy.mp3     (100-200 KB)
    │   ├── whirlwind.mp3       (100-200 KB)
    │   ├── heal.mp3            (100-200 KB)
    │   ├── hit.mp3             (50-100 KB)
    │   └── jump.mp3            (50-100 KB)
    │
    └── music/
        ├── menu_music.mp3      (optional)
        └── ingame_music.mp3    (optional)
```

**Total Size Estimate:**
- Models: 15-20 MB
- Audio: 1-2 MB
- **Grand Total: ~20-25 MB** (acceptable for web game)

---

## 🔧 IMPLEMENTATION CHECKLIST

### Step 1: Obtain Models
- [ ] Find/download player.glb
- [ ] Find/download enemy.glb
- [ ] Find/download staff.glb
- [ ] Find/download sword.glb
- [ ] Find/download bow.glb
- [ ] Find/download shield.glb
- [ ] Find/download fireball.glb
- [ ] Find/download missile.glb
- [ ] Find/download impale_effect.glb

### Step 2: Organize Files
- [ ] Create `public/models/` directory
- [ ] Create `public/audio/sounds/` directory
- [ ] Move all .glb files to models/
- [ ] Move all .mp3/.wav to audio/sounds/

### Step 3: Update Code
- [ ] Update player.js loadPlayerModel() function
- [ ] Update enemy model loading in socketHandlers.js
- [ ] Update weapon model loading in toggleWeapon()
- [ ] Update spellvisuals in spells.js (fireball, missile, etc.)
- [ ] Add audio file references in playSound() function

### Step 4: Test
- [ ] Load game and verify all models render
- [ ] Test weapon switching (staff → sword → bow)
- [ ] Test spell casting (check projectile visuals)
- [ ] Test melee combat (see sword, whirlwind effects)
- [ ] Test multiplayer (see enemy models)
- [ ] Test audio playback

### Step 5: Optimize (Optional)
- [ ] Compress model file sizes
- [ ] Create LOD versions for distance rendering
- [ ] Generate mipmaps for textures
- [ ] Profile performance (FPS on target hardware)

---

## 🎯 PRIORITY LEVELS

**MUST HAVE (Game unplayable without):**
1. player.glb
2. enemy.glb
3. staff.glb
4. sword.glb
5. bow.glb
6. fireball.glb
7. missile.glb

**SHOULD HAVE (Significantly improves feel):**
8. shield.glb
9. impale_effect.glb
10. Audio sounds (all 7)

**NICE TO HAVE (Polish):**
11. whirlwind_effect.glb
12. Menu music
13. Game music

---

## 📊 ASSET QUALITY EXPECTATIONS

### Visual Style Consistency
- Should fit together aesthetically (no mixing realistic + cartoon)
- Suggested: Low-poly or stylized (matches code's simple geometry world)
- NOT photorealistic (would be inconsistent)

### Technical Requirements
- All models: GLTF 2.0 format (.glb binary)
- Textures: Embedded in .glb (no separate texture files)
- Scale: Humanoid = 1.8 units tall (code expects this)
- Rigging: Standard humanoid bones (if animated)

### Performance
- Per-model polygon count: <50K triangles
- Texture resolution: 1024x1024 max per asset
- Expected FPS: 60+ at 1080p with all models loaded

---

## 🔗 QUICK LINKS

**Best Sources for Free Game Assets:**
- **Quaternius** (quaternius.com) - Low-poly game assets ⭐
- **Sketchfab** (sketchfab.com) - Massive model library (filter CC-BY)
- **OpenGameArt** (opengameart.org) - Game-specific assets
- **TurboSquid Free** (turbosquid.com) - High-quality free models
- **BlenderKit** (blenderkit.org) - Blender ecosystem models

**Best Sources for Game Audio:**
- **freesound.org** - Sound effects (free with account)
- **zapsplat.com** - Royalty-free effects
- **OpenGameArt** - Game music and effects
- **incompetech.com** - Royalty-free game music

---

**Status:** Asset specification complete  
**Last Updated:** November 30, 2025  
**Next Step:** Acquire models and integrate into game
