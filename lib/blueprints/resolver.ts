/**
 * PropertyQueryEngine - Blueprint property resolution with memoization
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-RESOLVER@1.0.0}]
 * [PROPERTIES:{resolution=<3ms;cache=memoized;validation=strict}]
 * [CLASS:PropertyQueryEngine][#REF:v-1.0.0.BP.RESOLVER.1.0.A.1.1]]
 */

import { Blueprint, PropertyDefinition } from '../domain-notation/types';
import { ALL_BLUEPRINTS } from '../domain-notation/blueprints';

export interface BlueprintInstance {
  id: string;
  blueprintId: string;
  version: string;
  properties: Record<string, any>;
  overrides: Record<string, any>;
  createdAt: number;
}

export interface PropertySnapshot {
  instanceId: string;
  blueprintId: string;
  properties: Record<string, any>;
  timestamp: number;
  hash: string;
}

export class PropertyQueryEngine {
  private cache: Map<string, any> = new Map();
  private instances: Map<string, BlueprintInstance> = new Map();
  private blueprints: Map<string, Blueprint> = new Map();
  private snapshots: Map<string, PropertySnapshot> = new Map();

  constructor() {
    // Register all blueprints
    for (const bp of ALL_BLUEPRINTS) {
      this.blueprints.set(`${bp.id}@${bp.version}`, bp);
      this.blueprints.set(bp.id, bp); // Also register without version for latest
    }
  }

  /**
   * Resolve a property from an instance
   * Target: <3ms resolution time
   */
  async resolve(instanceId: string, propertyKey: string): Promise<any> {
    const start = performance.now();
    const cacheKey = `${instanceId}:${propertyKey}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // Check overrides first
    if (instance.overrides[propertyKey]) {
      const resolved = instance.overrides[propertyKey];
      this.cache.set(cacheKey, resolved);
      return resolved;
    }

    // Get blueprint
    const blueprint = this.blueprints.get(instance.blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${instance.blueprintId}`);
    }

    // Resolve from blueprint properties
    const prop = blueprint.properties[propertyKey];
    if (!prop) {
      throw new Error(`Property not found: ${propertyKey} in ${instance.blueprintId}`);
    }

    const resolved = await this.resolveProperty(prop, blueprint);

    // Validate constraints
    if (prop.constraints?.includes('required') && resolved === undefined) {
      throw new Error(`Required property missing: ${propertyKey}`);
    }

    // Cache result
    this.cache.set(cacheKey, resolved);

    const elapsed = performance.now() - start;
    if (elapsed > 3) {
      console.warn(`Property resolution exceeded 3ms target: ${elapsed.toFixed(2)}ms for ${propertyKey}`);
    }

    return resolved;
  }

  /**
   * Resolve a property definition with inheritance and chaining
   */
  private async resolveProperty(prop: PropertyDefinition, blueprint: Blueprint): Promise<any> {
    let value = prop.value;

    // Handle @inherit directive
    if (prop.inherit) {
      const inheritPath = prop.inherit.split('/');
      if (inheritPath.length === 2) {
        const [inheritBlueprintId, inheritProp] = inheritPath;
        const inheritBlueprint = this.blueprints.get(inheritBlueprintId);
        if (inheritBlueprint?.properties[inheritProp]) {
          const inherited = inheritBlueprint.properties[inheritProp].value;
          value = this.mergeValues(inherited, value);
        }
      }
    }

    // Handle @chain directive
    if (prop.chain) {
      const chainIds = prop.chain.split(',').map(s => s.trim());
      const chainedValues: any[] = [];

      for (const chainId of chainIds) {
        const chainBlueprint = this.blueprints.get(chainId);
        if (chainBlueprint) {
          chainedValues.push(chainBlueprint.properties);
        }
      }

      if (chainedValues.length > 0) {
        value = { value, chain: chainedValues };
      }
    }

    // Handle @root directive (mark for later resolution)
    if (prop.root) {
      if (typeof value === 'object' && value !== null) {
        value = { ...value, _root: prop.root };
      }
    }

    return value;
  }

  /**
   * Merge inherited values with overrides
   */
  private mergeValues(base: any, override: any): any {
    if (typeof base === 'object' && typeof override === 'object' && !Array.isArray(base)) {
      return { ...base, ...override };
    }
    return override !== undefined ? override : base;
  }

  /**
   * Register an instance
   */
  registerInstance(instance: BlueprintInstance): void {
    this.instances.set(instance.id, instance);
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId: string): BlueprintInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Create a snapshot of an instance's resolved properties
   */
  snapshot(instanceId: string): PropertySnapshot {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const blueprint = this.blueprints.get(instance.blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${instance.blueprintId}`);
    }

    // Resolve all properties synchronously for snapshot
    const properties: Record<string, any> = {};
    for (const [key, prop] of Object.entries(blueprint.properties)) {
      if (instance.overrides[key]) {
        properties[key] = instance.overrides[key];
      } else {
        properties[key] = prop.value;
      }
    }

    const snapshot: PropertySnapshot = {
      instanceId,
      blueprintId: instance.blueprintId,
      properties,
      timestamp: Date.now(),
      hash: this.hashProperties(properties)
    };

    this.snapshots.set(instanceId, snapshot);
    return snapshot;
  }

  /**
   * Compare snapshots for drift detection
   */
  compareSnapshots(snapshot1: PropertySnapshot, snapshot2: PropertySnapshot): {
    identical: boolean;
    diffs: string[];
  } {
    const diffs: string[] = [];
    const keys1 = Object.keys(snapshot1.properties);
    const keys2 = Object.keys(snapshot2.properties);

    // Check for missing keys
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        diffs.push(`Missing in snapshot2: ${key}`);
      }
    }
    for (const key of keys2) {
      if (!keys1.includes(key)) {
        diffs.push(`Missing in snapshot1: ${key}`);
      }
    }

    // Check for value differences
    for (const key of keys1) {
      if (keys2.includes(key)) {
        const v1 = JSON.stringify(snapshot1.properties[key]);
        const v2 = JSON.stringify(snapshot2.properties[key]);
        if (v1 !== v2) {
          diffs.push(`Value differs for ${key}`);
        }
      }
    }

    return {
      identical: diffs.length === 0,
      diffs
    };
  }

  /**
   * Generate hash for properties
   */
  private hashProperties(properties: Record<string, any>): string {
    const str = JSON.stringify(properties, Object.keys(properties).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; instances: number; blueprints: number } {
    return {
      size: this.cache.size,
      instances: this.instances.size,
      blueprints: this.blueprints.size
    };
  }
}