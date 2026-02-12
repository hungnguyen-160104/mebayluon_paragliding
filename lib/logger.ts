// lib/logger.ts
/**
 * Structured logging utility
 * Simple logger that doesn't require external dependencies
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatEntry(entry: LogEntry): string {
    const base = `[${entry.timestamp}] ${entry.level}: ${entry.message}`;
    
    if (entry.data) {
      return `${base} ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      return `${base}\n${entry.error.name}: ${entry.error.message}\n${entry.error.stack}`;
    }
    
    return base;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        },
      }),
    };

    const formatted = this.formatEntry(entry);

    // Always log errors
    if (level === LogLevel.ERROR) {
      console.error(formatted);
      return;
    }

    // In development, log everything
    if (this.isDevelopment) {
      if (level === LogLevel.WARN) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
      return;
    }

    // In production, only log info and above
    if (level === LogLevel.DEBUG) return;
    console.log(formatted);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, data, error);
  }
}

export const logger = new Logger();

/**
 * Create a child logger with context
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      logger.debug(`[${context}] ${message}`, data),
    info: (message: string, data?: Record<string, unknown>) =>
      logger.info(`[${context}] ${message}`, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      logger.warn(`[${context}] ${message}`, data),
    error: (message: string, error?: Error, data?: Record<string, unknown>) =>
      logger.error(`[${context}] ${message}`, error, data),
  };
}
