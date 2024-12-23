import { AudioService } from '../services/audioService.js';
import { GeminiService } from '../services/geminiService.js';
import { ElevenlabsService } from '../services/elevenlabsService.js';
import { StorageManager } from '../utils/storage.js';
import { AudioVisualizer } from '../utils/audioVisualizer.js';
import { SpeechRecognition } from '../utils/speechRecognition.js';

class PopupManager {
    constructor() {
        this.audioService = new AudioService();
        this.visualizer = null;
        this.geminiService = null;
        this.elevenlabsService = null;
        this.recognition = new SpeechRecognition();
        
        this.setupView = document.getElementById('setup-view');
        this.practiceView = document.getElementById('practice-view');
        
        this.initializeUI();
    }

    async initializeUI() {
        const keys = await StorageManager.getKeys();
        if (keys.geminiKey) {
            this.setupServices(keys);
            this.showPracticeView();
        } else {
            this.setupView.classList.remove('hidden');
            this.setupEventListeners();
        }
    }

    setupServices(keys) {
        this.geminiService = new GeminiService(keys.geminiKey);
        if (keys.elevenlabsKey) {
            this.elevenlabsService = new ElevenlabsService(keys.elevenlabsKey);
        }
    }

    setupEventListeners() {
        document.getElementById('save-setup').addEventListener('click', async () => {
            const geminiKey = document.getElementById('gemini-key').value;
            const elevenlabsKey = document.getElementById('elevenlabs-key').value;
            
            if (!geminiKey) {
                alert('Gemini API Key is required');
                return;
            }
            
            await StorageManager.saveKeys(geminiKey, elevenlabsKey);
            this.setupServices({ geminiKey, elevenlabsKey });
            this.showPracticeView();
        });

        document.getElementById('start-recording').addEventListener('click', () => this.startRecording());
        document.getElementById('stop-recording').addEventListener('click', () => this.stopRecording());
        document.getElementById('settings').addEventListener('click', () => this.showSetupView());
    }

    async stopRecording() {
        const text = await this.recognition.stop();
        const audioBlob = await this.audioService.stopRecording();
        
        document.getElementById('start-recording').disabled = false;
        document.getElementById('stop-recording').disabled = true;
        
        await this.processSpeech(text);
    }

    async processSpeech(text) {
        try {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('feedback').classList.add('hidden');
            
            document.getElementById('recognized-text').textContent = text;
            
            const feedback = await this.geminiService.processAudio(text);
            this.displayFeedback(feedback);
            
            if (this.elevenlabsService) {
                const audio = await this.elevenlabsService.synthesizeSpeech(feedback.suggestions);
                audio.play();
            }
        } catch (error) {
            alert('Error processing speech: ' + error.message);
        } finally {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('feedback').classList.remove('hidden');
        }
    }

    displayFeedback(feedback) {
        const aiFeedback = document.getElementById('ai-feedback');
        const nextSuggestion = document.getElementById('next-suggestion');
        
        aiFeedback.innerHTML = `
            <div class="feedback-item">
                <strong>语法：</strong>
                <p>${feedback.grammar}</p>
            </div>
            <div class="feedback-item">
                <strong>表达：</strong>
                <p>${feedback.expression}</p>
            </div>
            <div class="feedback-item">
                <strong>发音：</strong>
                <p>${feedback.pronunciation}</p>
            </div>
            <div class="feedback-item">
                <strong>建议：</strong>
                <p>${feedback.suggestions}</p>
            </div>
        `;
        
        nextSuggestion.textContent = feedback.nextPrompt;
    }

    showPracticeView() {
        this.setupView.classList.add('hidden');
        this.practiceView.classList.remove('hidden');
    }

    showSetupView() {
        this.practiceView.classList.add('hidden');
        this.setupView.classList.remove('hidden');
    }
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});