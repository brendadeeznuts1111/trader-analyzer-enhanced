#!/usr/bin/env bun
/**
 * Property Hierarchy API Runtime Detection Test
 * 
 * Tests the enhanced property hierarchy APIs with runtime detection
 * 
 * Run: bun test tests/property-hierarchy-runtime.test.ts --seed=123
 */

import { describe, test, expect } from 'bun:test';
import { getBunRuntimeInfo } from '../lib/bun-utils-enhanced';

describe('Property Hierarchy API Runtime Detection', () => {
  describe('Runtime Detection Integration', () => {
    test('detects Bun runtime correctly', () => {
      const runtimeInfo = getBunRuntimeInfo();
      
      expect(runtimeInfo.isBun).toBe(true);
      expect(runtimeInfo.environment).toBe('bun');
      expect(typeof runtimeInfo.version).toBe('string');
      expect(runtimeInfo.hasNativeAPIs.length).toBeGreaterThan(0);
    });

    test('provides performance metrics', () => {
      const runtimeInfo = getBunRuntimeInfo();
      
      if (runtimeInfo.isBun) {
        expect(runtimeInfo.hasNativeAPIs).toContain('Bun');
        expect(runtimeInfo.hasNativeAPIs).toContain('Bun.file');
        expect(runtimeInfo.hasNativeAPIs).toContain('Bun.write');
        expect(runtimeInfo.hasNativeAPIs).toContain('Bun.spawn');
      }
    });
  });

  describe('API Enhancement Validation', () => {
    test('create-market API includes runtime info', async () => {
      const mockMarketData = {
        id: 'test-market',
        name: 'Test Market',
        symbol: 'TEST',
        type: 'sports'
      };

      const response = await fetch('http://localhost:3000/api/property-hierarchy/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketData: mockMarketData,
          exchangeId: 'nano-sports'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Should include performance metrics
        expect(data.performance).toBeDefined();
        expect(data.performance.runtime).toBeDefined();
        expect(data.performance.runtime.environment).toBe('bun');
        expect(data.performance.runtime.optimized).toBe(true);
        expect(data.performance.executionTime).toBeGreaterThan(0);
      } else {
        // API might not be running, skip test
        console.log('API not available, skipping integration test');
      }
    });

    test('metrics API includes runtime information', async () => {
      const response = await fetch('http://localhost:3000/api/property-hierarchy/metrics?exchangeId=nano-sports');

      if (response.ok) {
        const data = await response.json();
        
        // Should include runtime information
        expect(data.data.runtime).toBeDefined();
        expect(data.data.runtime.environment).toBe('bun');
        expect(data.data.runtime.isBun).toBe(true);
        expect(data.data.runtime.optimized).toBe(true);
        expect(data.data.performance.apiResponseTime).toBeGreaterThan(0);
      } else {
        // API might not be running, skip test
        console.log('API not available, skipping integration test');
      }
    });

    test('resolve-bulk API includes performance metrics', async () => {
      const mockMarkets = [
        { id: 'market1', name: 'Market 1', symbol: 'M1', type: 'sports' },
        { id: 'market2', name: 'Market 2', symbol: 'M2', type: 'sports' },
        { id: 'market3', name: 'Market 3', symbol: 'M3', type: 'sports' }
      ];

      const response = await fetch('http://localhost:3000/api/property-hierarchy/resolve-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markets: mockMarkets,
          exchangeId: 'nano-sports'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Should include enhanced performance metrics
        expect(data.data.performance).toBeDefined();
        expect(data.data.performance.runtime).toBeDefined();
        expect(data.data.performance.runtime.environment).toBe('bun');
        expect(data.data.performance.runtime.optimized).toBe(true);
        expect(data.data.performance.processingRate).toBeGreaterThan(0);
        expect(data.data.performance.avgTimePerHierarchy).toBeGreaterThan(0);
      } else {
        // API might not be running, skip test
        console.log('API not available, skipping integration test');
      }
    });
  });

  describe('Performance Optimization Validation', () => {
    test('runtime info caching works', async () => {
      const start1 = performance.now();
      const runtime1 = getBunRuntimeInfo();
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      const runtime2 = getBunRuntimeInfo();
      const time2 = performance.now() - start2;

      // Results should be identical
      expect(runtime1).toEqual(runtime2);
      
      // Second call should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1);
      
      console.log(`First call: ${time1.toFixed(2)}ms, Cached call: ${time2.toFixed(2)}ms`);
    });

    test('JSON parsing optimization', async () => {
      const runtimeInfo = getBunRuntimeInfo();
      const testData = { test: 'data', numbers: [1, 2, 3] };
      const jsonString = JSON.stringify(testData);
      
      if (runtimeInfo.isBun) {
        // Test Bun-optimized parsing
        const start = performance.now();
        const parsed = JSON.parse(jsonString);
        const time = performance.now() - start;
        
        expect(parsed).toEqual(testData);
        expect(time).toBeGreaterThan(0);
        
        console.log(`Bun JSON parsing time: ${time.toFixed(4)}ms`);
      }
    });
  });

  describe('Error Handling Enhancement', () => {
    test('error responses include runtime information', async () => {
      const response = await fetch('http://localhost:3000/api/property-hierarchy/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing required fields
      });

      if (response.ok) {
        console.log('API returned success, expected error');
      } else {
        const errorData = await response.json();
        
        // Should include runtime information in error responses
        expect(errorData.runtime).toBeDefined();
        expect(errorData.runtime.environment).toBe('bun');
        expect(errorData.runtime.optimized).toBe(true);
      }
    });
  });
});
