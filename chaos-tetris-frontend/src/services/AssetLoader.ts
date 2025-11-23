/**
 * AssetLoader Service
 * Manages preloading of all game assets (textures, sounds, etc.)
 * Provides progress tracking for loading screen
 */

type ProgressCallback = (progress: number) => void;

interface AssetItem {
    type: 'image' | 'audio';
    url: string;
    name: string;
}

class AssetLoader {
    private progressCallbacks: ProgressCallback[] = [];
    private currentProgress: number = 0;
    private totalAssets: number = 0;
    private loadedAssets: number = 0;

    /**
     * Subscribe to loading progress updates
     */
    onProgress(callback: ProgressCallback): () => void {
        this.progressCallbacks.push(callback);
        return () => {
            this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
        };
    }

    /**
     * Get current loading progress (0-100)
     */
    getProgress(): number {
        return this.currentProgress;
    }

    /**
     * Update progress and notify subscribers
     */
    private updateProgress(loaded: number, total: number): void {
        this.loadedAssets = loaded;
        this.totalAssets = total;
        this.currentProgress = total > 0 ? Math.round((loaded / total) * 100) : 0;
        this.progressCallbacks.forEach(cb => cb(this.currentProgress));
    }

    /**
     * Preload a single image
     */
    private preloadImage(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`);
                resolve(); // Don't block on failed images
            };
            img.src = url;
        });
    }

    /**
     * Preload all assets
     */
    async preloadAssets(): Promise<void> {
        const assets: AssetItem[] = [
            // Skin textures
            { type: 'image', url: 'skins/default.png', name: 'Default Skin' },
            { type: 'image', url: 'skins/block_texture.png', name: 'Block Texture Skin' },
            { type: 'image', url: 'skins/gridiant.png', name: 'Gradient Skin' },
            { type: 'image', url: 'skins/1.png', name: 'Cyberpunk Skin' },
        ];

        const total = assets.length;
        let loaded = 0;

        this.updateProgress(0, total);

        // Preload all assets
        const promises = assets.map(async (asset) => {
            try {
                if (asset.type === 'image') {
                    await this.preloadImage(asset.url);
                }
                loaded++;
                this.updateProgress(loaded, total);
            } catch (error) {
                console.warn(`Failed to load ${asset.name}:`, error);
                loaded++;
                this.updateProgress(loaded, total);
            }
        });

        await Promise.all(promises);

        // Ensure we end at 100%
        this.updateProgress(total, total);
    }

    /**
     * Reset loader state
     */
    reset(): void {
        this.currentProgress = 0;
        this.loadedAssets = 0;
        this.totalAssets = 0;
    }
}

export const assetLoader = new AssetLoader();
