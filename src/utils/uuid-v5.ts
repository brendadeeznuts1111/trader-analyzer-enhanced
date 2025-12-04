/**
 * Enhanced UUIDv5 and UUIDv7 implementation with Bun's native APIs
 * - UUIDv5: Deterministic, SHA-1 based (same input = same UUID)
 * - UUIDv7: Time-sortable, random (unique per call, sortable by time)
 * 
 * @see https://bun.sh/docs/runtime/utils#bun-randomuuidv7
 */

import { randomUUIDv5 } from "bun";

// UUIDv7 format type (subset of UUIDFormat that Bun supports natively)
export type UUIDv7Format = "hex" | "base64" | "base64url" | "buffer";

/**
 * UUIDv7 Generator - Time-sortable UUIDs using Bun's native API
 * 
 * UUIDv7 features:
 * - Time-ordered: UUIDs sort chronologically
 * - Unique: Each call generates a new UUID
 * - High precision: Millisecond timestamp embedded
 * - Database-friendly: Efficient B-tree indexing
 */
export class UUIDv7Generator {
  /**
   * Generate a UUIDv7 with optional timestamp
   * Uses Bun's native randomUUIDv7 directly
   */
  generate(format: "buffer", timestamp?: number): Buffer;
  generate(format?: Exclude<UUIDv7Format, "buffer">, timestamp?: number): string;
  generate(format: UUIDv7Format = "hex", timestamp?: number): string | Buffer {
    if (format === "buffer") {
      return Bun.randomUUIDv7("buffer", timestamp);
    }
    return Bun.randomUUIDv7(format, timestamp);
  }

  /**
   * Generate UUIDv7 at a specific timestamp
   * Useful for testing or backfilling data
   */
  generateAt(timestamp: number, format: UUIDv7Format = "hex"): string | Buffer {
    return this.generate(format as any, timestamp);
  }

  /**
   * Generate UUIDv7 for current time (default behavior)
   */
  generateNow(format: UUIDv7Format = "hex"): string | Buffer {
    return this.generate(format as any);
  }

  /**
   * Extract timestamp from UUIDv7
   * UUIDv7 embeds a 48-bit Unix timestamp in milliseconds
   */
  extractTimestamp(uuid: string | Buffer): number {
    let hex: string;
    
    if (Buffer.isBuffer(uuid)) {
      hex = uuid.toString('hex');
    } else if (uuid.includes('-')) {
      // Standard UUID format with dashes
      hex = uuid.replace(/-/g, '');
    } else {
      hex = uuid;
    }

    // First 48 bits (12 hex chars) contain the timestamp
    const timestampHex = hex.substring(0, 12);
    return parseInt(timestampHex, 16);
  }

  /**
   * Check if a UUID is version 7
   */
  isUUIDv7(uuid: string | Buffer): boolean {
    let hex: string;
    
    if (Buffer.isBuffer(uuid)) {
      hex = uuid.toString('hex');
    } else if (uuid.includes('-')) {
      hex = uuid.replace(/-/g, '');
    } else {
      hex = uuid;
    }

    // Version is in bits 48-51 (13th hex char should be '7')
    const versionChar = hex.charAt(12);
    return versionChar === '7';
  }

  /**
   * Compare two UUIDv7s chronologically
   * Returns: -1 if a < b, 0 if equal, 1 if a > b
   */
  compare(a: string | Buffer, b: string | Buffer): -1 | 0 | 1 {
    const timestampA = this.extractTimestamp(a);
    const timestampB = this.extractTimestamp(b);
    
    if (timestampA < timestampB) return -1;
    if (timestampA > timestampB) return 1;
    return 0;
  }

  /**
   * Sort an array of UUIDv7s chronologically
   */
  sort(uuids: (string | Buffer)[], order: 'asc' | 'desc' = 'asc'): (string | Buffer)[] {
    return [...uuids].sort((a, b) => {
      const result = this.compare(a, b);
      return order === 'asc' ? result : -result;
    });
  }
}

