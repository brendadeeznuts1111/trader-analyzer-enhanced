import fs from 'fs';

// Test function to verify rg patterns
function testRegexPatterns() {
  const content = fs.readFileSync('examples/yaml-console-demo.ts', 'utf8');
  
  // Count numbered sections (in JSDoc comments with * prefix)
  const sections = (content.match(/^\s*\*\s*\d+\.\d+(\.\d+)*\./gm) || []).length;
  console.log('Sections found:', sections);
  
  // Count BUN_* references in brackets
  const refs = (content.match(/\[BUN_\w+\]/g) || []).length;
  console.log('BUN refs found:', refs);
  
  // Count specific BUN_CONSOLE references
  const specific = (content.match(/BUN_CONSOLE/g) || []).length;
  console.log('BUN_CONSOLE found:', specific);
  
  // Also count CONFIG_FILE references
  const configRefs = (content.match(/\[CONFIG_FILE\]/g) || []).length;
  console.log('CONFIG_FILE refs found:', configRefs);
  
  console.log('Total bracketed refs:', (content.match(/\[.*?\]/g) || []).length);
  
  return { sections, refs, specific, configRefs };
}

// Run the test
const results = testRegexPatterns();
console.log('Test results:', results);
