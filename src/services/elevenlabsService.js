import { Logger } from '../utils/logger.js';

export class ElevenlabsService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.voiceId = 'nPczCjzI2devNBz1zQrb';
    }

    async synthesizeSpeech(text) {
        try {
            if (!this.apiKey || !text) {
                console.warn('Missing API key or text for speech synthesis');
                return { error: 'missing_parameters' };
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
                const errorJson = await response.json();
                Logger.error('ElevenLabs API error response:', errorJson);
                
                // 检查是否是配额超限错误
                if (errorJson.detail?.status === 'quota_exceeded') {
                    return { 
                        error: 'quota_exceeded',
                        message: errorJson.detail.message
                    };
                }
                
                return { error: 'api_error' };
            }

            // 其余代码保持不变...
            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                Logger.error('Received empty audio blob');
                return { error: 'empty_audio' };
            }

            const audio = new Audio(URL.createObjectURL(audioBlob));
            audio.onerror = (e) => {
                Logger.error('Audio playback error:', e);
                URL.revokeObjectURL(audio.src);
            };

            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
            };

            return { audio };
            
        } catch (error) {
            Logger.error('ElevenLabs API error:', error);
            return { error: 'unknown_error' };
        }
    }
}