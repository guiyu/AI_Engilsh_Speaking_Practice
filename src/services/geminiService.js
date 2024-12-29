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
        this.isConnecting = false;
    }

    async connect() {
        if (this.isConnecting) {
            return this.connectionPromise;
        }

        this.isConnecting = true;
        this.connectionPromise = new Promise((resolve, reject) => {
            try {
                const uri = `wss://${this.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
                this.ws = new WebSocket(uri);

                const connectionTimeout = setTimeout(() => {
                    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                        this.ws?.close();
                        this.isConnecting = false;
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    clearTimeout(connectionTimeout);
                    this.currentRetry = 0;
                    this.isConnecting = false;
                    resolve(true);
                };

                this.ws.onclose = () => {
                    console.log('WebSocket closed');
                    this.ws = null;
                    this.connectionPromise = null;
                    this.isConnecting = false;
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    if (this.currentRetry < this.maxRetries) {
                        this.currentRetry++;
                        setTimeout(() => {
                            this.isConnecting = false;
                            this.connect();
                        }, 1000 * this.currentRetry);
                    } else {
                        this.isConnecting = false;
                        reject(new Error('WebSocket connection failed after retries'));
                    }
                };

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    async waitForConnection() {
        try {
            await this.connect();
            
            if (!this.ws) {
                throw new Error('WebSocket connection failed');
            }

            return new Promise((resolve) => {
                const checkState = () => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        resolve();
                    } else if (this.ws?.readyState === WebSocket.CONNECTING) {
                        setTimeout(checkState, 100);
                    } else {
                        this.isConnecting = false;
                        this.connect().then(resolve);
                    }
                };
                checkState();
            });
        } catch (error) {
            console.error('Wait for connection error:', error);
            throw error;
        }
    }
}