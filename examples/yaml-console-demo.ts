#!/usr/bin/env bun
/**
 * YAML Console Options Demo
 * 
 * Demonstrates Bun's console configuration options with YAML parsing
 * 
 * @example
 * ```bash
 * bun --config=bunfig-simple.toml run yaml-console-demo.ts
 * bun --console-depth=4 run yaml-console-demo.ts
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/console} [BUN_CONSOLE]
 * @see bunfig-simple.toml [CONFIG_FILE]
 */

import { YAML } from "bun";

/**
 * 1. Console Configuration
 * 1.1. Basic setup
 * 1.1.1. bunfig.toml options
 * 1.1.1.1. depth configuration
 * 
 * Shows how console depth affects object inspection
 * 
 * @see bunfig-simple.toml [CONFIG_FILE]
 * @see {@link https://bun.com/docs/runtime/console} [BUN_CONSOLE]
 */
console.log('=== YAML Console Options Demo ===');
console.log('');

/**
 * 1.2. Advanced YAML Integration
 * 1.2.1. Literal Block Handling
 * 1.2.1.1. Error Guards
 * 1.2.1.1.1. Undefined Access Prevention
 * 1.2.1.1.1.1. Edge Cases: Empty Literal
 * 1.2.1.1.1.1.1. Null Checks
 * 1.2.1.1.1.1.2. Type Guards
 * 
 * Advanced YAML parsing with safety checks
 * 
 * @see {@link https://bun.com/docs/runtime/yaml} [BUN_YAML]
 * @see {@link https://bun.com/docs/runtime/json5} [BUN_JSON5]
 * @see {@link https://bun.com/docs/runtime/toml} [BUN_TOML]
 * @see {@link https://bun.com/docs/runtime/null-safety} [BUN_NULL]
 */
const nestedConfig = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: "Deep nested value",
          level6: {
            deepest: "Maximum depth demonstration"
          }
        }
      }
    }
  }
};

console.log('1.2.1. Object inspection demo:');
console.log(nestedConfig);
console.log('');
console.log('Use --console-depth=6 for deepest nesting (1.2.1.1.1.1.1)');
console.log('');

/**
 * 1.2.1.1.1.1.1. Null Check Handling
 * Demonstrates safe handling of null values in YAML
 */
function safeTrim(value: any): string {
  // 1.2.1.1.1.1.1. Null Checks
  if (value === null || value === undefined) return '';
  
  // 1.2.1.1.1.1.2. Type Guards
  if (typeof value !== 'string') return '';
  
  return value.trim();
}

/**
 * 1.2.1.1.1.1.2. Type Guard Examples
 * Shows comprehensive type checking before operations
 */
function demonstrateNullSafety() {
  const testValues = [
    null,           // 1.2.1.1.1.1.1. Null case
    undefined,      // Undefined case
    '',            // Empty string
    '  valid  ',   // Valid string with spaces
    123,           // Number (should be rejected)
    {},            // Object (should be rejected)
  ];
  
  console.log('1.2.1.1.1.1.1. Null safety demonstrations:');
  testValues.forEach((val, index) => {
    const result = safeTrim(val);
    const type = typeof val;
    console.log(`  Test ${index + 1}: ${type} → "${result}" [BUN_NULL]`);
  });
  console.log('');
}

/**
 * 2. YAML Parsing Examples
 * 2.1. Basic parsing
 * 2.1.1. Simple configuration
 * 2.1.1.1. Application settings
 * 2.1.1.2. Database configuration
 * 2.1.1.2.1. Connection pooling
 * 2.1.1.2.1.1. Pool size limits
 * 
 * @example
 * ```yaml
 * application:
 *   name: "Trader Analyzer"
 *   version: "2.0.0"
 * ```
 * 
 * @see {@link https://bun.com/docs/runtime/yaml} [BUN_YAML]
 * @see {@link https://bun.com/docs/runtime/json5} [BUN_JSON5]
 */
const yamlString = `
application:
  name: "Trader Analyzer"
  version: "2.0.0"
  database:
    host: "localhost"
    port: 5432
    connection_pool:
      max_size: 20
      timeout: 30
      retry_policy:
        max_attempts: 3
        backoff: "exponential"
`;

console.log('2.1. YAML parsing example:');
const parsed = YAML.parse(yamlString) as {
  application: {
    name: string;
    version: string;
    database: {
      host: string;
      port: number;
      connection_pool: {
        max_size: number;
        timeout: number;
        retry_policy: {
          max_attempts: number;
          backoff: string;
        };
      };
    };
  };
};
console.log(parsed);
console.log('');

