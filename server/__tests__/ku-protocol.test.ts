/**
 * KU Protocol Tests for Kaspa University
 * 
 * Tests verify on-chain data encoding/decoding integrity
 */

import { describe, test, expect } from "vitest";
import {
  createQuizPayload,
  createQAQuestionPayload,
  createQAAnswerPayload,
  parseKUPayload,
  isKUTransaction,
  verifyQuizHash,
  verifyContentHash,
  createContentHash,
  hexToString,
  stringToHex,
  validatePayloadSize,
} from "../ku-protocol";

describe("KU Protocol - Hex Encoding", () => {
  test("stringToHex encodes correctly", () => {
    const result = stringToHex("hello");
    expect(result).toBe("68656c6c6f");
  });

  test("hexToString decodes correctly", () => {
    const result = hexToString("68656c6c6f");
    expect(result).toBe("hello");
  });

  test("round-trip encoding preserves data", () => {
    const original = "ku:1:quiz:test:data";
    const hex = stringToHex(original);
    const decoded = hexToString(hex);
    expect(decoded).toBe(original);
  });

  test("handles unicode characters", () => {
    const original = "Hello World!";
    const hex = stringToHex(original);
    const decoded = hexToString(hex);
    expect(decoded).toBe(original);
  });
});

describe("KU Protocol - Quiz Payloads", () => {
  test("creates valid quiz payload", () => {
    const payload = createQuizPayload({
      walletAddress: "kaspa:test123",
      courseId: "course1",
      lessonId: "lesson1",
      score: 8,
      maxScore: 10,
      timestamp: 1234567890,
    }, [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);

    expect(payload).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);
    expect(payload.length % 2).toBe(0);
  });

  test("quiz payload can be parsed back with kaspa: address", () => {
    const payload = createQuizPayload({
      walletAddress: "kaspa:qr35ennsep3hxfe7lnz5ee7j5jgmkjswssj9wksjqe",
      courseId: "intro-kaspa",
      lessonId: "lesson-1",
      score: 5,
      maxScore: 5,
      timestamp: 1703520000,
    }, [0, 1, 2, 3, 0]);

    const parsed = parseKUPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("quiz");
    expect(parsed!.version).toBe("1");
    expect(parsed!.quiz).toBeDefined();
    expect(parsed!.quiz!.walletAddress).toBe("kaspa:qr35ennsep3hxfe7lnz5ee7j5jgmkjswssj9wksjqe");
    expect(parsed!.quiz!.courseId).toBe("intro-kaspa");
    expect(parsed!.quiz!.score).toBe(5);
    expect(parsed!.quiz!.maxScore).toBe(5);
  });

  test("isKUTransaction identifies quiz payloads", () => {
    const payload = createQuizPayload({
      walletAddress: "kaspa:test",
      courseId: "c1",
      lessonId: "l1",
      score: 1,
      maxScore: 1,
      timestamp: 1234567890,
    }, [0]);

    expect(isKUTransaction(payload)).toBe(true);
  });

  test("isKUTransaction rejects non-KU payloads", () => {
    const randomHex = stringToHex("random data");
    expect(isKUTransaction(randomHex)).toBe(false);
  });
});

describe("KU Protocol - Q&A Payloads", () => {
  test("creates valid question payload", () => {
    const payload = createQAQuestionPayload({
      lessonId: "lesson1",
      authorAddress: "kaspa:author123",
      timestamp: 1234567890,
      content: "What is Kaspa?",
    });

    expect(payload).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);
  });

  test("question payload can be parsed back", () => {
    const payload = createQAQuestionPayload({
      lessonId: "intro-lesson",
      authorAddress: "kaspa:qr35ennsep3hxfe7lnz5ee7j5jgmkjswssj9wksjqe",
      timestamp: 1703520000,
      content: "How does the DAG consensus work?",
    });

    const parsed = parseKUPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("qa_q");
    expect(parsed!.question).toBeDefined();
    expect(parsed!.question!.lessonId).toBe("intro-lesson");
    expect(parsed!.question!.content).toContain("DAG consensus");
  });

  test("creates valid answer payload", () => {
    const payload = createQAAnswerPayload({
      questionTxId: "abc123def456",
      authorAddress: "kaspa:answerer",
      timestamp: 1234567890,
      content: "GHOSTDAG enables parallel block processing.",
    });

    expect(payload).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);
  });

  test("answer payload can be parsed back", () => {
    const payload = createQAAnswerPayload({
      questionTxId: "abc123def456789",
      authorAddress: "kaspa:qr35ennsep3hxfe7lnz5ee7j5jgmkjswssj9wksjqe",
      timestamp: 1703520000,
      content: "Kaspa uses GHOSTDAG consensus.",
    });

    const parsed = parseKUPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("qa_a");
    expect(parsed!.answer).toBeDefined();
    expect(parsed!.answer!.questionTxId).toBe("abc123def456789");
    expect(parsed!.answer!.content).toContain("GHOSTDAG");
  });

  test("truncates long content to 500 chars in payload creation", () => {
    const longContent = "A".repeat(600);
    const payload = createQAQuestionPayload({
      lessonId: "lesson1",
      authorAddress: "kaspa:author123abc",
      timestamp: 1234567890,
      content: longContent,
    });

    const parsed = parseKUPayload(payload);
    expect(parsed!.question!.content).toContain("A".repeat(100));
    expect(parsed!.question!.content.length).toBeLessThanOrEqual(500);
  });
});

