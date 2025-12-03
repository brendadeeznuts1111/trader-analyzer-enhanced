import { DomainNotation, NotationValidationError, Blueprint, PropertyDefinition } from './types';

export class DomainNotationValidator {
  private static readonly VALID_DOMAINS = new Set([
    'TECH', 'TRADING', 'ANALYSIS', 'UI', 'API', 'DATA', 'SYSTEM', 'BUSINESS'
  ]);

  private static readonly VALID_TYPES = new Set([
    'BLUEPRINT', 'INSTANCE', 'COMPONENT', 'SERVICE', 'CONFIG', 'STRATEGY', 'MODULE'
  ]);

  private static readonly VERSION_REGEX = /^v-(\d+)\.(\d+)\.(\d+)\.(.+)$/;

  static validate(notation: DomainNotation): NotationValidationError[] {
    const errors: NotationValidationError[] = [];

    // Validate domain
    if (!notation.domain) {
      errors.push({ field: 'domain', message: 'Domain is required', value: notation.domain });
    } else if (!this.VALID_DOMAINS.has(notation.domain)) {
      errors.push({ 
        field: 'domain', 
        message: `Invalid domain: ${notation.domain}. Must be one of: ${Array.from(this.VALID_DOMAINS).join(', ')}`, 
        value: notation.domain 
      });
    }

    // Validate scope
    if (!notation.scope) {
      errors.push({ field: 'scope', message: 'Scope is required', value: notation.scope });
    }

    // Validate type
    if (!notation.type) {
      errors.push({ field: 'type', message: 'Type is required', value: notation.type });
    } else if (!this.VALID_TYPES.has(notation.type)) {
      errors.push({ 
        field: 'type', 
        message: `Invalid type: ${notation.type}. Must be one of: ${Array.from(this.VALID_TYPES).join(', ')}`, 
        value: notation.type 
      });
    }

    // Validate class
    if (!notation.class) {
      errors.push({ field: 'class', message: 'Class is required', value: notation.class });
    }

    // Validate ref format
    if (notation.ref && !this.VERSION_REGEX.test(notation.ref)) {
      errors.push({ 
        field: 'ref', 
        message: `Invalid ref format: ${notation.ref}. Expected format: v-MAJOR.MINOR.PATCH.x1.x2.x3.x4.x5.x6.INSTANCE`, 
        value: notation.ref 
      });
    }

    // Validate meta properties
    for (const [key, value] of Object.entries(notation.meta)) {
      if (!key || !value) {
        errors.push({ 
          field: 'meta', 
          message: `Invalid meta property: ${key}=${value}`, 
          value: { key, value }
        });
      }
    }

    // Validate properties
    for (const [key, prop] of Object.entries(notation.properties)) {
      const propErrors = this.validateProperty(key, prop);
      errors.push(...propErrors);
    }

    return errors;
  }

  static validateProperty(key: string, property: PropertyDefinition): NotationValidationError[] {
    const errors: NotationValidationError[] = [];

    if (!key) {
      errors.push({ field: 'property', message: 'Property key is required', value: key });
      return errors;
    }

    if (!property.value) {
      errors.push({ 
        field: 'property', 
        message: `Property value is required for key: ${key}`, 
        value: property 
      });
    }

    // Validate type if specified
    if (property.type) {
      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validTypes.includes(property.type)) {
        errors.push({ 
          field: 'property', 
          message: `Invalid property type: ${property.type} for key: ${key}`, 
          value: property 
        });
      }
    }

    // Validate directives
    if (property.inherit && property.inherit !== 'parent') {
      errors.push({ 
        field: 'property', 
        message: `Invalid inherit directive: ${property.inherit} for key: ${key}`, 
        value: property 
      });
    }

    if (property.override && property.override !== 'true' && property.override !== 'false') {
      errors.push({ 
        field: 'property', 
        message: `Invalid override directive: ${property.override} for key: ${key}`, 
        value: property 
      });
    }

    return errors;
  }

  static validateBlueprint(blueprint: Blueprint): NotationValidationError[] {
    const errors: NotationValidationError[] = [];

    // Validate required fields
    if (!blueprint.id) {
      errors.push({ field: 'blueprint.id', message: 'Blueprint ID is required', value: blueprint.id });
    }

    if (!blueprint.version) {
      errors.push({ field: 'blueprint.version', message: 'Blueprint version is required', value: blueprint.version });
    } else if (!/^\d+\.\d+\.\d+/.test(blueprint.version)) {
      errors.push({ 
        field: 'blueprint.version', 
        message: `Invalid version format: ${blueprint.version}. Expected: MAJOR.MINOR.PATCH`, 
        value: blueprint.version 
      });
    }

    if (!blueprint.root) {
      errors.push({ field: 'blueprint.root', message: 'Blueprint root is required', value: blueprint.root });
    }

    // Validate properties
    for (const [key, prop] of Object.entries(blueprint.properties)) {
      const propErrors = this.validateProperty(`blueprint.properties.${key}`, prop);
      errors.push(...propErrors);
    }

    return errors;
  }

  static isValid(notation: DomainNotation): boolean {
    return this.validate(notation).length === 0;
  }

  static isValidBlueprint(blueprint: Blueprint): boolean {
    return this.validateBlueprint(blueprint).length === 0;
  }

  static getValidationSummary(errors: NotationValidationError[]): string {
    if (errors.length === 0) {
      return 'Validation passed';
    }

    const summary = errors.map(error => `${error.field}: ${error.message}`).join('; ');
    return `Validation failed: ${summary}`;
  }
}

export class NotationSanitizer {
  static sanitize(notation: DomainNotation): DomainNotation {
    return {
      domain: this.sanitizeString(notation.domain),
      scope: notation.scope,
      type: this.sanitizeString(notation.type),
      meta: this.sanitizeMeta(notation.meta),
      properties: this.sanitizeProperties(notation.properties),
      class: this.sanitizeString(notation.class),
      ref: this.sanitizeString(notation.ref),
      blueprint: this.sanitizeString(notation.blueprint),
      root: this.sanitizeString(notation.root)
    };
  }

  private static sanitizeString(value: string | undefined): string {
    if (!value) return '';
    return value.trim().replace(/[<>]/g, '');
  }

  private static sanitizeMeta(meta: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(meta)) {
      sanitized[this.sanitizeString(key)] = this.sanitizeString(value);
    }
    return sanitized;
  }

  private static sanitizeProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      sanitized[this.sanitizeString(key)] = value;
    }
    return sanitized;
  }
}