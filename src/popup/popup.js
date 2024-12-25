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
        
        this.permissionView = document.getElementById('permission-view');
        this.setupView = document.getElementById('setup-view');
        this.practiceView = document.getElementById('practice-view');
        
        this.initializeUI();
    }

    async initializeUI() {
        try {
            // 检查麦克风权限
            const permissionResult = await navigator.permissions.query({ name: 'microphone' });
            
            if (permissionResult.state === 'granted') {
                // 已有权限，检查API设置
                await this.checkApiSetup();
            } else {
                // 显示权限请求界面
                this.showPermissionView();
            }
        } catch (error) {
            console.error('Permission check failed:', error);
            this.showPermissionView();
        }
    }


    async checkApiSetup() {
        const keys = await StorageManager.getKeys();
        if (keys.geminiKey) {
            this.setupServices(keys);
            this.showPracticeView();
        } else {
            this.showSetupView();
        }
    }

    showPermissionView() {
        this.permissionView.classList.remove('hidden');
        this.setupView.classList.add('hidden');
        this.practiceView.classList.add('hidden');
        
        document.getElementById('request-permission').addEventListener('click', 
            () => this.requestMicrophonePermission());
    }

    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // 立即停止stream，我们只是要请求权限
            stream.getTracks().forEach(track => track.stop());
            
            // 权限获取成功，继续设置流程
            await this.checkApiSetup();
        } catch (error) {
            console.error('Mic permission error:', error);
            alert('Please allow microphone access in your browser settings and try again.');
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

        document.getElementById('start-recording').addEventListener('click', () => 
            this.startRecording()
        );
        document.getElementById('stop-recording').addEventListener('click', () => 
            this.stopRecording()
        );
        document.getElementById('settings').addEventListener('click', () => 
            this.showSetupView()
        );
        document.getElementById('request-mic').addEventListener('click', () => {
            this.requestMicrophonePermission();
        });
    }

    async checkAndRequestMicrophone() {
        try {
            await chrome.permissions.request({
                permissions: ['microphone   ']
            });
            return await this.audioService.initialize();
        } catch (error) {
            console.error('Permission request failed:', error);
            return false;
        }
    }

    async startRecording() {
        try {
            const success = await this.audioService.initialize();
            if (!success) return;

            this.recognition.start();
            await this.audioService.startRecording();
            
            if (!this.visualizer) {
                this.visualizer = new AudioVisualizer(document.getElementById('visualizer'));
                this.visualizer.initialize(this.audioService.audioContext, this.audioService.source);
            }

            document.getElementById('start-recording').disabled = true;
            document.getElementById('stop-recording').disabled = false;
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Could not start recording. Please check your microphone permissions.');
        }
    }

    async requestMicrophonePermission() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            document.getElementById('request-mic').style.display = 'none';
            return true;
        } catch (error) {
            console.error('Mic permission error:', error);
            return false;
        }
    }

    async stopRecording() {
        const text = await this.recognition.stop();
        const audioBlob = await this.audioService.stop();
        
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