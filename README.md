# RageQuit - 3D Multiplayer Arena

Arena Multiplayer 3D con combattimento magico, effetti spellcasting avanzati e meccaniche di squadra dinamiche.

**Status**: 🎮 **PLAYABLE** - Pronto per testing multiplayer e pubblicazione

## Versione 1.2.0 - Novembre 2025 (Production Ready)

### 🆕 Nuove Funzionalità (Ultimi Update)
- 🎯 **Team Change In-Game**: Cambio istantaneo di squadra con respawn automatico
- 🏹 **Arrow/Bow System**: Sistema arco completamente refactor - frecce visibili e funzionali
- 🚀 **Missile Height Fix**: Missili sparano da altezza corretta, visibili e dritti
- 👻 **Spell Physics Tuned**: Fireballs con traiettoria parabolica, missiles dritti, arrows leggeri
- 🔄 **Respawn Improvements**: Ricreazione completa del mesh per armature pulite e colori corretti
- 🎨 **Team Colors**: Squadre con colori distinti (Red, Black, Green, Purple)
- ⚡ **THREE.js r170 Support**: Caricamento robusto con fallback a r128 se necessario
- 🌐 **Production-Ready HTML**: Script loading promise-based, gestione errori migliorata

### ✨ Funzionalità Core
- 🎨 **Texture Gore Rossa**: Terreno con effetti sangue e gore
- 🗺️ **Mappa Dinamica**: Spawn random, muri perimetrali, ostacoli sparsi
- 💬 **Sistema Chat**: Chat multiplayer in tempo reale
- 🎯 **Kill Counter**: Tracking kill persistente con localStorage
- 📊 **Scoreboard**: Tabella squadre e contatori live
- 🏛️ **Tempio di Rigenerazione**: Zona speciale di healing
- ✨ **Enemy Glow**: Effetti emissivi sui nemici per visibilità
- 🎮 **Free Look**: Ctrl per movimento libero camera
- 🌟 **Menu Principale**: UI ridisegnata, comandi accessibili
- 👥 **Team Management**: Selezione squadra dinamica con respawn
- 🎪 **Spell Effects**: 8 spell tipi con Physics realistica

### ⚙️ Sistemi Implementati
- **Spell System** (8 tipi): Missile, Begone, Fireball, Impale, Arrow, Melee, Whirlwind, Heal
- **Physics Engine**: Gravity, momentum, collision, knockback
- **Networking**: Socket.io con lag compensation
- **Team System**: 4 squadre con colori, spawn zones, team score
- **AI Enemies**: Spawn e comportamento nemici (modalità PvE)
- **UI System**: Action bar, chat, scoreboard, keybinds

### 🐛 Recent Fixes
- ✅ Arrow shooting - ora visibile e funzionale
- ✅ Missile height - alza dal terreno per visibility
- ✅ Team change - applicato istantaneamente con respawn
- ✅ Respawn armor - mesh ricreato per colori corretti
- ✅ THREE.js r170 - fallback robusto a r128

### Requisiti
- **Node.js** (LTS 18+ recommended)
- **Moderna**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Connessione**: Locale (localhost) o rete LAN

## Quick Start

### Installazione
```bash
# Clona il repository
git clone https://github.com/spidah2/RageQuit1.5.git
cd RageQuit1.5

# Installa dipendenze
npm install

# Avvia il server
npm start
# oppure: node server.js
```

### Accesso al Gioco
- **Local**: http://localhost:3000
- **LAN**: http://<YOUR_IP>:3000

## Comandi di Gioco

### Movimento
- `W/A/S/D` - Movimento
- `Space` - Jump
- `Shift` - Sprint

### Combat
- `1-4` - Spell selection (Missile, Begone, Fireball, Impale)
- `5` - Arrow (Bow)
- `Q` - Melee (Sword)
- `E` - Bow
- `Mouse Click (hold)` - Cast spell / Shoot

### Utility
- `C` - Bow equip
- `X` - Team selection (in-game)
- `Esc` - Menu
- `Ctrl` - Free look camera
- `Tab` - Scoreboard

## Architettura

```
public/
├── index.html           # Entry point, THREE.js loader robusto
├── css/
│   └── styles.css       # Stili UI
├── js/
│   ├── game.js          # Game loop principale (initGame function)
│   ├── player.js        # Player mesh e movement
│   ├── spells.js        # Spell system (8 tipi, physics)
│   ├── world.js         # Terrain, obstacles, world
│   ├── network.js       # Socket.io client
│   ├── socketHandlers.js # Network event handlers
│   ├── menu.js          # UI menu e team selection
│   ├── config.js        # Costanti game e spell params
│   ├── ai.js            # Nemici IA (PvE)
│   └── [altri moduli]   # Utility, managers, ecc
└── models/              # GLTF models

server.js               # Express + Socket.io server
package.json            # Node dipendenze
```

## Deployment

### Locale (Development)
```bash
npm start
```
Server accede su http://localhost:3000

### Production (VPS/Hosting)
1. Install Node.js LTS
2. Clone repo
3. `npm install --production`
4. `npm start` o usa PM2/systemd per auto-restart
5. Configure CORS in `server.js` per dominio
6. Use reverse proxy (Nginx) per HTTPS

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
EXPOSE 3000
CMD ["node", "server.js"]
```

## Performance Tuning

### Client-Side
- **LOD System**: Gestione distanza oggetti
- **Object Pooling**: Particelle e projectiles
- **Frame Throttling**: UI update ogni 2 frame
- **Lag Compensation**: Interpolazione posizioni giocatori

### Server-Side
- **Socket Optimization**: Emit rate limiting
- **Broadcast Filtering**: Solo giocatori visibili
- **Hitbox Validation**: Server-side hit detection

## Troubleshooting

### Game non carica
- **Verifica**: THREE.js caricato (F12 > Console)
- **Fallback**: Auto-carica r128 se r170 fallisce
- **Network**: Controlla connessione internet

### Lag/Latency
- **Check**: FPS counter top-right (target: 60fps)
- **Server**: Verifica carico processoore
- **Network**: Ping mostrato in-game (top-right)

### Spell non spara
- **Mana**: Verifica barra mana in alto
- **Cooldown**: Aspetta ricarica (UI mostra timer)
- **Position**: Assicurati di non essere dentro ostacoli

## Documenti
- **[REFACTORING_PLAN.json](./REFACTORING_PLAN.json)** - Plan per miglioramenti futuri
- **[guida moduli.txt](./guida%20moduli.txt)** - Documentazione moduli
- **[CHANGELOG](./CHANGELOG.md)** - Storico dettagliato

## Credits
- **Engine**: Three.js r170/r128
- **Networking**: Socket.io 4.7.2
- **Framework**: Node.js + Express

## License
[Scegli una license: MIT / GPL / Proprietaria]

## Contact
- **GitHub**: github.com/spidah2/RageQuit1.5
- **Issues**: Segnala bug su GitHub Issues


## Note
- Se vuoi pushare il repo su un remoto, aggiungi un remote e poi `git push -u origin main` (o branch desiderato).
- Se preferisci che configuri il remote o esegua altre azioni, indicami l'URL del remote.
