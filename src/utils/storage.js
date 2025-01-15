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

    static async getProStatus() {
        const { isPro, proExpiryDate } = await chrome.storage.local.get(['isPro', 'proExpiryDate']);
        return {
            isPro: isPro || false,
            proExpiryDate: proExpiryDate || null
        };
    }

    static async getDailyUsage() {
        const today = new Date().toISOString().split('T')[0];
        const { usageData } = await chrome.storage.local.get('usageData');
        return (usageData && usageData[today]) || 0;
    }

    static async incrementUsage() {
        const today = new Date().toISOString().split('T')[0];
        const { usageData = {} } = await chrome.storage.local.get('usageData');
        usageData[today] = (usageData[today] || 0) + 1;
        await chrome.storage.local.set({ usageData });
        return usageData[today];
    }
}