/**
 * 2.1.1.2.1.1. Pool Configuration Demo
 * Shows deep nested configuration parsing
 */
const poolConfig = parsed?.application?.database?.connection_pool?.retry_policy;
console.log('2.1.1.2.1.1. Pool retry policy:', poolConfig);
console.log('');

/**
 * 3. Performance Metrics
 * 3.1. Benchmarking
 * 3.1.1. Parse timing
 * 3.1.1.1. Multiple iterations
 * 3.1.1.2. Average calculation
 * 3.1.1.2.1. Memory usage tracking
 * 3.1.1.2.1.1. GC pressure analysis
 * 
 * Measures YAML.parse() performance over 1000 iterations
 * 
 * @see {@link https://bun.com/docs/runtime/benchmarks} [BUN_BENCH]
 * @see {@link https://bun.com/docs/runtime/toml} [BUN_TOML]
 */
const startTime = performance.now();
const startMemory = process.memoryUsage().heapUsed;

for (let i = 0; i < 1000; i++) {
  YAML.parse(yamlString);
}

const endTime = performance.now();
const endMemory = process.memoryUsage().heapUsed;

console.log('3.1. Performance metrics:');
console.log(`3.1.1. Iterations: 1000`);
console.log(`3.1.2. Total time: ${(endTime - startTime).toFixed(2)}ms`);
console.log(`3.1.3. Average: ${((endTime - startTime) / 1000).toFixed(4)}ms per parse`);
console.log(`3.1.1.2.1.1. Memory delta: ${((endMemory - startMemory) / 1024).toFixed(2)}KB`);
console.log('');

/**
 * 4. Multi-Format Configuration Support
 * 4.1. Format detection
 * 4.1.1. File extension parsing
 * 4.1.1.1. YAML format handler
 * 4.1.1.2. JSON5 format handler
 * 4.1.1.2.1. Lenient parsing options
 * 4.1.1.3. TOML format handler
 * 4.1.1.3.1. Configuration sections
 * 4.1.1.3.1.1. Nested table support
 * 
 * Complete reference for multi-format configuration handling
 * 
 * @see {@link https://bun.com/docs/runtime/console} [BUN_CONSOLE]
 * @see bunfig-simple.toml [CONFIG_FILE]
 * @see {@link https://bun.com/docs/runtime/json5} [BUN_JSON5]
 * @see {@link https://bun.com/docs/runtime/toml} [BUN_TOML]
 */
console.log('4.1. Multi-format configuration support:');
console.log('4.1.1. YAML: Native support with literals and anchors');
console.log('4.1.1.2. JSON5: Lenient parsing with comments and trailing commas [BUN_JSON5]');
console.log('4.1.1.3. TOML: Configuration tables and nested sections [BUN_TOML]');
console.log('4.1.1.3.1.1. Deep table nesting supported');
console.log('');

/**
 * 4.1.1.2.1.1. JSON5 Example
 * Shows lenient JSON parsing capabilities
 */
const json5Example = `
{
  // JSON5 supports comments
  app: "Trader Analyzer",
  version: "2.0.0",  // Trailing comma allowed
  database: {
    host: "localhost",
    port: 5432,
  }
}
`;

console.log('4.1.1.2.1.1. JSON5 example would parse with:');
console.log('   - Single quotes allowed');
console.log('   - Trailing commas permitted');
console.log('   - Comments supported [BUN_JSON5]');
console.log('');

/**
 * 4.1.1.3.1.1. TOML Example
 * Shows configuration table structure
 */
const tomlExample = `
[application]
name = "Trader Analyzer"
version = "2.0.0"

[[database.servers]]
host = "localhost"
port = 5432

[database.connection_pool]
max_size = 20
[database.connection_pool.retry_policy]
max_attempts = 3
`;

console.log('4.1.1.3.1.1. TOML example features:');
console.log('   - Section-based configuration [BUN_TOML]');
console.log('   - Array of tables support');
console.log('   - Deep nested sections');
console.log('');

/**
 * 5. Null Safety Implementation
 * 5.1. Comprehensive type checking
 * 5.1.1. Null handling
 * 5.1.1.1. Undefined prevention
 * 5.1.1.1.1. Type validation
 * 5.1.1.1.1.1. Safe operations
 * 
 * Complete null safety demonstration for YAML parsing
 * 
 * @see {@link https://bun.com/docs/runtime/null-safety} [BUN_NULL]
 */
demonstrateNullSafety();