// Singleton instance for UUIDv7
export const uuidv7 = new UUIDv7Generator();

// Convenience functions for UUIDv7
export function generateUUIDv7(format?: UUIDv7Format, timestamp?: number): string | Buffer {
  if (format === "buffer") {
    return uuidv7.generate("buffer", timestamp);
  }
  return uuidv7.generate(format, timestamp);
}

export function generateTimeOrderedId(timestamp?: number): string {
  return uuidv7.generate("hex", timestamp);
}

// Pre-defined namespaces (as per RFC 4122)
export const UUID_NAMESPACES = {
  DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

// Custom namespaces for Vault Optimizer
export const VAULT_NAMESPACES = {
  VAULT_OPTIMIZER: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  SPORTS_MARKET: "d1c8b8e0-3c8e-4e6b-8e7c-1b9d6bcdbbfd",
  ARBITRAGE: "3f8b8e0c-4e6b-8e7c-d1c8-1b9d6bcdbbfd",
  NBA_ANALYTICS: "8e7c1b9d-6bcd-bbfd-4b2d-9b5dab8dfbbd",
  POLYMARKET: "9b5dab8d-fbbd-4b2d-9b5d-ab8dfbbd4bed",
  ALTCOINS: "ab8dfbbd-4bed-4b2d-9b5d-1b9d6bcdbbfd",
} as const;

export type UUIDFormat = "string" | "buffer" | "hex" | "base64" | "base64url" | "base32" | "binary";

// Base32 alphabet (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Convert buffer to base32 string (RFC 4648)
 * Used for case-insensitive, URL-safe identifiers
 */
function bufferToBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Convert buffer to binary string representation
 * Used for low-level debugging and binary protocols
 */
function bufferToBinary(buffer: Buffer): string {
  return Array.from(buffer)
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join('');
}

export interface UUIDv5Options {
  format?: UUIDFormat;
  version?: 5;
}

/**
 * Generate a UUIDv5 with proper namespace handling
 */
export class UUIDv5Generator {
  private namespaceCache = new Map<string, Buffer>();

  constructor() {
    // Pre-cache namespace buffers
    this.cacheNamespaces();
  }

  private cacheNamespaces(): void {
    // Cache standard namespaces
    Object.entries(UUID_NAMESPACES).forEach(([name, uuid]) => {
      const buffer = this.stringToNamespaceBuffer(uuid);
      this.namespaceCache.set(name.toLowerCase(), buffer);
      this.namespaceCache.set(uuid, buffer);
    });

    // Cache custom namespaces
    Object.entries(VAULT_NAMESPACES).forEach(([name, uuid]) => {
      const buffer = this.stringToNamespaceBuffer(uuid);
      this.namespaceCache.set(name.toLowerCase(), buffer);
      this.namespaceCache.set(uuid, buffer);
    });
  }

  /**
   * Core format handler - generates UUID in any supported format
   * Uses Bun's native randomUUIDv5 directly for maximum performance
   */
  private generateWithFormat(name: string, namespace: string, format: UUIDFormat): string | Buffer {
    switch (format) {
      case "string":
        // Bun native - default string format
        return randomUUIDv5(name, namespace);
      
      case "buffer":
        // Bun native - binary buffer format
        return randomUUIDv5(name, namespace, "buffer");
      
      case "hex":
        // Bun native - hex format (returns UUID string)
        return randomUUIDv5(name, namespace, "hex");
      
      case "base64":
        // Bun native - base64 format
        return randomUUIDv5(name, namespace, "base64");
      
      case "base64url":
        // Custom: Convert buffer to URL-safe base64 (no +, /, =)
        const b64Buffer = randomUUIDv5(name, namespace, "buffer");
        return b64Buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      case "base32":
        // Custom: Convert buffer to base32 (RFC 4648)
        const b32Buffer = randomUUIDv5(name, namespace, "buffer");
        return bufferToBase32(b32Buffer);
      
      case "binary":
        // Custom: Convert buffer to binary string (128 bits)
        const binBuffer = randomUUIDv5(name, namespace, "buffer");
        return bufferToBinary(binBuffer);
      
      default:
        // Fallback to string format for unknown formats
        return randomUUIDv5(name, namespace);
    }
  }

  /**
   * Generate UUIDv5 for a vault
   */
  generateForVault(
    vaultName: string,
    format: UUIDFormat = "string"
  ): string | Buffer {
    return this.generateWithFormat(vaultName, VAULT_NAMESPACES.VAULT_OPTIMIZER, format);
  }

  /**
   * Generate UUIDv5 for a sports market
   */
  generateForSportsMarket(
    marketId: string,
    format: UUIDFormat = "string"
  ): string | Buffer {
    return this.generateWithFormat(marketId, VAULT_NAMESPACES.SPORTS_MARKET, format);
  }

  /**
   * Generate UUIDv5 for NBA game
   */
  generateForNBAGame(
    gameId: string,
    format: UUIDFormat = "string"
  ): string | Buffer {
    return this.generateWithFormat(gameId, VAULT_NAMESPACES.NBA_ANALYTICS, format);
  }

  /**
   * Generate UUIDv5 for arbitrage opportunity
   */
  generateForArbitrage(
    opportunityId: string,
    format: UUIDFormat = "string"
  ): string | Buffer {
    return this.generateWithFormat(opportunityId, VAULT_NAMESPACES.ARBITRAGE, format);
  }

  /**
   * Generate deterministic UUIDv5 from multiple fields
   */
  generateFromFields(
    fields: Record<string, any>,
    namespace: string = VAULT_NAMESPACES.VAULT_OPTIMIZER,
    format: UUIDFormat = "string"
  ): string | Buffer {
    // Create deterministic string from fields
    const fieldString = Object.entries(fields)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join('|');

    const hash = this.hashString(fieldString);
    return this.generateWithFormat(hash, namespace, format);
  }

  /**
   * Generate buffer UUID for high-performance storage
   */
  generateBufferUUID(name: string, namespace: string): Buffer {
    return randomUUIDv5(name, namespace, "buffer") as Buffer;
  }

  /**
   * Generate hex UUID for database storage
   */
  generateHexUUID(name: string, namespace: string): string {
    const buffer = this.generateBufferUUID(name, namespace);
    return buffer.toString('hex');
  }

  /**
   * Generate base64 UUID for compact storage
   */
  generateBase64UUID(name: string, namespace: string): string {
    const buffer = this.generateBufferUUID(name, namespace);
    return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Parse UUID from different formats
   */
  parseUUID(uuid: string | Buffer): {
    bytes: Buffer;
    hex: string;
    base64: string;
    string: string;
  } {
    let buffer: Buffer;

    if (typeof uuid === 'string') {
      if (uuid.length === 32) {
        // Hex string
        buffer = Buffer.from(uuid, 'hex');
      } else if (uuid.length === 22) {
        // Base64 URL-safe string
        const base64 = uuid.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (3 * uuid.length) % 4);
        buffer = Buffer.from(base64, 'base64');
      } else {
        // Standard UUID string
        buffer = Buffer.from(uuid.replace(/-/g, ''), 'hex');
      }
    } else {
      buffer = uuid;
    }

    // Convert to hex string
    const hex = buffer.toString('hex');

    // Format as standard UUID string
    const uuidString = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');

    return {
      bytes: buffer,
      hex,
      base64: buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'),
      string: uuidString
    };
  }

  /**
   * Validate UUIDv5
   */
  isValidUUIDv5(uuid: string | Buffer): boolean {
    try {
      const parsed = this.parseUUID(uuid);

      // Check version (bits 4-7 of time_hi_and_version field = 5)
      const versionByte = parsed.bytes[6];
      const version = (versionByte >> 4) & 0x0F;

      // Check variant (bits 6-7 of clock_seq_hi_and_reserved = 2)
      const variantByte = parsed.bytes[8];
      const variant = (variantByte >> 6) & 0x03;

      return version === 5 && variant === 2;
    } catch {
      return false;
    }
  }

  /**
   * Get namespace from UUID
   */
  getNamespace(uuid: string | Buffer): string | null {
    try {
      const parsed = this.parseUUID(uuid);

      // For UUIDv5, the namespace is in the first 16 bytes of the name hash
      // This is a simplified approach - in reality, you need the original name

      return null; // Cannot reliably extract namespace without original name
    } catch {
      return null;
    }
  }

  private stringToNamespaceBuffer(namespace: string): Buffer {
    // Remove dashes and convert to buffer
    const hex = namespace.replace(/-/g, '');
    return Buffer.from(hex, 'hex');
  }

  private hashString(str: string): string {
    // Simple hash for deterministic input
    return Bun.hash(str).toString(16);
  }
}

// Singleton instance
export const uuidv5 = new UUIDv5Generator();

// Example usage functions
export function generateVaultUUID(vaultName: string, format: UUIDFormat = "string"): string | Buffer {
  return uuidv5.generateForVault(vaultName, format);
}

export function generateSportsMarketUUID(marketId: string, format: UUIDFormat = "string"): string | Buffer {
  return uuidv5.generateForSportsMarket(marketId, format);
}

export function generateNBAGameUUID(gameId: string, format: UUIDFormat = "string"): string | Buffer {
  return uuidv5.generateForNBAGame(gameId, format);
}

export function generateArbitrageUUID(opportunityId: string, format: UUIDFormat = "string"): string | Buffer {
  return uuidv5.generateForArbitrage(opportunityId, format);
}

// Test the example from Bun documentation
export async function testExample(): Promise<void> {
  console.log('Testing Bun randomUUIDv5 example...');

  // The example from Bun documentation
  const uuid = randomUUIDv5("www.example.com", "url", "buffer");
  console.log(uuid); // <Buffer 6b a7 b8 11 9d ad 11 d1 80 b4 00 c0 4f d4 30 c8>

  // Parse it
  const parsed = uuidv5.parseUUID(uuid);
  console.log('Parsed UUID:', parsed.string);
  console.log('Is valid UUIDv5?', uuidv5.isValidUUIDv5(uuid));
}

// Performance test
export async function benchmarkUUIDv5(iterations: number = 10000): Promise<{
  totalTime: number;
  avgTimeMs: number;
  uuidsPerSecond: number;
  formatBenchmarks: Record<UUIDFormat, { avgTimeNs: number; opsPerSecond: number }>;
  validationResults: { deterministic: boolean; formatConsistency: boolean };
}> {
  console.log(`\n🚀 Benchmarking UUIDv5 generation (${iterations.toLocaleString()} iterations)...\n`);

  // 1. Overall UUID generation benchmark using Bun.nanoseconds
  const overallStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    randomUUIDv5(`test-${i}`, UUID_NAMESPACES.DNS);
  }
  const overallEnd = Bun.nanoseconds();
  const totalTimeNs = overallEnd - overallStart;
  const totalTimeMs = totalTimeNs / 1_000_000;
  const avgTimeMs = totalTimeMs / iterations;
  const uuidsPerSecond = Math.floor(iterations / (totalTimeMs / 1000));

  console.log(`📊 Overall Performance:`);
  console.log(`   Total time: ${totalTimeMs.toFixed(2)}ms`);
  console.log(`   Average: ${(totalTimeNs / iterations).toFixed(2)}ns per UUID`);
  console.log(`   Throughput: ${uuidsPerSecond.toLocaleString()} UUIDs/sec\n`);

  // 2. Per-format benchmarks
  const formats: UUIDFormat[] = ['string', 'buffer', 'hex', 'base64', 'base64url', 'base32', 'binary'];
  const formatBenchmarks: Record<string, { avgTimeNs: number; opsPerSecond: number }> = {};
  const formatIterations = Math.min(iterations, 1000); // Smaller set for format comparison

  console.log(`📈 Format Benchmarks (${formatIterations.toLocaleString()} iterations each):`);

  for (const format of formats) {
    const start = Bun.nanoseconds();
    for (let i = 0; i < formatIterations; i++) {
      uuidv5.generateForVault(`bench-${i}`, format);
    }
    const end = Bun.nanoseconds();
    const avgTimeNs = (end - start) / formatIterations;
    const opsPerSecond = Math.floor(1_000_000_000 / avgTimeNs);

    formatBenchmarks[format] = { avgTimeNs, opsPerSecond };
    console.log(`   ${format.padEnd(10)}: ${avgTimeNs.toFixed(2)}ns avg, ${opsPerSecond.toLocaleString()}/sec`);
  }

  // 3. Validation using Bun.deepEquals
  console.log(`\n✅ Validation Tests (using Bun.deepEquals):`);

  // Test deterministic behavior - same input = same output
  const uuid1 = uuidv5.generateForVault('deterministic-test', 'string');
  const uuid2 = uuidv5.generateForVault('deterministic-test', 'string');
  const deterministic = uuid1 === uuid2;
  console.log(`   Deterministic: ${deterministic ? '✓ PASS' : '✗ FAIL'} (same input → same UUID)`);

  // Test format consistency - all formats represent the same UUID
  const bufferUUID = uuidv5.generateForVault('consistency-test', 'buffer') as Buffer;
  const stringUUID = uuidv5.generateForVault('consistency-test', 'string') as string;
  const parsedBuffer = uuidv5.parseUUID(bufferUUID);
  const parsedString = uuidv5.parseUUID(stringUUID);
  const formatConsistency = Bun.deepEquals(parsedBuffer, parsedString, true);
  console.log(`   Format consistency: ${formatConsistency ? '✓ PASS' : '✗ FAIL'} (buffer ↔ string)`);

  // Test deep equality of parsed results
  const parsed1 = uuidv5.parseUUID(uuid1);
  const parsed2 = uuidv5.parseUUID(uuid2);
  const parseConsistency = Bun.deepEquals(parsed1, parsed2, true);
  console.log(`   Parse consistency: ${parseConsistency ? '✓ PASS' : '✗ FAIL'} (Bun.deepEquals strict)`);

  // Test UUID validity
  const isValid = uuidv5.isValidUUIDv5(uuid1);
  console.log(`   UUID validity: ${isValid ? '✓ PASS' : '✗ FAIL'} (version=5, variant=2)`);

  // 4. Memory comparison
  console.log(`\n💾 Memory Efficiency:`);
  const memBuffer = (uuidv5.generateForVault('mem-test', 'buffer') as Buffer).length;
  const memString = (uuidv5.generateForVault('mem-test', 'string') as string).length;
  const memBase64url = (uuidv5.generateForVault('mem-test', 'base64url') as string).length;
  const memBase32 = (uuidv5.generateForVault('mem-test', 'base32') as string).length;
  console.log(`   buffer:    ${memBuffer} bytes (most compact)`);
  console.log(`   base64url: ${memBase64url} chars`);
  console.log(`   base32:    ${memBase32} chars`);
  console.log(`   string:    ${memString} chars (standard UUID)`);

  console.log(`\n🎯 Benchmark complete!\n`);

  return {
    totalTime: totalTimeMs,
    avgTimeMs,
    uuidsPerSecond,
    formatBenchmarks: formatBenchmarks as Record<UUIDFormat, { avgTimeNs: number; opsPerSecond: number }>,
    validationResults: { deterministic, formatConsistency }
  };
}
