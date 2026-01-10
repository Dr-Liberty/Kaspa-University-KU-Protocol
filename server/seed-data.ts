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
        id: "sound-money",
        title: "Sound Money & Monetary Debasement",
        description: "Explore the principles of sound money and how fiat currency debasement erodes purchasing power over time. Learn about the inflation hurdle every investor must overcome, the history of dollar devaluation, and why scarce digital assets like Kaspa represent a return to sound monetary principles.",
        thumbnail: "/thumbnails/sound_money_gold_scale.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "self-custody",
        title: "Self-Custody & Hardware Wallets",
        description: "Understand the critical importance of self-custody for financial sovereignty. Learn about hot wallets, cold storage, hardware wallets, and seed phrase security. Discover why holding your own keys to native Kaspa is essential for true ownership.",
        thumbnail: "/thumbnails/self_custody_wallet_key.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "ku-protocol",
        title: "KU Protocol: On-Chain Achievements",
        description: "Understand how Kaspa University's KU Protocol creates immutable achievement records on the blockchain. Learn about wallet-signed proofs, quiz verification, and how on-chain education credentials work.",
        thumbnail: "/thumbnails/ku_protocol_achievements.png",
        lessonCount: 3,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Protocols",
      },
      {
        id: "k-protocol",
        title: "K Protocol: Decentralized Social Media",
        description: "Learn how K Protocol enables censorship-resistant public messaging on Kaspa. Discover K Social, the Twitter/X alternative built on BlockDAG, and see how Kaspa University uses K Protocol for public Q&A discussions.",
        thumbnail: "/thumbnails/k_protocol_social.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Protocols",
      },
      {
        id: "kasia-protocol",
        title: "Kasia Protocol: Encrypted P2P Messaging",
        description: "Explore Kasia, the end-to-end encrypted messaging protocol on Kaspa. Learn how private conversations work on a public blockchain, with in-chat payments and KNS integration. See how Kaspa University uses Kasia for admin support and direct messaging.",
        thumbnail: "/thumbnails/kasia_encrypted_messaging.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "beginner",
        category: "Protocols",
      },
      {
        id: "krc721-nft-standard",
        title: "KRC-721: NFT Standard on Kaspa",
        description: "Master Kaspa's NFT standard for unique digital assets. Learn about commit-reveal minting, IPFS metadata, royalty support, and how Kaspa University issues verifiable diploma NFTs to graduates.",
        thumbnail: "/thumbnails/krc721_nft_standard.png",
        lessonCount: 4,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Protocols",
      },
      {
        id: "l2-on-kaspa",
        title: "Layer 2 on Kaspa: Smart Contracts & Beyond",
        description: "Discover Kaspa's L2 ecosystem including Kasplex zkEVM (birthplace of BMTUniversity.com) and Igra Labs. Learn step-by-step how to bridge KAS using Kurve and KSPR Bot. Understand how smart contracts expand Kaspa's capabilities for DeFi, gaming, and more.",
        thumbnail: "/thumbnails/l2_kaspa_ecosystem.png",
        lessonCount: 5,
        kasReward: 0.1,
        difficulty: "intermediate",
        category: "Development",
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
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces Satoshi Nakamoto's original vision for Bitcoin as peer-to-peer electronic cash and examines how scalability constraints transformed it into a store of value.</p>
<p><strong>Satoshi's Vision</strong></p>
<p>In 2009, Satoshi Nakamoto published a whitepaper titled "Bitcoin: A Peer-to-Peer Electronic Cash System." The opening statement articulated a clear vision: a purely peer-to-peer version of electronic cash enabling online payments sent directly between parties without financial intermediaries. This represented a revolutionary concept—transactions secured by mathematics and consensus rather than trust in institutions.</p>
<p><strong>The Trust Problem Solved</strong></p>
<p>Bitcoin proved that strangers across the globe could agree on a shared truth without trusting each other. Nakamoto wrote: "What is needed is an electronic payment system based on cryptographic proof instead of trust, allowing any two willing parties to transact directly without the need for a trusted third party."</p>
<p><strong>Emergence of Limitations</strong></p>
<p>As Bitcoin grew, practical limitations emerged. To ensure security and decentralization, Bitcoin processes approximately seven transactions per second, with new blocks appearing roughly every ten minutes. As adoption increased, so did fees and wait times. The peer-to-peer electronic cash system evolved into primarily a store of value—digital gold rather than digital cash.</p>
<p><strong>Key Takeaway</strong></p>
<p>Bitcoin's architectural constraints created a fundamental tradeoff between its original vision as fast electronic cash and its practical reality as a store of value.</p>`,
      },
      {
        id: "lesson-1-2",
        courseId: "bitcoin-vs-kaspa",
        title: "The Scalability Trilemma",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the blockchain scalability trilemma, analyzes the fundamental tradeoffs between decentralization, security, and scalability, and introduces the question of whether the chain structure itself is the constraint.</p>
<p><strong>The Trust Problem</strong></p>
<p>Satoshi identified the core problem in the whitepaper: commerce on the Internet relies almost exclusively on financial institutions serving as trusted third parties. While this system works adequately for most transactions, it suffers from inherent weaknesses of the trust-based model. Bitcoin solved this trust problem through cryptographic proof.</p>
<p><strong>The Trilemma Defined</strong></p>
<p>As blockchain technology matured, developers recognized a fundamental constraint: systems can only optimize for two of three properties. Decentralization allows anyone to participate without central authority. Security ensures resistance to attacks. Scalability enables high transaction volume. Bitcoin prioritized decentralization and security. Centralized payment systems like Visa chose scalability and security. Many alternative cryptocurrencies chose scalability and decentralization, often compromising security.</p>
<p><strong>The Structural Constraint</strong></p>
<p>The chain structure—one block after another—creates the bottleneck. Security requires computational work, and work takes time. The chain forces blocks to wait in sequence. For years, practitioners believed this trilemma was unsolvable; the blockchain structure itself seemed to mandate these tradeoffs.</p>
<p><strong>Key Takeaway</strong></p>
<p>The fundamental question emerged: what if the problem was not the consensus mechanism itself, but the linear chain structure?</p>`,
      },
      {
        id: "lesson-1-3",
        courseId: "bitcoin-vs-kaspa",
        title: "Enter Kaspa",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces Kaspa and its creator, explains the fundamental insight that the chain structure is the bottleneck, and describes how the BlockDAG architecture addresses scalability while preserving security.</p>
<p><strong>The Vision Gap</strong></p>
<p>Satoshi's vision was clear: peer-to-peer electronic cash for everyday transactions. As Bitcoin grew, that vision became impractical—waiting ten minutes for coffee, paying high fees for small transactions. The peer-to-peer cash system evolved into primarily a store of value.</p>
<p><strong>Dr. Yonatan Sompolinsky's Research</strong></p>
<p>Kaspa was created by Dr. Yonatan Sompolinsky, a Harvard doctorate holder and one of the most cited researchers in cryptography worldwide. His research on Bitcoin's limitations began in 2013, with academic papers on blockchain scaling so influential they were cited by Ethereum's founders. His critical insight: Bitcoin's bottleneck is not proof-of-work, but the chain structure itself.</p>
<p><strong>The BlockDAG Solution</strong></p>
<p>A blockchain requires blocks to form a single sequence, with each block referencing exactly one parent. When two miners find blocks simultaneously, one is orphaned—wasted work and energy. Dr. Sompolinsky asked: what if all valid blocks counted? Kaspa uses a BlockDAG (Directed Acyclic Graph) where blocks can have multiple parents. This eliminates orphans, prevents wasted work, and enables parallel processing while maintaining the same proof-of-work security model.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa fulfills Satoshi's original vision by preserving Bitcoin's security principles while achieving the speed necessary for practical peer-to-peer electronic cash.</p>`,
      },
      {
        id: "lesson-1-4",
        courseId: "bitcoin-vs-kaspa",
        title: "Understanding the Chain",
        order: 4,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson visualizes blockchain architecture as a linear structure, explains the orphan block problem, and demonstrates why the chain structure inherently limits throughput.</p>
<p><strong>The Linear Architecture</strong></p>
<p>A blockchain operates like a train track: one rail, one direction. Each block connects to exactly one preceding block, forming a sequential chain. This simple structure provides clarity and determinism but imposes significant constraints.</p>
<p><strong>The Orphan Problem</strong></p>
<p>When two miners discover valid blocks simultaneously, only one can extend the chain. The other becomes an "orphan block"—all computational work invested in that block is wasted. Bitcoin's solution: make blocks sufficiently infrequent (approximately ten minutes) that simultaneous discoveries are rare.</p>
<p><strong>The Fundamental Constraint</strong></p>
<p>This approach works but creates a fundamental speed limit. The chain structure forces this tradeoff. Accelerating Bitcoin without breaking its security model is not possible because the architecture itself is the constraint.</p>
<p><strong>Key Takeaway</strong></p>
<p>The linear chain architecture creates an inherent bottleneck that no parameter adjustment can overcome without compromising security.</p>`,
      },
      {
        id: "lesson-1-5",
        courseId: "bitcoin-vs-kaspa",
        title: "The DAG Difference",
        order: 5,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson contrasts DAG architecture with linear chains, explains how BlockDAG enables parallel block processing, and demonstrates why this represents a fundamental advancement in distributed consensus.</p>
<p><strong>Visualizing the DAG</strong></p>
<p>Consider a river delta: water flowing through multiple channels, all heading to the same ocean. Multiple paths, multiple streams, all valid. This describes a Directed Acyclic Graph (DAG). In Kaspa's BlockDAG, blocks can reference multiple parent blocks, parallel blocks are all included rather than orphaned, no computational work is wasted, and the network processes multiple blocks per second.</p>
<p><strong>Parallel Block Inclusion</strong></p>
<p>When two miners find blocks simultaneously, both blocks become part of the permanent record. They reference each other, and the DAG weaves them together into a coherent structure. This eliminates the competitive exclusion that plagues linear blockchains.</p>
<p><strong>Key Takeaway</strong></p>
<p>The BlockDAG architecture represents a fundamental reimagining of distributed consensus, not merely an incremental improvement to existing blockchain designs.</p>`,
      },
      {
        id: "lesson-1-6",
        courseId: "bitcoin-vs-kaspa",
        title: "GHOSTDAG: Ordering the Chaos",
        order: 6,
        duration: "6 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the GHOSTDAG consensus protocol, explains how it achieves deterministic transaction ordering in a parallel block environment, and demonstrates its mathematical security guarantees.</p>
<p><strong>The Ordering Challenge</strong></p>
<p>Having parallel blocks creates a new problem: how do you order transactions when blocks arrive simultaneously? Dr. Yonatan Sompolinsky solved this with GHOSTDAG (Greedy Heaviest-Observed SubDAG), a consensus protocol born from his years of research at Harvard and his deep expertise in distributed systems.</p>
<p><strong>How GHOSTDAG Works</strong></p>
<p>GHOSTDAG employs an elegant approach. First, it identifies the "main" chain of blocks—the heaviest path through the DAG. Then, parallel blocks are ordered relative to this main chain. Finally, transactions receive a deterministic order that all nodes agree upon. The result: the speed of parallel processing with the consistency of a sequential chain.</p>
<p><strong>Mathematical Security Guarantees</strong></p>
<p>Bitcoin maximalists often ask how double-spends are prevented without a single chain. GHOSTDAG is the answer. Dr. Sompolinsky's research proved mathematically that the same security guarantees as Bitcoin's longest-chain rule can be achieved, just faster. This was not speculation but rigorous academic work, peer-reviewed and cited by leading cryptographers. The protocol provides equivalent guarantees without the ten-minute wait.</p>
<p><strong>Key Takeaway</strong></p>
<p>GHOSTDAG enables Kaspa to maintain Bitcoin-equivalent security while processing blocks in parallel, resolving the apparent conflict between speed and determinism.</p>`,
      },
      {
        id: "lesson-1-7",
        courseId: "bitcoin-vs-kaspa",
        title: "Visual: Chain vs DAG",
        order: 7,
        duration: "4 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides visual representations of blockchain versus BlockDAG structures, illustrating how each architecture handles concurrent blocks.</p>
<p><strong>The Blockchain Model</strong></p>
<p>In Bitcoin's blockchain, blocks form a linear sequence: Block 1 leads to Block 2, then Block 3, then Block 4. When a competing Block 3b is discovered simultaneously, it becomes orphaned—discarded from the main chain. This represents one path forward where orphans are discarded, resulting in a slow but steady progression.</p>
<p><strong>The BlockDAG Model</strong></p>
<p>In Kaspa's BlockDAG, multiple blocks can emerge from the same point. Block 2a, Block 2b, and Block 2c can all exist concurrently, each referencing the same parent (Block 1). These parallel blocks then merge together into subsequent blocks. Multiple paths are woven together, all work counts, and the structure is both fast and secure.</p>
<p><strong>Key Takeaway</strong></p>
<p>The BlockDAG does not sacrifice security for speed—it removes the artificial bottleneck that linear chains create.</p>`,
      },
      {
        id: "lesson-1-8",
        courseId: "bitcoin-vs-kaspa",
        title: "The Speed Comparison",
        order: 8,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides quantitative comparisons between Bitcoin and Kaspa performance metrics, explains Kaspa's roadmap for increased throughput, and addresses the relationship between block speed and security.</p>
<p><strong>Bitcoin Performance Metrics</strong></p>
<p>Bitcoin operates with block times of approximately ten minutes, producing 0.0017 blocks per second (one block every 600 seconds). This enables approximately seven transactions per second, with confirmation times ranging from ten to sixty minutes for sufficient confidence.</p>
<p><strong>Kaspa Current Performance</strong></p>
<p>Kaspa currently operates with 100-millisecond block times, producing ten blocks per second. This enables over 100 transactions per second (and growing), with confirmation times of approximately ten seconds at high confidence. Kaspa produces 6,000 times more blocks than Bitcoin.</p>
<p><strong>Roadmap and Future Scaling</strong></p>
<p>Kaspa's roadmap includes scaling to 100 blocks per second within one to three years, enabling even faster confirmations and massive throughput increases.</p>
<p><strong>Speed and Security</strong></p>
<p>Traditional blockchain thinking assumed fast blocks meant more orphans, wasted work, and centralization pressure. Dr. Sompolinsky's BlockDAG breaks this assumption. Parallel blocks are not orphaned—they are all included. Speed does not compromise security when the chain bottleneck is removed.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa demonstrates that the scalability trilemma was a limitation of linear chains, not of proof-of-work consensus itself.</p>`,
      },
      {
        id: "lesson-1-9",
        courseId: "bitcoin-vs-kaspa",
        title: "Security Without Sacrifice",
        order: 9,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson demonstrates that Kaspa maintains Bitcoin-equivalent security guarantees, explains how speed actually enhances security by eliminating MEV attacks, and clarifies the structural versus security differences between the two architectures.</p>
<p><strong>Proof-of-Work Security Model</strong></p>
<p>Bitcoin's security derives from proof-of-work—miners expending real energy to validate blocks, making attacks economically prohibitive. Kaspa uses the identical security model: the kHeavyHash proof-of-work algorithm, ASIC miners securing the network, 51% attack resistance, and no staking, validators, or trusted parties. The difference is structural, not security-related. Kaspa's DAG allows parallel blocks without reducing the work required to produce them.</p>
<p><strong>Anti-MEV by Design</strong></p>
<p>A frequently overlooked security advantage: Kaspa's speed makes MEV (Maximal Extractable Value) attacks nearly impossible. MEV occurs when miners or validators reorder, insert, or censor transactions to extract profit—such as front-running trades on a DEX. On slower chains, attackers have time to observe transactions and insert their own ahead. With ten blocks per second, no time exists for these attacks. By the time an attacker sees a transaction and attempts to front-run it, the transaction is already confirmed. The attack window is measured in milliseconds, not minutes.</p>
<p><strong>Speed as Security</strong></p>
<p>This is not merely speed for convenience—it is speed as a security feature. The proof-of-work remains equally difficult, energy expenditure equally real, yet security is actually enhanced because speed eliminates entire categories of attacks.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa achieves better practical security than slower chains by maintaining full proof-of-work security while eliminating time-dependent attack vectors.</p>`,
      },
      {
        id: "lesson-1-10",
        courseId: "bitcoin-vs-kaspa",
        title: "Real-World Implications",
        order: 10,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines practical applications of Kaspa's speed across payments, DeFi, and mass adoption scenarios, and addresses why base layer speed matters more than Layer 2 solutions.</p>
<p><strong>Payment Applications</strong></p>
<p>One-second block times transform payment experiences. Consumers can complete purchases and walk away in seconds rather than minutes. Merchants receive confirmation before customers leave the counter. The friction of "waiting for confirmations" is eliminated entirely.</p>
<p><strong>DeFi Applications</strong></p>
<p>Decentralized finance benefits significantly from speed. Arbitrage opportunities that require rapid execution become viable. Smart contracts respond instantly to market conditions. Overall user experience improves dramatically when transactions settle in seconds.</p>
<p><strong>Adoption Implications</strong></p>
<p>Mass adoption requires intuitive user experiences. Newcomers are not confused by ten-minute waits—Kaspa works like modern payment applications. The barrier to entry is substantially lowered when the technology behaves as users expect.</p>
<p><strong>Layer 1 vs Layer 2 Speed</strong></p>
<p>Bitcoin maximalists sometimes suggest using the Lightning Network for speed. However, Lightning requires channels, liquidity management, and significant complexity. Kaspa achieves speed at Layer 1 with no additional steps required. Base layer speed is fundamental because it is the foundation upon which everything else is built.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa's base layer speed enables practical, everyday use cases that slower blockchains can only approximate through complex Layer 2 solutions.</p>`,
      },
      {
        id: "lesson-1-11",
        courseId: "bitcoin-vs-kaspa",
        title: "The Fair Launch Principle",
        order: 11,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines fair launch principles in cryptocurrency, compares Bitcoin and Kaspa's launch methodologies, and explains why fair launches contribute to network legitimacy.</p>
<p><strong>Bitcoin's Fair Launch</strong></p>
<p>Bitcoin was launched fairly with no premine (Satoshi did not allocate coins before launch), no ICO (no one "bought in" before mining started), no VC allocation (no investors received special treatment), and open source code from day one. This fair launch is part of what makes Bitcoin legitimate—everyone had equal opportunity to participate.</p>
<p><strong>Kaspa's Identical Approach</strong></p>
<p>Kaspa followed the same principles: no premine (zero coins existed before public mining began), no ICO (no token sale, no early investors), no developer allocation (the team mines like everyone else), and fully open source code that is public and auditable.</p>
<p><strong>Key Takeaway</strong></p>
<p>In a cryptocurrency landscape dominated by VC-backed projects with massive insider allocations, Kaspa stands out. Like Bitcoin, it earned its place through work, not hype.</p>`,
      },
      {
        id: "lesson-1-12",
        courseId: "bitcoin-vs-kaspa",
        title: "Decentralization in Practice",
        order: 12,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines decentralization, examines Kaspa's decentralization characteristics, and contrasts true decentralization with centralized alternatives that sacrifice security for speed.</p>
<p><strong>Defining Decentralization</strong></p>
<p>Decentralization is not merely a buzzword—it is the core value proposition of cryptocurrency. A truly decentralized network has no single point of failure, no single entity can censor transactions, no one can change the rules unilaterally, and anyone can participate (permissionless).</p>
<p><strong>Kaspa's Decentralization</strong></p>
<p>Kaspa demonstrates genuine decentralization: over 1,000 public nodes worldwide, ASIC mining distributed globally, no foundation controlling the protocol, community-driven development, and no corporate backing or VC influence.</p>
<p><strong>The Centralization Shortcut</strong></p>
<p>Some "fast" blockchains achieve speed by centralizing—using a small number of powerful validators. This creates vulnerabilities: validators can collude, governments can pressure them, and single points of failure exist. These networks often have just 21, 100, or a few hundred validators—many controlled by the same entities or running in the same data centers.</p>
<p><strong>Why It Matters</strong></p>
<p>Kaspa refuses this shortcut. With over 1,000 nodes spread across the globe, the network is genuinely decentralized. No government can shut down 1,000+ nodes in different countries. No corporation can push through unwanted changes. The network serves users, not insiders.</p>
<p><strong>Key Takeaway</strong></p>
<p>True decentralization is rare; Kaspa achieves it through architecture, not by sacrificing security for speed.</p>`,
      },
      {
        id: "lesson-1-13",
        courseId: "bitcoin-vs-kaspa",
        title: "Sound Money Properties",
        order: 13,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines sound money properties, compares Bitcoin and Kaspa's monetary characteristics, and explains why Kaspa combines store of value with practical usability.</p>
<p><strong>Sound Money Defined</strong></p>
<p>Bitcoin is often called "digital gold" because it shares gold's monetary properties: scarcity (21 million cap), durability (exists as long as the network runs), divisibility (satoshis), portability (send anywhere instantly), and fungibility (one BTC equals one BTC).</p>
<p><strong>Kaspa's Monetary Properties</strong></p>
<p>Kaspa shares these same properties: fixed supply with decreasing emission, proof-of-work backing (cannot be printed), high divisibility (sompi as the smallest unit), instant portability (one-second blocks), and censorship resistance.</p>
<p><strong>The Usability Difference</strong></p>
<p>Both Bitcoin and Kaspa qualify as "sound money"—they cannot be inflated away by central banks or governments. The difference: Kaspa is sound money that can actually be used for daily transactions without waiting ten minutes or paying high fees.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa combines the sound money properties of Bitcoin with the practical usability required for everyday transactions.</p>`,
      },
      {
        id: "lesson-1-14",
        courseId: "bitcoin-vs-kaspa",
        title: "Why Kaspa Could Win",
        order: 14,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson presents the case for Kaspa's potential, examining its shared values with Bitcoin, architectural advantages, and growth potential.</p>
<p><strong>Shared Values</strong></p>
<p>Kaspa is not trying to replace Bitcoin—it is trying to fulfill Bitcoin's original promise. Both share the same foundational values: proof-of-work security, fair launch with no insiders, decentralization first, and sound money principles.</p>
<p><strong>Architectural Advantages</strong></p>
<p>Where Kaspa distinguishes itself is architecture. The BlockDAG versus blockchain comparison, one-second blocks versus ten-minute blocks, no orphaned blocks, and scalability by design represent fundamental improvements rather than incremental changes.</p>
<p><strong>Growth Potential</strong></p>
<p>Kaspa's position offers significant room to grow: smaller market capitalization implies higher potential, active development continues, the community is growing, and the platform represents genuine technological innovation rather than marketing.</p>
<p><strong>Key Takeaway</strong></p>
<p>The question is not "Bitcoin or Kaspa?" but "Why not both?" Many Kaspa supporters hold Bitcoin too, viewing Kaspa as evolution rather than competition.</p>`,
      },
      {
        id: "lesson-1-15",
        courseId: "bitcoin-vs-kaspa",
        title: "Your Next Steps",
        order: 15,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson summarizes the course content and provides actionable next steps for securing and using Kaspa.</p>
<p><strong>Course Summary</strong></p>
<p>You now understand why Kaspa represents a significant technological advancement over traditional blockchain architecture. Bitcoin's blockchain creates inherent speed limitations; Kaspa's BlockDAG solves this without sacrificing security. Both share fair launch and decentralization principles. Kaspa is fast enough for real-world payments, and smart contracts and Layer 2 solutions are actively developing.</p>
<p><strong>Secure Your Kaspa</strong></p>
<p>For maximum security, keep most or all of your Kaspa on a hardware wallet. <a href="https://tangem.com/en/pricing/?cur=KAS" target="_blank">Tangem</a> offers a card-style hardware wallet with Kaspa support. <a href="https://www.ledger.com/" target="_blank">Ledger</a> provides industry-leading hardware security. Keep only small amounts on web or browser wallets for daily transactions.</p>
<p><strong>Web and Mobile Wallets</strong></p>
<p>For daily use, several options exist: <a href="https://kasware.xyz/" target="_blank">KasWare</a> (browser extension wallet), <a href="https://kaspium.io/" target="_blank">Kaspium</a> (mobile wallet), <a href="https://kastle.io/" target="_blank">Kastle</a> (web wallet), and <a href="https://kurncy.com/" target="_blank">Kurncy</a> (multi-asset wallet). The Kaspacom Wallet is coming soon.</p>
<p><strong>Use the Network</strong></p>
<p>Send some Kaspa to experience one-second blocks firsthand. Explore Kasplex tokens and join the community to participate in the ecosystem.</p>
<p><strong>Key Takeaway</strong></p>
<p>Continue learning through other courses, follow Kaspa development, and share your knowledge. Welcome to the future of proof-of-work cryptocurrency.</p>`,
      },

      // Course 2: Sound Money & Monetary Debasement - 4 lessons
      {
        id: "lesson-sm-1",
        courseId: "sound-money",
        title: "What is Sound Money?",
        order: 1,
        duration: "12 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines sound money, explains its essential characteristics, and examines why these properties matter for preserving purchasing power across generations.</p>
<p><strong>Defining Sound Money</strong></p>
<p>Sound money refers to currency that reliably maintains its value over time and cannot be arbitrarily created or manipulated by any central authority. Historically, gold served as the quintessential sound money for thousands of years because of its natural scarcity, durability, and resistance to counterfeiting. Sound money acts as a stable measuring stick for economic value, enabling individuals to plan for the future with confidence.</p>
<p><strong>Essential Characteristics</strong></p>
<p>Sound money must possess several key properties. Scarcity ensures that the supply cannot be easily expanded, protecting against dilution. Durability means the money retains its physical integrity over time. Divisibility allows it to be broken into smaller units for various transaction sizes. Portability enables efficient transfer across distances. Fungibility ensures that each unit is interchangeable with every other unit.</p>
<p><strong>Sound Money vs Fiat Currency</strong></p>
<p>Fiat currency—government-issued money not backed by physical commodities—lacks the scarcity constraint that defines sound money. Central banks can create unlimited quantities of fiat currency through monetary policy, gradually eroding purchasing power. This fundamental difference explains why a dollar today purchases far less than a dollar from previous decades.</p>
<p><strong>Key Takeaway</strong></p>
<p>Sound money preserves value through scarcity and resistance to manipulation, serving as a reliable store of wealth across time while fiat currencies systematically lose purchasing power.</p>`,
      },
      {
        id: "lesson-sm-2",
        courseId: "sound-money",
        title: "The History of Dollar Debasement",
        order: 2,
        duration: "15 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson traces the historical transition from gold-backed currency to pure fiat money, explains the mechanisms of monetary debasement, and quantifies the dollar's loss of purchasing power since 1971.</p>
<p><strong>The Gold Standard Era</strong></p>
<p>Under the classical gold standard, paper currency represented a claim on physical gold held in reserve. This constraint limited government spending to actual revenues, as printing excess currency would trigger gold redemption demands. The Bretton Woods system (1944-1971) maintained a modified version where foreign governments could exchange dollars for gold at $35 per ounce.</p>
<p><strong>The Nixon Shock of 1971</strong></p>
<p>On August 15, 1971, President Nixon suspended the dollar's convertibility to gold, ending the last link between major currencies and precious metals. This "temporary" measure became permanent, inaugurating the era of purely fiat currency. The dollar was no longer constrained by physical reserves, enabling unlimited monetary expansion.</p>
<p><strong>Quantifying the Debasement</strong></p>
<p>Since 1971, the dollar has lost approximately 98% of its purchasing power relative to gold. What cost $1 in 1971 costs over $7.50 today. The M2 money supply grew from approximately $600 billion in 1971 to over $20 trillion by 2023—a 30-fold expansion. This monetary inflation systematically transfers wealth from savers to debtors and asset holders.</p>
<p><strong>Key Takeaway</strong></p>
<p>The severing of the dollar from gold in 1971 removed all constraints on monetary expansion, resulting in continuous purchasing power erosion that penalizes savers and distorts economic calculation.</p>`,
      },
      {
        id: "lesson-sm-3",
        courseId: "sound-money",
        title: "The Inflation Hurdle",
        order: 3,
        duration: "15 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the inflation hurdle every investor must overcome, examines how official inflation metrics understate true purchasing power loss, and calculates the minimum return required to preserve wealth.</p>
<p><strong>Understanding the Hurdle</strong></p>
<p>The inflation hurdle represents the minimum investment return required simply to maintain purchasing power—before any real wealth creation occurs. If inflation runs at 7% annually, an investor must earn at least 7% just to break even in real terms. Any return below this threshold represents actual wealth destruction despite nominally positive gains.</p>
<p><strong>Official vs Real Inflation</strong></p>
<p>Consumer Price Index (CPI) calculations have been modified numerous times since 1980, consistently reducing reported inflation. Substitution effects, hedonic adjustments, and geometric weighting all serve to understate price increases. Alternative calculations using consistent 1980s methodology suggest true inflation often runs 5-10 percentage points higher than official figures.</p>
<p><strong>The Savings Penalty</strong></p>
<p>Traditional savings accounts offering 0.5-2% interest rates impose severe real wealth destruction when actual inflation exceeds these returns by wide margins. Over decades, this difference compounds dramatically. $100,000 saved in 1971 would need to be worth approximately $800,000 today to maintain equivalent purchasing power—yet bank savings would yield only a fraction of this amount.</p>
<p><strong>Key Takeaway</strong></p>
<p>The inflation hurdle forces all savers into higher-risk investments just to preserve existing wealth, fundamentally distorting capital allocation and penalizing conservative financial behavior.</p>`,
      },
      {
        id: "lesson-sm-4",
        courseId: "sound-money",
        title: "Kaspa as Digital Sound Money",
        order: 4,
        duration: "15 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains how Kaspa implements sound money principles through cryptographic scarcity, compares its monetary policy to Bitcoin and fiat currencies, and examines why proof-of-work provides superior security guarantees.</p>
<p><strong>Cryptographic Scarcity</strong></p>
<p>Kaspa implements absolute supply scarcity through mathematics rather than political promises. The maximum supply is fixed and verifiable by anyone running a node. No central authority can create additional units, modify emission schedules, or dilute existing holders. This represents a return to gold's scarcity properties with superior portability and divisibility.</p>
<p><strong>Emission Schedule</strong></p>
<p>Kaspa's emission follows a chromatic halving schedule inspired by musical theory, with smooth monthly reductions rather than abrupt halving events. This creates a predictable and steadily declining inflation rate approaching zero, ensuring early participants are not unfairly advantaged by dramatic supply shocks.</p>
<p><strong>Proof-of-Work Integrity</strong></p>
<p>Unlike proof-of-stake systems where wealthy validators can accumulate influence without ongoing cost, Kaspa's proof-of-work requires continuous energy expenditure to participate in consensus. This creates an unforgeable cost basis for security, preventing plutocratic capture and ensuring that network security scales with real-world resource commitment.</p>
<p><strong>Sound Money Properties Satisfied</strong></p>
<p>Kaspa satisfies all sound money requirements: absolute scarcity through fixed supply, extreme durability through distributed redundancy, perfect divisibility to eight decimal places, instant global portability through BlockDAG, and complete fungibility at the protocol level.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa represents sound money for the digital age—combining gold's scarcity with superior transaction properties, secured by proof-of-work rather than trust in institutions.</p>`,
      },

      // Course 3: Self-Custody & Hardware Wallets - 4 lessons
      {
        id: "lesson-sc-1",
        courseId: "self-custody",
        title: "What is Self-Custody?",
        order: 1,
        duration: "12 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines self-custody, explains the critical distinction between custodial and non-custodial solutions, and articulates why key ownership equals asset ownership in cryptocurrency.</p>
<p><strong>The Fundamental Principle</strong></p>
<p>Self-custody means maintaining direct, exclusive control over the cryptographic private keys that authorize spending of your cryptocurrency. The phrase "not your keys, not your coins" encapsulates this principle: whoever controls the private keys controls the assets, regardless of any claimed ownership. When you trust a third party with your keys, you trust them with your funds.</p>
<p><strong>Custodial vs Non-Custodial</strong></p>
<p>Custodial solutions—exchanges, lending platforms, managed wallets—hold private keys on your behalf. You receive an IOU representing your balance, but the platform controls the actual assets. Non-custodial or self-custody solutions place private key responsibility entirely in your hands. You bear full responsibility for security but retain absolute control.</p>
<p><strong>The Exchange Risk</strong></p>
<p>History provides numerous cautionary examples: Mt. Gox lost 850,000 Bitcoin in 2014; FTX collapsed in 2022 with billions in customer funds; countless smaller exchanges have exit-scammed or been hacked. Assets held on exchanges are legally claims against the company, not direct asset ownership. In bankruptcy, customers become unsecured creditors.</p>
<p><strong>Financial Sovereignty</strong></p>
<p>Self-custody represents true financial sovereignty—assets that cannot be frozen, seized, or censored without physical access to your keys. No bank holiday, geopolitical event, or platform policy change can prevent access to self-custodied funds.</p>
<p><strong>Key Takeaway</strong></p>
<p>Self-custody transfers asset ownership from trust-based claims to cryptographic proof, eliminating counterparty risk at the cost of personal security responsibility.</p>`,
      },
      {
        id: "lesson-sc-2",
        courseId: "self-custody",
        title: "Hot Wallets vs Cold Storage",
        order: 2,
        duration: "15 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson distinguishes between hot and cold storage approaches, explains the security tradeoffs of each, and provides guidelines for appropriate allocation between convenience and security.</p>
<p><strong>Hot Wallet Characteristics</strong></p>
<p>Hot wallets maintain private keys on internet-connected devices—mobile phones, desktop computers, or browser extensions. Examples include KasWare, Kaspium, and web wallets. Hot wallets offer maximum convenience for frequent transactions but expose keys to potential online attacks, malware, and device compromise.</p>
<p><strong>Cold Storage Characteristics</strong></p>
<p>Cold storage keeps private keys completely offline—never touching an internet-connected device. Hardware wallets, paper wallets, and air-gapped computers all provide cold storage. Transactions require physical access to the cold device, creating an air gap that prevents remote attacks.</p>
<p><strong>The Security Spectrum</strong></p>
<p>Security exists on a spectrum. Browser extensions face the highest risk from malicious websites and extensions. Mobile wallets benefit from phone security but remain online. Desktop wallets vary based on computer security practices. Hardware wallets isolate keys in tamper-resistant chips. Paper/metal backups provide ultimate offline security but require careful physical protection.</p>
<p><strong>Practical Allocation</strong></p>
<p>Most users should maintain a small hot wallet balance for regular transactions while keeping the majority of holdings in cold storage. A reasonable guideline: keep only what you would comfortably carry in cash on a hot wallet. Hardware wallets provide the best balance of usability and security for most users.</p>
<p><strong>Key Takeaway</strong></p>
<p>Hot wallets trade security for convenience while cold storage trades convenience for security; proper asset protection typically requires both, allocated appropriately to use case.</p>`,
      },
      {
        id: "lesson-sc-3",
        courseId: "self-custody",
        title: "Seed Phrases & Security",
        order: 3,
        duration: "15 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains seed phrases (mnemonic recovery phrases), details proper backup procedures, and warns against common security mistakes that lead to fund loss.</p>
<p><strong>Understanding Seed Phrases</strong></p>
<p>A seed phrase (also called recovery phrase or mnemonic) is a list of 12 or 24 words that mathematically derives all private keys for a wallet. These words, selected from a standardized list of 2048 possibilities, encode a large random number that serves as the master secret. Anyone who knows your seed phrase controls your funds—forever.</p>
<p><strong>Proper Backup Practices</strong></p>
<p>Write your seed phrase on paper or stamp it into metal immediately upon wallet creation. Never store seed phrases digitally—no photos, cloud storage, password managers, or text files. Store backups in multiple secure physical locations: home safe, bank safe deposit box, or trusted family member's secure location. Consider splitting phrases or using multi-signature setups for large holdings.</p>
<p><strong>Common Fatal Mistakes</strong></p>
<p>Several mistakes lead to permanent fund loss. Storing seeds in cloud services enables remote theft. Photographing seeds creates hackable digital copies. Sharing seeds with "support" personnel (a common scam). Single location backup risks fire, flood, or theft. Poor physical security enables observation or theft by visitors.</p>
<p><strong>The Inheritance Challenge</strong></p>
<p>Self-custody creates estate planning complexity. Your heirs need access to seed phrases to recover assets after your death, but providing this access creates lifetime security risks. Solutions include sealed envelopes with attorneys, specialized inheritance services, or trusted family members with partial information.</p>
<p><strong>Key Takeaway</strong></p>
<p>Seed phrases are the ultimate backup—and ultimate vulnerability. Proper offline backup in multiple secure locations protects against both loss and theft.</p>`,
      },
      {
        id: "lesson-sc-4",
        courseId: "self-custody",
        title: "Setting Up Hardware Wallet for Kaspa",
        order: 4,
        duration: "18 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides practical guidance on selecting and configuring hardware wallets for Kaspa, explains the setup process, and covers best practices for ongoing security.</p>
<p><strong>Hardware Wallet Options</strong></p>
<p>Several hardware wallets support Kaspa. Tangem offers a card-format wallet with NFC communication—simple, durable, and portable. Ledger devices (Nano S Plus, Nano X, Flex, Stax) provide traditional hardware wallet security through the Ledger Live application with Kaspa support. Each option trades different convenience and security factors.</p>
<p><strong>Initial Setup Process</strong></p>
<p>Setup follows consistent principles regardless of device. Generate the seed phrase on the hardware device itself—never on a computer. Write down the seed phrase immediately on paper or metal. Verify the seed phrase by confirming words as prompted. Set a strong PIN for device access. Install necessary companion applications (Ledger Live, Tangem app). Complete a small test transaction before transferring significant funds.</p>
<p><strong>Receiving Kaspa</strong></p>
<p>To receive Kaspa, generate a receiving address on the hardware wallet. Verify the address matches on the device screen—never trust computer-displayed addresses alone. Share this address with the sender. After transaction confirmation, verify the balance updated correctly on the device.</p>
<p><strong>Sending Kaspa</strong></p>
<p>Sending requires physical confirmation on the hardware device. Initiate the transaction in the companion application, enter the recipient address and amount, then verify transaction details on the hardware wallet screen. Confirm only if the displayed address and amount match your intent. The device signs the transaction internally without exposing private keys.</p>
<p><strong>Key Takeaway</strong></p>
<p>Hardware wallets provide the optimal balance of security and usability by isolating private keys while enabling convenient transaction signing through physical verification.</p>`,
      },

      {
        id: "lesson-2-1",
        courseId: "dag-terminology",
        title: "Linear Chain Terminology - Traditional Blockchain",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/ztcWf0UT4ysiEhzt0WSE",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the fundamental terminology used in traditional linear blockchain architectures, establishing the baseline vocabulary from which DAG terminology departs.</p>
<p><strong>Linear Chain Structure</strong></p>
<p>Linear chain terminology employs straightforward concepts where blocks form a single sequence. Each block has exactly one parent and potentially one child, creating unambiguous ancestor-descendant relationships. Terms such as "height," "previous block," and "next block" describe this linear progression with mathematical precision.</p>
<p><strong>Conflict Resolution</strong></p>
<p>When conflicts occur in a linear chain (such as two blocks discovered simultaneously), the network must choose one path. Blocks are either "accepted" into the main chain or "orphaned" and discarded. This binary outcome is a defining characteristic of traditional blockchain architectures.</p>
<p><strong>Key Takeaway</strong></p>
<p>Traditional blockchain terminology reflects the fundamental constraint of linear block sequencing, where every block has exactly one predecessor and conflicts result in discarded work.</p>`,
      },
      {
        id: "lesson-2-2",
        courseId: "dag-terminology",
        title: "DAG Terminology",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces DAG (Directed Acyclic Graph) terminology and explains how allowing multiple parents creates new relationship categories not present in linear chains.</p>
<p><strong>DAG Definition</strong></p>
<p>DAG stands for Directed Acyclic Graph. The "directed" component means edges have orientation from source to destination. The "acyclic" component ensures no path through the graph can return to its starting point. This structure enables blocks to reference multiple predecessors while maintaining chronological consistency.</p>
<p><strong>New Relationship Categories</strong></p>
<p>Allowing blocks to have multiple parents creates relationship categories impossible in linear chains. These include past relationships (all reachable ancestors), future relationships (all blocks that reference this one), and anticone relationships (concurrent blocks with no direct path connecting them). These concepts are fundamental to understanding GHOSTDAG consensus.</p>
<p><strong>Key Takeaway</strong></p>
<p>DAG terminology extends beyond linear chain concepts to describe the richer relationship structures that emerge when blocks can have multiple parents.</p>`,
      },
      {
        id: "lesson-2-3",
        courseId: "dag-terminology",
        title: "Past and Future Relationships - DAG",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/oWhSigCmRPShKmCFE1IA",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines the past and future relationships in DAG structures, explaining how these concepts generalize the ancestor-descendant relationships of linear chains.</p>
<p><strong>Past Relationships</strong></p>
<p>The past of a block includes all blocks reachable by following parent links backward from that block. A block is in the past of another if any directed path connects them. In a DAG, a block may have many ancestors through multiple paths, not just the single lineage found in traditional blockchains.</p>
<p><strong>Future Relationships</strong></p>
<p>Future relationships work inversely. If block A is in the past of block B, then B is in the future of A. The future of a block includes all blocks that can reach it by following parent references. This bidirectional definition ensures mathematical consistency in describing block relationships.</p>
<p><strong>Key Takeaway</strong></p>
<p>Past and future relationships in DAGs generalize the simple ancestor-descendant model of chains to accommodate the richer connectivity of multi-parent block structures.</p>`,
      },
      {
        id: "lesson-2-4",
        courseId: "dag-terminology",
        title: "Anticone Relationship - DAG",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/RNhZNbRUmeGmQUUWU9aA",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines the anticone relationship, a concept unique to DAG structures that describes concurrent blocks with no direct ancestry connection.</p>
<p><strong>Anticone Definition</strong></p>
<p>The anticone describes blocks that are neither ancestors nor descendants of each other—they exist concurrently in the DAG. Two blocks are in each other's anticone if neither can reach the other through any directed path. This relationship has no equivalent in linear blockchains, where every pair of blocks has a clear ancestor-descendant relationship.</p>
<p><strong>Security Implications</strong></p>
<p>This relationship is crucial for GHOSTDAG's security parameter K, which limits anticone sizes to maintain consensus safety. As an example, if Block A and Block C are in each other's anticone, Block A is not reachable from Block C and Block C is not reachable from Block A. Large anticone sizes may indicate network partitioning or potential attack scenarios.</p>
<p><strong>Key Takeaway</strong></p>
<p>The anticone relationship captures the essence of concurrency in DAGs, representing blocks created simultaneously by different miners who were unaware of each other's work.</p>`,
      },
      {
        id: "lesson-2-5",
        courseId: "dag-terminology",
        title: "Mergeset and Blue/Red Classification - GHOSTDAG",
        order: 5,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the mergeset concept and GHOSTDAG's blue/red classification system for distinguishing between honest and potentially malicious blocks.</p>
<p><strong>Mergeset Definition</strong></p>
<p>The mergeset refers to the collection of blocks merged when creating a new block. It contains the direct parents of a block but can additionally contain blocks that are not direct parents. When a new block is created, it must process all blocks in its mergeset to maintain consensus consistency.</p>
<p><strong>Blue/Red Classification</strong></p>
<p>GHOSTDAG classifies mergeset blocks as "Blue" (honest) or "Red" (potentially conflicting) based on anticone size constraints. Blue blocks are those whose anticone sizes fall within acceptable parameters, indicating they were created by honest miners under normal network conditions. Red blocks exceed these parameters and may represent attack attempts or abnormal network behavior. This classification determines which blocks contribute to network security through Blue Work accumulation.</p>
<p><strong>Key Takeaway</strong></p>
<p>The mergeset and blue/red classification system enables GHOSTDAG to incorporate parallel blocks while maintaining the ability to identify and marginalize potentially malicious behavior.</p>`,
      },
      {
        id: "lesson-2-6",
        courseId: "dag-terminology",
        title: "K Parameter - GHOSTDAG",
        order: 6,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/6yB2YGeOSPaBOD8zBJLY",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the K parameter, GHOSTDAG's security parameter that controls the threshold between honest concurrent mining and potential attack behavior.</p>
<p><strong>K Parameter Definition</strong></p>
<p>The parameter K controls the maximum allowed anticone size for blue blocks. This parameter is calculated based on network delay, block production rate, and desired security guarantees. The K value represents a tradeoff: higher K allows more parallelism but increases confirmation times, while lower K provides faster confirmations but limits throughput.</p>
<p><strong>K in Practice</strong></p>
<p>When K equals zero, no concurrent blocks are permitted in the blue set—effectively reducing the DAG to a linear chain. When K equals one, each blue block can have one other blue block in its anticone. Kaspa's K value is calibrated to balance throughput with security requirements, enabling the network to process multiple blocks per second while maintaining robust consensus guarantees.</p>
<p><strong>Key Takeaway</strong></p>
<p>The K parameter defines the boundary between acceptable concurrent block creation and potential attack scenarios, serving as GHOSTDAG's primary security tuning mechanism.</p>`,
      },
      {
        id: "lesson-2-7",
        courseId: "dag-terminology",
        title: "Simplified Definitions",
        order: 7,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides a concise reference of all DAG terminology covered in this course, serving as a quick-reference glossary for future study.</p>
<p><strong>Core DAG Relationships</strong></p>
<p>Past relationship encompasses all blocks reachable by following parent links backward from a given block. Future relationship encompasses all blocks that can reach a given block by following parent links forward. Anticone relationship describes blocks that are neither ancestors nor descendants of each other, existing concurrently within the DAG structure.</p>
<p><strong>GHOSTDAG-Specific Terms</strong></p>
<p>The mergeset is GHOSTDAG's collection of blocks merged when creating a new block. Blue/red classification is GHOSTDAG's categorization of blocks as honest (blue) or potentially conflicting (red). The security parameter K represents GHOSTDAG's maximum allowed anticone size for maintaining consensus safety.</p>
<p><strong>Key Takeaway</strong></p>
<p>These definitions form the foundational vocabulary for understanding Kaspa's BlockDAG architecture and GHOSTDAG consensus mechanism.</p>`,
      },
      {
        id: "lesson-2-8",
        courseId: "dag-terminology",
        title: "Bitcoin and Kaspa",
        order: 8,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson compares the terminological frameworks of Bitcoin and Kaspa, highlighting how expanded vocabulary reflects expanded architectural capabilities.</p>
<p><strong>Bitcoin's Terminology</strong></p>
<p>Bitcoin uses simple linear terminology: "previous block," "next block," "chain height," and "longest chain." Relationships are straightforward ancestor-descendant connections. Competing blocks are "orphaned" with no intermediate states—a binary outcome reflecting the chain's linear constraint.</p>
<p><strong>Kaspa's Extended Vocabulary</strong></p>
<p>Kaspa employs additional terminology including DAG past, future, and anticone relationships, GHOSTDAG mergeset concepts, and blue/red classification. This expanded vocabulary enables precise description of concurrent block handling and consistent ordering mechanisms not possible in linear chain architectures.</p>
<p><strong>Key Takeaway</strong></p>
<p>The terminological differences between Bitcoin and Kaspa reflect fundamental architectural distinctions—Kaspa's richer vocabulary enables discussion of concurrent block processing that linear chains cannot support.</p>`,
      },
      {
        id: "lesson-3-1",
        courseId: "dag-and-kaspa",
        title: "What is a Graph?",
        order: 1,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/PU2hcO7mQC6vs49ePymw",
        content: `<p><strong>Learning Objectives</strong></p>
<p>In this lesson, students will examine the fundamental principles of graph theory, identifying the primary components of a graph and distinguishing between different types of connectivity. The objective is to establish a mathematical vocabulary for discussing network structures in the context of distributed ledgers.</p>
<p><strong>Theoretical Foundations of Graph Theory</strong></p>
<p>Graph theory serves as a critical discipline within mathematics and computer science, dedicated to the study of graphs as structures that represent relationships between discrete entities. These structures are fundamentally composed of two elements: vertices, which are also commonly referred to as nodes or points, and edges, which may be identified as arcs, links, or lines. By utilizing these components, researchers can model complex systems and interactions with mathematical precision.</p>
<p><strong>Categorization of Connectivity</strong></p>
<p>Graphs are primarily classified based on the nature of the connections between their vertices. Undirected graphs represent mutual or bidirectional relationships, where the link between two entities does not imply a specific orientation. In contrast, directed graphs utilize edges that possess a definite direction, indicating a unidirectional relationship from one vertex to another. This distinction is a cornerstone of discrete mathematics and is essential for understanding more advanced data structures such as Directed Acyclic Graphs.</p>
<p><strong>Key Takeaway</strong></p>
<p>Graph theory provides the essential structural framework, comprised of vertices and edges, required to model and analyze the relationships within any network system.</p>`,
      },
      {
        id: "lesson-3-2",
        courseId: "dag-and-kaspa",
        title: "What is a Directed Graph?",
        order: 2,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/f0y9pR9RiODss06zaLZ5",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explores the specific properties of directed graphs, or digraphs, focusing on the significance of unidirectional edges. Students will learn to analyze how information or relationships flow through a system where connectivity is orientation-dependent.</p>
<p><strong>Properties of Directed Graphs</strong></p>
<p>A directed graph, formally known as a digraph, is a specialized structure designed to represent relationships where the connections between vertices are constrained by a specific direction. Unlike undirected graphs, where an edge implies a mutual relationship, a digraph ensures that each edge is oriented from a source vertex to a destination vertex. This orientation is critical for modeling processes that follow a chronological or logical sequence.</p>
<p><strong>Structural Components and Unidirectionality</strong></p>
<p>In its most basic form, a directed graph is defined by a set of vertices and a corresponding set of edges, where each edge represents an ordered pair of vertices. This ordering dictates the directionality of the connection, meaning that an edge from vertex X to vertex Y establishes X as the origin and Y as the terminus. While it is possible for a separate edge to exist from Y to X, such a connection would be treated as a distinct and independent entity within the graph's topology.</p>
<p><strong>Key Takeaway</strong></p>
<p>Directed graphs utilize oriented edges to model unidirectional relationships, providing a more granular level of control over how entities in a network interact.</p>`,
      },
      {
        id: "lesson-3-3",
        courseId: "dag-and-kaspa",
        title: "What is a Directed Acyclic Graph (DAG)?",
        order: 3,
        duration: "5 min",
        thumbnail: "https://cdn.buttercms.com/Kfdt2dAyRGKnaH9NRu51",
        content: `<p><strong>Learning Objectives</strong></p>
<p>Students will investigate the unique structural constraints of Directed Acyclic Graphs (DAGs), specifically the prohibition of circular dependencies. The lesson focuses on understanding the acyclic property and the importance of topological ordering in data management.</p>
<p><strong>The Acyclic Property in Directed Graphs</strong></p>
<p>A Directed Acyclic Graph, or DAG, is a specific variant of a directed graph that is characterized by the total absence of cycles. Composed of vertices and oriented edges, the DAG ensures that any path followed along the direction of the edges will never result in a return to a previously visited vertex. This prevention of closed loops is a fundamental requirement for systems that rely on a clear and unambiguous progression of state or time.</p>
<p><strong>Topological Ordering and Sequential Logic</strong></p>
<p>The defining characteristic of a DAG is its ability to support topological ordering. This concept implies that the vertices of the graph can be arranged in a linear sequence such that for every directed edge from vertex X to vertex Y, X appears before Y in the sequence. This ability to maintain a consistent linear respect for directionality without circularity allows DAGs to model complex dependencies without the risk of logical infinite loops.</p>
<p><strong>Key Takeaway</strong></p>
<p>The acyclic nature of a DAG ensures that it is impossible to return to a starting point through its directed edges, providing a reliable foundation for immutable chronological records.</p>`,
      },
      {
        id: "lesson-3-4",
        courseId: "dag-and-kaspa",
        title: "Kaspa's BlockDAG vs Bitcoin's Chain",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>In this lesson, students will contrast the traditional linear blockchain architecture of Bitcoin with the parallel BlockDAG structure of Kaspa. The objective is to evaluate how moving from a single-parent model to a multi-parent model enhances network throughput and efficiency.</p>
<p><strong>Linear Constraints in Traditional Blockchains</strong></p>
<p>The Bitcoin protocol utilizes a conventional blockchain structure, which is characterized by a linear sequence where each block is cryptographically linked to exactly one preceding block. While this ensures a clear and simple chain of events, it introduces a significant structural bottleneck. In scenarios where multiple miners discover valid blocks simultaneously, the network must choose a single path, leading to the rejection of other valid blocks, commonly referred to as orphans. This rejection represents a loss of computational work and a limitation on the network's processing capacity.</p>
<p><strong>The Parallel Innovation of BlockDAGs</strong></p>
<p>Kaspa introduces a fundamental architectural shift by employing a BlockDAG structure. In this model, blocks are permitted to reference multiple parent blocks, effectively treating blocks as vertices and their relationships as oriented edges within a Directed Acyclic Graph. By allowing for parallel block inclusion, Kaspa eliminates the requirement for a single "winner" in each round of consensus. Every valid block, even those produced concurrently, is incorporated into the ledger, which significantly increases transaction throughput without compromising the security or decentralization of the network.</p>
<p><strong>Key Takeaway</strong></p>
<p>The transition from a linear blockchain to a parallel BlockDAG architecture removes artificial bottlenecks by including all valid blocks in the consensus process, enabling unprecedented scalability.</p>`,
      },
      {
        id: "lesson-3-5",
        courseId: "dag-and-kaspa",
        title: "Simplified Definitions Summary",
        order: 5,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This concluding lesson synthesizes the core concepts of graph theory as they apply to the Kaspa network. Students will review formal definitions and understand the holistic integration of vertices, edges, directionality, and acyclicity in BlockDAG architecture.</p>
<p><strong>Synthesis of Graph Theory Components</strong></p>
<p>The fundamental building blocks of Kaspa's architecture are rooted in formal graph theory definitions. A graph is formally defined as a collection of vertices representing discrete objects and edges that define the connections between them. When these edges are assigned a specific orientation, the structure becomes a directed graph, where information flows from a starting vertex to a terminus through a sequence of edges. The integrity of the network is further preserved by the acyclic property, which ensures that no path through the graph can ever loop back to an earlier state, thereby preventing cycles and maintaining a strict chronological order.</p>
<p><strong>Implications for BlockDAG Architecture</strong></p>
<p>For the purposes of understanding the Kaspa protocol, the BlockDAG can be viewed as a sophisticated organizational structure that leverages these mathematical principles to achieve high efficiency. By ensuring that every connection is unidirectional and that the entire system remains acyclic, Kaspa provides a secure and scalable environment for decentralized consensus. This structural approach allows for the simultaneous processing of multiple blocks while guaranteeing that the overall state of the ledger remains consistent and free from the limitations of linear chain-based systems.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa's BlockDAG is a mathematically rigorous structure that combines directed edges and acyclic properties to enable a scalable, secure, and highly efficient distributed ledger.</p>`,
      },
      {
        id: "lesson-4-1",
        courseId: "foundational-concepts",
        title: "DAG - Directed Acyclic Graph Conceptual Overview",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the Directed Acyclic Graph (DAG) as Kaspa's fundamental data structure, explaining its core properties and advantages over linear blockchain architectures.</p>
<p><strong>DAG Core Properties</strong></p>
<p>A Directed Acyclic Graph (DAG) is the fundamental data structure powering Kaspa. Unlike traditional blockchains that form a single linear chain, Kaspa's BlockDAG allows multiple blocks to be created and referenced simultaneously. The structure has three defining properties: directed (edges point in one direction only), acyclic (following edges can never return to the starting point), and graph (a collection of vertices connected by edges).</p>
<p><strong>Architectural Advantages</strong></p>
<p>Traditional blockchains like Bitcoin force miners to compete, with only one winner per round, creating a throughput bottleneck. Kaspa's DAG structure allows all valid blocks to be included, even if created simultaneously. This enables much higher throughput while preserving security properties.</p>
<p><strong>Key Takeaway</strong></p>
<p>The DAG preserves blockchain security properties while removing the artificial single-block-per-round limitation, incorporating all valid blocks into consensus rather than discarding them as orphans.</p>`,
      },
      {
        id: "lesson-4-2",
        courseId: "foundational-concepts",
        title: "DAG Terminology",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines the essential DAG terminology used in Kaspa's consensus system, providing the vocabulary necessary for understanding GHOSTDAG operations.</p>
<p><strong>Core Relationship Terms</strong></p>
<p>Understanding Kaspa requires familiarity with specific DAG terminology. The past of a block includes all blocks reachable by following parent references backwards—these are blocks the current block "knows about." The future of a block includes all blocks that reference it directly or indirectly—blocks created later that knew about this block. The anticone includes all blocks neither in the past nor future—blocks created concurrently where neither knew about the other.</p>
<p><strong>Structural Terms</strong></p>
<p>Tips are blocks with no future blocks yet, representing the "leading edge" of the DAG. Among a block's parents, one is designated as the selected parent, creating the main chain through the DAG. These relationships are crucial because GHOSTDAG uses them to order blocks and determine transaction validity.</p>
<p><strong>Key Takeaway</strong></p>
<p>DAG terminology provides precise descriptions for the multi-dimensional relationships between blocks that GHOSTDAG leverages for consensus.</p>`,
      },
      {
        id: "lesson-4-3",
        courseId: "foundational-concepts",
        title: "GHOSTDAG Overview",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides an overview of GHOSTDAG (Greedy Heaviest Observed SubTree Directed Acyclic Graph), Kaspa's consensus protocol that enables transaction ordering across parallel blocks.</p>
<p><strong>GHOSTDAG Mechanisms</strong></p>
<p>GHOSTDAG provides a method to order all blocks in the DAG, enabling agreement on transaction ordering despite parallel block creation. Block ordering assigns every block a position in a total ordering, even those created in parallel. Blue/red classification distinguishes "blue" blocks (honest, well-connected) from "red" blocks (potentially malicious or poorly connected). The selected parent chain runs through the DAG, connecting selected parents from each block back to genesis. Mergeset processing handles all blocks in a new block's mergeset—blocks not in its selected parent's past.</p>
<p><strong>Security Guarantees</strong></p>
<p>The brilliance of GHOSTDAG is achieving the same security guarantees as Bitcoin's Nakamoto consensus while allowing parallel block creation. This means higher throughput without sacrificing decentralization or security. Source: "PHANTOM and GHOSTDAG: A Scalable Generalization of Nakamoto Consensus" by Sompolinsky, Wyborski, and Zohar (2021).</p>
<p><strong>Key Takeaway</strong></p>
<p>GHOSTDAG enables Kaspa to maintain Nakamoto-equivalent security while processing blocks in parallel, achieving unprecedented throughput.</p>`,
      },
      {
        id: "lesson-4-4",
        courseId: "foundational-concepts",
        title: "K-Cluster - The Security Foundation",
        order: 4,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/LmCePYd7Q8CnHVE2ayVE",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the K-Cluster concept as Kaspa's foundational security parameter, defining the boundary between honest concurrent mining and potential attack behavior.</p>
<p><strong>K Parameter Definition</strong></p>
<p>The K-Cluster concept is foundational to Kaspa's security model, defining the maximum number of blocks that can exist in the anticone of any blue block. K is a security parameter controlling how many parallel blocks are acceptable. If a block has more than K blocks in its anticone, it may be part of an attack or was created under abnormal network conditions.</p>
<p><strong>K-Cluster Violations</strong></p>
<p>When a block has more than K blocks in its anticone relative to another block's blue set, it is classified as "red"—excluded from the main consensus ordering. This is how GHOSTDAG detects and handles potentially malicious behavior. Blocks staying within the K-cluster are considered honest and colored blue.</p>
<p><strong>Tradeoffs</strong></p>
<p>Higher K allows more parallelism (higher throughput) but increases confirmation times. Lower K provides faster confirmations but limits throughput. Kaspa calculates K based on the blocks-per-second (BPS) target to balance these tradeoffs. Source: K-cluster analysis from the PHANTOM paper by Sompolinsky and Zohar (2018).</p>
<p><strong>Key Takeaway</strong></p>
<p>The K parameter defines the security boundary between legitimate concurrent mining and attack scenarios, serving as GHOSTDAG's primary security mechanism.</p>`,
      },
      {
        id: "lesson-4-5",
        courseId: "foundational-concepts",
        title: "BPS Configuration - Blocks Per Second",
        order: 5,
        duration: "7 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains BPS (Blocks Per Second) as Kaspa's key throughput configuration parameter and examines its relationship to other network parameters.</p>
<p><strong>BPS Evolution</strong></p>
<p>BPS (Blocks Per Second) determines Kaspa's throughput target. Kaspa has progressively increased its BPS through network upgrades: originally 1 BPS, upgraded to 10 BPS with the Crescendo hardfork (May 5, 2025), with future hardforks planned for 32 BPS and then 100 BPS.</p>
<p><strong>Derived Parameters</strong></p>
<p>Many other network parameters are mathematically derived from BPS. The K parameter scales with BPS to maintain security. Block time is the inverse of BPS (10 BPS equals 0.1 second block time). Difficulty adjustment window sizing is relative to BPS, and pruning depth is calculated based on BPS and finality requirements.</p>
<p><strong>Implications</strong></p>
<p>Higher BPS means more transactions per second capacity and faster first confirmation times, but also requires faster network propagation. Kaspa's architecture is specifically designed to safely increase BPS while maintaining decentralization. The GHOSTDAG protocol ensures increasing block rate does not compromise security.</p>
<p><strong>Key Takeaway</strong></p>
<p>BPS is the master parameter from which many other network characteristics derive, enabling Kaspa to scale throughput while maintaining security through coordinated parameter adjustments.</p>`,
      },
      {
        id: "lesson-5-1",
        courseId: "core-data-structures",
        title: "UTXO - What is that?",
        order: 1,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>In this lesson, students will analyze the Unspent Transaction Output (UTXO) model as a fundamental state-tracking mechanism in decentralized ledgers. The objective is to understand how UTXOs facilitate parallel validation, privacy, and efficient verification within the Kaspa and Bitcoin protocols, as well as the unique challenges posed by a Directed Acyclic Graph (DAG) structure.</p>
<p><strong>The UTXO Model and State Tracking</strong></p>
<p>The Unspent Transaction Output (UTXO) model represents a core architectural approach to ledger management. Unlike account-based systems that maintain a single balance for each participant, the UTXO model tracks discrete "coins" or outputs. Each transaction consumes existing UTXOs as inputs and generates new UTXOs as outputs. A participant's total balance is effectively the aggregate value of all UTXOs for which they hold the corresponding cryptographic authorization. This methodology ensures that the state of the ledger is defined by the set of all currently unspent outputs rather than a centralized database of account balances.</p>
<p><strong>Advantages of the UTXO Architecture</strong></p>
<p>The UTXO model provides several significant technical advantages. It enables parallel validation, as independent transactions that consume different UTXOs can be processed simultaneously without risk of state collision. Furthermore, the model enhances privacy by discouraging the use of a single, identifiable account history for all transactions. From a verification perspective, nodes can efficiently validate transactions by confirming that the referenced UTXOs exist and have not been previously spent. This structure is also highly compatible with pruning mechanisms, as spent transactions can eventually be removed from the active data set without compromising the integrity of current balances.</p>
<p><strong>UTXO Management in Kaspa's BlockDAG</strong></p>
<p>Implementing the UTXO model within Kaspa's Directed Acyclic Graph (DAG) introduces unique complexities not present in linear blockchains. In a BlockDAG environment, multiple blocks created concurrently in the anticone may attempt to spend the same UTXO. The GHOSTDAG consensus protocol resolves these potential conflicts by establishing a deterministic total ordering of blocks. Only the transaction that appears first within this consensus-derived sequence is permitted to spend the UTXO, while subsequent attempts are invalidated. This ensures ledger consistency across a high-throughput, parallelized network.</p>
<p><strong>Key Takeaway</strong></p>
<p>The UTXO model serves as a robust foundation for parallel transaction processing and efficient state management, requiring sophisticated consensus ordering in a BlockDAG to resolve concurrent spending conflicts.</p>`,
      },
      {
        id: "lesson-5-2",
        courseId: "core-data-structures",
        title: "MuHash - What is that?",
        order: 2,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines MuHash (Multiplicative Hash) as a cryptographic commitment scheme essential for maintaining ledger integrity in a scalable network. Students will learn how MuHash enables incremental updates to the UTXO set, supporting Kaspa's pruning mechanisms and ensuring efficient network synchronization without requiring full historical data.</p>
<p><strong>The Necessity of Incremental Hashing</strong></p>
<p>A primary challenge in decentralized systems is verifying that all nodes maintain an identical set of unspent transaction outputs (UTXOs). Standard hashing algorithms would require a node to rehash the entire set of millions of UTXOs every time a single transaction occurs, which is computationally prohibitive. MuHash addresses this by allowing for incremental updates. Instead of recomputing a hash from scratch, nodes can efficiently adjust the existing hash to reflect the addition or removal of specific outputs.</p>
<p><strong>Mathematical Foundations of MuHash</strong></p>
<p>MuHash operates on the principle of a multiplicative hash. Each UTXO is mapped to a large cryptographic number via a standard hashing function. The MuHash of the entire UTXO set is then calculated as the product of these numbers within a specific modular field. This algebraic property allows for O(1) update times. To add a new UTXO to the set, a node simply multiplies the current MuHash by the new UTXO's hash value. Conversely, to remove a spent UTXO, the node divides the MuHash by that UTXO's hash, typically by multiplying by its modular inverse. This mathematical approach ensures that the resulting hash is independent of the order in which the UTXOs were added.</p>
<p><strong>Functional Implications for Network Integrity</strong></p>
<p>The implementation of MuHash is critical for Kaspa's pruning and synchronization capabilities. It allows pruned nodes—which do not store the full transaction history—to verify that their current UTXO state matches the rest of the network through a single cryptographic commitment. Furthermore, new nodes can sync the UTXO set directly and verify its correctness immediately via the MuHash committed in recent block headers. This ensures that the network remains secure and verifiable even as historical data is discarded to manage storage growth.</p>
<p><strong>Key Takeaway</strong></p>
<p>MuHash provides a mathematically efficient and order-independent commitment scheme that allows the Kaspa network to maintain verifiable ledger state while supporting the aggressive pruning necessary for long-term scalability.</p>`,
      },
      {
        id: "lesson-5-3",
        courseId: "core-data-structures",
        title: "Merkle Root and Accepted Merkle Root",
        order: 3,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>In this lesson, students will explore the application of Merkle Roots as cryptographic commitments that link block bodies to headers. The objective is to differentiate between the standard Merkle Root used for block-level transaction verification and Kaspa’s unique Accepted Merkle Root, which ensures consistent state across the parallel structure of the DAG.</p>
<p><strong>Cryptographic Commitments via Merkle Trees</strong></p>
<p>A Merkle Root is the foundational element of a Merkle Tree, a binary hashing structure where each leaf node represents a transaction hash and each parent node is the hash of its children. The final root hash serves as a compact commitment to the entire set of transactions within a block. This structure enables "Merkle proofs," where the inclusion of a specific transaction can be verified by providing only a logarithmic number of hashes relative to the total transaction count. By including this root in the block header, the protocol ensures that any modification to the transaction data will result in a mismatch, thereby securing the integrity of the block.</p>
<p><strong>The Concept of the Accepted Merkle Root</strong></p>
<p>In the Kaspa protocol, the architectural complexity of the BlockDAG necessitates an additional commitment known as the Accepted Merkle Root. While a standard Merkle Root commits only to the transactions physically contained within a single block, the Accepted Merkle Root commits to the set of all transactions from the block’s mergeset that have been formally accepted by the consensus protocol. This include transactions from parallel blocks that the current block is merging into the ledger. This mechanism ensures that nodes agree not only on which transactions are in a block, but also on which transactions from the surrounding DAG are valid and non-conflicting.</p>
<p><strong>Architectural Necessity of Dual Merkle Roots</strong></p>
<p>The separation of the Hash Merkle Root and the Accepted Merkle Root is vital for the functional operation of a Directed Acyclic Graph. The Hash Merkle Root facilitates the basic verification of block body contents, whereas the Accepted Merkle Root facilitates the management of the UTXO state. This dual-root system allows a block to act as a point of finality for parallel work, effectively weaving multiple streams of transaction data into a single, verifiable state. This ensures that even in a high-throughput environment with parallel block creation, the ledger remains consistent and secure.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa utilizes a dual Merkle Root system to independently verify block-specific transaction data and the cumulative accepted state of the DAG, ensuring both data integrity and ledger consistency.</p>`,
      },
      {
        id: "lesson-5-4",
        courseId: "core-data-structures",
        title: "Parents and Mergeset",
        order: 4,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines the structural relationship between parent references and the mergeset within the Kaspa BlockDAG. Students will analyze how these components enable the GHOSTDAG protocol to process parallel blocks, establish a total ordering, and maintain a consistent view of the network state without the throughput limitations of linear chains.</p>
<p><strong>Structural Hierarchy of Parent References</strong></p>
<p>In Kaspa’s BlockDAG architecture, parent references define the directed edges of the graph. Unlike traditional blockchains, where a block is restricted to a single parent, a Kaspa block can reference multiple parent blocks. Within this set of parents, the GHOSTDAG protocol designates one as the "Selected Parent," which is the tip of the chain with the highest accumulated blue work. The remaining references are termed "Merged Parents." This multi-parent model allows the network to acknowledge and incorporate parallel computational work, eliminating the need to discard concurrent blocks as orphans.</p>
<p><strong>The Mechanics of Mergeset Formulation</strong></p>
<p>The mergeset represents the specific collection of blocks that a new block is responsible for integrating into the consensus ordering. Formally, the mergeset includes all blocks in the anticone of the selected parent that are reachable through the block’s other merged parents. These are essentially blocks that have been created concurrently and have not yet been "seen" or ordered by the selected parent’s lineage. The newly created block performs the critical task of validating the transactions within these mergeset blocks and assigning them a deterministic order within the ledger.</p>
<p><strong>Synergistic Relationship in Consensus</strong></p>
<p>The interplay between parents and the mergeset is the fundamental driver of consensus in the BlockDAG. While parent references define the immediate connectivity of the graph, the mergeset defines the scope of work being incorporated from parallel branches. The block creator must process every block in the mergeset, resolving transaction conflicts and applying the GHOSTDAG coloring algorithm to classify blocks as blue or red. This structured approach ensures that the network can scale to high blocks-per-second rates while maintaining a single, agreed-upon transaction sequence that is resistant to manipulation.</p>
<p><strong>Key Takeaway</strong></p>
<p>The parent-mergeset relationship is the mechanism by which Kaspa weaves parallel blocks into a coherent total ordering, allowing for high-throughput processing while maintaining the security properties of a decentralized ledger.</p>`,
      },
      {
        id: "lesson-6-1",
        courseId: "ghostdag-mechanics",
        title: "K Parameter - The Security Parameter",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/LmCePYd7Q8CnHVE2ayVE",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines the K parameter as GHOSTDAG's cornerstone security mechanism, explaining its mathematical derivation and tradeoffs between throughput and confirmation time.</p>
<p><strong>Mathematical Definition</strong></p>
<p>The K parameter defines the maximum acceptable anticone size for honest blocks. It is calculated based on the blocks per second (BPS) rate, network propagation delay, and desired security level. The formula ensures that honest blocks, even under worst-case network delays, will have anticone sizes within K.</p>
<p><strong>K and BPS Relationship</strong></p>
<p>As BPS increases, K must also increase proportionally. At 1 BPS, K is approximately 18. At 10 BPS, K is approximately 124. At 32 BPS, K is approximately 292. This scaling maintains security guarantees as throughput increases.</p>
<p><strong>Security Implications</strong></p>
<p>Blocks with anticone size exceeding K relative to the blue set are marked red. An attacker would need to create blocks faster than the honest network. The 51% security threshold is preserved, but attacks become more detectable. Higher K allows more parallel blocks but requires more confirmations for transaction finality.</p>
<p><strong>Key Takeaway</strong></p>
<p>K is the mathematical boundary between honest concurrent mining and attack scenarios, scaling with BPS to maintain security across different throughput configurations.</p>`,
      },
      {
        id: "lesson-6-2",
        courseId: "ghostdag-mechanics",
        title: "Parent Selection and Ordering",
        order: 2,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson details the parent selection process as the first step in GHOSTDAG's algorithm, explaining how miners choose and order parent references for new blocks.</p>
<p><strong>Parent Selection Process</strong></p>
<p>When a miner creates a new block, they must select parents from current DAG tips. First, the miner gathers all current tips (blocks with no children yet) as potential parents. Second, the "Selected Parent" is chosen as the tip with highest Blue Work, determining which chain the new block extends. Third, additional merged parents are added to incorporate blocks from other branches, including tips that would otherwise be in the anticone while limiting the number of parents to bound mergeset size.</p>
<p><strong>Parent Ordering</strong></p>
<p>Parents are ordered with the selected parent first, followed by merged parents in a deterministic order. This ordering is crucial for consistent mergeset creation across all nodes, deterministic blue/red classification, and agreement on transaction ordering.</p>
<p><strong>Significance</strong></p>
<p>Parent selection directly affects which blocks get merged into the main chain, the final ordering of transactions, and the efficiency of DAG convergence.</p>
<p><strong>Key Takeaway</strong></p>
<p>Parent selection and ordering is the first critical step in GHOSTDAG, establishing the structural foundation for all subsequent consensus operations.</p>`,
      },
      {
        id: "lesson-6-3",
        courseId: "ghostdag-mechanics",
        title: "Mergeset Creation",
        order: 3,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains mergeset construction as the second step in GHOSTDAG, detailing which blocks are included and how size limits are enforced.</p>
<p><strong>Mergeset Contents</strong></p>
<p>After selecting parents, the block must construct its mergeset—the set of blocks it is responsible for ordering. The mergeset contains all blocks in the anticone of the selected parent that are reachable through any of the block's parents. These are blocks visible to this block but not yet ordered by the main chain.</p>
<p><strong>Construction Algorithm</strong></p>
<p>The algorithm starts with the selected parent's blue set (already ordered), finds all blocks reachable from merged parents, subtracts blocks already in the selected parent's past, and the remainder forms the mergeset.</p>
<p><strong>Size Limits</strong></p>
<p>Kaspa enforces a maximum mergeset size to bound computation per block, limit potential DoS attacks, and ensure consistent processing time. If the natural mergeset would exceed the limit, the block cannot include all desired parents. Blocks in the mergeset are ordered deterministically based on blue/red classification, blue score comparisons, and hash tiebreakers.</p>
<p><strong>Key Takeaway</strong></p>
<p>Mergeset creation determines which parallel blocks a new block will incorporate into consensus, with size limits ensuring bounded processing requirements.</p>`,
      },
      {
        id: "lesson-6-4",
        courseId: "ghostdag-mechanics",
        title: "Blue and Red Classification",
        order: 4,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the coloring algorithm as the third step in GHOSTDAG, distinguishing between honest (blue) and potentially malicious (red) blocks.</p>
<p><strong>Blue Block Characteristics</strong></p>
<p>Blue blocks are considered honest and well-connected. Their anticone size relative to the existing blue set is at most K. They were likely created by miners who saw and referenced the main DAG. Their transactions are prioritized in conflict resolution.</p>
<p><strong>Red Block Characteristics</strong></p>
<p>Red blocks are potentially malicious or created under unusual conditions. Their anticone size relative to the blue set exceeds K. They may have been withheld or created in isolation. Their transactions have lower priority but are not necessarily invalid.</p>
<p><strong>Coloring Algorithm</strong></p>
<p>For each block in the mergeset: count how many existing blue blocks are in its anticone; if the count is at most K, color it blue; if the count exceeds K, color it red; update the blue set and continue.</p>
<p><strong>Significance</strong></p>
<p>Blue blocks accumulate "blue work" for chain selection. Transaction ordering prioritizes blue block transactions. Attackers trying to reorder transactions will produce red blocks. The blue chain represents honest consensus.</p>
<p><strong>Key Takeaway</strong></p>
<p>The coloring algorithm is GHOSTDAG's mechanism for distinguishing honest network participants from potential attackers based on anticone size.</p>`,
      },
      {
        id: "lesson-6-5",
        courseId: "ghostdag-mechanics",
        title: "Blue Work Calculation",
        order: 5,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains Blue Work as the cumulative metric for chain selection in GHOSTDAG, the final step in block processing that determines the canonical chain.</p>
<p><strong>Blue Work Definition</strong></p>
<p>Blue Work is analogous to total chain work in Bitcoin but only counts work from blue blocks. Each blue block contributes its proof-of-work to the chain's blue work. Red blocks do not contribute. The chain with highest blue work is the canonical chain.</p>
<p><strong>Blue Score vs Blue Work</strong></p>
<p>Blue Score is a simple count of blue blocks in a chain. Blue Work is the sum of proof-of-work difficulty from blue blocks. Blue Work is more accurate because it accounts for varying difficulty levels.</p>
<p><strong>Calculation Method</strong></p>
<p>For a block B: if B is blue, BlueWork(B) equals BlueWork(SelectedParent(B)) plus Work(B). If B is red, BlueWork(B) equals BlueWork(SelectedParent(B)) with no additional contribution.</p>
<p><strong>Significance</strong></p>
<p>Blue Work determines selected parent choice (the tip with highest blue work). All nodes agree on the chain with most blue work. Attackers must outpace honest blue work. Fork resolution uses blue work comparison. Source: GHOSTDAG protocol specification by Sompolinsky, Wyborski, and Zohar (2021).</p>
<p><strong>Key Takeaway</strong></p>
<p>Blue Work ensures honestly-created proof-of-work dominates chain selection, providing the mathematical basis for consensus agreement.</p>`,
      },
      {
        id: "lesson-7-1",
        courseId: "consensus-parameters",
        title: "BPS Configuration Details",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines BPS (Blocks Per Second) as the foundational parameter from which many network characteristics derive, explaining its configuration and impact on Kaspa's behavior.</p>
<p><strong>BPS and Network Throughput</strong></p>
<p>BPS directly determines theoretical maximum transactions per second. TPS capacity equals BPS multiplied by transactions per block. Higher BPS means more total transaction capacity but also requires faster network propagation.</p>
<p><strong>Mathematical Relationships</strong></p>
<p>From BPS, Kaspa calculates several derived parameters. Target block time equals 1/BPS seconds. The K parameter is a function of BPS and network delay. DAA window size is proportional to BPS. Pruning depth is a function of BPS and finality requirements.</p>
<p><strong>BPS Selection Criteria</strong></p>
<p>The chosen BPS must balance hardware requirements for nodes, network bandwidth and latency, security margins (K must be large enough), and user experience regarding confirmation times.</p>
<p><strong>Network Upgrades</strong></p>
<p>The Crescendo hardfork (May 5, 2025) upgraded Kaspa from 1 BPS to 10 BPS on mainnet. Future hardforks will increase to 32 BPS, then 100 BPS, with K parameter adjustments to maintain security at each level.</p>
<p><strong>Key Takeaway</strong></p>
<p>BPS is the master configuration parameter that influences nearly every aspect of network behavior, requiring careful balancing across multiple technical and user experience factors.</p>`,
      },
      {
        id: "lesson-7-2",
        courseId: "consensus-parameters",
        title: "Mergeset Size Limit",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/Fcosu9vtTUmuwmts7EWR",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the mergeset size limit as a constraint on block processing, its role in preventing attacks, and its relationship to other consensus parameters.</p>
<p><strong>Purpose of Limits</strong></p>
<p>The mergeset size limit constrains how many blocks can be in a single block's mergeset. Without limits, an attacker could craft blocks referencing thousands of other blocks, causing excessive computation for validation, denial of service on honest nodes, and unpredictable block processing times.</p>
<p><strong>Current Limits</strong></p>
<p>The mergeset size limit is calculated based on the K parameter (security bound), expected network conditions, and computational budget per block. When natural mergeset size exceeds the limit, the block cannot include all desired parents, the miner must choose which branches to merge, and some blocks may take longer to get merged.</p>
<p><strong>Relationship to K</strong></p>
<p>Mergeset limit and K are related but distinct. K bounds anticone size for blue classification while the mergeset limit bounds processing load. Both scale with BPS but for different reasons.</p>
<p><strong>Key Takeaway</strong></p>
<p>The mergeset size limit ensures bounded processing requirements per block, preventing DoS attacks while maintaining predictable network performance.</p>`,
      },
      {
        id: "lesson-7-3",
        courseId: "consensus-parameters",
        title: "Merge Depth Bound",
        order: 3,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the merge depth bound as a mechanism preventing deep reorganizations and establishing transaction finality in the DAG.</p>
<p><strong>Merge Depth Definition</strong></p>
<p>Merge depth measures how "deep" a block is in the DAG. Depth increases as new blocks are added on top. Deep blocks are considered finalized. New blocks cannot reference blocks beyond merge depth.</p>
<p><strong>Security Rationale</strong></p>
<p>Without merge depth bounds, attackers could reference very old blocks, potentially reorganizing long-finalized transactions. Users could never have certainty about finality. The merge depth bound ensures honest blocks always get merged in time, attack attempts create obviously invalid blocks, and finality guarantees are mathematically sound.</p>
<p><strong>Practical Effect</strong></p>
<p>Blocks deeper than merge depth cannot be re-merged. Transactions in deep blocks are final. Attempts to reference deep blocks are rejected. This is a key component of Kaspa's finality mechanism.</p>
<p><strong>Key Takeaway</strong></p>
<p>The merge depth bound provides the foundation for transaction finality by establishing a point beyond which blocks cannot be reorganized.</p>`,
      },
      {
        id: "lesson-7-4",
        courseId: "consensus-parameters",
        title: "Finality Depth",
        order: 4,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson defines finality depth as the point when blocks become irreversible, distinguishing between probabilistic and deterministic finality.</p>
<p><strong>Types of Finality</strong></p>
<p>Kaspa has two types of finality. Probabilistic finality, like Bitcoin, means the probability of reorganization decreases exponentially with depth. Deterministic finality means that at sufficient depth, reorganization is mathematically impossible.</p>
<p><strong>Finality Depth Calculation</strong></p>
<p>The finality depth depends on the K parameter (security margin), merge depth bound (when merging becomes impossible), and network assumptions including delay and honest hash rate. Confirmation depth represents when reasonable confidence is achieved, while finality depth represents when reversal is impossible.</p>
<p><strong>Practical Applications</strong></p>
<p>Exchanges set deposit confirmation requirements based on finality. Smart contracts can rely on finalized state. Users can spend funds after finality without double-spend risk. At Kaspa's high BPS, finality is reached in minutes rather than hours.</p>
<p><strong>Key Takeaway</strong></p>
<p>Finality depth provides mathematical certainty that transactions cannot be reversed, enabling trust in high-value transfers and contract execution.</p>`,
      },
      {
        id: "lesson-7-5",
        courseId: "consensus-parameters",
        title: "DAA Window",
        order: 5,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the DAA (Difficulty Adjustment Algorithm) window as the sliding window of blocks used for difficulty adjustment and its role in maintaining stable block times.</p>
<p><strong>Window Construction</strong></p>
<p>The DAA window consists of a fixed number of recent blocks, measured in DAA score rather than blue score. Window size scales with BPS to maintain consistent real-time duration.</p>
<p><strong>Sliding Window Benefits</strong></p>
<p>A sliding window provides smooth difficulty transitions without sudden jumps, resistance to timestamp manipulation, and quick response to hash rate changes. Larger windows offer more stability with slower response, while smaller windows provide faster response with more volatility. Kaspa balances these for optimal stability while remaining responsive.</p>
<p><strong>Block Contribution</strong></p>
<p>Not all blocks contribute equally to the DAA window. Blue blocks have more weight. Timestamps are validated against the window. DAA score (not blue score) determines window membership. As BPS increases, window size in blocks increases to maintain the same real-time duration.</p>
<p><strong>Key Takeaway</strong></p>
<p>The DAA window enables Kaspa to maintain consistent block times despite hash rate fluctuations through carefully calibrated difficulty adjustments.</p>`,
      },
      {
        id: "lesson-7-6",
        courseId: "consensus-parameters",
        title: "Pruning Depth",
        order: 6,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains pruning depth as the boundary beyond which full block data can be safely deleted, enabling long-term scalability.</p>
<p><strong>What Gets Pruned</strong></p>
<p>Block bodies containing transactions and non-essential header data can be pruned. However, the proof-of-work chain with headers is preserved. Pruning depth must be greater than finality depth (so finalized blocks are pruned), merge depth (so pruned blocks cannot be merged), and any sync requirement windows.</p>
<p><strong>MuHash Verification</strong></p>
<p>Pruned nodes verify their UTXO set using MuHash. They store only the current UTXO set while the MuHash commitment proves correctness. There is no need to replay old transactions for verification.</p>
<p><strong>Node Types</strong></p>
<p>Pruning nodes store only recent blocks plus the UTXO set. Archival nodes store complete history. Both can fully validate new blocks. Pruning nodes are sufficient for most users while maintaining full security guarantees.</p>
<p><strong>Key Takeaway</strong></p>
<p>Pruning depth enables Kaspa to scale indefinitely by allowing nodes to discard old block data while maintaining verifiable ledger state through cryptographic commitments.</p>`,
      },
      {
        id: "lesson-8-1",
        courseId: "block-processing",
        title: "Block Processing Pipeline Overview",
        order: 1,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces Kaspa's four-stage block processing pipeline, explaining how blocks are validated and integrated into the DAG efficiently.</p>
<p><strong>Stage 1: Header Validation</strong></p>
<p>Before downloading the full block, nodes verify proof-of-work meets difficulty, check parent references exist, validate timestamp bounds, and confirm header structure.</p>
<p><strong>Stage 2: Body Validation</strong></p>
<p>After receiving block body, nodes validate all transaction formats, check Merkle root matches transactions, verify signature validity, and confirm no duplicate inputs.</p>
<p><strong>Stage 3: Virtual Chain Update</strong></p>
<p>Integration into DAG state involves constructing the mergeset, classifying blocks as blue or red, processing accepted transactions, updating the UTXO set, and recalculating the virtual block.</p>
<p><strong>Stage 4: Pruning Consideration</strong></p>
<p>To maintain node efficiency, the pipeline checks if old blocks can be pruned, updates MuHash commitments, and removes pruneable data. Each stage can reject invalid blocks early, saving computational resources.</p>
<p><strong>Key Takeaway</strong></p>
<p>The four-stage pipeline ensures efficient block processing by validating early and rejecting invalid blocks before expensive operations are performed.</p>`,
      },
      {
        id: "lesson-8-2",
        courseId: "block-processing",
        title: "Blue Score and Blue Work",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/gYCi4AK2QCG1HRd7UzmB",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson distinguishes between Blue Score and Blue Work as metrics calculated during block processing, explaining when each is used and how they are computed.</p>
<p><strong>Blue Score</strong></p>
<p>Blue Score is the simple count of blue blocks in a chain. It increases by 1 for each blue ancestor, is used for DAA calculations, and is quick to compute.</p>
<p><strong>Blue Work</strong></p>
<p>Blue Work is the cumulative proof-of-work from blue blocks. It accounts for varying difficulty levels, is used for chain selection, and provides a more accurate measure of "weight."</p>
<p><strong>Usage Context</strong></p>
<p>Chain selection uses Blue Work to determine the canonical chain. DAA window construction may use Blue Score for window selection. Either can indicate confirmation depth.</p>
<p><strong>Calculation During Processing</strong></p>
<p>When processing a new block, the algorithm gets the selected parent's blue score and blue work. If this block is blue, both metrics are incremented. If red, the parent's values are inherited unchanged. Both are stored for future blocks to reference.</p>
<p><strong>Key Takeaway</strong></p>
<p>Blue Score and Blue Work serve complementary roles in consensus—Blue Score for counting honest blocks and Blue Work for measuring computational effort.</p>`,
      },
      {
        id: "lesson-9-1",
        courseId: "difficulty-adjustment",
        title: "DAA Window Construction",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>Students will examine the architectural components and functional purpose of the Difficulty Adjustment Algorithm (DAA) window within the Kaspa network. The lesson covers how sliding windows maintain consistent block intervals, the methodology for window construction through parent traversal, and the specific design considerations for high blocks-per-second (BPS) environments.</p>
<p><strong>The Purpose of the Difficulty Adjustment Window</strong></p>
<p>The Difficulty Adjustment Algorithm (DAA) in the Kaspa network utilizes a sliding window of blocks to determine the target difficulty level. This window serves several critical functions in maintaining network stability. Primarily, it provides a comprehensive set of historical block times that allow for accurate averaging, which is essential for stabilizing the issuance rate. Furthermore, the window mechanism offers robust resistance against attempts to manipulate or "game" the algorithm by requiring a significant historical consensus rather than relying on recent outliers. This structure ensures that difficulty transitions remain smooth and predictable across the network.</p>
<p><strong>Methodology for Window Construction</strong></p>
<p>The construction of the DAA window follows a rigorous systematic process. The algorithm initiates the process at the current block and proceeds to traverse backward through the sequence of selected parents. During this traversal, blocks are identified and included based on the predefined window size. A distinguishing feature of Kaspa's implementation is the utilization of the DAA score for window selection rather than relying solely on the blue score. This approach ensures that the calculation accounts for the total work and temporal progress of the network accurately.</p>
<p><strong>Architectural Parameters and Network Optimization</strong></p>
<p>Several key parameters govern the behavior of the DAA window, including the total window size, the sampling interval used to select specific blocks for measurement, and the weight distribution applied to historical data. In Kaspa's high-BPS environment, these parameters are optimized to handle increased transaction throughput. The network employs larger windows to effectively smooth out volatility that might otherwise arise from rapid block production. Additionally, adjustments occur with every new block, providing a highly responsive system that can adapt quickly to fluctuations in total network hash rate.</p>
<p><strong>Key Takeaway</strong></p>
<p>The DAA window is a fundamental mechanism that ensures stable block times and network security by utilizing a statistically significant historical dataset for continuous, high-frequency difficulty adjustments.</p>`,
      },
      {
        id: "lesson-9-2",
        courseId: "difficulty-adjustment",
        title: "DAA Score vs Blue Score",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/qalZKo6tQneM7ap62nFQ",
        content: `<p><strong>Learning Objectives</strong></p>
<p>Students will learn to distinguish between the two primary scoring systems in the Kaspa protocol: the Blue Score and the DAA Score. The lesson explains the unique role of each metric in consensus and difficulty adjustment, the rationale for maintaining separate scoring mechanisms, and the practical security implications of this dual-score architecture.</p>
<p><strong>The Function of the Blue Score</strong></p>
<p>The Blue Score is a fundamental metric in the Kaspa protocol that specifically counts the number of "blue" blocks within a given chain. This metric is designed to intentionally ignore "red" blocks, which are those that do not meet the criteria for the honest, well-connected cluster within the Directed Acyclic Graph (DAG). The primary utility of the Blue Score lies in chain selection and the execution of the GHOSTDAG consensus protocol, as it represents the cumulative count of blocks that contribute to the valid, accepted history of the ledger.</p>
<p><strong>The Role of the DAA Score</strong></p>
<p>In contrast to the Blue Score, the DAA Score is utilized specifically for the Difficulty Adjustment Algorithm. This scoring system may include red blocks in its calculations, as these blocks still represent legitimate computational work and elapsed time on the network. By incorporating a broader set of blocks, the DAA Score provides a more stable and accurate measurement of time passing between blocks. This ensures that the difficulty adjustment mechanism remains precise even during periods of high network congestion or potential reorganizations.</p>
<p><strong>Rationale for Dual Scoring Systems</strong></p>
<p>The necessity for separate scoring systems arises from the divergent requirements of chain selection and difficulty adjustment. Chain selection must prioritize the weighting of honest computational work, a task for which the Blue Score is ideally suited. Conversely, difficulty adjustment requires an accurate temporal measurement of the entire network's activity, which is better reflected by the DAA Score. Maintaining these distinct metrics prevents scenarios where an attacker might attempt to manipulate the network's difficulty by strategically creating red blocks, as the difficulty calculation remains anchored to the broader DAA Score.</p>
<p><strong>Practical Implications and Security</strong></p>
<p>The implementation of these dual scores has significant practical benefits for network security. For instance, a chain experiencing a high volume of red blocks might exhibit a lower Blue Score due to the reduction in honest block count, yet it would maintain a consistent DAA Score. This separation ensures that the network difficulty remains accurate and resistant to manipulation regardless of the specific block classification. Ultimately, this architectural choice protects the network from difficulty-based attacks and ensures consistent performance across various operating conditions.</p>
<p><strong>Key Takeaway</strong></p>
<p>By separating Blue Score for consensus and DAA Score for difficulty adjustment, Kaspa achieves a resilient balance between honoring valid work and maintaining precise temporal consensus.</p>`,
      },
      {
        id: "lesson-10-1",
        courseId: "transaction-processing",
        title: "Transaction Selection",
        order: 1,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/6yB2YGeOSPaBOD8zBJLY",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains transaction selection strategies miners use to choose which transactions to include in blocks, and how Kaspa's high-BPS environment affects this process.</p>
<p><strong>Basic Selection Criteria</strong></p>
<p>The simplest approach prioritizes by fee per byte (transaction size), time in mempool (older transactions receive higher priority), and UTXO age (coin days destroyed).</p>
<p><strong>Kaspa's High-BPS Context</strong></p>
<p>In a high-BPS environment, blocks are small but frequent, the mempool is often empty since transactions get included quickly, and there is less competition for block space than in slower networks.</p>
<p><strong>Selection Strategies</strong></p>
<p>Miners can choose from several strategies: greedy (highest fee first), fair (FIFO with fee minimum), or custom (prioritizing certain transaction types). Unlike congested chains, Kaspa typically has low fees, with fees mattering more during high demand and no "fee auction" during normal operation.</p>
<p><strong>Key Takeaway</strong></p>
<p>Good transaction selection balances miner revenue, user experience, and network health, with Kaspa's high throughput generally eliminating fee competition.</p>`,
      },
      {
        id: "lesson-10-2",
        courseId: "transaction-processing",
        title: "Mass Calculation",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/dBIlYtYTTmuiq41TKiL7",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains mass as Kaspa's measure of transaction resource consumption, covering its calculation, types, and impact on fees and block limits.</p>
<p><strong>Types of Mass</strong></p>
<p>Kaspa calculates three types of mass: compute mass (CPU cost to validate), storage mass (UTXO set growth under KIP-9), and transient mass (temporary resource usage).</p>
<p><strong>Compute Mass</strong></p>
<p>Compute mass is based on the number of inputs requiring signature verification, script complexity, and transaction size.</p>
<p><strong>Storage Mass (KIP-9)</strong></p>
<p>Storage mass addresses UTXO set bloat. Creating UTXOs incurs mass while consuming UTXOs reduces mass, encouraging UTXO consolidation. Block mass limits bound total per-block work, fees are calculated per mass unit, and expensive transactions are prevented from being used in DoS attacks.</p>
<p><strong>User Impact</strong></p>
<p>Transactions with many small UTXOs have higher mass. Consolidating UTXOs reduces future transaction costs.</p>
<p><strong>Key Takeaway</strong></p>
<p>Mass provides a comprehensive measure of transaction cost that accounts for both immediate computation and long-term storage impact on the network.</p>`,
      },
      {
        id: "lesson-10-3",
        courseId: "transaction-processing",
        title: "Coinbase Transactions",
        order: 3,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains coinbase transactions as the special transactions that create new coins as block rewards, covering their structure, reward components, and maturity requirements.</p>
<p><strong>Coinbase Transaction Structure</strong></p>
<p>A coinbase transaction is the first transaction in every block. It has no inputs (creating coins from nothing), outputs go to the miner's address, and it contains the block reward.</p>
<p><strong>Block Reward Components</strong></p>
<p>The coinbase reward includes two components: block subsidy (new coin issuance) and transaction fees (from included transactions). Kaspa uses a unique emission curve with smooth decay (not halving), based on a chromatic scale, providing predictable long-term supply.</p>
<p><strong>Coinbase Maturity</strong></p>
<p>Coinbase outputs cannot be spent immediately. They must wait for a maturity period to prevent spending rewards from orphaned blocks. Maturity is measured in blue score.</p>
<p><strong>DAG Context</strong></p>
<p>Each block in Kaspa's DAG has its own coinbase, but only blue blocks' coinbases are effectively spendable after maturity.</p>
<p><strong>Key Takeaway</strong></p>
<p>Coinbase transactions are the mechanism for new coin issuance, with maturity requirements ensuring miners only receive rewards for blocks that contribute to honest consensus.</p>`,
      },
      {
        id: "lesson-11-1",
        courseId: "pruning-system",
        title: "First Order Pruning",
        order: 1,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains first order pruning as the primary mechanism for removing old block bodies and transactions from storage to manage blockchain data growth.</p>
<p><strong>What Gets Removed</strong></p>
<p>First order pruning removes transaction data (inputs, outputs, signatures), block body content, and script data and proofs.</p>
<p><strong>What is Preserved</strong></p>
<p>Block headers, the proof-of-work chain, the UTXO set (current state), and MuHash commitments are preserved. Blocks are eligible for first-order pruning when they exceed the pruning depth, their anticone is finalized, and all dependent validation is complete.</p>
<p><strong>Node Behavior After Pruning</strong></p>
<p>Pruned nodes can still fully validate new blocks, prove current UTXO state, and participate in consensus. They cannot serve historical transaction data, help new nodes sync from genesis, or provide block explorers with old data.</p>
<p><strong>Key Takeaway</strong></p>
<p>First order pruning enables nodes to maintain full security guarantees while managing storage growth, making the network sustainable for long-term operation.</p>`,
      },
      {
        id: "lesson-11-2",
        courseId: "pruning-system",
        title: "Second Order Pruning",
        order: 2,
        duration: "8 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains second order pruning as the mechanism for removing old headers while preserving proof-of-work through checkpoints.</p>
<p><strong>The Challenge</strong></p>
<p>Even with first-order pruning, headers accumulate. At 10 BPS, approximately 315 million headers accumulate per year. At 100 BPS, approximately 3.15 billion headers per year. Storage becomes significant.</p>
<p><strong>Second Order Pruning Mechanics</strong></p>
<p>Second order pruning removes individual block headers at depth, preserves proof-of-work through checkpoints, and maintains cryptographic continuity. Instead of storing every header, the system creates periodic checkpoints (cryptographic commitments), stores a checkpoint chain linking current state to genesis, and deletes intermediate headers.</p>
<p><strong>Security Preservation</strong></p>
<p>The checkpoint chain preserves total proof-of-work accumulation, chain of trust to genesis, and ability to verify new blocks. Second-order pruning is still being refined but represents Kaspa's path to truly unlimited scaling.</p>
<p><strong>Key Takeaway</strong></p>
<p>Second order pruning enables unlimited network scaling by compressing historical proof-of-work into periodic checkpoints while maintaining cryptographic security.</p>`,
      },
      {
        id: "lesson-11-3",
        courseId: "pruning-system",
        title: "Archival vs Pruning Nodes",
        order: 3,
        duration: "8 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson compares archival and pruning node types, explaining their storage requirements, capabilities, and appropriate use cases.</p>
<p><strong>Pruning Nodes</strong></p>
<p>Pruning nodes are lightweight and sufficient for most uses. They store only recent blocks plus the UTXO set, can fully validate new blocks, have minimal storage requirements, but cannot serve historical data.</p>
<p><strong>Archival Nodes</strong></p>
<p>Archival nodes store complete blockchain history. They keep all blocks since genesis, can serve block explorer queries, help new nodes sync, but have higher storage requirements.</p>
<p><strong>Use Cases</strong></p>
<p>Pruning nodes are appropriate for personal use and light infrastructure. Archival nodes are needed for block explorers, research, data analysis, and helping the network.</p>
<p><strong>Storage Comparison</strong></p>
<p>At 32 BPS, a pruning node requires approximately 10-50 GB while an archival node grows approximately 1 TB per year. Most users should run pruning nodes. The network only needs a modest number of archival nodes for historical data access.</p>
<p><strong>Key Takeaway</strong></p>
<p>Pruning nodes provide full security with minimal resources, making Kaspa accessible to all users while archival nodes serve specialized infrastructure needs.</p>`,
      },
      {
        id: "lesson-12-1",
        courseId: "anticone-finalization",
        title: "Anticone Finalization Depth",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains anticone finalization as the mathematical foundation for safe pruning, defining when a block's anticone becomes permanently fixed.</p>
<p><strong>The Problem</strong></p>
<p>In a DAG, new blocks could theoretically reference any old block, potentially changing its anticone forever. For pruning, we need to know when this can no longer happen.</p>
<p><strong>Finalization Guarantee</strong></p>
<p>A block's anticone is finalized when the block has reached sufficient depth, no new blocks can legally reference blocks that would enter its anticone, and the merge depth bound prevents deep references. The anticone finalization depth is calculated from the K parameter (anticone size bound), merge depth bound, and network delay assumptions.</p>
<p><strong>Implications for Pruning</strong></p>
<p>Once a block's anticone is finalized, its final ordering is permanent, its transactions' status is permanent, all relevant context for validation is known, and it becomes safe to prune. This is the theoretical basis for Kaspa's efficient pruning.</p>
<p><strong>Key Takeaway</strong></p>
<p>Anticone finalization provides the mathematical guarantee that block ordering is permanent, enabling safe pruning without compromising network security.</p>`,
      },
      {
        id: "lesson-12-2",
        courseId: "anticone-finalization",
        title: "Depth Constraints for Pruning Safety",
        order: 2,
        duration: "10 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains how multiple depth constraints work together to guarantee pruning safety through layered protection.</p>
<p><strong>Merge Depth Bound</strong></p>
<p>Merge depth bound prevents referencing blocks too deep in the DAG, ensures finalized transactions stay final, and means blocks beyond this depth cannot be reorganized.</p>
<p><strong>Finality Depth</strong></p>
<p>Finality depth represents the point of no return for blocks where probability of reorganization becomes negligible. It is used for user-facing confirmation requirements.</p>
<p><strong>Pruning Depth</strong></p>
<p>Pruning depth determines when block data can be safely deleted. It must be greater than finality depth and ensures all validation is complete before pruning.</p>
<p><strong>Interaction of Constraints</strong></p>
<p>These constraints form layers of protection. Merge depth provides structural finality (impossible to reference). Finality depth provides probabilistic finality (negligible reorganization chance). Pruning depth enables safe deletion (all checks passed). Each layer provides increasing confidence, culminating in safe data removal.</p>
<p><strong>Key Takeaway</strong></p>
<p>The layered depth constraint system ensures that blocks are provably safe to prune before any data is deleted, maintaining network security throughout the pruning process.</p>`,
      },
      {
        id: "lesson-13-1",
        courseId: "virtual-state",
        title: "Virtual Block Concept",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/bUf1oCzQR1CcRHjHlXRZ",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the virtual block as Kaspa's unique method for representing the current DAG state without requiring a single tip block.</p>
<p><strong>Virtual Block Definition</strong></p>
<p>The virtual block is a conceptual construct. It is not a real block in the DAG but represents the current state of all tips. It has all current tips as parents and contains the merged UTXO state.</p>
<p><strong>Why Virtual?</strong></p>
<p>In a DAG with multiple parallel tips, there is no single "latest" block. Different nodes may see different tips, but they can agree on the "virtual" state. Virtual parents include all current DAG tips. The virtual UTXO set is merged from all tips. Virtual blue score equals the highest blue score plus one. Virtual timestamp is calculated from tips.</p>
<p><strong>Role in Consensus</strong></p>
<p>The virtual block determines current spendable UTXOs, provides the basis for new block creation, and represents "now" in blockchain terms.</p>
<p><strong>Key Takeaway</strong></p>
<p>The virtual block enables Kaspa to represent a consistent "current state" despite having multiple parallel tips, providing a unified view for transaction processing and block creation.</p>`,
      },
      {
        id: "lesson-13-2",
        courseId: "virtual-state",
        title: "Sink Selection",
        order: 2,
        duration: "8 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the sink as the highest block with a valid UTXO state and its role in determining the current virtual state.</p>
<p><strong>Sink Definition</strong></p>
<p>The sink is the block with highest blue work, valid UTXO set (all transactions resolved), and no UTXO conflicts with its past.</p>
<p><strong>Importance of the Sink</strong></p>
<p>Not all tips may have valid UTXO states. Some tips may have conflicting transactions. The sink is the "highest valid" point. Virtual state is built from the sink.</p>
<p><strong>Sink Selection Process</strong></p>
<p>The selection process finds the tip with highest blue work, checks if its UTXO state is valid, walks back until valid if conflicts exist, and designates the valid block as the sink.</p>
<p><strong>Sink vs Tips</strong></p>
<p>Tips are all blocks with no children. The sink is the highest tip with valid UTXO state. The virtual block includes all tips as parents but derives UTXO state from the sink.</p>
<p><strong>Key Takeaway</strong></p>
<p>The sink provides the foundation for consistent state management by identifying the highest point in the DAG with a valid, conflict-free UTXO state.</p>`,
      },
      {
        id: "lesson-14-1",
        courseId: "timestamps-median-time",
        title: "Past Median Time",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces Past Median Time (PMT) as a manipulation-resistant time reference derived from recent ancestor block timestamps.</p>
<p><strong>Why Median Time?</strong></p>
<p>Individual block timestamps can be manipulated. Miners can set any timestamp within bounds. Future timestamps could be used for attacks. A single bad timestamp should not break consensus. Using the median provides resilience against individual misbehavior.</p>
<p><strong>Calculation</strong></p>
<p>Past Median Time is calculated by taking the timestamps of recent selected ancestors, sorting them chronologically, and selecting the median value.</p>
<p><strong>Uses in Kaspa</strong></p>
<p>PMT is used for time-lock validation (when time-locked UTXOs become spendable), difficulty adjustment (as a time reference), and protocol enforcement (various time-based rules). PMT always moves forward (cannot decrease), is resistant to single-miner manipulation, and is slightly behind real time (median of past blocks).</p>
<p><strong>Key Takeaway</strong></p>
<p>PMT ensures time-based consensus rules remain secure even if some miners misbehave, providing a reliable temporal anchor for the network.</p>`,
      },
      {
        id: "lesson-14-2",
        courseId: "timestamps-median-time",
        title: "Timestamp Validation Rules",
        order: 2,
        duration: "8 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains Kaspa's strict timestamp validation rules that prevent manipulation and ensure difficulty adjustment accuracy.</p>
<p><strong>Timestamp Bounds</strong></p>
<p>Block timestamps must be greater than Past Median Time of parents and not too far in the future (bounded by the node's clock). The lower bound (PMT) ensures time moves forward. The upper bound (future limit) prevents timestamp inflation.</p>
<p><strong>Validation Process</strong></p>
<p>When validating a block timestamp, the process calculates PMT from selected ancestors, checks that timestamp exceeds PMT, checks that timestamp is less than current time plus max future allowance, and rejects the block if either check fails.</p>
<p><strong>Impact on DAA</strong></p>
<p>Timestamps directly affect difficulty. They determine block time intervals. Manipulated timestamps could skew difficulty. Bounds prevent extreme manipulation.</p>
<p><strong>DAG Considerations</strong></p>
<p>In Kaspa's DAG, multiple parents have different timestamps, PMT calculation uses the selected parent chain, and parallel blocks may have similar timestamps.</p>
<p><strong>Key Takeaway</strong></p>
<p>Strict timestamp validation ensures consistent timekeeping across the decentralized network, protecting the difficulty adjustment algorithm from manipulation.</p>`,
      },
      {
        id: "lesson-15-1",
        courseId: "finality-security",
        title: "Probabilistic Finality",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines the concept of probabilistic finality within the context of decentralized consensus, exploring how confirmation depth correlates with transaction security and the mathematical guarantees provided by high-throughput networks like Kaspa.</p>
<p><strong>Defining Probabilistic Finality</strong></p>
<p>Probabilistic finality refers to the principle where the likelihood of a transaction being reversed or modified decreases exponentially as it is buried under subsequent blocks. In a proof-of-work system, each new block appended to the ledger increases the total computational effort an attacker would need to exert to reorganize the chain. Consequently, as more blocks are added, the probability of a successful attack diminishes until reversal becomes practically impossible for any entity with finite resources.</p>
<p><strong>Mechanisms of Confirmation Depth</strong></p>
<p>The concept of confirmation depth serves as a critical metric for security. Deeper confirmations represent a greater volume of cumulative work that must be overcome by a malicious actor. This accumulation of work directly translates to a lower probability of reorganization, thereby fostering higher confidence in the finality of a given transaction. While a single confirmation carries some risk of reorganization, the industry standard of six confirmations—popularized by Bitcoin—indicates a very low risk level. When a transaction reaches ten or more confirmations, the risk of reversal becomes mathematically negligible.</p>
<p><strong>Probabilistic Efficiency in Kaspa</strong></p>
<p>Kaspa's high blocks-per-second (BPS) architecture significantly enhances the efficiency of probabilistic finality. Because the network generates blocks at a much higher frequency than traditional blockchains, it achieves a higher number of confirmations per unit of time. This results in faster probabilistic finality, allowing the network to reach the same level of security in a fraction of the time required by slower systems. For instance, at 10 BPS, sixty confirmations can be attained in just six seconds, providing robust probabilistic guarantees that would take much longer to achieve in a sequential chain model.</p>
<p><strong>Key Takeaway</strong></p>
<p>Probabilistic finality provides a quantitative security model where high block rates accelerate the accumulation of confirmation depth, enabling rapid and secure transaction settlement.</p>`,
      },
      {
        id: "lesson-15-2",
        courseId: "finality-security",
        title: "Deterministic Finality",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/3qZId5Y0REyL9SALjRsH",
        content: `<p><strong>Learning Objectives</strong></p>
<p>Students will learn about the mechanisms of deterministic finality in Kaspa, specifically focusing on how protocol-enforced bounds create absolute security guarantees that exceed the probabilistic models found in traditional blockchains.</p>
<p><strong>The Nature of Deterministic Finality</strong></p>
<p>Deterministic finality represents a threshold beyond which transaction reversal is structurally impossible within the protocol's rules. Unlike probabilistic models, which suggest that an attack is merely extremely unlikely, deterministic finality ensures that an attack is impossible according to the consensus logic. This is achieved through the implementation of a merge depth bound, which prevents new blocks from referencing or merging with older sections of the Directed Acyclic Graph (DAG) once they have passed a specific depth. Consequently, any attempt to reorganize the ledger past this point is rejected by the network as invalid.</p>
<p><strong>Operational Mechanisms and Depth Requirements</strong></p>
<p>The merge depth bound creates a state of "hard finality" by establishing strict parameters for block inclusion. Once a block resides beyond the permitted merge depth, it can no longer be integrated into the current consensus state. Achieving this state requires the block to fulfill several criteria, including passing the merge depth bound, completing anticone finalization, and undergoing a full validation process. These protocol-enforced rules ensure that the network maintains a consistent and irreversible history, regardless of the amount of hash power an attacker might possess.</p>
<p><strong>Practical Implications for Security</strong></p>
<p>The distinction between probabilistic and deterministic finality has significant practical consequences for network participants. While probabilistic finality offers high confidence, deterministic finality provides an ultimate security guarantee. For users and institutions, this means that once a transaction has reached the required depth, funds are absolutely safe from reversal. This structural certainty is one of the most robust security features of the Kaspa network, offering a level of finality that is fundamentally different from systems relying solely on the longest-chain rule.</p>
<p><strong>Key Takeaway</strong></p>
<p>Deterministic finality provides an absolute security threshold by using protocol-enforced bounds to make transaction reversal structurally impossible.</p>`,
      },
      {
        id: "lesson-15-3",
        courseId: "finality-security",
        title: "Kaspa's Security Model",
        order: 3,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explores the hybrid security architecture of Kaspa, detailing how it inherits foundational principles from Bitcoin while introducing GHOSTDAG-based enhancements to improve performance and attack resistance.</p>
<p><strong>Foundational Principles and Bitcoin Inheritance</strong></p>
<p>Kaspa's security model is built upon the robust foundations established by the Bitcoin protocol. It utilizes a proof-of-work consensus mechanism and maintains a 51% security threshold, ensuring that the network remains resistant to any entity controlling less than half of the total hash power. Furthermore, Kaspa implements Nakamoto-style probabilistic finality alongside standard cryptographic transaction security, ensuring that the fundamental trust model remains consistent with established blockchain standards while enabling significant performance improvements.</p>
<p><strong>GHOSTDAG and Performance Enhancements</strong></p>
<p>The GHOSTDAG protocol introduces several enhancements that optimize both security and efficiency. By ensuring that all honest work is included in the Directed Acyclic Graph, Kaspa eliminates the waste associated with orphaned blocks in traditional chains. The protocol utilizes a sophisticated blue and red classification system to distinguish between honest and potentially malicious blocks, which facilitates the detection of attacks. Additionally, GHOSTDAG enables efficient parallel processing and provides a deterministic finality layer that reinforces the network's overall stability.</p>
<p><strong>Resistance to Common Attack Vectors</strong></p>
<p>Kaspa exhibits strong resistance to a variety of network attacks. The use of confirmation depth effectively mitigates the risk of double-spend attempts, while the inclusion of all blocks prevents selfish mining strategies. Long-range attacks are thwarted by the merge depth bound, and timestamp manipulation is prevented through the application of Past Median Time (PMT) rules and strict temporal bounds. These security measures are further supported by key parameters such as the K-parameter, which bounds honest anticone size, and finality depth, which guarantees the irreversibility of the ledger.</p>
<p><strong>Trust and Consensus Integrity</strong></p>
<p>The Kaspa trust model is designed to ensure that users can operate with confidence in a decentralized environment. Confirmed transactions are considered final, and the network is inherently censorship-resistant due to its distributed nature. Because no central authority controls the consensus process, the integrity of the ledger is maintained solely through mathematical and algorithmic governance. This combination of factors allows Kaspa to offer enterprise-grade security alongside the performance levels required for modern consumer applications.</p>
<p><strong>Key Takeaway</strong></p>
<p>By synthesizing Bitcoin's proven security principles with GHOSTDAG's innovative structural enhancements, Kaspa achieves a high-performance consensus model that remains resilient against a wide array of adversarial conditions.</p>`,
      },
      {
        id: "lesson-16-1",
        courseId: "network-scaling",
        title: "Bitcoin's Scaling Problem",
        order: 1,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/P31XzHa9RySKXmCLTazx",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains why Bitcoin cannot simply increase its block rate, illuminating the fundamental tradeoffs that Kaspa's GHOSTDAG protocol overcomes.</p>
<p><strong>Bitcoin's Limitation</strong></p>
<p>Bitcoin produces one block every approximately 10 minutes because orphan rate increases with faster blocks, orphans waste miner resources, and security decreases with high orphan rates.</p>
<p><strong>The Orphan Problem</strong></p>
<p>When blocks are created faster than propagation, multiple miners may find valid blocks but only one can extend the chain. Others become orphans (wasted work), and effective hash rate decreases.</p>
<p><strong>Security Implications</strong></p>
<p>High orphan rates mean less work in the main chain, making the network easier to attack due to less cumulative work. Miners with better connectivity gain unfair advantages.</p>
<p><strong>Why Not Just Bigger Blocks?</strong></p>
<p>Larger blocks also cause problems including longer propagation times, higher bandwidth requirements, and centralization pressure (not everyone can run nodes). These tradeoffs force Bitcoin to choose between speed, security, and decentralization.</p>
<p><strong>Key Takeaway</strong></p>
<p>Bitcoin's blockchain trilemma stems from orphan waste in sequential chains, a fundamental limitation that Kaspa's GHOSTDAG architecture solves.</p>`,
      },
      {
        id: "lesson-16-2",
        courseId: "network-scaling",
        title: "How Kaspa Solves Scaling",
        order: 2,
        duration: "10 min",
        thumbnail: "https://cdn.buttercms.com/4tsNNkRsej8ZwaJQDywf",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains how Kaspa's GHOSTDAG architecture enables high throughput without sacrificing security or decentralization.</p>
<p><strong>The Key Insight</strong></p>
<p>Instead of discarding orphans, Kaspa includes all blocks in the DAG, orders them with GHOSTDAG, and ensures all honest work contributes to security. Parallel blocks are all included, all proof-of-work adds to chain security, and mining is efficient regardless of connectivity.</p>
<p><strong>Scaling with BPS</strong></p>
<p>Kaspa can increase blocks per second by adjusting the K parameter proportionally, ensuring the network can propagate blocks in time, and maintaining security guarantees throughout.</p>
<p><strong>Crescendo Hard Fork (May 2025)</strong></p>
<p>Crescendo upgraded Kaspa from 1 BPS to 10 BPS (current mainnet), already 6,000x more frequent than Bitcoin's one block per 10 minutes. Future hardforks are planned for 32 BPS, then 100 BPS, with each upgrade requiring proportional K parameter adjustments.</p>
<p><strong>The Result</strong></p>
<p>The Kaspa network achieves faster confirmations (seconds, not hours), higher transaction capacity, decentralization (low node requirements), and full security (complete PoW contribution).</p>
<p><strong>Key Takeaway</strong></p>
<p>Kaspa proves that the blockchain trilemma can be solved with better architecture, achieving speed, security, and decentralization simultaneously through GHOSTDAG.</p>`,
      },

      // Course 17: K Protocol - 4 lessons
      {
        id: "lesson-17-1",
        courseId: "k-protocol",
        title: "What is K Protocol?",
        order: 1,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>By the end of this lesson, you will understand the fundamental architecture of K Protocol, its role in decentralized social communication, and the technical format used for on-chain messaging.</p>
<div class="video-container" style="margin: 1.5rem 0;"><video controls style="width: 100%; max-width: 640px; border-radius: 8px;" poster="/thumbnails/k_protocol_social.png"><source src="/videos/k-protocol-demo.mp4" type="video/mp4">Your browser does not support the video tag.</video><p style="font-size: 0.875rem; color: #888; margin-top: 0.5rem;">K Protocol Demo: See decentralized social messaging in action</p></div>
<p><strong>Introduction</strong></p>
<p>Traditional social media platforms operate under centralized control, where a single entity manages user accounts, content moderation, and platform access. This architecture creates inherent vulnerabilities: accounts can be suspended without recourse, content can be removed or shadow-banned, and user data remains subject to corporate policies that may change without notice.</p>
<p>K Protocol addresses these limitations by implementing social communication directly on the Kaspa blockchain. Rather than storing messages on corporate servers, K Protocol embeds every post, reply, and interaction into Kaspa transactions, creating a permanent, publicly verifiable record that exists independently of any central authority.</p>
<p><strong>Technical Architecture</strong></p>
<p>K Protocol operates through a standardized message format embedded in transaction payloads. The protocol defines three primary message types: posts (formatted as <code>k:1:post:{content}</code>), replies (formatted as <code>k:1:reply:{parentTxId}:{content}</code>), and votes (formatted as <code>k:1:vote:{targetTxId}</code>). This simple yet extensible structure enables indexers to parse and organize social content from the blockchain.</p>
<p><strong>Kaspa's Architectural Advantages</strong></p>
<p>The BlockDAG architecture makes Kaspa particularly well-suited for social applications. Transaction costs remain minimal (approximately 50,000 posts per KAS), confirmations occur within seconds rather than minutes, and content persists for the lifetime of the network. Most significantly, users maintain complete ownership of their identity and content through their wallet keys.</p>
<p><strong>Key Takeaway</strong></p>
<p>K Protocol transforms the Kaspa blockchain into a censorship-resistant social layer, enabling permanent, verifiable communication without reliance on centralized infrastructure.</p>`,
      },
      {
        id: "lesson-17-2",
        courseId: "k-protocol",
        title: "K Social: The Application Layer",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines the relationship between protocols and applications, explores the K Social platform architecture, and introduces the concept of self-sovereign infrastructure.</p>
<p><strong>Protocols and Applications</strong></p>
<p>Understanding the distinction between protocols and applications is essential for comprehending decentralized systems. K Protocol defines the standard for encoding social messages on Kaspa, while K Social provides the user-facing application that implements this standard. This relationship mirrors that of email: SMTP defines how messages are transmitted, while applications like Gmail provide the interface for sending and receiving them.</p>
<p><strong>K Social Platform Capabilities</strong></p>
<p>K Social implements the full range of K Protocol functionality through a modern web interface. Users can publish microblog posts, engage in threaded conversations through replies, express appreciation through voting mechanisms, and reference other users via their Kaspa addresses. Notably, a user's Kaspa wallet address serves as their identity, eliminating the need for separate account creation.</p>
<p><strong>System Architecture</strong></p>
<p>The K Social ecosystem operates through a three-layer architecture. The Kaspa node layer validates all transactions on mainnet, ensuring cryptographic integrity. The K-Indexer layer continuously scans the blockchain for K Protocol transactions, organizing them into a queryable database. The frontend layer provides the web and mobile interfaces through which users interact with the system.</p>
<p><strong>Self-Sovereign Deployment</strong></p>
<p>For users requiring maximum independence, the entire K Social stack can be self-hosted. The K-Indexer is fully open-source (available at github.com/thesheepcat/K-indexer), enabling anyone to run their own indexing infrastructure. Since all data originates from the public blockchain, self-hosted instances access the same content as the public deployment.</p>
<p><strong>Resources</strong></p>
<p>K Social is accessible at ksocialnetwork.pages.dev, with community support available through Discord (discord.gg/xq7pWqH8bG). The protocol was developed by TheSheepCat and ReLeomerda.</p>`,
      },
      {
        id: "lesson-17-3",
        courseId: "k-protocol",
        title: "Applications and Adoption",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson analyzes the practical implications of decentralized social media, examines use cases that benefit from censorship resistance, and considers the broader ecosystem effects of on-chain communication.</p>
<p><strong>The Case for Decentralization</strong></p>
<p>Centralized social platforms have demonstrated significant limitations that affect users globally. These include unexplained account suspensions, algorithmic content suppression, data monetization through advertising, and retroactive policy changes. K Protocol fundamentally addresses these concerns by anchoring all content to the blockchain, where it becomes permanent and publicly verifiable.</p>
<p><strong>Practical Applications</strong></p>
<p>Several use cases particularly benefit from K Protocol's architecture. Investigative journalists and whistleblowers can publish documentation that cannot be removed through legal pressure or platform compliance. Communities can form around shared interests without risking deplatforming. Content creators maintain direct relationships with their audiences, free from algorithmic intermediation or platform revenue sharing. Activists can coordinate without concern for account termination.</p>
<p><strong>Economic Considerations</strong></p>
<p>K Protocol's transaction costs enable sustainable long-term usage. At current network rates, a single KAS supports approximately 50,000 posts, making a lifetime of daily communication economically trivial. This contrasts sharply with centralized platforms that either charge subscription fees or extract value through advertising and data collection.</p>
<p><strong>Network Effects</strong></p>
<p>Each K Protocol transaction contributes to the broader Kaspa ecosystem. Transaction fees compensate miners who secure the network, message data increases blockchain utility, and real-world usage demonstrates Kaspa's viability as an application platform beyond simple value transfer.</p>
<p><strong>Key Takeaway</strong></p>
<p>Decentralized social communication represents a fundamental shift in how individuals interact online, trading convenience for sovereignty and platform dependency for permanence.</p>`,
      },
      {
        id: "lesson-17-4",
        courseId: "k-protocol",
        title: "K Protocol in Kaspa University",
        order: 4,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson demonstrates K Protocol integration within an educational context, explaining how Kaspa University leverages on-chain messaging for public Q&A functionality.</p>
<p><strong>Integration Overview</strong></p>
<p>Kaspa University implements K Protocol to power its public lesson Q&A system. Rather than storing discussions in a traditional database, all questions and answers are recorded as K Protocol transactions on the Kaspa blockchain. This approach creates a permanent, publicly accessible knowledge base that persists independently of the platform itself.</p>
<p><strong>Technical Implementation</strong></p>
<p>When a student submits a question through the Q&A interface, the platform constructs a K Protocol message containing the lesson context and question content. The student's wallet signs this message, which is then broadcast to the Kaspa network. The message follows the standard format: <code>k:1:post:{lesson context}:{question}</code> for new questions and <code>k:1:reply:{questionTxId}:{answer}</code> for responses.</p>
<p><strong>Benefits of On-Chain Q&A</strong></p>
<p>This architecture provides several pedagogical advantages. All contributions become permanent records that persist indefinitely. Cross-platform discoverability allows other K-indexers to surface Kaspa University discussions within their interfaces. Cryptographic signing ensures clear attribution of authorship. Content moderation occurs transparently, as original messages remain accessible on-chain regardless of frontend display decisions.</p>
<p><strong>Broader Implications</strong></p>
<p>Kaspa University's K Protocol integration serves as a practical demonstration of blockchain utility beyond financial transactions. Each Q&A interaction illustrates how the Kaspa network can support rich application layers while maintaining the core properties of decentralization and permanence.</p>
<p><strong>Practical Exercise</strong></p>
<p>Students are encouraged to post a question in any lesson's Q&A section to experience the K Protocol workflow firsthand and observe their contribution become part of Kaspa's permanent record.</p>`,
      },

      // Course 18: Kasia Protocol - 4 lessons
      {
        id: "lesson-18-1",
        courseId: "kasia-protocol",
        title: "What is Kasia Protocol?",
        order: 1,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the Kasia Protocol, explaining how end-to-end encrypted messaging can be implemented on a public blockchain while maintaining complete privacy.</p>
<p><strong>Introduction</strong></p>
<p>While K Protocol enables public communication on Kaspa, many use cases require private, secure messaging. Kasia Protocol addresses this need by implementing end-to-end encrypted peer-to-peer messaging directly on the Kaspa blockchain. Only the intended sender and recipient can decrypt message contents, despite all data being stored on a public ledger.</p>
<p><strong>Cryptographic Foundation</strong></p>
<p>Kasia employs a multi-phase encryption process. First, a handshake phase establishes a secure channel through encrypted key exchange. The recipient accepts the handshake, and both parties derive a shared secret. All subsequent messages are encrypted using this shared key before being embedded in Kaspa transactions. The encrypted payloads are stored on-chain, visible to all but readable only by the conversation participants.</p>
<p><strong>Protocol Specification</strong></p>
<p>Kasia defines two primary message types: handshake messages (formatted as <code>ciph_msg:1:handshake:{encrypted key data}</code>) for initiating secure channels, and communication messages (formatted as <code>ciph_msg:1:comm:{encrypted content}</code>) for actual message exchange.</p>
<p><strong>Architectural Advantages</strong></p>
<p>Building on Kaspa provides several benefits for encrypted messaging. Confirmations occur within seconds, enabling near-real-time communication. Transaction costs remain minimal, supporting approximately 500,000 messages per 10 KAS. The decentralized architecture eliminates single points of failure or compromise. Message history becomes immutable once recorded, preventing retroactive alteration.</p>
<p><strong>Development</strong></p>
<p>Kasia Protocol was developed by auzghosty and the K-Kluster team as a fully open-source project.</p>`,
      },
      {
        id: "lesson-18-2",
        courseId: "kasia-protocol",
        title: "Platform Features and Capabilities",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explores the full feature set of the Kasia platform, including integrated payments, identity systems, and self-hosting capabilities.</p>
<p><strong>Comprehensive Communication Platform</strong></p>
<p>Kasia extends beyond basic encrypted messaging to provide a complete communication infrastructure. The platform combines end-to-end encryption with native cryptocurrency payments, identity resolution, and cross-device accessibility.</p>
<p><strong>Core Capabilities</strong></p>
<p>The encryption system ensures that only conversation participants can decrypt messages. In-chat payment functionality enables users to send KAS directly within conversations, streamlining transactions that arise from discussions. Kaspa Name Service (KNS) integration allows users to reference contacts using human-readable .kas names rather than full wallet addresses. Cross-device synchronization through optional indexers enables message access from any device. Progressive Web App (PWA) support provides native-like installation on mobile and desktop platforms.</p>
<p><strong>Privacy Architecture</strong></p>
<p>Kasia implements privacy at its foundation. No identity verification is required to participate. Users need not provide phone numbers, email addresses, or any personal information. No central server stores encryption keys. The user's private key serves as their complete identity within the system.</p>
<p><strong>Self-Sovereign Infrastructure</strong></p>
<p>For users requiring maximum control, Kasia supports self-hosted indexer deployment. The indexer architecture handles over 3,000 transactions per second with minimal hardware requirements, enabling complete data sovereignty.</p>
<p><strong>Resources</strong></p>
<p>Kasia is accessible through the web interface at kasia.fyi and through Android applications on the Google Play Store. The complete source code is available at github.com/K-Kluster/Kasia, with community support through Discord at discord.gg/vuKyjtRGKB.</p>`,
      },
      {
        id: "lesson-18-3",
        courseId: "kasia-protocol",
        title: "Applications and Comparative Analysis",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines practical applications of encrypted blockchain messaging and compares Kasia's architecture to traditional encrypted messaging platforms.</p>
<p><strong>Limitations of Centralized Encryption</strong></p>
<p>Traditional encrypted messaging applications such as Signal and WhatsApp rely on centralized server infrastructure. While they provide strong encryption, this architecture introduces vulnerabilities: servers can be pressured by governmental authorities, services can be discontinued or blocked, and privacy policies can change unilaterally. Kasia's decentralized architecture eliminates these single points of failure.</p>
<p><strong>Practical Applications</strong></p>
<p>Several use cases particularly benefit from Kasia's architecture. Business communications gain both encryption and integrated payment capability for client interactions. Over-the-counter trading benefits from combined negotiation and settlement in a single encrypted channel. Support services can provide private assistance without centralizing sensitive user data. Individual users gain communication privacy independent of corporate surveillance infrastructure. Escrow and intermediary services can manage both communication and fund transfer in unified workflows.</p>
<p><strong>Integrated Payment Workflows</strong></p>
<p>The combination of encrypted messaging and native payments enables streamlined transaction workflows. Consider a freelance engagement: parties can discuss project scope, negotiate terms, execute payment, and confirm receipt—all within a single encrypted conversation thread. This integration eliminates application switching and keeps all transaction context in one secure location.</p>
<p><strong>Comparative Analysis</strong></p>
<p>Signal provides robust encryption but operates through centralized servers without payment functionality. Telegram does not enable end-to-end encryption by default and maintains centralized infrastructure. Kasia uniquely combines end-to-end encryption, decentralized architecture, native KAS payments, and on-chain message storage.</p>
<p><strong>Key Takeaway</strong></p>
<p>Kasia represents a new category of communication infrastructure that unifies private messaging with cryptocurrency payments on decentralized infrastructure.</p>`,
      },
      {
        id: "lesson-18-4",
        courseId: "kasia-protocol",
        title: "Kasia in Kaspa University",
        order: 4,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson demonstrates Kasia Protocol integration within Kaspa University, explaining how encrypted messaging enhances the educational experience while maintaining student privacy.</p>
<p><strong>Integration Overview</strong></p>
<p>Kaspa University incorporates Kasia Protocol to provide private, encrypted communication channels. This integration serves as both a practical feature and a demonstration of real-world blockchain messaging capabilities.</p>
<p><strong>Platform Use Cases</strong></p>
<p>The integration supports three primary communication scenarios. Administrative support enables students to contact platform administrators privately for assistance. Instructor communication allows students to reach course creators with questions or feedback. Peer collaboration facilitates encrypted communication between students for study groups or discussion.</p>
<p><strong>User Workflow</strong></p>
<p>To initiate a conversation, students navigate to the Messages section of their dashboard and specify a recipient by wallet address or .kas name. The platform initiates a Kasia handshake on behalf of the student's wallet. Once the recipient accepts the handshake, encrypted messaging becomes available. All message content is stored on the Kaspa blockchain in encrypted form.</p>
<p><strong>Conversation States</strong></p>
<p>Conversations progress through defined states. A pending status indicates that a handshake has been sent but not yet accepted. An active status indicates successful handshake completion and enabled messaging. The platform polls in the background to detect handshake acceptance.</p>
<p><strong>Privacy Architecture</strong></p>
<p>Kaspa University cannot access the content of private messages. All communication is encrypted end-to-end using cryptographic keys derived from user wallets. Only the recipient's private key can decrypt received messages.</p>
<p><strong>Broader Significance</strong></p>
<p>This integration demonstrates that educational platforms need not compromise user privacy for functionality. Student communications, support requests, and peer interactions remain protected by cryptography throughout their educational journey.</p>`,
      },

      // Course 19: KU Protocol - 3 lessons
      {
        id: "lesson-19-1",
        courseId: "ku-protocol",
        title: "What is KU Protocol?",
        order: 1,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the KU Protocol specification, explaining how educational achievements are recorded on the Kaspa blockchain and the advantages of blockchain-based credentials.</p>
<p><strong>The Challenge of Traditional Credentials</strong></p>
<p>Traditional educational credentials face significant limitations. Institutional databases can suffer data loss. Paper and digital certificates can be forged. Verification requires contacting issuing institutions, which may be slow, costly, or impossible if the institution no longer exists.</p>
<p><strong>KU Protocol Overview</strong></p>
<p>KU Protocol establishes a standard for recording educational achievement proofs on the Kaspa blockchain. When a student passes a quiz, the system generates a cryptographic proof that is permanently recorded on-chain. This proof can be independently verified by anyone without requiring cooperation from the issuing platform.</p>
<p><strong>Protocol Specification</strong></p>
<p>Each achievement record follows a standardized format: <code>ku:1:quiz:{wallet}:{courseId}:{lessonId}:{score}:{maxScore}:{timestamp}:{contentHash}</code>. This structure encodes the student's wallet address (serving as identity), the specific course and lesson completed, the score achieved relative to the maximum possible, the timestamp of completion, and a content hash that cryptographically binds the record to the specific answers submitted.</p>
<p><strong>Properties of Blockchain Credentials</strong></p>
<p>On-chain credentials possess several valuable properties. Permanence ensures records persist for the lifetime of the Kaspa network. Public verifiability allows anyone to confirm achievements without institutional intermediation. Immutability prevents retroactive alteration or forgery. Self-sovereignty places credential ownership with the student rather than the issuing institution.</p>
<p><strong>Future Implications</strong></p>
<p>While developed for Kaspa University, KU Protocol establishes a model that could be adopted by other educational platforms on Kaspa, potentially creating a unified, verifiable credential ecosystem.</p>`,
      },
      {
        id: "lesson-19-2",
        courseId: "ku-protocol",
        title: "Technical Implementation",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson details the technical workflow for recording achievements on-chain, distinguishes between protocol-level and platform-level features, and explains the verification process.</p>
<p><strong>Achievement Recording Workflow</strong></p>
<p>The process of recording an achievement involves several coordinated steps. First, the student submits quiz answers through the platform interface. The server validates responses and calculates the resulting score. A deterministic achievement payload is generated containing all relevant completion data. The student's wallet signs this payload, cryptographically proving ownership. Finally, the signed proof is broadcast to the Kaspa network, and upon confirmation, KAS rewards are distributed to the student's wallet.</p>
<p><strong>Platform Security Measures</strong></p>
<p>Kaspa University implements additional security measures at the platform level to ensure credential integrity. These include minimum completion time requirements to prevent automated completion, quiz attempt limits, wallet trust scoring based on behavioral analysis, IP session binding to prevent session hijacking, and concurrent submission locking to prevent race condition exploits. It is important to note that these are platform-level protections implemented by Kaspa University, not part of the KU Protocol specification itself.</p>
<p><strong>Content Hash Function</strong></p>
<p>Each achievement record includes a content hash serving multiple purposes. The hash cryptographically binds the record to the specific answers submitted, enabling verification that the recorded score was calculated correctly. This creates a unique fingerprint for each quiz attempt, preventing duplicate submissions while maintaining answer privacy.</p>
<p><strong>Verification Process</strong></p>
<p>Third parties can independently verify achievements through a straightforward process: locate the KU Protocol transaction on the blockchain, parse the payload to extract achievement data, and confirm that the wallet address, course identifier, lesson identifier, and score match any claimed credentials.</p>`,
      },
      {
        id: "lesson-19-3",
        courseId: "ku-protocol",
        title: "Practical Applications",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explores the practical applications of on-chain credentials within Kaspa University and examines future possibilities for blockchain-verified education.</p>
<p><strong>On-Chain Data Architecture</strong></p>
<p>As students progress through Kaspa University, KU Protocol creates permanent records of their quiz completions. It is important to understand what is recorded on-chain: individual quiz completion proofs only. Aggregate calculations such as course completions, total rewards earned, and diploma progress are computed by Kaspa University from these on-chain quiz records—the protocol itself stores only atomic quiz proofs.</p>
<p><strong>Learn-to-Earn Integration</strong></p>
<p>KU Protocol powers Kaspa University's Learn-to-Earn model. Upon completing a course (defined as passing all lesson quizzes), students earn 0.1 KAS as a reward. These rewards accumulate and can be claimed from the Rewards page. When claimed, the tokens are sent directly to the student's connected wallet as genuine blockchain tokens—fully owned and spendable by the student.</p>
<p><strong>Blockchain-Verified Credentials</strong></p>
<p>On-chain achievement records function as a blockchain-verified credential portfolio. Potential employers or collaborators can verify Kaspa expertise by examining a student's KU Protocol transaction history. This verification requires no cooperation from Kaspa University—all data is publicly accessible on the blockchain. Credentials remain associated with the student's wallet address permanently.</p>
<p><strong>Emerging Use Cases</strong></p>
<p>On-chain credentials enable several forward-looking applications: job boards that filter candidates by verified blockchain achievements, DAOs that require specific educational credentials for membership, cross-platform credential recognition among Kaspa ecosystem projects, and skill-based access control systems using on-chain proofs as authorization tokens.</p>
<p><strong>Key Takeaway</strong></p>
<p>Each completed course contributes to a permanent, verifiable credential record that accompanies the student's wallet throughout the Kaspa ecosystem and beyond.</p>`,
      },

      // Course 20: KRC-721 NFT Standard - 4 lessons
      {
        id: "lesson-20-1",
        courseId: "krc721-nft-standard",
        title: "Understanding NFTs on Kaspa",
        order: 1,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson introduces the concept of non-fungible tokens, explains the KRC-721 standard's role in the Kaspa ecosystem, and surveys common NFT applications.</p>
<p><strong>Non-Fungible Token Fundamentals</strong></p>
<p>Non-Fungible Tokens (NFTs) represent unique digital assets on a blockchain. Unlike fungible tokens such as KAS, where each unit is interchangeable with any other, each NFT possesses distinct properties and cannot be substituted. This distinction mirrors the difference between a specific artwork and a unit of currency.</p>
<p><strong>The KRC-721 Standard</strong></p>
<p>KRC-721 establishes Kaspa's standard for creating and managing non-fungible tokens using an inscription-based model similar to Bitcoin Ordinals. Unlike Ethereum's ERC-721 which relies on smart contracts, KRC-721 embeds NFT data directly into transaction payloads on the Kaspa blockchain. This inscription approach stores all token information on-chain permanently—no external storage or contract state is required for core ownership records.</p>
<p><strong>Inscription Architecture</strong></p>
<p>The inscription model works through a commit-reveal process. During the commit phase, a user creates a transaction containing a hidden commitment to their intended action. After confirmation, the reveal transaction exposes the actual NFT operation (deploy, mint, or transfer) encoded in the transaction data. This two-phase approach prevents front-running attacks and ensures fair access to limited collections. The Kasplex indexer continuously scans blocks for these inscription patterns, building a queryable database of collections, tokens, and ownership records.</p>
<p><strong>Technical Capabilities</strong></p>
<p>KRC-721 provides several key features. Each token maintains a distinct identifier and property set. Ownership records are stored directly on the Kaspa blockchain. Associated metadata and images utilize the InterPlanetary File System (IPFS) for decentralized storage. The standard supports royalty mechanisms enabling creators to receive compensation from secondary market sales. A commit-reveal minting process prevents front-running attacks during token creation.</p>
<p><strong>Application Domains</strong></p>
<p>NFTs serve diverse purposes across the digital economy. Digital art collections enable provable ownership of creative works. Credential systems issue verifiable certificates, diplomas, and achievement badges. Gaming platforms use NFTs for in-game items, characters, and cosmetics. Membership programs distribute access passes and club affiliations. Tokenization projects represent real-world assets such as property deeds or event tickets.</p>
<p><strong>Kaspa's NFT Advantages</strong></p>
<p>Kaspa's architecture provides meaningful benefits for NFT applications: minting completes in seconds rather than minutes, transaction costs remain predictable and reasonable, proof-of-work consensus ensures genuine decentralization, and a growing ecosystem of marketplaces and wallets supports the standard.</p>`,
      },
      {
        id: "lesson-20-2",
        courseId: "krc721-nft-standard",
        title: "Technical Architecture",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines the technical implementation of KRC-721, including the commit-reveal mechanism, collection deployment parameters, cost structures, and indexing infrastructure.</p>
<p><strong>Commit-Reveal Minting</strong></p>
<p>KRC-721 employs a two-phase minting process designed to prevent manipulation. During the commit phase, a user creates a hidden commitment transaction that does not reveal their minting intention. After at least one block confirmation, the reveal phase exposes the mint request. This separation prevents observers from front-running mint transactions, ensuring fair access to limited collections.</p>
<p><strong>Collection Deployment</strong></p>
<p>Creating an NFT collection requires specifying several parameters. The ticker serves as a unique collection identifier (such as KUDIPLOMA). Maximum supply defines the total number of tokens that can exist in the collection. Metadata includes the collection name, description, and cover image stored on IPFS. Royalty settings determine optional creator fees on secondary sales. Premint functionality allows reserving tokens for the deployer.</p>
<p><strong>Economic Model</strong></p>
<p>The cost structure involves several components. Collection deployment requires a 1,000 KAS payment that is permanently burned. Pre-minting reserved tokens incurs an additional cost per token. Public minting involves network fees plus any configured royalty payments.</p>
<p><strong>Metadata Specification</strong></p>
<p>Each NFT's metadata follows a defined structure. Required fields include the display name, a description explaining what the token represents, and an image URI using the IPFS protocol scheme. Optional attributes can specify traits and properties for collection filtering and rarity calculation.</p>
<p><strong>Indexer Infrastructure</strong></p>
<p>The Kasplex indexer continuously scans blocks for KRC-721 transactions, building a queryable database of collection deployments, token mints, transfers, and ownership records. This infrastructure enables wallets and marketplaces to display NFT portfolios and facilitate trading.</p>`,
      },
      {
        id: "lesson-20-3",
        courseId: "krc721-nft-standard",
        title: "Ecosystem and Infrastructure",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson surveys the KRC-721 ecosystem, including marketplaces, wallet support, developer resources, and storage infrastructure.</p>
<p><strong>Trading Platforms</strong></p>
<p>Several marketplaces facilitate KRC-721 trading. The Kaspa.com NFT Marketplace provides an official trading platform for the ecosystem. KaspaBOX (kaspabox.fyi) offers high-performance KRC-721 trading capabilities. KSPR Bot provides a Telegram-based interface for users who prefer conversational trading.</p>
<p><strong>Wallet Integration</strong></p>
<p>Major Kaspa wallets support KRC-721 functionality. KasWare, a popular Kaspa wallet, includes NFT viewing capabilities for portfolio management. Additional wallets in the ecosystem continue to add KRC-721 support as the standard matures.</p>
<p><strong>Developer Resources</strong></p>
<p>Several resources support KRC-721 development. Technical documentation is available at testnet-10.krc721.stream/docs. The Kasplex Protocol FAQ at kaspa.org/kasplex-faq provides context on the broader token infrastructure. Sample application code demonstrating KRC-721 integration is available at github.com/coinchimp/kaspa-krc721-apps.</p>
<p><strong>Decentralized Storage</strong></p>
<p>NFT images and metadata utilize the InterPlanetary File System (IPFS) for persistent, decentralized storage. This architecture eliminates single points of failure that could result in lost media. Content addressing means each file's URI derives from its cryptographic hash, ensuring data integrity. Pinning services such as Pinata and Filebase provide reliable hosting for IPFS content.</p>
<p><strong>Development Best Practices</strong></p>
<p>Successful KRC-721 deployment follows several guidelines: conduct all testing on testnet before mainnet deployment, upload images to IPFS and confirm accessibility before collection deployment, adhere to the standard metadata structure for compatibility with indexers and marketplaces, and verify successful deployment through the indexer before announcing or selling tokens.</p>`,
      },
      {
        id: "lesson-20-4",
        courseId: "krc721-nft-standard",
        title: "KRC-721 in Kaspa University",
        order: 4,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains how Kaspa University implements KRC-721 for its diploma NFT system, demonstrating real-world application of the standard in an educational context.</p>
<p><strong>The KUDIPLOMA Collection</strong></p>
<p>Kaspa University leverages KRC-721 to issue diploma NFTs to graduates who complete the full curriculum. The KUDIPLOMA collection represents a tangible, on-chain credential that validates comprehensive Kaspa expertise.</p>
<p><strong>Collection Specifications</strong></p>
<p>The diploma collection operates with the following parameters: the ticker KUDIPLOMA serves as the unique collection identifier, maximum supply is set at 10,000 diplomas, eligibility requires completion of all courses in the curriculum, and minting is user-initiated through wallet signature.</p>
<p><strong>Whitelist-Based Access Control</strong></p>
<p>The collection implements a creative use of KRC-721's royalty mechanism to control access. Non-whitelisted addresses face a 20,000 KAS deterrent fee plus 10 KAS PoW fee (~20,010 KAS total), while graduates who have completed all courses are automatically whitelisted and pay only 10 KAS discount fee plus 10 KAS PoW fee (~20 KAS total). This economic design ensures that only verified graduates can practically obtain diplomas.</p>
<p><strong>Minting Process</strong></p>
<p>The diploma minting workflow proceeds through defined stages. First, the student completes all courses in the curriculum, establishing eligibility. Upon navigating to the Diploma page, the platform automatically whitelists the student's wallet address. The student then signs the mint transaction with their wallet, and the diploma NFT is created and assigned to their address.</p>
<p><strong>Credential Significance</strong></p>
<p>A KUDIPLOMA NFT serves as verifiable proof of several accomplishments: completion of comprehensive Kaspa education, demonstrated understanding of protocols, consensus mechanisms, and ecosystem tools, practical engagement with blockchain technology, and a permanent, on-chain credential tied to the graduate's wallet address.</p>
<p><strong>Key Takeaway</strong></p>
<p>The diploma represents more than a traditional certificate—it provides cryptographically verifiable proof of expertise permanently stored on the Kaspa blockchain.</p>`,
      },

      // Course 21: L2 on Kaspa - 5 lessons
      {
        id: "lesson-21-1",
        courseId: "l2-on-kaspa",
        title: "Layer 2 Architecture on Kaspa",
        order: 1,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the distinction between Layer 1 and Layer 2 systems, articulates the rationale for building Layer 2 solutions on Kaspa, and introduces the major L2 projects in the ecosystem.</p>
<p><strong>Kaspa's Evolution</strong></p>
<p>Kaspa emerged as the fastest proof-of-work blockchain optimized for value transfer. As the ecosystem matured, demand grew for expanded capabilities including smart contracts, decentralized finance, NFT infrastructure, and gaming platforms. Layer 2 solutions address these requirements while preserving Kaspa's core strengths.</p>
<p><strong>Architectural Layers Defined</strong></p>
<p>Layer 1 refers to the Kaspa blockchain itself—the BlockDAG structure, GHOSTDAG consensus protocol, and proof-of-work security model. Layer 2 solutions are systems built atop this foundation that inherit its security properties while adding new capabilities. The relationship parallels that of a building's foundation (L1) to the structures erected upon it (L2).</p>
<p><strong>Design Philosophy</strong></p>
<p>Kaspa's architecture prioritizes specific properties at the base layer: simplicity maintains security and auditability, performance optimizations preserve rapid confirmation times, and minimal node requirements support decentralization. Rather than expanding L1 scope to include smart contracts directly, Layer 2 solutions add computational complexity without compromising these foundational properties.</p>
<p><strong>Current L2 Ecosystem</strong></p>
<p>Two major Layer 2 solutions are developing on Kaspa. Kasplex implements a zkEVM rollup enabling EVM-compatible smart contract deployment. Igra Labs builds a ZK-rollup optimized for gaming applications with planned multi-VM support. Both projects utilize Kaspa as a decentralized sequencer and data availability layer.</p>
<p><strong>Enabled Applications</strong></p>
<p>Layer 2 infrastructure unlocks numerous application categories: decentralized exchanges, lending protocols, and yield optimization (DeFi); real-time blockchain-integrated gaming; sophisticated NFT marketplaces with complex trading logic; decentralized autonomous organizations; and migration of existing Ethereum applications to the Kaspa ecosystem.</p>`,
      },
      {
        id: "lesson-21-2",
        courseId: "l2-on-kaspa",
        title: "Kasplex: zkEVM Implementation",
        order: 2,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson provides technical understanding of Kasplex's architecture, explains its transaction flow, and outlines the developer experience for building on the platform.</p>
<p><strong>Platform Overview</strong></p>
<p>Kasplex is a Layer 2 zkEVM rollup that brings Ethereum-compatible smart contract capabilities to Kaspa. Launched in late 2025, it represents the first production smart contract platform in the Kaspa ecosystem, enabling developers to deploy Solidity contracts with minimal adaptation. Notably, Kasplex L2 is the birthplace of BMTUniversity.com, the first learn-to-earn educational platform on Kaspa—the very platform whose content powers Kaspa University.</p>
<p><strong>Technical Architecture</strong></p>
<p>Kasplex implements a based rollup architecture that utilizes Kaspa Layer 1 as its sequencer. The virtual machine maintains full EVM compatibility, allowing Solidity contracts to function without modification. The native gas token is KAS, bridged from Layer 1. The network operates under chain ID 202555 for MetaMask and wallet configuration.</p>
<p><strong>Transaction Flow</strong></p>
<p>Transaction processing follows a defined sequence. Users submit transactions to the Kaspa Layer 1 network. Transaction data is embedded within Kaspa blocks as payload data. The Kasplex indexer extracts these transactions and executes them against the EVM state. State updates are stored off-chain in an optimized format. Any observer can verify correctness by re-executing the transaction sequence from Layer 1 data.</p>
<p><strong>Developer Experience</strong></p>
<p>Developers familiar with Ethereum tooling can immediately work with Kasplex. Deployment uses standard frameworks including Hardhat, Remix, and Truffle. Wallet connectivity occurs through MetaMask configured with the Kasplex RPC endpoint. Smart contracts are written in Solidity using established patterns. The full ecosystem of EVM development tools and libraries remains compatible.</p>
<p><strong>Resources</strong></p>
<p>Essential endpoints and documentation: RPC access at evmrpc.kasplex.org, block explorer at explorer.kasplex.org, technical documentation at docs-kasplex.gitbook.io/l2-network, and the bridging interface at kasbridge-evm.kaspafoundation.org.</p>`,
      },
      {
        id: "lesson-21-3",
        courseId: "l2-on-kaspa",
        title: "Igra Labs: Based Rollup with Atomic Composability",
        order: 3,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson examines Igra Labs' technical approach to building a based rollup on Kaspa, explains the revolutionary concept of atomic synchronous composability, and surveys the project's development roadmap.</p>
<p><strong>Platform Overview</strong></p>
<p>Igra Labs develops a based rollup leveraging Kaspa's BlockDAG architecture to unlock next-generation decentralized applications. The platform is secured by Kaspa's 1.45 EH hash power and achieves scalable 5,000 TPS with sub-second finality. The project mission is to "Defy DeFi limitations" through atomic programmability.</p>
<p><strong>Atomic Synchronous Composability</strong></p>
<p>Igra's defining innovation is atomic synchronous composability—the ability to execute multiple operations across separate smart contracts in a single transaction without risk of partial failure. This enables DeFi applications that were previously impossible: on-chain risk engines that analyze transactions and trigger mitigating actions atomically, on-chain orderbook DEXs that live within single transactions, atomic perpetual markets combining transparency and efficiency, and stablecoins collateralized by Kaspa perps using delta hedge strategies.</p>
<p><strong>Technical Architecture</strong></p>
<p>Igra implements Bitcoin-grade security through Kaspa's proof-of-work BlockDAG. The validity of Igra's state is secured by Kaspa's proof-of-work consensus. The platform provides MEV resilience, preventing exploitative behaviors and oracle manipulation. As an interoperable L2, developers can create dApps with assets that settle across various ZK chains.</p>
<p><strong>Development Roadmap</strong></p>
<p>The roadmap includes: Q1 2025 Dromon (invite-only devnet), July 2025 Caravel (incentivized testnet on Kaspa TN10), Q3 2025 public nodes on Caravel, January 2026 Galleon (closed mainnet with community nodes), February 2026 Fluyt (open mainnet with TGE), and March 2026 Frigate (public open mainnet).</p>
<p><strong>Resources</strong></p>
<p>Documentation is available at docs.igralabs.com. Project updates are shared on Twitter at @Igra_Labs. Contact the team at team@igralabs.com.</p>`,
      },
      {
        id: "lesson-21-4",
        courseId: "l2-on-kaspa",
        title: "Cross-Layer Asset Bridging",
        order: 4,
        duration: "8 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson explains the bridging process for moving assets between Kaspa Layer 1 and Layer 2, details the Kurve bridge workflow, and introduces alternative bridging methods.</p>
<p><strong>Bridging Fundamentals</strong></p>
<p>Utilizing Layer 2 smart contracts requires moving assets from Layer 1 to Layer 2. Bridging is the process of securely transferring assets between these layers while maintaining proper accounting on both sides.</p>
<p><strong>The Kurve Bridge</strong></p>
<p>Kurve serves as the official bridge for Kasplex L2, funded by the Kaspa Ecosystem Fund. The interface is accessible at kasbridge-evm.kaspafoundation.org, with technical documentation at kaspafoundation.gitbook.io/kurve-docs.</p>
<p><strong>Deposit Process (L1 to L2)</strong></p>
<p>To move assets to Layer 2, users first connect their Kaspa wallet to the Kurve interface. After specifying the amount to bridge, the user sends KAS to Kurve's Layer 1 pool address. Upon confirmation, the equivalent amount of wrapped L2 KAS appears in the user's Layer 2 address, available for gas payments, DeFi interactions, and smart contract usage.</p>
<p><strong>Withdrawal Process (L2 to L1)</strong></p>
<p>Returning assets to Layer 1 follows the reverse flow. The user initiates withdrawal through the Kurve interface. The Layer 2 KAS is sent to the bridge contract and locked. Once the transaction confirms, the corresponding Layer 1 KAS is released and delivered to the user's Kaspa wallet.</p>
<p><strong>KSPR Bot Integration</strong></p>
<p>For users preferring a simplified interface, KSPR Bot on Telegram provides bridging functionality. Users access the bot at @kspr_fun_bot, create a wallet (with careful backup of the private key), deposit KAS to their Layer 1 address, and use the /bridge command to initiate transfers.</p>
<p><strong>Best Practices</strong></p>
<p>Several guidelines ensure successful bridging: maintain 4-5 KAS on Layer 1 for transaction fees, begin with small amounts while learning the process, verify all addresses through official documentation only, and note that the bridge employs MPC multi-signature security for asset protection.</p>`,
      },
      {
        id: "lesson-21-5",
        courseId: "l2-on-kaspa",
        title: "Ecosystem Development and Future Directions",
        order: 5,
        duration: "5 min",
        content: `<p><strong>Learning Objectives</strong></p>
<p>This lesson surveys the current state of Kaspa's Layer 2 ecosystem, examines upcoming developments, and contextualizes the platform's evolution within the broader blockchain landscape.</p>
<p><strong>Current Production Infrastructure</strong></p>
<p>Several components of the Layer 2 ecosystem have reached production status. Kasplex zkEVM operates on mainnet, providing EVM-compatible smart contract execution. Zealous Swap functions as the first decentralized exchange on Kasplex. The Kurve Bridge enables asset transfers between Layer 1 and Layer 2. NFT marketplaces operate on Layer 2 infrastructure, expanding the ecosystem's capabilities.</p>
<p><strong>Development Roadmap</strong></p>
<p>Near-term developments will further expand the ecosystem. Igra Labs mainnet will provide gaming-optimized Layer 2 infrastructure. Multi-chain bridge integration will connect Kaspa to BNB Chain and over 30 additional networks. DagKnight protocol development promises native ZK bridge functionality on Layer 1. Additional decentralized exchanges and DeFi protocols are in development.</p>
<p><strong>Platform Architecture Vision</strong></p>
<p>The Layer 2 ecosystem transforms Kaspa from a payment network into a comprehensive platform. Layer 1 provides ultra-fast, secure proof-of-work settlement. Layer 2 enables smart contracts, decentralized finance, and gaming applications. Native protocols (K, Kasia, KU, KRC-721) provide specialized functionality for social communication, private messaging, educational credentials, and non-fungible tokens.</p>
<p><strong>Adoption Implications</strong></p>
<p>This architecture serves diverse stakeholder needs. Developers can migrate existing EVM applications with minimal modification. Users access DeFi functionality through familiar tooling. Enterprises can build complex applications on production infrastructure. Gaming platforms can implement real-time blockchain integration previously impossible on slower networks.</p>
<p><strong>Continued Learning</strong></p>
<p>This course provides foundational understanding of Kaspa's Layer 2 ecosystem. Further exploration might include detailed study of Kasplex documentation, participation in the Igra Labs developer community, practical experience with small-amount bridging, and smart contract development on the platform. For comprehensive Kaspa education beyond this platform, bmtuniversity.com offers peer-reviewed courses covering BlockDAG fundamentals through advanced consensus mechanics.</p>`,
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
      { id: "q-1-15-1", lessonId: "lesson-1-15", question: "Should I learn more about Kaspa?", options: ["No, this is enough", "Yes!", "Maybe later", "I already know everything"], correctIndex: 1, explanation: "Absolutely! There's always more to learn about Kaspa's innovative technology. Keep exploring!" },

      // Course 2: Sound Money & Monetary Debasement - 4 lessons
      { id: "q-sm-1-1", lessonId: "lesson-sm-1", question: "What is the defining characteristic of sound money?", options: ["Government backing", "Digital format", "Scarcity that cannot be arbitrarily manipulated", "Wide acceptance"], correctIndex: 2, explanation: "Sound money maintains value through scarcity and resistance to manipulation—it cannot be arbitrarily created by any central authority." },
      { id: "q-sm-2-1", lessonId: "lesson-sm-2", question: "What event in 1971 fundamentally changed the US dollar?", options: ["The Federal Reserve was created", "Nixon suspended gold convertibility", "Bitcoin was invented", "Credit cards were introduced"], correctIndex: 1, explanation: "On August 15, 1971, Nixon suspended dollar-to-gold convertibility, ending the Bretton Woods system and inaugurating pure fiat currency." },
      { id: "q-sm-3-1", lessonId: "lesson-sm-3", question: "What is the 'inflation hurdle'?", options: ["Government inflation target", "The minimum return needed just to maintain purchasing power", "Maximum inflation rate", "Inflation insurance cost"], correctIndex: 1, explanation: "The inflation hurdle is the minimum investment return required simply to break even in real terms—before any actual wealth creation occurs." },
      { id: "q-sm-4-1", lessonId: "lesson-sm-4", question: "How does Kaspa implement sound money principles?", options: ["Government guarantees", "Bank backing", "Cryptographic scarcity with fixed supply and proof-of-work security", "Corporate reserves"], correctIndex: 2, explanation: "Kaspa implements sound money through mathematical supply limits, verifiable by anyone, secured by proof-of-work rather than trust in institutions." },

      // Course 3: Self-Custody & Hardware Wallets - 4 lessons
      { id: "q-sc-1-1", lessonId: "lesson-sc-1", question: "What does 'not your keys, not your coins' mean?", options: ["You need physical keys", "Whoever controls the private keys controls the assets", "Keys are made of coins", "Coins require key signatures"], correctIndex: 1, explanation: "This phrase encapsulates self-custody: whoever controls the cryptographic private keys has complete control over the assets, regardless of claimed ownership." },
      { id: "q-sc-2-1", lessonId: "lesson-sc-2", question: "What is the key difference between hot and cold wallets?", options: ["Price difference", "Hot wallets are on internet-connected devices; cold storage is offline", "Color of the device", "Country of manufacture"], correctIndex: 1, explanation: "Hot wallets maintain keys on internet-connected devices for convenience; cold storage keeps keys completely offline for maximum security." },
      { id: "q-sc-3-1", lessonId: "lesson-sc-3", question: "How should you store your seed phrase?", options: ["In cloud storage for easy access", "As a photo on your phone", "Written on paper/metal, stored offline in multiple secure locations", "Shared with customer support"], correctIndex: 2, explanation: "Seed phrases should never be stored digitally. Write them on paper or metal and store in multiple secure physical locations." },
      { id: "q-sc-4-1", lessonId: "lesson-sc-4", question: "Why should you verify transaction details on the hardware wallet screen?", options: ["To check battery level", "Computer displays can be manipulated by malware; the hardware wallet shows the true transaction", "To see the time", "To read the manual"], correctIndex: 1, explanation: "Malware could display incorrect addresses on your computer. Always verify the actual recipient address and amount on the hardware wallet's trusted display." },

      // Course 4: DAG Terminology - 8 lessons
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

      // Course 17: K Protocol - 4 lessons
      { id: "q-17-1-1", lessonId: "lesson-17-1", question: "What is K Protocol?", options: ["A payment processing system", "A decentralized microblogging protocol on Kaspa", "A mining algorithm", "A wallet standard"], correctIndex: 1, explanation: "K Protocol is a decentralized microblogging protocol that embeds posts directly into Kaspa blockchain transactions." },
      { id: "q-17-2-1", lessonId: "lesson-17-2", question: "What are the three layers of K Social's architecture?", options: ["Frontend, Backend, Database", "Kaspa Node, K-Indexer, K Frontend", "Mining, Consensus, Storage", "User, Server, Blockchain"], correctIndex: 1, explanation: "K Social uses Kaspa Node (validation), K-Indexer (scans transactions), and K Frontend (user interface)." },
      { id: "q-17-3-1", lessonId: "lesson-17-3", question: "Approximately how many posts can you make with 1 KAS on K Protocol?", options: ["100 posts", "1,000 posts", "50,000 posts", "1 million posts"], correctIndex: 2, explanation: "At ~0.00002 KAS per post, you can make approximately 50,000 posts with just 1 KAS." },
      { id: "q-17-4-1", lessonId: "lesson-17-4", question: "How does Kaspa University use K Protocol?", options: ["For processing payments", "For public lesson Q&A discussions that are recorded on-chain", "For user authentication", "For storing course content"], correctIndex: 1, explanation: "Kaspa University uses K Protocol for public Q&A discussions, creating a permanent on-chain knowledge base." },

      // Course 18: Kasia Protocol - 4 lessons
      { id: "q-18-1-1", lessonId: "lesson-18-1", question: "What is the key difference between K Protocol and Kasia?", options: ["K is faster", "K is for public posts, Kasia is for encrypted private messages", "Kasia is cheaper", "K uses a different blockchain"], correctIndex: 1, explanation: "K Protocol is for public microblogging, while Kasia provides end-to-end encrypted private messaging." },
      { id: "q-18-2-1", lessonId: "lesson-18-2", question: "What unique feature allows Kasia users to send money while chatting?", options: ["Smart contracts", "In-chat KAS payments", "Credit card integration", "Bank transfers"], correctIndex: 1, explanation: "Kasia supports in-chat payments, allowing users to send KAS directly within encrypted conversations." },
      { id: "q-18-3-1", lessonId: "lesson-18-3", question: "Why is Kasia more censorship-resistant than Signal or WhatsApp?", options: ["Faster encryption", "No central servers that can be pressured or shut down", "Larger user base", "Better marketing"], correctIndex: 1, explanation: "Kasia is decentralized with no central servers, eliminating single points of failure or government pressure." },
      { id: "q-18-4-1", lessonId: "lesson-18-4", question: "What three use cases does Kaspa University implement with Kasia?", options: ["Mining, Trading, Staking", "Admin support, instructor contact, student-to-student messaging", "Payments, Rewards, NFTs", "Login, Logout, Registration"], correctIndex: 1, explanation: "KU uses Kasia for admin support, contacting instructors, and student-to-student encrypted messaging." },

      // Course 19: KU Protocol - 3 lessons
      { id: "q-19-1-1", lessonId: "lesson-19-1", question: "What does KU Protocol create on the Kaspa blockchain?", options: ["Smart contracts", "Immutable achievement records for education credentials", "Mining rewards", "Token transfers"], correctIndex: 1, explanation: "KU Protocol creates permanent, verifiable achievement records for quiz completions and course progress." },
      { id: "q-19-2-1", lessonId: "lesson-19-2", question: "What proves that YOU completed a quiz in KU Protocol?", options: ["Username and password", "Your wallet's cryptographic signature on the achievement payload", "Email confirmation", "Phone verification"], correctIndex: 1, explanation: "Your wallet signature cryptographically proves you control the wallet that earned the achievement." },
      { id: "q-19-3-1", lessonId: "lesson-19-3", question: "How much KAS do you earn per course completion on Kaspa University?", options: ["0.01 KAS", "0.1 KAS", "1 KAS", "10 KAS"], correctIndex: 1, explanation: "Kaspa University rewards 0.1 KAS per course completion, sent directly to your connected wallet." },

      // Course 20: KRC-721 NFT Standard - 4 lessons
      { id: "q-20-1-1", lessonId: "lesson-20-1", question: "What does NFT stand for and why are they 'non-fungible'?", options: ["Network File Transfer - they transfer files", "Non-Fungible Token - each one is unique unlike identical coins", "New Finance Technology - they're financial tools", "Node Formation Token - they create nodes"], correctIndex: 1, explanation: "NFT means Non-Fungible Token - each is unique (like art) unlike fungible tokens (like KAS where each is identical)." },
      { id: "q-20-2-1", lessonId: "lesson-20-2", question: "What is the purpose of KRC-721's commit-reveal mechanism?", options: ["To speed up minting", "To prevent front-running and ensure fair minting", "To reduce costs", "To improve graphics quality"], correctIndex: 1, explanation: "Commit-reveal prevents attackers from seeing and front-running mint transactions, ensuring fair distribution." },
      { id: "q-20-3-1", lessonId: "lesson-20-3", question: "Where is NFT image data typically stored in the KRC-721 standard?", options: ["Directly on Kaspa blockchain", "On IPFS with the URI stored on-chain", "On centralized servers", "In user's local storage"], correctIndex: 1, explanation: "Due to on-chain storage limits, NFT images are stored on decentralized IPFS with the content URI recorded on-chain." },
      { id: "q-20-4-1", lessonId: "lesson-20-4", question: "What is the KUDIPLOMA NFT and how do you become eligible to mint one?", options: ["A paid certificate anyone can buy", "A diploma NFT earned by completing all courses on Kaspa University", "A mining reward", "A token airdrop"], correctIndex: 1, explanation: "KUDIPLOMA is a KRC-721 NFT issued to graduates who complete all courses, using whitelist-based pricing for verified students." },

      // Course 21: L2 on Kaspa - 5 lessons
      { id: "q-21-1-1", lessonId: "lesson-21-1", question: "Why does Kaspa use Layer 2 instead of adding smart contracts directly to Layer 1?", options: ["L1 can't support contracts", "To keep L1 lean, fast, and secure while adding capabilities via L2", "It's cheaper", "L2 is more decentralized"], correctIndex: 1, explanation: "Kaspa's philosophy prioritizes keeping L1 simple and secure - L2 adds complexity without compromising base layer properties." },
      { id: "q-21-2-1", lessonId: "lesson-21-2", question: "What type of L2 solution is Kasplex?", options: ["Sidechain", "zkEVM rollup that brings EVM-compatible smart contracts to Kaspa", "Payment channel", "Federated network"], correctIndex: 1, explanation: "Kasplex is a Layer 2 zkEVM rollup, enabling Ethereum-compatible smart contracts (Solidity) on Kaspa." },
      { id: "q-21-3-1", lessonId: "lesson-21-3", question: "What is Igra Labs' defining innovation?", options: ["Faster block times", "Atomic synchronous composability—executing multiple contracts in one atomic transaction", "Lower gas fees", "More validators"], correctIndex: 1, explanation: "Igra's atomic synchronous composability enables multiple smart contract operations to execute atomically in a single transaction without risk of partial failure, unlocking DeFi applications previously impossible. to support multiple VMs beyond just EVM." },
      { id: "q-21-4-1", lessonId: "lesson-21-4", question: "What is Kurve Bridge used for?", options: ["Mining", "Transferring KAS between Layer 1 and Kasplex Layer 2", "Trading NFTs", "Staking"], correctIndex: 1, explanation: "Kurve Bridge enables users to move KAS from Kaspa L1 to Kasplex L2 and back, funded by the Kaspa Ecosystem Foundation." },
      { id: "q-21-5-1", lessonId: "lesson-21-5", question: "What does the Layer 2 ecosystem transform Kaspa into?", options: ["Just a faster Bitcoin", "A comprehensive platform with smart contracts, DeFi, and gaming capabilities", "A stablecoin network", "A centralized exchange"], correctIndex: 1, explanation: "The L2 ecosystem transforms Kaspa from a payment network into a comprehensive platform - L1 provides fast settlement while L2 enables smart contracts, DeFi, and gaming applications." },
    ];

export { courses, allLessons as lessons, allQuestions as quizQuestions };
