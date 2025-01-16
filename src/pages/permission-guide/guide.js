import { i18n } from '../../utils/i18n.js';

document.addEventListener('DOMContentLoaded', () => {
    // 初始化剪贴板功能
    const clipboard = new ClipboardJS('.copy-btn');
    
    clipboard.on('success', (e) => {
        const btn = e.trigger;
        btn.textContent = '已复制';
        setTimeout(() => {
            btn.textContent = '复制';
        }, 2000);
    });

    // 添加图片点击放大功能
    document.querySelectorAll('.guide-image').forEach(img => {
        img.addEventListener('click', () => {
            const modal = document.createElement('div');
            modal.className = 'image-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <img src="${img.src}" alt="${img.alt}">
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', () => modal.remove());
        });
    });
});