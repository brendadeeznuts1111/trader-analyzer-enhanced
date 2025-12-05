import { Blueprint, BlueprintResolver, PropertyDefinition, PropertyResolver } from './types';

export class DefaultBlueprintResolver implements BlueprintResolver {
  private blueprints: Map<string, Blueprint> = new Map();
  private versionMap: Map<string, Map<string, Blueprint>> = new Map();

  constructor(initialBlueprints: Blueprint[] = []) {
    this.registerBlueprints(initialBlueprints);
  }

  async resolve(blueprintId: string, version?: string): Promise<Blueprint | null> {
    // Parse blueprint reference with version (e.g., "BP-UI-001@1.0.0")
    const [id, ver] = blueprintId.split('@');

    if (ver) {
      return this.getVersionedBlueprint(id, ver);
    }

    if (version) {
      return this.getVersionedBlueprint(id, version);
    }

    // Return latest version
    return this.getLatestBlueprint(id);
  }

  private getVersionedBlueprint(id: string, version: string): Blueprint | null {
    const versions = this.versionMap.get(id);
    if (!versions) return null;

    return versions.get(version) || null;
  }

  private getLatestBlueprint(id: string): Blueprint | null {
    const versions = this.versionMap.get(id);
    if (!versions) return null;

    // Find highest version using semantic version comparison
    let latest: Blueprint | null = null;
    for (const blueprint of versions.values()) {
      if (!latest || this.compareVersions(blueprint.version, latest.version) > 0) {
        latest = blueprint;
      }
    }
    return latest;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  validate(blueprint: Blueprint): boolean {
    // Basic validation
    if (!blueprint.id || !blueprint.version || !blueprint.root) {
      return false;
    }

    // Validate version format (semantic versioning)
    if (!/^\d+\.\d+\.\d+/.test(blueprint.version)) {
      return false;
    }

    // Validate properties structure
    for (const [key, prop] of Object.entries(blueprint.properties)) {
      if (!prop.value) {
        return false;
      }
    }

    return true;
  }

  inherit(parent: Blueprint, child: Blueprint): Blueprint {
    const inheritedProperties: Record<string, PropertyDefinition> = {};

    // Start with parent properties
    Object.assign(inheritedProperties, parent.properties);

    // Override with child properties
    for (const [key, childProp] of Object.entries(child.properties)) {
      if (childProp.override === 'true') {
        // Complete override
        inheritedProperties[key] = childProp;
      } else if (childProp.inherit === 'parent') {
        // Merge with parent
        const parentProp = parent.properties[key];
        inheritedProperties[key] = {
          ...parentProp,
          ...childProp,
          value: childProp.value || parentProp.value,
        };
      } else {
        // Use child property as-is
        inheritedProperties[key] = childProp;
      }
    }

    return {
      ...child,
      properties: inheritedProperties,
      root: child.root || parent.root,
    };
  }

  registerBlueprint(blueprint: Blueprint): void {
    if (!this.validate(blueprint)) {
      throw new Error(`Invalid blueprint: ${blueprint.id}@${blueprint.version}`);
    }

    this.blueprints.set(`${blueprint.id}@${blueprint.version}`, blueprint);

    if (!this.versionMap.has(blueprint.id)) {
      this.versionMap.set(blueprint.id, new Map());
    }
    this.versionMap.get(blueprint.id)!.set(blueprint.version, blueprint);
  }

  registerBlueprints(blueprints: Blueprint[]): void {
    for (const blueprint of blueprints) {
      this.registerBlueprint(blueprint);
    }
  }

  getAllBlueprints(): Blueprint[] {
    return Array.from(this.blueprints.values());
  }

  getBlueprintVersions(id: string): Blueprint[] {
    const versions = this.versionMap.get(id);
    return versions ? Array.from(versions.values()) : [];
  }
}

/**
 * Memoized Property Resolver with <3ms resolution target
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-INTEGRATION-POLY@0.1.0}]
 * [PROPERTIES:{resolution=startup|mount|call-time;cache=memoized}]
 * [CLASS:MemoizedPropertyResolver]]
 */
export class MemoizedPropertyResolver implements PropertyResolver {
  private cache: Map<string, any> = new Map();
  private cacheTTL: Map<string, number> = new Map();
  private readonly maxCacheAge = 300000; // 5 minutes default

