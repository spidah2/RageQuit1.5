/**
 * audioManager.js - Manages all game audio including sound effects and background music
 * Consolidated from scattered audio functions
 */

class AudioManager {
    constructor() {
        this.audioEnabled = true;
        this.musicEnabled = true;
        this.soundVolume = 0.5;
        this.musicVolume = 0.3;
        
        this.audioContext = null;
        this.backgroundMusic = null;
        this.backgroundGain = null;
        this.soundGains = {};
        
        this.sounds = {
            'swing_heavy': null,
            'hit': null,
            'jump': null,
            'footstep': null,
            'shoot_bolt': null,
            'shoot_fire': null,
            'heal': null,
            'whirlwind': null
        };
        
        this.footstepSounds = ['footstep1', 'footstep2', 'footstep3'];
    }
    
    /**
     * Initialize audio context and load sounds
     */
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            logGame('Audio context initialized', 'GAME');
        } catch (e) {
            logGame('Audio context not supported', 'GAME', e);
        }
    }
    
    /**
     * Toggle audio on/off
     */
    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        const btn = document.getElementById('audio-toggle-btn');
        if (btn) btn.textContent = this.audioEnabled ? '🔊' : '🔇';
        logGame(`Audio ${this.audioEnabled ? 'enabled' : 'disabled'}`, 'GAME');
    }
    
    /**
     * Play a sound effect at optional position
     */
    playSound(type, pos = null) {
        if (!this.audioEnabled) return;
        
        // Map sound types to actual audio files and volumes
        const soundConfig = {
            'swing_heavy': { file: 'audio/swing_heavy.wav', volume: 0.6 },
            'hit': { file: 'audio/hit.wav', volume: 0.5 },
            'jump': { file: 'audio/jump.wav', volume: 0.4 },
            'footstep': { file: 'audio/footstep.wav', volume: 0.3 },
            'shoot_bolt': { file: 'audio/shoot_bolt.wav', volume: 0.5 },
            'shoot_fire': { file: 'audio/shoot_fire.wav', volume: 0.6 },
            'heal': { file: 'audio/heal.wav', volume: 0.5 },
            'whirlwind': { file: 'audio/whirlwind.wav', volume: 0.7 }
        };
        
        const config = soundConfig[type];
        if (!config) {
            logGame(`Unknown sound type: ${type}`, 'GAME');
            return;
        }
        
        // Create audio element and play
        const audio = new Audio(config.file);
        audio.volume = config.volume * this.soundVolume;
        
        // 3D audio positioning if pos provided
        if (pos && this.audioContext) {
            // Future: implement 3D audio with Web Audio API
        }
        
        audio.play().catch(e => {
            logGame(`Failed to play sound ${type}`, 'GAME', e);
        });
    }
    
    /**
     * Start background music loop
     */
    startBackgroundMusic() {
        if (!this.musicEnabled || !this.audioEnabled) return;
        
        try {
            // Create audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Stop existing music if playing
            if (this.backgroundMusic) {
                this.backgroundMusic.stop();
            }
            
            // Create new audio element
            this.backgroundMusic = new Audio('audio/background_music.wav');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = this.musicVolume;
            this.backgroundMusic.play().catch(e => {
                logGame('Failed to play background music', 'GAME', e);
            });
            
            logGame('Background music started', 'GAME');
        } catch (e) {
            logGame('Error starting background music', 'GAME', e);
        }
    }
    
    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            logGame('Background music stopped', 'GAME');
        }
    }
    
    /**
     * Set music volume (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.musicVolume;
        }
        logGame(`Music volume set to ${(this.musicVolume * 100).toFixed(0)}%`, 'GAME');
    }
    
    /**
     * Set sound effects volume (0-1)
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        logGame(`Sound volume set to ${(this.soundVolume * 100).toFixed(0)}%`, 'GAME');
    }
}

// Global instance
let audioManager = null;
