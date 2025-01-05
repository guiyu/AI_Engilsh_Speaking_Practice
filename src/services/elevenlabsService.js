import { Logger } from '../utils/logger.js';

export class ElevenlabsService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.voiceId = 'nPczCjzI2devNBz1zQrb'; // Default voice ID
    }

    async synthesizeSpeech(text) {
        try {
            if (!this.apiKey || !text) {
                Logger.warn('Missing API key or text for speech synthesis');
                return null;
            }

            const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_flash_v2_5',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                Logger.error('ElevenLabs API error response:', errorText);
                return null;
            }

            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                Logger.error('Received empty audio blob');
                return null;
            }

            const audio = new Audio(URL.createObjectURL(audioBlob));
            
            // 添加错误处理
            audio.onerror = (e) => {
                Logger.error('Audio playback error:', e);
                URL.revokeObjectURL(audio.src);
            };

            // 添加加载处理
            audio.onloadeddata = () => {
                Logger.info('Audio loaded successfully');
            };
            
            // 添加结束处理
            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
                Logger.info('Audio playback completed');
            };

            return audio;
        } catch (error) {
            Logger.error('ElevenLabs API error:', error);
            return null;
        }
    }
}