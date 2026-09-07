const { findBestMatch, computeMatchScore } = require('./src/background/matcher.js');

console.log('--- Testing Chromy 2 Fuzzy Matcher Engine ---');

const sampleKnowledgeBase = [
  {
    id: '1',
    question: 'Which threat actor is motivated by political or social causes?',
    answer: 'Hacktivists',
    category: 'Module 1: The Danger',
    sourceDoc: 'Checkpoint_Exam_Module1.docx'
  },
  {
    id: '2',
    question: 'What is the main function of the Security Operations Center (SOC)?',
    answer: 'Monitor, detect, analyze, and respond to cybersecurity incidents.',
    category: 'Module 2: Fighters in Cybercrime',
    sourceDoc: 'Checkpoint_Exam_Module2.docx'
  },
  {
    id: '3',
    question: 'Which Windows utility can be used to view active running processes and system performance?',
    answer: 'Task Manager',
    category: 'Module 3: Windows OS',
    sourceDoc: 'Checkpoint_Exam_Module3.docx'
  },
  {
    id: '4',
    question: 'Which Linux command displays the active network interfaces and IP configurations?',
    answer: 'ifconfig or ip addr',
    category: 'Module 4: Linux Overview',
    sourceDoc: 'Checkpoint_Exam_Module4.docx'
  }
];

// Test 1: Exact match
const query1 = 'Which threat actor is motivated by political or social causes?';
const result1 = findBestMatch(query1, sampleKnowledgeBase);
console.log('\nTest 1 (Exact Question):');
console.log('Query:', query1);
console.log('Match Found:', result1.matchFound);
console.log('Score:', result1.score + '%');
console.log('Answer:', result1.answer);

// Test 2: Slightly formatted / variations
const query2 = 'What threat actor is motivated by political or social causes';
const result2 = findBestMatch(query2, sampleKnowledgeBase);
console.log('\nTest 2 (Fuzzy Formatting Variation):');
console.log('Query:', query2);
console.log('Match Found:', result2.matchFound);
console.log('Score:', result2.score + '%');
console.log('Answer:', result2.answer);

// Test 3: Linux Command Question
const query3 = 'Which Linux command is used to display active network interfaces and IP configuration details?';
const result3 = findBestMatch(query3, sampleKnowledgeBase);
console.log('\nTest 3 (Sentence Variation):');
console.log('Query:', query3);
console.log('Match Found:', result3.matchFound);
console.log('Score:', result3.score + '%');
console.log('Answer:', result3.answer);

if (result1.matchFound && result2.matchFound && result3.matchFound) {
  console.log('\n✅ ALL MATCHER VERIFICATION TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('\n❌ MATCHER TEST FAILED!');
  process.exit(1);
}
