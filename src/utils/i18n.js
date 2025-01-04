export const i18n = {
    getMessage(key, substitutions = null) {
      return chrome.i18n.getMessage(key, substitutions) || key;
    },
  
    // 初始化页面上的所有国际化文本
    initializeI18n() {
      // 查找所有带有 data-i18n 属性的元素
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = this.getMessage(key);
        
        // 根据元素类型设置文本内容
        if (element.tagName === 'INPUT' && element.type === 'placeholder') {
          element.placeholder = message;
        } else {
          element.textContent = message;
        }
      });
    }
  };
  
  // 当 DOM 加载完成时自动初始化国际化文本
  document.addEventListener('DOMContentLoaded', () => {
    i18n.initializeI18n();
  });