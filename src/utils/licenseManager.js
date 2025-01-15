export class LicenseManager {
    static FREE_DAILY_LIMIT = 10;
    static KEY_POOL = {
        GEMINI: [
            'AIzaSyAvBhnio2Dvx-UAtcMWUp7VVrGK4gR5b-Q',
            // 其他备用keys
        ]
    };

    static async getGeminiKey() {
        try {
            // 从池中选择第一个可用的key
            const key = this.KEY_POOL.GEMINI[0];
            if (!key) {
                throw new Error('没有可用的 API 密钥');
            }
            return key;
        } catch (error) {
            console.error('Error getting Gemini key:', error);
            throw error;
        }
    }

    static async checkUsageLimit() {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get(['usage', 'isPro']);
        const usage = data.usage || {};
        const userDailyUsage = (usage[today] || 0);
        
        return {
            canUse: data.isPro || userDailyUsage < this.FREE_DAILY_LIMIT,
            remainingCount: data.isPro ? -1 : (this.FREE_DAILY_LIMIT - userDailyUsage)
        };
    }

    static async incrementUsage() {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get(['usage', 'isPro']);
        if (data.isPro) return true;
        
        const usage = data.usage || {};
        usage[today] = (usage[today] || 0) + 1;
        await chrome.storage.local.set({ usage });
        return true;
    }
}