/**
 * KU Protocol - Basic Usage Examples
 * 
 * These examples demonstrate common use cases for the KU Protocol.
 */

import {
  createQuizPayload,
  createCertPayload,
  createProgPayload,
  parseKUPayload,
  isKUTransaction,
  verifyQuizHash,
  stringToHex,
  hexToString,
} from '../src';

// Example 1: Create a Quiz Completion Proof
function exampleCreateQuizProof() {
  console.log('=== Example 1: Create Quiz Proof ===\n');
  
  // User completed a quiz with these answers (index of selected option)
  const userAnswers = [0, 2, 1, 0, 3, 1, 2, 0, 1, 2];
  
  // Calculate score (8 out of 10 correct)
  const score = 8;
  const maxScore = 10;
  
  // Create the payload
  const payload = createQuizPayload({
    walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
    courseId: 'blockchain-basics',
    lessonId: 'lesson-3-consensus',
    score: score,
    maxScore: maxScore,
    timestamp: 1704067200000, // Fixed timestamp for reproducibility
  }, userAnswers);
  
  console.log('Hex Payload:', payload);
  console.log('Decoded:', hexToString(payload));
  console.log('Payload Size:', payload.length / 2, 'bytes');
  console.log();
}

// Example 2: Create a Certificate Claim
function exampleCreateCertificate() {
  console.log('=== Example 2: Create Certificate Claim ===\n');
  
  // User completed all these courses
  const completedCourses = [
    'blockchain-basics',
    'kaspa-fundamentals',
    'smart-contracts-101',
    'defi-principles',
  ];
  
  const payload = createCertPayload({
    walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
    certificateType: 'diploma',
    timestamp: 1704067200000,
  }, completedCourses);
  
  console.log('Hex Payload:', payload);
  console.log('Decoded:', hexToString(payload));
  console.log();
}

// Example 3: Create a Progress Marker
function exampleCreateProgress() {
  console.log('=== Example 3: Create Progress Marker ===\n');
  
  const payload = createProgPayload({
    walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
    courseId: 'blockchain-basics',
    lessonId: 'lesson-2-history',
    completionType: 'complete',
    timestamp: 1704067200000,
  });
  
  console.log('Hex Payload:', payload);
  console.log('Decoded:', hexToString(payload));
  console.log();
}

// Example 4: Parse a KU Transaction
function exampleParseTransaction() {
  console.log('=== Example 4: Parse KU Transaction ===\n');
  
  // Simulate receiving a transaction payload
  const payload = createQuizPayload({
    walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
    courseId: 'blockchain-basics',
    lessonId: 'lesson-3-consensus',
    score: 8,
    maxScore: 10,
    timestamp: 1704067200000,
  }, [0, 2, 1, 0, 3, 1, 2, 0, 1, 2]);
  
  // Check if it's a KU transaction
  console.log('Is KU Transaction:', isKUTransaction(payload));
  
  // Parse the payload
  const parsed = parseKUPayload(payload);
  
  if (parsed) {
    console.log('Type:', parsed.type);
    console.log('Version:', parsed.version);
    
    if (parsed.quiz) {
      console.log('Quiz Data:');
      console.log('  Wallet:', parsed.quiz.walletAddress);
      console.log('  Course:', parsed.quiz.courseId);
      console.log('  Lesson:', parsed.quiz.lessonId);
      console.log('  Score:', `${parsed.quiz.score}/${parsed.quiz.maxScore}`);
      console.log('  Timestamp:', new Date(parsed.quiz.timestamp).toISOString());
      console.log('  Content Hash:', parsed.quiz.contentHash);
    }
  }
  console.log();
}

// Example 5: Verify Quiz Hash
function exampleVerifyHash() {
  console.log('=== Example 5: Verify Quiz Hash ===\n');
  
  const lessonId = 'lesson-3-consensus';
  const answers = [0, 2, 1, 0, 3, 1, 2, 0, 1, 2];
  const score = 8;
  
  // Create a payload to get the content hash
  const payload = createQuizPayload({
    walletAddress: 'kaspa:qz7vy4v5dwmua4z8rkvqe8zl7fgh6jmqwpxxnvkpqa8gvnxn5ldxuswjmvr7',
    courseId: 'blockchain-basics',
    lessonId: lessonId,
    score: score,
    maxScore: 10,
    timestamp: 1704067200000,
  }, answers);
  
  // Parse to get the hash
  const parsed = parseKUPayload(payload);
  const expectedHash = parsed?.quiz?.contentHash || '';
  
  // Verify the hash matches
  const isValid = verifyQuizHash(lessonId, answers, score, expectedHash);
  
  console.log('Expected Hash:', expectedHash);
  console.log('Verification Result:', isValid ? 'VALID' : 'INVALID');
  
  // Try with wrong answers
  const wrongAnswers = [1, 2, 1, 0, 3, 1, 2, 0, 1, 2]; // Changed first answer
  const isInvalid = verifyQuizHash(lessonId, wrongAnswers, score, expectedHash);
  
  console.log('Wrong Answers Result:', isInvalid ? 'VALID' : 'INVALID (as expected)');
  console.log();
}

// Example 6: Identify Non-KU Transactions
function exampleNonKUTransaction() {
  console.log('=== Example 6: Identify Non-KU Transactions ===\n');
  
  // Some random hex data (not a KU transaction)
  const randomPayload = stringToHex('Hello, this is just a regular message');
  
  console.log('Is KU Transaction:', isKUTransaction(randomPayload));
  
  const parsed = parseKUPayload(randomPayload);
  console.log('Parsed Result:', parsed); // null
  
  // A K Protocol transaction (not KU)
  const kProtocolPayload = stringToHex('k:1:post:Hello world!');
  console.log('Is K Protocol a KU Transaction:', isKUTransaction(kProtocolPayload));
  console.log();
}

// Run all examples
console.log('KU Protocol Examples\n');
console.log('====================\n');

exampleCreateQuizProof();
exampleCreateCertificate();
exampleCreateProgress();
exampleParseTransaction();
exampleVerifyHash();
exampleNonKUTransaction();

console.log('All examples completed!');
