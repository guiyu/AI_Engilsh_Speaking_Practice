// 新建文件 docs/js/i18n.js
const i18n = {
    currentLocale: '',
    messages: {},

    initialize() {
        this.currentLocale = this.getBrowserLanguage();
        this.loadMessages();
    },

    getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        return lang.startsWith('zh') ? 'zh-CN' : 'en';
    },

    async loadMessages() {
        try {
            const response = await fetch(`../locales/${this.currentLocale}/messages.json`);
            this.messages = await response.json();
            this.updateContent();
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    },

    getMessage(key) {
        return this.messages[key]?.message || key;
    },

    updateContent() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            if (message) {
                element.textContent = message;
            }
        });
    }
};