  constructor(private blueprintResolver: BlueprintResolver) {}

  private getCacheKey(
    properties: Record<string, PropertyDefinition>,
    blueprint?: Blueprint,
    root?: string
  ): string {
    return `${JSON.stringify(properties)}:${blueprint?.id || ''}:${blueprint?.version || ''}:${root || ''}`;
  }

  async resolve(
    properties: Record<string, PropertyDefinition>,
    blueprint?: Blueprint,
    root?: string
  ): Promise<Record<string, any>> {
    const start = performance.now();
    const cacheKey = this.getCacheKey(properties, blueprint, root);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    const cachedTime = this.cacheTTL.get(cacheKey);

    if (cached && cachedTime && Date.now() - cachedTime < this.maxCacheAge) {
      return cached;
    }

    const resolved: Record<string, any> = {};

    for (const [key, prop] of Object.entries(properties)) {
      resolved[key] = await this.resolveProperty(prop, blueprint, root);
    }

    // Cache result
    this.cache.set(cacheKey, resolved);
    this.cacheTTL.set(cacheKey, Date.now());

    const elapsed = performance.now() - start;
    if (elapsed > 3) {
      console.warn(`Property resolution exceeded 3ms target: ${elapsed.toFixed(2)}ms`);
    }

    return resolved;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTTL.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would track in production
    };
  }

  private async resolveProperty(
    prop: PropertyDefinition,
    blueprint?: Blueprint,
    root?: string
  ): Promise<any> {
    let resolvedValue = prop.value;

    // Handle @inherit directive
    if (prop.inherit && blueprint) {
      const inheritedProp = blueprint.properties[prop.inherit];
      if (inheritedProp) {
        resolvedValue = this.merge(inheritedProp.value, resolvedValue);
      }
    }

    // Handle @root directive
    if (prop.root && root) {
      // In a real implementation, this would resolve root properties
      // For now, we'll just mark it
      resolvedValue = { ...resolvedValue, _root: prop.root };
    }

    // Handle @chain directive
    if (prop.chain) {
      const chainIds = prop.chain.replace(/[\[\]]/g, '').split(',');
      const chainedValues = [];

      for (const chainId of chainIds) {
        const chainBlueprint = await this.blueprintResolver.resolve(chainId.trim());
        if (chainBlueprint) {
          chainedValues.push(chainBlueprint.properties);
        }
      }

      resolvedValue = {
        value: resolvedValue,
        chain: chainedValues,
      };
    }

    return resolvedValue;
  }

  merge(base: any, override: any): any {
    if (typeof base === 'object' && typeof override === 'object') {
      return { ...base, ...override };
    }
    return override !== undefined ? override : base;
  }

  validate(property: PropertyDefinition, value: any): boolean {
    // Type validation
    if (property.type) {
      switch (property.type) {
        case 'string':
          if (typeof value !== 'string') return false;
          break;
        case 'number':
          if (typeof value !== 'number') return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
        case 'object':
          if (typeof value !== 'object' || value === null) return false;
          break;
      }
    }

    // Constraint validation
    if (property.constraints) {
      // Simple constraint validation (can be extended)
      if (property.constraints.includes('required') && (value === null || value === undefined)) {
        return false;
      }

      if (property.constraints.includes('positive') && typeof value === 'number' && value <= 0) {
        return false;
      }
    }

    return true;
  }
}

// Keep DefaultPropertyResolver for backward compatibility
export class DefaultPropertyResolver extends MemoizedPropertyResolver {}
