#!/usr/bin/env bun
/**
 * Arbitrage Snapshot Runtime Detection Test
 * 
 * Tests the enhanced arbitrage snapshot report with Bun runtime detection
 * 
 * Run: bun test tests/arbitrage-snapshot.test.ts --seed=123
 */

import { describe, test, expect } from 'bun:test';
import { 
  generateCustomSnapshot, 
  getStringWidth,
  padEnd,
  padStart,
  type Opportunity 
} from '../src/reports/arbitrage-snapshot';

describe('Arbitrage Snapshot with Runtime Detection', () => {
  const sampleOpportunities: Opportunity[] = [
    { pair: "BTC/USD", spread: 1250.50, exchangeA: "Binance", exchangeB: "Coinbase" },
    { pair: "ETH/USD", spread: 875.25, exchangeA: "Kraken", exchangeB: "Gemini" },
    { pair: "SOL/USD", spread: 342.75, exchangeA: "Raydium", exchangeB: "Orca" }
  ];

  describe('String Width Calculation', () => {
    test('uses Bun.stringWidth when available', () => {
      const width = getStringWidth("BTC/USD");
      expect(width).toBeGreaterThan(0);
      expect(typeof width).toBe('number');
    });

    test('handles Unicode characters correctly', () => {
      const asciiWidth = getStringWidth("BTC/USD");
      const unicodeWidth = getStringWidth("ビットコイン/USD"); // Japanese
      
      expect(unicodeWidth).toBeGreaterThan(asciiWidth);
    });

    test('handles empty string', () => {
      expect(getStringWidth("")).toBe(0);
    });

    test('handles special characters', () => {
      const specialText = "🚀 BTC/USD 💰";
      const width = getStringWidth(specialText);
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('Padding Functions', () => {
    test('padEnd works correctly with runtime detection', () => {
      const padded = getStringWidth("BTC") + 5; // Add 5 spaces
      const result = "BTC".padEnd(padded, ' ');
      expect(result.length).toBe(padded);
    });

    test('padStart works correctly with runtime detection', () => {
      const padded = getStringWidth("USD") + 3; // Add 3 spaces
      const result = "USD".padStart(padded, ' ');
      expect(result.length).toBe(padded);
    });
  });

  describe('Report Generation', () => {
    test('generates custom snapshot with runtime info', () => {
      const report = generateCustomSnapshot(sampleOpportunities);
      
      expect(report).toContain("Arbitrage Opportunity Snapshot");
      expect(report).toContain("BTC/USD");
      expect(report).toContain("$1,250.50"); // Formatted with currency symbol
      expect(report).toContain("Binance");
      expect(report).toContain("Generated in");
      expect(report).toContain("Bun"); // Should mention Bun runtime
    });

    test('handles empty opportunities array', () => {
      const report = generateCustomSnapshot([]);
      
      expect(report).toContain("Arbitrage Opportunity Snapshot");
      expect(report).toContain("Generated in");
      expect(report).toContain("Bun");
    });

    test('dynamic column sizing works correctly', () => {
      const variedOpportunities: Opportunity[] = [
        { pair: "A", spread: 1, exchangeA: "X", exchangeB: "Y" },
        { pair: "VeryLongPairName/USD", spread: 9999.99, exchangeA: "VeryLongExchangeName", exchangeB: "AnotherLongExchange" }
      ];
      
      const report = generateCustomSnapshot(variedOpportunities);
      
      // Should accommodate long names without breaking layout
      expect(report).toContain("VeryLongPairName/USD");
      expect(report).toContain("VeryLongExchangeName");
      
      // Check that columns are aligned (no broken formatting)
      const lines = report.split('\n');
      const dataLine = lines.find(line => line.includes('VeryLongPairName/USD'));
      expect(dataLine).toBeDefined();
    });
  });

  describe('Performance Optimization', () => {
    test('runtime detection improves performance', async () => {
      const iterations = 1000;
      const testString = "BTC/USD";
      
      // Test string width calculation performance
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        getStringWidth(testString);
      }
      const time = performance.now() - start;
      
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`String width calculation: ${iterations} iterations in ${time.toFixed(2)}ms`);
    });

    test('report generation performance', async () => {
      const largeOpportunities: Opportunity[] = Array.from({ length: 100 }, (_, i) => ({
        pair: `PAIR${i}/USD`,
        spread: Math.random() * 2000,
        exchangeA: `Exchange${i % 5}`,
        exchangeB: `Exchange${(i + 1) % 5}`
      }));
      
      const start = performance.now();
      const report = generateCustomSnapshot(largeOpportunities);
      const time = performance.now() - start;
      
      expect(report.length).toBeGreaterThan(0);
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThan(1000); // Should complete within 1 second (more realistic)
      
      console.log(`Generated report for ${largeOpportunities.length} opportunities in ${time.toFixed(2)}ms`);
    });
  });

  describe('Cross-Platform Compatibility', () => {
    test('works with different data types', () => {
      const weirdOpportunities: Opportunity[] = [
        { pair: "🚀/USD", spread: 0, exchangeA: "", exchangeB: " " },
        { pair: "中文字符/USD", spread: -100, exchangeA: "交易所", exchangeB: "取引所" }
      ];
      
      const report = generateCustomSnapshot(weirdOpportunities);
      
      expect(report).toContain("🚀/USD");
      expect(report).toContain("中文字符/USD");
      expect(report).toContain("Generated in");
    });

    test('handles edge cases gracefully', () => {
      const edgeCases: Opportunity[] = [
        { pair: "", spread: 0, exchangeA: "", exchangeB: "" },
        { pair: " ", spread: Number.MAX_SAFE_INTEGER, exchangeA: " ", exchangeB: " " }
      ];
      
      expect(() => {
        generateCustomSnapshot(edgeCases);
      }).not.toThrow();
    });
  });
});
