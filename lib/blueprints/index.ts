/**
 * Blueprint Registry - Central registry for blueprint management
 * [[TECH][GLOBAL][BLUEPRINT][META:{blueprint-id=BP-REGISTRY@1.0.0;status=active}]
 * [PROPERTIES:{storage=embedded;resolution=memoized;validation=strict}]
 * [CLASS:BlueprintRegistry][#REF:v-1.0.0.BP.REGISTRY.1.0.A.1.1]]
 */

import { Blueprint, PropertyDefinition } from '../domain-notation/types';
import { ALL_BLUEPRINTS, EXCHANGE_BLUEPRINTS } from '../domain-notation/blueprints';
import { PropertyQueryEngine, BlueprintInstance } from './resolver';

export { PropertyQueryEngine } from './resolver';
export type { BlueprintInstance, PropertySnapshot } from './resolver';

class BlueprintRegistry {
  private blueprints: Map<string, Blueprint> = new Map();
  private instances: Map<string, BlueprintInstance> = new Map();
  private resolver: PropertyQueryEngine;
  private instanceCounter: number = 0;

  constructor() {
    this.resolver = new PropertyQueryEngine();
    this.registerBlueprints(ALL_BLUEPRINTS);
  }

  /**
   * Register blueprints in the registry
   */
  registerBlueprints(blueprints: Blueprint[]): void {
    for (const bp of blueprints) {
      this.blueprints.set(`${bp.id}@${bp.version}`, bp);
      this.blueprints.set(bp.id, bp); // Latest version shortcut
    }
  }

  /**
   * Get a blueprint by ID (with optional version)
   */
  getBlueprint(blueprintId: string): Blueprint | undefined {
    return this.blueprints.get(blueprintId);
  }

  /**
   * Create an instance from a blueprint
   */
  createInstance(blueprintId: string, overrides: Record<string, any> = {}): BlueprintInstance {
    const blueprint = this.getBlueprint(blueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${blueprintId}`);
    }

    // Generate unique instance ID
    const instanceId = `inst-${blueprint.id}-${++this.instanceCounter}-${Date.now().toString(36)}`;

    // Extract base properties from blueprint
    const properties: Record<string, any> = {};
    for (const [key, prop] of Object.entries(blueprint.properties)) {
      properties[key] = prop.value;
    }

    const instance: BlueprintInstance = {
      id: instanceId,
      blueprintId,
      version: blueprint.version,
      properties,
      overrides,
      createdAt: Date.now(),
    };

    // Register with resolver
    this.resolver.registerInstance(instance);
    this.instances.set(instanceId, instance);

    return instance;
  }

  /**
   * Get an instance by ID
   */
  getInstance(instanceId: string): BlueprintInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Delete an instance
   */
  deleteInstance(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  /**
   * Get all instances for a blueprint
   */
  getInstancesForBlueprint(blueprintId: string): BlueprintInstance[] {
    return Array.from(this.instances.values()).filter(
      inst => inst.blueprintId === blueprintId || inst.blueprintId.startsWith(blueprintId)
    );
  }

  /**
   * Get the property resolver
   */
  getResolver(): PropertyQueryEngine {
    return this.resolver;
  }

  /**
   * List all registered blueprints
   */
  listBlueprints(): Blueprint[] {
    // Return unique blueprints (filter out version shortcuts)
    const seen = new Set<string>();
    const unique: Blueprint[] = [];

    for (const [key, bp] of this.blueprints) {
      if (key.includes('@') && !seen.has(bp.id)) {
        seen.add(bp.id);
        unique.push(bp);
      }
    }

    return unique;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    blueprints: number;
    instances: number;
    cacheStats: { size: number; instances: number; blueprints: number };
  } {
    return {
      blueprints: this.listBlueprints().length,
      instances: this.instances.size,
      cacheStats: this.resolver.getCacheStats(),
    };
  }

  /**
   * Get blueprint count (for health checks)
   */
  getBlueprintCount(): number {
    return this.listBlueprints().length;
  }

  /**
   * Get instance count (for health checks)
   */
  getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * Clear all instances (useful for testing)
   */
  clearInstances(): void {
    this.instances.clear();
    this.resolver.clearCache();
    this.instanceCounter = 0;
  }

  /**
   * Export registry to JSON (for SQLite persistence)
   */
  toJSON(): {
    blueprints: Blueprint[];
    instances: BlueprintInstance[];
  } {
    return {
      blueprints: this.listBlueprints(),
      instances: Array.from(this.instances.values()),
    };
  }

  /**
   * Import from JSON (for SQLite restoration)
   */
  fromJSON(data: { blueprints: Blueprint[]; instances: BlueprintInstance[] }): void {
    this.registerBlueprints(data.blueprints);
    for (const inst of data.instances) {
      this.resolver.registerInstance(inst);
      this.instances.set(inst.id, inst);
    }
  }
}

// Global singleton instance
export const blueprintRegistry = new BlueprintRegistry();
