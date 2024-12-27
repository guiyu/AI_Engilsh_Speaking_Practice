// src/services/geminiService.js

export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.context = [];
    }

    async initializeChat() {
        const initialPrompt = `你是一名专业的英语口语指导老师，你需要帮助用户纠正语法发音，用户将会说一句英文，然后你会给出识别出来的英语是什么，并且告诉他发音中有什么问题，语法有什么错误，并且一步一步的纠正他的发音，当一次发音正确后，根据当前语句提出下一个场景的语句,然后一直循环这个过程。你的回答永远要保持中文。`;
        
        const response = await this.generateResponse(initialPrompt);
        if (response.includes('OK')) {
            return true;
        }
        return false;
    }

    async processAudio(text) {
        const prompt = `用户说的英语是："${text}"
请按以下格式提供分析：

1. 语音识别结果
2. 语法分析
3. 发音要点
4. 改进建议
5. 场景练习建议`;

        try {
            const response = await this.generateResponse(prompt);
            return this.parseResponse(response);
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('AI反馈生成失败');
        }
    }

    async generateResponse(prompt) {
        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                })
            });

            if (!response.ok) {
                throw new Error('API请求失败');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    parseResponse(response) {
        const sections = response.split('\n\n');
        
        return {
            recognition: sections.find(s => s.includes('语音识别'))?.split('语音识别结果：')[1]?.trim() || '',
            grammar: sections.find(s => s.includes('语法'))?.split('语法分析：')[1]?.trim() || '',
            pronunciation: sections.find(s => s.includes('发音'))?.split('发音要点：')[1]?.trim() || '',
            suggestions: sections.find(s => s.includes('改进建议'))?.split('改进建议：')[1]?.trim() || '',
            nextPrompt: sections.find(s => s.includes('场景练习'))?.split('场景练习建议：')[1]?.trim() || ''
        };
    }
}