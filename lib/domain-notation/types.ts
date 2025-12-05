export type Scope = 'GLOBAL' | 'MODULE' | 'USER' | 'ORG' | 'PROJECT' | 'TEAM';

export interface MetaProperty {
  key: string;
  value: string;
}

export interface PropertyDefinition {
  value: any; // Can be string, number, object, array, etc.
  type?: string;
  constraints?: string;
  inherit?: string;
  override?: string;
  chain?: string;
  root?: string;
}

export interface PropertyMetadata {
  source?: 'blueprint' | 'override' | 'inherited';
  root?: string;
  chain?: string[];
  validate?: string;
  transform?: string;
  cache?: { ttl: string };
  observe?: string;
  immutable?: boolean;
}

export interface EnhancedPropertyDefinition extends PropertyDefinition {
  metadata?: PropertyMetadata;
}

export interface Blueprint {
  id: string;
  version: string;
  root: string;
  properties: Record<string, PropertyDefinition | EnhancedPropertyDefinition>;
  hierarchy: string;
  instances?: Map<string, any>;
  backLinks?: {
    root: string;
    dependencies: string[];
  };
}

export interface DomainNotation {
  domain: string;
  scope: Scope;
  type: string;
  meta: Record<string, string>;
  properties: Record<string, PropertyDefinition>;
  class: string;
  ref: string;
  blueprint?: string;
  root?: string;
}

export interface ParsedNotation {
  raw: string;
  components: DomainNotation;
  blueprint?: Blueprint;
  resolvedProperties?: Record<string, any>;
}

export interface NotationParseOptions {
  validateBlueprints?: boolean;
  resolveProperties?: boolean;
  strictMode?: boolean;
}

export interface NotationValidationError {
  field: string;
  message: string;
  value: any;
}

export interface BlueprintResolver {
  resolve(blueprintId: string, version?: string): Promise<Blueprint | null>;
  validate(blueprint: Blueprint): boolean;
  inherit(parent: Blueprint, child: Blueprint): Blueprint;
}

export interface PropertyResolver {
  resolve(
    properties: Record<string, PropertyDefinition>,
    blueprint?: Blueprint,
    root?: string
  ): Promise<Record<string, any>>;
  merge(base: any, override: any): any;
  validate(property: PropertyDefinition, value: any): boolean;
}
