#!/usr/bin/env bun
/**
 * YAML Multi-line String Parsing Test
 * Demonstrates proper parsing of literal and folded strings
 */

import { YAML } from "bun";

console.log('🧪 YAML Multi-line String Parsing Test');
console.log('=====================================');

const testYaml = `
# Test multi-line strings
literal_block: |
  This is a multi-line
  literal string that preserves
  line breaks and spacing.
  It's perfect for documentation,
  code examples, and formatted text.

folded_block: >
  This is a folded string
  that joins lines with spaces
  unless there are blank lines.
  
  It's ideal for long paragraphs
  that need to wrap nicely.

# Type tags
string_value: !!str "explicit string"
null_value: !!null
number_value: !!int 42
boolean_value: !!bool true
`;

try {
  const parsed = YAML.parse(testYaml) as {
    literal_block: string;
    folded_block: string;
    string_value: string;
    null_value: any;
    number_value: any;
    boolean_value: boolean;
  };
  
  console.log('✅ YAML parsed successfully');
  console.log('\n📋 Parsed keys:', Object.keys(parsed));
  
  console.log('\n📝 Literal Block:');
  console.log('   Type:', typeof parsed.literal_block);
  console.log('   Value:', parsed.literal_block);
  console.log('   Trimmed:', parsed.literal_block?.trim());
  
  console.log('\n📄 Folded Block:');
  console.log('   Type:', typeof parsed.folded_block);
  console.log('   Value:', parsed.folded_block);
  console.log('   Trimmed:', parsed.folded_block?.trim());
  
  console.log('\n🏷️  Type Tags:');
  console.log('   String value:', parsed.string_value, typeof parsed.string_value);
  console.log('   Null value:', parsed.null_value, typeof parsed.null_value);
  console.log('   Number value:', parsed.number_value, typeof parsed.number_value);
  console.log('   Boolean value:', parsed.boolean_value, typeof parsed.boolean_value);
  
  // Test the specific case from the user
  console.log('\n🎯 User Case Test:');
  const userCase = {
    description: "Multi-line literal block",
    key: "value"
  };
  
  console.log('   Original:', userCase);
  console.log('   Description type:', typeof userCase.description);
  console.log('   Description value:', userCase.description);
  console.log('   Trimmed description:', userCase.description.trim());
  
  const subObj = { noDesc: true };
  console.log('\n   Sub object:', subObj);
  console.log('   Sub noDesc type:', typeof subObj.noDesc);
  console.log('   Sub noDesc value:', subObj.noDesc);
  console.log('   Sub noDesc trim:', subObj.noDesc.toString().trim());
  
} catch (error) {
  console.log('❌ YAML parsing failed:', (error as Error).message);
}

console.log('\n🎉 Multi-line String Test Complete!');
