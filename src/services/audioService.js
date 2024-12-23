// audioService.js
export class AudioService {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    async start() {
        if (!this.stream) return false;
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.audioChunks = [];
        
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };
        
        this.mediaRecorder.start();
        return true;
    }

    async stop() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                resolve(audioBlob);
            };
            this.mediaRecorder.stop();
        });
    }

    async initialize() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            this.stream = stream;
            this.audioContext = new AudioContext();
            this.source = this.audioContext.createMediaStreamSource(stream);
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            if (error.name === 'NotAllowedError') {
                alert('Please allow microphone access in your browser settings');
            }
            return false;
        }
    }

    startRecording() {
        if (!this.stream) return false;
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.audioChunks = [];
        
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };
        
        this.mediaRecorder.start();
        return true;
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                resolve(audioBlob);
            };
            this.mediaRecorder.stop();
        });
    }
}

// geminiService.js
export class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent';
    }

    async processAudio(audioBlob) {
        // Implement Gemini API integration
    }
}

// elevenlabsService.js
export class ElevenlabsService {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async synthesizeSpeech(text) {
        // Implement ElevenLabs API integration
    }
}