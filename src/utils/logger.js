// 创建 logger.js 在 utils 目录下
import { DebugPanel } from './debugPanel.js';

export class Logger {
    static log(...args) {
        const debugPanel = DebugPanel.getInstance();
        debugPanel.log('[DEBUG]', ...args);
        console.debug(...args);
    }

    static info(...args) {
        const debugPanel = DebugPanel.getInstance();
        debugPanel.log('[INFO]', ...args);
        console.info(...args);
    }

    static warn(...args) {
        const debugPanel = DebugPanel.getInstance();
        debugPanel.log('[WARN]', ...args);
        console.warn(...args);
    }

    static error(...args) {
        const debugPanel = DebugPanel.getInstance();
        debugPanel.log('[ERROR]', ...args);
        console.error(...args);
    }
}