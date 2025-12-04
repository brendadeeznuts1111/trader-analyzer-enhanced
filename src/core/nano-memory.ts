/**
 * Memory-Efficient Structures for High-Frequency Trading
 * 
 * Optimized data structures for ultra-low latency trading systems
 * targeting 100k+ TPS with minimal garbage collection pressure.
 * 
 * Uses TypedArrays and object pooling for predictable memory behavior
 * and maximum throughput.
 * 
 * @module nano-memory
 * @example
 * const buffer = new RingBuffer<Price>(1000);
 * buffer.push({ timestamp: Date.now(), value: 123.45 });
 * const latest = buffer.latest;
 */

/**
 * Fixed-size ring buffer optimized for price history and tick data
 * 
 * Provides O(1) push and get operations with minimal allocations.
 * When full, overwrites oldest entries automatically.
 * 
 * @template T - Type of items to store
 */
export class RingBuffer<T> {
  private buffer: T[];
  private head = 0;
  private tail = 0;
  private size = 0;
  
  /**
   * Create a new ring buffer
   * @param capacity - Maximum number of items to store
   */
  constructor(private capacity: number) {
    this.buffer = new Array<T>(capacity);
  }
  
  /**
   * Add an item to the buffer
   * 
   * O(1) operation. If buffer is full, overwrites oldest entry.
   * 
   * @param item - Item to add
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.size === this.capacity) {
      this.tail = (this.tail + 1) % this.capacity;
    } else {
      this.size++;
    }
  }
  
  /**
   * Get item at specific index
   * 
   * O(1) operation. Index 0 = oldest, index (size-1) = newest.
   * 
   * @param index - Position from oldest item
   * @returns Item at index or undefined if out of bounds
   */
  get(index: number): T | undefined {
    if (index >= this.size) return undefined;
    const actualIndex = (this.tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }
  
  /**
   * Get the most recently added item
   * 
   * O(1) operation. Preferred for accessing latest data.
   * 
   * @returns Most recent item or undefined if empty
   */
  get latest(): T | undefined {
    if (this.size === 0) return undefined;
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
  
  /**
   * Reset the buffer to empty state
   * 
   * Does not deallocate memory - capacity remains reserved.
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
  
  /**
   * Current number of items in buffer
   */
  get length(): number {
    return this.size;
  }
  
  /**
   * Check if buffer is full
   */
  get isFull(): boolean {
    return this.size === this.capacity;
  }
}

/**
 * Object pool for frequent allocations
 * 
 * Reduces garbage collections by reusing objects instead of creating new ones.
 * Critical for maintaining consistent latency in HFT systems.
 * 
 * @template T - Type of pooled objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  
  /**
   * Create a new object pool
   * 
   * @param createFn - Factory function to create new objects
   * @param initialSize - Pre-allocate this many objects (default: 100)
   * @param resetFn - Optional function to reset objects before reuse
   */
  constructor(
    createFn: () => T,
    initialSize: number = 100,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  /**
   * Get an object from the pool
   * 
   * Returns a recycled object if available, otherwise creates a new one.
   * 
   * @returns Pooled object ready for use
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }
  
  /**
   * Return an object to the pool
   * 
   * Call before discarding the object. Will be reused by next acquire() call.
   * 
   * @param obj - Object to return to pool
   */
  release(obj: T): void {
    if (this.resetFn) {
      this.resetFn(obj);
    }
    this.pool.push(obj);
  }
  
  /**
   * Current pool size (available for reuse)
   */
  get poolSize(): number {
    return this.pool.length;
  }
  
  /**
   * Clear all pooled objects
   */
  clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Compact market data structure - memory efficient
 * 
 * Total: ~29 bytes per entry when using TypedArrays
 */
export interface CompactMarket {
  id: number;          // 4 bytes - market identifier
  price: number;       // 8 bytes - current price
  volume: number;      // 8 bytes - traded volume
  timestamp: number;   // 8 bytes - unix timestamp milliseconds
  status: number;      // 1 byte - market status flags
}

/**
 * Bulk market data storage using TypedArrays
 * 
 * Dramatically more memory efficient than storing objects.
 * Enables processing 10,000+ markets with minimal memory footprint.
 * 
 * Memory usage: ~290KB for 10,000 markets (vs 3-4MB with objects)
 */
export class CompactMarketArray {
  private ids = new Uint32Array(10000);
  private prices = new Float64Array(10000);
  private volumes = new Float64Array(10000);
  private timestamps = new Float64Array(10000);
  private statuses = new Uint8Array(10000);
  private count = 0;
  private readonly capacity = 10000;
  
  /**
   * Add market data
   * 
   * O(1) operation. Returns false if at capacity.
   * 
   * @param market - Market data to add
   * @returns true if added, false if at capacity
   */
  add(market: CompactMarket): boolean {
    if (this.count >= this.capacity) return false;
    
    const index = this.count;
    this.ids[index] = market.id;
    this.prices[index] = market.price;
    this.volumes[index] = market.volume;
    this.timestamps[index] = market.timestamp;
    this.statuses[index] = market.status;
    this.count++;
    
    return true;
  }
  
  /**
   * Get market data at index
   * 
   * O(1) operation. Constructs object from component arrays.
   * 
   * @param index - Market index
   * @returns Market data or undefined
   */
  get(index: number): CompactMarket | undefined {
    if (index >= this.count) return undefined;
    
    return {
      id: this.ids[index],
      price: this.prices[index],
      volume: this.volumes[index],
      timestamp: this.timestamps[index],
      status: this.statuses[index]
    };
  }
  
  /**
   * Batch update market prices
   * 
   * O(n) operation with minimal overhead. Ideal for tick updates.
   * 
   * @param newPrices - Float64Array of new prices
   * @param updateTimestamp - Whether to update timestamps (default: true)
   */
  updatePrices(newPrices: Float64Array, updateTimestamp: boolean = true): void {
    const now = updateTimestamp ? Date.now() : 0;
    const limit = Math.min(this.count, newPrices.length);
    
    for (let i = 0; i < limit; i++) {
      this.prices[i] = newPrices[i];
      if (updateTimestamp) {
        this.timestamps[i] = now;
      }
    }
  }
  
  /**
   * Batch update volumes
   * 
   * @param newVolumes - Float64Array of new volumes
   */
  updateVolumes(newVolumes: Float64Array): void {
    const limit = Math.min(this.count, newVolumes.length);
    
    for (let i = 0; i < limit; i++) {
      this.volumes[i] = newVolumes[i];
    }
  }
  
  /**
   * Update market status flags
   * 
   * @param index - Market index
   * @param status - New status value
   */
  setStatus(index: number, status: number): void {
    if (index < this.count) {
      this.statuses[index] = status;
    }
  }
  
  /**
   * Get all markets as regular objects
   * 
   * Useful for serialization or external APIs, but allocates memory.
   * 
   * @returns Array of market objects
   */
  toArray(): CompactMarket[] {
    const result: CompactMarket[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push({
        id: this.ids[i],
        price: this.prices[i],
        volume: this.volumes[i],
        timestamp: this.timestamps[i],
        status: this.statuses[i]
      });
    }
    return result;
  }
  
  /**
   * Reset array to empty state
   */
  clear(): void {
    this.count = 0;
  }
  
  /**
   * Current number of markets
   */
  get length(): number {
    return this.count;
  }
  
  /**
   * Total capacity
   */
  get size(): number {
    return this.capacity;
  }
  
  /**
   * Estimated memory usage in bytes
   * 
   * Rough calculation based on TypedArray overhead
   */
  get memoryUsage(): number {
    // Uint32Array (ids): count * 4
    // Float64Array (prices): count * 8
    // Float64Array (volumes): count * 8
    // Float64Array (timestamps): count * 8
    // Uint8Array (statuses): count * 1
    return this.count * (4 + 8 + 8 + 8 + 1);
  }
}

/**
 * Statistics for performance monitoring
 */
export interface PoolStats {
  allocated: number;
  pooled: number;
  utilization: number;
}

/**
 * Enhanced object pool with statistics
 * 
 * @template T - Type of pooled objects
 */
export class StatefulObjectPool<T> extends ObjectPool<T> {
  private allocated = 0;
  private totalAcquires = 0;
  private totalReleases = 0;
  
  /**
   * Acquire object and track statistics
   */
  acquire(): T {
    this.totalAcquires++;
    const obj = super.acquire();
    if (this.totalAcquires === 1) {
      this.allocated++;
    }
    return obj;
  }
  
  /**
   * Release object and track statistics
   */
  release(obj: T): void {
    this.totalReleases++;
    super.release(obj);
  }
  
  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return {
      allocated: this.allocated,
      pooled: this.poolSize,
      utilization: this.allocated > 0 ? (this.allocated - this.poolSize) / this.allocated : 0
    };
  }
  
  /**
   * Reset statistics without clearing pool
   */
  resetStats(): void {
    this.allocated = 0;
    this.totalAcquires = 0;
    this.totalReleases = 0;
  }
}

// Export types for external use
export type RingBufferStats = {
  length: number;
  capacity: number;
  utilization: number;
};

export type MemoryStats = {
  ringBuffers: RingBufferStats[];
  pools: PoolStats[];
  totalMemory: number;
};
