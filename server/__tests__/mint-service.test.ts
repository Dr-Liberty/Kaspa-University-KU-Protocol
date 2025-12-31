/**
 * Mint Service Integration Tests for Kaspa University
 * 
 * Tests cover:
 * - Concurrent reservation handling
 * - TokenId recycling on cancel/expire
 * - Supply tracking accuracy
 * - Transaction safety for confirm/cancel operations
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { MemStorage } from "../storage";

describe("Mint Service - Supply Tracking", () => {
  let storage: MemStorage;
  const testCourseId = "course-1";
  const testCourseIndex = 0;
  const MAX_TOKENS = 1000;

  beforeEach(async () => {
    storage = new MemStorage();
    await storage.initializeCourseTokenCounter(testCourseId, testCourseIndex);
  });

  test("reserveTokenId assigns sequential tokenIds", async () => {
    const token1 = await storage.reserveTokenId(testCourseId);
    const token2 = await storage.reserveTokenId(testCourseId);
    const token3 = await storage.reserveTokenId(testCourseId);

    expect(token1).toBe(1);
    expect(token2).toBe(2);
    expect(token3).toBe(3);
  });

  test("reserveTokenId returns null when counter exhausted and no recycled tokens", async () => {
    const counter = await storage.getCourseTokenCounter(testCourseId);
    if (counter) {
      counter.nextTokenOffset = MAX_TOKENS;
    }

    const token = await storage.reserveTokenId(testCourseId);
    expect(token).toBeNull();
  });

  test("recycleTokenId adds tokenId back to pool", async () => {
    const token1 = await storage.reserveTokenId(testCourseId);
    expect(token1).toBe(1);

    await storage.recycleTokenId(testCourseId, token1!);

    const recycledToken = await storage.reserveTokenId(testCourseId);
    expect(recycledToken).toBe(1);
  });

  test("recycled tokenIds are used before incrementing counter", async () => {
    const token1 = await storage.reserveTokenId(testCourseId);
    const token2 = await storage.reserveTokenId(testCourseId);
    const token3 = await storage.reserveTokenId(testCourseId);

    await storage.recycleTokenId(testCourseId, token2!);

    const newToken = await storage.reserveTokenId(testCourseId);
    expect(newToken).toBe(2);

    const token4 = await storage.reserveTokenId(testCourseId);
    expect(token4).toBe(4);
  });

  test("sold out course with recycled tokens allows minting", async () => {
    const counter = await storage.getCourseTokenCounter(testCourseId);
    if (counter) {
      counter.nextTokenOffset = MAX_TOKENS;
    }

    await storage.recycleTokenId(testCourseId, 500);

    const token = await storage.reserveTokenId(testCourseId);
    expect(token).toBe(500);
  });

  test("duplicate recycleTokenId is prevented", async () => {
    const token1 = await storage.reserveTokenId(testCourseId);
    
    await storage.recycleTokenId(testCourseId, token1!);
    await storage.recycleTokenId(testCourseId, token1!);

    const recycled1 = await storage.reserveTokenId(testCourseId);
    const recycled2 = await storage.reserveTokenId(testCourseId);

    expect(recycled1).toBe(1);
    expect(recycled2).toBe(2);
  });
});

describe("Mint Service - Reservation Lifecycle", () => {
  let storage: MemStorage;
  const testCourseId = "course-1";
  const testCourseIndex = 0;
  const testWallet = "kaspa:qtest123";
  const testCertificateId = "cert-1";

  beforeEach(async () => {
    storage = new MemStorage();
    await storage.initializeCourseTokenCounter(testCourseId, testCourseIndex);
  });

  test("createMintReservation creates valid reservation", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await storage.createMintReservation({
      certificateId: testCertificateId,
      courseId: testCourseId,
      walletAddress: testWallet,
      tokenId: tokenId!,
      inscriptionJson: '{"op":"mint"}',
      status: "reserved",
      expiresAt,
    });

    expect(reservation.tokenId).toBe(1);
    expect(reservation.status).toBe("reserved");
    expect(reservation.walletAddress).toBe(testWallet);
  });

  test("cancelMintReservation recycles tokenId atomically", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await storage.createMintReservation({
      certificateId: testCertificateId,
      courseId: testCourseId,
      walletAddress: testWallet,
      tokenId: tokenId!,
      inscriptionJson: '{"op":"mint"}',
      status: "reserved",
      expiresAt,
    });

    const result = await storage.cancelMintReservation(reservation.id);
    expect(result.success).toBe(true);
    expect(result.reservation?.status).toBe("cancelled");

    const recycledToken = await storage.reserveTokenId(testCourseId);
    expect(recycledToken).toBe(1);
  });

  test("confirmMintReservation updates status to minted", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await storage.createMintReservation({
      certificateId: testCertificateId,
      courseId: testCourseId,
      walletAddress: testWallet,
      tokenId: tokenId!,
      inscriptionJson: '{"op":"mint"}',
      status: "reserved",
      expiresAt,
    });

    const txHash = "abc123def456";
    const result = await storage.confirmMintReservation(reservation.id, txHash);
    
    expect(result.success).toBe(true);
    expect(result.reservation?.status).toBe("minted");
    expect(result.reservation?.mintTxHash).toBe(txHash);
  });

  test("confirmMintReservation fails for expired reservation", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() - 1000);

    const reservation = await storage.createMintReservation({
      certificateId: testCertificateId,
      courseId: testCourseId,
      walletAddress: testWallet,
      tokenId: tokenId!,
      inscriptionJson: '{"op":"mint"}',
      status: "reserved",
      expiresAt,
    });

    const result = await storage.confirmMintReservation(reservation.id, "txhash");
    expect(result.success).toBe(false);
    expect(result.error).toContain("expired");
  });

  test("expireOldReservations recycles tokenIds", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() - 1000);

    await storage.createMintReservation({
      certificateId: testCertificateId,
      courseId: testCourseId,
      walletAddress: testWallet,
      tokenId: tokenId!,
      inscriptionJson: '{"op":"mint"}',
      status: "reserved",
      expiresAt,
    });

    const expiredCount = await storage.expireOldReservations();
    expect(expiredCount).toBe(1);

    const recycledToken = await storage.reserveTokenId(testCourseId);
    expect(recycledToken).toBe(1);
  });
});

describe("Mint Service - Concurrent Operations", () => {
  let storage: MemStorage;
  const testCourseId = "course-1";
  const testCourseIndex = 0;

  beforeEach(async () => {
    storage = new MemStorage();
    await storage.initializeCourseTokenCounter(testCourseId, testCourseIndex);
  });

  test("concurrent reservations get unique tokenIds", async () => {
    const reservations = await Promise.all([
      storage.reserveTokenId(testCourseId),
      storage.reserveTokenId(testCourseId),
      storage.reserveTokenId(testCourseId),
      storage.reserveTokenId(testCourseId),
      storage.reserveTokenId(testCourseId),
    ]);

    const uniqueTokens = new Set(reservations);
    expect(uniqueTokens.size).toBe(5);
    expect(reservations).toContain(1);
    expect(reservations).toContain(2);
    expect(reservations).toContain(3);
    expect(reservations).toContain(4);
    expect(reservations).toContain(5);
  });

  test("concurrent reserve and cancel operations maintain supply integrity", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await storage.createMintReservation({
      certificateId: "cert-1",
      courseId: testCourseId,
      walletAddress: "kaspa:qtest",
      tokenId: tokenId!,
      inscriptionJson: '{}',
      status: "reserved",
      expiresAt,
    });

    const [cancelResult, newToken1, newToken2] = await Promise.all([
      storage.cancelMintReservation(reservation.id),
      storage.reserveTokenId(testCourseId),
      storage.reserveTokenId(testCourseId),
    ]);

    expect(cancelResult.success).toBe(true);

    const allTokens = [tokenId, newToken1, newToken2].filter(t => t !== null);
    expect(allTokens.length).toBeGreaterThanOrEqual(2);
  });

  test("multiple courses have isolated tokenId pools", async () => {
    const course2Id = "course-2";
    await storage.initializeCourseTokenCounter(course2Id, 1);

    const token1Course1 = await storage.reserveTokenId(testCourseId);
    const token1Course2 = await storage.reserveTokenId(course2Id);
    const token2Course1 = await storage.reserveTokenId(testCourseId);
    const token2Course2 = await storage.reserveTokenId(course2Id);

    expect(token1Course1).toBe(1);
    expect(token2Course1).toBe(2);
    expect(token1Course2).toBe(1001);
    expect(token2Course2).toBe(1002);
  });
});

describe("Mint Service - Edge Cases", () => {
  let storage: MemStorage;
  const testCourseId = "course-1";
  const testCourseIndex = 0;

  beforeEach(async () => {
    storage = new MemStorage();
    await storage.initializeCourseTokenCounter(testCourseId, testCourseIndex);
  });

  test("getMintedTokenCount returns correct count", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const reservation = await storage.createMintReservation({
      certificateId: "cert-1",
      courseId: testCourseId,
      walletAddress: "kaspa:qtest",
      tokenId: tokenId!,
      inscriptionJson: '{}',
      status: "reserved",
      expiresAt,
    });

    let count = await storage.getMintedTokenCount(testCourseId);
    expect(count).toBe(0);

    await storage.confirmMintReservation(reservation.id, "txhash");
    
    count = await storage.getMintedTokenCount(testCourseId);
    expect(count).toBe(1);
  });

  test("getActiveMintReservation returns active reservation", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const wallet = "kaspa:qtest123";

    await storage.createMintReservation({
      certificateId: "cert-1",
      courseId: testCourseId,
      walletAddress: wallet,
      tokenId: tokenId!,
      inscriptionJson: '{}',
      status: "reserved",
      expiresAt,
    });

    const active = await storage.getActiveMintReservation(wallet, testCourseId);
    expect(active).not.toBeNull();
    expect(active?.walletAddress).toBe(wallet);
  });

  test("getActiveMintReservation returns null for expired reservation", async () => {
    const tokenId = await storage.reserveTokenId(testCourseId);
    const expiresAt = new Date(Date.now() - 1000);
    const wallet = "kaspa:qtest123";

    await storage.createMintReservation({
      certificateId: "cert-1",
      courseId: testCourseId,
      walletAddress: wallet,
      tokenId: tokenId!,
      inscriptionJson: '{}',
      status: "reserved",
      expiresAt,
    });

    const active = await storage.getActiveMintReservation(wallet, testCourseId);
    expect(active).toBeFalsy();
  });

  test("reserveTokenId returns null for non-existent course", async () => {
    const token = await storage.reserveTokenId("non-existent-course");
    expect(token).toBeNull();
  });
});
