/**
 * High-performance storage using UUIDv5 as keys
 */

import { randomUUIDv5 } from "bun";
import { uuidv5, UUIDv5Generator } from '../utils/uuid-v5';
import { entityIds, EntityIdGenerator } from '../core/entity-ids';

interface StorageEntry<T = any> {
  id: string;
  key: Buffer; // UUIDv5 as Buffer for fast lookups
  data: T;
  createdAt: number;
  updatedAt: number;
  version: number;
  metadata: {
    namespace: string;
    type: string;
    hash: string;
  };
}

export class UUIDv5Storage<T = any> {
  private data = new Map<string, StorageEntry<T>>();
  private keyIndex = new Map<string, string>(); // Buffer hex -> ID
  private typeIndex = new Map<string, Set<string>>();
  private namespaceIndex = new Map<string, Set<string>>();

  constructor(
    private namespace: string,
    private keyFormat: 'buffer' | 'hex' | 'base64' = 'buffer'
  ) {}

  /**
   * Store data with UUIDv5 key
   */
  set(data: T, name: string): string {
    // Generate UUIDv5 key
    let key: Buffer | string;

    if (this.keyFormat === 'buffer') {
      key = randomUUIDv5(name, this.namespace, 'buffer');
    } else if (this.keyFormat === 'hex') {
      key = randomUUIDv5(name, this.namespace, 'hex');
    } else if (this.keyFormat === 'base64') {
      key = randomUUIDv5(name, this.namespace, 'base64');
    } else {
      key = randomUUIDv5(name, this.namespace); // string format
    }

    const keyHex = typeof key === 'string' ? Buffer.from(key, 'hex').toString('hex') : key.toString('hex');

    // Generate ID from key
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const id = uuidv5.parseUUID(keyBuffer).string;

    const entry: StorageEntry<T> = {
      id,
      key: keyBuffer,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      metadata: {
        namespace: this.namespace,
        type: data !== null && typeof data === 'object' ? data.constructor.name : typeof data,
        hash: Bun.hash(JSON.stringify(data)).toString(16)
      }
    };

    // Store in primary index
    this.data.set(id, entry);

    // Update secondary indexes
    this.keyIndex.set(keyHex, id);

    const type = entry.metadata.type;
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(id);

    if (!this.namespaceIndex.has(this.namespace)) {
      this.namespaceIndex.set(this.namespace, new Set());
    }
    this.namespaceIndex.get(this.namespace)!.add(id);

    return id;
  }

  /**
   * Get data by ID
   */
  get(id: string): T | null {
    const entry = this.data.get(id);
    return entry ? entry.data : null;
  }

  /**
   * Get data by UUIDv5 key
   */
  getByKey(key: Buffer | string): T | null {
    const keyHex = typeof key === 'string' ? key : key.toString('hex');
    const id = this.keyIndex.get(keyHex);
    return id ? this.get(id) : null;
  }

  /**
   * Update data
   */
  update(id: string, updater: (data: T) => T): boolean {
    const entry = this.data.get(id);
    if (!entry) return false;

    entry.data = updater(entry.data);
    entry.updatedAt = Date.now();
    entry.version++;
    entry.metadata.hash = Bun.hash(JSON.stringify(entry.data)).toString(16);

    return true;
  }

  /**
   * Delete data
   */
  delete(id: string): boolean {
    const entry = this.data.get(id);
    if (!entry) return false;

    // Remove from primary index
    this.data.delete(id);

    // Remove from secondary indexes
    this.keyIndex.delete(entry.key.toString('hex'));

    const type = entry.metadata.type;
    const typeSet = this.typeIndex.get(type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) {
        this.typeIndex.delete(type);
      }
    }

    const namespaceSet = this.namespaceIndex.get(this.namespace);
    if (namespaceSet) {
      namespaceSet.delete(id);
      if (namespaceSet.size === 0) {
        this.namespaceIndex.delete(this.namespace);
      }
    }

    return true;
  }

  /**
   * Find by metadata
   */
  findByType(type: string): T[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(Boolean) as T[];
  }

  /**
   * Find by namespace
   */
  findByNamespace(namespace: string): T[] {
    const ids = this.namespaceIndex.get(namespace);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.get(id))
      .filter(Boolean) as T[];
  }

  /**
   * Check if key exists
   */
  hasKey(key: Buffer | string): boolean {
    const keyHex = typeof key === 'string' ? key : key.toString('hex');
    return this.keyIndex.has(keyHex);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byNamespace: Record<string, number>;
    storageSize: number;
  } {
    const byType: Record<string, number> = {};
    const byNamespace: Record<string, number> = {};

    this.typeIndex.forEach((set, type) => {
      byType[type] = set.size;
    });

    this.namespaceIndex.forEach((set, namespace) => {
      byNamespace[namespace] = set.size;
    });

    // Estimate storage size
    let storageSize = 0;
    this.data.forEach(entry => {
      storageSize += JSON.stringify(entry).length;
    });

    return {
      total: this.data.size,
      byType,
      byNamespace,
      storageSize
    };
  }

  /**
   * Export to JSON
   */
  export(): Array<{ id: string; key: string; data: T }> {
    return Array.from(this.data.values()).map(entry => ({
      id: entry.id,
      key: entry.key.toString('hex'),
      data: entry.data
    }));
  }

  /**
   * Import from JSON
   */
  import(data: Array<{ id: string; key: string; data: T }>): void {
    data.forEach(item => {
      const key = Buffer.from(item.key, 'hex');
      const entry: StorageEntry<T> = {
        id: item.id,
        key,
        data: item.data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        metadata: {
          namespace: this.namespace,
          type: item.data !== null && typeof item.data === 'object' ? item.data.constructor.name : typeof item.data,
          hash: Bun.hash(JSON.stringify(item.data)).toString(16)
        }
      };

      this.data.set(item.id, entry);
      this.keyIndex.set(item.key, item.id);

      const type = entry.metadata.type;
      if (!this.typeIndex.has(type)) {
        this.typeIndex.set(type, new Set());
      }
      this.typeIndex.get(type)!.add(item.id);

      if (!this.namespaceIndex.has(this.namespace)) {
        this.namespaceIndex.set(this.namespace, new Set());
      }
      this.namespaceIndex.get(this.namespace)!.add(item.id);
    });
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
    this.keyIndex.clear();
    this.typeIndex.clear();
    this.namespaceIndex.clear();
  }
}

// Specialized storage implementations
export class VaultStorage extends UUIDv5Storage {
  constructor() {
    super('vault-optimizer', 'buffer');
  }

  storeVault(vaultData: any): string {
    const vaultName = vaultData.name || `vault-${Date.now()}`;
    return this.set(vaultData, vaultName);
  }
}

export class SportsMarketStorage extends UUIDv5Storage {
  constructor() {
    super('sports-market', 'buffer');
  }

  storeMarket(sport: string, event: string, marketData: any): string {
    const marketKey = `${sport}:${event}:${marketData.type || 'default'}`;
    return this.set(marketData, marketKey);
  }
}

export class ArbitrageStorage extends UUIDv5Storage {
  constructor() {
    super('arbitrage', 'buffer');
  }

  storeOpportunity(
    asset: string,
    buyExchange: string,
    sellExchange: string,
    opportunityData: any
  ): string {
    const opportunityKey = `${asset}:${buyExchange}:${sellExchange}:${Date.now()}`;
    return this.set(opportunityData, opportunityKey);
  }
}

// Singleton instances
export const vaultStorage = new VaultStorage();
export const sportsMarketStorage = new SportsMarketStorage();
export const arbitrageStorage = new ArbitrageStorage();
