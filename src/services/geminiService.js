export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    async processAudio(text) {
        const prompt = `你是一名专业的英语口语指导老师，请分析以下识别出的英语文本并提供反馈：
"${text}"

请提供以下方面的分析：
1. 语法正确性
2. 表达是否地道
3. 可能的发音问题
4. 改进建议
5. 基于当前对话情境，建议下一个练习句子`;

        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                })
            });

            const data = await response.json();
            return this.parseGeminiResponse(data);
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to get AI feedback');
        }
    }

    parseGeminiResponse(data) {
        try {
            const text = data.candidates[0].content.parts[0].text;
            const sections = text.split('\n\n');
            
            return {
                grammar: sections.find(s => s.includes('语法'))?.replace('语法：', '').trim(),
                expression: sections.find(s => s.includes('表达'))?.replace('表达：', '').trim(),
                pronunciation: sections.find(s => s.includes('发音'))?.replace('发音：', '').trim(),
                suggestions: sections.find(s => s.includes('建议'))?.replace('建议：', '').trim(),
                nextPrompt: sections.find(s => s.includes('下一个练习'))?.replace('下一个练习：', '').trim()
            };
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            throw new Error('Failed to parse AI feedback');
        }
    }
}