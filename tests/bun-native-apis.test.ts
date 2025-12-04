/**
 * Performance & Regression Tests for Bun Native API Usage
 * Ensures we're using Bun APIs directly without abstraction overhead
 * 
 * @see https://bun.sh/docs/api
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { randomUUIDv5 } from 'bun';

// Direct Bun API imports - NO abstraction layers
const DIRECT_BUN_APIS = {
  // Hashing - Direct Bun.hash usage
  hash: Bun.hash,
  cryptoHasher: Bun.CryptoHasher,
  
  // UUID - Direct randomUUIDv5 from bun
  randomUUIDv5,
  
  // File I/O - Direct Bun.file and Bun.write
  file: Bun.file,
  write: Bun.write,
  
  // System - Direct Bun globals
  version: Bun.version,
  revision: Bun.revision,
  
  // Performance - Direct Bun.nanoseconds
  nanoseconds: Bun.nanoseconds,
  
  // Sleep - Direct Bun.sleep
  sleep: Bun.sleep,
  sleepSync: Bun.sleepSync,
};

// Test namespaces (RFC 4122)
const TEST_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('Bun Native API Direct Usage Verification', () => {
  
  describe('UUID Generation - Direct randomUUIDv5', () => {
    test('randomUUIDv5 is imported directly from bun module', () => {
      // Verify we're using the native function
      expect(typeof randomUUIDv5).toBe('function');
      expect(randomUUIDv5.name).toBe('randomUUIDv5');
    });

    test('Direct randomUUIDv5 call - string format', () => {
      const uuid = randomUUIDv5('test-name', TEST_NAMESPACE);
      
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('Direct randomUUIDv5 call - buffer format', () => {
      const buffer = randomUUIDv5('test-name', TEST_NAMESPACE, 'buffer');
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16);
    });

    test('Direct randomUUIDv5 call - hex format', () => {
      const hex = randomUUIDv5('test-name', TEST_NAMESPACE, 'hex');
      
      expect(typeof hex).toBe('string');
      // Bun's hex format still returns UUID string format (36 chars with dashes)
      expect(hex.length).toBe(36);
      expect(hex).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('Deterministic output - same input = same UUID', () => {
      const uuid1 = randomUUIDv5('deterministic-test', TEST_NAMESPACE);
      const uuid2 = randomUUIDv5('deterministic-test', TEST_NAMESPACE);
      
      expect(uuid1).toBe(uuid2);
    });
  });

  describe('Hashing - Direct Bun.hash', () => {
    test('Bun.hash is native function', () => {
      expect(typeof Bun.hash).toBe('function');
    });

    test('Direct Bun.hash call', () => {
      const hash = Bun.hash('test-data');
      
      expect(typeof hash).toBe('bigint');
    });

    test('Bun.hash with toString(16) for hex', () => {
      const hash = Bun.hash('test-data').toString(16);
      
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe('Crypto Hasher - Direct Bun.CryptoHasher', () => {
    test('Bun.CryptoHasher is native class', () => {
      expect(typeof Bun.CryptoHasher).toBe('function');
    });

    test('Direct SHA-1 hashing', () => {
      const hasher = new Bun.CryptoHasher('sha1');
      hasher.update('test-data');
      const digest = hasher.digest('hex');
      
      expect(typeof digest).toBe('string');
      expect(digest.length).toBe(40); // SHA-1 = 40 hex chars
    });

    test('Direct SHA-256 hashing', () => {
      const hasher = new Bun.CryptoHasher('sha256');
      hasher.update('test-data');
      const digest = hasher.digest('hex');
      
      expect(typeof digest).toBe('string');
      expect(digest.length).toBe(64); // SHA-256 = 64 hex chars
    });
  });

  describe('File I/O - Direct Bun.file and Bun.write', () => {
    const testFilePath = '/tmp/bun-native-test.txt';
    const testContent = 'Bun native API test content';

    test('Bun.file is native function', () => {
      expect(typeof Bun.file).toBe('function');
    });

    test('Bun.write is native function', () => {
      expect(typeof Bun.write).toBe('function');
    });

    test('Direct Bun.write and Bun.file usage', async () => {
      // Direct write
      await Bun.write(testFilePath, testContent);
      
      // Direct read
      const file = Bun.file(testFilePath);
      const content = await file.text();
      
      expect(content).toBe(testContent);
    });

    afterAll(async () => {
      // Cleanup
      try {
        const { unlink } = await import('fs/promises');
        await unlink(testFilePath);
      } catch {}
    });
  });

  describe('System Info - Direct Bun Globals', () => {
    test('Bun.version is string', () => {
      expect(typeof Bun.version).toBe('string');
      expect(Bun.version.length).toBeGreaterThan(0);
    });

    test('Bun.revision is string', () => {
      expect(typeof Bun.revision).toBe('string');
    });

    test('Bun.nanoseconds is function', () => {
      expect(typeof Bun.nanoseconds).toBe('function');
      
      const ns = Bun.nanoseconds();
      // Bun.nanoseconds() returns number, not bigint
      expect(typeof ns).toBe('number');
      expect(ns).toBeGreaterThan(0);
    });
  });
});

describe('Performance Regression Tests - Native API Speed', () => {
  const ITERATIONS = 10000;
  const MAX_TIME_MS = 100; // Should complete in under 100ms

  test(`UUID generation: ${ITERATIONS} UUIDs under ${MAX_TIME_MS}ms`, () => {
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < ITERATIONS; i++) {
      randomUUIDv5(`perf-test-${i}`, TEST_NAMESPACE);
    }
    
    const end = Bun.nanoseconds();
    const durationMs = Number(end - start) / 1_000_000;
    
    console.log(`UUID generation: ${ITERATIONS} in ${durationMs.toFixed(2)}ms (${Math.round(ITERATIONS / (durationMs / 1000))}/sec)`);
    
    expect(durationMs).toBeLessThan(MAX_TIME_MS);
  });

  test(`Bun.hash: ${ITERATIONS} hashes under ${MAX_TIME_MS}ms`, () => {
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < ITERATIONS; i++) {
      Bun.hash(`hash-test-${i}`);
    }
    
    const end = Bun.nanoseconds();
    const durationMs = Number(end - start) / 1_000_000;
    
    console.log(`Bun.hash: ${ITERATIONS} in ${durationMs.toFixed(2)}ms (${Math.round(ITERATIONS / (durationMs / 1000))}/sec)`);
    
    expect(durationMs).toBeLessThan(MAX_TIME_MS);
  });

  test(`CryptoHasher SHA-1: ${ITERATIONS} hashes under ${MAX_TIME_MS * 2}ms`, () => {
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < ITERATIONS; i++) {
      new Bun.CryptoHasher('sha1').update(`crypto-test-${i}`).digest('hex');
    }
    
    const end = Bun.nanoseconds();
    const durationMs = Number(end - start) / 1_000_000;
    
    console.log(`CryptoHasher SHA-1: ${ITERATIONS} in ${durationMs.toFixed(2)}ms (${Math.round(ITERATIONS / (durationMs / 1000))}/sec)`);
    
    expect(durationMs).toBeLessThan(MAX_TIME_MS * 2);
  });

  test('Buffer and string formats have comparable performance', () => {
    const bufferStart = Bun.nanoseconds();
    for (let i = 0; i < ITERATIONS; i++) {
      randomUUIDv5(`buffer-test-${i}`, TEST_NAMESPACE, 'buffer');
    }
    const bufferEnd = Bun.nanoseconds();
    const bufferMs = (bufferEnd - bufferStart) / 1_000_000;

    const stringStart = Bun.nanoseconds();
    for (let i = 0; i < ITERATIONS; i++) {
      randomUUIDv5(`string-test-${i}`, TEST_NAMESPACE);
    }
    const stringEnd = Bun.nanoseconds();
    const stringMs = (stringEnd - stringStart) / 1_000_000;

    console.log(`Buffer format: ${bufferMs.toFixed(2)}ms, String format: ${stringMs.toFixed(2)}ms`);
    
    // Both formats should complete quickly - Bun optimizes both paths
    expect(bufferMs).toBeLessThan(MAX_TIME_MS);
    expect(stringMs).toBeLessThan(MAX_TIME_MS);
  });
});

describe('No Abstraction Layer Verification', () => {
  test('Our uuid-v5.ts uses direct randomUUIDv5 import', async () => {
    const file = Bun.file('./src/utils/uuid-v5.ts');
    const content = await file.text();
    
    // Verify direct import from bun
    expect(content).toContain('import { randomUUIDv5 } from "bun"');
    
    // Verify no wrapper functions that add overhead
    expect(content).not.toContain('function wrapRandomUUIDv5');
    expect(content).not.toContain('const wrappedUUID');
  });

  test('Our uuid-storage.ts uses direct randomUUIDv5 import', async () => {
    const file = Bun.file('./src/database/uuid-storage.ts');
    const content = await file.text();
    
    // Verify direct import from bun
    expect(content).toContain('import { randomUUIDv5 } from "bun"');
  });

  test('Our uuid-config.ts uses direct Bun.CryptoHasher', async () => {
    const file = Bun.file('./src/utils/uuid-config.ts');
    const content = await file.text();
    
    // Verify direct Bun API usage
    expect(content).toContain('new Bun.CryptoHasher');
    expect(content).toContain('Bun.version');
    expect(content).toContain('Bun.revision');
    expect(content).toContain('Bun.file');
    expect(content).toContain('Bun.write');
  });

  test('Direct Bun.hash usage in storage (not abstracted)', async () => {
    const file = Bun.file('./src/database/uuid-storage.ts');
    const content = await file.text();
    
    // Verify direct Bun.hash usage
    expect(content).toContain('Bun.hash(');
    expect(content).toContain('.toString(16)');
  });
});

describe('Memory Efficiency - Native Buffer Usage', () => {
  test('Buffer format uses less memory than string', () => {
    const bufferUUID = randomUUIDv5('memory-test', TEST_NAMESPACE, 'buffer');
    const stringUUID = randomUUIDv5('memory-test', TEST_NAMESPACE);
    
    // Buffer is 16 bytes, string is 36 chars (with dashes)
    expect(bufferUUID.length).toBe(16);
    expect(stringUUID.length).toBe(36);
    
    // Buffer is more memory efficient
    expect(bufferUUID.length).toBeLessThan(stringUUID.length);
  });

  test('Hex format returns standard UUID string (36 chars with dashes)', () => {
    const hexUUID = randomUUIDv5('hex-test', TEST_NAMESPACE, 'hex');
    
    // Bun's hex format returns standard UUID string format
    expect(hexUUID.length).toBe(36);
    expect(hexUUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('Regression: API Consistency', () => {
  test('randomUUIDv5 signature matches Bun docs', () => {
    // Test all documented overloads
    
    // (name, namespace) -> string
    const str = randomUUIDv5('test', TEST_NAMESPACE);
    expect(typeof str).toBe('string');
    
    // (name, namespace, 'buffer') -> Buffer
    const buf = randomUUIDv5('test', TEST_NAMESPACE, 'buffer');
    expect(buf).toBeInstanceOf(Buffer);
    
    // (name, namespace, 'hex') -> string (UUID format)
    const hex = randomUUIDv5('test', TEST_NAMESPACE, 'hex');
    expect(typeof hex).toBe('string');
    expect(hex.length).toBe(36); // Standard UUID format with dashes
    
    // (name, namespace, 'base64') -> string
    const b64 = randomUUIDv5('test', TEST_NAMESPACE, 'base64');
    expect(typeof b64).toBe('string');
  });

  test('Bun.hash returns bigint', () => {
    const result = Bun.hash('test');
    expect(typeof result).toBe('bigint');
  });

  test('Bun.CryptoHasher supports expected algorithms', () => {
    const algorithms = ['sha1', 'sha256', 'sha512', 'md5'] as const;
    
    for (const algo of algorithms) {
      const hasher = new Bun.CryptoHasher(algo);
      hasher.update('test');
      const digest = hasher.digest('hex');
      expect(typeof digest).toBe('string');
    }
  });
});
