// src/services/geminiService.js
import { Logger } from '../utils/logger.js';

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
                contents: [{
                    parts: [{
                        text: `你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程。你的回答永远要保持中文：
    1. 语音识别：<用户说的原文>
    2. 语法分析：<分析句子语法正确性和结构>
    3. 发音指导：<分析关键音素，重音和语调>
    4. 实用建议：<2-3个类似场景的标准回答>
    5. 下一句：<根据当前主题建议练习的下一句>
    
    请严格按照此格式回复，每个部分另起一行，仅在每个部分后提供对应的内容。如果明白了请回答OK。`
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            };

            Logger.log('Sending initialization request:', JSON.stringify(initialMsg, null, 2));

            const response = await this.makeRequest(
                `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
                initialMsg
            );

            Logger.log('Received initialization response:', JSON.stringify(response, null, 2));
            return this.checkInitializationResponse(response);
        } catch (error) {
            Logger.error('Initialization failed:', error);
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
                Logger.error('API Error Response:', errorText);
                throw new Error(errorText);
            }

            return await response.json();
        } catch (error) {
            Logger.error('Request failed:', error);
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
            Logger.log(`等待配额重置，${Math.ceil(waitTime/1000)}秒后重试...`);
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
            Logger.log('Checking initialization response:', response);
            if (!response || !response.candidates || !response.candidates[0]) {
                Logger.error('Invalid response format:', response);
                return false;
            }

            const text = response.candidates[0].content?.parts?.[0]?.text || '';
            Logger.log('AI Response:', text);
            return text.includes('OK');
        } catch (error) {
            Logger.error('Error checking initialization response:', error);
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
            Logger.error('Process audio error:', error);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            Logger.log('Parsing response:', response);
            if (!response.candidates || !response.candidates[0]) {
                throw new Error('Invalid response format');
            }
    
            const text = response.candidates[0].content?.parts?.[0]?.text || '';
            Logger.log('Full AI response:', text);
    
            // 提取用户的原始输入
            let recognition = '';
            const matchRecognition = text.match(/用户说[：:]\s*[""](.+?)[""]/) || 
                                   text.match(/识别[：:]\s*[""](.+?)[""]/);
            if (matchRecognition) {
                recognition = matchRecognition[1];
            }
    
            // 把Markdown格式的列表项转换为正常文本
            const cleanText = text.replace(/\*\*/g, '')  // 移除加粗标记
                                 .replace(/\* /g, '')    // 移除列表标记
                                 .split('\n')            // 按行分割
                                 .map(line => line.trim())
                                 .filter(line => line);  // 移除空行
    
            // 构建返回对象
            const result = {
                recognition: recognition,
                grammar: '',
                pronunciation: '',
                suggestions: '',
                nextPrompt: ''
            };
    
            // 尝试提取各部分内容
            let currentSection = '';
            for (const line of cleanText) {
                // 根据关键词识别段落类型
                if (line.includes('语法') || line.includes('句子结构')) {
                    currentSection = 'grammar';
                    continue;
                } else if (line.includes('发音') || line.includes('音素')) {
                    currentSection = 'pronunciation';
                    continue;
                } else if (line.includes('建议') || line.includes('改进')) {
                    currentSection = 'suggestions';
                    continue;
                }
    
                // 累加当前段落的内容
                if (currentSection && result[currentSection] !== undefined) {
                    result[currentSection] += (result[currentSection] ? '\n' : '') + line;
                }
            }
    
            // 如果没有结构化解析出内容，就把完整回复放到suggestions中
            if (!result.grammar && !result.pronunciation && !result.suggestions) {
                result.suggestions = cleanText.join('\n');
            }
    
            Logger.log('Parsed result:', result);
            return result;
        } catch (error) {
            Logger.error('Parse response error:', error);
            throw error;
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
            Logger.error(`Error extracting ${key}:`, error);
            return '';
        }
    }
}