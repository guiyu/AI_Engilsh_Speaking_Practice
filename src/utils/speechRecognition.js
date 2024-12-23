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
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };
    }

    start() {
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