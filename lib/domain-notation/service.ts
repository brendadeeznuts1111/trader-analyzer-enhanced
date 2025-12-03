import { 
  DomainNotationParser, 
  DefaultBlueprintResolver, 
  DefaultPropertyResolver,
  DomainNotationValidator,
  ALL_BLUEPRINTS,
  EXAMPLE_INSTANCES,
  ParsedNotation
} from '../domain-notation';

// Initialize the domain notation system
const blueprintResolver = new DefaultBlueprintResolver(ALL_BLUEPRINTS);
const propertyResolver = new DefaultPropertyResolver(blueprintResolver);

export class DomainNotationService {
  static parse(notation: string): ParsedNotation {
    return DomainNotationParser.parse(notation, { strictMode: true });
  }

  static generate(notation: any): string {
    return DomainNotationParser.generate(notation);
  }

  static validate(notation: any) {
    return DomainNotationValidator.validate(notation);
  }

  static async resolveProperties(notation: ParsedNotation): Promise<ParsedNotation> {
    if (notation.components.blueprint) {
      const blueprint = await blueprintResolver.resolve(notation.components.blueprint);
      if (blueprint) {
        const resolvedProperties = await propertyResolver.resolve(
          notation.components.properties,
          blueprint,
          notation.components.root
        );
        
        return {
          ...notation,
          blueprint,
          resolvedProperties
        };
      }
    }
    
    return notation;
  }

  static getBlueprint(id: string, version?: string) {
    return blueprintResolver.resolve(id, version);
  }

  static getAllBlueprints() {
    return blueprintResolver.getAllBlueprints();
  }

  static getExamples() {
    return EXAMPLE_INSTANCES;
  }
}

// Example usage in components
export const useDomainNotation = () => {
  return {
    parse: DomainNotationService.parse,
    generate: DomainNotationService.generate,
    validate: DomainNotationService.validate,
    resolveProperties: DomainNotationService.resolveProperties,
    getBlueprint: DomainNotationService.getBlueprint,
    getExamples: DomainNotationService.getExamples
  };
};