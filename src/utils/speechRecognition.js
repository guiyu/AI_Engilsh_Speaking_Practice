export class SpeechRecognition {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.transcript = '';
        this.setupRecognition();
    }


    setupRecognition() {
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.transcript = finalTranscript || interimTranscript;
            
            // 保持原有的DOM更新
            const recognizedTextElement = document.getElementById('recognized-text');
            if (recognizedTextElement) {
                recognizedTextElement.textContent = this.transcript;
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if(event.error === 'not-allowed') {
                throw new Error('Microphone access denied');
            }
        };
    }

    async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Permission request failed:', error);
            return false;
        }
    }

    async start() {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            throw new Error('Microphone permission is required');
        }
        
        this.transcript = '';
        this.recognition.start();
    }

    stop() {
        return new Promise((resolve) => {
            this.recognition.onend = () => {
                resolve(this.transcript);
            };
            this.recognition.stop();
        });
    }
}
