// src/services/geminiService.js

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.ws = null;
        this.model = "gemini-2.0-flash-exp";
        this.host = "generativelanguage.googleapis.com";
        this.connectionPromise = null;
        this.maxRetries = 3;
        this.currentRetry = 0;
        this.messageQueue = [];
    }

    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                const uri = `wss://${this.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
                this.ws = new WebSocket(uri);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.currentRetry = 0;
                    resolve(true);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket closed');
                    this.ws = null;
                    this.connectionPromise = null;
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    if (this.currentRetry < this.maxRetries) {
                        this.currentRetry++;
                        setTimeout(() => this.connect(), 1000 * this.currentRetry);
                    } else {
                        reject(new Error('WebSocket connection failed after retries'));
                    }
                };

                // 设置连接超时
                setTimeout(() => {
                    if (this.ws.readyState !== WebSocket.OPEN) {
                        this.ws.close();
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

            } catch (error) {
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    async waitForConnection() {
        await this.connect();
        return new Promise((resolve) => {
            const checkState = () => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    resolve();
                } else if (this.ws.readyState === WebSocket.CONNECTING) {
                    setTimeout(checkState, 100);
                } else {
                    this.connect().then(resolve);
                }
            };
            checkState();
        });
    }

    async sendMessage(message) {
        await this.waitForConnection();

        return new Promise((resolve, reject) => {
            try {
                const messageHandler = async (event) => {
                    try {
                        let data;
                        if (event.data instanceof Blob) {
                            const text = await event.data.text();
                            data = JSON.parse(text);
                        } else {
                            data = JSON.parse(event.data);
                        }
                        this.ws.removeEventListener('message', messageHandler);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                };

                this.ws.addEventListener('message', messageHandler);
                this.ws.send(JSON.stringify(message));
            } catch (error) {
                reject(error);
            }
        });
    }

    async initializeChat() {
        try {
            await this.waitForConnection();

            // 发送初始化消息
            const setupMsg = {
                setup: {
                    model: `models/${this.model}`,
                    generation_config: { response_modalities: ["TEXT"] },
                }
            };

            const setupResponse = await this.sendMessage(setupMsg);
            console.log('Setup response:', setupResponse);

            // 发送初始提示
            const initialMsg = {
                client_content: {
                    turns: [{
                        role: "user",
                        parts: [{
                            text: "你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程，直到用户说OK，我要退出。你的回答永远要保持中文。如果明白了请回答OK"
                        }]
                    }],
                    turn_complete: true
                }
            };

            const response = await this.sendMessage(initialMsg);
            return this.checkInitializationResponse(response);
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    checkInitializationResponse(response) {
        if (!response || !response.serverContent || !response.serverContent.modelTurn) {
            return false;
        }

        const parts = response.serverContent.modelTurn.parts || [];
        return parts.some(part => part.text && part.text.includes('OK'));
    }

    async processAudio(text) {
        try {
            const msg = {
                client_content: {
                    turns: [{
                        role: "user",
                        parts: [{ text }]
                    }],
                    turn_complete: true
                }
            };

            const response = await this.sendMessage(msg);
            return this.parseResponse(response);
        } catch (error) {
            console.error('Process audio error:', error);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            const text = response?.serverContent?.modelTurn?.parts?.[0]?.text || '';
            const lines = text.split('\n');
            
            return {
                recognition: this.extractContent(lines, '语音识别'),
                grammar: this.extractContent(lines, '语法'),
                pronunciation: this.extractContent(lines, '发音'),
                suggestions: this.extractContent(lines, '建议'),
                nextPrompt: this.extractContent(lines, '场景')
            };
        } catch (error) {
            console.error('Parse response error:', error);
            throw error;
        }
    }

    extractContent(lines, key) {
        const line = lines.find(l => l.includes(key));
        return line ? line.split('：')[1]?.trim() || '' : '';
    }

    cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connectionPromise = null;
        this.currentRetry = 0;
    }
}