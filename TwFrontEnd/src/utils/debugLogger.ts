/**
 * Debug Logger Utility
 * UC Capital Identity Admin
 *
 * 除錯日誌工具 - 僅在開發模式下運作
 */

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    category: string;
    message: string;
    data?: unknown;
}

class DebugLogger {
    private logs: LogEntry[] = [];
    private maxLogs = 1000;
    private isEnabled: boolean;
    private listeners: Set<(logs: LogEntry[]) => void> = new Set();

    constructor() {
        this.isEnabled = import.meta.env.DEV;
    }

    private addLog(level: LogEntry['level'], category: string, message: string, data?: unknown) {
        if (!this.isEnabled) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data,
        };

        this.logs.push(entry);

        // 限制日誌數量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 同時輸出到 console
        const consoleMsg = `[${entry.timestamp}] [${category}] ${message}`;
        switch (level) {
            case 'error':
                console.error(consoleMsg, data ?? '');
                break;
            case 'warn':
                console.warn(consoleMsg, data ?? '');
                break;
            case 'debug':
                console.debug(consoleMsg, data ?? '');
                break;
            default:
                console.log(consoleMsg, data ?? '');
        }

        // 通知監聽器
        this.notifyListeners();
    }

    info(category: string, message: string, data?: unknown) {
        this.addLog('info', category, message, data);
    }

    warn(category: string, message: string, data?: unknown) {
        this.addLog('warn', category, message, data);
    }

    error(category: string, message: string, data?: unknown) {
        this.addLog('error', category, message, data);
    }

    debug(category: string, message: string, data?: unknown) {
        this.addLog('debug', category, message, data);
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    getLogsByCategory(category: string): LogEntry[] {
        return this.logs.filter(log => log.category === category);
    }

    clear() {
        this.logs = [];
        this.notifyListeners();
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.getLogs()));
    }

    exportToJson(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    exportToText(): string {
        return this.logs.map(log => {
            const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
            return `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${dataStr}`;
        }).join('\n');
    }

    downloadLogs(format: 'json' | 'txt' = 'txt') {
        const content = format === 'json' ? this.exportToJson() : this.exportToText();
        const mimeType = format === 'json' ? 'application/json' : 'text/plain';
        const extension = format === 'json' ? 'json' : 'txt';
        const filename = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    isDebugMode(): boolean {
        return this.isEnabled;
    }
}

// 全域單例
export const debugLogger = new DebugLogger();

// 方便使用的快捷函式
export const logAuth = (message: string, data?: unknown) => debugLogger.info('Auth', message, data);
export const logRoute = (message: string, data?: unknown) => debugLogger.info('Route', message, data);
export const logApi = (message: string, data?: unknown) => debugLogger.info('API', message, data);
export const logNav = (message: string, data?: unknown) => debugLogger.info('Nav', message, data);
export const logError = (category: string, message: string, data?: unknown) => debugLogger.error(category, message, data);

export type { LogEntry };
export default debugLogger;
