import fs from 'fs';

// Test ultra-deep rg patterns match
const content = fs.readFileSync('examples/yaml-console-demo.ts', 'utf8');
const ultraSections = (content.match(/1\.2\.1\.1\.1\.1\.1/g) || []).length;
console.log('Ultra-deep sections (1.2.1.1.1.1.1):', ultraSections);

const nullRefs = (content.match(/BUN_NULL/g) || []).length;
console.log('BUN_NULL references:', nullRefs);

// Additional checks
const typeGuards = (content.match(/1\.2\.1\.1\.1\.1\.2/g) || []).length;
console.log('Type guards (1.2.1.1.1.1.2):', typeGuards);

const totalSections = (content.match(/^\s*\*\s*\d+\.\d+(\.\d+)*\./gm) || []).length;
console.log('Total numbered sections:', totalSections);

const bracketedRefs = (content.match(/\[.*?\]/g) || []).length;
console.log('Total bracketed references:', bracketedRefs);

// Expected results
console.log('\nExpected vs Actual:');
console.log(`Ultra-deep sections: Expected 1, Actual ${ultraSections} ${ultraSections === 1 ? '✅' : '❌'}`);
console.log(`BUN_NULL references: Expected 2, Actual ${nullRefs} ${nullRefs === 2 ? '✅' : '❌'}`);
console.log(`Type guards: Expected 3, Actual ${typeGuards} ${typeGuards === 3 ? '✅' : '❌'}`);
