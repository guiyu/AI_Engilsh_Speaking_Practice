// storage.js
export class StorageManager {
    static async getKeys() {
        const data = await chrome.storage.local.get(['elevenlabsKey', 'isPro']);
        return {
            elevenlabsKey: data.isPro ? data.elevenlabsKey : null,
            isPro: data.isPro || false
        };
    }

    static async saveKeys(elevenlabsKey) {
        await chrome.storage.local.set({
            elevenlabsKey
        });
    }

    static async upgradeToProVersion() {
        await chrome.storage.local.set({
            isPro: true
        });
    }
} 

// audioVisualizer.js
export class AudioVisualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.analyzer = null;
    }

    initialize(audioContext, sourceNode) {
        this.analyzer = audioContext.createAnalyser();
        sourceNode.connect(this.analyzer);
        this.draw();
    }

    draw() {
        // Implement visualization
    }
}