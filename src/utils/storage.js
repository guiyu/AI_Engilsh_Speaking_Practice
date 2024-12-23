// storage.js
export class StorageManager {
    static async getKeys() {
        return await chrome.storage.local.get(['geminiKey', 'elevenlabsKey']);
    }

    static async saveKeys(geminiKey, elevenlabsKey) {
        await chrome.storage.local.set({
            geminiKey,
            elevenlabsKey
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