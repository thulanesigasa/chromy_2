/**
 * Test script — validates the fixed matcher against the real checkpoint_1.json dataset.
 * Run with: node test_matcher.js
 */

const { findBestMatch, calculateOptionSetScore } = require('./src/background/matcher.js');
const fs = require('fs');

const knowledgeBase = JSON.parse(fs.readFileSync('./docs/checkpoint_1.json', 'utf8'));

// ── Test cases simulating what NetAcad puts on screen ───────────────────────

const tests = [
  {
    label: 'Q21: Options detected, question text EMPTY (original bug case)',
    question: '',
    options: [
      'websites to check account fees',
      'websites to make purchases',
      'websites to check stock prices',
      'websites to check product details'
    ],
    expectedAnswer: 'websites to check account fees'
  },
  {
    label: 'Q21: Full question text extracted correctly',
    question: 'What websites should a user avoid when connecting to a free and open wireless hotspot?',
    options: [
      'websites to check account fees',
      'websites to make purchases',
      'websites to check stock prices',
      'websites to check product details'
    ],
    expectedAnswer: 'websites to check account fees'
  },
  {
    label: 'Q1: CISSP certification question',
    question: 'Which organization is an international nonprofit organization that offers the CISSP certification?',
    options: ['CompTIA', '(ISC)2', 'IEEE', 'GIAC'],
    expectedAnswer: '(ISC)2'
  },
  {
    label: 'Q2: SOAR question (options only)',
    question: '',
    options: [
      'SOAR was designed to address critical security events and high-end investigation.',
      'SOAR would benefit smaller organizations because it requires no cybersecurity analyst involvement once installed.',
      'SOAR automates incident investigation and responds to workflows based on playbooks.',
      'SOAR automation guarantees an uptime factor of "5 nines".'
    ],
    expectedAnswer: 'SOAR automates incident investigation and responds to workflows based on playbooks.'
  },
  {
    label: 'Q11: Ransomware question — long question, option fallback',
    question: '',
    options: ['Trojan', 'spyware', 'adware', 'ransomware'],
    expectedAnswer: 'ransomware'
  },
  {
    label: 'Q27: DDoS question (question only, no options)',
    question: 'Which cyber attack involves a coordinated attack from a botnet of zombie computers?',
    options: [],
    expectedAnswer: 'DDoS'
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = findBestMatch(test.question, knowledgeBase, null, test.options);

  const ok = result.matchFound && result.answer === test.expectedAnswer;
  if (ok) {
    passed++;
    console.log(`✅ PASS [${result.score}%] ${test.label}`);
    console.log(`   Answer: "${result.answer}"`);
  } else {
    failed++;
    console.log(`❌ FAIL [${result.score || 0}%] ${test.label}`);
    console.log(`   Expected: "${test.expectedAnswer}"`);
    console.log(`   Got:      "${result.answer || '(no match)'}"`);
    if (result.bestCandidate) {
      console.log(`   Best:     "${result.bestCandidate}"`);
    }
  }
  console.log('');
});

console.log(`\n══════════════════════════════`);
console.log(`Results: ${passed}/${tests.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
