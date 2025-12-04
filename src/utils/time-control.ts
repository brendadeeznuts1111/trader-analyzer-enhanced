/**
 * Time Control Utilities for UUIDv5 System Testing
 * Provides convenient wrappers around Bun's setSystemTime for testing time-sensitive UUID features
 *
 * @see https://bun.sh/docs/test/dates-times#setsystemtime
 */

import { setSystemTime } from 'bun:test';

export interface TimeControlOptions {
  /** ISO date string or Date object for system time */
  systemTime?: string | Date | number;
  /** Whether to restore original time after test completion */
  autoRestore?: boolean;
  /** Timezone offset in minutes (default: 0 for UTC) */
  timezoneOffset?: number;
}

/**
 * Time Control Context Manager
 * Provides deterministic time control for testing UUID systems
 */
export class TimeController {
  private originalTime: number;
  private isActive: boolean = false;

  constructor(private options: TimeControlOptions = {}) {
    this.originalTime = Date.now();
  }

  /**
   * Set system time to a specific point for testing
   */
  setTime(time: string | Date | number): void {
    const targetTime = typeof time === 'string' ? new Date(time) :
                      typeof time === 'number' ? new Date(time) : time;

    if (this.options.timezoneOffset) {
      targetTime.setMinutes(targetTime.getMinutes() + this.options.timezoneOffset);
    }

    setSystemTime(targetTime);
    this.isActive = true;
  }

  /**
   * Advance system time by a specified amount
   */
  advanceTime(ms: number): void {
    const currentTime = Date.now();
    this.setTime(currentTime + ms);
  }

  /**
   * Set time to a specific date/time string
   */
  setToDateTime(dateTime: string): void {
    this.setTime(dateTime);
  }

  /**
   * Set time to start of day (00:00:00)
   */
  setToStartOfDay(date?: string | Date): void {
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    this.setTime(baseDate);
  }

  /**
   * Set time to end of day (23:59:59.999)
   */
  setToEndOfDay(date?: string | Date): void {
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(23, 59, 59, 999);
    this.setTime(baseDate);
  }

  /**
   * Restore original system time
   */
  restore(): void {
    if (this.isActive) {
      setSystemTime(new Date(this.originalTime));
      this.isActive = false;
    }
  }

  /**
   * Get current controlled time
   */
  getCurrentTime(): number {
    return Date.now();
  }

  /**
   * Check if time control is active
   */
  isTimeControlled(): boolean {
    return this.isActive;
  }

  /**
   * Execute a function with controlled time, then restore
   */
  async withTimeControl<T>(
    time: string | Date | number,
    fn: () => T | Promise<T>
  ): Promise<T> {
    this.setTime(time);
    try {
      return await fn();
    } finally {
      if (this.options.autoRestore !== false) {
        this.restore();
      }
    }
  }
}

/**
 * Predefined time scenarios for testing
 */
export const TimeScenarios = {
  /** Start of 2024 for consistent baseline testing */
  YEAR_START_2024: new Date('2024-01-01T00:00:00Z'),

  /** Mid-year point for general testing */
  MID_2024: new Date('2024-06-15T12:00:00Z'),

  /** End of year for edge case testing */
  YEAR_END_2024: new Date('2024-12-31T23:59:59Z'),

  /** Specific trading hours */
  MARKET_OPEN: new Date('2024-01-15T09:30:00Z'),
  MARKET_CLOSE: new Date('2024-01-15T16:00:00Z'),

  /** Weekend for non-trading scenarios */
  WEEKEND: new Date('2024-01-20T12:00:00Z'),

  /** UTC timestamps for precise control */
  EPOCH_START: new Date(0), // 1970-01-01
  Y2K_BUG: new Date('2000-01-01T00:00:00Z'),
  UNIX_EPOCH: new Date(1000 * 60 * 60 * 24 * 365 * 20), // ~20 years after epoch
} as const;

/**
 * Convenience functions for common time control patterns
 */
export const TimeUtils = {
  /**
   * Create a time controller with auto-restore enabled
   */
  createController(options: Partial<TimeControlOptions> = {}): TimeController {
    return new TimeController({ autoRestore: true, ...options });
  },

  /**
   * Test function execution at a specific time
   */
  async testAtTime<T>(
    time: string | Date | number,
    testFn: () => T | Promise<T>
  ): Promise<T> {
    const controller = new TimeController({ autoRestore: true });
    return controller.withTimeControl(time, testFn);
  },

  /**
   * Test UUID generation consistency across time changes
   */
  async testUUIDConsistency(
    name: string,
    namespace: string,
    iterations: number = 10
  ): Promise<boolean> {
    const controller = new TimeController({ autoRestore: true });
    const uuids: string[] = [];

    // Generate UUIDs at different times
    for (let i = 0; i < iterations; i++) {
      await controller.withTimeControl(
        Date.now() + (i * 1000), // Advance 1 second each iteration
        () => {
          // Import here to avoid circular dependencies
          const { uuidv5 } = require('../src/utils/uuid-v5');
          const uuid = uuidv5.generateForVault(name);
          uuids.push(uuid);
        }
      );
    }

    // All UUIDs should be identical (deterministic)
    return uuids.every(uuid => uuid === uuids[0]);
  },

  /**
   * Benchmark operation performance with controlled timing
   */
  async benchmarkWithTimeControl<T>(
    operation: () => T | Promise<T>,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    totalTime: number;
    operationsPerSecond: number;
  }> {
    const controller = new TimeController({ autoRestore: true });
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await controller.withTimeControl(Date.now(), operation);
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const operationsPerSecond = 1000 / averageTime;

    return {
      averageTime,
      totalTime,
      operationsPerSecond
    };
  }
};

/**
 * Test fixtures that use controlled time
 */
export const TimeFixtures = {
  /**
   * Create a vault entity with controlled creation time
   */
  async createVaultAtTime(
    name: string,
    time: string | Date | number
  ): Promise<any> {
    const { VaultEntity } = require('../src');
    return TimeUtils.testAtTime(time, () => new VaultEntity(name));
  },

  /**
   * Create multiple entities with controlled time spacing
   */
  async createEntitySeries(
    count: number,
    timeIntervalMs: number = 1000,
    createFn: (index: number) => any
  ): Promise<any[]> {
    const controller = new TimeController({ autoRestore: true });
    const entities: any[] = [];
    let currentTime = Date.now();

    for (let i = 0; i < count; i++) {
      await controller.withTimeControl(currentTime, () => {
        entities.push(createFn(i));
      });
      currentTime += timeIntervalMs;
    }

    return entities;
  }
};

/**
 * Export convenience functions for direct use
 */
export const {
  createController,
  testAtTime,
  testUUIDConsistency,
  benchmarkWithTimeControl
} = TimeUtils;

export const {
  createVaultAtTime,
  createEntitySeries
} = TimeFixtures;

// Default export for convenience
export default TimeController;
