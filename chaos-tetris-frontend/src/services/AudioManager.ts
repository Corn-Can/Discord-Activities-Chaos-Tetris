// chaos-tetris-frontend/src/services/AudioManager.ts

/**
 * AudioManager - 遊戲音效與音樂管理系統
 * 
 * 功能：
 * - 音效預載與播放
 * - 背景音樂管理
 * - 三級音量控制
 * - 靜音切換
 */
type SoundId = string;
type VolumeType = 'master' | 'bgm' | 'sfx';

interface VolumeSettings {
    master: number;
    bgm: number;
    sfx: number;
}

interface AudioSettings {
    volume: VolumeSettings;
    muted: boolean;
}

class AudioManager {
    // SFX 改用 AudioBuffer (高效能，無延遲)
    private sfxBuffers: Map<SoundId, AudioBuffer> = new Map();

    // 循環音效需要記錄 SourceNode 才能停止
    private activeLoopingSources: Map<SoundId, AudioBufferSourceNode> = new Map();

    // BGM 維持 HTMLAudioElement (適合長檔案串流)
    private bgmAudio: HTMLAudioElement | null = null;
    private currentBgmUrl: string | null = null;

    private audioContext: AudioContext | null = null;
    private gainNode: GainNode | null = null; // 主音量控制

    private settings: AudioSettings = {
        volume: {
            master: 1.0,
            bgm: 0.6,
            sfx: 0.8
        },
        muted: false
    };

    private isInitialized = false;
    private pendingBGM: { track: string; loop: boolean } | null = null;

    constructor() {
        // 嘗試從 localStorage 讀取設定 (如果有存的話)
        this.loadLocalSettings();
    }

    /**
     * 初始化 AudioContext
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();

            // 建立主音量節點
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateMasterVolume();

            this.isInitialized = true;
            console.log('AudioManager (Web Audio API) initialized.');

            if (this.audioContext.state === 'suspended') {
                await this.resume();
            }

            // 處理待播放 BGM
            if (this.pendingBGM) {
                this.playBGM(this.pendingBGM.track, this.pendingBGM.loop);
                this.pendingBGM = null;
            }
        } catch (e) {
            console.error('Failed to init AudioContext:', e);
        }
    }

    /**
     * 恢復 AudioContext (解決瀏覽器自動播放策略)
     */
    async resume(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioContext resumed.');
        }
    }

    /**
     * 預載並解碼音效 (關鍵優化：轉成 AudioBuffer)
     */
    async preloadSounds(soundMap: Record<SoundId, string>): Promise<void> {
        if (!this.audioContext) await this.initialize();

        const promises = Object.entries(soundMap).map(async ([id, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                if (this.audioContext) {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    this.sfxBuffers.set(id, audioBuffer);
                }
            } catch (error) {
                console.warn(`Failed to load sound: ${id} (${url})`, error);
            }
        });

        await Promise.all(promises);
        console.log(`Preloaded ${this.sfxBuffers.size} sounds into memory.`);
    }

    /**
     * 播放短音效 (Fire-and-forget, 零延遲)
     */
    playSFX(soundId: SoundId, volumeMultiplier: number = 1.0, pitch: number = 1.0): void {
        if (this.settings.muted || !this.audioContext || !this.gainNode) return;

        const buffer = this.sfxBuffers.get(soundId);
        if (!buffer) return;

        // 建立音源
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        // 獨立音量控制
        const gain = this.audioContext.createGain();
        const volume = this.settings.volume.sfx * volumeMultiplier;
        gain.gain.value = Math.max(0, Math.min(1, volume));

        // 連接：Source -> Gain -> MasterGain -> Speakers
        source.connect(gain);
        gain.connect(this.gainNode);

        // 設定音調
        if (pitch !== 1.0) {
            source.playbackRate.value = pitch;
        }

        source.start(0);
    }

    /**
     * 播放循環音效 (如 Warning)
     */
    playLoopingSFX(soundId: SoundId, volumeMultiplier: number = 1.0): void {
        if (this.settings.muted || !this.audioContext || !this.gainNode) return;
        if (this.activeLoopingSources.has(soundId)) return; // 避免重複播放

        const buffer = this.sfxBuffers.get(soundId);
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = this.audioContext.createGain();
        const volume = this.settings.volume.sfx * volumeMultiplier;
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.gainNode);

        source.start(0);
        this.activeLoopingSources.set(soundId, source);
    }

    /**
     * 停止循環音效
     */
    stopLoopingSFX(soundId: SoundId): void {
        const source = this.activeLoopingSources.get(soundId);
        if (source) {
            try {
                source.stop();
            } catch (e) { /* ignore if already stopped */ }
            source.disconnect();
            this.activeLoopingSources.delete(soundId);
        }
    }

    /**
     * 停止所有音效 (Game Over 時呼叫)
     */
    stopAllSFX(): void {
        this.activeLoopingSources.forEach(source => {
            try {
                source.stop();
                source.disconnect();
            } catch (e) { }
        });
        this.activeLoopingSources.clear();
    }

    /**
     * 播放背景音樂 (保持 HTMLAudio 以節省記憶體)
     */
    async playBGM(trackUrl: string, loop: boolean = true): Promise<void> {
        // 如果是同一首且正在播，就不重啟
        if (this.currentBgmUrl === trackUrl && this.bgmAudio && !this.bgmAudio.paused) return;

        this.stopBGM();

        this.currentBgmUrl = trackUrl;
        if (this.settings.muted) return;

        this.bgmAudio = new Audio(trackUrl);
        this.bgmAudio.loop = loop;
        this.bgmAudio.volume = this.settings.volume.bgm * this.settings.volume.master;

        // ✅ 新增：雙重保險，確保 BGM 斷掉時自動接關
        if (loop) {
            this.bgmAudio.addEventListener('ended', () => {
                if (this.bgmAudio) {
                    this.bgmAudio.currentTime = 0;
                    this.bgmAudio.play().catch(() => { });
                }
            });
        }

        try {
            await this.bgmAudio.play();
        } catch (e) {
            console.warn('BGM play failed, pending...', e);
            this.pendingBGM = { track: trackUrl, loop };
        }
    }

    stopBGM(): void {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
        this.currentBgmUrl = null;
    }

    // --- 音量控制 ---

    setVolume(type: VolumeType, value: number): void {
        this.settings.volume[type] = Math.max(0, Math.min(1, value));
        this.updateMasterVolume();
        this.saveSettings();
    }

    toggleMute(): void {
        this.settings.muted = !this.settings.muted;

        if (this.settings.muted) {
            if (this.audioContext) this.audioContext.suspend();
            if (this.bgmAudio) this.bgmAudio.pause();
        } else {
            if (this.audioContext) this.audioContext.resume();
            if (this.bgmAudio) this.bgmAudio.play().catch(console.error);
        }
        this.saveSettings();
    }

    private updateMasterVolume() {
        if (this.gainNode && this.audioContext) {
            // Master volume controls the AudioContext gain
            this.gainNode.gain.value = this.settings.volume.master;
        }
        if (this.bgmAudio) {
            // BGM volume is separate
            this.bgmAudio.volume = this.settings.volume.bgm * this.settings.volume.master;
        }
    }

    private saveSettings() {
        try {
            localStorage.setItem('audio_settings', JSON.stringify(this.settings));
        } catch (e) { }
    }

    private loadLocalSettings() {
        try {
            const saved = localStorage.getItem('audio_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) { }
    }

    isMuted(): boolean {
        return this.settings.muted;
    }
}

export const audioManager = new AudioManager();
