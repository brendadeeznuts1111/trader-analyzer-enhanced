/**
 * Type definitions for Bun inspect options
 * Based on official Bun API documentation at https://github.com/oven-sh/bun/blob/main/docs/api/utils.md
 */

export interface BunInspectOptions {
  /** Controls how many levels nested objects will be inspected */
  depth?: number;
  /** If true, output includes ANSI color codes */
  colors?: boolean;
  /** When true, objects are printed on a single line if they fit within breakLength */
  compact?: boolean;
  /** The character length threshold after which properties will be broken onto new lines */
  breakLength?: number;
  /** If true, Uint8Array and Buffer values are displayed in hexadecimal format */
  hex?: boolean;
  /** Show hidden properties */
  showHidden?: boolean;
}

/**
 * Bun.stringWidth options for accurate terminal width calculation
 * Based on official Bun API documentation
 */
export interface BunStringWidthOptions {
  /** If true, counts ANSI escape codes in the width calculation */
  countAnsiEscapeCodes?: boolean;
}

declare global {
  var Bun: {
    /** Serialize an object to a string exactly as printed by console.log */
    inspect: (value: any, options?: BunInspectOptions) => string;
    /** Symbol for custom inspection implementation */
    inspect: unique symbol;
    /** Get column count of string as displayed in terminal (1,000x faster than string-width package) */
    stringWidth: (str: string, options?: BunStringWidthOptions) => number;
  } & typeof globalThis.Bun;
}

export {};
