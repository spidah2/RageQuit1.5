# RageQuit Changelog

## [3.0] - 2025-11-30

### Major Changes
- **Complete Graphics Pipeline Standardization**: THREE.js r128 now the official standard
- **Unified Character System**: All teams use identical geometry with color variation only
- **Complete Code Cleanup & Bug Fixes**: ReferenceErrors eliminated, all functions properly exposed
- **Server-Authoritative Hit Validation**: Improved collision detection and hitbox tuning

### New Features
✨ **Improved Spell System**
- Spell spawn height increased to prevent hitting ground when aiming straight
- Arrow (type 5) hitbox expanded from 15 to 25 units for better hit detection
- Missile, Begone, Arrow: +0.8 unit height offset
- Fireball: +1.5 unit height offset (maintained)
- Impale: +0.8 unit height offset

✨ **Audio System**
- Browser autoplay policy support: Music now plays after first user interaction
- Supports both click and keydown triggers
- Eliminates "NotAllowedError: play() failed" crashes

✨ **Character Animation**
- All teams (Black, Green, Red) now use standardized armor model
- Consistent animations across all teams
- T-pose and positioning glitches completely eliminated

### Bug Fixes
🐛 **Critical ReferenceErrors**
- Fixed: `addFloatingText is not defined` error in socketHandlers.js
  - Function was named `createFloatingText`, now exposed as both names
  - Added backwards compatibility alias

🐛 **Global Function Access**
- Exposed `logGame()` function globally
- Exposed `distance3D()` utility globally
- Exposed `createFloatingText()` globally
- All utilities now accessible from any file

🐛 **Graphics & Rendering**
- Removed deprecated `renderer.gammaOutput` property
- Changed to modern `renderer.outputEncoding = THREE.sRGBEncoding`
- Removed `flatShading: true` from all materials (12 locations)
- Eliminated black screen and texture loading issues

🐛 **Game State Management**
- GameStateManager properly initialized and linked to player objects
- Hit validation centralized on server side
- Increased HIT_VALIDATION_DISTANCE from 15 to 25 units for better projectile detection

### Technical Improvements
- Code bonification: Removed unused code paths and standardized naming conventions
- AssetManager simplified: Removed 46-line switch/case statement in getPlayerMesh()
- All player skins consolidated to use `_createStandardArmorMesh(teamColor)`
- Complete THREE.js version stability (no more r170 fallback attempts)

### Known Working Features
✅ Multiplayer gameplay with 2+ players  
✅ Team-based combat (Black, Green, Red)  
✅ All 5 spell types: Missile, Begone, Fireball, Impale, Arrow  
✅ Melee combat with sword  
✅ PvE mode with AI monsters  
✅ Health/Mana system with regeneration  
✅ Kill counter and score tracking  
✅ Team respawn system  
✅ First-person armor hiding  
✅ Menu with music autoplay support  

### Performance
- Unified geometry reduces memory footprint
- Simplified asset loading pipeline
- Server-side hit validation prevents client-side exploits
- Optimized console logging with categorized messages

### Developer Notes
- All functions must be exported to `window` object for cross-file access
- CommonJS `module.exports` alone is not sufficient in browser environment
- GameStateManager must be instantiated before players connect
- Hit validation distance tuned for thin projectiles (arrows, bolts)

### From Previous Version (v2.0)
- All v2.0 features maintained and improved
- Previous bugs fixed without breaking existing functionality
- Migration from v2.0 is seamless (no database changes)

---

## [2.0] - 2025-11-15
- Final session updates - all spell and team systems fully functional
- GameStateManager implementation for centralized game state
- Asset Manager refactoring with decoupled rendering logic
- Server-authoritative event system

---

## [1.2.3] - Initial Release
- Base multiplayer arena gameplay
- Multiple spell system
- Team-based combat
- PvE mode support

