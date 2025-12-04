#!/usr/bin/env node

/**
 * Test the new 8-character patterned ID generation
 */

const sequenceCounters = new Map();

function generateAuditResultId(year, rowIndex, sh, projectName, code) {
  const yearStr = year ? year.toString().slice(-2).padStart(2, '0') : '00';
  const shMatch = sh.match(/\d+/);
  const shNum = shMatch ? shMatch[0].slice(-2).padStart(2, '0') : '00';
  const key = `${yearStr}-${shNum}`;
  
  if (!sequenceCounters.has(key)) {
    sequenceCounters.set(key, 0);
  }
  
  const sequence = sequenceCounters.get(key) + 1;
  sequenceCounters.set(key, sequence);
  const seqStr = sequence.toString().padStart(4, '0');
  
  return `${yearStr}${shNum}${seqStr}`;
}

console.log('🔑 Testing 8-Character Patterned ID Generation\n');
console.log('Format: YYSHNNNN');
console.log('  YY   = Last 2 digits of year (00-99)');
console.log('  SH   = First 2 digits of SH code (00-99)');
console.log('  NNNN = Sequential number (0001-9999)\n');
console.log('Examples: 25010001, 24030156, 25021234\n');
console.log('Capacity: 9,999 findings per SH per year\n');

// Test with sample data
const testCases = [
  { year: '2025', row: 1, sh: 'SH001', project: 'Project Alpha', code: 'F001' },
  { year: '2025', row: 2, sh: 'SH001', project: 'Project Alpha', code: 'F002' },
  { year: '2025', row: 3, sh: 'SH001', project: 'Project Alpha', code: 'F003' },
  { year: '2025', row: 100, sh: 'SH002', project: 'Project Beta', code: 'F001' },
  { year: '2024', row: 500, sh: 'SH003', project: 'Project Gamma', code: 'F123' },
  { year: '2025', row: 1000, sh: 'SH004', project: 'Project Delta', code: 'F456' },
  { year: '2025', row: 5000, sh: 'SH005', project: 'Project Epsilon', code: 'F789' },
  { year: '2025', row: 8993, sh: 'SH006', project: 'Project Zeta', code: 'F999' },
];

console.log('Sample IDs:\n');
testCases.forEach(test => {
  const id = generateAuditResultId(test.year, test.row, test.sh, test.project, test.code);
  console.log(`${id}  →  Year: ${test.year}, ${test.sh}, Finding #${sequenceCounters.get(`${test.year.slice(-2)}${test.sh.match(/\d+/)[0].padStart(2, '0').slice(0, 2)}`)}`);
});

// Test for collisions with similar data
console.log('\n\nCollision Test (10,000 rows, same SH):');
sequenceCounters.clear();
const ids = new Set();
let collisions = 0;

for (let i = 0; i < 10000; i++) {
  const id = generateAuditResultId('2025', i, 'SH001', 'Test Project', `F${i}`);
  if (ids.has(id)) {
    collisions++;
    if (collisions <= 5) {
      console.log(`⚠️  Collision at row ${i}: ${id}`);
    }
  }
  ids.add(id);
}

console.log(`\n✅ Generated ${ids.size} unique IDs from 10,000 rows`);
console.log(`   Collisions: ${collisions}`);
console.log(`   Note: Collisions expected after 9,999 per SH-Year combination`);

// Test with multiple SH codes
console.log('\n\nRealistic Test (8,993 rows across multiple SH codes):');
sequenceCounters.clear();
const realisticIds = new Set();
let realisticCollisions = 0;

// Simulate realistic distribution: ~1000 findings per SH
const shCodes = ['SH001', 'SH002', 'SH003', 'SH004', 'SH005', 'SH006', 'SH007', 'SH008', 'SH009'];

for (let i = 0; i < 8993; i++) {
  const sh = shCodes[i % shCodes.length];
  const id = generateAuditResultId('2025', i, sh, 'Test Project', `F${i}`);
  if (realisticIds.has(id)) {
    realisticCollisions++;
  }
  realisticIds.add(id);
}

console.log(`✅ Generated ${realisticIds.size} unique IDs from 8,993 rows`);
console.log(`   Collisions: ${realisticCollisions}`);
console.log(`   Distribution: ~${Math.floor(8993 / shCodes.length)} findings per SH`);

console.log('\n💡 Pattern Benefits:');
console.log('   ✓ Human-readable (can identify year and SH at a glance)');
console.log('   ✓ Sortable (chronological and by SH)');
console.log('   ✓ Unique (sequential within each SH-Year)');
console.log('   ✓ Scalable (9,999 findings per SH per year)');
