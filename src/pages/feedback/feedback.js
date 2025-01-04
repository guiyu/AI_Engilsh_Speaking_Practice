// /src/pages/feedback/feedback.js
import { i18n } from '../../utils/i18n.js';

document.addEventListener('DOMContentLoaded', () => {
    const debugInfo = document.getElementById('debug-info');
    
    // 收集调试信息
    const info = {
        version: chrome.runtime.getManifest().version,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString()
    };
    
    // 显示调试信息
    debugInfo.textContent = JSON.stringify(info, null, 2);
    
    // 准备邮件正文内容
    const emailBody = `${i18n.getMessage('feedbackDescription')}









--------------------------------
${i18n.getMessage('environmentInformation')}:
- ${i18n.getMessage('versionLabel')}: ${info.version}
- ${i18n.getMessage('browserLabel')}: ${info.userAgent}
- ${i18n.getMessage('systemLabel')}: ${info.platform}
- ${i18n.getMessage('languageLabel')}: ${info.language}
- ${i18n.getMessage('timeLabel')}: ${new Date(info.timestamp).toLocaleString()}
`;

    // 为所有邮件服务按钮添加邮件内容
    document.querySelectorAll('.service-btn').forEach(btn => {
        const url = new URL(btn.href);
        
        // URL 编码前先将内容转换为可读格式
        if (url.hostname.includes('google') || url.hostname.includes('outlook')) {
            url.searchParams.set('subject', i18n.getMessage('feedbackEmailSubject'));
            url.searchParams.set('body', emailBody);
        }
        
        btn.href = url.toString();
    });

    // 初始化页面其他文本的国际化
    i18n.initializeI18n();
});