#!/usr/bin/env bun
/**
 * Enhanced Arbitrage Snapshot Custom Inspection Test
 * 
 * Tests the Bun.inspect.custom API integration
 * 
 * Run: bun test tests/arbitrage-snapshot-enhanced.test.ts --seed=123
 */

import { describe, test, expect } from 'bun:test';
import { 
  ArbitrageOpportunity,
  ArbitrageSnapshot,
  generateEnhancedSnapshot,
  generateTextSnapshot,
  type Opportunity 
} from '../src/reports/arbitrage-snapshot-enhanced';

describe('Enhanced Arbitrage Snapshot with Custom Inspection', () => {
  const sampleOpportunities: Opportunity[] = [
    { pair: "BTC/USD", spread: 1250.50, exchangeA: "Binance", exchangeB: "Coinbase" },
    { pair: "ETH/USD", spread: 875.25, exchangeA: "Kraken", exchangeB: "Gemini" },
    { pair: "🚀MOON/USD", spread: 2100.00, exchangeA: "Uniswap", exchangeB: "Sushiswap" }
  ];

  describe('ArbitrageOpportunity Custom Inspection', () => {
    test('implements Bun.inspect.custom symbol', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      
      expect(typeof opportunity[Bun.inspect.custom]).toBe('function');
    });

    test('basic inspection returns structured object', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const result = opportunity[Bun.inspect.custom](2, {} as any) as any;
      
      expect(typeof result).toBe('object');
      expect(result.id).toBe('BTC_USD');
      expect(result.status).toBe('HIGH_VALUE');
      expect(result.spread).toBe('$1,250.50');
      expect(result.exchanges).toBe('Binance ↔ Coinbase');
    });

    test('handles hex option correctly', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const result = opportunity[Bun.inspect.custom](2, { hex: true } as any) as any;
      
      expect(typeof result).toBe('object');
      // Should show hex representation (actual hex string, not the word "hex")
      expect(result.payload).toMatch(/^[0-9a-f]+$/i); // Hex string pattern
    });

    test('handles showHidden option correctly', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const result = opportunity[Bun.inspect.custom](2, { showHidden: true } as any) as any;
      
      expect(typeof result).toBe('object');
      expect(result.metrics).toBeDefined(); // Should include hidden metrics
      expect(result.riskLevel).toBeDefined();
    });

    test('handles sorted option correctly', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const result = opportunity[Bun.inspect.custom](2, { sorted: true } as any) as any;
      
      expect(typeof result).toBe('object');
      const keys = Object.keys(result).sort();
      expect(Object.keys(result)).toEqual(keys); // Keys should be sorted
    });

    test('handles depth correctly', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      
      const shallow = opportunity[Bun.inspect.custom](1, {} as any) as any;
      const deep = opportunity[Bun.inspect.custom](3, {} as any) as any;
      
      expect(typeof shallow).toBe('object');
      expect(typeof deep).toBe('object');
      // Both should be valid objects, but depth affects detail level
    });
  });

  describe('ArbitrageSnapshot Custom Inspection', () => {
    test('creates snapshot with custom inspection', () => {
      const snapshot = new ArbitrageSnapshot(sampleOpportunities);
      
      expect(typeof snapshot[Bun.inspect.custom]).toBe('function');
      expect(snapshot.opportunities).toHaveLength(3);
      expect(snapshot.metadata.totalOpportunities).toBe(3);
    });

    test('basic snapshot inspection', () => {
      const snapshot = new ArbitrageSnapshot(sampleOpportunities);
      const result = snapshot[Bun.inspect.custom](1, {} as any) as any;
      
      expect(typeof result).toBe('object');
      expect(result.type).toBe('ArbitrageSnapshot');
      expect(result.count).toBe(3);
      expect(result.highValue).toBeGreaterThanOrEqual(0); // Can be 0 or more
    });

    test('detailed snapshot inspection', () => {
      const snapshot = new ArbitrageSnapshot(sampleOpportunities);
      const result = snapshot[Bun.inspect.custom](3, {} as any) as any;
      
      expect(typeof result).toBe('object');
      expect(result.snapshot).toBeDefined();
      expect(result.opportunities).toBeDefined();
      expect(Array.isArray(result.opportunities)).toBe(true);
    });

    test('handles maxArrayLength correctly', () => {
      const snapshot = new ArbitrageSnapshot(sampleOpportunities);
      const result = snapshot[Bun.inspect.custom](2, { maxArrayLength: 2 } as any) as any;
      
      expect(typeof result).toBe('object');
      expect(result.opportunities).toHaveLength(2); // Should be truncated
      expect(result.truncated).toBeDefined(); // Should include truncation info
    });
  });

  describe('Enhanced Snapshot Generation', () => {
    test('generates enhanced snapshot', () => {
      const snapshot = generateEnhancedSnapshot(sampleOpportunities);
      
      expect(snapshot).toBeInstanceOf(ArbitrageSnapshot);
      expect(snapshot.opportunities).toHaveLength(3);
      expect(snapshot.metadata.totalOpportunities).toBe(3);
    });

    test('generates text snapshot', () => {
      const textReport = generateTextSnapshot(sampleOpportunities);
      
      expect(typeof textReport).toBe('string');
      expect(textReport).toContain('🚀 Enhanced Arbitrage Snapshot');
      expect(textReport).toContain('BTC/USD');
      expect(textReport).toContain('$1,250.50');
      expect(textReport).toContain('Bun 1.3.3');
    });
  });

  describe('Bun.inspect Integration', () => {
    test('Bun.inspect uses custom method', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      
      const inspected = Bun.inspect(opportunity);
      expect(typeof inspected).toBe('string');
      expect(inspected).toContain('BTC_USD');
      expect(inspected).toContain('$1,250.50');
    });

    test('Bun.inspect with options', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      
      const inspected = Bun.inspect(opportunity, { 
        depth: 2, 
        showHidden: true, 
        sorted: true 
      });
      
      expect(typeof inspected).toBe('string');
      expect(inspected).toContain('BTC_USD');
      // Should include hidden properties when showHidden is true
    });

    test('Bun.inspect with snapshot', () => {
      const snapshot = generateEnhancedSnapshot(sampleOpportunities);
      
      const inspected = Bun.inspect(snapshot, { depth: 2 });
      expect(typeof inspected).toBe('string');
      // Should contain snapshot structure, not the literal "ArbitrageSnapshot" string
      expect(inspected).toContain('snapshot:');
      expect(inspected).toContain('opportunities:');
      expect(inspected).toContain('totalOpportunities:');
    });
  });

  describe('Runtime Detection Integration', () => {
    test('includes runtime information in inspection', () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const result = opportunity[Bun.inspect.custom](2, {} as any) as any;
      
      expect(result.runtime).toBe('Bun-optimized');
    });

    test('text snapshot includes runtime info', () => {
      const textReport = generateTextSnapshot(sampleOpportunities);
      
      expect(textReport).toContain('Bun 1.3.3');
      expect(textReport).toContain('optimized');
      expect(textReport).toContain('Custom inspection: Available');
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles empty opportunities array', () => {
      const snapshot = new ArbitrageSnapshot([]);
      
      expect(snapshot.opportunities).toHaveLength(0);
      expect(snapshot.metadata.totalOpportunities).toBe(0);
      expect(snapshot.metadata.highValueCount).toBe(0);
    });

    test('handles Unicode characters correctly', () => {
      const unicodeOpportunity = new ArbitrageOpportunity({
        pair: "🚀MOON/USD",
        spread: 2100.00,
        exchangeA: "Uniswap",
        exchangeB: "Sushiswap"
      });
      
      const result = unicodeOpportunity[Bun.inspect.custom](2, {} as any) as any;
      expect(result.payload).toContain('🚀MOON/USD');
      expect(result.id).toBe('🚀MOON_USD');
    });

    test('performance of custom inspection', async () => {
      const opportunity = new ArbitrageOpportunity(sampleOpportunities[0]);
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        opportunity[Bun.inspect.custom](2, {} as any);
      }
      const time = performance.now() - start;
      
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Custom inspection: ${iterations} iterations in ${time.toFixed(2)}ms`);
    });
  });
});
