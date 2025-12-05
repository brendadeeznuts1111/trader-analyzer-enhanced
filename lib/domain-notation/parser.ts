import {
  DomainNotation,
  ParsedNotation,
  NotationParseOptions,
  NotationValidationError,
  Scope,
} from './types';

export class DomainNotationParser {
  private static readonly SCOPE_VALUES: Set<Scope> = new Set([
    'GLOBAL',
    'MODULE',
    'USER',
    'ORG',
    'PROJECT',
    'TEAM',
  ]);

  private static readonly NOTATION_REGEX = /^\[\[([^\]]+)\]\]$/;
  private static readonly COMPONENT_REGEX = /\[([^\]]+)\]/g;
  private static readonly META_REGEX = /META:\{([^}]+)\}/;
  private static readonly PROPERTIES_REGEX = /PROPERTIES:\{([^}]+)\}/;
  private static readonly REF_REGEX = /#REF:([^\]]+)/;
  private static readonly BLUEPRINT_REGEX = /@BLUEPRINT:([^\]]+)/;
  private static readonly ROOT_REGEX = /@ROOT:([^\]]+)/;

  static parse(notation: string, options: NotationParseOptions = {}): ParsedNotation {
    const { strictMode = true } = options;

    // Validate overall format
    const match = notation.match(this.NOTATION_REGEX);
    if (!match) {
      throw new Error(`Invalid notation format: ${notation}`);
    }

    const content = match[1];
    const components = this.extractComponents(content);

    if (strictMode) {
      this.validateComponents(components);
    }

    return {
      raw: notation,
      components: this.buildDomainNotation(components),
    };
  }

  private static extractComponents(content: string): Record<string, string> {
    const components: Record<string, string> = {};
    let match;

    // Extract all bracketed components
    while ((match = this.COMPONENT_REGEX.exec(content)) !== null) {
      const component = match[1];

      if (component.includes(':')) {
        const [key, ...valueParts] = component.split(':');
        const value = valueParts.join(':');
        components[key.toLowerCase()] = value;
      } else {
        // Handle positional components
        this.assignPositionalComponent(components, component);
      }
    }

    return components;
  }

  private static assignPositionalComponent(
    components: Record<string, string>,
    component: string
  ): void {
    if (!components.domain) {
      components.domain = component;
    } else if (!components.scope) {
      components.scope = component;
    } else if (!components.type) {
      components.type = component;
    } else if (!components.class) {
      components.class = component;
    }
  }

  private static buildDomainNotation(components: Record<string, string>): DomainNotation {
    return {
      domain: components.domain || '',
      scope: this.validateScope(components.scope || 'GLOBAL'),
      type: components.type || '',
      meta: this.parseMeta(components.meta || ''),
      properties: this.parseProperties(components.properties || ''),
      class: components.class || '',
      ref: components.ref || '',
      blueprint: components.blueprint,
      root: components.root,
    };
  }

  private static validateScope(scope: string): Scope {
    if (!this.SCOPE_VALUES.has(scope as Scope)) {
      throw new Error(
        `Invalid scope: ${scope}. Must be one of: ${Array.from(this.SCOPE_VALUES).join(', ')}`
      );
    }
    return scope as Scope;
  }

  private static parseMeta(metaString: string): Record<string, string> {
    const meta: Record<string, string> = {};
    if (!metaString) return meta;

    const pairs = metaString.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        meta[key.trim()] = value.trim();
      }
    }
    return meta;
  }

  private static parseProperties(propertiesString: string): Record<string, any> {
    const properties: Record<string, any> = {};
    if (!propertiesString) return properties;

    const pairs = propertiesString.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        properties[key.trim()] = this.parsePropertyValue(value.trim());
      }
    }
    return properties;
  }

  private static parsePropertyValue(value: string): any {
    // Handle complex property values with @ directives
    const directives: Record<string, string> = {};
    let cleanValue = value;

    // Extract @ directives
    const directiveMatches = value.match(/@(\w+):([^\s;]+)/g);
    if (directiveMatches) {
      for (const directive of directiveMatches) {
        const [, key, val] = directive.match(/@(\w+):([^\s;]+)/) || [];
        if (key && val) {
          directives[key] = val;
          cleanValue = cleanValue.replace(directive, '').trim();
        }
      }
    }

    // Parse the clean value
    let parsedValue = cleanValue;
    try {
      // Try parsing as JSON first
      parsedValue = JSON.parse(cleanValue);
    } catch {
      // If not JSON, keep as string
      parsedValue = cleanValue;
    }

    return {
      value: parsedValue,
      ...directives,
    };
  }

  private static validateComponents(components: Record<string, string>): void {
    const errors: NotationValidationError[] = [];

    // Required components
    if (!components.domain) {
      errors.push({ field: 'domain', message: 'Domain is required', value: components.domain });
    }
    if (!components.type) {
      errors.push({ field: 'type', message: 'Type is required', value: components.type });
    }
    if (!components.class) {
      errors.push({ field: 'class', message: 'Class is required', value: components.class });
    }

    // Validate scope
    if (components.scope && !this.SCOPE_VALUES.has(components.scope as Scope)) {
      errors.push({
        field: 'scope',
        message: `Invalid scope: ${components.scope}`,
        value: components.scope,
      });
    }

    if (errors.length > 0) {
      throw new Error(
        `Validation errors: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`
      );
    }
  }

  static generate(notation: DomainNotation): string {
    const components: string[] = [];

    // Add positional components
    components.push(`[${notation.domain}]`);
    components.push(`[${notation.scope}]`);
    components.push(`[${notation.type}]`);

    // Add META if present
    if (Object.keys(notation.meta).length > 0) {
      const metaString = Object.entries(notation.meta)
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
      components.push(`[META:{${metaString}}]`);
    }

    // Add PROPERTIES if present
    if (Object.keys(notation.properties).length > 0) {
      const propertiesString = Object.entries(notation.properties)
        .map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            let propString = `${key}=${JSON.stringify(value.value)}`;
            Object.entries(value).forEach(([dirKey, dirVal]) => {
              if (dirKey !== 'value') {
                propString += ` @${dirKey}:${dirVal}`;
              }
            });
            return propString;
          }
          return `${key}=${value}`;
        })
        .join(';');
      components.push(`[PROPERTIES:{${propertiesString}}]`);
    }

    // Add remaining components
    components.push(`[${notation.class}]`);

    if (notation.ref) {
      components.push(`[#REF:${notation.ref}]`);
    }

    if (notation.blueprint) {
      components.push(`[@BLUEPRINT:${notation.blueprint}]`);
    }

    if (notation.root) {
      components.push(`[@ROOT:${notation.root}]`);
    }

    return `[[${components.join('')}${components.length > 0 ? '' : ''}]]`;
  }
}
