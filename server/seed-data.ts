// BMT University Course Import - 16 Courses, 69 Lessons
// Peer-reviewed content from bmtuniversity.com
// Generated for Kaspa University (Kaspathon 2025)

import type { Course, Lesson, QuizQuestion } from "@shared/schema";

const courses: Course[] = [
      {
        id: "bitcoin-vs-kaspa",
        title: "Bitcoin vs Kaspa: The Next Evolution",
        description: "Bitcoin revolutionized money. Kaspa revolutionizes Bitcoin.",
        thumbnail: "/thumbnails/bitcoin_evolving_to_kaspa.png",
        lessonCount: 15,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "dag-terminology",
        title: "DAG Terminology",
        description: "Past, Future, Anticone, Mergeset, K parameter, what does it all mean?",
        thumbnail: "/thumbnails/dag_terminology_visualization.png",
        lessonCount: 8,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Development",
      },
      {
        id: "dag-and-kaspa",
        title: "DAG and Kaspa: Understanding the Structure",
        description: "By now you have probably heard that Kaspa is a BlockDAG, but what does that mean? This course assumes no prior knowledge, starting with graph theory fundamentals.",
        thumbnail: "/thumbnails/dag_structure_visualization.png",
        lessonCount: 5,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "foundational-concepts",
        title: "Foundational Concepts",
        description: "Understanding the basic building blocks of Kaspa's architecture. This course introduces the fundamental concepts that underpin Kaspa's revolutionary consensus system, including Directed Acyclic Graphs (DAGs), essential terminology, the GHOSTDAG proto",
        thumbnail: "/thumbnails/foundational_concepts_building_blocks.png",
        lessonCount: 5,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "core-data-structures",
        title: "Core Data Structures",
        description: "The fundamental data types that represent blockchain state in Kaspa. This course covers the essential data structures including UTXO (Unspent Transaction Outputs), MuHash for cryptographic commitments, Merkle Roots for transaction verification, and t",
        thumbnail: "/thumbnails/core_data_structures_visual.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Fundamentals",
      },
      {
        id: "ghostdag-mechanics",
        title: "GHOSTDAG Mechanics",
        description: "A deep dive into the GHOSTDAG consensus algorithm implementation. This course covers the K Parameter, Parent Selection and Ordering, Mergeset Creation, Blue and Red Classification, and Blue Work Calculation.",
        thumbnail: "/thumbnails/ghostdag_mechanics_visualization.png",
        lessonCount: 5,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Consensus",
      },
      {
        id: "consensus-parameters",
        title: "Consensus Parameters",
        description: "Configuration values that govern Kaspa's network behavior. Learn about the mathematical relationships between BPS, K parameter, mergeset limits, merge depth bounds, finality depth, DAA windows, and pruning depth.",
        thumbnail: "/thumbnails/consensus_parameters_controls.png",
        lessonCount: 6,
        kasReward: 0.1,
        difficulty: "advanced",
        category: "Consensus",
      },
      {
        id: "block-processing",
        title: "Block Processing",
        description: "How blocks flow through Kaspa's validation pipeline. Learn the complete journey of a block from creation through header validation, body validation, virtual chain updates, and pruning consideration.",
        thumbnail: "/thumbnails/block_processing_pipeline.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "difficulty-adjustment",
        title: "Difficulty Adjustment (DAA)",
        description: "How Kaspa maintains consistent block times through its Difficulty Adjustment Algorithm. Learn about DAA windows, the difference between DAA Score and Blue Score, and how non-DAA blocks are handled.",
        thumbnail: "/thumbnails/difficulty_adjustment_algorithm.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "transaction-processing",
        title: "Transaction Processing",
        description: "How transactions are validated and included in Kaspa blocks. Learn about the UTXO model in transaction context, selection strategies, mass calculation, and coinbase transactions.",
        thumbnail: "/thumbnails/transaction_processing_flow.png",
        lessonCount: 3,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "pruning-system",
        title: "Pruning System",
        description: "Managing blockchain data growth in Kaspa. Learn about MuHash's role, first-order and second-order pruning, and the differences between archival and pruning nodes.",
        thumbnail: "/thumbnails/blockchain_pruning_system.png",
        lessonCount: 3,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "anticone-finalization",
        title: "Anticone Finalization & Safe Pruning",
        description: "Mathematical foundations for safe data removal in Kaspa. Learn how DAG terminology, finality depth, merge depth bounds, and K parameter work together to guarantee that pruning old data never compromises security.",
        thumbnail: "/thumbnails/anticone_finalization_concept.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "advanced",
        category: "Technical",
      },
      {
        id: "virtual-state",
        title: "Virtual State",
        description: "Kaspa's unique approach to representing the current DAG tip. Learn about the Virtual Block concept, sink selection, virtual parents, and virtual DAA score.",
        thumbnail: "/thumbnails/virtual_state_visualization.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "advanced",
        category: "Technical",
      },
      {
        id: "timestamps-median-time",
        title: "Timestamps & Median Time",
        description: "Timestamp consensus and validation in Kaspa. Learn about Past Median Time calculation and timestamp validation rules.",
        thumbnail: "/thumbnails/timestamps_and_median_time.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "finality-security",
        title: "Finality & Security",
        description: "Understanding Kaspa's security guarantees. Learn about K parameter security properties, depth-based security, size constraints, probabilistic and deterministic finality.",
        thumbnail: "/thumbnails/finality_and_security_shield.png",
        lessonCount: 3,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Fundamentals",
      },
      {
        id: "network-scaling",
        title: "Network & Scaling",
        description: "Why Kaspa's architecture enables high throughput. Learn about Bitcoin's scaling limitations and how Kaspa overcomes them through BPS configuration, K parameter scaling, and merge depth bounds.",
        thumbnail: "/thumbnails/network_scaling_visualization.png",
        lessonCount: 2,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Fundamentals",
      },
    ];

    const allLessons: Lesson[] = [
      {
        id: "lesson-1-1",
        courseId: "bitcoin-vs-kaspa",
        title: "Bitcoin's Revolutionary Promise",
        order: 1,
        duration: "5 min",
        content: `<p>In 2009, Satoshi Nakamoto published a whitepaper titled:</p>
<p>"Bitcoin: A Peer-to-Peer Electronic Cash System"</p>
<p>The very first line stated the vision clearly:</p>
<p>"A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution."</p>
<p>This was revolutionary. No banks. No governments. No middlemen. Just math, consensus, and direct person-to-person transactions.</p>
<p>Satoshi also wrote:</p>
<p>"What is needed is an electronic payment system based on cryptographic proof instead of trust, allowing any two willing parties to transact directly with each other without the need for a trusted third party."</p>
<p>Bitcoin proved this was possible. Strangers across the globe could agree on a shared truth without trusting each other.</p>
<p>But as Bitcoin grew, limitations emerged. To ensure security and decentralization, Bitcoin processes only about 7 transactions per second. A new block appears roughly every 10 minutes. As adoption grew, so did fees and wait times.</p>
<p>The peer-to-peer electronic CASH system became more of a store of value - digital gold rather than digital cash.</p>
<p>But what if you didn't have to choose?</p>`,
      },
      {
        id: "lesson-1-2",
        courseId: "bitcoin-vs-kaspa",
        title: "The Scalability Trilemma",
        order: 2,
        duration: "5 min",
        content: `<p>Satoshi identified the core problem in the whitepaper's opening:</p>
<p>"Commerce on the Internet has come to rely almost exclusively on financial institutions serving as trusted third parties to process electronic payments. While the system works well enough for most transactions, it still suffers from the inherent weaknesses of the trust based model."</p>
<p>Bitcoin solved the trust problem. But another challenge emerged - the "scalability trilemma."</p>
<p>Blockchain developers realized you can only optimize for two of three properties:</p>
<p>• DECENTRALIZATION - Anyone can participate, no central authority
• SECURITY - The network is resistant to attacks  
• SCALABILITY - The network can handle high transaction volume</p>
<p>Bitcoin chose decentralization and security. Visa chose scalability and security (centralized). Many altcoins chose scalability and decentralization (often at the cost of security).</p>
<p>The chain structure - one block after another - is what creates the bottleneck. Security requires work. Work takes time. The chain forces blocks to wait in line.</p>
<p>For years, people believed this trilemma was unsolvable. The blockchain structure itself seemed to force these tradeoffs.</p>
<p>Then came a question: What if the problem wasn't the consensus mechanism, but the CHAIN structure itself?</p>`,
      },
      {
        id: "lesson-1-3",
        courseId: "bitcoin-vs-kaspa",
        title: "Enter Kaspa",
        order: 3,
        duration: "5 min",
        content: `<p>Satoshi's vision was clear: peer-to-peer electronic CASH. Not digital gold. Not a settlement layer. CASH - something you could use for everyday transactions.</p>
<p>But as Bitcoin grew, that vision became impractical. Waiting 10 minutes for coffee. Paying $20 fees for small transactions. The peer-to-peer cash system became a store of value.</p>
<p>Enter Kaspa.</p>
<p>Kaspa was created by Dr. Yonatan Sompolinsky - a Harvard doctorate holder and one of the most cited researchers in cryptography worldwide. He had been studying Bitcoin's limitations since 2013. His groundbreaking academic papers on blockchain scaling were so influential they were cited by Ethereum's founders.</p>
<p>His insight: Bitcoin's bottleneck isn't proof-of-work. It's the CHAIN.</p>
<p>A blockchain requires blocks to form a single file line. Each block references exactly one parent. If two miners find blocks at the same time, one gets orphaned. Wasted work. Wasted energy.</p>
<p>Dr. Sompolinsky asked: What if ALL valid blocks counted?</p>
<p>Instead of a chain, Kaspa uses a BlockDAG (Directed Acyclic Graph) - a structure where blocks can have multiple parents. No orphans. No wasted work. Parallel processing.</p>
<p>Same proof-of-work security Satoshi designed. Same decentralization he championed. But fundamentally faster by design.</p>
<p>Kaspa doesn't abandon Bitcoin's principles - it fulfills Satoshi's original vision: true peer-to-peer electronic cash that's actually fast enough to use as cash.</p>`,
      },
      {
        id: "lesson-1-4",
        courseId: "bitcoin-vs-kaspa",
        title: "Understanding the Chain",
        order: 4,
        duration: "5 min",
        content: `<p>Picture a blockchain like a train track - one rail, one direction. Each train car (block) connects to exactly one car in front of it.</p>
<p>If two trains try to add cars at the same time, only one wins. The other is abandoned - an "orphan block." All the work that went into mining that orphan? Wasted.</p>
<p>Bitcoin's solution: slow down. Make blocks so infrequent (10 minutes) that simultaneous discoveries are rare. This works, but it creates a fundamental speed limit.</p>
<p>The chain structure FORCES this tradeoff. You can't just "make Bitcoin faster" without breaking its security model. The architecture itself is the constraint.</p>`,
      },
      {
        id: "lesson-1-5",
        courseId: "bitcoin-vs-kaspa",
        title: "The DAG Difference",
        order: 5,
        duration: "5 min",
        content: `<p>Now picture a river delta - water flowing through multiple channels, all heading to the same ocean. Multiple paths. Multiple streams. All valid.</p>
<p>That's a DAG (Directed Acyclic Graph). In Kaspa's BlockDAG:</p>
<p>• Blocks can reference MULTIPLE parent blocks
• Parallel blocks are ALL included, not orphaned  
• No work is wasted
• The network processes multiple blocks per second</p>
<p>When two miners find blocks simultaneously, BOTH blocks become part of the permanent record. They reference each other. The DAG weaves them together.</p>
<p>This isn't a minor tweak - it's a fundamental reimagining of how distributed consensus can work.</p>`,
      },
      {
        id: "lesson-1-6",
        courseId: "bitcoin-vs-kaspa",
        title: "GHOSTDAG: Ordering the Chaos",
        order: 6,
        duration: "6 min",
        content: `<p>Having parallel blocks creates a new problem: how do you order transactions when blocks arrive simultaneously?</p>
<p>Dr. Yonatan Sompolinsky solved this with GHOSTDAG (Greedy Heaviest-Observed SubDAG) - a consensus protocol born from his years of research at Harvard and his deep expertise in distributed systems.</p>
<p>GHOSTDAG does something clever:
1. It identifies the "main" chain of blocks (the heaviest path through the DAG)
2. Parallel blocks are ordered relative to this main chain
3. Transactions get a deterministic order that all nodes agree on</p>
<p>The result: you get the speed of parallel processing with the consistency of a sequential chain.</p>
<p>Bitcoin maximalists often ask: "But how do you prevent double-spends without a single chain?"</p>
<p>GHOSTDAG is the answer. Dr. Sompolinsky's research proved mathematically that you can achieve the same security guarantees as Bitcoin's longest-chain rule, just faster. This wasn't a guess or a hope - it was rigorous academic work, peer-reviewed and cited by the best minds in cryptography.</p>
<p>The protocol provides the same guarantees as Bitcoin's longest-chain rule, but without the 10-minute wait.</p>`,
      },
      {
        id: "lesson-1-7",
        courseId: "bitcoin-vs-kaspa",
        title: "Visual: Chain vs DAG",
        order: 7,
        duration: "4 min",
        content: `<p>BITCOIN (Blockchain):</p>
<p>Block 1 → Block 2 → Block 3 → Block 4
                              ↗ (orphaned)
                    Block 3b </p>
<p>One path forward. Orphans discarded. Slow and steady.</p>
<p>---</p>
<p>KASPA (BlockDAG):</p>
<p>        Block 2a ──────┐
       ↗              ↘
Block 1 → Block 2b → Block 3 → Block 4
       ↘              ↗
        Block 2c ──────┘</p>
<p>Multiple paths merged. All work counts. Fast and secure.</p>
<p>---</p>
<p>The key insight: BlockDAG doesn't sacrifice security for speed. It removes the artificial bottleneck that chains create.</p>`,
      },
      {
        id: "lesson-1-8",
        courseId: "bitcoin-vs-kaspa",
        title: "The Speed Comparison",
        order: 8,
        duration: "5 min",
        content: `<p>Let's talk numbers.</p>
<p>BITCOIN:
• Block time: ~10 minutes
• Blocks per second: 0.0017 (one block every 600 seconds)
• Transactions per second: ~7
• Confirmation time: 10-60 minutes (for confidence)</p>
<p>KASPA (Current):
• Block time: 100 milliseconds
• Blocks per second: 10
• Transactions per second: 100+ (and growing)
• Confirmation time: ~10 seconds with high confidence</p>
<p>KASPA (Roadmap - Next 1-3 Years):
• Blocks per second: 100
• Even faster confirmations
• Massive throughput increase</p>
<p>Kaspa currently produces 10 blocks EVERY SECOND. That's 6,000 times more frequent than Bitcoin. And the network is designed to scale to 100 blocks per second.</p>
<p>But wait - wouldn't faster blocks mean less security? That's what traditional blockchain thinking says. </p>
<p>The assumption was: fast blocks = more orphans = wasted work = centralization pressure.</p>
<p>Dr. Sompolinsky's BlockDAG breaks this assumption. Parallel blocks aren't orphaned - they're all included. Speed doesn't compromise security when you remove the chain bottleneck.</p>
<p>Kaspa proves that the scalability trilemma was a limitation of CHAINS, not of proof-of-work itself.</p>`,
      },
      {
        id: "lesson-1-9",
        courseId: "bitcoin-vs-kaspa",
        title: "Security Without Sacrifice",
        order: 9,
        duration: "5 min",
        content: `<p>Bitcoin's security comes from proof-of-work - miners expending real energy to validate blocks. This makes attacks expensive.</p>
<p>Kaspa uses the EXACT SAME security model:
• kHeavyHash proof-of-work algorithm
• ASIC miners securing the network
• 51% attack resistance
• No staking, no validators, no trusted parties</p>
<p>The difference is structural, not security-related. Kaspa's DAG allows parallel blocks without reducing the work required to produce them.</p>
<p>CURRENT SPEED:
Kaspa currently runs at 10 blocks per second - that's 600 times faster than Bitcoin. And the roadmap includes scaling to 100 blocks per second within the next 1-3 years.</p>
<p>ANTI-MEV BY DESIGN:
Here's a security advantage most people overlook: Kaspa's speed makes MEV (Maximal Extractable Value) attacks nearly impossible.</p>
<p>MEV is when miners or validators reorder, insert, or censor transactions to extract profit - like front-running your trade on a DEX. On slower chains, attackers have time to see your transaction and jump ahead of it.</p>
<p>With 10 blocks per second, there's simply no time for these attacks. By the time an attacker sees your transaction and tries to front-run it, your transaction is already confirmed. The attack window is measured in milliseconds, not minutes.</p>
<p>This isn't just speed for convenience - it's speed as a security feature.</p>
<p>Think of it this way:
• Bitcoin: One security guard checking IDs at one door, slowly. Secure, but attackers have time to scheme.
• Kaspa: Many security guards at many doors, all moving fast. Same security, but no time for manipulation.</p>
<p>The proof-of-work is just as hard. The energy expenditure is just as real. The security is actually BETTER because speed eliminates entire categories of attacks.</p>`,
      },
      {
        id: "lesson-1-10",
        courseId: "bitcoin-vs-kaspa",
        title: "Real-World Implications",
        order: 10,
        duration: "5 min",
        content: `<p>What does 1-second block time mean in practice?</p>
<p>FOR PAYMENTS:
• Buy a coffee and walk away in seconds, not minutes
• Merchants get confirmation before you leave the counter
• No more "waiting for confirmations"</p>
<p>FOR DEFI:
• Arbitrage opportunities that require speed
• Responsive smart contracts
• Better user experience</p>
<p>FOR ADOPTION:
• Newcomers aren't confused by 10-minute waits
• Kaspa "just works" like modern payment apps
• Lower barrier to entry</p>
<p>Bitcoin maximalists sometimes say "just use Lightning Network for speed." But Lightning requires channels, liquidity, and complexity. Kaspa is fast on Layer 1 - no extra steps required.</p>
<p>Base layer speed matters. It's the foundation everything else is built on.</p>`,
      },
      {
        id: "lesson-1-11",
        courseId: "bitcoin-vs-kaspa",
        title: "The Fair Launch Principle",
        order: 11,
        duration: "5 min",
        content: `<p>Bitcoin was launched fairly:
• No premine (Satoshi didn't give himself coins before launch)
• No ICO (no one "bought in" before mining started)
• No VC allocation (no investors got special treatment)
• Open source from day one</p>
<p>This fair launch is part of what makes Bitcoin legitimate. Everyone had equal opportunity.</p>
<p>KASPA FOLLOWED THE SAME PRINCIPLES:
• No premine - Zero coins existed before public mining began
• No ICO - No token sale, no early investors
• No dev allocation - The team mines like everyone else
• Open source - All code is public and auditable</p>
<p>In a crypto world full of VC-backed projects with massive insider allocations, Kaspa stands out. Like Bitcoin, it earned its place through work, not hype.</p>`,
      },
      {
        id: "lesson-1-12",
        courseId: "bitcoin-vs-kaspa",
        title: "Decentralization in Practice",
        order: 12,
        duration: "5 min",
        content: `<p>Decentralization isn't just a buzzword - it's the core value proposition of cryptocurrency.</p>
<p>WHAT MAKES A NETWORK DECENTRALIZED:
• No single point of failure
• No single entity can censor transactions
• No one can change the rules unilaterally
• Anyone can participate (permissionless)</p>
<p>KASPA'S DECENTRALIZATION:
• Over 1,000 public nodes worldwide
• ASIC mining distributed globally
• No foundation controls the protocol
• Community-driven development
• No corporate backing or VC influence</p>
<p>Some "fast" blockchains achieve speed by centralizing - using a small number of powerful validators. This creates vulnerabilities:
• Validators can collude
• Governments can pressure them
• Single points of failure exist</p>
<p>These networks often have just 21, 100, or a few hundred validators - many controlled by the same entities or running in the same data centers.</p>
<p>Kaspa refuses this shortcut. With over 1,000 nodes spread across the globe, the network is genuinely decentralized. Speed through architecture, not centralization.</p>
<p>This matters because:
• No government can shut down 1,000+ nodes in different countries
• No corporation can push through unwanted changes
• The network serves users, not insiders</p>
<p>True decentralization is rare. Kaspa has it.</p>`,
      },
      {
        id: "lesson-1-13",
        courseId: "bitcoin-vs-kaspa",
        title: "Sound Money Properties",
        order: 13,
        duration: "5 min",
        content: `<p>Bitcoin is often called "digital gold" because it shares gold's monetary properties:
• Scarce (21 million cap)
• Durable (exists as long as the network runs)
• Divisible (satoshis)
• Portable (send anywhere instantly)
• Fungible (one BTC = one BTC)</p>
<p>KASPA SHARES THESE PROPERTIES:
• Fixed supply with decreasing emission
• Proof-of-work backed (can't be printed)
• Highly divisible (sompi = smallest unit)
• Instant portability (1-second blocks)
• Censorship resistant</p>
<p>Both Bitcoin and Kaspa are "sound money" - they can't be inflated away by central banks or governments.</p>
<p>The difference: Kaspa is sound money you can actually USE for daily transactions without waiting 10 minutes or paying high fees.</p>`,
      },
      {
        id: "lesson-1-14",
        courseId: "bitcoin-vs-kaspa",
        title: "Why Kaspa Could Win",
        order: 14,
        duration: "5 min",
        content: `<p>Kaspa isn't trying to replace Bitcoin - it's trying to fulfill Bitcoin's original promise.</p>
<p>THE CASE FOR KASPA:</p>
<p>1. SAME VALUES
   - Proof-of-work security
   - Fair launch, no insiders
   - Decentralization first
   - Sound money principles</p>
<p>2. BETTER ARCHITECTURE
   - BlockDAG vs blockchain
   - 1-second blocks vs 10-minute blocks
   - No orphaned blocks
   - Scalable by design</p>
<p>3. ROOM TO GROW
   - Small market cap = high potential
   - Active development
   - Growing community
   - Real technological innovation</p>
<p>The question isn't "Bitcoin or Kaspa?" - it's "Why not both?"</p>
<p>Many Kaspa supporters hold Bitcoin too. They see Kaspa as the evolution, not the enemy.</p>`,
      },
      {
        id: "lesson-1-15",
        courseId: "bitcoin-vs-kaspa",
        title: "Your Next Steps",
        order: 15,
        duration: "5 min",
        content: `<p>Congratulations! You now understand why Kaspa represents a significant technological advancement over traditional blockchain architecture.</p>
<p>WHAT YOU'VE LEARNED:
✓ Bitcoin's blockchain creates inherent speed limitations
✓ Kaspa's BlockDAG solves this without sacrificing security
✓ Both share fair launch and decentralization principles
✓ Kaspa is fast enough for real-world payments
✓ Smart contracts and L2 are actively developing</p>
<p>YOUR NEXT STEPS:</p>
<p>1. SECURE YOUR KASPA
   - Get a proper wallet (Kasware, Kaspium, or hardware wallet)
   - Control your own keys
   - Never leave funds on exchanges</p>
<p>2. USE THE NETWORK
   - Send some Kaspa to experience 1-second blocks
   - Explore Kasplex tokens
   - Join the community</p>
<p>3. KEEP LEARNING
   - Check out other courses on BMT University
   - Follow Kaspa development
   - Share what you've learned</p>
<p>Welcome to the future of proof-of-work cryptocurrency. Welcome to Kaspa.</p>`,
      },
      {
        id: "lesson-2-1",
        courseId: "dag-terminology",
        title: "Linear Chain Terminology - Traditional Blockchain",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/ztcWf0UT4ysiEhzt0WSE",
        content: `<p>Linear chain terminology uses simple concepts where blocks form a single sequence.  Each block has one parent and potentially one child, creating straightforward ancestor-descendant relationships.  Terms like "height," "previous block," and "next block" describe the linear progression.  When conflicts occur, blocks are either "accepted" into the main chain or "orphaned" and discarded.</p>`,
      },
      {
        id: "lesson-2-2",
        courseId: "dag-terminology",
        title: "DAG Terminology",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>DAG stands for Directed Acyclic Graph. Allowing blocks to have multiple parents creates new relationships within the DAG.</p>`,
      },
      {
        id: "lesson-2-3",
        courseId: "dag-terminology",
        title: "Past and Future Relationships - DAG",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/oWhSigCmRPShKmCFE1IA",
        content: `<p>Past relationship defines all blocks reachable by following parent links backward from a given block.  A block is in the past of another if there exists any directed path connecting them.  Future relationship works inversely - if block A is in the past of block B, then B is in the future of A.</p>`,
      },
      {
        id: "lesson-2-4",
        courseId: "dag-terminology",
        title: "Anticone Relationship - DAG",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/RNhZNbRUmeGmQUUWU9aA",
        content: `<p>Anticone describes blocks that are neither ancestors nor descendants of each other - they exist concurrently in the DAG.  Two blocks are in each other's Anticone if neither can reach the other through any directed path.  This relationship is crucial for GHOSTDAG's security parameter K, which limits Anticone sizes to maintain consensus safety.  Here, Block A and Block C are in each others Anticone, Block A is not reachable from Block C, and Block C is not reachable from Block A.</p>`,
      },
      {
        id: "lesson-2-5",
        courseId: "dag-terminology",
        title: "Mergeset and Blue/Red Classification - GHOSTDAG",
        order: 5,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p>Mergeset refers to the collection of blocks that are merged when creating a new block.  The Mergeset contains the direct parents of a block, but can additionally contain blocks that are not direct parents.  GHOSTDAG classifies Mergeset blocks as "Blue" (honest) or "Red" (potentially conflicting) based on Anticone size constraints.  This classification determines which blocks contribute to network security through Blue Work accumulation.  Here is an example of block B classifying its Mergeset into Blue and Red while the Anticone size constraint = 0.</p>`,
      },
      {
        id: "lesson-2-6",
        courseId: "dag-terminology",
        title: "K Parameter - GHOSTDAG",
        order: 6,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/6yB2YGeOSPaBOD8zBJLY",
        content: `<p>The parameter K controls the maximum allowed Anticone size for blue blocks.  This parameter is calculated based on network delay, block production rate, and desired security guarantees.  In this example, instead of k = 0 like the example above, k = 1 so each blue block has 1 other blue block in its Anticone.</p>`,
      },
      {
        id: "lesson-2-7",
        courseId: "dag-terminology",
        title: "Simplified Definitions",
        order: 7,
        duration: "10 min",
        content: `<p>Past Relationship - All blocks reachable by following parent links backward from a given block.</p>
<p>Future Relationship - All blocks that can reach a given block by following parent links forward.</p>
<p>Anticone Relationship - Blocks that are neither ancestors nor descendants of each other.</p>
<p>Mergeset - GHOSTDAG's collection of blocks merged when creating a new block.</p>
<p>Blue/Red Classification - GHOSTDAG's categorization of blocks as honest (blue) or potentially conflicting (red).</p>
<p>Security Parameter K - GHOSTDAG's maximum allowed anticone size for maintaining consensus safety.</p>`,
      },
      {
        id: "lesson-2-8",
        courseId: "dag-terminology",
        title: "Bitcoin and Kaspa",
        order: 8,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>Bitcoin - Uses simple linear terminology: "previous block," "next block," "chain height," and "longest chain."  Relationships are straightforward ancestor-descendant connections.  Competing blocks are "orphaned" with no intermediate states.</p>
<p>Kaspa - Uses additional terminology including DAG Past/Future/Anticone relationships, GHOSTDAG Mergeset, and Mergeset Blue/Red Classification.  Kaspa maintains multiple concurrent blocks, handles their relationships and provides consistent ordering.</p>`,
      },
      {
        id: "lesson-3-1",
        courseId: "dag-and-kaspa",
        title: "What is a Graph?",
        order: 1,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/PU2hcO7mQC6vs49ePymw",
        content: `<p>Graph theory is a field within mathematics and computer science that focuses on studying graphs - structures that represent relationships between pairs of entities. These graphs consist of vertices (also known as nodes or points) connected by edges (sometimes referred to as arcs, links, or lines).</p>
<p>Graphs are categorized into undirected graphs, where connections between vertices are mutual, and directed graphs, where connections have a specific direction. As a key area of discrete mathematics, graph theory explores these structures extensively.</p>`,
      },
      {
        id: "lesson-3-2",
        courseId: "dag-and-kaspa",
        title: "What is a Directed Graph?",
        order: 2,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/f0y9pR9RiODss06zaLZ5",
        content: `<p>A directed graph, often called a digraph, is a structure used to show relationships where connections between points have a specific direction. Unlike regular graphs where connections go both ways, in a directed graph, each edge points from one vertex to another.</p>
<p>In its simplest form, a directed graph consists of two main parts: a collection of vertices and a set of edges, where each edge is a pair of vertices with a clear direction (from one vertex to another, but not the other way around).</p>
<p>For example, if you have an edge from vertex X to vertex Y, X is the starting point and Y is the endpoint. This edge connects X to Y. A different edge could go from Y to X, but it would be a separate connection.</p>`,
      },
      {
        id: "lesson-3-3",
        courseId: "dag-and-kaspa",
        title: "What is a Directed Acyclic Graph (DAG)?",
        order: 3,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/Kfdt2dAyRGKnaH9NRu51",
        content: `<p>A Directed Acyclic Graph (DAG) is a directed graph that contains no cycles. It is composed of vertices and edges, where each edge has a direction from one vertex to another, ensuring that following the edge directions never results in a closed loop.</p>
<p>A directed graph qualifies as a DAG if its vertices can be arranged in a linear sequence that respects the direction of all edges, known as a topological ordering.</p>
<p>The key insight: In a DAG, you can never return to where you started by following the directed edges. This property is crucial for blockchain technology.</p>`,
      },
      {
        id: "lesson-3-4",
        courseId: "dag-and-kaspa",
        title: "Kaspa's BlockDAG vs Bitcoin's Chain",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>Bitcoin uses a traditional blockchain structure - a linear chain where each block points to exactly ONE previous block. This creates a simple sequence, but also a bottleneck: when two miners find blocks at the same time, only one can be accepted and the other becomes an orphan.</p>
<p>Kaspa uses a BlockDAG (Block Directed Acyclic Graph) - a structure where blocks can point to MULTIPLE previous blocks. This is the fundamental innovation. Blocks as vertices, their references as directed edges, and following any path always leads back to Genesis without cycles.</p>
<p>The key difference: Bitcoin's chain forces a single winner per round. Kaspa's DAG includes ALL valid blocks, even those created simultaneously. This removes the artificial bottleneck and enables much higher throughput while maintaining security.</p>`,
      },
      {
        id: "lesson-3-5",
        courseId: "dag-and-kaspa",
        title: "Simplified Definitions Summary",
        order: 5,
        duration: "5 min",
        content: `<p>Let us summarize what we have learned with simplified definitions:</p>
<p>**Graph** - consists of vertices and edges that connect pairs of vertices, where vertices represent any type of object and edges represent connections between them.</p>
<p>**Directed Graph** - each edge has a specific direction, pointing from one vertex to another. A path in a directed graph is a sequence of edges where the ending vertex of one edge is the starting vertex of the next edge in the sequence.</p>
<p>**Directed Acyclic Graph** - a directed graph where no vertex can reach itself through a path that includes one or more edges, ensuring the absence of cycles.</p>
<p>For our purpose, we only need to know that Kaspa's BlockDAG is just a structure, consisting of edges and vertices, connected in only one direction, and that we never end up in a cycle - it is acyclic.</p>`,
      },
      {
        id: "lesson-4-1",
        courseId: "foundational-concepts",
        title: "DAG - Directed Acyclic Graph Conceptual Overview",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>A Directed Acyclic Graph (DAG) is the fundamental data structure that powers Kaspa. Unlike traditional blockchains that form a single linear chain, Kaspa's BlockDAG allows multiple blocks to be created and referenced simultaneously.</p>
<p>In a DAG structure:
- **Directed**: Edges (connections) between blocks point in one direction only
- **Acyclic**: Following the edges, you can never return to where you started
- **Graph**: A collection of vertices (blocks) connected by edges (references)</p>
<p>Traditional blockchains like Bitcoin force miners to compete, with only one winner per round. This creates a bottleneck. Kaspa's DAG structure allows all valid blocks to be included, even if created at the same time. This is why Kaspa can achieve much higher throughput.</p>
<p>The key insight is that a DAG preserves the security properties of a blockchain while removing the artificial limitation of single-block-per-round. Instead of discarding "orphan" blocks, Kaspa incorporates them all into the consensus.</p>`,
      },
      {
        id: "lesson-4-2",
        courseId: "foundational-concepts",
        title: "DAG Terminology",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>Understanding Kaspa requires familiarity with specific DAG terminology. These terms have precise meanings in the context of Kaspa's consensus system.</p>
<p>**Past**: The past of a block includes all blocks that can be reached by following parent references backwards. These are the blocks that the current block "knows about."</p>
<p>**Future**: The future of a block includes all blocks that reference it (directly or indirectly). These are blocks created after that knew about this block.</p>
<p>**Anticone**: The anticone of a block includes all blocks that are neither in its past nor its future. These blocks were created concurrently and neither knew about each other.</p>
<p>**Tips**: Tips are blocks that have no future blocks yet - they are the "leading edge" of the DAG.</p>
<p>**Selected Parent**: Among a block's parents, one is designated as the "selected parent" - this creates the main chain through the DAG.</p>
<p>These relationships are crucial because GHOSTDAG uses them to order blocks and determine which transactions are valid.</p>`,
      },
      {
        id: "lesson-4-3",
        courseId: "foundational-concepts",
        title: "GHOSTDAG Overview",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>GHOSTDAG (Greedy Heaviest Observed SubTree Directed Acyclic Graph) is Kaspa's consensus protocol. It provides a way to order all blocks in the DAG, enabling agreement on transaction ordering despite parallel block creation.</p>
<p>GHOSTDAG works through several key mechanisms:</p>
<p>1. **Block Ordering**: Every block gets assigned a position in a total ordering, even though they may have been created in parallel.</p>
<p>2. **Blue/Red Classification**: Blocks are classified as either "blue" (honest, well-connected) or "red" (potentially malicious or poorly connected). Blue blocks form the main consensus.</p>
<p>3. **Selected Parent Chain**: A main chain runs through the DAG, connecting selected parents from each block back to genesis.</p>
<p>4. **Mergeset Processing**: When a block is added, it processes all blocks in its mergeset (blocks not in its selected parent's past).</p>
<p>The brilliance of GHOSTDAG is that it achieves the same security guarantees as Bitcoin's Nakamoto consensus, but allows for parallel block creation. This means higher throughput without sacrificing decentralization or security.</p>
<p>**Source**: "PHANTOM and GHOSTDAG: A Scalable Generalization of Nakamoto Consensus" by Sompolinsky, Wyborski, and Zohar (2021).</p>`,
      },
      {
        id: "lesson-4-4",
        courseId: "foundational-concepts",
        title: "K-Cluster - The Security Foundation",
        order: 4,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/LmCePYd7Q8CnHVE2ayVE",
        content: `<p>The K-Cluster concept is foundational to Kaspa's security model. It defines the maximum number of blocks that can exist in the anticone of any blue block.</p>
<p>**What is K?**
K is a security parameter that controls how many parallel blocks are acceptable. If a block has more than K blocks in its anticone, it indicates the block may be part of an attack or was created under abnormal network conditions.</p>
<p>**K-Cluster Violations**
When a block has more than K blocks in its anticone relative to another block's blue set, it's classified as "red" - meaning it's excluded from the main consensus ordering. This is how GHOSTDAG detects and handles potentially malicious behavior.</p>
<p>**Why K Matters**
- A higher K allows more parallelism (higher throughput) but increases confirmation times
- A lower K provides faster confirmations but limits throughput
- Kaspa calculates K based on the blocks-per-second (BPS) target to balance these tradeoffs</p>
<p>The K parameter essentially defines the boundary between honest concurrent mining and potential attack behavior. Blocks that stay within the K-cluster are considered honest and are colored blue.</p>
<p>**Source**: K-cluster analysis from the PHANTOM paper by Sompolinsky and Zohar (2018).</p>`,
      },
      {
        id: "lesson-4-5",
        courseId: "foundational-concepts",
        title: "BPS Configuration - Blocks Per Second",
        order: 5,
        duration: "7 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>BPS (Blocks Per Second) is a key configuration parameter that determines Kaspa's throughput target. It represents how many blocks the network aims to produce per second.</p>
<p>**BPS Evolution**
Kaspa has progressively increased its BPS through network upgrades:
- Originally: 1 BPS (one block per second)
- Crescendo hardfork (May 5, 2025): Upgraded to 10 BPS (current mainnet)
- Future hardforks planned: 32 BPS, then 100 BPS</p>
<p>**Derived Parameters**
Many other network parameters are mathematically derived from BPS:
- **K Parameter**: Scales with BPS to maintain security
- **Block Time**: The inverse of BPS (e.g., 10 BPS = 0.1 second block time)
- **Difficulty Adjustment**: DAA window sized relative to BPS
- **Pruning Depth**: Calculated based on BPS and finality requirements</p>
<p>**Why BPS Matters**
Higher BPS means:
- More transactions per second capacity
- Faster first confirmation times
- But also requires faster network propagation</p>
<p>Kaspa's architecture is specifically designed to safely increase BPS while maintaining decentralization. The GHOSTDAG protocol ensures that increasing block rate doesn't compromise security.</p>`,
      },
      {
        id: "lesson-5-1",
        courseId: "core-data-structures",
        title: "UTXO - What is that?",
        order: 1,
        duration: "10 min",
        content: `<p>UTXO stands for Unspent Transaction Output. It is the fundamental way Kaspa (and Bitcoin) tracks who owns what.</p>
<p>**How UTXOs Work**
Instead of maintaining account balances like a bank, Kaspa tracks individual "coins" - each UTXO is like a specific bill in your wallet:
- When you receive KAS, a new UTXO is created with you as the owner
- When you spend, you consume (destroy) one or more UTXOs and create new ones
- Your "balance" is the sum of all UTXOs you can spend</p>
<p>**Why UTXOs?**
1. **Parallel Validation**: Different UTXOs can be validated independently
2. **Privacy**: No account history linking all your transactions
3. **Simple Verification**: Just check if a UTXO exists and hasn't been spent
4. **Pruning Friendly**: Old spent transactions can be safely removed</p>
<p>**UTXO in Kaspa's DAG**
In Kaspa, UTXO validation is more complex because transactions in the anticone may try to spend the same UTXO. GHOSTDAG's ordering resolves these conflicts - only the first transaction in the consensus order gets to spend the UTXO.</p>`,
      },
      {
        id: "lesson-5-2",
        courseId: "core-data-structures",
        title: "MuHash - What is that?",
        order: 2,
        duration: "10 min",
        content: `<p>MuHash (Multiplicative Hash) is a cryptographic commitment scheme that enables efficient UTXO set verification and is essential for Kaspa's pruning system.</p>
<p>**The Problem MuHash Solves**
Nodes need to verify they have the correct UTXO set, but storing a hash of millions of UTXOs would require rehashing everything when one changes. MuHash allows incremental updates.</p>
<p>**How MuHash Works**
- Each UTXO is hashed to a large number
- The MuHash of the entire set is the product of all these numbers (modulo a prime)
- Adding a UTXO: multiply by its hash
- Removing a UTXO: divide by its hash (multiply by modular inverse)</p>
<p>**Why This Matters for Kaspa**
1. **Fast Updates**: O(1) time to update when UTXOs change
2. **Pruning Verification**: Pruned nodes can verify their UTXO set matches without full history
3. **Sync Efficiency**: New nodes can sync UTXO set directly, verified by MuHash
4. **Commitment**: Blocks commit to the UTXO set state via MuHash</p>
<p>MuHash is what makes it possible for Kaspa nodes to prune old block data while still being able to prove they have the correct current state.</p>`,
      },
      {
        id: "lesson-5-3",
        courseId: "core-data-structures",
        title: "Merkle Root and Accepted Merkle Root",
        order: 3,
        duration: "10 min",
        content: `<p>Merkle Roots are cryptographic commitments that link block bodies to block headers, enabling efficient verification of transaction inclusion.</p>
<p>**Merkle Root**
A Merkle Root is the root of a binary tree where:
- Leaves are transaction hashes
- Each parent is the hash of its two children
- The single root hash commits to all transactions</p>
<p>This allows proving a transaction is in a block by providing just log(n) hashes (the "Merkle proof").</p>
<p>**Accepted Merkle Root in Kaspa**
Kaspa has an additional concept: the Accepted Merkle Root. This commits not just to the block's own transactions, but to all accepted transactions from the block's mergeset.</p>
<p>When a block is added to the DAG, it processes transactions from blocks in its mergeset. The Accepted Merkle Root commits to which of those transactions were actually accepted (valid and not conflicting).</p>
<p>**Why Two Merkle Roots?**
- **Hash Merkle Root**: Commits to the block's own transactions (in the body)
- **Accepted Merkle Root**: Commits to the cumulative accepted transactions (for UTXO state)</p>
<p>This separation is essential for Kaspa's DAG structure where blocks process transactions from multiple other blocks.</p>`,
      },
      {
        id: "lesson-5-4",
        courseId: "core-data-structures",
        title: "Parents and Mergeset",
        order: 4,
        duration: "10 min",
        content: `<p>Understanding the relationship between a block's Parents and its Mergeset is crucial for understanding how GHOSTDAG processes the DAG.</p>
<p>**Parents**
Parents are the blocks that a new block directly references. In Kaspa's DAG:
- A block can have multiple parents (unlike Bitcoin's single parent)
- One parent is designated as the "Selected Parent" (the one with highest blue work)
- Other parents are called "Merged Parents"</p>
<p>**Mergeset**
The Mergeset is the set of blocks that this block "merges" into its view of the DAG:
- It includes all blocks in the anticone of the selected parent that are reachable through the block's other parents
- These are blocks that weren't yet "seen" by the selected parent chain
- The new block is responsible for ordering these blocks</p>
<p>**The Relationship**
- Parents define direct references
- Selected Parent determines the main chain path
- Mergeset contains all blocks being incorporated from the "sides"
- The block must process all mergeset blocks (validating transactions, assigning blue/red colors)</p>
<p>This parent-mergeset structure is how Kaspa incorporates parallel blocks while maintaining a total ordering.</p>`,
      },
      {
        id: "lesson-6-1",
        courseId: "ghostdag-mechanics",
        title: "K Parameter - The Security Parameter",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/LmCePYd7Q8CnHVE2ayVE",
        content: `<p>The K parameter is the cornerstone of GHOSTDAG's security model. It defines the maximum acceptable anticone size for honest blocks.</p>
<p>**Mathematical Definition**
K is calculated based on:
- The blocks per second (BPS) rate
- Network propagation delay (δ)
- Desired security level (probability bounds)</p>
<p>The formula ensures that honest blocks, even under worst-case network delays, will have anticone sizes within K.</p>
<p>**K and BPS Relationship**
As BPS increases, K must also increase proportionally:
- At 1 BPS: K ≈ 18
- At 10 BPS: K ≈ 124  
- At 32 BPS: K ≈ 292</p>
<p>**Security Implications**
- Blocks with anticone size > K relative to the blue set are marked red
- An attacker would need to create many blocks faster than the honest network
- The 51% security threshold is preserved, but attacks become more detectable</p>
<p>**Confirmation Time Tradeoff**
Higher K means:
- More blocks can be created in parallel (higher throughput)
- But more blocks needed to confirm a transaction (longer wait)
- Kaspa balances this for optimal user experience</p>`,
      },
      {
        id: "lesson-6-2",
        courseId: "ghostdag-mechanics",
        title: "Parent Selection and Ordering",
        order: 2,
        duration: "10 min",
        content: `<p>When a miner creates a new block, they must select parents from the current DAG tips. This selection process is the first step in GHOSTDAG's algorithm.</p>
<p>**Step 1: Gather Tips**
The miner collects all current tips (blocks with no children yet) as potential parents.</p>
<p>**Step 2: Select the Primary Parent**
The "Selected Parent" is chosen as the tip with the highest Blue Work. This determines which chain the new block extends.</p>
<p>**Step 3: Add Merged Parents**
Additional parents are added to incorporate blocks from other branches of the DAG:
- Include tips that would otherwise be in the anticone
- Limit the number of parents to bound mergeset size
- Parents must not violate K-cluster constraints</p>
<p>**Ordering the Parents**
Parents are ordered with the selected parent first, followed by merged parents in a deterministic order. This ordering is crucial for:
- Consistent mergeset creation across all nodes
- Deterministic blue/red classification
- Agreement on transaction ordering</p>
<p>**Why This Matters**
Parent selection directly affects:
- Which blocks get merged into the main chain
- The final ordering of transactions
- The efficiency of DAG convergence</p>`,
      },
      {
        id: "lesson-6-3",
        courseId: "ghostdag-mechanics",
        title: "Mergeset Creation",
        order: 3,
        duration: "10 min",
        content: `<p>After selecting parents, the block must construct its Mergeset - the set of blocks it is responsible for ordering. This is the second step in GHOSTDAG.</p>
<p>**What Goes in the Mergeset?**
The mergeset contains:
- All blocks in the anticone of the selected parent
- That are reachable through any of the block's parents
- In other words: blocks visible to this block but not yet ordered by the main chain</p>
<p>**Algorithm**
1. Start with the selected parent's blue set (already ordered)
2. Find all blocks reachable from merged parents
3. Subtract blocks already in the selected parent's past
4. The remainder is the mergeset</p>
<p>**Mergeset Size Limits**
Kaspa enforces a maximum mergeset size to:
- Bound computation per block
- Limit potential DoS attacks
- Ensure consistent processing time</p>
<p>If the natural mergeset would exceed the limit, the block cannot include all desired parents.</p>
<p>**Ordering the Mergeset**
Blocks in the mergeset are ordered using a deterministic algorithm based on:
- Blue/red classification
- Blue score comparisons
- Hash tiebreakers</p>
<p>This ensures all nodes process mergesets identically.</p>`,
      },
      {
        id: "lesson-6-4",
        courseId: "ghostdag-mechanics",
        title: "Blue and Red Classification",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p>The coloring algorithm - classifying blocks as Blue or Red - is the third step in GHOSTDAG and determines which blocks are considered honest participants.</p>
<p>**Blue Blocks**
Blue blocks are considered honest and well-connected:
- Their anticone size relative to the existing blue set is ≤ K
- They were likely created by miners who saw and referenced the main DAG
- Their transactions are prioritized in conflict resolution</p>
<p>**Red Blocks**
Red blocks are potentially malicious or created under unusual conditions:
- Their anticone size relative to blue set exceeds K
- They may have been withheld or created in isolation
- Their transactions have lower priority (but aren't necessarily invalid)</p>
<p>**The Coloring Algorithm**
For each block in the mergeset:
1. Count how many existing blue blocks are in its anticone
2. If count ≤ K: color it blue
3. If count > K: color it red
4. Update the blue set and continue</p>
<p>**Why Coloring Matters**
- Blue blocks accumulate "blue work" for chain selection
- Transaction ordering prioritizes blue block transactions
- Attackers trying to reorder transactions will produce red blocks
- The blue chain represents honest consensus</p>`,
      },
      {
        id: "lesson-6-5",
        courseId: "ghostdag-mechanics",
        title: "Blue Work Calculation",
        order: 5,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p>Blue Work is the cumulative metric used for chain selection in GHOSTDAG. It is the final step in block processing and determines the "heaviest" chain.</p>
<p>**What is Blue Work?**
Blue Work is analogous to total chain work in Bitcoin, but only counts work from blue blocks:
- Each blue block contributes its proof-of-work to the chain's blue work
- Red blocks do not contribute to blue work
- The chain with highest blue work is the canonical chain</p>
<p>**Blue Score vs Blue Work**
- **Blue Score**: Simple count of blue blocks in a chain
- **Blue Work**: Sum of proof-of-work difficulty from blue blocks</p>
<p>Blue Work is more accurate because it accounts for varying difficulty levels.</p>
<p>**Calculation**
For a block B:
\`\`\`
BlueWork(B) = BlueWork(SelectedParent(B)) + Work(B) if B is blue
BlueWork(B) = BlueWork(SelectedParent(B)) if B is red
\`\`\`</p>
<p>**Why Blue Work Matters**
- Selected parent choice: pick the tip with highest blue work
- Consensus: all nodes agree on the chain with most blue work
- Attack resistance: attackers must outpace honest blue work
- Fork resolution: ties broken by blue work comparison</p>
<p>Blue Work ensures that honestly-created proof-of-work dominates chain selection.</p>
<p>**Source**: GHOSTDAG protocol specification by Sompolinsky, Wyborski, and Zohar (2021).</p>`,
      },
      {
        id: "lesson-7-1",
        courseId: "consensus-parameters",
        title: "BPS Configuration Details",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>BPS (Blocks Per Second) is the foundational parameter from which many others derive. Understanding its configuration is key to understanding Kaspa's behavior.</p>
<p>**BPS and Network Throughput**
BPS directly determines theoretical maximum transactions per second:
- TPS capacity = BPS × transactions per block
- Higher BPS = more total transaction capacity
- But also requires faster network propagation</p>
<p>**Mathematical Relationships**
From BPS, Kaspa calculates:
- **Target Block Time** = 1/BPS seconds
- **K Parameter** = f(BPS, network delay)
- **DAA Window Size** = proportional to BPS
- **Pruning Depth** = function of BPS and finality</p>
<p>**BPS Selection Criteria**
The chosen BPS must balance:
1. Hardware requirements for nodes
2. Network bandwidth and latency
3. Security margins (K must be large enough)
4. User experience (confirmation times)</p>
<p>**Crescendo and Future Upgrades**
The Crescendo hardfork (May 5, 2025) upgraded Kaspa from 1 BPS to 10 BPS on mainnet. Future hardforks will increase to 32 BPS, then 100 BPS, with K parameter adjustments to maintain security at each level.</p>`,
      },
      {
        id: "lesson-7-2",
        courseId: "consensus-parameters",
        title: "Mergeset Size Limit",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/Fcosu9vtTUmuwmts7EWR",
        content: `<p>The Mergeset Size Limit constrains how many blocks can be in a single block's mergeset. This is crucial for bounding computation and preventing attacks.</p>
<p>**Why Limit Mergeset Size?**
Without limits, an attacker could craft blocks that reference thousands of other blocks, causing:
- Excessive computation for validation
- Denial of service on honest nodes
- Unpredictable block processing times</p>
<p>**Current Limits**
The mergeset size limit is calculated based on:
- K parameter (security bound)
- Expected network conditions
- Computational budget per block</p>
<p>**Implications**
When natural mergeset size exceeds the limit:
- Block cannot include all desired parents
- Miner must choose which branches to merge
- Some blocks may take longer to get merged</p>
<p>**Relationship to K**
Mergeset limit and K are related but distinct:
- K bounds anticone size for blue classification
- Mergeset limit bounds processing load
- Both scale with BPS but for different reasons</p>`,
      },
      {
        id: "lesson-7-3",
        courseId: "consensus-parameters",
        title: "Merge Depth Bound",
        order: 3,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>The Merge Depth Bound prevents deep reorganizations of the DAG. It establishes when blocks are too old to be merged into new blocks.</p>
<p>**What is Merge Depth?**
Merge depth measures how "deep" a block is in the DAG:
- Depth increases as new blocks are added on top
- Deep blocks are considered finalized
- New blocks cannot reference blocks beyond merge depth</p>
<p>**Why This Matters**
Without merge depth bounds:
- Attackers could reference very old blocks
- This could reorganize long-finalized transactions
- Users could never have certainty about finality</p>
<p>**Calculation**
Merge depth bound is set to ensure:
- Honest blocks always get merged in time
- Attack attempts create obviously invalid blocks
- Finality guarantees are mathematically sound</p>
<p>**Practical Effect**
- Blocks deeper than merge depth cannot be re-merged
- Transactions in deep blocks are final
- Attempts to reference deep blocks are rejected</p>
<p>This is a key component of Kaspa's finality mechanism.</p>`,
      },
      {
        id: "lesson-7-4",
        courseId: "consensus-parameters",
        title: "Finality Depth",
        order: 4,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Finality Depth determines when blocks become irreversible in Kaspa. It's the point after which a block cannot be reorganized out of the main chain.</p>
<p>**Types of Finality**
Kaspa has two types of finality:
1. **Probabilistic Finality**: Like Bitcoin, probability of reorg decreases exponentially with depth
2. **Deterministic Finality**: At sufficient depth, reorg is mathematically impossible</p>
<p>**Finality Depth Calculation**
The finality depth depends on:
- K parameter (security margin)
- Merge depth bound (when merging becomes impossible)
- Network assumptions (delay, honest hash rate)</p>
<p>**Confirmation Depth vs Finality Depth**
- Confirmation depth: When you can be reasonably confident
- Finality depth: When reversal is impossible</p>
<p>**Practical Applications**
- Exchanges set deposit confirmation requirements based on finality
- Smart contracts can rely on finalized state
- Users can spend funds after finality without double-spend risk</p>
<p>At Kaspa's high BPS, finality is reached in minutes rather than hours.</p>`,
      },
      {
        id: "lesson-7-5",
        courseId: "consensus-parameters",
        title: "DAA Window",
        order: 5,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>The DAA Window is the sliding window of blocks used for difficulty adjustment. It determines how quickly Kaspa responds to hash rate changes.</p>
<p>**Window Construction**
The DAA window consists of:
- A fixed number of recent blocks
- Measured in DAA score, not blue score
- Window size scales with BPS</p>
<p>**Why a Sliding Window?**
A sliding window provides:
- Smooth difficulty transitions (no sudden jumps)
- Resistance to timestamp manipulation
- Quick response to hash rate changes</p>
<p>**Window Size Tradeoffs**
- Larger window: More stable, slower response
- Smaller window: Faster response, more volatile</p>
<p>Kaspa balances these for optimal stability while remaining responsive.</p>
<p>**Blocks in the Window**
Not all blocks contribute equally:
- Blue blocks have more weight
- Timestamps are validated against window
- DAA score (not blue score) determines window membership</p>
<p>**Relationship to BPS**
As BPS increases, window size (in blocks) increases to maintain the same real-time duration.</p>`,
      },
      {
        id: "lesson-7-6",
        courseId: "consensus-parameters",
        title: "Pruning Depth",
        order: 6,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Pruning Depth defines how far back full block data is required. Beyond this depth, block bodies can be safely deleted.</p>
<p>**What Gets Pruned?**
- Block bodies (transactions)
- Non-essential header data
- But NOT: proof-of-work chain (headers preserved)</p>
<p>**Safe Pruning Calculation**
Pruning depth must be greater than:
- Finality depth (so finalized blocks are pruned)
- Merge depth (so pruneable blocks can't be merged)
- Any sync requirement windows</p>
<p>**MuHash Verification**
Pruned nodes verify their UTXO set using MuHash:
- Store only current UTXO set
- MuHash commitment proves correctness
- No need to replay old transactions</p>
<p>**Pruning vs Archival Nodes**
- Pruning nodes: Store only recent blocks + UTXO set
- Archival nodes: Store complete history</p>
<p>Both can fully validate new blocks. Pruning nodes are sufficient for most users.</p>`,
      },
      {
        id: "lesson-8-1",
        courseId: "block-processing",
        title: "Block Processing Pipeline Overview",
        order: 1,
        duration: "10 min",
        content: `<p>Kaspa processes blocks through a four-stage pipeline: Header validation, Body validation, Virtual chain update, and Pruning consideration.</p>
<p>**Stage 1: Header Validation**
Before downloading the full block:
- Verify proof-of-work meets difficulty
- Check parent references exist
- Validate timestamp bounds
- Confirm header structure</p>
<p>**Stage 2: Body Validation**
After receiving block body:
- Validate all transaction formats
- Check Merkle root matches transactions
- Verify signature validity
- Confirm no duplicate inputs</p>
<p>**Stage 3: Virtual Chain Update**
Integrate into DAG state:
- Construct mergeset
- Classify blue/red
- Process accepted transactions
- Update UTXO set
- Recalculate virtual block</p>
<p>**Stage 4: Pruning Consideration**
Maintain node efficiency:
- Check if old blocks can be pruned
- Update MuHash commitments
- Remove pruneable data</p>
<p>Each stage can reject invalid blocks early, saving resources.</p>`,
      },
      {
        id: "lesson-8-2",
        courseId: "block-processing",
        title: "Blue Score and Blue Work",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p>During block processing, two related but distinct metrics are calculated: Blue Score and Blue Work.</p>
<p>**Blue Score**
Blue Score is the simple count of blue blocks in a chain:
- Increases by 1 for each blue ancestor
- Used for DAA calculations
- Quick to compute</p>
<p>**Blue Work**
Blue Work is the cumulative proof-of-work from blue blocks:
- Accounts for varying difficulty levels
- Used for chain selection
- More accurate measure of "weight"</p>
<p>**When Each is Used**
- **Chain Selection**: Blue Work determines the canonical chain
- **DAA Window**: Blue Score may be used for window selection
- **Confirmations**: Either can indicate depth</p>
<p>**Calculation During Processing**
When processing a new block:
1. Get selected parent's blue score and blue work
2. If this block is blue: increment both
3. If red: inherit parent's values unchanged
4. Store for future blocks to reference</p>
<p>Understanding both metrics is important for grasping how Kaspa achieves consensus.</p>`,
      },
      {
        id: "lesson-9-1",
        courseId: "difficulty-adjustment",
        title: "DAA Window Construction",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>The Difficulty Adjustment Algorithm (DAA) in Kaspa uses a sliding window of blocks to calculate target difficulty.</p>
<p>**Window Purpose**
The window provides:
- Historical block times for averaging
- Resistance to gaming the algorithm
- Smooth difficulty transitions</p>
<p>**Building the Window**
The DAA window is constructed by:
1. Starting from the current block
2. Walking back through selected parents
3. Including blocks within the window size
4. Using DAA score (not just blue score)</p>
<p>**Window Parameters**
Key parameters include:
- Window size (number of blocks)
- Sample interval (which blocks to measure)
- Weight distribution (recent vs old)</p>
<p>**Kaspa's Approach**
Kaspa's DAA is designed for high BPS:
- Larger windows to smooth volatility
- Frequent adjustments (every block)
- Quick response to hash rate changes</p>
<p>The result is stable block times even with rapid hash rate fluctuations.</p>`,
      },
      {
        id: "lesson-9-2",
        courseId: "difficulty-adjustment",
        title: "DAA Score vs Blue Score",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/qalZKo6tQneM7ap62nFQ",
        content: `<p>Kaspa uses two different scoring systems: DAA Score and Blue Score. Understanding their differences is important.</p>
<p>**Blue Score**
Blue Score counts only blue blocks:
- Ignores red blocks entirely
- Used for chain selection and GHOSTDAG
- Represents "honest" block count</p>
<p>**DAA Score**
DAA Score may include red blocks:
- Counts blocks contributing to difficulty calculation
- Provides more stable time measurement
- Used specifically for difficulty adjustment</p>
<p>**Why Different Scores?**
- Chain selection needs to weight honest work (blue score)
- Difficulty adjustment needs accurate time measurement (DAA score)
- Red blocks still represent real elapsed time</p>
<p>**Practical Implications**
- A chain with many red blocks may have:
  - Lower blue score (fewer honest blocks)
  - Similar DAA score (similar elapsed time)
- This ensures difficulty stays correct even during attacks</p>
<p>The separation prevents attackers from manipulating difficulty through red block creation.</p>`,
      },
      {
        id: "lesson-10-1",
        courseId: "transaction-processing",
        title: "Transaction Selection",
        order: 1,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/6yB2YGeOSPaBOD8zBJLY",
        content: `<p>Transaction selection is how miners choose which transactions to include in blocks. It directly affects user experience and miner revenue.</p>
<p>**Basic Selection**
The simplest approach prioritizes by:
- Fee per byte (transaction size)
- Time in mempool (older = higher priority)
- UTXO age (coin days destroyed)</p>
<p>**Kaspa's Context**
In a high-BPS environment:
- Blocks are small but frequent
- Mempool often empty (transactions get included quickly)
- Less competition for block space</p>
<p>**Selection Strategies**
Miners can choose:
- **Greedy**: Highest fee first
- **Fair**: FIFO with fee minimum
- **Custom**: Prioritize certain transaction types</p>
<p>**Fee Market**
Unlike congested chains:
- Kaspa typically has low fees
- Fees matter more during high demand
- No "fee auction" during normal operation</p>
<p>Good transaction selection balances miner revenue, user experience, and network health.</p>`,
      },
      {
        id: "lesson-10-2",
        courseId: "transaction-processing",
        title: "Mass Calculation",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/dBIlYtYTTmuiq41TKiL7",
        content: `<p>Mass is Kaspa's measure of transaction resource consumption. It determines fees and block limits.</p>
<p>**Types of Mass**
Kaspa calculates three types of mass:
- **Compute Mass**: CPU cost to validate
- **Storage Mass**: UTXO set growth (KIP-9)
- **Transient Mass**: Temporary resource usage</p>
<p>**Compute Mass**
Based on:
- Number of inputs (signature verification)
- Script complexity
- Transaction size</p>
<p>**Storage Mass (KIP-9)**
Storage mass addresses UTXO set bloat:
- Creating UTXOs incurs mass
- Consuming UTXOs reduces mass
- Encourages UTXO consolidation</p>
<p>**Why Mass Matters**
- Block mass limit bounds total per-block work
- Fees are calculated per mass unit
- Prevents DoS through expensive transactions</p>
<p>**User Impact**
Transactions with many small UTXOs have higher mass. Consolidating UTXOs reduces future transaction costs.</p>`,
      },
      {
        id: "lesson-10-3",
        courseId: "transaction-processing",
        title: "Coinbase Transactions",
        order: 3,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>Coinbase transactions are special transactions that create new coins as block rewards.</p>
<p>**What is a Coinbase Transaction?**
- First transaction in every block
- Has no inputs (creates coins from nothing)
- Outputs go to miner's address
- Contains the block reward</p>
<p>**Block Reward Components**
The coinbase reward includes:
- Block subsidy (new coin issuance)
- Transaction fees (from included transactions)</p>
<p>**Kaspa's Emission Schedule**
Kaspa uses a unique emission curve:
- Smooth decay (not halving)
- Based on chromatic scale
- Predictable long-term supply</p>
<p>**Coinbase Maturity**
Coinbase outputs cannot be spent immediately:
- Must wait for maturity period
- Prevents spending rewards from orphaned blocks
- Maturity measured in blue score</p>
<p>**In Kaspa's DAG**
Each block has its own coinbase, but only blue blocks' coinbases are effectively spendable after maturity.</p>`,
      },
      {
        id: "lesson-11-1",
        courseId: "pruning-system",
        title: "First Order Pruning",
        order: 1,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>First Order Pruning removes old block bodies and transactions from storage. This is the primary mechanism for managing blockchain data growth.</p>
<p>**What Gets Removed**
- Transaction data (inputs, outputs, signatures)
- Block body content
- Script data and proofs</p>
<p>**What is Preserved**
- Block headers
- Proof-of-work chain
- UTXO set (current state)
- MuHash commitments</p>
<p>**When Pruning Occurs**
Blocks are eligible for first-order pruning when:
- They exceed the pruning depth
- Their anticone is finalized
- All dependent validation is complete</p>
<p>**Node Behavior After Pruning**
Pruned nodes can still:
- Fully validate new blocks
- Prove current UTXO state
- Participate in consensus</p>
<p>They cannot:
- Serve historical transaction data
- Help new nodes sync from genesis
- Provide block explorers with old data</p>
<p>Most users can run pruning nodes without issues.</p>`,
      },
      {
        id: "lesson-11-2",
        courseId: "pruning-system",
        title: "Second Order Pruning",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Second Order Pruning goes further than first-order pruning by removing old headers while preserving proof-of-work.</p>
<p>**The Challenge**
Even with first-order pruning, headers accumulate:
- At 10 BPS: ~315 million headers per year
- At 100 BPS: ~3.15 billion headers per year
- Storage becomes significant</p>
<p>**What Second Order Pruning Does**
- Removes individual block headers at depth
- Preserves proof-of-work through checkpoints
- Maintains cryptographic continuity</p>
<p>**How It Works**
Instead of storing every header:
1. Create periodic checkpoints (cryptographic commitments)
2. Store checkpoint chain linking current state to genesis
3. Delete intermediate headers</p>
<p>**Security Preservation**
The checkpoint chain preserves:
- Total proof-of-work accumulation
- Chain of trust to genesis
- Ability to verify new blocks</p>
<p>Second-order pruning is still being refined but represents Kaspa's path to truly unlimited scaling.</p>`,
      },
      {
        id: "lesson-11-3",
        courseId: "pruning-system",
        title: "Archival vs Pruning Nodes",
        order: 3,
        duration: "8 min",
        content: `<p>Kaspa supports different node types with varying storage requirements and capabilities.</p>
<p>**Pruning Nodes**
Pruning nodes are lightweight and sufficient for most uses:
- Store only recent blocks + UTXO set
- Can fully validate new blocks
- Minimal storage requirements
- Cannot serve historical data</p>
<p>**Archival Nodes**
Archival nodes store complete blockchain history:
- Keep all blocks since genesis
- Can serve block explorer queries
- Help new nodes sync
- Higher storage requirements</p>
<p>**Use Cases**
When to run each type:
- **Pruning**: Personal use, light infrastructure
- **Archival**: Block explorers, research, data analysis, helping the network</p>
<p>**Storage Comparison**
At 32 BPS:
- Pruning node: ~10-50 GB
- Archival node: Grows ~1 TB per year</p>
<p>Most users should run pruning nodes. The network only needs a modest number of archival nodes for historical data access.</p>`,
      },
      {
        id: "lesson-12-1",
        courseId: "anticone-finalization",
        title: "Anticone Finalization Depth",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Anticone Finalization is the mathematical foundation for safe pruning in Kaspa. It guarantees when a block's anticone is permanently fixed.</p>
<p>**The Problem**
In a DAG, new blocks could theoretically reference any old block, potentially changing its anticone forever. For pruning, we need to know when this can no longer happen.</p>
<p>**Finalization Guarantee**
A block's anticone is finalized when:
- The block has reached sufficient depth
- No new blocks can legally reference blocks that would enter its anticone
- The merge depth bound prevents deep references</p>
<p>**Mathematical Foundation**
The anticone finalization depth is calculated from:
- K parameter (anticone size bound)
- Merge depth bound
- Network delay assumptions</p>
<p>**Why This Matters for Pruning**
Once a block's anticone is finalized:
- Its final ordering is permanent
- Its transactions' status is permanent
- All relevant context for validation is known
- It becomes safe to prune</p>
<p>This is the theoretical basis for Kaspa's efficient pruning.</p>`,
      },
      {
        id: "lesson-12-2",
        courseId: "anticone-finalization",
        title: "Depth Constraints for Pruning Safety",
        order: 2,
        duration: "10 min",
        content: `<p>Multiple depth constraints work together to guarantee pruning safety. Understanding their interaction is key to understanding Kaspa's security.</p>
<p>**Merge Depth Bound**
- Prevents referencing blocks too deep in the DAG
- Ensures finalized transactions stay final
- Blocks beyond this depth cannot be reorganized</p>
<p>**Finality Depth**
- Point of no return for blocks
- Probability of reorg becomes negligible
- Used for user-facing confirmation requirements</p>
<p>**Pruning Depth**
- When block data can be safely deleted
- Must be greater than finality depth
- Ensures all validation is complete before pruning</p>
<p>**How They Interact**
These constraints form layers of protection:
1. Merge depth: Structural finality (impossible to reference)
2. Finality depth: Probabilistic finality (negligible reorg chance)
3. Pruning depth: Safe deletion (all checks passed)</p>
<p>Each layer provides increasing confidence, culminating in safe data removal.</p>`,
      },
      {
        id: "lesson-13-1",
        courseId: "virtual-state",
        title: "Virtual Block Concept",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/bUf1oCzQR1CcRHjHlXRZ",
        content: `<p>The Virtual Block is Kaspa's unique way of representing the current state of the DAG without requiring a single "tip" block.</p>
<p>**What is the Virtual Block?**
The virtual block is a conceptual construct:
- Not a real block in the DAG
- Represents the current state of all tips
- Has all current tips as parents
- Contains the merged UTXO state</p>
<p>**Why Virtual?**
In a DAG with multiple parallel tips:
- There is no single "latest" block
- Different nodes may see different tips
- But they can agree on the "virtual" state</p>
<p>**Virtual Block Properties**
- **Virtual Parents**: All current DAG tips
- **Virtual UTXO Set**: Merged from all tips
- **Virtual Blue Score**: Highest blue score + 1
- **Virtual Timestamp**: Calculated from tips</p>
<p>**Role in Consensus**
The virtual block:
- Determines current spendable UTXOs
- Provides basis for new block creation
- Represents "now" in blockchain terms</p>
<p>Understanding the virtual block is key to understanding how Kaspa handles parallel tips.</p>`,
      },
      {
        id: "lesson-13-2",
        courseId: "virtual-state",
        title: "Sink Selection",
        order: 2,
        duration: "8 min",
        content: `<p>The Sink is the highest block in the DAG that has a valid UTXO state. It's crucial for determining the current virtual state.</p>
<p>**What is the Sink?**
The sink is the block with:
- Highest blue work
- Valid UTXO set (all transactions resolved)
- No UTXO conflicts with its past</p>
<p>**Why Sink Matters**
Not all tips may have valid UTXO states:
- Some tips may have conflicting transactions
- The sink is the "highest valid" point
- Virtual state is built from the sink</p>
<p>**Sink Selection Process**
1. Find the tip with highest blue work
2. Check if its UTXO state is valid
3. If conflicts exist, walk back until valid
4. The valid block is the sink</p>
<p>**Sink vs Tips**
- Tips: All blocks with no children
- Sink: Highest tip with valid UTXO state
- Virtual block includes all tips as parents
- But derives UTXO state from sink</p>
<p>The sink provides the foundation for Kaspa's consistent state management.</p>`,
      },
      {
        id: "lesson-14-1",
        courseId: "timestamps-median-time",
        title: "Past Median Time",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>Past Median Time (PMT) is the median timestamp of recent ancestor blocks. It provides a manipulation-resistant time reference.</p>
<p>**Why Median Time?**
Individual block timestamps can be manipulated:
- Miners can set any timestamp within bounds
- Future timestamps could be used for attacks
- A single bad timestamp shouldn't break consensus</p>
<p>**Calculation**
Past Median Time is calculated by:
1. Taking the timestamps of recent selected ancestors
2. Sorting them chronologically
3. Selecting the median value</p>
<p>**Uses in Kaspa**
PMT is used for:
- **Time-lock validation**: When time-locked UTXOs become spendable
- **Difficulty adjustment**: As a time reference
- **Protocol enforcement**: Various time-based rules</p>
<p>**Properties**
- Always moves forward (cannot decrease)
- Resistant to single-miner manipulation
- Slightly behind real time (median of past blocks)</p>
<p>PMT ensures time-based consensus rules remain secure even if some miners misbehave.</p>`,
      },
      {
        id: "lesson-14-2",
        courseId: "timestamps-median-time",
        title: "Timestamp Validation Rules",
        order: 2,
        duration: "8 min",
        content: `Kaspa enforces strict rules on block timestamps to prevent manipulation and ensure DAA accuracy.

**Timestamp Bounds**
Block timestamps must be:
- Greater than Past Median Time of parents
- Not too far in the future (bounded by node's clock)

**Why These Rules?**
- Lower bound (PMT): Ensures time moves forward
- Upper bound (future limit): Prevents timestamp inflation

**Validation Process**
When validating a block timestamp:
1. Calculate PMT from selected ancestors
2. Check timestamp > PMT
3. Check timestamp < current_time + max_future
4. Reject if either fails

**Impact on DAA**
Timestamps directly affect difficulty:
- Timestamps determine block time intervals
- Manipulated timestamps could skew difficulty
- Bounds prevent extreme manipulation

**DAG Considerations**
In Kaspa's DAG:
- Multiple parents have different timestamps
- PMT calculation uses selected parent chain
- Parallel blocks may have similar timestamps

These rules ensure consistent timekeeping across the decentralized network.`,
      },
      {
        id: "lesson-15-1",
        courseId: "finality-security",
        title: "Probabilistic Finality",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Probabilistic finality means that the probability of transaction reversal decreases exponentially with confirmation depth.</p>
<p>**How It Works**
With each new block:
- An attacker would need more hash power to reorg
- The probability of successful attack decreases
- After enough confirmations, reversal is practically impossible</p>
<p>**Confirmation Depth**
Deeper confirmations mean:
- More cumulative work to overcome
- Lower probability of reorg
- Higher confidence in finality</p>
<p>**Mathematical Guarantees**
The security can be quantified:
- 1 confirmation: Some reorg risk
- 6 confirmations: Very low risk (Bitcoin standard)
- 10+ confirmations: Negligible risk</p>
<p>**In Kaspa**
Kaspa's high BPS means:
- More confirmations per unit time
- Faster probabilistic finality
- Same security level reached sooner</p>
<p>For example, at 10 BPS, 60 confirmations take just 6 seconds but provide strong probabilistic guarantees.</p>`,
      },
      {
        id: "lesson-15-2",
        courseId: "finality-security",
        title: "Deterministic Finality",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p>Deterministic finality goes beyond probability - at sufficient depth, reversal becomes structurally impossible.</p>
<p>**What Makes It Deterministic?**
At a certain depth:
- Merge depth bound prevents referencing old blocks
- New blocks cannot reorganize past this point
- Finality is guaranteed by protocol rules, not just probability</p>
<p>**How It Works**
The merge depth bound creates hard finality:
1. Blocks beyond merge depth cannot be merged
2. Any attempt to reorganize is invalid
3. The protocol enforces finality</p>
<p>**Deterministic vs Probabilistic**
- Probabilistic: "Attack is extremely unlikely"
- Deterministic: "Attack is impossible by protocol rules"</p>
<p>**Depth Requirements**
Deterministic finality requires:
- Passing the merge depth bound
- Anticone finalization
- All validation complete</p>
<p>**Practical Impact**
For users:
- After deterministic finality, funds are absolutely safe
- No amount of hash power can reverse transactions
- Provides ultimate security guarantee</p>
<p>This is one of Kaspa's most powerful security features.</p>`,
      },
      {
        id: "lesson-15-3",
        courseId: "finality-security",
        title: "Kaspa's Security Model",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>Kaspa inherits Bitcoin's security model while enabling higher performance. Understanding this is key to trusting the system.</p>
<p>**Inherited from Bitcoin**
Kaspa maintains:
- Proof-of-work consensus
- 51% security threshold
- Nakamoto-style probabilistic finality
- Cryptographic transaction security</p>
<p>**GHOSTDAG Enhancements**
GHOSTDAG adds:
- All honest work counts (no orphan waste)
- Blue/red classification detects attacks
- Deterministic finality layer
- Efficient parallel processing</p>
<p>**Attack Resistance**
Kaspa is resistant to:
- Double-spend attacks (confirmation depth)
- Selfish mining (all blocks included)
- Long-range attacks (merge depth bound)
- Timestamp manipulation (PMT and bounds)</p>
<p>**Security Parameters**
Key parameters ensure security:
- K: Bounds honest anticone size
- Merge depth: Prevents deep reorgs
- Finality depth: Guarantees irreversibility
- All derived from network analysis</p>
<p>**Trust Model**
Users can trust that:
- Confirmed transactions are final
- The network is censorship-resistant
- No central party controls consensus</p>
<p>Kaspa provides enterprise-grade security with consumer-grade performance.</p>`,
      },
      {
        id: "lesson-16-1",
        courseId: "network-scaling",
        title: "Bitcoin's Scaling Problem",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p>Understanding why Bitcoin cannot simply increase its block rate helps appreciate Kaspa's innovation.</p>
<p>**Bitcoin's Limitation**
Bitcoin produces one block every ~10 minutes because:
- Orphan rate increases with faster blocks
- Orphans waste miner resources
- Security decreases with high orphan rates</p>
<p>**The Orphan Problem**
When blocks are created faster than propagation:
- Multiple miners may find valid blocks
- Only one can extend the chain
- Others become orphans (wasted work)
- Effective hash rate decreases</p>
<p>**Security Implications**
High orphan rates mean:
- Less work in the main chain
- Easier to attack (less cumulative work)
- Miners with better connectivity have advantages</p>
<p>**Why Not Just Bigger Blocks?**
Larger blocks also cause problems:
- Longer propagation times
- Higher bandwidth requirements
- Centralization pressure (not everyone can run nodes)</p>
<p>These tradeoffs force Bitcoin to choose between speed, security, and decentralization. Kaspa's GHOSTDAG breaks this tradeoff.</p>`,
      },
      {
        id: "lesson-16-2",
        courseId: "network-scaling",
        title: "How Kaspa Solves Scaling",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p>Kaspa's architecture enables high throughput without sacrificing security or decentralization.</p>
<p>**The Key Insight**
Instead of discarding orphans:
- Include all blocks in the DAG
- Order them with GHOSTDAG
- All honest work contributes to security</p>
<p>**No Wasted Work**
In Kaspa:
- Parallel blocks are all included
- All proof-of-work adds to chain security
- Mining is efficient regardless of connectivity</p>
<p>**Scaling with BPS**
Kaspa can increase blocks per second by:
- Adjusting K parameter proportionally
- Ensuring network can propagate in time
- Maintaining security guarantees</p>
<p>**Crescendo Hard Fork (May 2025)**
- Upgraded Kaspa from 1 BPS to 10 BPS (current mainnet)
- Already 6,000x more frequent than Bitcoin's one block per 10 minutes
- Future hardforks planned: 32 BPS, then 100 BPS
- Each upgrade requires proportional K parameter adjustments</p>
<p>**The Result**
- Faster confirmations (seconds, not hours)
- Higher transaction capacity
- Decentralized (low node requirements)
- Secure (full PoW contribution)</p>
<p>Kaspa proves that the blockchain trilemma can be solved with better architecture.</p>`,
      },
    ];

    const allQuestions: QuizQuestion[] = [
      // Course 1: Bitcoin vs Kaspa - 15 lessons
      { id: "q-1-1-1", lessonId: "lesson-1-1", question: "What was Satoshi Nakamoto's original vision for Bitcoin?", options: ["A store of value like gold", "A peer-to-peer electronic cash system", "A banking replacement platform", "A smart contract platform"], correctIndex: 1, explanation: "Satoshi's whitepaper described Bitcoin as 'a purely peer-to-peer version of electronic cash.'" },
      { id: "q-1-2-1", lessonId: "lesson-1-2", question: "What is the 'scalability trilemma' in blockchain?", options: ["Choosing between speed, cost, and features", "Optimizing only two of: decentralization, security, and scalability", "Balancing mining rewards, fees, and block size", "Trading privacy for transparency"], correctIndex: 1, explanation: "The trilemma states you can only optimize for two of three properties: decentralization, security, or scalability." },
      { id: "q-1-3-1", lessonId: "lesson-1-3", question: "Who created Kaspa and what was their key insight?", options: ["Vitalik Buterin - use proof-of-stake", "Dr. Yonatan Sompolinsky - the chain structure is the bottleneck", "Satoshi Nakamoto - increase block size", "Charles Hoskinson - add smart contracts"], correctIndex: 1, explanation: "Dr. Yonatan Sompolinsky, a Harvard researcher, realized Bitcoin's bottleneck isn't proof-of-work but the chain structure itself." },
      { id: "q-1-4-1", lessonId: "lesson-1-4", question: "What happens to 'orphan blocks' in Bitcoin when two miners find blocks simultaneously?", options: ["Both are included", "They are merged together", "One is included and the rest are orphaned", "They wait in a queue"], correctIndex: 2, explanation: "In Bitcoin's chain structure, when two blocks are found simultaneously, only one wins and the other is orphaned - wasted work." },
      { id: "q-1-5-1", lessonId: "lesson-1-5", question: "How does Kaspa's DAG handle parallel blocks?", options: ["Discards the slower one", "Includes ALL valid blocks", "Waits for consensus", "Merges them into one"], correctIndex: 1, explanation: "In Kaspa's BlockDAG, blocks can reference multiple parents, so ALL valid parallel blocks are included - no work is wasted." },
      { id: "q-1-6-1", lessonId: "lesson-1-6", question: "What does GHOSTDAG solve in Kaspa?", options: ["Mining difficulty", "How to order transactions when blocks arrive simultaneously", "Wallet security", "Network latency"], correctIndex: 1, explanation: "GHOSTDAG (Greedy Heaviest-Observed SubDAG) provides a way to order all blocks deterministically despite parallel creation." },
      { id: "q-1-7-1", lessonId: "lesson-1-7", question: "In the visual comparison, what makes a DAG different from a chain?", options: ["DAG has larger blocks", "DAG has multiple paths that merge together", "DAG is slower", "DAG uses less energy"], correctIndex: 1, explanation: "A DAG is like a river delta with multiple channels merging, while a chain is a single railroad track." },
      { id: "q-1-8-1", lessonId: "lesson-1-8", question: "How does Kaspa's block rate compare to Bitcoin?", options: ["Same speed", "10x faster", "6,000x more frequent", "Slower but more secure"], correctIndex: 2, explanation: "Kaspa produces 10 blocks per second compared to Bitcoin's one block every 600 seconds - 6,000 times more frequent." },
      { id: "q-1-9-1", lessonId: "lesson-1-9", question: "Why is Kaspa's speed considered a security feature against MEV attacks?", options: ["Higher fees prevent attacks", "Fast confirmations give attackers no time to front-run", "More miners means more security", "Larger blocks are harder to manipulate"], correctIndex: 1, explanation: "With 10 blocks per second, there's no time for MEV attacks - by the time an attacker sees your transaction, it's already confirmed." },
      { id: "q-1-10-1", lessonId: "lesson-1-10", question: "What makes Kaspa better for everyday payments compared to Bitcoin?", options: ["Lower mining costs", "1-second confirmations vs 10-minute waits", "Larger transaction limits", "More privacy features"], correctIndex: 1, explanation: "Kaspa's ~1 second block times mean merchants get confirmation before customers leave, unlike Bitcoin's 10-minute wait." },
      { id: "q-1-11-1", lessonId: "lesson-1-11", question: "What 'fair launch' principles does Kaspa share with Bitcoin?", options: ["VC funding and marketing", "No premine, no ICO, no dev allocation", "Celebrity endorsements", "Centralized initial distribution"], correctIndex: 1, explanation: "Like Bitcoin, Kaspa had no premine, no ICO, no special allocations - everyone started equal with public mining." },
      { id: "q-1-12-1", lessonId: "lesson-1-12", question: "How many public nodes does Kaspa have worldwide?", options: ["21 validators", "100 nodes", "Over 1,000 nodes", "5 data centers"], correctIndex: 2, explanation: "Kaspa has over 1,000 public nodes globally, making it genuinely decentralized unlike chains with few validators." },
      { id: "q-1-13-1", lessonId: "lesson-1-13", question: "What is the smallest unit of Kaspa called?", options: ["Satoshi", "Wei", "Sompi", "Gwei"], correctIndex: 2, explanation: "Like Bitcoin's satoshi, Kaspa's smallest unit is called a 'sompi' - named after Dr. Sompolinsky." },
      { id: "q-1-14-1", lessonId: "lesson-1-14", question: "What is Kaspa's relationship to Bitcoin's vision?", options: ["Competing replacement", "Fulfilling Satoshi's original peer-to-peer cash vision", "Completely different goals", "A Bitcoin sidechain"], correctIndex: 1, explanation: "Kaspa isn't trying to replace Bitcoin - it's fulfilling the original vision of peer-to-peer electronic cash that's fast enough to use." },
      { id: "q-1-15-1", lessonId: "lesson-1-15", question: "What wallets are recommended for securing your Kaspa?", options: ["Exchange wallets only", "Kasware, Kaspium, or hardware wallets", "Paper wallets only", "Browser extensions only"], correctIndex: 1, explanation: "The lesson recommends proper wallets like Kasware, Kaspium, or hardware wallets - never leaving funds on exchanges." },

      // Course 2: DAG Terminology - 8 lessons
      { id: "q-2-1-1", lessonId: "lesson-2-1", question: "In a traditional blockchain, what happens when conflicts occur?", options: ["Both conflicting blocks are permanently kept in the chain", "Conflicting blocks are combined into a single merged block", "One block is accepted into the main chain, all others are orphaned", "A voting mechanism determines which block to include"], correctIndex: 2, explanation: "In linear chains, when conflicts occur, only one block is accepted into the main chain while all other competing blocks are orphaned and discarded." },
      { id: "q-2-2-1", lessonId: "lesson-2-2", question: "What does DAG stand for?", options: ["Digital Asset Graph structure for token management", "Directed Acyclic Graph with no cycles allowed", "Decentralized Autonomous Governance protocol system", "Distributed Account Gateway for transactions"], correctIndex: 1, explanation: "DAG stands for Directed Acyclic Graph - directed means edges have direction, acyclic means no cycles." },
      { id: "q-2-3-1", lessonId: "lesson-2-3", question: "If Block A is in the 'past' of Block B, what is Block B to Block A?", options: ["Block B is also in the past of Block A", "Block B is in the future of Block A", "Block B is in the anticone of Block A", "Block B has no relationship to Block A"], correctIndex: 1, explanation: "Past and Future are inverse relationships - if A is in B's past, then B is in A's future." },
      { id: "q-2-4-1", lessonId: "lesson-2-4", question: "What are 'anticone' blocks?", options: ["Blocks that failed validation and were rejected by nodes", "Blocks that are neither ancestors nor descendants of each other", "Blocks that exist only in the historical past of the DAG", "Blocks that are waiting to be confirmed in the future"], correctIndex: 1, explanation: "Anticone describes blocks that exist concurrently - neither can reach the other through directed paths." },
      { id: "q-2-5-1", lessonId: "lesson-2-5", question: "What determines if a block is classified as 'Blue' vs 'Red'?", options: ["The total size of the block in kilobytes", "Which mining pool produced the block", "The anticone size relative to the K parameter", "The number of transactions inside the block"], correctIndex: 2, explanation: "GHOSTDAG classifies blocks as Blue (honest) or Red (potentially conflicting) based on anticone size constraints." },
      { id: "q-2-6-1", lessonId: "lesson-2-6", question: "What does the K parameter control in GHOSTDAG?", options: ["The amount of block reward given to miners", "The maximum allowed anticone size for blue blocks", "The expected network latency between nodes", "The minimum transaction fees for inclusion"], correctIndex: 1, explanation: "K is the security parameter that controls maximum anticone size - blocks exceeding K are marked red." },
      { id: "q-2-7-1", lessonId: "lesson-2-7", question: "What is a 'Mergeset' in GHOSTDAG?", options: ["Blocks that were discarded during consensus process", "Collection of blocks merged when creating a new block", "Orphaned blocks that could not reach consensus", "Transactions that failed validation checks"], correctIndex: 1, explanation: "The mergeset is GHOSTDAG's collection of blocks that are merged together when a new block is created." },
      { id: "q-2-8-1", lessonId: "lesson-2-8", question: "What terminology does Bitcoin use that Kaspa replaces with DAG concepts?", options: ["Merkle tree hashing and cryptographic verification", "'Previous block' becomes Past/Future/Anticone relationships", "SHA-256 hash functions for proof-of-work mining", "Digital signature verification using ECDSA"], correctIndex: 1, explanation: "Bitcoin uses simple 'previous/next block' terminology, while Kaspa uses DAG concepts like Past, Future, Anticone, and Mergeset." },

      // Course 3: DAG and Kaspa Structure - 5 lessons
      { id: "q-3-1-1", lessonId: "lesson-3-1", question: "What are the two main components of a graph?", options: ["Blocks and chains connected in sequence", "Vertices (nodes) and edges (connections)", "Inputs and outputs for transactions", "Headers and bodies of data blocks"], correctIndex: 1, explanation: "Graphs consist of vertices (nodes/points) connected by edges (arcs/links/lines)." },
      { id: "q-3-2-1", lessonId: "lesson-3-2", question: "What makes a graph 'directed'?", options: ["The graph structure moves in one direction only", "Each edge points from one vertex to another with direction", "The graph contains no cycles or loops at all", "Elements are sorted in alphabetical order"], correctIndex: 1, explanation: "In a directed graph, each edge has a specific direction - from one vertex to another, not bidirectional." },
      { id: "q-3-3-1", lessonId: "lesson-3-3", question: "What makes a DAG 'acyclic'?", options: ["The graph structure contains no edges at all", "Following directed edges never returns you to the start", "The graph continuously moves in circular patterns", "There is only one possible path through the graph"], correctIndex: 1, explanation: "Acyclic means no cycles - you can never return to where you started by following directed edges." },
      { id: "q-3-4-1", lessonId: "lesson-3-4", question: "What is the key structural difference between Bitcoin and Kaspa?", options: ["They use completely different cryptographic hash algorithms", "Kaspa allows blocks to point to MULTIPLE previous blocks", "They have significantly different maximum block sizes", "They are written in different programming languages"], correctIndex: 1, explanation: "Bitcoin's chain allows blocks to point to only ONE parent, while Kaspa's BlockDAG allows MULTIPLE parents - enabling parallel block inclusion." },
      { id: "q-3-5-1", lessonId: "lesson-3-5", question: "Where do all paths in Kaspa's BlockDAG eventually lead?", options: ["To the most recently created block in the DAG", "To any randomly selected block in the structure", "Back to the Genesis block at the beginning", "To an endless loop that never terminates"], correctIndex: 2, explanation: "In Kaspa's acyclic DAG, following connections always leads back to Genesis - never in a cycle." },

      // Course 4: Foundational Concepts - 5 lessons
      { id: "q-4-1-1", lessonId: "lesson-4-1", question: "Why can Kaspa achieve higher throughput than Bitcoin?", options: ["Kaspa uses significantly larger block sizes for data", "All valid parallel blocks are included, not orphaned", "Kaspa has more miners participating in consensus", "Kaspa requires faster internet for all nodes"], correctIndex: 1, explanation: "The DAG structure allows all valid blocks to be included even if created simultaneously - no work is wasted." },
      { id: "q-4-2-1", lessonId: "lesson-4-2", question: "What are 'Tips' in DAG terminology?", options: ["The transaction fees paid by users to miners", "Blocks that have no future blocks yet - the leading edge", "Blocks that failed validation and were rejected", "The mining rewards distributed to block creators"], correctIndex: 1, explanation: "Tips are blocks with no children yet - they are the 'leading edge' of the DAG." },
      { id: "q-4-3-1", lessonId: "lesson-4-3", question: "How does GHOSTDAG achieve agreement on transaction ordering?", options: ["Through random selection of valid transactions", "By ordering all blocks despite parallel creation", "Using first-come-first-served transaction processing", "Through majority voting by network validators"], correctIndex: 1, explanation: "GHOSTDAG provides total ordering of all blocks even when created in parallel, enabling transaction consensus." },
      { id: "q-4-4-1", lessonId: "lesson-4-4", question: "What happens when a block violates K-cluster constraints?", options: ["The block is permanently deleted from the network", "It's classified as 'Red' and excluded from main consensus", "The entire network rejects all its transactions", "All mining operations temporarily stop processing"], correctIndex: 1, explanation: "Blocks with anticone size exceeding K are marked 'red' - excluded from main consensus ordering." },
      { id: "q-4-5-1", lessonId: "lesson-4-5", question: "What does increasing BPS (Blocks Per Second) affect?", options: ["Only the block rewards distributed to miners", "Throughput, K parameter, and confirmation times", "Nothing else in the network changes significantly", "Only the mining difficulty adjustment algorithm"], correctIndex: 1, explanation: "BPS affects many parameters: higher BPS means more throughput but K must increase proportionally." },

      // Course 5: Core Data Structures - 4 lessons
      { id: "q-5-1-1", lessonId: "lesson-5-1", question: "How does the UTXO model track ownership?", options: ["Account balances stored like traditional banks", "Individual 'coins' that are spent and created", "Credit and debit entries in a ledger", "Token transfers between user accounts"], correctIndex: 1, explanation: "UTXO tracks individual unspent outputs like specific bills - receiving creates new UTXOs, spending consumes them." },
      { id: "q-5-2-1", lessonId: "lesson-5-2", question: "What unique property does MuHash have for UTXO verification?", options: ["It computes significantly faster than SHA-256 hashing", "Adding/removing UTXOs is O(1) without rehashing everything", "It requires substantially less memory for storage", "It provides resistance against quantum computing attacks"], correctIndex: 1, explanation: "MuHash allows incremental updates - adding or removing a UTXO is constant time, no need to rehash the entire set." },
      { id: "q-5-3-1", lessonId: "lesson-5-3", question: "What does the 'Accepted Merkle Root' commit to in Kaspa?", options: ["Only the transactions contained in this block", "All accepted transactions from the block's mergeset", "Exclusively blue block transaction references", "Transactions expected in future block updates"], correctIndex: 1, explanation: "The Accepted Merkle Root commits to all accepted transactions from the mergeset, not just the block's own transactions." },
      { id: "q-5-4-1", lessonId: "lesson-5-4", question: "How is the 'Selected Parent' chosen among a block's parents?", options: ["Random selection from available parents", "Oldest parent block timestamp first", "The one with highest Blue Work value", "Parent with smallest block data size"], correctIndex: 2, explanation: "The Selected Parent is the tip with highest Blue Work - this determines which chain the new block extends." },

      // Course 6: GHOSTDAG Mechanics - 5 lessons
      { id: "q-6-1-1", lessonId: "lesson-6-1", question: "What factors determine the K parameter value?", options: ["Block reward amounts and transaction fees", "BPS rate, network delay, and security level", "Total number of miners on the network", "Current transaction volume and mempool size"], correctIndex: 1, explanation: "K is calculated from blocks per second, network propagation delay, and desired security guarantees." },
      { id: "q-6-2-1", lessonId: "lesson-6-2", question: "Why is parent ordering important in GHOSTDAG?", options: ["For user interface display purposes only", "For consistent mergeset creation across all nodes", "For calculating mining reward distributions", "For determining transaction fee priorities"], correctIndex: 1, explanation: "Deterministic parent ordering ensures all nodes create the same mergeset for consistent consensus." },
      { id: "q-6-3-1", lessonId: "lesson-6-3", question: "What determines the order of blocks in a mergeset?", options: ["Time when block was first received by node", "Total size of block data in bytes", "Blue Work - highest first, then recursively", "Random cryptographic selection algorithm"], correctIndex: 2, explanation: "Mergeset blocks are ordered by Blue Work (highest first), with ties broken by processing order recursively." },
      { id: "q-6-4-1", lessonId: "lesson-6-4", question: "What makes a block classified as 'Blue' in GHOSTDAG?", options: ["It was discovered and mined before others", "Its anticone size relative to blue set is within K", "It contains more transactions than other blocks", "It has higher total transaction fees included"], correctIndex: 1, explanation: "Blue blocks have anticone sizes within K relative to existing blue set - indicating honest, well-connected mining." },
      { id: "q-6-5-1", lessonId: "lesson-6-5", question: "What is 'Blue Work' used for in Kaspa?", options: ["Calculating miner reward distributions", "Chain selection - picking the canonical chain", "Adjusting mining difficulty targets", "Determining transaction fee amounts"], correctIndex: 1, explanation: "Blue Work is the cumulative proof-of-work from blue blocks - the chain with highest Blue Work is canonical." },

      // Course 7: Consensus Parameters - 6 lessons
      { id: "q-7-1-1", lessonId: "lesson-7-1", question: "What is the formula relationship between BPS and target block time?", options: ["BPS equals Block Time directly", "Target Block Time = 1/BPS", "BPS equals Block Size value", "No mathematical relationship"], correctIndex: 1, explanation: "Target Block Time equals 1 divided by BPS - e.g., 10 BPS means 0.1 second block time." },
      { id: "q-7-2-1", lessonId: "lesson-7-2", question: "Why is there a Mergeset Size Limit?", options: ["To conserve network bandwidth resources", "To prevent DoS attacks from blocks referencing too many parents", "To limit miner reward distributions", "To accelerate the mining process"], correctIndex: 1, explanation: "Without limits, attackers could create blocks referencing thousands of blocks, causing excessive computation." },
      { id: "q-7-3-1", lessonId: "lesson-7-3", question: "What does Merge Depth Bound prevent?", options: ["Creation of fast blocks in the network", "Deep reorganizations of already-finalized transactions", "Excessive transaction fees in blocks", "Processing of large blocks in the DAG"], correctIndex: 1, explanation: "Merge Depth Bound prevents referencing very old blocks, ensuring finalized transactions stay final." },
      { id: "q-7-4-1", lessonId: "lesson-7-4", question: "What are the two types of finality in Kaspa?", options: ["Fast and slow", "Probabilistic (decreasing chance of reorg) and Deterministic (mathematically impossible)", "Soft and hard", "Local and global"], correctIndex: 1, explanation: "Probabilistic finality means reorg chance decreases with depth; deterministic means reversal becomes impossible." },
      { id: "q-7-5-1", lessonId: "lesson-7-5", question: "What is the DAA Window used for?", options: ["Distributing block rewards to miners", "Calculating difficulty based on recent block times", "Determining transaction ordering in blocks", "Estimating transaction fee requirements"], correctIndex: 1, explanation: "The DAA Window is a sliding window of blocks used to calculate target difficulty for stable block times." },
      { id: "q-7-6-1", lessonId: "lesson-7-6", question: "What gets preserved when a node prunes old block data?", options: ["Everything is kept in full storage", "Nothing at all - complete reset occurs", "Block headers, UTXO set, and MuHash commitments", "Only transaction data is preserved"], correctIndex: 2, explanation: "Pruning removes block bodies but preserves headers, current UTXO set, and MuHash commitments for verification." },

      // Course 8: Block Processing - 2 lessons
      { id: "q-8-1-1", lessonId: "lesson-8-1", question: "What are the four stages of Kaspa's block processing pipeline?", options: ["Mine the block, broadcast it, confirm transactions, spend outputs", "Header validation, Body validation, Virtual chain update, Pruning consideration", "Create the block, sign transactions, send to network, receive confirmation", "Hash the data, verify signatures, store in database, broadcast result"], correctIndex: 1, explanation: "Blocks go through: Header validation, Body validation, Virtual chain update, and Pruning consideration." },
      { id: "q-8-2-1", lessonId: "lesson-8-2", question: "What is the difference between Blue Score and Blue Work?", options: ["No difference", "Blue Score counts blue blocks; Blue Work sums proof-of-work from blue blocks", "Blue Work counts blocks; Blue Score sums work", "Both measure the same thing"], correctIndex: 1, explanation: "Blue Score is a simple count of blue ancestors; Blue Work accounts for varying difficulty levels." },

      // Course 9: Difficulty Adjustment - 2 lessons
      { id: "q-9-1-1", lessonId: "lesson-9-1", question: "How often does Kaspa adjust mining difficulty?", options: ["Every 2016 blocks like Bitcoin does", "Every single block that is created", "Once per day at a fixed time", "Never adjusts mining difficulty"], correctIndex: 1, explanation: "Kaspa adjusts difficulty every block using a sliding window, allowing quick response to hashrate changes." },
      { id: "q-9-2-1", lessonId: "lesson-9-2", question: "Why does Kaspa use DAA Score separately from Blue Score?", options: ["For marketing and branding purposes only", "DAA Score provides accurate time measurement even during attacks", "They are the same thing with different names", "Historical reasons from early development"], correctIndex: 1, explanation: "DAA Score may include red blocks for accurate elapsed time measurement, while Blue Score only counts honest blocks." },

      // Course 10: Transaction Processing - 3 lessons
      { id: "q-10-1-1", lessonId: "lesson-10-1", question: "Why are fees typically low on Kaspa compared to congested chains?", options: ["No miners are participating in the network", "High BPS means mempool is often empty - less competition for space", "Larger blocks can fit more transactions", "Fewer transactions are submitted overall"], correctIndex: 1, explanation: "With high blocks per second, transactions get included quickly and there's less competition for block space." },
      { id: "q-10-2-1", lessonId: "lesson-10-2", question: "What does KIP-9 Storage Mass address?", options: ["Improving mining efficiency for miners", "UTXO set bloat by charging for creating UTXOs", "Reducing network latency between nodes", "Speeding up block propagation times"], correctIndex: 1, explanation: "Storage Mass (KIP-9) charges for creating UTXOs and credits consuming them, encouraging consolidation." },
      { id: "q-10-3-1", lessonId: "lesson-10-3", question: "What makes coinbase transactions special?", options: ["They have higher fees than others", "They create new coins with no inputs", "They are faster than other types", "They are reversible unlike others"], correctIndex: 1, explanation: "Coinbase transactions are the first in each block - they create new coins from nothing as block rewards." },

      // Course 11: Pruning System - 3 lessons
      { id: "q-11-1-1", lessonId: "lesson-11-1", question: "What does First Order Pruning remove?", options: ["Block headers from the database", "Transaction data and block bodies", "The current UTXO set entirely", "Proof-of-work from block records"], correctIndex: 1, explanation: "First Order Pruning removes old transaction data and block bodies while preserving headers and UTXO set." },
      { id: "q-11-2-1", lessonId: "lesson-11-2", question: "What additional data does Second Order Pruning remove?", options: ["Nothing more than first order pruning", "Old block headers through checkpoint compression", "The current UTXO set from storage", "Recent transactions from the mempool"], correctIndex: 1, explanation: "Second Order Pruning removes individual headers at depth, preserving proof-of-work through checkpoints." },
      { id: "q-11-3-1", lessonId: "lesson-11-3", question: "Who should run archival nodes vs pruning nodes?", options: ["Everyone should run archival", "Block explorers and researchers run archival; most users run pruning", "No one needs archival nodes", "Only miners run archival"], correctIndex: 1, explanation: "Archival nodes are for block explorers and research; most users can run lightweight pruning nodes." },

      // Course 12: Anticone Finalization - 2 lessons
      { id: "q-12-1-1", lessonId: "lesson-12-1", question: "When is a block's anticone considered 'finalized'?", options: ["Immediately upon block creation", "When no new blocks can legally reference blocks that would enter its anticone", "After one confirmation is received", "Never - anticones change forever"], correctIndex: 1, explanation: "Anticone is finalized when merge depth bound prevents any new blocks from changing it." },
      { id: "q-12-2-1", lessonId: "lesson-12-2", question: "Why is anticone finalization important for pruning?", options: ["For enabling faster mining operations", "It guarantees when a block's ordering and status are permanent", "For reducing transaction fee costs", "For increasing transaction throughput"], correctIndex: 1, explanation: "Once anticone is finalized, the block's final ordering is permanent, making it safe to prune." },

      // Course 13: Virtual State - 2 lessons
      { id: "q-13-1-1", lessonId: "lesson-13-1", question: "What is the 'Virtual Block' in Kaspa?", options: ["A fake block used for testing purposes", "An imaginary block that represents the current DAG tip state", "A block with no transactions inside it", "A future block that hasn't been mined"], correctIndex: 1, explanation: "The Virtual Block is a conceptual block referencing all current tips, representing the DAG's current state." },
      { id: "q-13-2-1", lessonId: "lesson-13-2", question: "How are Virtual Parents selected?", options: ["Through random selection from DAG", "All current tips become virtual parents", "Only the oldest tip is selected", "Only blue blocks can be parents"], correctIndex: 1, explanation: "The Virtual Block references all current tips as parents, merging the entire leading edge of the DAG." },

      // Course 14: Timestamps - 2 lessons
      { id: "q-14-1-1", lessonId: "lesson-14-1", question: "What is Past Median Time (PMT) used for?", options: ["Calculating miner reward amounts", "Timestamp validation to prevent manipulation", "Determining transaction ordering sequence", "Calculating transaction fee amounts"], correctIndex: 1, explanation: "Past Median Time provides a manipulation-resistant timestamp reference for validation." },
      { id: "q-14-2-1", lessonId: "lesson-14-2", question: "Why can't block timestamps be arbitrarily set by miners?", options: ["Hardware limitations prevent arbitrary times", "They must be within bounds relative to PMT and current time", "Network rules prevent timestamp changes", "Other miners would reject invalid blocks"], correctIndex: 1, explanation: "Timestamps must be greater than PMT and within acceptable bounds of current time." },

      // Course 15: Finality & Security - 3 lessons
      { id: "q-15-1-1", lessonId: "lesson-15-1", question: "How does the K parameter contribute to security?", options: ["It sets transaction fee requirements", "It bounds anticone size to detect attacks while allowing parallelism", "It controls block size maximums", "It adjusts difficulty algorithm"], correctIndex: 1, explanation: "K bounds acceptable anticone size - staying within K indicates honest behavior, exceeding it signals potential attacks." },
      { id: "q-15-2-1", lessonId: "lesson-15-2", question: "What is 'confirmation depth' vs 'finality depth'?", options: ["Same thing", "Confirmation is reasonable confidence; finality is mathematically impossible reversal", "Confirmation is slower than finality", "Finality happens first"], correctIndex: 1, explanation: "Confirmation depth gives reasonable confidence; finality depth means reversal is mathematically impossible." },
      { id: "q-15-3-1", lessonId: "lesson-15-3", question: "Why does Kaspa achieve finality in minutes rather than hours?", options: ["Weaker security guarantees overall", "High BPS means more blocks accumulate quickly", "Fewer nodes need to sync data", "Smaller blocks process faster"], correctIndex: 1, explanation: "With high blocks per second, sufficient confirmation depth is reached in minutes rather than hours." },

      // Course 16: Network & Scaling - 2 lessons
      { id: "q-16-1-1", lessonId: "lesson-16-1", question: "What was the Crescendo Hard Fork?", options: ["A security patch", "Upgrade from 1 BPS to 10 BPS on mainnet", "A new mining algorithm", "A wallet update"], correctIndex: 1, explanation: "Crescendo upgraded Kaspa from 1 BPS to 10 BPS on mainnet in May 2025 - 600x faster than Bitcoin." },
      { id: "q-16-2-1", lessonId: "lesson-16-2", question: "How does Kaspa's architecture prove the scalability trilemma can be solved?", options: ["By sacrificing security", "By centralizing", "Through BlockDAG structure that enables speed without sacrificing security or decentralization", "By using proof-of-stake"], correctIndex: 2, explanation: "Kaspa proves the trilemma was a limitation of chains, not proof-of-work - the DAG structure solves it." },
    ];

export { courses, allLessons as lessons, allQuestions as quizQuestions };
