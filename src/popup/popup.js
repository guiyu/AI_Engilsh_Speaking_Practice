// src/popup/popup.js

import { AudioService } from '../services/audioService.js';
import { GeminiService } from '../services/geminiService.js';
import { ElevenlabsService } from '../services/elevenlabsService.js';
import { StorageManager } from '../utils/storage.js';
import { AudioVisualizer } from '../utils/audioVisualizer.js';
import { SpeechRecognition } from '../utils/speechRecognition.js';
import { WebSocketService } from '../services/websocketService.js'
import { Logger } from '../utils/logger.js';

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
            Logger.error('Required DOM elements not found');
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
            Logger.error('Permission check failed:', error);
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
            await this.setupServices(keys);  // 添加 await
            this.showPracticeView();
        } else {
            this.showSetupView();
        }
    }

    async setupServices(keys) {
        if (keys.geminiKey) {
            try {
                this.geminiService = new GeminiService(keys.geminiKey);
                // 初始化 WebSocket 服务
                const wsService = new WebSocketService(keys.geminiKey);
                wsService.setMessageCallback((response) => {
                    this.handleWebSocketResponse(response);
                });
                await wsService.connect();
                this.audioService.setWebSocketService(wsService);
                Logger.info('Services created successfully');
            } catch (error) {
                Logger.error('Failed to create services:', error);
                throw new Error('服务创建失败');
            }
        }
    
        if (keys.elevenlabsKey) {
            this.elevenlabsService = new ElevenlabsService(keys.elevenlabsKey);
        }
    }

    handleWebSocketResponse(response) {
        try {
            Logger.info('Handling WebSocket response:', response); // 添加日志
            
            if (!response) {
                Logger.error('Empty response received');
                return;
            }
    
            const feedback = this.geminiService.parseResponse(response);
            if (feedback) {
                this.displayFeedback(feedback);
            }
        } catch (error) {
            Logger.error('处理WebSocket响应错误:', error);
            this.showToast('处理响应时出错，请重试');
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
                Logger.error('Microphone permission request failed:', error);
            }
        });

        // API密钥输入事件
        document.getElementById('gemini-key')?.addEventListener('input', () => {
            this.updateSaveButtonState();
        });

        // 设置按钮事件
        document.getElementById('settings')?.addEventListener('click', () => {
            this.showSetupView();
        });

        // 保存设置事件
        document.getElementById('save-setup')?.addEventListener('click', () => this.handleSaveSetup());

        // 录音控制事件
        document.getElementById('start-recording')?.addEventListener('click', () => this.handleStartRecording());
        document.getElementById('stop-recording')?.addEventListener('click', () => this.handleStopRecording());
    }

    async initializeAIServices() {
        try {
            if (!this.geminiService) {
                throw new Error('Gemini服务未正确初始化');
            }
    
            Logger.log('Starting AI service initialization...');
            const initialized = await this.geminiService.initializeChat();
            Logger.info('AI service initialization result:', initialized);
    
            if (!initialized) {
                Logger.error('AI service initialization returned false');
                return false;
            }
    
            return true;
        } catch (error) {
            Logger.error('AI service initialization error:', error);
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
            Logger.error('Mic permission error:', error);
            alert('Microphone access is required for this app to work.');
        }
    }

    showPermissionView() {
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
                await this.setupServices({ geminiKey, elevenlabsKey });  // 添加 await
                
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
            Logger.error('Save setup error:', error);
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
            Logger.log('Starting recording process...');
            
            // 首先检查权限
            const hasPermission = await this.checkMicrophonePermission();
            if (!hasPermission) {
                throw new Error('需要麦克风访问权限');
            }
    
            this.setButtonState(startButton, 'loading', '准备录音...');
    
            // 确保创建新的 AudioService 实例
            this.audioService = new AudioService();
            const initialized = await this.audioService.initialize();
            if (!initialized) {
                throw new Error('无法初始化音频服务');
            }
    
            Logger.log('Audio service initialized');
    
            // 设置录音停止回调
            this.audioService.setRecordingStoppedCallback(async () => {
                if (this.visualizer) {
                    this.visualizer.stop();
                    this.visualizer = null; // 清理可视化器
                }
                const recognizedText = await this.recognition?.stop();
                await this.processSpeech(recognizedText || '');
            });
    
            // 重置语音识别
            if (this.recognition) {
                try {
                    this.recognition.recognition.abort();
                    this.recognition = new SpeechRecognition();
                    this.recognition.recognition.continuous = true;
                    this.recognition.recognition.interimResults = true;
                    this.recognition.recognition.lang = 'en-US';
                    Logger.log('Speech recognition reset');
                } catch (e) {
                    Logger.log('Recognition reset ignored:', e);
                }
            }
    
            // 启动语音识别
            await this.recognition.start();
            Logger.log('Speech recognition started');
    
            // 启动录音
            const success = await this.audioService.startRecording();
            
            if (success) {
                // 创建新的可视化器
                this.visualizer = new AudioVisualizer(visualizer);
                this.visualizer.initialize(this.audioService.audioContext, this.audioService.source);
                Logger.log('Recording started successfully');
    
                this.setButtonState(startButton, 'success', '录音中');
                startButton.disabled = true;
                stopButton.disabled = false;
                this.showToast('录音已开始');
            } else {
                throw new Error('无法启动录音');
            }
        } catch (error) {
            Logger.error('Start recording error:', error);
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
            Logger.error('Stop recording error:', error);
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

    async processSpeech(text) {
        const loadingElement = document.getElementById('loading');
        const feedbackElement = document.getElementById('feedback');
        
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
                    Logger.error('Speech synthesis error:', error);
                }
            }
        } catch (error) {
            Logger.error('Process speech error:', error);
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
            // 创建反馈内容
            const sections = [
                {
                    key: 'recognition',
                    title: '识别语音',
                    show: !!feedback.recognition
                },
                {
                    key: 'grammar',
                    title: '语法分析',
                    show: !!feedback.grammar
                },
                {
                    key: 'pronunciation',
                    title: '发音指导',
                    show: !!feedback.pronunciation
                },
                {
                    key: 'suggestions',
                    title: '建议',
                    show: true  // 始终显示建议部分
                }
            ];
    
            aiFeedback.innerHTML = sections
                .filter(section => section.show)
                .map(section => {
                    const content = feedback[section.key] || '';
                    const formattedContent = content
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line)
                        .map(line => `<p class="mt-1">${line}</p>`)
                        .join('');
    
                    return `
                        <div class="feedback-item">
                            <strong>${section.title}：</strong>
                            <div class="mt-2 text-gray-700">${formattedContent}</div>
                        </div>
                    `;
                })
                .join('<div class="my-2"></div>');  // 添加分隔
        }
        
        // 更新下一句建议
        if (nextSuggestion) {
            nextSuggestion.textContent = feedback.nextPrompt || '请继续说一句英语';
        }
    }
}

// 初始化扩展程序
new PopupManager();

export default PopupManager;