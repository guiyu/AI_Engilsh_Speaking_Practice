// src/popup/popup.js

import { AudioService } from '../services/audioService.js';
import { GeminiService } from '../services/geminiService.js';
import { ElevenlabsService } from '../services/elevenlabsService.js';
import { StorageManager } from '../utils/storage.js';
import { AudioVisualizer } from '../utils/audioVisualizer.js';
import { SpeechRecognition } from '../utils/speechRecognition.js';

class PopupManager {
    constructor() {
        // 初始化服务
        this.audioService = new AudioService();
        this.visualizer = null;
        this.geminiService = null;
        this.elevenlabsService = null;
        this.recognition = new SpeechRecognition();
        
        // 获取DOM元素引用
        this.permissionView = null;
        this.setupView = null;
        this.practiceView = null;
        
        // 确保DOM加载完成后再初始化UI
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeDOMElements();
            this.initializeUI();
            this.setupEventListeners();
        });
    }

    initializeDOMElements() {
        // 获取视图元素
        this.permissionView = document.getElementById('permission-view');
        this.setupView = document.getElementById('setup-view');
        this.practiceView = document.getElementById('practice-view');
        
        // 获取按钮元素
        this.requestPermissionBtn = document.getElementById('request-permission');
        this.saveSetupBtn = document.getElementById('save-setup');
        this.startRecordingBtn = document.getElementById('start-recording');
        this.stopRecordingBtn = document.getElementById('stop-recording');
        
        // 验证所有必要的DOM元素都存在
        if (!this.permissionView || !this.setupView || !this.practiceView) {
            console.error('Required DOM elements not found');
            return;
        }
    }

    async initializeUI() {
        this.initializeDOMElements();
        try {
            const result = await this.audioService.initialize();
            if (result) {
                await this.checkApiSetup();
            } else {
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

    setupServices(keys) {
        this.geminiService = new GeminiService(keys.geminiKey);
        if (keys.elevenlabsKey) {
            this.elevenlabsService = new ElevenlabsService(keys.elevenlabsKey);
        }
    }

    setupEventListeners() {
        // 权限请求按钮
        if (this.requestPermissionBtn) {
            this.requestPermissionBtn.addEventListener('click', () => this.requestMicrophonePermission());
        }

        // 设置保存按钮
        if (this.saveSetupBtn) {
            this.saveSetupBtn.addEventListener('click', async () => {
                const geminiKey = document.getElementById('gemini-key')?.value;
                const elevenlabsKey = document.getElementById('elevenlabs-key')?.value;
                
                if (!geminiKey) {
                    alert('Gemini API Key is required');
                    return;
                }
                
                await StorageManager.saveKeys(geminiKey, elevenlabsKey);
                this.setupServices({ geminiKey, elevenlabsKey });
                this.showPracticeView();
            });
        }

        // 录音控制按钮
        if (this.startRecordingBtn) {
            this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        }
        if (this.stopRecordingBtn) {
            this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        }
    }

    async requestMicrophonePermission() {
        try {
            const result = await this.audioService.initialize();
            if (result) {
                await this.checkApiSetup();
            } else {
                alert('Please allow microphone access in your browser settings and try again.');
            }
        } catch (error) {
            console.error('Mic permission error:', error);
            alert('Microphone access is required for this app to work.');
        }
    }

    showPermissionView() {
        if (this.permissionView && this.setupView && this.practiceView) {
            this.permissionView.classList.remove('hidden');
            this.setupView.classList.add('hidden');
            this.practiceView.classList.add('hidden');
        }
    }

    showSetupView() {
        if (this.permissionView && this.setupView && this.practiceView) {
            this.permissionView.classList.add('hidden');
            this.setupView.classList.remove('hidden');
            this.practiceView.classList.add('hidden');
        }
    }

    showPracticeView() {
        if (this.permissionView && this.setupView && this.practiceView) {
            this.permissionView.classList.add('hidden');
            this.setupView.classList.add('hidden');
            this.practiceView.classList.remove('hidden');
        }
    }

    async startRecording() {
        try {
            const success = await this.audioService.startRecording();
            if (!success) {
                alert('Could not start recording. Please check your microphone permissions.');
                return;
            }

            if (!this.visualizer) {
                const visualizerElement = document.getElementById('visualizer');
                if (visualizerElement) {
                    this.visualizer = new AudioVisualizer(visualizerElement);
                    this.visualizer.initialize(this.audioService.audioContext, this.audioService.source);
                }
            }

            if (this.startRecordingBtn) this.startRecordingBtn.disabled = true;
            if (this.stopRecordingBtn) this.stopRecordingBtn.disabled = false;
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Could not start recording. Please check your microphone permissions.');
        }
    }

    async stopRecording() {
        try {
            const text = await this.recognition.stop();
            const audioBlob = await this.audioService.stopRecording();
            
            if (this.startRecordingBtn) this.startRecordingBtn.disabled = false;
            if (this.stopRecordingBtn) this.stopRecordingBtn.disabled = true;
            
            await this.processSpeech(text);
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    }

    async processSpeech(text) {
        const loadingElement = document.getElementById('loading');
        const feedbackElement = document.getElementById('feedback');
        
        try {
            if (loadingElement) loadingElement.classList.remove('hidden');
            if (feedbackElement) feedbackElement.classList.add('hidden');
            
            const recognizedTextElement = document.getElementById('recognized-text');
            if (recognizedTextElement) recognizedTextElement.textContent = text;
            
            const feedback = await this.geminiService.processAudio(text);
            this.displayFeedback(feedback);
            
            if (this.elevenlabsService) {
                const audio = await this.elevenlabsService.synthesizeSpeech(feedback.suggestions);
                audio.play();
            }
        } catch (error) {
            alert('Error processing speech: ' + error.message);
        } finally {
            if (loadingElement) loadingElement.classList.add('hidden');
            if (feedbackElement) feedbackElement.classList.remove('hidden');
        }
    }

    displayFeedback(feedback) {
        const aiFeedback = document.getElementById('ai-feedback');
        const nextSuggestion = document.getElementById('next-suggestion');
        
        if (aiFeedback) {
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
        }
        
        if (nextSuggestion) {
            nextSuggestion.textContent = feedback.nextPrompt;
        }
    }
}

// 初始化扩展程序
new PopupManager();

export default PopupManager;