/**
 * inputManager.js - Handles keyboard and mouse input, keybind management
 * Consolidated from scattered input handling and keybind functions
 */

class InputManager {
    constructor() {
        // Movement flags
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Action flags
        this.isBlocking = false;
        this.isSprinting = false;
        this.canJump = false;
        this.isCtrlPressed = false;
        
        // Keybinds
        this.keybinds = {
            'moveForward': 'KeyW',
            'moveBackward': 'KeyS',
            'moveLeft': 'KeyA',
            'moveRight': 'KeyD',
            'jump': 'Space',
            'sprint': 'ShiftLeft',
            'melee': 'KeyQ',
            'ranged': 'KeyE',
            'spell1': 'Digit1',
            'spell2': 'Digit2',
            'spell3': 'Digit3',
            'spell4': 'Digit4',
            'heal': 'KeyF',
            'conversion': 'KeyR',
            'block': 'KeyZ',
            'toggleAudio': 'KeyM',
            'toggleFullscreen': 'KeyP'
        };
        
        // Rebinding state
        this.keyToRebind = null;
        
        // Mouse sensitivity
        const savedSens = localStorage.getItem('ragequit_mouse_sensitivity');
        this.mouseSensitivity = (savedSens && !isNaN(parseFloat(savedSens))) ? parseFloat(savedSens) : 1.0;
    }
    
    /**
     * Load keybinds from localStorage
     */
    loadKeybinds() {
        const saved = localStorage.getItem('ragequit_keybinds');
        if (saved) {
            try {
                this.keybinds = JSON.parse(saved);
                logGame('Keybinds loaded', 'GAME', this.keybinds);
            } catch (e) {
                logGame('Failed to load keybinds', 'GAME', e);
            }
        }
    }
    
    /**
     * Save keybinds to localStorage
     */
    saveKeybinds() {
        localStorage.setItem('ragequit_keybinds', JSON.stringify(this.keybinds));
        logGame('Keybinds saved', 'GAME');
    }
    
    /**
     * Format keyboard code to readable name
     */
    formatKey(code) {
        const keyMap = {
            'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
            'KeyQ': 'Q', 'KeyE': 'E', 'KeyR': 'R', 'KeyF': 'F',
            'KeyM': 'M', 'KeyP': 'P', 'KeyZ': 'Z',
            'Space': 'Space', 'ShiftLeft': 'Shift', 'ControlLeft': 'Ctrl',
            'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4'
        };
        return keyMap[code] || code;
    }
    
    /**
     * Initialize keybinds UI
     */
    initKeybindsUI() {
        const container = document.getElementById('keybinds-container');
        if (!container) return;
        
        container.innerHTML = '';
        for (const [action, key] of Object.entries(this.keybinds)) {
            const btn = document.createElement('button');
            btn.textContent = `${action}: ${this.formatKey(key)}`;
            btn.onclick = () => this.startRebind(action, btn);
            container.appendChild(btn);
        }
    }
    
    /**
     * Start rebinding a key
     */
    startRebind(action, btnElement) {
        this.keyToRebind = action;
        btnElement.textContent = 'Press any key...';
        btnElement.style.background = 'red';
        
        const handler = (e) => {
            e.preventDefault();
            this.keybinds[this.keyToRebind] = e.code;
            btnElement.textContent = `${this.keyToRebind}: ${this.formatKey(e.code)}`;
            btnElement.style.background = '';
            this.saveKeybinds();
            this.keyToRebind = null;
            document.removeEventListener('keydown', handler);
        };
        
        document.addEventListener('keydown', handler);
    }
    
    /**
     * Check if a keybind is active
     */
    isKeyPressed(action) {
        // This will be called from setupControls with actual key states
        return false;
    }
    
    /**
     * Set mouse sensitivity and save it
     */
    setMouseSensitivity(value) {
        this.mouseSensitivity = parseFloat(value) || 1.0;
        localStorage.setItem('ragequit_mouse_sensitivity', this.mouseSensitivity);
        logGame(`Mouse sensitivity set to ${this.mouseSensitivity}`, 'GAME');
    }
}

// Global instance
let inputManager = null;
