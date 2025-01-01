// src/services/geminiService.js

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.model = "gemini-2.0-flash-exp";
        this.host = "generativelanguage.googleapis.com";
        this.baseUrl = `https://${this.host}/v1alpha/models`;
        this.SAMPLE_RATE = 16000;
        this.CHANNELS = 1;
        this.FORMAT = 16;
        this.CHUNK_SIZE = 512;
        
        this.requestTimestamps = [];
        this.MAX_REQUESTS_PER_MINUTE = 15;
        this.WINDOW_SIZE_MS = 60000;
        this.MIN_REQUEST_INTERVAL = 4000;
        this.MAX_RETRIES = 3;
    }

    async initializeChat() {
        try {
            if (!this.apiKey) {
                throw new Error('未设置API密钥');
            }

            const initialMsg = {
                contents: [
                    {
                        parts: [
                            {
                                text: "你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程，直到用户说OK，我要退出。你的回答永远要保持中文。如果明白了请回答OK两个字"
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            };

            console.log('Sending initialization request:', JSON.stringify(initialMsg, null, 2));

            const response = await this.makeRequest(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                initialMsg
            );

            console.log('Received initialization response:', JSON.stringify(response, null, 2));
            return this.checkInitializationResponse(response);
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    async makeRequest(endpoint, body) {
        try {
            await this.waitForQuota();

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(errorText);
            }

            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    async waitForQuota() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(
            timestamp => now - timestamp < this.WINDOW_SIZE_MS
        );

        if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_MINUTE) {
            const waitTime = this.WINDOW_SIZE_MS - (now - this.requestTimestamps[0]);
            console.log(`等待配额重置，${Math.ceil(waitTime/1000)}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.waitForQuota();
        }

        const lastRequest = this.requestTimestamps[this.requestTimestamps.length - 1];
        if (lastRequest && now - lastRequest < this.MIN_REQUEST_INTERVAL) {
            const waitTime = this.MIN_REQUEST_INTERVAL - (now - lastRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.requestTimestamps.push(now);
    }

    checkInitializationResponse(response) {
        try {
            console.log('Checking initialization response:', response);
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
            const msg = {
                contents: [
                    {
                        parts: [
                            {
                                text: `用户说了这句话: ${text}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            };

            const response = await this.makeRequest(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                msg
            );

            return this.parseResponse(response);
        } catch (error) {
            console.error('Process audio error:', error);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            console.log('Parsing response:', response); // 添加日志
    
            if (!response) {
                throw new Error('Empty response');
            }
    
            // 处理 candidates 格式的响应
            if (response.candidates) {
                const text = response.candidates[0]?.content?.parts?.[0]?.text || '';
                console.log('Extracted text from candidates:', text);
                return this.parseTextResponse(text);
            }
    
            // 处理 serverContent 格式的响应
            if (response.serverContent) {
                const parts = response.serverContent.modelTurn?.parts || [];
                const text = parts.map(part => part.text || '').join('\n');
                console.log('Extracted text from serverContent:', text);
                return this.parseTextResponse(text);
            }
    
            throw new Error('Invalid response format');
        } catch (error) {
            console.error('Parse response error:', error);
            return {
                recognition: 'Error: 无法解析响应',
                grammar: '无法分析',
                pronunciation: '无法分析',
                suggestions: '请重试',
                nextPrompt: '请说一个新的句子'
            };
        }
    }

    parseTextResponse(text) {
        const sections = text.split('\n').filter(line => line.trim());
        const result = {
            recognition: '',
            grammar: '',
            pronunciation: '',
            suggestions: '',
            nextPrompt: '请说一个新的句子'
        };
    
        for (const line of sections) {
            if (line.includes('语音识别：')) {
                result.recognition = line.split('：')[1]?.trim() || '';
            } else if (line.includes('语法分析：')) {
                result.grammar = line.split('：')[1]?.trim() || '';
            } else if (line.includes('发音评估：')) {
                result.pronunciation = line.split('：')[1]?.trim() || '';
            } else if (line.includes('改进建议：')) {
                result.suggestions = line.split('：')[1]?.trim() || '';
            }
        }
    
        return result;
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