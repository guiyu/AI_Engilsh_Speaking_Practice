// src/utils/licenseManager.js
export class LicenseManager {
    static FREE_DAILY_LIMIT = 10; // 修改为10次
    static KEY_POOL = {
        GEMINI: [
            'AIzaSyAvBhnio2Dvx-UAtcMWUp7VVrGK4gR5b-Q',
            'your_key_2',
            'your_key_3'
        ]
    };
    
    static async initialize() {
        // 初始化存储
        const data = await chrome.storage.local.get(['userId', 'isPro', 'usage']);
        if (!data.userId) {
            await chrome.storage.local.set({
                userId: crypto.randomUUID(),
                isPro: false,
                usage: {}
            });
        }
        return data.userId;
    }

    static async getGeminiKey() {
        try {
            const data = await chrome.storage.local.get(['isPro', 'customGeminiKey']);
            if (data.isPro && data.customGeminiKey) {
                return data.customGeminiKey;
            }
            // 从池中随机选择一个key并进行简单加密
            const key = this.KEY_POOL.GEMINI[Math.floor(Math.random() * this.KEY_POOL.GEMINI.length)];
            return this.encryptKey(key);
        } catch (error) {
            console.error('Error getting Gemini key:', error);
            throw new Error(chrome.i18n.getMessage('apiKeyError'));
        }
    }

    static async checkUsageLimit(userId) {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get(['usage', 'isPro']);
        const usage = data.usage || {};
        const userDailyUsage = (usage[userId]?.[today] || 0);
        
        return {
            canUse: data.isPro || userDailyUsage < this.FREE_DAILY_LIMIT,
            remainingCount: data.isPro ? -1 : (this.FREE_DAILY_LIMIT - userDailyUsage),
            isPro: data.isPro
        };
    }

    static async incrementUsage(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = await chrome.storage.local.get(['usage', 'isPro']);
            
            if (data.isPro) return true; // Pro版本不计数
            
            const usage = data.usage || {};
            if (!usage[userId]) {
                usage[userId] = {};
            }
            
            // 清理旧数据
            for (const date in usage[userId]) {
                if (date !== today) {
                    delete usage[userId][date];
                }
            }
            
            usage[userId][today] = (usage[userId][today] || 0) + 1;
            await chrome.storage.local.set({ usage });
            return true;
        } catch (error) {
            console.error('Error incrementing usage:', error);
            return false;
        }
    }

    static async upgradeToProVersion(licenseKey) {
        try {
            // 这里应该添加验证license key的逻辑
            const isValid = await this.validateLicenseKey(licenseKey);
            if (isValid) {
                await chrome.storage.local.set({ 
                    isPro: true,
                    licenseKey: this.encryptKey(licenseKey),
                    upgradeDate: new Date().toISOString()
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error upgrading to pro:', error);
            return false;
        }
    }

    static async isProVersion() {
        const { isPro } = await chrome.storage.local.get(['isPro']);
        return isPro || false;
    }

    // 用于加密密钥的简单方法（实际应用中应使用更安全的加密方法）
    static encryptKey(key) {
        return btoa(key);
    }

    // 用于解密密钥的简单方法
    static decryptKey(encryptedKey) {
        return atob(encryptedKey);
    }

    // 验证许可证密钥（示例实现）
    static async validateLicenseKey(key) {
        // 实际实现应该与后端服务验证
        return /^PRO-\d{6}-[A-Z]{3}-\d{4}$/.test(key);
    }

    static async clearUsageData() {
        try {
            const { userId } = await chrome.storage.local.get(['userId']);
            const usage = {};
            usage[userId] = {};
            await chrome.storage.local.set({ usage });
            return true;
        } catch (error) {
            console.error('Error clearing usage data:', error);
            return false;
        }
    }

    static async getUsageStats() {
        const { userId, usage } = await chrome.storage.local.get(['userId', 'usage']);
        const today = new Date().toISOString().split('T')[0];
        return {
            today: usage?.[userId]?.[today] || 0,
            limit: this.FREE_DAILY_LIMIT
        };
    }
}