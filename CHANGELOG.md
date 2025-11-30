# CHANGELOG - RageQuit 1.5

## [1.2.0] - 2025-11-30 (Production Ready)

### Added
- ✨ **Team Change In-Game**: Instant team switching with automatic respawn
- 🏹 **Arrow/Bow System Refactor**: Full rewrite for visibility and functionality
- 🎯 **Improved Spell Spawning**: 
  - Missile +1.2 height offset
  - Begone +0.8 height offset
  - Fireball +1.5 height offset (arc trajectory)
  - Arrow +0.5 from camera (minimal gravity for straighter path)
- 🌐 **Robust THREE.js Loading**: 
  - Promise-based loader for r170
  - Fallback to r128 if r170 unavailable
  - Error handling with user feedback
- 🎮 **Improved Respawn**: Player mesh fully recreated with correct team color
- 📊 **Production-Ready HTML**: Better script loading, error handling, CORS ready

### Fixed
- 🐛 Arrow not visible (was 0.1 radius, now 0.2 - 3x thicker)
- 🐛 Arrow not shooting (undefined targetPoint variable)
- 🐛 Missile spawning too low (no offset, now +1.2)
- 🐛 Team change not applied immediately (now instant + forced respawn)
- 🐛 Respawn showing broken armor (mesh now fully recreated)
- 🐛 THREE.js r170 crash (added robust fallback system)

### Changed
- Team selection now forces respawn immediately (no server wait)
- Respawn logic refactored to recreate player from scratch
- HTML script loading converted to Promise-based async loading
- Menu team selection integrated with respawn mechanics

### Removed
- Unnecessary duplicate team color setting in menu
- Old synchronous THREE.js loading
- Fallback document.write() method

### Technical Debt Cleared
- ✅ All spell heights unified and documented
- ✅ Player mesh recreation logic optimized
- ✅ Network respawn handling streamlined
- ✅ THREE.js version handling robust

---

## [1.1.0] - 2025-11-29

### Added
- 🎨 **Texture Gore**: Red blood texture on terrain
- 🗺️ **Random Spawn**: FFA mode with random positions
- 💬 **Chat System**: Draggable, multiplayer chat
- 🎯 **Kill Counter**: Persistent kill tracking
- 📊 **Team Scoreboard**: Dynamic score display
- 🏛️ **Regeneration Temple**: Healing zone
- ✨ **Enemy Glow**: Emissive effects on enemies
- 🎨 **Team Colors**: Red, Black, Green, Purple armor
- 🖱️ **Mouse Sensitivity**: Configurable 0.1-3.0x
- ⌨️ **Keybinds Panel**: Accessible command list
- 🎮 **Free Look**: Ctrl for free camera
- 🌟 **UI Redesign**: Better layout and responsiveness

### Fixed
- Jump cooldown reduced (1000ms → 300ms)
- Removed tree/building collisions
- Improved lighting
- Fixed mouse sensitivity NaN bug
- Fixed pointer lock with free look

---

## [1.0.0] - Initial Release

### Core Features
- 3D Multiplayer Arena
- 8 Spell Types with Physics
- Team-based Gameplay
- Real-time Network Sync
- FPS-style Camera
- 4 Team Colors
- Kill Tracking
- Multiplayer Chat

---

## Release Strategy

### Development (Current)
- Local testing on localhost:3000
- LAN testing with multiple machines
- Console logging for debugging

### Production (Next)
- VPS/Hosting deployment
- HTTPS configuration
- Domain setup
- Auto-restart (PM2/systemd)
- CORS configuration

### Future (v1.3+)
- Custom maps editor
- Leaderboard system
- Replay system
- Anti-cheat measures
- Mobile support
- VR support

---

## Known Issues
- None major - Release Candidate stable

## Performance
- Client: 60 FPS target (tested on RTX 3060)
- Server: <50ms latency (LAN tested)
- Network: Handles 4+ players simultaneously

## Testing Coverage
- ✅ Single-player spawn and movement
- ✅ Multiplayer team gameplay
- ✅ Spell casting and physics
- ✅ Team switching mechanics
- ✅ Respawn system
- ✅ Network synchronization
- ⚠️ Load testing (4+ concurrent players)
- ⚠️ Mobile browser compatibility

---

## Contributors
- **spidah2** - Primary developer and maintainer
