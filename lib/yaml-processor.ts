// lib/yaml-processor.ts
import { safeTrim, seededRandom } from './safe-utils';

export interface YAMLNode {
  key: string;
  value: any;
  depth: number;
}

export interface YAMLProcessingOptions {
  seed?: number;
  maxDepth?: number;
  preserveComments?: boolean;
}

/**
 * YAML Processor with seed-aware operations
 * Follows style guide v4.4 naming conventions
 * 
 * 1. YAML Processing
 *    Handles YAML parsing and validation
 * 
 * 1.1 Seeded Processing
 *    Reproducible operations
 * 
 * 1.1.1 Structure Validation
 *    Checks YAML integrity
 * 
 * 1.1.1.1 Edge Case Handling
 *    Null safety and guards [BUN_SEED_EX]
 */
export class YAMLProcessor {
  public seed: number; // Make public for testing
  private maxDepth: number;
  private preserveComments: boolean;
  
  constructor(options: YAMLProcessingOptions = {}) {
    // Use the provided seed or default to 123, but don't override with default if seed is 0
    this.seed = options.seed !== undefined ? options.seed : 123;
    this.maxDepth = options.maxDepth || 10;
    this.preserveComments = options.preserveComments || false;
    
    // Guard against zero seed [BUN_SEED_EX]
    if (this.seed === 0) {
      this.seed = 1;
    }
  }
  
  /**
   * Process YAML with seeding for reproducible results
   * 1.2 Content Processing
   *    Parses YAML lines into nodes
   */
  processYAML(content: string): YAMLNode[] {
    const random = seededRandom(this.seed);
    const nodes: YAMLNode[] = [];
    
    // Simulate processing with deterministic randomness
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = safeTrim(line);
      
      // Skip empty lines unless preserving comments
      if (!trimmedLine) {
        if (this.preserveComments && line.trim().startsWith('#')) {
          nodes.push({
            key: `comment_${index}`,
            value: line,
            depth: 0
          });
        }
        return;
      }
      
      // Calculate depth
      const depth = line.length - line.trimStart().length;
      
      // Add node if within max depth
      if (depth <= this.maxDepth) {
        nodes.push({
          key: `node_${index}`,
          value: trimmedLine,
          depth
        });
      }
    });
    
    return nodes;
  }
  
  /**
   * Validate YAML structure with seed-aware checks
   * 1.3 Validation Logic
   *    Ensures structure integrity
   */
  validateStructure(nodes: YAMLNode[]): boolean {
    const random = seededRandom(this.seed);
    
    // Simulate probabilistic validation
    const shouldPass = random() > 0.1; // 90% pass rate
    
    // Basic structural checks
    const hasValidNodes = nodes.length > 0;
    const hasValidKeys = nodes.every(node => node.key && node.key.length > 0);
    const hasValidDepths = nodes.every(node => node.depth >= 0 && node.depth <= this.maxDepth);
    
    return shouldPass && hasValidNodes && hasValidKeys && hasValidDepths;
  }
  
  /**
   * Extract key-value pairs from processed nodes
   * 1.4 Data Extraction
   *    Converts nodes to key-value map
   */
  extractKeyValuePairs(nodes: YAMLNode[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    nodes.forEach(node => {
      const trimmedValue = safeTrim(node.value);
      
      // Skip comments
      if (trimmedValue.startsWith('#')) {
        return;
      }
      
      // Parse key-value pairs
      const colonIndex = trimmedValue.indexOf(':');
      if (colonIndex > 0) {
        const key = safeTrim(trimmedValue.substring(0, colonIndex));
        const value = safeTrim(trimmedValue.substring(colonIndex + 1));
        
        if (key) {
          result[key] = value || null;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Generate processing report with metrics
   * 1.5 Reporting
   *    Provides detailed analysis
   */
  generateReport(nodes: YAMLNode[]): {
    totalNodes: number;
    maxDepthFound: number;
    averageDepth: number;
    isValid: boolean;
    seed: number;
  } {
    const totalNodes = nodes.length;
    const maxDepthFound = Math.max(...nodes.map(n => n.depth), 0);
    const averageDepth = nodes.reduce((sum, n) => sum + n.depth, 0) / totalNodes || 0;
    const isValid = this.validateStructure(nodes);
    
    return {
      totalNodes,
      maxDepthFound,
      averageDepth: Math.round(averageDepth * 100) / 100,
      isValid,
      seed: this.seed
    };
  }
}
