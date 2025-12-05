#!/usr/bin/env bun
/**
 * Server-side Bun Native Detection Demo
 * 
 * Demonstrates practical usage of BunUtils.isBunNative() in a server context
 * 
 * Run: bun run examples/server-bun-detection.ts
 */

import { BunUtils, isBunNative, deepClone } from '../lib/bun-utils';
import { getYamlConfigLoader } from '../src/config/yaml-config-loader';

interface ServerObject {
  name: string;
  type: 'bun-native' | 'standard' | 'unknown';
  properties: string[];
}

class ServerBunDetector {
  private detectedObjects: ServerObject[] = [];

  /**
   * Analyze various server-side objects for Bun native types
   */
  analyzeServerObjects(): ServerObject[] {
    const objects = [
      { name: 'YAML Config Loader', obj: getYamlConfigLoader() },
      { name: 'Bun File Handle', obj: Bun.file('package.json') },
      { name: 'Bun Utils Class', obj: BunUtils },
      { name: 'Process Object', obj: process },
      { name: 'Global Object', obj: globalThis },
      { name: 'Plain Object', obj: { server: true } },
      { name: 'Array', obj: [1, 2, 3] },
      { name: 'Date', obj: new Date() },
      { name: 'RegExp', obj: /test/g },
      { name: 'Function', obj: () => console.log('test') },
    ];

    this.detectedObjects = objects.map(({ name, obj }) => {
      const isNative = isBunNative(obj);
      const properties = this.getObjectProperties(obj);
      
      return {
        name,
        type: isNative ? 'bun-native' : 'standard',
        properties
      };
    });

    return this.detectedObjects;
  }

  /**
   * Get properties of an object safely
   */
  private getObjectProperties(obj: any): string[] {
    try {
      if (!obj || typeof obj !== 'object') {
        return ['primitive'];
      }
      
      return Object.getOwnPropertyNames(obj).slice(0, 10); // Limit to first 10
    } catch {
      return ['inaccessible'];
    }
  }

  /**
   * Generate detection report
   */
  generateReport(): string {
    const report = [
      '=== Server-side Bun Native Detection Report ===\n',
      `Total objects analyzed: ${this.detectedObjects.length}`,
      `Bun native objects: ${this.detectedObjects.filter(obj => obj.type === 'bun-native').length}`,
      `Standard objects: ${this.detectedObjects.filter(obj => obj.type === 'standard').length}`,
      '',
      'Detailed Analysis:',
      ...this.detectedObjects.map(obj => 
        `• ${obj.name}: ${obj.type.toUpperCase()} (${obj.properties.length} properties)`
      ),
      '',
      '=== Performance Test ==='
    ];

    return report.join('\n');
  }

  /**
   * Test performance of isBunNative with deep cloning
   */
  async performanceTest(): Promise<void> {
    console.log('Testing isBunNative performance with deep cloning...');
    
    const testObjects = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `object-${i}`,
      data: `test-data-${i}`.repeat(10),
      nested: { deep: true, level: i }
    }));

    // Test deep cloning performance
    const cloneBenchmark = await BunUtils.benchmark('server-clone-test', async () => {
      const cloned = deepClone(testObjects);
      return cloned.length === testObjects.length;
    }, 100);

    console.log(`Deep clone benchmark: ${cloneBenchmark.opsPerSecond.toFixed(0)} ops/sec`);

    // Test isBunNative performance on cloned objects
    const nativeCheckBenchmark = await BunUtils.benchmark('native-check-test', async () => {
      const cloned = deepClone(testObjects);
      return cloned.every(obj => !isBunNative(obj));
    }, 100);

    console.log(`Native check benchmark: ${nativeCheckBenchmark.opsPerSecond.toFixed(0)} ops/sec`);
  }

  /**
   * Demonstrate practical usage in server context
   */
  async demonstratePracticalUsage(): Promise<void> {
    console.log('\n=== Practical Server Usage Examples ===\n');

    // Example 1: Configuration validation
    console.log('1. Configuration Validation:');
    const configLoader = getYamlConfigLoader();
    const config = configLoader.getAll();
    
    if (isBunNative(config)) {
      console.log('   ✅ Configuration loaded as Bun native object');
    } else {
      console.log('   ⚡ Configuration loaded as standard object');
    }

    // Example 2: Request handling optimization
    console.log('\n2. Request Handling Optimization:');
    const mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: { 'content-type': 'application/json' },
      body: null
    };

    const isRequestNative = isBunNative(mockRequest);
    console.log(`   Request object type: ${isRequestNative ? 'Bun native' : 'Standard'}`);
    
    // Clone request for processing
    const clonedRequest = deepClone(mockRequest);
    console.log(`   Request cloned safely: ${clonedRequest !== mockRequest}`);

    // Example 3: Cache management
    console.log('\n3. Cache Management:');
    const cache = new Map<string, any>();
    const cacheKey = 'test-cache';
    
    // Store deep cloned objects in cache
    cache.set(cacheKey, deepClone(config));
    console.log(`   Cache stored: ${cache.size} items`);
    
    // Retrieve and verify
    const cached = cache.get(cacheKey);
    console.log(`   Cache retrieval: ${cached !== undefined}`);
    console.log(`   Cache isolation: ${cached !== config}`);
  }
}

// Main execution
async function main() {
  console.log('🔍 Starting Server-side Bun Native Detection...\n');
  
  const detector = new ServerBunDetector();
  
  // Analyze objects
  const results = detector.analyzeServerObjects();
  
  // Generate report
  console.log(detector.generateReport());
  
  // Performance testing
  await detector.performanceTest();
  
  // Practical usage examples
  await detector.demonstratePracticalUsage();
  
  console.log('\n✅ Server-side detection complete!');
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { ServerBunDetector };
