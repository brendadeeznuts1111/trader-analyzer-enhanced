/**
 * Test different hex formatting options in Bun.inspect
 */

// Test direct Uint8Array inspection
const testArray = new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d, 0x1a, 0x1b, 0x1c, 0x1d]);

console.log('🔍 Direct Uint8Array inspection:');
console.log('Default:', testArray);
console.log('With hex:', Bun.inspect(testArray, { hex: true } as any));
console.log('With hex and colors:', Bun.inspect(testArray, { hex: true, colors: true } as any));
console.log('');

// Test Buffer inspection
const testBuffer = Buffer.from([0x0a, 0x0b, 0x0c, 0x0d, 0x1a, 0x1b, 0x1c, 0x1d]);

console.log('🔍 Direct Buffer inspection:');
console.log('Default:', testBuffer);
console.log('With hex:', Bun.inspect(testBuffer, { hex: true } as any));
console.log('With hex and colors:', Bun.inspect(testBuffer, { hex: true, colors: true } as any));
console.log('');

// Test table with different options
const tableData = [
  { name: 'Uint8Array', data: testArray },
  { name: 'Buffer', data: testBuffer },
  { name: 'Mixed', data: { array: testArray, buffer: testBuffer } }
];

console.log('📊 Table tests:');
console.log('Standard table:');
console.log(Bun.inspect.table(tableData));
console.log('');

console.log('Table with hex:');
console.log(Bun.inspect.table(tableData, { hex: true } as any));
console.log('');

console.log('Table with hex and colors:');
console.log(Bun.inspect.table(tableData, { hex: true, colors: true } as any));
console.log('');

// Test with depth option
console.log('🔍 Depth tests:');
console.log('Depth 1 with hex:');
console.log(Bun.inspect(testArray, { hex: true, depth: 1 } as any));
console.log('');

console.log('Depth 2 with hex:');
console.log(Bun.inspect(testArray, { hex: true, depth: 2 } as any));
console.log('');

// Test custom object with Uint8Array
const customObject = {
  id: 123,
  payload: testArray,
  metadata: {
    timestamp: Date.now(),
    data: testBuffer
  }
};

console.log('🎯 Custom object with binary data:');
console.log('Default:', Bun.inspect(customObject));
console.log('');
console.log('With hex:', Bun.inspect(customObject, { hex: true } as any));
console.log('');
console.log('With hex, colors, compact:', Bun.inspect(customObject, { 
  hex: true, 
  colors: true, 
  compact: true, 
  breakLength: 80 
} as any));
