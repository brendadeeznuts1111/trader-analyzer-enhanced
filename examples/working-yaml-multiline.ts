#!/usr/bin/env bun
/**
 * Working YAML Multi-line String Example
 * Demonstrates proper parsing of literal and folded strings in Bun
 */

import { YAML } from "bun";

console.log('✅ Working YAML Multi-line String Example');
console.log('==========================================');

// Working YAML with proper multi-line strings
const workingYaml = `
# Simple multi-line string examples
description: |
  This is a multi-line
  literal string that preserves
  line breaks and spacing.
  It's perfect for documentation,
  code examples, and formatted text.

summary: >
  This is a folded string
  that joins lines with spaces
  unless there are blank lines.
  
  It's ideal for long paragraphs
  that need to wrap nicely.

# Test data structure
advancedData:
  description: "Multi-line literal block"
  key: "value"

subObj:
  noDesc: true
`;

try {
  const parsed = YAML.parse(workingYaml) as {
    description: string;
    summary: string;
    advancedData: {
      description: string;
      key: string;
    };
    subObj: {
      noDesc: boolean;
    };
  };
  
  console.log('✅ YAML parsed successfully');
  console.log('\n📋 Parsed keys:', Object.keys(parsed));
  
  // Test the description field
  console.log('\n📝 Description Field:');
  console.log('   Type:', typeof parsed.description);
  console.log('   Value:', parsed.description);
  console.log('   Trimmed:', parsed.description?.trim());
  
  // Test the summary field
  console.log('\n📄 Summary Field:');
  console.log('   Type:', typeof parsed.summary);
  console.log('   Value:', parsed.summary);
  console.log('   Trimmed:', parsed.summary?.trim());
  
  // Test the user's specific case
  console.log('\n🎯 User Case Test:');
  console.log('   Parsed advancedData:', parsed.advancedData);
  console.log('   Description type:', typeof parsed.advancedData?.description);
  console.log('   Description value:', parsed.advancedData?.description);
  console.log('   Trimmed description:', parsed.advancedData?.description?.trim());
  
  console.log('\n   Parsed subObj:', parsed.subObj);
  console.log('   Sub noDesc type:', typeof parsed.subObj?.noDesc);
  console.log('   Sub noDesc value:', parsed.subObj?.noDesc);
  console.log('   Sub noDesc trim:', parsed.subObj?.noDesc?.toString().trim());
  
  // Demonstrate proper multi-line string handling
  console.log('\n🔧 Multi-line String Handling:');
  console.log('   Literal block preserves line breaks:');
  console.log('   "' + parsed.description?.trim().split('\n').join(' ') + '"');
  
  console.log('\n   Folded block joins lines with spaces:');
  console.log('   "' + parsed.summary?.trim() + '"');
  
} catch (error) {
  console.log('❌ YAML parsing failed:', (error as Error).message);
}

console.log('\n🎉 Working Multi-line String Example Complete!');
