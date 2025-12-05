/**
 * Demonstration of Bun.stringWidth for accurate width calculations
 * Shows how string width differs from character length for various text types
 */

import type { BunStringWidthOptions } from '../types/bun-inspect';

// Get Bun.stringWidth or fallback to npm package
const bunStringWidth = (globalThis as any).Bun?.stringWidth;
const stringWidth = bunStringWidth || ((str: string, options?: BunStringWidthOptions) => str.length);

function demonstrateStringWidth() {
  console.log('📏 String Width Demonstration');
  console.log('=============================\n');

  const testCases = [
    ['hello', 'ASCII'],
    ['\x1b[31mhello\x1b[0m', 'ASCII + ANSI colors'],
    ['hello😀', 'ASCII + Emoji'],
    ['\x1b[31m😀😀\x1b[0m', 'ANSI + Emoji'],
    ['😀hello😀\x1b[31m😀😀😀\x1b[0m', 'Mixed ANSI + Emoji + ASCII'],
    ['＜＞', 'Full-width characters'],
    ['hello＜＞world', 'Mixed ASCII + Full-width'],
    ['\x1b[31m＜＞😀\x1b[0m', 'ANSI + Full-width + Emoji'],
  ];

  console.log('┌─────────────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ String                               │ Length       │ StringWidth  │ Difference   │');
  console.log('├─────────────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  for (const [str, label] of testCases) {
    const length = str.length;
    const width = stringWidth(str);
    const diff = width - length;
    
    const displayStr = str.length > 20 ? str.substring(0, 17) + '...' : str;
    console.log(`│ ${displayStr.padEnd(37)} │ ${length.toString().padEnd(12)} │ ${width.toString().padEnd(12)} │ ${diff > 0 ? '+' : ''}${diff.toString().padEnd(11)} │`);
  }

  console.log('└─────────────────────────────────────┴──────────────┴──────────────┴──────────────┘');
  console.log('');

  // Demonstrate with hex strings
  console.log('🔍 Hex String Width Analysis:');
  console.log('============================\n');

  const hexStrings = [
    '0a0b0c0d1a1b1c1d',
    '0102030405060708090a0b0c0d0e0f10',
    'deadbeefcafebabe',
    '48656c6c6f20576f726c64', // "Hello World" in hex
  ];

  for (const hex of hexStrings) {
    const length = hex.length;
    const width = stringWidth(hex);
    const bytes = length / 2;
    
    console.log(`Hex: ${hex}`);
    console.log(`  Characters: ${length}, Display Width: ${width}, Bytes: ${bytes}`);
    console.log(`  Visual ratio: ${(width/bytes).toFixed(2)} chars per byte`);
    console.log('');
  }

  // Table formatting demo
  console.log('📊 Table Formatting with String Width:');
  console.log('=======================================\n');

  const tableData = [
    { name: 'ASCII', value: 'hello', hex: '48656c6c6f' },
    { name: 'Emoji', value: '😀', hex: 'f09f9880' },
    { name: 'ANSI', value: '\x1b[31mred\x1b[0m', hex: '1b5b33316d7265641b5b306d' },
    { name: 'Mixed', value: '😀hello', hex: 'f09f988068656c6c6f' },
  ];

  // Calculate column widths using stringWidth
  const nameWidth = Math.max(...tableData.map(row => stringWidth(row.name)), 4);
  const valueWidth = Math.max(...tableData.map(row => stringWidth(row.value)), 5);
  const hexWidth = Math.max(...tableData.map(row => stringWidth(row.hex)), 3);

  // Build table
  const header = `│ ${'Name'.padEnd(nameWidth)} │ ${'Value'.padEnd(valueWidth)} │ ${'Hex'.padEnd(hexWidth)} │`;
  const separator = `├─${'─'.repeat(nameWidth)}─┼─${'─'.repeat(valueWidth)}─┼─${'─'.repeat(hexWidth)}─┤`;
  const border = `└─${'─'.repeat(nameWidth)}─┴─${'─'.repeat(valueWidth)}─┴─${'─'.repeat(hexWidth)}─┘`;

  console.log(`┌─${'─'.repeat(nameWidth)}─┬─${'─'.repeat(valueWidth)}─┬─${'─'.repeat(hexWidth)}─┐`);
  console.log(header);
  console.log(separator);

  for (const row of tableData) {
    const line = `│ ${row.name.padEnd(nameWidth)} │ ${row.value.padEnd(valueWidth)} │ ${row.hex.padEnd(hexWidth)} │`;
    console.log(line);
  }

  console.log(border);
  console.log('');

  console.log('✅ String Width demo complete!');
  console.log('\n💡 Key insights:');
  console.log('   • ANSI escape sequences dont contribute to visual width');
  console.log('   • Emoji and full-width characters count as 2 display columns');
  console.log('   • Hex strings have 1:1 character-to-width ratio');
  console.log('   • Essential for proper table column alignment');
}

// Run the demo
if (import.meta.main) {
  demonstrateStringWidth();
}

export { demonstrateStringWidth };
