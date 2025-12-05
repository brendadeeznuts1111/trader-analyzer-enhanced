/**
 * Custom Binary Protocol Demo with Depth-based Hex Formatting
 * Demonstrates the CustomBinaryProtocol class with Bun.inspect.custom
 */

import type { BunInspectOptions, BunStringWidthOptions } from '../types/bun-inspect';

// CustomBinaryProtocol class as defined
class CustomBinaryProtocol {
  constructor(public id: number, public messageType: number, public payload: Uint8Array) {}

  // [Bun.inspect.custom] provides a custom string representation for inspection.
  // This method will be called by Bun.inspect() and Bun.inspect.table() to format instances of this class.
  [Bun.inspect.custom](depth: number, options: BunInspectOptions) {
    if (depth < 0) {
      return `[CustomBinaryProtocol instance: ID=${this.id}]`; // Compact view for low depth
    }
    
    // Determine payload preview, applying hex formatting if 'options.hex' is true
    const payloadPreview = this.payload.length > 20
      ? this.payload.slice(0, 20).toHex() + '...'
      : this.payload.toHex();
    
    // Use Bun.stringWidth for accurate width calculation if available
    const stringWidth = (globalThis as any).Bun?.stringWidth || ((str: string, options?: BunStringWidthOptions) => str.length);
    const hexDisplayWidth = stringWidth(payloadPreview, { countAnsiEscapeCodes: false });
    
    // Return a structured string using the custom formatting
    return `CustomProtocolMessage { id: ${this.id}, type: ${this.messageType}, payload: <${payloadPreview}> (${this.payload.length} bytes, width: ${hexDisplayWidth}) }`;
  }
}

function demonstrateCustomProtocol() {
  console.log('🔧 Custom Binary Protocol Demo');
  console.log('===============================\n');

  // Create test instances with different payload sizes
  const smallMessage = new CustomBinaryProtocol(
    101, 
    1, 
    new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d, 0x1a, 0x1b, 0x1c, 0x1d])
  );

  const largeMessage = new CustomBinaryProtocol(
    202, 
    10, 
    new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
      0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
      0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20
    ])
  );

  console.log('📊 Small message (8 bytes):');
  console.log(smallMessage);
  console.log('');

  console.log('📊 Large message (32 bytes):');
  console.log(largeMessage);
  console.log('');

  console.log('🔍 Depth-based inspection:');
  console.log('Depth -1 (compact):', (smallMessage as any)[Bun.inspect.custom](-1, {} as BunInspectOptions));
  console.log('Depth 0 (compact):', (smallMessage as any)[Bun.inspect.custom](0, {} as BunInspectOptions));
  console.log('Depth 1 (full):', (smallMessage as any)[Bun.inspect.custom](1, {} as BunInspectOptions));
  console.log('');

  console.log('📋 Bun.inspect.table comparison:');
  const messages = [smallMessage, largeMessage];
  
  console.log('Standard table:');
  console.log(Bun.inspect.table(messages));
  console.log('');

  console.log('Table with hex formatting:');
  console.log(Bun.inspect.table(messages, { hex: true } as any));
  console.log('');

  console.log('Table with hex and colors:');
  console.log(Bun.inspect.table(messages, { hex: true, colors: true } as any));
  console.log('');

  console.log('Compact table with hex:');
  console.log(Bun.inspect.table(messages, { hex: true, compact: true, breakLength: 80 } as any));
  console.log('');

  console.log('🎯 Manual hex formatting demonstration:');
  console.log('Small payload hex:', smallMessage.payload.toHex());
  console.log('Large payload hex (first 20):', largeMessage.payload.slice(0, 20).toHex() + '...');
  console.log('Large payload full length:', largeMessage.payload.length, 'bytes');
  console.log('');

  console.log('✅ Custom Binary Protocol demo complete!');
  console.log('\n💡 Key features demonstrated:');
  console.log('   • Depth-based formatting (compact vs full view)');
  console.log('   • Hex payload preview with truncation for large payloads');
  console.log('   • Byte count information');
  console.log('   • Integration with Bun.inspect.table()');
}

// Run the demo
if (import.meta.main) {
  demonstrateCustomProtocol();
}

export { CustomBinaryProtocol, demonstrateCustomProtocol };