describe("KU Protocol - Content Hashing", () => {
  test("createContentHash produces consistent output", () => {
    const hash1 = createContentHash("test content");
    const hash2 = createContentHash("test content");
    expect(hash1).toBe(hash2);
  });

  test("createContentHash produces different hashes for different input", () => {
    const hash1 = createContentHash("content A");
    const hash2 = createContentHash("content B");
    expect(hash1).not.toBe(hash2);
  });

  test("verifyContentHash validates matching content", () => {
    const content = "This is test content";
    const hash = createContentHash(content);
    expect(verifyContentHash(content, hash)).toBe(true);
  });

  test("verifyContentHash rejects mismatched content", () => {
    const hash = createContentHash("original content");
    expect(verifyContentHash("modified content", hash)).toBe(false);
  });

  test("verifyQuizHash validates quiz results", () => {
    const lessonId = "lesson1";
    const answers = [0, 1, 2, 3];
    const score = 4;
    
    const answerString = answers.join(",");
    const expectedHash = createContentHash(`${lessonId}:${answerString}:${score}`);
    
    expect(verifyQuizHash(lessonId, answers, score, expectedHash)).toBe(true);
  });

  test("verifyQuizHash rejects tampered answers", () => {
    const lessonId = "lesson1";
    const originalAnswers = [0, 1, 2, 3];
    const tamperedAnswers = [0, 1, 2, 0];
    const score = 4;
    
    const answerString = originalAnswers.join(",");
    const hash = createContentHash(`${lessonId}:${answerString}:${score}`);
    
    expect(verifyQuizHash(lessonId, tamperedAnswers, score, hash)).toBe(false);
  });
});

describe("KU Protocol - Payload Validation", () => {
  test("validatePayloadSize accepts small payloads", () => {
    const smallPayload = stringToHex("ku:1:quiz:test");
    expect(validatePayloadSize(smallPayload)).toBe(true);
  });

  test("validatePayloadSize rejects oversized payloads", () => {
    const largeContent = "A".repeat(3000);
    const largePayload = stringToHex(`ku:1:qa_q:${largeContent}`);
    expect(validatePayloadSize(largePayload)).toBe(false);
  });

  test("parseKUPayload returns null for invalid hex", () => {
    const result = parseKUPayload("xyz");
    expect(result).toBeNull();
  });

  test("parseKUPayload returns null for non-KU data", () => {
    const randomData = stringToHex("not a ku message");
    const result = parseKUPayload(randomData);
    expect(result).toBeNull();
  });
});

describe("KU Protocol - Edge Cases", () => {
  test("handles empty string encoding", () => {
    const hex = stringToHex("");
    expect(hex).toBe("");
    const decoded = hexToString(hex);
    expect(decoded).toBe("");
  });

  test("handles special characters in content", () => {
    const content = "Test: Special chars! @#$%^&*()";
    const payload = createQAQuestionPayload({
      lessonId: "test",
      authorAddress: "kaspa:test",
      timestamp: 1234567890,
      content,
    });

    const parsed = parseKUPayload(payload);
    expect(parsed!.question!.content).toContain("Special chars");
  });

  test("handles wallet addresses with kaspa: prefix correctly", () => {
    const walletAddress = "kaspa:qr35ennsep3hxfe7lnz5ee7j5jgmkjswssj9wksjqe";
    const payload = createQuizPayload({
      walletAddress,
      courseId: "test",
      lessonId: "test",
      score: 1,
      maxScore: 1,
      timestamp: 1703520000,
    }, [0]);

    const parsed = parseKUPayload(payload);
    expect(parsed!.quiz!.walletAddress).toBe(walletAddress);
    expect(parsed!.quiz!.courseId).toBe("test");
    expect(parsed!.quiz!.lessonId).toBe("test");
    expect(parsed!.quiz!.score).toBe(1);
  });
});
