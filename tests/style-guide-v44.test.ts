#!/usr/bin/env bun
/**
 * Style Guide Seed Test v4.4
 * Tests naming with seeded RNG for reproducible literals.
 * Run: bun test --seed=123
 * 
 * 1. Naming Test Suite
 *    Validates hierarchy.
 * 
 * 1.1 Seeded Random Trim
 *    Sim literal with random str.
 * 
 * 1.1.1 Edge: Null Desc
 *    Safe trim seeded null.
 * 
 * 1.1.1.1 Reproducibility
 *    --seed=123 → Fixed "test123" [BUN_SEED_EX].
 * 
 * 1.1.1.1.1 Seed Variants
 *    Test seed=456 → "line456".
 * 
 * 1.1.1.1.1.1 Deep Seed Guards
 *    Zero seed fallback to 1 [BUN_SEED_EX].
 */

import { describe, test, expect } from 'bun:test';
import { safeTrim, seededRandom, generateSeededLiteral, formatWithSeed } from '../lib/safe-utils';
import { YAMLProcessor } from '../lib/yaml-processor';

describe('1. Style Guide Naming Tests', () => {
  
  /** 1.1 Seeded Random Trim */
  test('1.1 Random Literal Trim (seeded)', () => {
    const randomLit = `Seeded line1\nline${Math.floor(seededRandom(123)() * 1000)}`;
    expect(safeTrim(randomLit)).toContain('line');
  });

  /** 1.1.1 Edge: Null Desc */
  test('1.1.1 Null Desc Safe', () => {
    const nullDesc = null;
    expect(safeTrim(nullDesc)).toBe('');
  });

  /** 1.1.1.1 Reproducibility */
  test('1.1.1.1 Seeded Edge Case', () => {
    const random = seededRandom(123);
    const isNull = random() < 0.5;
    expect(isNull).toBe(true); // Fixed true for seed 123
    if (isNull) console.log('Seeded null handled [BUN_SEED_EX]');
  });

  /** 1.1.1.1.1 Seed Variants */
  test('1.1.1.1.1 Seed 456 Variant', () => {
    const variantLit = generateSeededLiteral(456);
    expect(variantLit).toBe('Seeded line456');
  });

  /** 1.1.1.1.1.1 Deep Seed Guards */
  test('1.1.1.1.1.1 Zero Seed Fallback', () => {
    const processor = new YAMLProcessor({ seed: 0 });
    console.log(`Guarded seed: ${processor.seed} [BUN_SEED_EX]`);
    expect(processor.seed).toBe(1);
  });
});

describe('1.2 YAML Processing Tests', () => {
  
  /** 1.2.1 Basic Processing */
  test('1.2.1 YAML Processing with Seed', () => {
    const processor = new YAMLProcessor(123);
    const content = `
key1: value1
key2: value2
    `;
    
    const nodes = processor.processYAML(content);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].key).toBe('node_1');
  });

  /** 1.2.1.1 Validation */
  test('1.2.1.1 Structure Validation', () => {
    const processor = new YAMLProcessor(123);
    const nodes = processor.processYAML('key: value');
    
    const isValid = processor.validateStructure(nodes);
    expect(isValid).toBe(true);
  });

  /** 1.2.1.1.1 Key-Value Extraction */
  test('1.2.1.1.1 Key-Value Extraction', () => {
    const processor = new YAMLProcessor(123);
    const content = `
name: test
version: 1.0
# This is a comment
description: A test file
    `;
    
    const nodes = processor.processYAML(content);
    const keyValuePairs = processor.extractKeyValuePairs(nodes);
    
    expect(keyValuePairs.name).toBe('test');
    expect(keyValuePairs.version).toBe('1.0');
    expect(keyValuePairs.description).toBe('A test file');
    expect(keyValuePairs['# This is a comment']).toBeUndefined(); // Comments should be excluded
  });

  /** 1.2.1.1.1.1 Report Generation */
  test('1.2.1.1.1.1 Processing Report', () => {
    const processor = new YAMLProcessor(123);
    const content = `
level1: value1
  level2: value2
    level3: value3
    `;
    
    const nodes = processor.processYAML(content);
    const report = processor.generateReport(nodes);
    
    expect(report.totalNodes).toBe(3);
    expect(report.maxDepthFound).toBe(4); // level3 has 4 spaces
    expect(report.isValid).toBe(true);
    expect(report.seed).toBe(123);
  });
});

describe('1.3 Advanced Utility Tests', () => {
  
  /** 1.3.1 String Validation */
  test('1.3.1 String Length Validation', () => {
    expect(safeTrim('test')).toBe('test');
    expect(safeTrim('  test  ')).toBe('test');
    expect(safeTrim('')).toBe('');
    expect(safeTrim(null)).toBe('');
    expect(safeTrim(undefined)).toBe('');
  });

  /** 1.3.1.1 Template Formatting */
  test('1.3.1.1 Template with Seed', () => {
    const template = 'Value: {random}, Another: {random}';
    const formatted = formatWithSeed(template, 123);
    
    expect(formatted).toMatch(/Value: \d+, Another: \d+/);
    // Should be reproducible
    const formatted2 = formatWithSeed(template, 123);
    expect(formatted).toBe(formatted2);
  });

  /** 1.3.1.1.1 Edge Cases */
  test('1.3.1.1.1 Edge Case Handling', () => {
    const processor = new YAMLProcessor({ seed: 999, maxDepth: 2 });
    const deepContent = `
level1: value1
  level2: value2
    level3: value3  # This should be filtered out due to maxDepth
    `;
    
    const nodes = processor.processYAML(deepContent);
    expect(nodes).toHaveLength(2); // Only first two nodes within maxDepth
    
    const report = processor.generateReport(nodes);
    expect(report.maxDepthFound).toBeLessThanOrEqual(2);
  });
});
