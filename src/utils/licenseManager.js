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
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await chrome.storage.local.get(['usage', 'isPro']);
            const usage = data.usage || {};
            const todayUsage = usage[today] || 0;
            
            return {
                canUse: data.isPro || todayUsage < this.FREE_DAILY_LIMIT,
                remainingCount: data.isPro ? '∞' : (this.FREE_DAILY_LIMIT - todayUsage),
                isPro: data.isPro || false
            };
        } catch (error) {
            Logger.error('Error checking usage limit:', error);
            return {
                canUse: false,
                remainingCount: 0,
                isPro: false
            };
        }
    }

    static async incrementUsage() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await chrome.storage.local.get(['usage', 'isPro']);
            if (data.isPro) return true;
            
            const usage = data.usage || {};
            if (!usage[today]) usage[today] = 0;
            usage[today]++;
            
            await chrome.storage.local.set({ usage });
            return true;
        } catch (error) {
            Logger.error('Error incrementing usage:', error);
            return false;
        }
    }
}