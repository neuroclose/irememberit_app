/**
 * Remote Logging Service
 * Sends logs to backend for real-time debugging
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBackendUrl = () => {
  if (Platform.OS === 'web') {
    return '';
  } else {
    return Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';
  }
};

const BACKEND_URL = getBackendUrl();
const LOG_ENDPOINT = `${BACKEND_URL}/api/logs`;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

class RemoteLogger {
  private logs: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly MAX_BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor() {
    this.startFlushInterval();
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  private async flush() {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = [];

    try {
      await fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // If remote logging fails, fall back to console
      console.log('[RemoteLogger] Failed to send logs:', error);
      // Put logs back if they failed to send
      this.logs = [...logsToSend, ...this.logs];
    }
  }

  private log(level: LogLevel, message: string, context?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      deviceInfo: {
        platform: Platform.OS,
        version: '1.0.0',
      },
    };

    this.logs.push(entry);

    // Also log to console for immediate feedback
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`[RemoteLog][${level}] ${message}`, context || '');

    // Flush immediately for errors
    if (level === 'error' || this.logs.length >= this.MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  debug(message: string, context?: any) {
    this.log('debug', message, context);
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, context?: any) {
    this.log('error', message, context);
  }

  // Log API requests
  logApiRequest(url: string, method: string, data?: any) {
    this.info(`API Request: ${method} ${url}`, { data });
  }

  // Log API responses
  logApiResponse(url: string, status: number, data?: any) {
    this.info(`API Response: ${status} ${url}`, { data });
  }

  // Log API errors
  logApiError(url: string, error: any) {
    this.error(`API Error: ${url}`, { error: error.message || error });
  }

  // Force flush on app background/close
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const remoteLogger = new RemoteLogger();
