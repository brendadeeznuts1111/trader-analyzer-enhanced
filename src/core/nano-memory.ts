/**
 * Memory-efficient structures for high-frequency trading
 */

// Fixed-size ring buffer for price history
export class RingBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;
  
  constructor(private capacity: number) {
    this.buffer = new Array<T>(capacity);
  }
  
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.size === this.capacity) {
      this.tail = (this.tail + 1) % this.capacity;
    } else {
      this.size++;
    }
  }
  
  get(index: number): T | undefined {
    if (index >= this.size) return undefined;
    const actualIndex = (this.tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }
  
  get latest(): T | undefined {
    if (this.size === 0) return undefined;
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
  
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
  
  get length(): number {
    return this.size;
  }
}

// Memory-pool for frequent object creation
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  
  constructor(createFn: () => T, initialSize: number = 100) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  release(obj: T): void {
    this.pool.push(obj);
  }
}

// Memory-efficient market data structure
export interface CompactMarket {
  id: number; // 4 bytes
  price: number; // 8 bytes
  volume: number; // 8 bytes
  timestamp: number; // 8 bytes
  status: number; // 1 byte
} // Total: 29 bytes per market

// Instead of objects, use TypedArrays for bulk operations
export class CompactMarketArray {
  private ids = new Uint32Array(10000);
  private prices = new Float64Array(10000);
  private volumes = new Float64Array(10000);
  private timestamps = new Float64Array(10000);
  private status = new Uint8Array(10000);
  private count = 0;
  
  add(market: CompactMarket): void {
    const index = this.count;
    this.ids[index] = market.id;
    this.prices[index] = market.price;
    this.volumes[index] = market.volume;
    this.timestamps[index] = market.timestamp;
    this.status[index] = market.status;
    this.count++;
  }
  
  get(index: number): CompactMarket | undefined {
    if (index >= this.count) return undefined;
    
    return {
      id: this.ids[index],
      price: this.prices[index],
      volume: this.volumes[index],
      timestamp: this.timestamps[index],
      status: this.status[index]
    };
  }
  
  // Batch update prices
  updatePrices(newPrices: Float64Array): void {
    for (let i = 0; i < Math.min(this.count, newPrices.length); i++) {
      this.prices[i] = newPrices[i];
      this.timestamps[i] = Date.now();
    }
  }
  
  clear(): void {
    this.count = 0;
  }
}
