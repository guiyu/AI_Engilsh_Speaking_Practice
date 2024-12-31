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
        this.isProcessing = false;

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            document.getElementById('recognized-text').textContent = transcript;
        };
        
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

            // 首先尝试获取媒体设备权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000
                }
             });
            // 立即停止流，以释放麦克风
             stream.getTracks().forEach(track => track.stop());
            // 然后再查询权限状态
            const permissionResult = await navigator.permissions.query({ name: 'microphone' });
            
            if (permissionResult.state === 'granted') {
                if (statusIcon) statusIcon.textContent = '✅';
                if (statusText) statusText.textContent = '已授权';
                this.updateSaveButtonState();
                return true;
            } else {
                if (statusIcon) statusIcon.textContent = '⚠️';
                if (statusText) statusText.textContent = '未授权';
                document.getElementById('check-mic')?.classList.remove('hidden');
                return false;
            }
        } catch (error) {
            console.error('Permission check failed:', error);
            if (statusIcon) statusIcon.textContent = '❌';
            if (statusText) statusText.textContent = '检查失败';
            return false;
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
        if (keys.geminiKey) {
            // 确保GeminiService实例被正确创建
            try {
                this.geminiService = new GeminiService(keys.geminiKey);
                console.log('Gemini service created successfully');
            } catch (error) {
                console.error('Failed to create Gemini service:', error);
                throw new Error('Gemini服务创建失败');
            }
        }
    
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
            if (!this.geminiService) {
                throw new Error('Gemini服务未正确初始化');
            }
    
            console.log('Starting AI service initialization...');
            const initialized = await this.geminiService.initializeChat();
            console.log('AI service initialization result:', initialized);
    
            if (!initialized) {
                console.error('AI service initialization returned false');
                return false;
            }
    
            return true;
        } catch (error) {
            console.error('AI service initialization error:', error);
            throw error;
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
                // 先保存密钥
                await StorageManager.saveKeys(geminiKey, elevenlabsKey);
                
                // 设置服务
                this.setupServices({ geminiKey, elevenlabsKey });
                
                // 尝试初始化AI服务
                try {
                    const initResult = await this.initializeAIServices();
                    if (!initResult) {
                        throw new Error('AI服务初始化失败');
                    }
                    
                    this.setButtonState(saveButton, 'success', '保存成功');
                    this.showToast('设置已保存，正在切换到练习界面');
                    setTimeout(() => this.showPracticeView(), 1500);
                } catch (initError) {
                    throw new Error('AI服务初始化失败: ' + initError.message);
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
        const visualizer = document.getElementById('visualizer');

        try {
            // 首先检查权限
            const hasPermission = await this.checkMicrophonePermission();
            if (!hasPermission) {
                throw new Error('需要麦克风访问权限');
            }

            this.setButtonState(startButton, 'loading', '准备录音...');

            // 确保 AudioService 已正确初始化
            if (!this.audioService) {
                this.audioService = new AudioService();
                await this.audioService.initialize();
            }

            // 设置录音停止回调
            this.audioService.setRecordingStoppedCallback(async (audioBlob) => {
                if (this.visualizer) {
                    this.visualizer.stop();
                }
                const recognizedText = await this.recognition?.stop();
                await this.processSpeech(recognizedText || '');
            });

            // 先启动语音识别
            if (this.recognition) {
                try {
                    await this.recognition.start();
                } catch (recognitionError) {
                    console.warn('Recognition start error:', recognitionError);
                    // 继续执行，因为有些浏览器可能不支持语音识别
                }
            }

             // 增加语音识别的启动
            await this.recognition.start(); // 添加此行
            
            // 设置录音停止回调
            this.audioService.setRecordingStoppedCallback(async (audioBlob) => {
                if (this.visualizer) {
                    this.visualizer.stop();
                }
                await this.processSpeech('');  // 触发语音处理
            });

            const success = await this.audioService.startRecording();
            
            if (success) {
                if (!this.visualizer && visualizer) {
                    this.visualizer = new AudioVisualizer(visualizer);
                    this.visualizer.initialize(this.audioService.audioContext, this.audioService.source);
                }

                this.setButtonState(startButton, 'success', '录音中');
                startButton.disabled = true;
                stopButton.disabled = false;
                this.showToast('录音已开始');
            } else {
                throw new Error('无法启动录音');
            }
        } catch (error) {
            console.error('Start recording error:', error);
            // 提供更具体的错误信息
            const errorMessage = error.name === 'NotAllowedError' ? 
                '请允许麦克风访问权限' : 
                (error.message || '启动录音失败');
                
            this.setButtonState(startButton, 'error', '启动失败');
            this.showToast(errorMessage, 'error');
            
            setTimeout(() => {
                this.setButtonState(startButton, 'default', '开始说话');
            }, 2000);
        }
    }

    async handleStopRecording() {
        if (this.isProcessing) return;

        const startButton = document.getElementById('start-recording');
        const stopButton = document.getElementById('stop-recording');

        try {
            this.isProcessing = true;
            this.setButtonState(stopButton, 'loading', '停止中...');
            
            await this.audioService.stopRecording();
            
            this.setButtonState(stopButton, 'success', '已停止');
            
            // 按钮状态会在处理完成后在processSpeech中重置
        } catch (error) {
            console.error('Stop recording error:', error);
            this.setButtonState(stopButton, 'error', '停止失败');
            this.showToast(error.message, 'error');
            this.resetRecordingState();
        }
    }

    resetRecordingState() {
        const startButton = document.getElementById('start-recording');
        const stopButton = document.getElementById('stop-recording');

        if (startButton) {
            startButton.disabled = false;
            this.setButtonState(startButton, 'default', '开始说话');
        }
        if (stopButton) {
            stopButton.disabled = true;
            this.setButtonState(stopButton, 'default', '停止');
        }

        this.isProcessing = false;
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
        const startButton = document.getElementById('start-recording');
        const stopButton = document.getElementById('stop-recording');
        
        try {
            if (loadingElement) loadingElement.classList.remove('hidden');
            if (feedbackElement) feedbackElement.classList.add('hidden');
            
            const recognizedTextElement = document.getElementById('recognized-text');
            if (recognizedTextElement) {
                recognizedTextElement.textContent = text || '处理中...';
            }
            
            const feedback = await this.geminiService.processAudio(text);
            this.displayFeedback(feedback);
            
            if (this.elevenlabsService && feedback.suggestions) {
                try {
                    const audio = await this.elevenlabsService.synthesizeSpeech(feedback.suggestions);
                    audio.play();
                } catch (error) {
                    console.error('Speech synthesis error:', error);
                }
            }
        } catch (error) {
            console.error('Process speech error:', error);
            this.showToast('处理语音时出错: ' + error.message, 'error');
        } finally {
            if (loadingElement) loadingElement.classList.add('hidden');
            if (feedbackElement) feedbackElement.classList.remove('hidden');
            this.resetRecordingState();
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