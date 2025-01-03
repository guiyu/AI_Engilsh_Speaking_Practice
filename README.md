# AI English Speaking Practice Chrome Extension

一个基于 Chrome 扩展的 AI 英语口语练习助手，使用 Google Gemini 和 ElevenLabs 提供实时语音反馈和纠正。

## 功能特点

- 🎤 实时语音识别：准确捕捉用户的英语口语
- 🤖 AI 反馈分析：提供语法和发音评估
- 🗣️ 自然语音合成：AI 语音示范标准发音（需要 ElevenLabs）
- 📊 音频可视化：实时显示语音波形
- 💡 智能练习建议：根据当前对话提供相关练习句子
- 🔄 连续对话模式：支持持续练习和反馈

## 开始使用

### 系统要求

- Chrome 浏览器 (版本 88+)
- 支持 WebRTC 的设备
- 麦克风权限

### 安装步骤

1. 克隆项目
```bash
git clone [repository-url]
cd ai-english-speaking-practice
```

2. 获取必要的 API 密钥：
   - Gemini API key （必需）: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - ElevenLabs API key（可选）: [ElevenLabs](https://elevenlabs.io)

3. 在 Chrome 中加载扩展：
   - 打开 Chrome 扩展管理页面 (chrome://extensions/)
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

### 配置说明

首次使用需要进行以下配置：
1. 点击扩展图标，打开设置界面
2. 输入 Gemini API Key（必需）
3. 输入 ElevenLabs API Key（可选，用于语音合成）
4. 授予麦克风访问权限
5. 保存设置并开始练习

## 项目结构

```
extension/
├── src/
│   ├── popup/          # 主界面组件
│   ├── background/     # 后台服务
│   ├── content/        # 页面注入脚本
│   ├── services/       # API 服务集成
│   └── utils/         # 工具函数
└── assets/            # 静态资源
```

### 核心组件说明

- **AudioService**: 音频录制和处理
- **GeminiService**: AI 分析和反馈
- **ElevenlabsService**: 语音合成
- **AudioVisualizer**: 音频波形可视化
- **SpeechRecognition**: 语音识别

## 开发指南

### 环境设置

1. 安装依赖
```bash
npm install
```

2. 配置开发环境
```javascript
// src/config.js
export const config = {
    IS_DEVELOPMENT: true  // 开发环境设置
};
```

### 开发模式

启动开发服务：
```bash
npm run dev
```

### 构建发布

构建生产版本：
```bash
npm run build
```

生产环境配置：
```javascript
// src/config.js
export const config = {
    IS_DEVELOPMENT: false  // 生产环境设置
};
```

## 使用说明

1. 点击扩展图标打开练习界面
2. 点击"开始说话"按钮开始录音
3. 说出任意英语句子
4. 点击"停止"按钮结束录音
5. 等待 AI 分析和反馈
6. 查看语法分析和发音建议
7. 听取 AI 语音示范（如果启用 ElevenLabs）
8. 根据建议继续练习

## 注意事项

- 确保麦克风正常工作并已授权
- 保持网络连接稳定
- API 密钥请妥善保管，不要分享给他人
- 音频数据仅用于实时分析，不会被保存

## 常见问题解决

1. 麦克风不工作
   - 检查浏览器权限设置
   - 确认系统麦克风已启用
   - 尝试重新加载扩展

2. AI 反馈较慢
   - 检查网络连接
   - 确认 API 配额充足
   - 尝试说更短的句子

3. 设置页面无响应
   - 清除浏览器缓存
   - 重新加载扩展
   - 检查 Console 错误信息

## 协议

本项目采用 Apache License 2.0 协议。详见 [LICENSE](LICENSE) 文件。

## 贡献指南

欢迎提交 Pull Request 或创建 Issue。

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 基础语音识别功能
- AI 反馈分析
- 音频可视化

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至 [weiyi415@gmail.com]

## 致谢

- [Google Gemini](https://deepmind.google/technologies/gemini/)
- [ElevenLabs](https://elevenlabs.io)
- Chrome Extensions Team