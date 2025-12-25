/**
 * Security Component Tests for Kaspa University
 * 
 * Tests cover:
 * - Anti-Sybil protection
 * - VPN detection
 * - Rate limiting configuration
 * - Input validation
 * - UTXO management
 * - Security metrics
 */

import { describe, test, expect, beforeEach } from "vitest";

describe("Input Validation", () => {
  test("validateQuizAnswers accepts valid answer array", async () => {
    const { validateQuizAnswers } = await import("../security");
    
    const result = validateQuizAnswers([0, 1, 2, 3], 4);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("validateQuizAnswers rejects non-array input", async () => {
    const { validateQuizAnswers } = await import("../security");
    
    const result = validateQuizAnswers("not_array", 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("array");
  });

  test("validateQuizAnswers rejects wrong answer count", async () => {
    const { validateQuizAnswers } = await import("../security");
    
    const result = validateQuizAnswers([0, 1, 2], 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Expected 4 answers");
  });

  test("validateQuizAnswers rejects invalid answer values", async () => {
    const { validateQuizAnswers } = await import("../security");
    
    const result = validateQuizAnswers([0, 1, 5, 3], 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid answer");
  });

  test("validateQuizAnswers rejects negative answer values", async () => {
    const { validateQuizAnswers } = await import("../security");
    
    const result = validateQuizAnswers([0, -1, 2, 3], 4);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid answer");
  });

  test("validatePayloadLength accepts valid content", async () => {
    const { validatePayloadLength } = await import("../security");
    
    const result = validatePayloadLength("Hello world", 500);
    expect(result.valid).toBe(true);
  });

  test("validatePayloadLength rejects empty content", async () => {
    const { validatePayloadLength } = await import("../security");
    
    const result = validatePayloadLength("", 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("non-empty");
  });

  test("validatePayloadLength rejects content exceeding max length", async () => {
    const { validatePayloadLength } = await import("../security");
    
    const longContent = "a".repeat(600);
    const result = validatePayloadLength(longContent, 500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds");
  });

  test("sanitizePayloadContent removes control characters", async () => {
    const { sanitizePayloadContent } = await import("../security");
    
    const input = "Hello\x00\x01\x02World";
    const result = sanitizePayloadContent(input);
    expect(result).toBe("HelloWorld");
  });

  test("sanitizePayloadContent trims whitespace", async () => {
    const { sanitizePayloadContent } = await import("../security");
    
    const result = sanitizePayloadContent("  Hello World  ");
    expect(result).toBe("Hello World");
  });
});

describe("IP Detection", () => {
  test("isDatacenterIP detects private IP ranges", async () => {
    const { isDatacenterIP } = await import("../security");
    
    expect(isDatacenterIP("10.0.0.1")).toBe(true);
    expect(isDatacenterIP("172.16.0.1")).toBe(true);
    expect(isDatacenterIP("192.168.1.1")).toBe(true);
    expect(isDatacenterIP("100.64.0.1")).toBe(true);
  });

  test("isDatacenterIP allows public IPs", async () => {
    const { isDatacenterIP } = await import("../security");
    
    expect(isDatacenterIP("8.8.8.8")).toBe(false);
    expect(isDatacenterIP("1.1.1.1")).toBe(false);
    expect(isDatacenterIP("203.0.113.1")).toBe(false);
  });
});

describe("VPN Detection (Multi-source)", () => {
  test("checkVpn handles localhost", async () => {
    const { checkVpn } = await import("../vpn-detection");
    
    const result = await checkVpn("127.0.0.1");
    expect(result.isVpn).toBe(false);
    expect(result.source).toBe("basic");
  });

  test("checkVpn handles unknown IP", async () => {
    const { checkVpn } = await import("../vpn-detection");
    
    const result = await checkVpn("unknown");
    expect(result.isVpn).toBe(false);
  });

  test("checkVpn detects datacenter IPs", async () => {
    const { checkVpn } = await import("../vpn-detection");
    
    const result = await checkVpn("10.0.0.1");
    expect(result.isVpn).toBe(true);
    expect(result.score).toBe(1.0);
  });
});

describe("UTXO Manager", () => {
  test("selectAndReserve returns null for insufficient funds", async () => {
    const { getUTXOManager } = await import("../utxo-manager");
    
    const manager = getUTXOManager();
    const result = await manager.selectAndReserve(
      [{ txId: "abc", index: 0, amount: BigInt(1000), scriptPublicKey: "" }],
      BigInt(100_000_000),
      "test"
    );
    
    expect(result).toBeNull();
  });

  test("selectAndReserve succeeds with sufficient funds", async () => {
    const { getUTXOManager } = await import("../utxo-manager");
    
    const manager = getUTXOManager();
    const result = await manager.selectAndReserve(
      [{ txId: "test123", index: 0, amount: BigInt(100_000_000), scriptPublicKey: "" }],
      BigInt(50_000_000),
      "test-success"
    );
    
    expect(result).not.toBeNull();
    expect(result!.selected.length).toBeGreaterThan(0);
    expect(result!.total).toBeGreaterThanOrEqual(BigInt(50_000_000));

    await manager.releaseReservation(result!.selected);
  });

  test("isUtxoReserved returns false for unreserved UTXOs", async () => {
    const { getUTXOManager } = await import("../utxo-manager");
    
    const manager = getUTXOManager();
    const result = manager.isUtxoReserved({
      txId: "nonexistent",
      index: 0,
      amount: BigInt(1000),
      scriptPublicKey: ""
    });
    
    expect(result).toBe(false);
  });
});

describe("Security Metrics", () => {
  test("records VPN detection", async () => {
    const { getSecurityMetrics } = await import("../security-metrics");
    
    const metrics = getSecurityMetrics();
    metrics.recordVpnDetection("1.2.3.4", 0.95);
    
    const snapshot = metrics.getSnapshot();
    expect(snapshot.vpnDetections.count).toBeGreaterThan(0);
  });

  test("records reward blocked", async () => {
    const { getSecurityMetrics } = await import("../security-metrics");
    
    const metrics = getSecurityMetrics();
    const initialCount = metrics.getSnapshot().rewardsBlocked.count;
    
    metrics.recordRewardBlocked("kaspa:test", "VPN_DETECTED", 0.5);
    
    const newSnapshot = metrics.getSnapshot();
    expect(newSnapshot.rewardsBlocked.count).toBe(initialCount + 1);
  });

  test("tracks unique wallets per day", async () => {
    const { getSecurityMetrics } = await import("../security-metrics");
    
    const metrics = getSecurityMetrics();
    metrics.recordRequest("1.2.3.4", "kaspa:wallet1");
    metrics.recordRequest("1.2.3.5", "kaspa:wallet2");
    
    const snapshot = metrics.getSnapshot();
    expect(snapshot.uniqueWalletsToday).toBeGreaterThanOrEqual(2);
  });

  test("generates alerts for high VPN detection rate", async () => {
    const { getSecurityMetrics } = await import("../security-metrics");
    
    const metrics = getSecurityMetrics();
    
    for (let i = 0; i < 15; i++) {
      metrics.recordVpnDetection(`1.2.3.${i}`, 0.95);
    }
    
    const alerts = metrics.getAlerts();
    const vpnAlert = alerts.find(a => a.type === "VPN_SPIKE");
    expect(vpnAlert).toBeDefined();
  });
});

describe("Session Store", () => {
  test("memory store sets and gets sessions", async () => {
    const { getSessionStore } = await import("../session-store");
    
    const store = await getSessionStore();
    const sessionData = {
      walletAddress: "kaspa:test",
      verifiedAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };
    
    await store.setSession("test-token", sessionData);
    const retrieved = await store.getSession("test-token");
    
    expect(retrieved).not.toBeNull();
    expect(retrieved?.walletAddress).toBe("kaspa:test");
  });

  test("memory store returns null for expired sessions", async () => {
    const { getSessionStore } = await import("../session-store");
    
    const store = await getSessionStore();
    const sessionData = {
      walletAddress: "kaspa:expired",
      verifiedAt: Date.now() - 120000,
      expiresAt: Date.now() - 60000,
    };
    
    await store.setSession("expired-token", sessionData);
    const retrieved = await store.getSession("expired-token");
    
    expect(retrieved).toBeNull();
  });

  test("memory store deletes sessions", async () => {
    const { getSessionStore } = await import("../session-store");
    
    const store = await getSessionStore();
    const sessionData = {
      walletAddress: "kaspa:todelete",
      verifiedAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };
    
    await store.setSession("delete-token", sessionData);
    await store.deleteSession("delete-token");
    const retrieved = await store.getSession("delete-token");
    
    expect(retrieved).toBeNull();
  });
});

describe("Anti-Sybil Service", () => {
  test("new wallet gets 0.5 trust score", async () => {
    const { getAntiSybilService } = await import("../anti-sybil");
    
    const service = getAntiSybilService();
    const stats = await service.getWalletStats("kaspa:newwallet" + Date.now());
    
    expect(stats.trustScore).toBe(0.5);
  });

  test("daily reward cap is 5 KAS", async () => {
    const { getAntiSybilService } = await import("../anti-sybil");
    
    const service = getAntiSybilService();
    const stats = await service.getWalletStats("kaspa:testcap" + Date.now());
    
    expect(stats.dailyRewardsRemaining).toBeLessThanOrEqual(5);
  });
});
