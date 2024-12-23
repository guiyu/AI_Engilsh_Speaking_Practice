export class ElevenlabsService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.voiceId = 'nPczCjzI2devNBz1zQrb'; // Default voice ID
    }

    async synthesizeSpeech(text) {
        try {
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
                throw new Error('Speech synthesis failed');
            }

            const audioBlob = await response.blob();
            return new Audio(URL.createObjectURL(audioBlob));
        } catch (error) {
            console.error('ElevenLabs API error:', error);
            throw new Error('Failed to generate speech');
        }
    }
}