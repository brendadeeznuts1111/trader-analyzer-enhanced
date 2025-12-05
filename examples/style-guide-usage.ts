// examples/style-guide-usage.ts
/**
 * Style Guide v4.4 Usage Examples
 * Demonstrates practical implementation
 * 
 * 1. Usage Examples
 *    Shows practical applications
 * 
 * 1.1 Basic Usage
 *    Simple processor examples
 * 
 * 1.1.1 Advanced Features
 *    Complex processing scenarios
 */

import { YAMLProcessor } from '../lib/yaml-processor';
import { safeTrim, generateSeededLiteral, formatWithSeed } from '../lib/safe-utils';

/**
 * 1.1 Basic YAML Processing Example
 */
export function basicYAMLExample() {
  console.log('=== Basic YAML Processing ===');
  
  // Create processor with seed
  const processor = new YAMLProcessor(123);
  
  // Process content
  const yaml = `
name: test-app
version: 1.0.0
description: A test application
author: Developer
`;

  const nodes = processor.processYAML(yaml);
  console.log('Processed nodes:', nodes.length);
  
  // Extract key-value pairs
  const keyValuePairs = processor.extractKeyValuePairs(nodes);
  console.log('Key-value pairs:', keyValuePairs);
  
  // Validate structure
  const isValid = processor.validateStructure(nodes);
  console.log('Valid structure:', isValid);
  
  // Generate report
  const report = processor.generateReport(nodes);
  console.log('Processing report:', report);
}

/**
 * 1.1.1 Advanced Processing Example
 */
export function advancedProcessingExample() {
  console.log('\n=== Advanced Processing ===');
  
  // Processor with custom options
  const processor = new YAMLProcessor({
    seed: 456,
    maxDepth: 5,
    preserveComments: true
  });
  
  const complexYaml = `
# Application Configuration
app:
  name: complex-app
  settings:
    database:
      host: localhost
      port: 5432
    cache:
      type: redis
      ttl: 3600
  features:
    - authentication
    - authorization
    - logging
`;

  const nodes = processor.processYAML(complexYaml);
  const keyValuePairs = processor.extractKeyValuePairs(nodes);
  const report = processor.generateReport(nodes);
  
  console.log('Complex nodes:', nodes.length);
  console.log('Extracted config:', keyValuePairs);
  console.log('Detailed report:', report);
}

/**
 * 1.2 Seeded Operations Example
 */
export function seededOperationsExample() {
  console.log('\n=== Seeded Operations ===');
  
  // Generate reproducible literals
  const lit1 = generateSeededLiteral(123);
  const lit2 = generateSeededLiteral(123); // Same seed = same result
  const lit3 = generateSeededLiteral(456); // Different seed = different result
  
  console.log('Literal 1 (seed 123):', lit1);
  console.log('Literal 2 (seed 123):', lit2);
  console.log('Literal 3 (seed 456):', lit3);
  console.log('Reproducible:', lit1 === lit2);
  
  // Format templates with seed
  const template = 'User-{random}-Session-{random}';
  const formatted1 = formatWithSeed(template, 789);
  const formatted2 = formatWithSeed(template, 789);
  
  console.log('Template 1:', formatted1);
  console.log('Template 2:', formatted2);
  console.log('Template reproducible:', formatted1 === formatted2);
}

/**
 * 1.3 Error Handling Example
 */
export function errorHandlingExample() {
  console.log('\n=== Error Handling ===');
  
  // Safe trimming with various inputs
  const inputs = [
    '  normal string  ',
    '',
    null,
    undefined,
    '   ',
    'single-line'
  ];
  
  inputs.forEach((input, index) => {
    const trimmed = safeTrim(input);
    console.log(`Input ${index}:`, JSON.stringify(input), '→', JSON.stringify(trimmed));
  });
  
  // Zero seed guard
  const processor1 = new YAMLProcessor(0); // Should fallback to 1
  const processor2 = new YAMLProcessor(1); // Explicit 1
  
  console.log('Zero seed processor seed:', (processor1 as any).seed);
  console.log('Explicit seed processor seed:', (processor2 as any).seed);
  console.log('Both seeds equal:', (processor1 as any).seed === (processor2 as any).seed);
}

/**
 * 1.4 Performance Testing Example
 */
export function performanceExample() {
  console.log('\n=== Performance Testing ===');
  
  const iterations = 1000;
  const yamlContent = `
key1: value1
key2: value2
key3: value3
key4: value4
key5: value5
`;

  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const processor = new YAMLProcessor(i % 100); // Vary seeds
    processor.processYAML(yamlContent);
    processor.validateStructure(processor.processYAML(yamlContent));
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`Processed ${iterations} YAML documents`);
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per document: ${avgTime.toFixed(4)}ms`);
  console.log(`Documents per second: ${(1000 / avgTime).toFixed(0)}`);
}

// Run examples if this file is executed directly
if (import.meta.main) {
  basicYAMLExample();
  advancedProcessingExample();
  seededOperationsExample();
  errorHandlingExample();
  performanceExample();
}
