/**
 * Logger utility for consistent logging across the application
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel;

  private constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the log level
   * @param level Log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log an error message
   * @param message Error message
   * @param context Additional context
   */
  public error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a warning message
   * @param message Warning message
   * @param context Additional context
   */
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an info message
   * @param message Info message
   * @param context Additional context
   */
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message
   * @param message Debug message
   * @param context Additional context
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Internal log method
   * @param level Log level
   * @param message Log message
   * @param context Additional context
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level > this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    const formattedMessage = this.formatEntry(entry);
    console.log(formattedMessage);
  }

  private formatEntry(entry: LogEntry): string {
    const levelString = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextString = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    return `[${timestamp}] ${levelString}: ${entry.message}${contextString}`;
  }
}

/**
 * Global logger instance
 */
export const logger = Logger.getInstance();
