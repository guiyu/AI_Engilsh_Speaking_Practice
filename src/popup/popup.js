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
        // 获取视图元素 - 移除不存在的permission-view引用
        this.setupView = document.getElementById('setup-view');
        this.practiceView = document.getElementById('practice-view');
        
        // 获取按钮元素
        this.startRecordingBtn = document.getElementById('start-recording');
        this.stopRecordingBtn = document.getElementById('stop-recording');
        
        // 验证必要的DOM元素存在
        if (!this.setupView || !this.practiceView) {
            console.error('Required DOM elements not found');
            return;
        }
    }

    async initializeUI() {
        this.initializeDOMElements();
        await this.checkMicrophonePermission();
        await this.checkApiKeys();
        this.setupEventListeners();
    }

    async checkMicrophonePermission() {
        const micStatus = document.getElementById('mic-status');
        const statusIcon = micStatus?.querySelector('.status-icon');
        const statusText = micStatus?.querySelector('.status-text');
    
        try {
            const permissionResult = await navigator.permissions.query({ name: 'microphone' });
            
            if (permissionResult.state === 'granted') {
                if (statusIcon) statusIcon.textContent = '✅';
                if (statusText) statusText.textContent = '已授权';
                this.updateSaveButtonState();
            } else {
                if (statusIcon) statusIcon.textContent = '⚠️';
                if (statusText) statusText.textContent = '未授权';
                document.getElementById('check-mic')?.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Permission check failed:', error);
            if (statusIcon) statusIcon.textContent = '❌';
            if (statusText) statusText.textContent = '检查失败';
        }
    }

    async checkApiKeys() {
        const keys = await StorageManager.getKeys();
        if (keys.geminiKey) {
            document.getElementById('gemini-key').value = keys.geminiKey;
        }
        if (keys.elevenlabsKey) {
            document.getElementById('elevenlabs-key').value = keys.elevenlabsKey;
        }
        this.updateSaveButtonState();
    }

    updateSaveButtonState() {
        const saveButton = document.getElementById('save-setup');
        const geminiKey = document.getElementById('gemini-key')?.value;
        const micStatus = document.getElementById('mic-status')?.querySelector('.status-text')?.textContent;
    
        if (saveButton) {
            saveButton.disabled = !(geminiKey && micStatus === '已授权');
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
         // 添加麦克风检查按钮事件
        document.getElementById('check-mic')?.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                await this.checkMicrophonePermission();
            } catch (error) {
                console.error('Microphone permission request failed:', error);
            }
        });

        document.getElementById('save-setup')?.addEventListener('click', () => this.handleSaveSetup());
        document.getElementById('start-recording')?.addEventListener('click', () => this.handleStartRecording());
        document.getElementById('stop-recording')?.addEventListener('click', () => this.handleStopRecording());

        // API密钥输入事件
        document.getElementById('gemini-key')?.addEventListener('input', () => {
            this.updateSaveButtonState();
        });

        // 设置按钮事件
        document.getElementById('settings')?.addEventListener('click', () => {
            this.showSetupView();
        });

        // 保存设置事件
        document.getElementById('save-setup')?.addEventListener('click', async () => {
            const geminiKey = document.getElementById('gemini-key')?.value;
            const elevenlabsKey = document.getElementById('elevenlabs-key')?.value;

            if (geminiKey) {
                await StorageManager.saveKeys(geminiKey, elevenlabsKey);
                this.setupServices({ geminiKey, elevenlabsKey });
                await this.initializeAIServices();
                this.showPracticeView();
            }
        });

        // 录音控制按钮
        if (this.startRecordingBtn) {
            this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        }
        if (this.stopRecordingBtn) {
            this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        }
    }

    async initializeAIServices() {
        try {
            // 初始化 Gemini 服务
            const initialized = await this.geminiService.initializeChat();
            if (!initialized) {
                throw new Error('AI服务初始化失败');
            }
        } catch (error) {
            console.error('AI service initialization failed:', error);
            alert('AI服务初始化失败，请检查API密钥是否正确');
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
        // 移除对不存在的permissionView的引用
        if (this.setupView && this.practiceView) {
            this.setupView.classList.add('hidden');
            this.practiceView.classList.add('hidden');
        }
    }

    showSetupView() {
        if (this.setupView && this.practiceView) {
            this.setupView.classList.remove('hidden');
            this.practiceView.classList.add('hidden');
        }
    }

    showPracticeView() {
        if (this.setupView && this.practiceView) {
            this.setupView.classList.add('hidden');
            this.practiceView.classList.remove('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    setButtonState(button, state, message) {
        if (!button) return;
        
        // 重置所有状态
        button.classList.remove('loading', 'success', 'error');
        
        switch (state) {
            case 'loading':
                button.classList.add('loading');
                button.disabled = true;
                if (message) button.textContent = message;
                break;
            case 'success':
                button.classList.add('success');
                setTimeout(() => {
                    button.classList.remove('success');
                }, 2000);
                if (message) button.textContent = message;
                break;
            case 'error':
                button.classList.add('error');
                setTimeout(() => {
                    button.classList.remove('error');
                }, 2000);
                if (message) button.textContent = message;
                break;
            case 'default':
                button.disabled = false;
                if (message) button.textContent = message;
                break;
        }
    }

    async handleSaveSetup() {
        const saveButton = document.getElementById('save-setup');
        const geminiKey = document.getElementById('gemini-key')?.value;
        const elevenlabsKey = document.getElementById('elevenlabs-key')?.value;

        try {
            this.setButtonState(saveButton, 'loading', '保存中...');

            if (geminiKey) {
                await StorageManager.saveKeys(geminiKey, elevenlabsKey);
                this.setupServices({ geminiKey, elevenlabsKey });
                
                const initialized = await this.initializeAIServices();
                if (initialized) {
                    this.setButtonState(saveButton, 'success', '保存成功');
                    this.showToast('设置已保存，正在切换到练习界面');
                    setTimeout(() => this.showPracticeView(), 1500);
                } else {
                    throw new Error('AI服务初始化失败');
                }
            }
        } catch (error) {
            console.error('Save setup error:', error);
            this.setButtonState(saveButton, 'error', '保存失败');
            this.showToast(error.message, 'error');
            setTimeout(() => {
                this.setButtonState(saveButton, 'default', '保存并开始练习');
            }, 2000);
        }
    }

    async handleStartRecording() {
        const startButton = document.getElementById('start-recording');
        const stopButton = document.getElementById('stop-recording');

        try {
            this.setButtonState(startButton, 'loading', '准备录音...');
            const success = await this.audioService.startRecording();
            
            if (success) {
                this.setButtonState(startButton, 'success', '录音中');
                startButton.disabled = true;
                stopButton.disabled = false;
                this.showToast('录音已开始');
            } else {
                throw new Error('无法启动录音');
            }
        } catch (error) {
            console.error('Start recording error:', error);
            this.setButtonState(startButton, 'error', '启动失败');
            this.showToast(error.message, 'error');
            setTimeout(() => {
                this.setButtonState(startButton, 'default', '开始说话');
            }, 2000);
        }
    }

    async handleStopRecording() {
        const startButton = document.getElementById('start-recording');
        const stopButton = document.getElementById('stop-recording');

        try {
            this.setButtonState(stopButton, 'loading', '停止中...');
            const text = await this.recognition.stop();
            const audioBlob = await this.audioService.stopRecording();
            
            this.setButtonState(stopButton, 'success', '已停止');
            startButton.disabled = false;
            stopButton.disabled = true;
            
            await this.processSpeech(text);
            
            setTimeout(() => {
                this.setButtonState(stopButton, 'default', '停止');
                this.setButtonState(startButton, 'default', '开始说话');
            }, 1500);
        } catch (error) {
            console.error('Stop recording error:', error);
            this.setButtonState(stopButton, 'error', '停止失败');
            this.showToast(error.message, 'error');
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