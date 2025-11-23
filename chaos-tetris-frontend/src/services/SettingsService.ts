import { audioManager } from './AudioManager';

export interface AudioSettings {
    master: number;
    bgm: number;
    sfx: number;
    muted: boolean;
}

export interface ControlSettings {
    das: number; // Delayed Auto Shift (ms)
    arr: number; // Auto Repeat Rate (ms)
    sdf: number; // Soft Drop Factor (multiplier)
    dcd: number; // DAS Cut Delay (ms)
}

export interface Keybinds {
    moveLeft: string;
    moveRight: string;
    softDrop: string;
    hardDrop: string;
    rotateCW: string;
    rotateCCW: string;
    hold: string;
    skill1: string;
    skill2: string;
    skill3: string;
    targetMode: string;
}

export interface GameSettings {
    audio: AudioSettings;
    controls: ControlSettings;
    keybinds: Keybinds;
}

const DEFAULT_SETTINGS: GameSettings = {
    audio: {
        master: 1.0,
        bgm: 0.6,
        sfx: 0.8,
        muted: false
    },
    controls: {
        das: 150,
        arr: 50,
        sdf: 20,
        dcd: 0
    },
    keybinds: {
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: ' ',
        rotateCW: 'ArrowUp',
        rotateCCW: 'z',
        hold: 'c',
        skill1: '1',
        skill2: '2',
        skill3: '3',
        targetMode: 'Tab'
    }
};

class SettingsService {
    private settings: GameSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    private currentUserId: string = 'guest';
    private listeners: Set<() => void> = new Set();

    constructor() {
        // Load initial settings (try guest first)
        this.loadSettings('guest');
    }

    public getSettings(): GameSettings {
        return this.settings;
    }

    public loadSettings(userId: string) {
        this.currentUserId = userId;
        const key = `settings_${userId}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure new keys are present
                this.settings = {
                    audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
                    controls: { ...DEFAULT_SETTINGS.controls, ...parsed.controls },
                    keybinds: { ...DEFAULT_SETTINGS.keybinds, ...parsed.keybinds }
                };
                console.log(`Settings loaded for user: ${userId}`);
            } else {
                console.log(`No settings found for user: ${userId}, using defaults.`);
                this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
            }
            this.applySettings();
            this.notifyListeners();
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    public saveSettings() {
        const key = `settings_${this.currentUserId}`;
        try {
            localStorage.setItem(key, JSON.stringify(this.settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    public updateSettings(partial: Partial<GameSettings> | { [K in keyof GameSettings]?: Partial<GameSettings[K]> }) {
        if (partial.audio) {
            this.settings.audio = { ...this.settings.audio, ...partial.audio };
        }
        if (partial.controls) {
            this.settings.controls = { ...this.settings.controls, ...partial.controls };
        }
        if (partial.keybinds) {
            this.settings.keybinds = { ...this.settings.keybinds, ...partial.keybinds };
        }

        this.saveSettings();
        this.applySettings();
        this.notifyListeners();
    }

    public resetToDefaults(section?: 'audio' | 'controls' | 'keybinds') {
        if (section) {
            this.settings[section] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[section]));
        } else {
            this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
        this.saveSettings();
        this.applySettings();
        this.notifyListeners();
    }

    private applySettings() {
        // Apply audio settings directly to AudioManager
        // We do this here to ensure synchronization
        audioManager.setVolume('master', this.settings.audio.master);
        audioManager.setVolume('bgm', this.settings.audio.bgm);
        audioManager.setVolume('sfx', this.settings.audio.sfx);

        if (this.settings.audio.muted !== audioManager.isMuted()) {
            audioManager.toggleMute();
        }
    }

    public subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(l => l());
    }
}

export const settingsService = new SettingsService();
