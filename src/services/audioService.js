// src/services/audioService.js
export class AudioService {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.source = null;
    }

    async initialize() {
        try {
            if (!this.stream) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 48000
                    }
                });
                
                this.stream = stream;
                this.audioContext = new AudioContext();
                this.source = this.audioContext.createMediaStreamSource(this.stream);
            }
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            if (error.name === 'NotAllowedError') {
                return false;
            } else if (error.name === 'NotFoundError') {
                alert('No microphone found. Please connect a microphone and try again.');
            }
            return false;
        }
    }

    async startRecording() {
        if (!this.stream) {
            const initialized = await this.initialize();
            if (!initialized) return false;
        }

        try {
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    async stopRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            return null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                resolve(audioBlob);
            };
            this.mediaRecorder.stop();
        });
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.source = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
    }
}