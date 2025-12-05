#!/usr/bin/env bun
/**
 * Bun Type Utils Test Suite
 * 
 * Tests isBunNative() and deepClone() functions specifically
 * 
 * Run: bun test tests/bun-type-utils.test.ts --seed=123
 */

import { describe, test, expect } from 'bun:test';
import { isBunNative, deepClone, BunUtils } from '../lib/bun-utils';

describe('Bun Type Utilities', () => {
  describe('isBunNative function', () => {
    test('returns false for plain objects', () => {
      const plainObj = { test: 'value' };
      expect(isBunNative(plainObj)).toBe(false);
    });

    test('returns false for arrays', () => {
      const arr = [1, 2, 3];
      expect(isBunNative(arr)).toBe(false);
    });

    test('returns false for primitives', () => {
      expect(isBunNative(null)).toBe(false);
      expect(isBunNative(undefined)).toBe(false);
      expect(isBunNative('string')).toBe(false);
      expect(isBunNative(123)).toBe(false);
      expect(isBunNative(true)).toBe(false);
    });

    test('returns false for functions', () => {
      const func = () => {};
      expect(isBunNative(func)).toBe(false);
    });

    test('handles edge cases gracefully', () => {
      expect(isBunNative({})).toBe(false);
      expect(isBunNative(Object.create(null))).toBe(false);
      expect(isBunNative(new Date())).toBe(false);
    });
  });

  describe('deepClone function', () => {
    test('creates deep copy of simple object', () => {
      const original = { a: 1, b: 'test', c: true };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    test('creates deep copy of nested object', () => {
      const original = {
        level1: {
          level2: {
            value: 'deep'
          }
        }
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.level1).not.toBe(original.level1);
      expect(cloned.level1.level2).not.toBe(original.level1.level2);
    });

    test('creates deep copy of arrays', () => {
      const original = {
        numbers: [1, 2, 3],
        nested: [[1, 2], [3, 4]]
      };
      
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned.numbers).not.toBe(original.numbers);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested[0]).not.toBe(original.nested[0]);
    });

    test('handles special values', () => {
      const original = {
        date: new Date('2023-01-01'),
        regex: /test/g,
        nullValue: null,
        undefinedValue: undefined,
        empty: {}
      };
      
      const cloned = deepClone(original);
      
      // Note: JSON serialization converts Date to string and regex to {}
      expect(typeof cloned.date).toBe('string');
      expect(typeof cloned.regex).toBe('object');
      expect(cloned.nullValue).toBe(null);
      expect(cloned.undefinedValue).toBe(undefined);
    });

    test('handles circular references gracefully', () => {
      const original: any = { name: 'test' };
      original.self = original;
      
      // Should not throw, but will break circular reference
      expect(() => {
        const cloned = deepClone(original);
        expect(cloned.name).toBe('test');
      }).not.toThrow();
    });

    test('performance with large objects', async () => {
      const largeObj: Record<string, any> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = {
          id: i,
          data: `value${i}`.repeat(10),
          nested: { deep: true }
        };
      }
      
      const result = await BunUtils.benchmark('large-deep-clone', async () => {
        deepClone(largeObj);
      }, 100);
      
      expect(result.avg).toBeGreaterThan(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
      
      console.log(`Large object deep clone: ${result.opsPerSecond.toFixed(0)} ops/sec`);
    });
  });

  describe('Integration with YAML Config', () => {
    test('deep clones configuration objects', () => {
      const config = {
        server: {
          port: 3000,
          hostname: 'localhost'
        },
        threadManager: {
          persistenceFile: 'test.json',
          autoSave: true
        }
      };
      
      const cloned = deepClone(config);
      
      expect(cloned).toEqual(config);
      expect(cloned).not.toBe(config);
      expect(cloned.server).not.toBe(config.server);
      expect(cloned.threadManager).not.toBe(config.threadManager);
    });

    test('type checking works with config objects', () => {
      const config = { port: 3000 };
      const loader = { get: () => config };
      
      expect(isBunNative(config)).toBe(false);
      expect(isBunNative(loader)).toBe(false);
    });
  });

  describe('BunUtils class integration', () => {
    test('BunUtils.deepClone works as static method', () => {
      const original = { test: 'value' };
      const cloned = BunUtils.deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    test('BunUtils.isBunNative works as static method', () => {
      expect(BunUtils.isBunNative({})).toBe(false);
      expect(BunUtils.isBunNative(null)).toBe(false);
    });
  });
});
