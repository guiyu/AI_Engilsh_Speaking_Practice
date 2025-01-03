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
    
    // 为所有邮件服务按钮添加调试信息
    document.querySelectorAll('.service-btn').forEach(btn => {
        const url = new URL(btn.href);
        const debugStr = encodeURIComponent('\n\n---调试信息---\n' + JSON.stringify(info, null, 2));
        
        if (url.hostname.includes('google')) {
            url.searchParams.set('body', debugStr);
        } else if (url.hostname.includes('outlook')) {
            url.searchParams.set('body', debugStr);
        }
        
        btn.href = url.toString();
    });
});