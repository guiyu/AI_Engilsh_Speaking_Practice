import { handleFeedback } from '../pages/feedback/feedback.js';

export class KeyManager {
    static keyPool = {
        GEMINI: [],
        ELEVENLABS: []
    };

    static async initialize() {
        // 从环境变量或构建时注入的配置中获取key
        this.keyPool.GEMINI = process.env.GEMINI_KEYS?.split(',') || [];
        this.keyPool.ELEVENLABS = process.env.ELEVENLABS_KEYS?.split(',') || [];
    }

    static async getNextKey(service) {
        const keys = this.keyPool[service];
        if (!keys || keys.length === 0) {
            throw new Error(`No available ${service} keys`);
        }

        // 轮询方式获取下一个key
        const key = keys.shift();
        keys.push(key);
        return key;
    }

    static async reportKeyExhausted(service, key) {
        // 发送邮件通知
        const subject = `API Key Exhausted: ${service}`;
        const body = `Key ${key} for ${service} has been exhausted.`;
        await handleFeedback(subject, body);
    }
}