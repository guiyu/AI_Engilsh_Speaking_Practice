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
                        text: `As an English language educator, analyze this sentence: 

ANALYSIS GUIDELINES:
1. Speech Recognition:
- Record the student's exact words
- Note any obvious pronunciation errors

2. Grammar & Expression Analysis:
- Identify key grammatical issues (if any)
- Point out unnatural expressions
- Check sentence structure and word choice

3. Improvement Suggestions:
- Provide 2 more natural expressions
- Focus on making it more idiomatic
- Add intonation guidance if necessary


IMPORTANT NOTES:
- Maintain a professional teaching tone
- Focus on language improvement
- Keep responses concise and clear
- Respond in Chinese
- Stay under 1024 characters

如果明白了，请回复"OK"。`
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
                                text: `分析这句英语："${text}"

请按以下格式回答：

1. 语音识别：
直接复述用户的句子

2. 语法问题：
- 列出主要语法错误（如果有）
- 说明不地道的表达

3. 改进建议：
- 给出1-2个更地道的表达方式
- 解释为什么这样更好

4. 下一句练习：
根据当前话题给出相关的练习句子

注意：
- 每个部分限制在2-3行
- 重点关注表达是否地道
- 只在发音有明显错误时才指出`
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
    
            const sections = text.split('\n').filter(line => line.trim());
            const result = {
                recognition: '',
                grammar: '',
                pronunciation: '',
                suggestions: '',
                nextPrompt: ''
            };
    
            let currentSection = '';
            for (const line of sections) {
                if (line.includes('语音识别')) {
                    currentSection = 'recognition';
                    continue;
                } else if (line.includes('语法问题')) {
                    currentSection = 'grammar';
                    continue;
                } else if (line.includes('改进建议')) {
                    currentSection = 'suggestions';
                    continue;
                } else if (line.includes('下一句练习')) {
                    currentSection = 'nextPrompt';
                    continue;
                }
    
                if (currentSection && result[currentSection] !== undefined) {
                    if (line.trim() && !line.includes('：')) {
                        result[currentSection] += (result[currentSection] ? '\n' : '') + line.trim();
                    }
                }
            }
    
            // 确保至少有建议部分
            if (!result.grammar && !result.pronunciation && !result.suggestions) {
                result.suggestions = sections.join('\n');
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