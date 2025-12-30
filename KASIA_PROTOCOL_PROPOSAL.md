# Proposal: Q&A Message Type for Kasia Protocol

**From:** Kaspa University Team  
**To:** Kasia Protocol / K-Kluster Team  
**Date:** December 2024  
**Subject:** Proposal for Standardized Q&A/Discussion Message Types

---

## Summary

We propose adding new message types to the Kasia Protocol to support structured Q&A discussions across the Kaspa ecosystem. This would enable educational platforms, support forums, and community discussions to be natively indexed and discovered by Kasia-compatible tools.

---

## Background

**Kaspa University** is a Learn-to-Earn educational platform on Kaspa that uses on-chain transactions for:
- Course completion proofs
- Q&A discussions on lessons
- Certificate issuance

We've adopted Kasia Protocol (`1:bcast:{content}`) for our Q&A system to enable ecosystem compatibility. However, plain text broadcasts lack structure for:
- Linking answers to questions
- Categorizing content by topic/lesson
- Identifying message authors independently of transaction senders

---

## Current Limitation

With plain broadcasts, Kasia indexers can discover our messages but cannot:
- Distinguish a question from an answer
- Thread replies to their parent questions
- Attribute authorship (all transactions come from our treasury wallet)

---

## Proposed Message Types

### Option A: New Top-Level Type `qa`

```
Format: 1:qa:{subtype}:{fields}

Subtypes:
- question: 1:qa:q:{topic}:{author}:{content}
- answer:   1:qa:a:{parent_tx}:{author}:{content}
- comment:  1:qa:c:{parent_tx}:{author}:{content}
```

**Example Question:**
```
1:qa:q:kaspa-ghostdag:kaspa:qz...abc:How does GHOSTDAG differ from longest-chain consensus?
```

**Example Answer:**
```
1:qa:a:abc123...txid:kaspa:qz...xyz:GHOSTDAG allows parallel blocks to coexist...
```

### Option B: Structured Broadcast with Namespace

Keep `bcast` but define a standard namespace convention:

```
Format: 1:bcast:@qa:{subtype}:{fields}
```

This preserves backwards compatibility while adding structure.

### Option C: Dedicated Discussion Type

```
Format: 1:discuss:{thread_id}:{reply_to}:{author}:{content}

Where:
- thread_id: Root question txid (or "new" for new threads)
- reply_to: Direct parent txid (or "root" if replying to thread starter)
- author: Kaspa address of the poster
- content: Message text
```

---

## Recommended Fields

| Field | Description | Required |
|-------|-------------|----------|
| `subtype` | q (question), a (answer), c (comment) | Yes |
| `topic` | Category/tag for the discussion | Optional |
| `author` | Kaspa address claiming authorship | Yes |
| `parent_tx` | Transaction ID being replied to | For answers |
| `content` | Message text (UTF-8) | Yes |

---

## Benefits for the Ecosystem

1. **Cross-Platform Discovery**: Any Kaspa app can display Q&A from any other app
2. **Unified Threading**: Indexers can rebuild conversation threads
3. **Author Attribution**: Clear authorship independent of transaction sender
4. **Topic Organization**: Enable filtering by subject/category
5. **Decentralized Forums**: Foundation for Reddit-like discussions on Kaspa

---

## Implementation Notes

### Author Verification

Since transactions may be sent by a service wallet (not the author), we suggest:

**Option 1: Trust Model**  
The sender app verifies authorship before posting. Indexers display the claimed author.

**Option 2: Embedded Signature**  
Include a signature field where the author signs the content:
```
1:qa:q:{topic}:{author}:{sig}:{content}
```
Where `sig = sign(content, author_private_key)`

This allows third parties to cryptographically verify authorship.

### Size Limits

We recommend:
- Max content: 500-1000 chars (fits comfortably in Kaspa transactions)
- Max topic: 50 chars

---

## Questions for Kasia Team

1. Would you prefer a new message type (Option A) or namespace within bcast (Option B)?
2. Is author signature verification important for the core protocol?
3. Should the Kasia indexer natively support these types, or would apps run their own?
4. What's the preferred delimiter? (We use `:` but `|` or custom might avoid conflicts)

---

## Next Steps

We're happy to:
1. Draft a formal protocol specification
2. Contribute indexer code for the new message types
3. Test implementation across Kaspa University and Kasia
4. Collaborate on any preferred approach

---

## Contact

- **GitHub**: [Kaspa University Repository]
- **Discord**: [Kaspa University Discord]
- **Kaspathon 2026**: Competing entry

We believe standardized Q&A will benefit the entire Kaspa ecosystem by enabling decentralized, permanent, on-chain discussions that any app can read and display.

---

*Thank you for considering this proposal. We look forward to collaborating with the Kasia team.*
