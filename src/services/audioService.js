// src/services/audioService.js

export class AudioService {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.source = null;
        this.isRecording = false;
        this.recordingStoppedCallback = null;
    }

    async initialize() {
        try {
            if (!this.stream) {
                // 先检查权限
                const permissionResult = await navigator.permissions.query({ name: 'microphone' });
                
                if (permissionResult.state === 'denied') {
                    throw new Error('麦克风访问被拒绝');
                }
                
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
                throw new Error('请允许麦克风访问权限');
            }
            throw error;
        }
    }

    setRecordingStoppedCallback(callback) {
        this.recordingStoppedCallback = callback;
    }

    async startRecording() {
        if (this.isRecording) {
            return false;
        }

        try {
            if (!this.stream) {
                const initialized = await this.initialize();
                if (!initialized) return false;
            }

            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.isRecording = false;
                this.audioChunks = [];

                if (this.recordingStoppedCallback) {
                    await this.recordingStoppedCallback(audioBlob);
                }
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
            this.source?.disconnect();
        });
    }

    cleanup() {
        this.isRecording = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }
}