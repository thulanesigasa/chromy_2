const { findBestMatch } = require('./src/background/matcher.js');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Chromy 2 Fuzzy Matcher Engine with Checkpoint 1 Data ---');

const checkpointData = JSON.parse(fs.readFileSync(path.join(__dirname, 'docs', 'checkpoint_1.json'), 'utf8'));

console.log(`Loaded ${checkpointData.length} questions from docs/checkpoint_1.json`);

// Test 1: CISSP certification question
const q1 = 'Which organization is an international nonprofit organization that offers the CISSP certification?';
const r1 = findBestMatch(q1, checkpointData);
console.log('\nTest 1 (CISSP Question):');
console.log('Match Found:', r1.matchFound);
console.log('Score:', r1.score + '%');
console.log('Answer:', r1.answer);

// Test 2: SOAR benefit question
const q2 = 'What is a benefit to an organization of using SOAR as part of the SIEM system?';
const r2 = findBestMatch(q2, checkpointData);
console.log('\nTest 2 (SOAR Question):');
console.log('Match Found:', r2.matchFound);
console.log('Score:', r2.score + '%');
console.log('Answer:', r2.answer);

// Test 3: SOC Tier 3 question
const q3 = 'Which personnel in a SOC are assigned the task of hunting for potential threats and implementing threat detection tools?';
const r3 = findBestMatch(q3, checkpointData);
console.log('\nTest 3 (SOC Tier 3 Question):');
console.log('Match Found:', r3.matchFound);
console.log('Score:', r3.score + '%');
console.log('Answer:', r3.answer);

if (r1.matchFound && r2.matchFound && r3.matchFound) {
  console.log('\n✅ ALL CHECKPOINT 1 MATCHER TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('\n❌ MATCHER TEST FAILED!');
  process.exit(1);
}
