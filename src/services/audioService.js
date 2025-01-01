export class AudioService {
    constructor() {
        this.stream = null;
        this.audioContext = null;
        this.source = null;
        this.isRecording = false;
        this.workletNode = null;
        this.webSocketService = null;
        this.recordingStoppedCallback = null;  // 添加回调属性
    }


    async initialize() {
        try {
            if (!this.stream) {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 16000
                    }
                });
                
                this.stream = stream;
                this.audioContext = new AudioContext({sampleRate: 16000});
                this.source = this.audioContext.createMediaStreamSource(this.stream);
                
                // 加载并创建 AudioWorklet
                await this.audioContext.audioWorklet.addModule(chrome.runtime.getURL('src/utils/audio-processor.js'));
                this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
                
                // 设置消息处理
                this.workletNode.port.onmessage = (event) => {
                    if (event.data.type === 'audio-data' && this.isRecording && this.webSocketService?.isConnected) {
                        this.webSocketService.sendAudioChunk(event.data.data);
                    }
                };
            }
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            throw error;
        }
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

            // 连接音频节点
            this.source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);
            
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    
    setRecordingStoppedCallback(callback) {
        this.recordingStoppedCallback = callback;
    }

    async stopRecording() {
        if (!this.isRecording) {
            return null;
        }

        this.isRecording = false;
        if (this.source && this.workletNode) {
            this.source.disconnect(this.workletNode);
            this.workletNode.disconnect();
        }

        // 调用停止回调
        if (this.recordingStoppedCallback) {
            await this.recordingStoppedCallback(null);
        }

        return null;
    }   

    setWebSocketService(service) {
        this.webSocketService = service;
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
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }
    }
}