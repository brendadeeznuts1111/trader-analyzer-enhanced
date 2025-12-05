#!/usr/bin/env bun
/**
 * Enhanced Bun Native Detection Test Suite
 * 
 * Tests the completely rewritten isBunNative function with all edge cases
 * 
 * Run: bun test tests/bun_native_enhanced.test.ts --seed=123
 */

import { describe, test, expect } from 'bun:test';
import { 
  isBunNativeEnhanced, 
  isBunNative, 
  getBunRuntimeInfo,
  batchCheckBunNative,
  getBunNativeStats
} from '../lib/bun-utils-enhanced';

describe('Enhanced Bun Native Detection v2.0', () => {
  describe('isBunNativeEnhanced function', () => {
    test('handles null and undefined with detailed metadata', () => {
      const nullResult = isBunNativeEnhanced(null);
      expect(nullResult).toEqual({
        isNative: false,
        type: 'null',
        confidence: 'high',
        metadata: { hasToStringTag: false, isObject: false, cached: false }
      });

      const undefinedResult = isBunNativeEnhanced(undefined);
      expect(undefinedResult).toEqual({
        isNative: false,
        type: 'undefined',
        confidence: 'high',
        metadata: { hasToStringTag: false, isObject: false, cached: false }
      });
    });

    test('handles all primitive types correctly', () => {
      const primitives = [
        42, 'string', true, Symbol('test'), BigInt(123), 0, '', false
      ];

      primitives.forEach(primitive => {
        const result = isBunNativeEnhanced(primitive);
        expect(result.isNative).toBe(false);
        expect(result.type).toBe('primitive');
        expect(result.confidence).toBe('high');
        expect(result.metadata.isObject).toBe(false);
      });
    });

    test('detects standard objects with high confidence', () => {
      const standardObjects = [
        {}, [], new Date(), /regex/, new Error('test'), 
        new Map(), new Set(), new Uint8Array()
      ];

      standardObjects.forEach(obj => {
        const result = isBunNativeEnhanced(obj);
        expect(result.isNative).toBe(false);
        expect(result.type).toBe('standard');
        expect(result.confidence).toBe('high');
        expect(result.metadata.isObject).toBe(true);
      });
    });

    test('caching works for repeated checks', () => {
      const testObj = { name: 'cached' };
      
      // First check - not cached
      const firstResult = isBunNativeEnhanced(testObj);
      expect(firstResult.metadata.cached).toBe(false);
      
      // Second check - should be cached
      const secondResult = isBunNativeEnhanced(testObj);
      expect(secondResult.metadata.cached).toBe(true);
      expect(secondResult.isNative).toBe(firstResult.isNative);
    });
  });

  describe('Bun runtime detection', () => {
    test('detects current runtime environment', () => {
      const runtimeInfo = getBunRuntimeInfo();
      
      expect(runtimeInfo.environment).toBeDefined();
      expect(['bun', 'node', 'browser', 'unknown']).toContain(runtimeInfo.environment);
      
      expect(Array.isArray(runtimeInfo.hasNativeAPIs)).toBe(true);
      expect(Array.isArray(runtimeInfo.missingAPIs)).toBe(true);
    });
  });

  describe('Backward compatibility', () => {
    test('isBunNative returns boolean like original', () => {
      const testValues = [
        null, undefined, 42, 'string', {}, [], new Date()
      ];

      testValues.forEach(value => {
        const enhancedResult = isBunNativeEnhanced(value);
        const simpleResult = isBunNative(value);
        
        expect(simpleResult).toBe(enhancedResult.isNative);
        expect(typeof simpleResult).toBe('boolean');
      });
    });
  });
});
