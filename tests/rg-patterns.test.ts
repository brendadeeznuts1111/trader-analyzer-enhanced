#!/usr/bin/env bun
/**
 * rg Pattern Validation Tests
 * Validates style guide searchability
 * 
 * 1. rg Pattern Tests
 *    Validates searchability
 * 
 * 1.1 Section Pattern Matching
 *    Tests numeric hierarchy
 * 
 * 1.1.1 Reference Pattern Matching
 *    Tests tag consistency
 * 
 * 1.1.1.1 Deep Section Matching
 *    Tests nested sections
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';

describe('1.3 rg Pattern Tests', () => {
  
  /** 1.3.1 Section Pattern Matching */
  test('1.3.1 Section Hierarchy Count', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const sections = content.match(/^## \d+\./gm) || [];
    expect(sections.length).toBeGreaterThanOrEqual(5);
    
    // Verify specific sections exist
    expect(content).toContain('## 1. Principles');
    expect(content).toContain('## 1.1 Naming Conventions');
    expect(content).toContain('## 1.2 References & Tags');
    expect(content).toContain('## 1.3 Testing with --seed');
  });

  /** 1.3.1.1 Reference Pattern Matching */
  test('1.3.1.1 Reference Tag Count', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const refs = content.match(/\[#REF:[A-Z_]+\]/g) || [];
    expect(refs.length).toBeGreaterThanOrEqual(8);
    
    // Verify specific references exist
    expect(content).toContain('[#REF:PRINCIPLES]');
    expect(content).toContain('[#REF:REFS]');
    expect(content).toContain('[#REF:SEED]');
    expect(content).toContain('[#REF:SEARCH]');
    expect(content).toContain('[#REF:VARIANTS]');
  });

  /** 1.3.1.1.1 Deep Section Matching */
  test('1.3.1.1.1 Deep Section 1.3.2', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    // Only match actual section headings, not occurrences in text
    const deepSections = content.match(/^### 1\.3\.2(\.1)? .+$/gm) || [];
    expect(deepSections.length).toBe(2); // 1.3.2 + 1.3.2.1
    
    // Verify specific deep sections
    expect(content).toContain('### 1.3.2 Deep Seed Examples');
    expect(content).toContain('### 1.3.2.1 Seed Variants');
  });

  /** 1.3.1.1.1.1 External References */
  test('1.3.1.1.1.1 External Reference Links', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const externalRefs = content.match(/\[BUN_[A-Z_]+]:/g) || [];
    expect(externalRefs.length).toBeGreaterThanOrEqual(8);
    
    // Verify specific external references
    expect(content).toContain('[BUN_CONSOLE]:');
    expect(content).toContain('[BUN_SEED_EX]:');
    expect(content).toContain('[BUN_YAML]:');
    expect(content).toContain('[BUN_TOML]:');
  });

  /** 1.3.1.1.1.1.1 Appendix Sections */
  test('1.3.1.1.1.1.1 Appendix Letter Sections', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const appendixSections = content.match(/^## [A]\.\d+/gm) || [];
    expect(appendixSections.length).toBeGreaterThanOrEqual(1);
    
    // Verify appendix structure
    expect(content).toContain('## A.1 Naming Variants');
    expect(content).toContain('### A.1.1 Letter Subsections');
  });

  /** 1.3.1.1.1.1.1.1 rg Command Simulation */
  test('1.3.1.1.1.1.1.1 rg Command Patterns', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    
    // Simulate rg "1\." pattern
    const numberedSections = content.match(/1\.\d+/g) || [];
    expect(numberedSections.length).toBeGreaterThan(5);
    
    // Simulate rg "\[.*\]" pattern
    const allBrackets = content.match(/\[.*?\]/g) || [];
    expect(allBrackets.length).toBeGreaterThan(10);
    
    // Simulate rg "BUN_SEED_EX" pattern
    const seedExRefs = content.match(/BUN_SEED_EX/g) || [];
    expect(seedExRefs.length).toBeGreaterThanOrEqual(2);
  });

  /** 1.3.1.1.1.1.1.1.1 Depth Limit Validation */
  test('1.3.1.1.1.1.1.1.1 Depth Limit Compliance', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    
    // Check for sections deeper than 6 levels (should not exist)
    const tooDeep = content.match(/^#{7,} \d+\./gm);
    expect(tooDeep).toBeNull();
    
    // Verify maximum depth is 6 levels (allowing 6 levels as per guide)
    const maxDepth = content.match(/^#{6} \d+\./gm);
    expect(maxDepth).toBeTruthy();
  });
});

describe('1.4 Content Validation Tests', () => {
  
  /** 1.4.1 Title Length Validation */
  test('1.4.1 Title Length Compliance', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const titles = content.match(/^#+ \d+\..+$/gm) || [];
    
    // All titles should be ≤60 characters
    const longTitles = titles.filter(title => title.length > 60);
    expect(longTitles).toHaveLength(0);
  });

  /** 1.4.1.1 Reference Format Validation */
  test('1.4.1.1 Reference Format Compliance', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const refs = content.match(/\[#REF:[A-Z_]+\]/g) || [];
    
    // All refs should be uppercase and ≤20 characters
    const invalidRefs = refs.filter(ref => {
      const anchor = ref.match(/#REF:([A-Z_]+)/)?.[1];
      return !anchor || anchor.length > 20 || anchor !== anchor.toUpperCase();
    });
    expect(invalidRefs).toHaveLength(0);
  });

  /** 1.4.1.1.1 Numbering Validation */
  test('1.4.1.1.1 Numbering Consistency', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    
    // Check that main sections follow proper numbering pattern
    const mainSections = content.match(/^## (\d+)\./gm) || [];
    const numbers = mainSections.map(section => parseInt(section.match(/(\d+)\./)?.[1] || '0'));
    
    // Should contain expected section numbers
    expect(numbers).toContain(1); // Section 1
    // Allow for non-sequential but valid numbering
    expect(numbers.length).toBeGreaterThan(0);
    
    // Verify all numbers are positive integers
    numbers.forEach(num => {
      expect(num).toBeGreaterThan(0);
      expect(Number.isInteger(num)).toBe(true);
    });
  });
});
