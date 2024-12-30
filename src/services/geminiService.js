// src/services/geminiService.js

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = "gemini-2.0-flash-exp";
        this.host = "generativelanguage.googleapis.com";
        this.baseUrl = `https://${this.host}/v1beta/models`;  // 修改为beta版本
        this.SAMPLE_RATE = 16000;
        this.CHANNELS = 1;
        this.FORMAT = 16;
        this.CHUNK_SIZE = 512;
        
        // 配额管理
        this.requestTimestamps = [];
        this.MAX_REQUESTS_PER_MINUTE = 15;
        this.WINDOW_SIZE_MS = 60000;
        this.MIN_REQUEST_INTERVAL = 4000;
        this.MAX_RETRIES = 3;
        this.initialized = false;
    }

    async checkAPIAccess() {
        try {
            // 先尝试一个简单的API调用来验证访问权限
            const response = await fetch(
                `${this.baseUrl}/models?key=${this.apiKey}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`API access check failed: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            return true;
        } catch (error) {
            console.error('API access check failed:', error);
            if (error.message.includes('429')) {
                throw new Error('API配额已用完。请等待配额重置或检查API密钥设置。');
            } else if (error.message.includes('403')) {
                throw new Error('API密钥无效或未授权。请检查API密钥设置。');
            } else {
                throw new Error('无法访问API。请检查网络连接和API密钥设置。');
            }
        }
    }

    parseErrorResponse(errorText) {
        try {
            const errorData = JSON.parse(errorText);
            const quotaInfo = errorData.error?.details?.[0]?.metadata;
            if (quotaInfo) {
                if (quotaInfo.quota_limit_value === "0") {
                    return '当前API密钥没有可用配额。请确保已在Google AI Studio中正确设置项目和API密钥。';
                }
                return `API配额超限：${errorData.error.message}`;
            }
            return errorData.error?.message || '未知错误';
        } catch (e) {
            return errorText;
        }
    }

    async checkQuota() {
        const now = Date.now();
        // 清理超过1分钟窗口的时间戳
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < this.WINDOW_SIZE_MS
        );
        
        // 检查是否超过每分钟限制
        if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
            const oldestTimestamp = this.requestTimestamps[0];
            const waitTime = oldestTimestamp + this.WINDOW_SIZE_MS - now;
            throw new Error(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
        }

        // 检查最小请求间隔
        const lastRequest = this.requestTimestamps[this.requestTimestamps.length - 1];
        if (lastRequest && now - lastRequest < this.MIN_REQUEST_INTERVAL) {
            const waitTime = this.MIN_REQUEST_INTERVAL - (now - lastRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.requestTimestamps.push(now);
        return true;
    }

    async makeRequest(url, options, retryCount = 0) {
        try {
            if (!this.initialized) {
                await this.checkAPIAccess();
                this.initialized = true;
            }

            const response = await fetch(url, options);
            
            if (response.ok) {
                return await response.json();
            }

            const errorText = await response.text();
            const errorMessage = this.parseErrorResponse(errorText);
            
            if (response.status === 429 && retryCount < this.MAX_RETRIES) {
                const waitTime = (retryCount + 1) * 5000;
                console.log(`配额限制，${waitTime/1000}秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.makeRequest(url, options, retryCount + 1);
            }

            throw new Error(errorMessage);
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    async initializeChat() {
        try {
            if (!this.apiKey) {
                throw new Error('未设置API密钥');
            }

            const response = await this.makeRequest(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            role: "user",
                            parts: [{
                                text: "你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程，直到用户说OK，我要退出。你的回答永远要保持中文。如果明白了请回答OK"
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024
                        }
                    })
                }
            );

            return this.checkInitializationResponse(response);
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }
    
    checkInitializationResponse(response) {
        try {
            if (!response || !response.candidates || !response.candidates[0]) {
                console.error('Invalid response format:', response);
                return false;
            }

            const text = response.candidates[0].content?.parts?.[0]?.text || '';
            console.log('AI Response:', text);
            return text.includes('OK');
        } catch (error) {
            console.error('Error checking initialization response:', error);
            return false;
        }
    }

    async processAudio(text) {
        try {
            const response = await this.makeRequest(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            role: "user",
                            parts: [{
                                text: `用户说了这句话: ${text}`
                            }]
                        }],
                        generation_config: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024
                        },
                        audio_config: {
                            sample_rate: this.SAMPLE_RATE,
                            channels: this.CHANNELS,
                            encoding: "LINEAR16",
                            chunk_size: this.CHUNK_SIZE
                        }
                    })
                }
            );

            return this.parseResponse(response);
        } catch (error) {
            console.error('Process audio error:', error);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            if (!response.candidates || !response.candidates[0]) {
                throw new Error('Invalid response format');
            }

            const text = response.candidates[0].content?.parts?.[0]?.text || '';
            console.log('Full AI response:', text);
            const lines = text.split('\n');
            
            return {
                recognition: this.extractContent(lines, '语音识别') || text,
                grammar: this.extractContent(lines, '语法') || '语法正确',
                pronunciation: this.extractContent(lines, '发音') || '发音正确',
                suggestions: this.extractContent(lines, '建议') || '继续练习',
                nextPrompt: this.extractContent(lines, '场景') || '尝试说一个新的句子'
            };
        } catch (error) {
            console.error('Parse response error:', error);
            throw error;
        }
    }

    extractContent(lines, key) {
        try {
            const line = lines.find(l => l.includes(key));
            return line ? line.split('：')[1]?.trim() || '' : '';
        } catch (error) {
            console.error(`Error extracting ${key}:`, error);
            return '';
        }
    }
}