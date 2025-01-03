// /src/pages/feedback/feedback.js
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
    const emailBody = `请在这里描述您遇到的问题或建议：









--------------------------------
设备信息：
- 版本：${info.version}
- 浏览器：${info.userAgent}
- 系统：${info.platform}
- 语言：${info.language}
- 时间：${new Date(info.timestamp).toLocaleString()}
`;

    // 为所有邮件服务按钮添加邮件内容
    document.querySelectorAll('.service-btn').forEach(btn => {
        const url = new URL(btn.href);
        
        // URL 编码前先将内容转换为可读格式
        if (url.hostname.includes('google')) {
            url.searchParams.set('body', emailBody);
        } else if (url.hostname.includes('outlook')) {
            url.searchParams.set('body', emailBody);
        }
        
        btn.href = url.toString();
    });
});