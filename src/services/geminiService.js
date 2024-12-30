// src/services/geminiService.js

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = "gemini-2.0-flash-exp";
        this.host = "generativelanguage.googleapis.com";
        this.baseUrl = `https://${this.host}/v1/models`;
        this.SAMPLE_RATE = 16000;
        this.CHANNELS = 1;
        this.FORMAT = 16;
        this.CHUNK_SIZE = 512;
        
        // 请求限制相关
        this.requestQueue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL = 6000; // 6秒间隔
        this.MAX_RETRIES = 3;
    }

    async makeRequest(url, options, retryCount = 0) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => 
                setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
        }

        try {
            this.lastRequestTime = Date.now();
            const response = await fetch(url, options);
            
            if (response.ok) {
                return await response.json();
            }

            const errorData = await response.text();
            
            if (response.status === 429 && retryCount < this.MAX_RETRIES) {
                console.log(`Rate limit hit, retrying in ${(retryCount + 1) * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                return this.makeRequest(url, options, retryCount + 1);
            }

            throw new Error(`API request failed: ${response.status} - ${errorData}`);
        } catch (error) {
            if (error.message.includes('429') && retryCount < this.MAX_RETRIES) {
                console.log(`Rate limit hit, retrying in ${(retryCount + 1) * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                return this.makeRequest(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    async initializeChat() {
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
                                text: "你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程，直到用户说OK，我要退出。你的回答永远要保持中文。如果明白了请回答OK"
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