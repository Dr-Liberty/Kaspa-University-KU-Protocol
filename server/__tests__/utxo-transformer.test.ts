import { describe, it, expect } from 'vitest';

/**
 * UTXO Transformer Tests
 * 
 * These tests ensure the UTXO data from Kaspa RPC is correctly normalized
 * before being passed to the WASM SDK's createTransactions function.
 */

// The transformer logic extracted for testing
function normalizeUtxoEntry(utxo: any, treasuryAddress: string) {
  const amount = utxo.utxoEntry?.amount ?? utxo.amount ?? utxo.satoshis ?? BigInt(0);
  
  // scriptPublicKey can be nested: {version, scriptPublicKey} or a flat hex string
  const spkRaw = utxo.utxoEntry?.scriptPublicKey ?? utxo.scriptPublicKey ?? "";
  const scriptPublicKey = typeof spkRaw === 'object' && spkRaw.scriptPublicKey 
    ? spkRaw.scriptPublicKey 
    : spkRaw;
  
  // blockDaaScore must be BigInt for WASM SDK
  const blockDaaScoreRaw = utxo.utxoEntry?.blockDaaScore ?? utxo.blockDaaScore ?? "0";
  const blockDaaScore = BigInt(blockDaaScoreRaw);
  const isCoinbase = utxo.utxoEntry?.isCoinbase ?? utxo.isCoinbase ?? false;
  const transactionId = utxo.outpoint?.transactionId ?? utxo.transactionId ?? "";
  const index = utxo.outpoint?.index ?? utxo.index ?? 0;
  
  return {
    address: treasuryAddress,
    outpoint: {
      transactionId,
      index,
    },
    utxoEntry: {
      amount: BigInt(amount),
      scriptPublicKey,
      blockDaaScore,
      isCoinbase,
    },
  };
}

describe('UTXO Transformer', () => {
  const testAddress = 'kaspa:qrewk7s6gnzuzxvces8t7v669k2w4p9djhmuy62294mmgtj3d0yluueqwv2er';

  describe('scriptPublicKey extraction', () => {
    it('should extract scriptPublicKey from nested object structure', () => {
      // This is the actual structure returned by Kaspa RPC
      const rpcUtxo = {
        address: testAddress,
        outpoint: {
          transactionId: "44831c97eae93ccd82ca329c4f8a9162c98b0faee5a8eeff4d3a08f025cae974",
          index: 0
        },
        utxoEntry: {
          amount: "20000000",
          scriptPublicKey: {
            version: 0,
            scriptPublicKey: "20f2eb7a1a44c5c11998cc0ebf335a2d94ea84ad95f7c2694a2d77b42e516bc9feac"
          },
          blockDaaScore: "326423417",
          isCoinbase: false
        }
      };

      const result = normalizeUtxoEntry(rpcUtxo, testAddress);
      
      expect(result.utxoEntry.scriptPublicKey).toBe("20f2eb7a1a44c5c11998cc0ebf335a2d94ea84ad95f7c2694a2d77b42e516bc9feac");
      expect(typeof result.utxoEntry.scriptPublicKey).toBe('string');
    });

    it('should handle flat scriptPublicKey string', () => {
      const flatUtxo = {
        address: testAddress,
        outpoint: {
          transactionId: "abc123",
          index: 1
        },
        utxoEntry: {
          amount: "50000000",
          scriptPublicKey: "20abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ac",
          blockDaaScore: "100000",
          isCoinbase: false
        }
      };

      const result = normalizeUtxoEntry(flatUtxo, testAddress);
      
      expect(result.utxoEntry.scriptPublicKey).toBe("20abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ac");
    });

    it('should handle scriptPublicKey at top level (legacy format)', () => {
      const legacyUtxo = {
        transactionId: "def456",
        index: 2,
        amount: "30000000",
        scriptPublicKey: "20fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321ac",
        blockDaaScore: "200000",
        isCoinbase: false
      };

      const result = normalizeUtxoEntry(legacyUtxo, testAddress);
      
      expect(result.utxoEntry.scriptPublicKey).toBe("20fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321ac");
    });
  });

  describe('amount handling', () => {
    it('should convert string amount to BigInt', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "123456789",
          scriptPublicKey: "abcd",
          blockDaaScore: "0",
          isCoinbase: false
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.amount).toBe(BigInt(123456789));
    });

    it('should handle BigInt amount directly', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: BigInt(987654321),
          scriptPublicKey: "abcd",
          blockDaaScore: "0",
          isCoinbase: false
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.amount).toBe(BigInt(987654321));
    });

    it('should handle satoshis field (alternative naming)', () => {
      const utxo = {
        transactionId: "xyz",
        index: 0,
        satoshis: "50000000",
        scriptPublicKey: "efgh"
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.amount).toBe(BigInt(50000000));
    });

    it('should default to 0 for missing amount', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          scriptPublicKey: "abcd",
          blockDaaScore: "0",
          isCoinbase: false
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.amount).toBe(BigInt(0));
    });
  });

  describe('outpoint handling', () => {
    it('should extract outpoint from nested structure', () => {
      const utxo = {
        outpoint: {
          transactionId: "nestedTxId123",
          index: 5
        },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: "abc"
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.outpoint.transactionId).toBe("nestedTxId123");
      expect(result.outpoint.index).toBe(5);
    });

    it('should extract outpoint from flat structure', () => {
      const utxo = {
        transactionId: "flatTxId456",
        index: 3,
        amount: "2000",
        scriptPublicKey: "def"
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.outpoint.transactionId).toBe("flatTxId456");
      expect(result.outpoint.index).toBe(3);
    });
  });

  describe('optional fields', () => {
    it('should default blockDaaScore to BigInt(0)', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: "xyz"
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.blockDaaScore).toBe(BigInt(0));
    });

    it('should convert string blockDaaScore to BigInt', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: "xyz",
          blockDaaScore: "326423417"
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.blockDaaScore).toBe(BigInt(326423417));
    });

    it('should default isCoinbase to false', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: "xyz"
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.isCoinbase).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty scriptPublicKey object', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: {}
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      // Empty object without inner scriptPublicKey property falls back to the object itself
      // This edge case would fail in WASM but tests the extraction logic
      expect(result.utxoEntry.scriptPublicKey).toEqual({});
    });

    it('should handle null scriptPublicKey', () => {
      const utxo = {
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: null
        }
      };

      const result = normalizeUtxoEntry(utxo, testAddress);
      
      expect(result.utxoEntry.scriptPublicKey).toBe("");
    });

    it('should always set the provided treasury address', () => {
      const customAddress = "kaspa:qtest123";
      const utxo = {
        address: "kaspa:qdifferent456",
        outpoint: { transactionId: "abc", index: 0 },
        utxoEntry: {
          amount: "1000",
          scriptPublicKey: "xyz"
        }
      };

      const result = normalizeUtxoEntry(utxo, customAddress);
      
      expect(result.address).toBe(customAddress);
    });
  });
});
