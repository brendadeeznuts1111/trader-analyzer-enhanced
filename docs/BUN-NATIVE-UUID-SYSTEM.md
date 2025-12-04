# Bun Native UUID System

> **Comprehensive UUID system leveraging Bun's native APIs directly for maximum performance.**

## Table of Contents

- [1. Overview](#1-overview)
- [2. Bun Native APIs](#2-bun-native-apis)
  - [2.1 randomUUIDv5](#21-randomuuidv5)
  - [2.2 Bun.randomUUIDv7](#22-bunrandomuuidv7)
  - [2.3 Bun.hash](#23-bunhash)
  - [2.4 Bun.CryptoHasher](#24-buncryptohasher)
  - [2.5 Bun.deepEquals](#25-bundeepequals)
  - [2.6 Bun.nanoseconds](#26-bunnanoseconds)
  - [2.7 Bun.file / Bun.write](#27-bunfile--bunwrite)
  - [2.8 Bun.inspect](#28-buninspect)
  - [2.9 Bun.env](#29-bunenv)
- [3. UUID Versions](#3-uuid-versions)
  - [3.1 UUIDv5 (Deterministic)](#31-uuidv5-deterministic)
  - [3.2 UUIDv7 (Time-Sortable)](#32-uuidv7-time-sortable)
  - [3.3 Comparison](#33-comparison)
- [4. Output Formats](#4-output-formats)
  - [4.1 UUIDv5 Formats](#41-uuidv5-formats)
  - [4.2 UUIDv7 Formats](#42-uuidv7-formats)
- [5. Configuration](#5-configuration)
  - [5.1 UUIDConfigMetadata](#51-uuidconfigmetadata)
  - [5.2 UUIDv5Config Interface](#52-uuidv5config-interface)
  - [5.3 TOML Configuration](#53-toml-configuration)
- [6. Environment Variables](#6-environment-variables)
  - [6.1 LOG_LEVEL](#61-log_level)
- [7. Usage Examples](#7-usage-examples)
  - [7.1 UUIDv5 Generation](#71-uuidv5-generation)
  - [7.2 UUIDv7 Generation](#72-uuidv7-generation)
  - [7.3 Configuration Management](#73-configuration-management)
  - [7.4 Entity IDs](#74-entity-ids)
  - [7.5 Storage](#75-storage)
- [8. Performance](#8-performance)
  - [8.1 Benchmark Results](#81-benchmark-results)
  - [8.2 Format Performance](#82-format-performance)
- [9. API Reference](#9-api-reference)
  - [9.1 UUIDv5Generator](#91-uuidv5generator)
  - [9.2 UUIDv7Generator](#92-uuidv7generator)
  - [9.3 BunUUIDConfig](#93-bunuuidconfig)
- [10. File Structure](#10-file-structure)
- [11. Testing](#11-testing)

---

## 1. Overview

This system provides enterprise-grade UUID generation using **Bun's native APIs directly** - no abstraction layers, no wrappers that add overhead. Every UUID operation goes straight to Bun's optimized C++ implementations.

### 1.1 Key Principles

1. **Direct API Usage**: `import { randomUUIDv5 } from "bun"` - not wrapped
2. **Native Performance**: 2.4M+ UUIDs/sec, 10M+ hashes/sec
3. **Type Safety**: Full TypeScript support with proper overloads
4. **Zero Dependencies**: Only Bun built-ins

---

## 2. Bun Native APIs

### 2.1 randomUUIDv5

**Signature:**
```typescript
function randomUUIDv5(
  name: string | BufferSource,
  namespace: string | BufferSource,
  encoding?: 'base64' | 'base64url' | 'hex' | 'buffer'
): string | Buffer;
```

**Overloads:**
```typescript
// Returns string (default)
randomUUIDv5(name: string | BufferSource, namespace: string | BufferSource): string;

// Returns string with encoding
randomUUIDv5(name: string | BufferSource, namespace: string | BufferSource, encoding: 'base64' | 'base64url' | 'hex'): string;

// Returns Buffer
randomUUIDv5(name: string | BufferSource, namespace: string | BufferSource, encoding: 'buffer'): Buffer;
```

**Usage:**
```typescript
import { randomUUIDv5 } from "bun";

// String output (default)
randomUUIDv5("example.com", "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
// → "a6e4a5e0-f7b4-5c5e-8b1a-1234567890ab"

// Buffer output (16 bytes)
randomUUIDv5("example.com", "6ba7b811-9dad-11d1-80b4-00c04fd430c8", "buffer");
// → <Buffer 16 bytes>

// Base64 output
randomUUIDv5("example.com", "6ba7b811-9dad-11d1-80b4-00c04fd430c8", "base64");
// → "puSl4Pe0XF6LGhI0VniQqw=="
```

**Performance:** 2.4M UUIDs/sec

---

### 2.2 Bun.randomUUIDv7

**Signature:**
```typescript
namespace Bun {
  // String output (default hex)
  function randomUUIDv7(encoding?: 'hex' | 'base64' | 'base64url', timestamp?: number): string;
  
  // Buffer output
  function randomUUIDv7(encoding: 'buffer', timestamp?: number): Buffer;
  
  // Timestamp only (returns hex string)
  function randomUUIDv7(timestamp?: number): string;
}
```

**Usage:**
```typescript
// Default (hex string)
Bun.randomUUIDv7();
// → "019aeb14-17dd-7000-a546-f6b66518d3aa"

// With encoding
Bun.randomUUIDv7("base64");
// → "AZrrFBffcACjP5Vhenee6A=="

Bun.randomUUIDv7("base64url");
// → "AZrrFBffcAGRFaKkeDGM1g"

// Buffer (avoids string conversion overhead)
Bun.randomUUIDv7("buffer");
// → <Buffer 16 bytes>

// With specific timestamp
Bun.randomUUIDv7("hex", Date.now() - 86400000); // 24 hours ago
```

**Performance:** 2M+ UUIDs/sec

---

### 2.3 Bun.hash

**Signature:**
```typescript
namespace Bun {
  function hash(data: string | BufferSource): bigint;
}
```

**Usage:**
```typescript
const hash = Bun.hash("my-data");
// → 1234567890123456789n (bigint)

// Convert to hex string
const hexHash = Bun.hash("my-data").toString(16);
// → "112210f47de98115"
```

**Performance:** 10M+ hashes/sec

---

### 2.4 Bun.CryptoHasher

**Signature:**
```typescript
namespace Bun {
  class CryptoHasher {
    constructor(algorithm: 'sha1' | 'sha256' | 'sha512' | 'md5');
    update(data: string | BufferSource): this;
    digest(encoding: 'hex' | 'base64' | 'buffer'): string | Buffer;
  }
}
```

**Usage:**
```typescript
// SHA-1 (40 hex chars)
const sha1 = new Bun.CryptoHasher("sha1")
  .update("data")
  .digest("hex");

// SHA-256 (64 hex chars)
const sha256 = new Bun.CryptoHasher("sha256")
  .update("data")
  .digest("hex");
```

**Performance:** 1.5M hashes/sec

---

### 2.5 Bun.deepEquals

**Signature:**
```typescript
namespace Bun {
  function deepEquals(a: any, b: any, strict?: boolean): boolean;
}
```

**Usage:**
```typescript
// Loose comparison (ignores undefined)
Bun.deepEquals({ a: 1 }, { a: 1, b: undefined });
// → true

// Strict comparison
Bun.deepEquals({ a: 1 }, { a: 1, b: undefined }, true);
// → false

// Class instances
class Foo { a = 1; }
Bun.deepEquals(new Foo(), { a: 1 });       // → true (loose)
Bun.deepEquals(new Foo(), { a: 1 }, true); // → false (strict)
```

---

### 2.6 Bun.nanoseconds

**Signature:**
```typescript
namespace Bun {
  function nanoseconds(): number;
}
```

**Usage:**
```typescript
const start = Bun.nanoseconds();
// ... operation ...
const end = Bun.nanoseconds();
const durationNs = end - start;
const durationMs = durationNs / 1_000_000;
```

---

### 2.7 Bun.file / Bun.write

**Signature:**
```typescript
namespace Bun {
  function file(path: string): BunFile;
  function write(path: string, data: string | BufferSource): Promise<number>;
}

interface BunFile {
  text(): Promise<string>;
  json(): Promise<any>;
  arrayBuffer(): Promise<ArrayBuffer>;
  exists(): Promise<boolean>;
  stat(): Promise<{ mtime: Date; size: number }>;
}
```

**Usage:**
```typescript
// Read file
const file = Bun.file("./config.toml");
const content = await file.text();

// Write file
await Bun.write("./output.json", JSON.stringify(data));
```

---

### 2.8 Bun.inspect

**Signature:**
```typescript
namespace Bun {
  function inspect(value: any, options?: { colors?: boolean; depth?: number }): string;
}
```

**Usage:**
```typescript
const formatted = Bun.inspect(obj, { colors: true, depth: 2 });
console.log(formatted);
```

---

### 2.9 Bun.env

**Signature:**
```typescript
namespace Bun {
  const env: Record<string, string | undefined>;
}
```

**Usage:**
```typescript
const logLevel = Bun.env.LOG_LEVEL || "info";
const apiKey = Bun.env.API_KEY;
```

---

## 3. UUID Versions

### 3.1 UUIDv5 (Deterministic)

**Characteristics:**
- SHA-1 based hash
- Same input ALWAYS produces same UUID
- Requires namespace + name

**Use Cases:**
- Content-addressable storage
- Deduplication
- Idempotent operations
- Canonical identifiers

```typescript
// Same input = same output (always)
randomUUIDv5("user@example.com", URL_NAMESPACE);
// → "a6e4a5e0-f7b4-5c5e-8b1a-1234567890ab"

randomUUIDv5("user@example.com", URL_NAMESPACE);
// → "a6e4a5e0-f7b4-5c5e-8b1a-1234567890ab" (identical!)
```

---

### 3.2 UUIDv7 (Time-Sortable)

**Characteristics:**
- 48-bit Unix timestamp (milliseconds)
- Random component for uniqueness
- Chronologically sortable
- Each call produces unique UUID

**Use Cases:**
- Database primary keys (B-tree friendly)
- Event logs
- Time-series data
- Audit trails

```typescript
// Each call = unique UUID
Bun.randomUUIDv7();
// → "019aeb14-17dd-7000-a546-f6b66518d3aa"

Bun.randomUUIDv7();
// → "019aeb14-17de-7000-b234-9876543210cd" (different!)
```

---

### 3.3 Comparison

| Feature | UUIDv5 | UUIDv7 |
|---------|--------|--------|
| **Deterministic** | ✅ Yes | ❌ No |
| **Time-sortable** | ❌ No | ✅ Yes |
| **Unique per call** | ❌ No | ✅ Yes |
| **Embedded timestamp** | ❌ No | ✅ Yes (48-bit) |
| **Requires namespace** | ✅ Yes | ❌ No |
| **Use case** | Deduplication | Event logs, DB keys |

---

## 4. Output Formats

### 4.1 UUIDv5 Formats

```typescript
type UUIDFormat = "string" | "buffer" | "hex" | "base64" | "base64url" | "base32" | "binary";
```

| Format | Example | Length | Bun Native |
|--------|---------|--------|------------|
| `string` | `8549740c-ef3f-58b8-b53f-ffffee79a248` | 36 chars | ✅ |
| `buffer` | `<Buffer 85 49 74 0c ...>` | 16 bytes | ✅ |
| `hex` | `8549740c-ef3f-58b8-b53f-ffffee79a248` | 36 chars | ✅ |
| `base64` | `hUl0DO8/WLi1P///7nmiSA==` | 24 chars | ✅ |
| `base64url` | `hUl0DO8_WLi1P___7nmiSA` | 22 chars | Custom |
| `base32` | `QVEXIDHPH5MLRNJ7777646NCJA` | 26 chars | Custom |
| `binary` | `10000101010010010111...` | 128 bits | Custom |

---

### 4.2 UUIDv7 Formats

```typescript
type UUIDv7Format = "hex" | "base64" | "base64url" | "buffer";
```

| Format | Example | Bun Native |
|--------|---------|------------|
| `hex` | `019aeb14-17dd-7000-a546-f6b66518d3aa` | ✅ |
| `base64` | `AZrrFBffcACjP5Vhenee6A==` | ✅ |
| `base64url` | `AZrrFBffcAGRFaKkeDGM1g` | ✅ |
| `buffer` | `<Buffer 16 bytes>` | ✅ |

---

## 5. Configuration

### 5.1 UUIDConfigMetadata

```typescript
interface UUIDConfigMetadata {
  created: string;      // ISO timestamp
  modified: string;     // ISO timestamp
  version: string;      // Semantic version
  hash?: string;        // Bun.hash() integrity check
  uuid?: string;        // UUIDv7 config identifier
}
```

---

### 5.2 UUIDv5Config Interface

```typescript
interface UUIDv5Config {
  metadata: UUIDConfigMetadata;
  
  namespaces: {
    dns: string;        // RFC 4122
    url: string;        // RFC 4122
    oid: string;        // RFC 4122
    x500: string;       // RFC 4122
    vault: string;      // Custom
    sports: string;     // Custom
    arbitrage: string;  // Custom
    polymarket: string; // Custom
    altcoins: string;   // Custom
  };
  
  storage: {
    keyFormat: 'string' | 'buffer' | 'hex' | 'base64';
    compression: boolean;
    maxStorageSize: number;
    autoCleanup: boolean;
  };
  
  performance: {
    enableBenchmarking: boolean;
    benchmarkIterations: number;
    cacheSize: number;
  };
  
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

---

### 5.3 TOML Configuration

```toml
# config/uuid.toml

[namespaces]
dns = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
url = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

[storage]
keyFormat = "buffer"
compression = false
maxStorageSize = 104857600

[monitoring]
logLevel = "info"
```

---

## 6. Environment Variables

### 6.1 LOG_LEVEL

**Description:** Controls logging verbosity during initialization.

**Values:** `debug` | `info` | `warn` | `error`

**Default:** `info`

**Usage:**
```bash
# Default (info) - minimal output
bun run src/index.ts

# Debug mode - shows config details
LOG_LEVEL=debug bun run src/index.ts
```

**Output with debug:**
```
[BunUUIDConfig] Logging level set to: debug
[BunUUIDConfig] Config UUID: 019aeb1d-9712-7000-a8d7-6c29f5c04a6e
```

**Implementation:**
```typescript
// Uses Bun.env for environment variable access
const logLevel = Bun.env.LOG_LEVEL || 'info';
this.config.monitoring.logLevel = logLevel;

if (logLevel === 'debug') {
  console.log(`[BunUUIDConfig] Logging level set to: ${logLevel}`);
  console.log(`[BunUUIDConfig] Config UUID: ${this.config.metadata.uuid}`);
}
```

---

## 7. Usage Examples

### 7.1 UUIDv5 Generation

```typescript
import { uuidv5, generateVaultUUID } from './src';

// Generator class
const uuid = uuidv5.generateForVault('my-vault');

// Convenience function
const vaultId = generateVaultUUID('my-vault', 'buffer');

// All formats
uuidv5.generateForVault('test', 'string');
uuidv5.generateForVault('test', 'buffer');
uuidv5.generateForVault('test', 'base64url');
uuidv5.generateForVault('test', 'base32');
```

---

### 7.2 UUIDv7 Generation

```typescript
import { uuidv7, generateTimeOrderedId } from './src';

// Current time
const eventId = uuidv7.generate('hex');

// Specific timestamp
const pastId = uuidv7.generateAt(Date.now() - 86400000);

// Extract timestamp
const timestamp = uuidv7.extractTimestamp(eventId);

// Sort chronologically
const sorted = uuidv7.sort([uuid1, uuid2, uuid3], 'asc');
```

---

### 7.3 Configuration Management

```typescript
import { uuidConfig } from './src';

// Get config
const config = uuidConfig.getConfig();

// Generate UUIDs
const uuid = uuidConfig.generateUUID('hex');
const buffer = uuidConfig.generateUUIDBuffer();

// Inspect
console.log(uuidConfig.inspect());
```

---

### 7.4 Entity IDs

```typescript
import { entityIds, VaultEntity } from './src';

const vaultId = entityIds.generateVaultId('My Vault');
const vault = new VaultEntity('Trading Vault', { balance: 10000 });
```

---

### 7.5 Storage

```typescript
import { vaultStorage } from './src';

const id = vaultStorage.set({ name: 'Vault', balance: 10000 }, 'key');
const data = vaultStorage.get(id);
const stats = vaultStorage.getStats();
```

---

## 8. Performance

### 8.1 Benchmark Results

```
📊 Overall Performance:
   Total time: 4.07ms
   Average: 407.78ns per UUID
   Throughput: 2,452,283 UUIDs/sec

✅ Validation Tests:
   Deterministic: ✓ PASS
   Format consistency: ✓ PASS
   UUID validity: ✓ PASS
```

---

### 8.2 Format Performance

| Format | Avg Time | Throughput |
|--------|----------|------------|
| `base64` | 295ns | 3,388,394/sec |
| `buffer` | 491ns | 2,036,829/sec |
| `string` | 677ns | 1,477,740/sec |
| `hex` | 716ns | 1,396,080/sec |
| `base32` | 1,797ns | 556,495/sec |
| `base64url` | 7,598ns | 131,612/sec |
| `binary` | 7,501ns | 133,307/sec |

---

## 9. API Reference

### 9.1 UUIDv5Generator

```typescript
class UUIDv5Generator {
  generateForVault(name: string, format?: UUIDFormat): string | Buffer;
  generateForSportsMarket(id: string, format?: UUIDFormat): string | Buffer;
  generateForNBAGame(id: string, format?: UUIDFormat): string | Buffer;
  generateForArbitrage(id: string, format?: UUIDFormat): string | Buffer;
  generateFromFields(fields: Record<string, any>, namespace?: string, format?: UUIDFormat): string | Buffer;
  parseUUID(uuid: string | Buffer): { bytes: Buffer; hex: string; base64: string; string: string };
  isValidUUIDv5(uuid: string | Buffer): boolean;
}

export const uuidv5: UUIDv5Generator;
```

---

### 9.2 UUIDv7Generator

```typescript
class UUIDv7Generator {
  generate(format?: UUIDv7Format, timestamp?: number): string | Buffer;
  generateAt(timestamp: number, format?: UUIDv7Format): string | Buffer;
  extractTimestamp(uuid: string | Buffer): number;
  isUUIDv7(uuid: string | Buffer): boolean;
  compare(a: string | Buffer, b: string | Buffer): -1 | 0 | 1;
  sort(uuids: (string | Buffer)[], order?: 'asc' | 'desc'): (string | Buffer)[];
}

export const uuidv7: UUIDv7Generator;
```

---

### 9.3 BunUUIDConfig

```typescript
class BunUUIDConfig {
  static getInstance(configPath?: string, autoReload?: boolean): BunUUIDConfig;
  
  getConfig(): Readonly<UUIDv5Config>;
  updateConfig(updates: Partial<UUIDv5Config>): void;
  
  generateUUID(encoding?: 'hex' | 'base64' | 'base64url', timestamp?: number): string;
  generateUUIDBuffer(timestamp?: number): Buffer;
  regenerateConfigUUID(): string;
  computeConfigHash(): string;
  
  inspect(): string;
  destroy(): void;
}

export const uuidConfig: BunUUIDConfig;
```

---

## 10. File Structure

```
src/
├── utils/
│   ├── uuid-v5.ts          # UUIDv5Generator & UUIDv7Generator
│   ├── uuid-config.ts      # BunUUIDConfig
│   └── time-control.ts     # Time control utilities
├── core/
│   └── entity-ids.ts       # Entity ID generation
├── database/
│   └── uuid-storage.ts     # UUID-keyed storage
├── api/
│   └── uuid-enhanced-api.ts
└── index.ts

tests/
├── bun-native-apis.test.ts
└── uuid-system/

config/
└── uuid.toml

examples/
├── uuid-v5-usage.ts
├── uuid-config-usage.ts
└── time-control-usage.ts
```

---

## 11. Testing

```bash
# Native API tests (30 tests)
bun test tests/bun-native-apis.test.ts

# UUID system tests
bun test tests/uuid-system/

# Benchmark
bun -e "import { benchmarkUUIDv5 } from './src'; await benchmarkUUIDv5(10000);"
```

---

## License

MIT
