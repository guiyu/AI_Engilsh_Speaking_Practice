export class WebSocketService {
    constructor(apiKey) {
        console.log('WebSocketService initialized with key:', apiKey ? 'present' : 'missing');
        this.apiKey = apiKey;
        this.ws = null;
        this.host = "generativelanguage.googleapis.com";
        this.model = "gemini-2.0-flash-exp";
        this.isConnected = false;
        this.onMessageCallback = null;
    }

    async connect() {
        const uri = `wss://${this.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        console.log('Attempting to connect to:', uri);

        try {
            this.ws = new WebSocket(uri);
            
            this.ws.onopen = () => {
                console.log('WebSocket connection opened');
                this.isConnected = true;
                this.setupInitialPrompt();
            };

            this.ws.onmessage = async (event) => {
                console.log('WebSocket received message:', event.data);
                try {
                    let data;
                    if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        data = JSON.parse(text);
                    } else if (typeof event.data === 'string') {
                        data = JSON.parse(event.data);
                    }
                    console.log('WebSocket received data:', data); // 添加日志
                    if (this.onMessageCallback) {
                        this.onMessageCallback(data);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket Error:', error);
                this.isConnected = false;
            };

            this.ws.onclose = () => {
                console.log('WebSocket closed:', event.code, event.reason);
                this.isConnected = false;
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            throw error;
        }
    }

    async setupInitialPrompt() {
        const setupMsg = {
            setup: {
                model: `models/${this.model}`,
                generation_config: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                    response_modalities: ["TEXT"]
                },
                user_prompt: {
                    text: `你是一名专业的英语口语指导老师。请对用户的发音提供以下分析：
    1. 语音识别：(准确识别的句子)
    2. 语法分析：(分析语法结构是否正确)
    3. 发音评估：(评估重点音素发音)
    4. 改进建议：(给出具体的发音指导)
    
    请用中文回复，每个部分分别说明。`
                }
            }
        };
        console.log('Sending setup message:', setupMsg); // 添加日志
        await this.sendMessage(setupMsg);
    }

    async sendAudioChunk(audioData) {
        console.log('Sending audio chunk, size:', audioData.byteLength);

        if (!this.isConnected) return;

        try {
            const msg = {
                realtime_input: {
                    media_chunks: [{
                        data: this._arrayBufferToBase64(audioData),
                        mime_type: "audio/pcm"
                    }]
                }
            };
            await this.sendMessage(msg);
        } catch (error) {
            console.error('Error sending audio chunk:', error);
        }
    }

    async sendMessage(msg) {
        if (this.ws && this.isConnected) {
            try {
                const jsonString = JSON.stringify(msg);
                this.ws.send(jsonString);
            } catch (error) {
                console.error('Error sending message:', error);
                throw error;
            }
        }
    }

    _arrayBufferToBase64(buffer) {
        // 确保我们有一个 ArrayBuffer 或 TypedArray
        const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return btoa(binary);
    }

    setMessageCallback(callback) {
        this.onMessageCallback = callback;
    }
    

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}