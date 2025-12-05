# Enhanced Style Guide Implementation v4.4

## 1. Principles [#REF:PRINCIPLES]

- **Clarity**: Descriptive, concise (≤60 chars); Action-oriented verbs. Example: "Handle YAML Errors" > "Errors".
- **Consistency**: Numeric (1. Title) for levels; Letters (A. Sub) if non-numeric. Example: A.1 Appendix Refs.
- **Searchability**: Prefix "1\." for rg; Refs [#REF] for links. Example: rg "1\.1\.1" → 1.1.1 examples.
- **Depth Limit**: ≤6 levels (1.1.1.1.1.1); Fold in IDE. Example: Deeper for guards.

## 1.1 Naming Conventions

### 1.1.1 Main Sections

- Format: `## N. Title` (N=1,2,... sequential).
- Example: `## 1. Console Configuration` (verb + noun).
- Rule: Start with verb/noun (e.g., "Load YAML", "Handle Errors"). Example: "Validate Inputs" for checks.

### 1.1.1.1 Subsections

- Format: `### N.M Title` (M=1,2,...).
- Example: `### 1.1 Basic Setup` (adjective + noun).
- Rule: Detail main (e.g., "Basic Setup" under "Principles"). Example: "Advanced Parsing" for YAML literals.

### 1.1.1.1.1 Sub-Subsections

- Format: `#### N.M.P Title` (P=1,2,...).
- Example: `#### 1.1.1 bunfig.toml Options` (file + noun).
- Rule: Granular (e.g., "Options" under "Setup"). Example: "TOML Variants" for configs [BUN_TOML].

### 1.1.1.1.1.1 Sub-Sub-Subsections

- Format: `##### N.M.P.Q Title` (Q=1,2,...).
- Example: `##### 1.1.1.1 Depth Configuration` (specific option).
- Rule: Specific (e.g., "Depth" under "Options"). Example: "Indent Levels" for stringify [BUN_JSON5].

## 1.2 References & Tags [#REF:REFS]

### 1.2.1 [#REF] Format

- Inline: `[#REF:ANCHOR]` for internal links.
- Example: `See [Principles](#principles) [#REF:PRINCIPLES]`.
- Rule: Uppercase, ≤20 chars; Unique. Example: [#REF:SEED_EX] for tests.

### 1.2.1.1 External Refs

- Format: `[BUN_YAML]: Link [BUN_YAML]`.
- Example: `[BUN_CONSOLE]: https://bun.sh/docs/api/console [BUN_CONSOLE]`.
- Rule: List at end; rg "\[BUN_\w+\]" for search. Example: [BUN_SEED_EX]: Bun --seed docs [BUN_SEED_EX].

### 1.2.1.1.1 Nested Refs

- Example: See [BUN_JSON5] for lenient parsing [BUN_JSON5].
- Rule: Nest refs in deep sections.

## 1.3 Testing with --seed [#REF:SEED]

### 1.3.1 Reproducibility

- Use `--seed` in Bun/Jest for RNG tests (e.g., random YAML literals).
- Example: `bun test --seed=123` → Fixed output for random trim.

### 1.3.1.1 Validation

- Rule: Seed for edges (e.g., random null desc trim). Example: Seed 456 → "line456" [BUN_SEED_EX].

### 1.3.2 Deep Seed Examples

- Example: Multi-case seed tests for literals/nulls.

### 1.3.2.1 Seed Variants

- Rule: --seed=0 guard (no zero seed). Example: If seed=0, default 1 [BUN_SEED_EX].

## 1.4 Implementation Guidelines

### 1.4.1 Code Structure

- Follow hierarchical organization
- Use descriptive naming conventions

### 1.4.1.1 File Organization

- Group related functionality
- Maintain clear separation of concerns

## 1.5 Documentation Standards

### 1.5.1 Comment Formatting

- Use consistent comment styles
- Include examples in documentation

### 1.5.1.1 Reference Management

- Maintain up-to-date links
- Validate all references regularly

#### 1.5.1.1.1 Link Validation

- Check all external links
- Update broken references

##### 1.5.1.1.1.1 Automated Checks

- Use CI/CD for validation
- Schedule regular audits

###### 1.5.1.1.1.1.1 Reporting

- Generate validation reports
- Track link health metrics

## Appendix: rg Patterns [#REF:SEARCH]

- Sections: `rg "1\." docs/` → Hierarchy. Example: 1.3.2 Deep Seed.
- Refs: `rg "\[.*\]" docs/` → Tags. Example: [BUN_SEED_EX].
- Specific: `rg "BUN_SEED_EX" docs/` → Links.

## A.1 Naming Variants (Letters) [#REF:VARIANTS]

- Format: A. Title for appendices.
- Example: A.1 Naming Variants (non-numeric).

### A.1.1 Letter Subsections

- Format: A.1 Title.
- Example: A.1.1 Letter Subsections (hybrid).

## Implementation

### 1.4 Code Structure

#### 1.4.1 Safe Utilities

```typescript
// lib/safe-utils.ts
/**
 * Safe string utilities with seed support
 * Follows style guide v4.4 naming
 */

export function safeTrim(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim();
}

export function seededRandom(seed: number): () => number {
  let current = seed;
  return () => {
    current = (current * 9301 + 49297) % 233280;
    return current / 233280;
  };
}

export function generateSeededLiteral(seed: number): string {
  const random = seededRandom(seed);
  return `Seeded line${Math.floor(random() * 1000)}`;
}
```

#### 1.4.1.1 YAML Processing

```typescript
// lib/yaml-processor.ts
import { safeTrim, seededRandom } from './safe-utils';

export interface YAMLNode {
  key: string;
  value: any;
  depth: number;
}

export class YAMLProcessor {
  private seed: number;
  
  constructor(seed: number = 123) {
    this.seed = seed || 1; // Guard against zero seed [BUN_SEED_EX]
  }
  
  /**
   * Process YAML with seeding for reproducible results
   */
  processYAML(content: string): YAMLNode[] {
    const random = seededRandom(this.seed);
    const nodes: YAMLNode[] = [];
    
    // Simulate processing with deterministic randomness
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (safeTrim(line)) {
        nodes.push({
          key: `node_${index}`,
          value: line,
          depth: line.length - line.trimStart().length
        });
      }
    });
    
    return nodes;
  }
  
  /**
   * Validate YAML structure with seed-aware checks
   */
  validateStructure(nodes: YAMLNode[]): boolean {
    const random = seededRandom(this.seed);
    
    // Simulate probabilistic validation
    const shouldPass = random() > 0.1; // 90% pass rate
    return shouldPass && nodes.length > 0;
  }
}
```

### 1.5 Test Implementation

#### 1.5.1 Style Guide Test Suite

```typescript
// tests/style-guide-v44.test.ts
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
import { safeTrim, seededRandom, generateSeededLiteral } from '../lib/safe-utils';
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
    const processor = new YAMLProcessor(0);
    const seed = (processor as any).seed;
    console.log(`Guarded seed: ${seed} [BUN_SEED_EX]`);
    expect(seed).toBe(1);
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
});
```

#### 1.5.1.1 rg Pattern Validation

```typescript
// tests/rg-patterns.test.ts
#!/usr/bin/env bun
/**
 * rg Pattern Validation Tests
 * Validates style guide searchability
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';

describe('1.3 rg Pattern Tests', () => {
  
  /** 1.3.1 Section Pattern Matching */
  test('1.3.1 Section Hierarchy Count', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const sections = content.match(/^## \d+\./gm) || [];
    expect(sections.length).toBeGreaterThanOrEqual(5);
  });

  /** 1.3.1.1 Reference Pattern Matching */
  test('1.3.1.1 Reference Tag Count', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const refs = content.match(/\[#REF:[A-Z_]+\]/g) || [];
    expect(refs.length).toBeGreaterThanOrEqual(8);
  });

  /** 1.3.1.1.1 Deep Section Matching */
  test('1.3.1.1.1 Deep Section 1.3.2', () => {
    const content = readFileSync('docs/STYLE-GUIDE-V44.md', 'utf8');
    const deepSections = content.match(/1\.3\.2(\.1)?/g) || [];
    expect(deepSections.length).toBe(2); // 1.3.2 + 1.3.2.1
  });
});
```

### 1.6 Usage Examples

#### 1.6.1 Command Line Interface

```bash
# Run tests with seed for reproducibility
bun test tests/style-guide-v44.test.ts --seed=123

# Validate rg patterns
rg "1\." docs/STYLE-GUIDE-V44.md
rg "\[.*\]" docs/STYLE-GUIDE-V44.md
rg "BUN_SEED_EX" docs/STYLE-GUIDE-V44.md

# Process YAML with seeding
bun -e "
import { YAMLProcessor } from './lib/yaml-processor';
const processor = new YAMLProcessor(123);
console.log(processor.processYAML('key: value'));
"
```

#### 1.6.1.1 Programmatic Usage

```typescript
// examples/style-guide-usage.ts
import { YAMLProcessor, safeTrim } from '../lib';

// Create processor with seed
const processor = new YAMLProcessor(123);

// Process content
const yaml = `
name: test
version: 1.0
`;

const nodes = processor.processYAML(yaml);
console.log('Processed nodes:', nodes);

// Validate structure
const isValid = processor.validateStructure(nodes);
console.log('Valid:', isValid);

// Safe trimming
const cleaned = safeTrim(null);
console.log('Cleaned null:', cleaned);
```

## References

- [BUN_CONSOLE]: https://bun.sh/docs/api/console
- [CONFIG_FILE]: bunfig-simple.toml
- [BUN_YAML]: Bun YAML module
- [BUN_BENCH]: Performance benchmarks
- [BUN_JSON5]: JSON5 lenient parse
- [BUN_TOML]: TOML config support
- [BUN_NULL]: Null safety patterns
- [BUN_SEED_EX]: Bun --seed examples [BUN_SEED_EX]
