# Bun Native UUID System

> **Comprehensive UUID system leveraging Bun's native APIs directly for maximum performance.**

## Table of Contents

- [Overview](#overview)
- [Bun Native APIs Used](#bun-native-apis-used)
- [UUIDv5 vs UUIDv7](#uuidv5-vs-uuidv7)
- [Output Formats](#output-formats)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [Performance Benchmarks](#performance-benchmarks)
- [API Reference](#api-reference)

---

## Overview

This system provides enterprise-grade UUID generation using **Bun's native APIs directly** - no abstraction layers, no wrappers that add overhead. Every UUID operation goes straight to Bun's optimized C++ implementations.

### Key Principles

1. **Direct API Usage**: `import { randomUUIDv5 } from "bun"` - not wrapped
2. **Native Performance**: 2.4M+ UUIDs/sec, 10M+ hashes/sec
3. **Type Safety**: Full TypeScript support with proper overloads
4. **Zero Dependencies**: Only Bun built-ins

---

## Bun Native APIs Used

| API | Purpose | Performance |
|-----|---------|-------------|
| `randomUUIDv5(name, namespace, format)` | Deterministic UUID generation | 2.4M/sec |
| `Bun.randomUUIDv7(encoding, timestamp)` | Time-sortable UUID generation | 2M+/sec |
| `Bun.hash(data)` | Fast non-cryptographic hashing | 10M+/sec |
| `Bun.CryptoHasher` | SHA-1/SHA-256/SHA-512/MD5 | 1.5M/sec |
| `Bun.deepEquals(a, b, strict)` | Deep object comparison | Native speed |
| `Bun.nanoseconds()` | High-precision timing | Nanosecond resolution |
| `Bun.file()` / `Bun.write()` | Native file I/O | Zero-copy when possible |
| `Bun.inspect(obj, options)` | Formatted object output | With colors |
| `Bun.env` | Environment variable access | Direct access |

### Direct Import Pattern

```typescript
// ✅ CORRECT - Direct import from bun
import { randomUUIDv5 } from "bun";

// ✅ CORRECT - Direct Bun global usage
const hash = Bun.hash(data).toString(16);
const uuid7 = Bun.randomUUIDv7("hex");
const equal = Bun.deepEquals(a, b, true);

// ❌ WRONG - Don't wrap native APIs
function myUUIDWrapper(name, ns) {
  return randomUUIDv5(name, ns); // Unnecessary overhead
}
```

---

## UUIDv5 vs UUIDv7

### UUIDv5 - Deterministic (SHA-1 Based)

```typescript
import { randomUUIDv5 } from "bun";

// Same input ALWAYS produces same UUID
randomUUIDv5("user@example.com", "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
// → "a6e4a5e0-f7b4-5c5e-8b1a-1234567890ab" (always this value)

randomUUIDv5("user@example.com", "6ba7b811-9dad-11d1-80b4-00c04fd430c8");
// → "a6e4a5e0-f7b4-5c5e-8b1a-1234567890ab" (same!)
```

**Use Cases:**
- Content-addressable storage
- Deduplication
- Idempotent operations
- Canonical identifiers

### UUIDv7 - Time-Sortable (Random)

```typescript
// Each call produces a UNIQUE UUID
Bun.randomUUIDv7();           // → "019aeb14-17dd-7000-a546-f6b66518d3aa"
Bun.randomUUIDv7();           // → "019aeb14-17de-7000-b234-9876543210cd" (different!)

// With specific timestamp
Bun.randomUUIDv7("hex", Date.now() - 86400000); // 24 hours ago
```

**Use Cases:**
- Database primary keys (B-tree friendly)
- Event logs
- Time-series data
- Audit trails

### Comparison Table

| Feature | UUIDv5 | UUIDv7 |
|---------|--------|--------|
| **Deterministic** | ✅ Yes | ❌ No |
| **Time-sortable** | ❌ No | ✅ Yes |
| **Unique per call** | ❌ No (same input = same UUID) | ✅ Yes |
| **Embedded timestamp** | ❌ No | ✅ Yes (48-bit ms) |
| **Use case** | Deduplication, canonical IDs | Event logs, DB keys |

---

## Output Formats

### UUIDv5 Formats (7 options)

```typescript
type UUIDFormat = "string" | "buffer" | "hex" | "base64" | "base64url" | "base32" | "binary";
```

| Format | Example Output | Length | Bun Native |
|--------|----------------|--------|------------|
| `string` | `8549740c-ef3f-58b8-b53f-ffffee79a248` | 36 chars | ✅ Yes |
| `buffer` | `<Buffer 85 49 74 0c ...>` | 16 bytes | ✅ Yes |
| `hex` | `8549740c-ef3f-58b8-b53f-ffffee79a248` | 36 chars | ✅ Yes |
| `base64` | `hUl0DO8/WLi1P///7nmiSA==` | 24 chars | ✅ Yes |
| `base64url` | `hUl0DO8_WLi1P___7nmiSA` | 22 chars | Custom* |
| `base32` | `QVEXIDHPH5MLRNJ7777646NCJA` | 26 chars | Custom* |
| `binary` | `10000101010010010111...` | 128 bits | Custom* |

*Custom formats use Bun's native buffer output, then convert.

### UUIDv7 Formats (4 options)

```typescript
type UUIDv7Format = "hex" | "base64" | "base64url" | "buffer";
```

| Format | Example Output | Bun Native |
|--------|----------------|------------|
| `hex` | `019aeb14-17dd-7000-a546-f6b66518d3aa` | ✅ Yes |
| `base64` | `AZrrFBffcACjP5Vhenee6A==` | ✅ Yes |
| `base64url` | `AZrrFBffcAGRFaKkeDGM1g` | ✅ Yes |
| `buffer` | `<Buffer 16 bytes>` | ✅ Yes |

---

## Configuration

### UUIDv5Config Interface

```typescript
interface UUIDConfigMetadata {
  created: string;      // ISO timestamp when config was created
  modified: string;     // ISO timestamp of last modification
  version: string;      // Semantic version (e.g., "1.0.0")
  hash?: string;        // Integrity hash using Bun.hash()
  uuid?: string;        // UUIDv7 identifier for this config instance
}

interface UUIDv5Config {
  metadata: UUIDConfigMetadata;
  
  namespaces: {
    dns: string;        // RFC 4122 DNS namespace
    url: string;        // RFC 4122 URL namespace
    oid: string;        // RFC 4122 OID namespace
    x500: string;       // RFC 4122 X.500 namespace
    vault: string;      // Custom: Vault Optimizer
    sports: string;     // Custom: Sports Market
    arbitrage: string;  // Custom: Arbitrage Engine
    polymarket: string; // Custom: Polymarket
    altcoins: string;   // Custom: Altcoins
  };
  
  storage: {
    keyFormat: 'string' | 'buffer' | 'hex' | 'base64';
    compression: boolean;
    maxStorageSize: number;  // bytes
    autoCleanup: boolean;
  };
  
  performance: {
    enableBenchmarking: boolean;
    benchmarkIterations: number;
    cacheSize: number;
  };
  
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;  // ms
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

### TOML Configuration File

```toml
# config/uuid.toml

[namespaces]
dns = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
url = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
vault = "8ba7b810-9dad-11d1-80b4-00c04fd430c8"

[storage]
keyFormat = "buffer"
compression = false
maxStorageSize = 104857600  # 100MB
autoCleanup = true

[performance]
enableBenchmarking = true
benchmarkIterations = 10000
cacheSize = 1000

[monitoring]
enableHealthChecks = true
healthCheckInterval = 30000
logLevel = "info"
```

---

## Environment Variables

The system uses `Bun.env` for runtime configuration:

### LOG_LEVEL

Controls logging verbosity during initialization.

```bash
# Default (info) - minimal output
bun run src/index.ts

# Debug mode - shows config details
LOG_LEVEL=debug bun run src/index.ts
```

**Output with `LOG_LEVEL=debug`:**
```
[BunUUIDConfig] Logging level set to: debug
[BunUUIDConfig] Config UUID: 019aeb1d-9712-7000-a8d7-6c29f5c04a6e
```

### Implementation

```typescript
// In BunUUIDConfig constructor
const logLevel = Bun.env.LOG_LEVEL || 'info';
this.config.monitoring.logLevel = logLevel as 'debug' | 'info' | 'warn' | 'error';

if (logLevel === 'debug') {
  console.log(`[BunUUIDConfig] Logging level set to: ${logLevel}`);
  console.log(`[BunUUIDConfig] Config UUID: ${this.config.metadata.uuid}`);
}
```

---

## Usage Examples

### Basic UUIDv5 Generation

```typescript
import { uuidv5, generateVaultUUID } from './src';

// Using the generator class
const uuid = uuidv5.generateForVault('my-vault-name');
// → "8549740c-ef3f-58b8-b53f-ffffee79a248"

// Using convenience function
const vaultId = generateVaultUUID('my-vault-name', 'buffer');
// → <Buffer 16 bytes>

// Different formats
uuidv5.generateForVault('test', 'string');    // Standard UUID string
uuidv5.generateForVault('test', 'buffer');    // 16-byte Buffer
uuidv5.generateForVault('test', 'base64url'); // URL-safe string
uuidv5.generateForVault('test', 'base32');    // Case-insensitive
```

### UUIDv7 Time-Sortable IDs

```typescript
import { uuidv7, generateTimeOrderedId } from './src';

// Generate current timestamp UUID
const eventId = uuidv7.generate('hex');
// → "019aeb14-17dd-7000-a546-f6b66518d3aa"

// Generate at specific timestamp
const pastId = uuidv7.generateAt(Date.now() - 86400000); // 24h ago

// Extract timestamp from UUID
const timestamp = uuidv7.extractTimestamp(eventId);
const date = new Date(timestamp);
// → 2025-12-04T20:35:53.979Z

// Sort UUIDs chronologically
const sorted = uuidv7.sort([uuid1, uuid2, uuid3], 'asc');

// Check if valid UUIDv7
uuidv7.isUUIDv7(eventId); // → true
```

### Configuration Management

```typescript
import { uuidConfig } from './src';

// Get current config
const config = uuidConfig.getConfig();
console.log(config.metadata.uuid);

// Generate UUIDs via config
const uuid = uuidConfig.generateUUID('hex');        // UUIDv7 string
const buffer = uuidConfig.generateUUIDBuffer();     // UUIDv7 buffer

// Regenerate config UUID
const newUUID = uuidConfig.regenerateConfigUUID();

// Compute integrity hash
const hash = uuidConfig.computeConfigHash();

// Inspect config (formatted with colors)
console.log(uuidConfig.inspect());
```

### Entity ID Generation

```typescript
import { entityIds, VaultEntity } from './src';

// Generate entity IDs
const vaultId = entityIds.generateVaultId('My Vault');
const marketId = entityIds.generateSportsMarketId('NBA', 'Lakers vs Celtics');
const arbId = entityIds.generateArbitrageId('BTC', 'binance', 'coinbase');

// Create entities (auto-generates IDs)
const vault = new VaultEntity('Trading Vault', { balance: 10000 });
console.log(vault.id); // → UUIDv5 based on name
```

### High-Performance Storage

```typescript
import { vaultStorage, sportsMarketStorage } from './src';

// Store with UUID key
const id = vaultStorage.set({ name: 'My Vault', balance: 10000 }, 'vault-key');

// Retrieve
const data = vaultStorage.get(id);

// Query by type
const allVaults = vaultStorage.getByType('Object');

// Get stats
const stats = vaultStorage.getStats();
// → { total: 100, byType: {...}, storageSize: 1024 }
```

---

## Performance Benchmarks

Run the benchmark:

```typescript
import { benchmarkUUIDv5 } from './src';

const results = await benchmarkUUIDv5(10000);
```

### Results (Apple M-series / Intel i9)

```
📊 Overall Performance:
   Total time: 4.07ms
   Average: 407.78ns per UUID
   Throughput: 2,452,283 UUIDs/sec

📈 Format Benchmarks (1,000 iterations each):
   string    : 676.71ns avg, 1,477,740/sec
   buffer    : 490.96ns avg, 2,036,829/sec
   hex       : 716.29ns avg, 1,396,080/sec
   base64    : 295.13ns avg, 3,388,394/sec
   base64url : 7598.08ns avg, 131,612/sec
   base32    : 1796.96ns avg, 556,495/sec
   binary    : 7501.46ns avg, 133,307/sec

✅ Validation Tests (using Bun.deepEquals):
   Deterministic: ✓ PASS
   Format consistency: ✓ PASS
   Parse consistency: ✓ PASS
   UUID validity: ✓ PASS

💾 Memory Efficiency:
   buffer:    16 bytes (most compact)
   base64url: 22 chars
   base32:    26 chars
   string:    36 chars (standard UUID)
```

### Bun.hash Performance

```
Bun.hash: 10,000 in 0.93ms (10,764,263/sec)
```

---

## API Reference

### UUIDv5Generator

```typescript
class UUIDv5Generator {
  generateForVault(name: string, format?: UUIDFormat): string | Buffer;
  generateForSportsMarket(id: string, format?: UUIDFormat): string | Buffer;
  generateForNBAGame(id: string, format?: UUIDFormat): string | Buffer;
  generateForArbitrage(id: string, format?: UUIDFormat): string | Buffer;
  generateFromFields(fields: Record<string, any>, namespace?: string, format?: UUIDFormat): string | Buffer;
  generateBufferUUID(name: string, namespace: string): Buffer;
  generateHexUUID(name: string, namespace: string): string;
  generateBase64UUID(name: string, namespace: string): string;
  parseUUID(uuid: string | Buffer): { bytes: Buffer; hex: string; base64: string; string: string };
  isValidUUIDv5(uuid: string | Buffer): boolean;
}

// Singleton instance
export const uuidv5: UUIDv5Generator;
```

### UUIDv7Generator

```typescript
class UUIDv7Generator {
  generate(format?: UUIDv7Format, timestamp?: number): string | Buffer;
  generateAt(timestamp: number, format?: UUIDv7Format): string | Buffer;
  generateNow(format?: UUIDv7Format): string | Buffer;
  extractTimestamp(uuid: string | Buffer): number;
  isUUIDv7(uuid: string | Buffer): boolean;
  compare(a: string | Buffer, b: string | Buffer): -1 | 0 | 1;
  sort(uuids: (string | Buffer)[], order?: 'asc' | 'desc'): (string | Buffer)[];
}

// Singleton instance
export const uuidv7: UUIDv7Generator;
```

### BunUUIDConfig

```typescript
class BunUUIDConfig {
  static getInstance(configPath?: string, autoReload?: boolean): BunUUIDConfig;
  
  getConfig(): Readonly<UUIDv5Config>;
  updateConfig(updates: Partial<UUIDv5Config>): void;
  
  generateUUID(encoding?: 'hex' | 'base64' | 'base64url', timestamp?: number): string;
  generateUUIDBuffer(timestamp?: number): Buffer;
  regenerateConfigUUID(): string;
  computeConfigHash(): string;
  
  generateUUIDv5(name: string, namespace?: string): string;
  getTimestamp(format?: 'iso' | 'unix' | 'human'): string;
  getEnvironmentInfo(): object;
  
  inspect(): string;
  
  loadFromFile(): Promise<void>;
  saveToFile(): Promise<void>;
  destroy(): void;
}

// Singleton instance
export const uuidConfig: BunUUIDConfig;
```

---

## File Structure

```
src/
├── utils/
│   ├── uuid-v5.ts          # UUIDv5Generator & UUIDv7Generator
│   ├── uuid-config.ts      # BunUUIDConfig with metadata
│   └── time-control.ts     # Deterministic time control
├── core/
│   └── entity-ids.ts       # Entity ID generation
├── database/
│   └── uuid-storage.ts     # High-performance storage
├── api/
│   └── uuid-enhanced-api.ts # REST API endpoints
└── index.ts                # Main exports

tests/
├── bun-native-apis.test.ts # 30 native API tests
└── uuid-system/
    └── time-controlled.test.ts

config/
└── uuid.toml               # TOML configuration

examples/
├── uuid-v5-usage.ts
├── uuid-config-usage.ts
└── time-control-usage.ts
```

---

## Testing

```bash
# Run native API tests (30 tests)
bun test tests/bun-native-apis.test.ts

# Run UUID system tests
bun test tests/uuid-system/

# Run benchmark
bun -e "import { benchmarkUUIDv5 } from './src'; await benchmarkUUIDv5(10000);"
```

---

## License

MIT
