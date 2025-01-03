// 创建 logger.js 在 utils 目录下
import { DebugPanel } from './debugPanel.js';
const IS_DEVELOPMENT = false; // 在这里控制是否为开发环境

export class Logger {
    static log(...args) {
        if (IS_DEVELOPMENT) {
            const debugPanel = DebugPanel.getInstance();
            debugPanel.log('[DEBUG]', ...args);
            console.debug(...args);
        }
    }

    static info(...args) {
        if (IS_DEVELOPMENT) {
            const debugPanel = DebugPanel.getInstance();
            debugPanel.log('[INFO]', ...args);
            console.info(...args);
        }
    }

    static warn(...args) {
        if (IS_DEVELOPMENT) {
            const debugPanel = DebugPanel.getInstance();
            debugPanel.log('[WARN]', ...args);
            console.warn(...args);
        }
    }

    static error(...args) {
        if (IS_DEVELOPMENT) {
            const debugPanel = DebugPanel.getInstance();
            debugPanel.log('[ERROR]', ...args);
            console.error(...args);
        }
    }
}