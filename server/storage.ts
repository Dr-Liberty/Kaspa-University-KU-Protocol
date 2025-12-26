import type {
  User,
  InsertUser,
  Course,
  Lesson,
  QuizQuestion,
  QuizResult,
  CourseReward,
  Certificate,
  UserProgress,
  QAPost,
  InsertQAPost,
  Stats,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserKas(userId: string, amount: number): Promise<void>;

  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;

  getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;

  getQuizQuestionsByLesson(lessonId: string): Promise<QuizQuestion[]>;
  saveQuizResult(result: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult>;
  getQuizResultsByUser(userId: string): Promise<QuizResult[]>;
  getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]>;
  getQuizResult(id: string): Promise<QuizResult | undefined>;

  getCourseRewardsByUser(userId: string): Promise<CourseReward[]>;
  getCourseReward(id: string): Promise<CourseReward | undefined>;
  getCourseRewardForCourse(userId: string, courseId: string): Promise<CourseReward | undefined>;
  createCourseReward(reward: Omit<CourseReward, "id" | "completedAt">): Promise<CourseReward>;
  updateCourseReward(id: string, updates: Partial<CourseReward>): Promise<CourseReward | undefined>;
  getClaimableCourseRewards(userId: string): Promise<CourseReward[]>;
  checkCourseCompletion(userId: string, courseId: string): Promise<{completed: boolean; averageScore: number; lessonsCompleted: number; totalLessons: number}>;

  getCertificatesByUser(userId: string): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  createCertificate(cert: Omit<Certificate, "id">): Promise<Certificate>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined>;
  getCertificateCount(): Promise<number>;

  getUserProgress(userId: string): Promise<UserProgress[]>;
  getOrCreateProgress(userId: string, courseId: string): Promise<UserProgress>;
  updateProgress(progressId: string, lessonId: string): Promise<UserProgress>;

  getQAPostsByLesson(lessonId: string): Promise<QAPost[]>;
  getQAPost(id: string): Promise<QAPost | undefined>;
  createQAPost(post: InsertQAPost): Promise<QAPost>;

  getStats(): Promise<Stats>;

  getRecentQuizResults(limit: number): Promise<QuizResult[]>;
  getRecentQAPosts(limit: number): Promise<QAPost[]>;
  
  getAllUsers(): Promise<User[]>;
  getTopLearners(limit: number): Promise<User[]>;
  getTotalQuizResults(): Promise<number>;
  getAverageScore(): Promise<number>;
  getCourseCompletionCounts(): Promise<Map<string, number>>;
  getAllQuizResults(): Promise<QuizResult[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private courses: Map<string, Course> = new Map();
  private lessons: Map<string, Lesson> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();
  private quizResults: Map<string, QuizResult> = new Map();
  private courseRewards: Map<string, CourseReward> = new Map();
  private certificates: Map<string, Certificate> = new Map();
  private userProgress: Map<string, UserProgress> = new Map();
  private qaPosts: Map<string, QAPost> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const courses: Course[] = [
      {
        id: "course-1",
        title: "Introduction to Kaspa",
        description: "Learn the fundamentals of Kaspa blockchain, including its unique BlockDAG architecture and GHOSTDAG consensus.",
        lessonCount: 3,
        kasReward: 0.5,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "course-2",
        title: "Bitcoin vs Kaspa: The Next Evolution",
        description: "Compare Bitcoin and Kaspa architectures, understanding how Kaspa solves the blockchain trilemma.",
        lessonCount: 3,
        kasReward: 0.75,
        difficulty: "beginner",
        category: "Fundamentals",
      },
      {
        id: "course-3",
        title: "Understanding BlockDAG Technology",
        description: "Deep dive into Directed Acyclic Graph structures and how they enable parallel block creation.",
        lessonCount: 4,
        kasReward: 1.0,
        difficulty: "intermediate",
        category: "Technical",
      },
      {
        id: "course-4",
        title: "Kaspa Mining Essentials",
        description: "Everything you need to know about mining Kaspa, from hardware requirements to pool selection.",
        lessonCount: 3,
        kasReward: 0.5,
        difficulty: "beginner",
        category: "Mining",
      },
      {
        id: "course-5",
        title: "Building on Kaspa with Kasplex",
        description: "Learn to create tokens and NFTs on Kaspa using the Kasplex Layer 2 protocol.",
        lessonCount: 4,
        kasReward: 1.5,
        difficulty: "advanced",
        category: "Development",
      },
    ];

    courses.forEach((c) => this.courses.set(c.id, c));

    const allLessons: Lesson[] = [
      {
        id: "lesson-1-1",
        courseId: "course-1",
        title: "What is Kaspa?",
        order: 1,
        duration: "10 min",
        content: `
          <h2>Welcome to Kaspa</h2>
          <p>Kaspa is a proof-of-work cryptocurrency that implements the GHOSTDAG protocol. Unlike traditional blockchains, Kaspa uses a <strong>BlockDAG</strong> (Directed Acyclic Graph) structure that allows blocks to coexist and be ordered in consensus.</p>
          
          <h3>Key Features</h3>
          <ul>
            <li><strong>High Block Rate:</strong> 10 blocks per second (targeting 32-100+ BPS)</li>
            <li><strong>Instant Confirmations:</strong> Sub-second transaction finality</li>
            <li><strong>Fair Launch:</strong> No pre-mine, no ICO, 100% mined</li>
            <li><strong>Decentralized:</strong> True proof-of-work security like Bitcoin</li>
          </ul>

          <h3>The BlockDAG Difference</h3>
          <p>In traditional blockchains, when two miners find a block at the same time, one becomes an "orphan" and is discarded. In Kaspa's BlockDAG, <em>all valid blocks are kept</em> and referenced by future blocks, creating a DAG structure instead of a linear chain.</p>

          <p>This innovation allows Kaspa to achieve throughput previously thought impossible for PoW blockchains while maintaining the security guarantees that made Bitcoin revolutionary.</p>
        `,
      },
      {
        id: "lesson-1-2",
        courseId: "course-1",
        title: "The GHOSTDAG Protocol",
        order: 2,
        duration: "12 min",
        content: `
          <h2>Understanding GHOSTDAG</h2>
          <p>GHOSTDAG (Greedy Heaviest-Observed Sub-Tree DAG) is the consensus protocol that makes Kaspa possible. It's an extension of the PHANTOM protocol, designed to order blocks in a DAG structure.</p>

          <h3>How GHOSTDAG Works</h3>
          <ol>
            <li><strong>Block Creation:</strong> Miners create blocks that reference multiple previous blocks (not just one parent)</li>
            <li><strong>Blue vs Red Blocks:</strong> Blocks are colored based on connectivity - well-connected "blue" blocks are considered honest</li>
            <li><strong>Ordering:</strong> The protocol creates a total ordering of all blocks, even those created in parallel</li>
            <li><strong>Finality:</strong> Transactions achieve finality in seconds, not hours</li>
          </ol>

          <h3>Security Guarantees</h3>
          <p>GHOSTDAG maintains the same security assumptions as Bitcoin's Nakamoto consensus - an attacker needs 51% of hashrate to reverse transactions. The difference is that honest miners don't waste work on orphaned blocks.</p>

          <blockquote>
            <p>"GHOSTDAG achieves the seemingly impossible: high throughput without sacrificing decentralization or security."</p>
          </blockquote>
        `,
      },
      {
        id: "lesson-1-3",
        courseId: "course-1",
        title: "Kaspa's Native Token: KAS",
        order: 3,
        duration: "8 min",
        content: `
          <h2>KAS Token Economics</h2>
          <p>KAS is the native cryptocurrency of the Kaspa network. It's used for transaction fees, mining rewards, and as a store of value.</p>

          <h3>Supply and Emission</h3>
          <ul>
            <li><strong>Max Supply:</strong> 28.7 billion KAS</li>
            <li><strong>Emission:</strong> Geometric decrease (like Bitcoin's halvings, but smoother)</li>
            <li><strong>Current Circulation:</strong> ~26.78 billion KAS (as of 2025)</li>
            <li><strong>Block Reward:</strong> Decreasing over time following the chromatic emission schedule</li>
          </ul>

          <h3>Fair Distribution</h3>
          <p>Kaspa had no pre-mine, no ICO, and no venture capital allocation. All KAS tokens were distributed through mining, ensuring a fair and decentralized distribution from day one.</p>

          <h3>Transaction Fees</h3>
          <p>Due to the high throughput of the network, transaction fees on Kaspa are extremely low - typically fractions of a cent. This makes it practical for microtransactions and everyday use.</p>
        `,
      },
      {
        id: "lesson-2-1",
        courseId: "course-2",
        title: "Bitcoin's Limitations",
        order: 1,
        duration: "10 min",
        content: `
          <h2>Understanding Bitcoin's Constraints</h2>
          <p>Bitcoin is the original cryptocurrency and remains the most secure blockchain network. However, its design imposes certain limitations that Kaspa addresses.</p>

          <h3>The Block Time Problem</h3>
          <p>Bitcoin produces one block every ~10 minutes. This slow block time was chosen for security - it gives blocks time to propagate across the network before the next block is mined.</p>

          <h3>Orphan Blocks</h3>
          <p>When two miners find a block at the same time, only one can be included in the chain. The other becomes an "orphan" - the miner's work is wasted. This creates a ceiling on how fast blocks can be produced.</p>

          <h3>The Blockchain Trilemma</h3>
          <ul>
            <li><strong>Security:</strong> Resistance to attacks</li>
            <li><strong>Decentralization:</strong> No central point of control</li>
            <li><strong>Scalability:</strong> High transaction throughput</li>
          </ul>
          <p>Traditional blockchains must sacrifice one of these three properties. Bitcoin prioritizes security and decentralization at the cost of scalability.</p>
        `,
      },
      {
        id: "lesson-2-2",
        courseId: "course-2",
        title: "How Kaspa Solves the Trilemma",
        order: 2,
        duration: "12 min",
        content: `
          <h2>Breaking the Trilemma</h2>
          <p>Kaspa's BlockDAG architecture fundamentally changes the scaling equation. By embracing parallel block creation instead of fighting it, Kaspa achieves all three properties.</p>

          <h3>Security Without Sacrifice</h3>
          <p>Like Bitcoin, Kaspa uses proof-of-work with the kHeavyHash algorithm. An attacker still needs 51% of hashrate to compromise the network. The security model is unchanged.</p>

          <h3>True Decentralization</h3>
          <p>Anyone can mine Kaspa with consumer hardware. There's no staking requirement, no validator selection, and no permission needed. The network is as decentralized as Bitcoin.</p>

          <h3>Unprecedented Scalability</h3>
          <ul>
            <li>10 blocks per second (vs Bitcoin's 1 block per 10 minutes)</li>
            <li>Sub-second confirmation times</li>
            <li>Roadmap to 32-100+ blocks per second</li>
          </ul>

          <p>The secret is simple: don't throw away orphan blocks. Include them all, order them with GHOSTDAG, and let the network process transactions in parallel.</p>
        `,
      },
      {
        id: "lesson-2-3",
        courseId: "course-2",
        title: "Side-by-Side Comparison",
        order: 3,
        duration: "8 min",
        content: `
          <h2>Bitcoin vs Kaspa: The Numbers</h2>
          
          <table>
            <tr><th>Feature</th><th>Bitcoin</th><th>Kaspa</th></tr>
            <tr><td>Block Time</td><td>10 minutes</td><td>100ms (10 blocks per second)</td></tr>
            <tr><td>Confirmation</td><td>10-60 minutes</td><td>Under 10 seconds</td></tr>
            <tr><td>Consensus</td><td>Nakamoto</td><td>GHOSTDAG</td></tr>
            <tr><td>Structure</td><td>Blockchain</td><td>BlockDAG</td></tr>
            <tr><td>Max Supply</td><td>21 million</td><td>28.7 billion</td></tr>
            <tr><td>Algorithm</td><td>SHA-256</td><td>kHeavyHash</td></tr>
            <tr><td>Fair Launch</td><td>Yes</td><td>Yes</td></tr>
          </table>

          <h3>The Best of Both Worlds</h3>
          <p>Kaspa isn't trying to replace Bitcoin - it's building on Bitcoin's proven security model while solving its scalability limitations. Both can coexist, serving different use cases in the cryptocurrency ecosystem.</p>
        `,
      },
      {
        id: "lesson-3-1",
        courseId: "course-3",
        title: "DAG Fundamentals",
        order: 1,
        duration: "15 min",
        content: `
          <h2>Directed Acyclic Graphs Explained</h2>
          <p>A DAG (Directed Acyclic Graph) is a data structure consisting of nodes connected by directed edges, with no cycles (you can't start at a node and follow edges back to the same node).</p>

          <h3>Why DAGs for Blockchains?</h3>
          <p>Traditional blockchains form a simple chain: each block points to exactly one parent. This creates a bottleneck - only one block can be added at a time.</p>

          <p>In a BlockDAG:</p>
          <ul>
            <li>Each block can reference <strong>multiple</strong> parent blocks</li>
            <li>Multiple blocks can be created simultaneously</li>
            <li>The structure naturally handles concurrency</li>
            <li>No work is wasted on orphaned blocks</li>
          </ul>

          <h3>The Merkle DAG Connection</h3>
          <p>If you're familiar with Git version control, you've already used a DAG! Git commits form a DAG structure, allowing branches and merges. Kaspa applies similar principles to blockchain consensus.</p>
        `,
      },
      {
        id: "lesson-3-2",
        courseId: "course-3",
        title: "Parallel Block Creation",
        order: 2,
        duration: "12 min",
        content: `
          <h2>Mining in a DAG World</h2>
          <p>In Kaspa, miners don't compete against each other - they contribute to a shared structure. Multiple miners can find valid blocks at the same time, and all blocks are included.</p>

          <h3>The Mining Process</h3>
          <ol>
            <li>Miner receives the current DAG state</li>
            <li>Selects transactions from the mempool</li>
            <li>Creates a block referencing recent "tips" (blocks with no children)</li>
            <li>Mines until finding a valid hash</li>
            <li>Broadcasts the block to the network</li>
          </ol>

          <p>The key difference: referencing multiple tips. A block might point to 3, 5, or 10 parent blocks, incorporating all recent mining work.</p>

          <h3>No More Orphans</h3>
          <p>In Bitcoin, if two miners find a block at the same time, one is discarded. In Kaspa, both blocks are included and ordered by GHOSTDAG. Miner efficiency approaches 100%.</p>
        `,
      },
      {
        id: "lesson-3-3",
        courseId: "course-3",
        title: "Block Ordering in GHOSTDAG",
        order: 3,
        duration: "15 min",
        content: `
          <h2>Creating Order from Chaos</h2>
          <p>With blocks being created in parallel, how do we know which transactions came first? GHOSTDAG provides a deterministic ordering that all nodes agree on.</p>

          <h3>Blue and Red Blocks</h3>
          <p>GHOSTDAG colors blocks based on their connectivity:</p>
          <ul>
            <li><strong>Blue Blocks:</strong> Well-connected, likely honest blocks</li>
            <li><strong>Red Blocks:</strong> Poorly connected, potentially malicious</li>
          </ul>

          <h3>The Ordering Algorithm</h3>
          <ol>
            <li>Start from the genesis block</li>
            <li>Follow the "blue" chain of heaviest blocks</li>
            <li>Insert red blocks at appropriate positions</li>
            <li>Result: a total ordering of all blocks and transactions</li>
          </ol>

          <p>This ordering is deterministic - every node running GHOSTDAG will arrive at the same order, ensuring consensus across the network.</p>
        `,
      },
      {
        id: "lesson-3-4",
        courseId: "course-3",
        title: "Finality and Confirmation",
        order: 4,
        duration: "10 min",
        content: `
          <h2>When is a Transaction Final?</h2>
          <p>In blockchains, finality is the point where a transaction cannot be reversed. Kaspa achieves finality faster than any other PoW blockchain.</p>

          <h3>Confirmation Tiers</h3>
          <ul>
            <li><strong>1 second:</strong> Transaction visible in DAG, initial confirmation</li>
            <li><strong>10 seconds:</strong> Transaction deeply embedded, highly secure</li>
            <li><strong>1 minute:</strong> Practical finality for all use cases</li>
          </ul>

          <h3>Why So Fast?</h3>
          <p>With 10 blocks per second, your transaction is quickly buried under subsequent blocks. An attacker would need to out-mine the entire network to reverse it - the same security model as Bitcoin, just faster.</p>

          <h3>Comparison</h3>
          <ul>
            <li>Bitcoin: 60+ minutes for good finality</li>
            <li>Kaspa: 10 seconds for comparable security</li>
          </ul>
        `,
      },
      {
        id: "lesson-4-1",
        courseId: "course-4",
        title: "Getting Started with Mining",
        order: 1,
        duration: "12 min",
        content: `
          <h2>Mining Kaspa: An Introduction</h2>
          <p>Kaspa uses the kHeavyHash algorithm, which is ASIC-compatible. Mining can be done with ASICs, and previously with GPUs before ASICs became dominant.</p>

          <h3>What You Need</h3>
          <ul>
            <li><strong>Mining Hardware:</strong> ASIC miners (Bitmain, IceRiver, etc.)</li>
            <li><strong>Kaspa Wallet:</strong> To receive mining rewards</li>
            <li><strong>Mining Pool:</strong> Recommended for consistent payouts</li>
            <li><strong>Electricity:</strong> Cheap power is key to profitability</li>
          </ul>

          <h3>Solo vs Pool Mining</h3>
          <p>Solo mining is possible but requires significant hashrate. Most miners join pools to receive smaller, more frequent payouts rather than waiting for a lucky block.</p>
        `,
      },
      {
        id: "lesson-4-2",
        courseId: "course-4",
        title: "Choosing Mining Hardware",
        order: 2,
        duration: "10 min",
        content: `
          <h2>ASIC Mining Hardware</h2>
          <p>ASIC miners are specialized devices built specifically for mining. For Kaspa's kHeavyHash algorithm, several manufacturers produce compatible devices.</p>

          <h3>Popular ASIC Options</h3>
          <ul>
            <li><strong>Bitmain KS Series:</strong> High hashrate, higher power consumption</li>
            <li><strong>IceRiver KS Series:</strong> Various models for different budgets</li>
            <li><strong>Goldshell:</strong> Smaller miners suitable for home use</li>
          </ul>

          <h3>Key Metrics</h3>
          <ul>
            <li><strong>Hashrate (TH/s):</strong> Mining speed</li>
            <li><strong>Power (W):</strong> Electricity consumption</li>
            <li><strong>Efficiency (J/TH):</strong> Power per hashrate unit</li>
          </ul>

          <p>Calculate profitability before purchasing. Consider electricity costs, hardware price, and current network difficulty.</p>
        `,
      },
      {
        id: "lesson-4-3",
        courseId: "course-4",
        title: "Pool Selection and Setup",
        order: 3,
        duration: "8 min",
        content: `
          <h2>Joining a Mining Pool</h2>
          <p>Mining pools combine hashpower from many miners, sharing block rewards proportionally. This provides more consistent income than solo mining.</p>

          <h3>Top Kaspa Pools</h3>
          <ul>
            <li>Woolypooly</li>
            <li>Herominers</li>
            <li>K1Pool</li>
            <li>ACC Pool</li>
          </ul>

          <h3>Pool Selection Criteria</h3>
          <ul>
            <li><strong>Fee:</strong> Usually 0.5-1%</li>
            <li><strong>Payout Threshold:</strong> Minimum KAS before withdrawal</li>
            <li><strong>Server Location:</strong> Choose one close to you for lower latency</li>
            <li><strong>Reputation:</strong> Check reviews and payment history</li>
          </ul>

          <p>Most pools provide simple configuration - just point your miner to their server address with your wallet address as the username.</p>
        `,
      },
      {
        id: "lesson-5-1",
        courseId: "course-5",
        title: "Introduction to Kasplex",
        order: 1,
        duration: "12 min",
        content: `
          <h2>What is Kasplex?</h2>
          <p>Kasplex is a Layer 2 protocol built on Kaspa that enables token creation, smart contracts, and NFTs while inheriting Kaspa's security.</p>

          <h3>Key Components</h3>
          <ul>
            <li><strong>KRC-20:</strong> Fungible token standard (like ERC-20)</li>
            <li><strong>KRC-721:</strong> NFT standard (like ERC-721)</li>
            <li><strong>Indexer:</strong> Off-chain service that processes inscriptions</li>
            <li><strong>APIs:</strong> Query token balances and metadata</li>
          </ul>

          <h3>How It Works</h3>
          <p>Kasplex uses a data inscription model. Token operations are embedded as JSON in Kaspa transactions. The indexer reads these inscriptions and maintains state off-chain, while Kaspa L1 provides the canonical ordering and security.</p>
        `,
      },
      {
        id: "lesson-5-2",
        courseId: "course-5",
        title: "Creating KRC-20 Tokens",
        order: 2,
        duration: "15 min",
        content: `
          <h2>Deploying Your First Token</h2>
          <p>KRC-20 tokens are fungible tokens on Kaspa. They can represent anything: currencies, points, governance tokens, or utility tokens.</p>

          <h3>Token Deployment</h3>
          <pre><code>{
  "p": "krc-20",
  "op": "deploy",
  "tick": "MYTOKEN",
  "max": 1000000,
  "lim": 1000
}</code></pre>

          <h3>Parameters</h3>
          <ul>
            <li><strong>tick:</strong> Token ticker symbol</li>
            <li><strong>max:</strong> Maximum supply</li>
            <li><strong>lim:</strong> Maximum mint per transaction</li>
          </ul>

          <h3>Minting Tokens</h3>
          <pre><code>{
  "p": "krc-20",
  "op": "mint",
  "tick": "MYTOKEN"
}</code></pre>
          <p>Anyone can mint until max supply is reached.</p>
        `,
      },
      {
        id: "lesson-5-3",
        courseId: "course-5",
        title: "NFTs with KRC-721",
        order: 3,
        duration: "15 min",
        content: `
          <h2>Creating NFTs on Kaspa</h2>
          <p>KRC-721 allows you to create unique, non-fungible tokens. Perfect for certificates, art, collectibles, and more.</p>

          <h3>NFT Collection Deployment</h3>
          <pre><code>{
  "p": "krc-721",
  "op": "deploy",
  "tick": "MYCOLLECTION",
  "max": 1000,
  "metadata": {
    "name": "My Collection",
    "description": "...",
    "image": "ipfs://..."
  }
}</code></pre>

          <h3>IPFS Integration</h3>
          <p>NFT images and metadata are stored on IPFS. The blockchain stores references (hashes) to this content, ensuring permanence and decentralization.</p>

          <h3>Commit-Reveal Pattern</h3>
          <p>KRC-721 uses a two-step minting process to prevent front-running:</p>
          <ol>
            <li><strong>Commit:</strong> Lock funds with a hash of your intent</li>
            <li><strong>Reveal:</strong> After one block, reveal and mint the NFT</li>
          </ol>
        `,
      },
      {
        id: "lesson-5-4",
        courseId: "course-5",
        title: "Building dApps on Kasplex",
        order: 4,
        duration: "18 min",
        content: `
          <h2>Developing for Kasplex</h2>
          <p>Build decentralized applications using Kasplex APIs and Kaspa's transaction system.</p>

          <h3>Developer Tools</h3>
          <ul>
            <li><strong>KasplexBuilder:</strong> JavaScript library for inscriptions</li>
            <li><strong>Kaspa WASM:</strong> Full SDK for transaction building</li>
            <li><strong>Indexer API:</strong> Query token balances and history</li>
          </ul>

          <h3>Example: Checking Balances</h3>
          <pre><code>import { Indexer } from 'KasplexBuilder';

const indexer = new Indexer('https://api.kasplex.org/v1');
const balances = await indexer.getKRC20Balances({
  address: "kaspa:your_address"
});</code></pre>

          <h3>Kasplex L2 Mainnet</h3>
          <p>In 2025, Kasplex launched full L2 with EVM compatibility. This enables Solidity smart contracts, DEXs, lending protocols, and more - all secured by Kaspa L1.</p>
        `,
      },
    ];

    allLessons.forEach((l) => this.lessons.set(l.id, l));

    const allQuestions: QuizQuestion[] = [
      { id: "q-1-1-1", lessonId: "lesson-1-1", question: "What consensus protocol does Kaspa use?", options: ["Proof of Stake", "GHOSTDAG", "Nakamoto Consensus", "Tendermint"], correctIndex: 1, explanation: "Kaspa uses the GHOSTDAG protocol for consensus." },
      { id: "q-1-1-2", lessonId: "lesson-1-1", question: "How many blocks per second does Kaspa currently produce?", options: ["1", "5", "10", "100"], correctIndex: 2, explanation: "Kaspa currently produces 10 blocks per second." },
      { id: "q-1-2-1", lessonId: "lesson-1-2", question: "What determines if a block is 'blue' in GHOSTDAG?", options: ["Its size", "Its timestamp", "Its connectivity to other blocks", "Its transaction count"], correctIndex: 2, explanation: "Blocks are colored based on their connectivity - well-connected blocks are considered blue (honest)." },
      { id: "q-1-3-1", lessonId: "lesson-1-3", question: "What is the maximum supply of KAS?", options: ["21 million", "28.7 billion", "100 billion", "Unlimited"], correctIndex: 1, explanation: "The maximum supply of KAS is 28.7 billion tokens." },
      { id: "q-2-1-1", lessonId: "lesson-2-1", question: "What is an 'orphan' block in Bitcoin?", options: ["A block with no transactions", "A block that was found but discarded", "A block with invalid signatures", "The first block in a chain"], correctIndex: 1, explanation: "An orphan block is one that was validly mined but not included in the main chain." },
      { id: "q-2-2-1", lessonId: "lesson-2-2", question: "How does Kaspa handle blocks created simultaneously?", options: ["Discards all but one", "Includes all of them", "Uses random selection", "Requires manual resolution"], correctIndex: 1, explanation: "Kaspa includes all valid blocks in the DAG and orders them with GHOSTDAG." },
      { id: "q-2-3-1", lessonId: "lesson-2-3", question: "What is Kaspa's block rate compared to Bitcoin?", options: ["Same (1 block per 10 minutes)", "10 blocks per second vs 1 per 10 minutes", "1 block per minute vs 10 per hour", "10 blocks per minute vs 1 per hour"], correctIndex: 1, explanation: "Since the Crescendo upgrade, Kaspa produces 10 blocks per second compared to Bitcoin's 1 block per 10 minutes." },
      { id: "q-3-1-1", lessonId: "lesson-3-1", question: "In a BlockDAG, how many parent blocks can a new block reference?", options: ["Exactly one", "Multiple", "None", "Exactly two"], correctIndex: 1, explanation: "In a BlockDAG, blocks can reference multiple parent blocks." },
      { id: "q-3-2-1", lessonId: "lesson-3-2", question: "What happens to simultaneously mined blocks in Kaspa?", options: ["One is discarded", "All are included", "They are merged", "They cancel each other"], correctIndex: 1, explanation: "All valid blocks are included in the DAG structure." },
      { id: "q-3-3-1", lessonId: "lesson-3-3", question: "What is the purpose of GHOSTDAG coloring?", options: ["Visual display", "Determine block order and validity", "Mining optimization", "Network routing"], correctIndex: 1, explanation: "GHOSTDAG coloring helps determine block ordering and identify honest blocks." },
      { id: "q-3-4-1", lessonId: "lesson-3-4", question: "How long does Kaspa take for practical transaction finality?", options: ["10 minutes", "1 hour", "About 10 seconds", "24 hours"], correctIndex: 2, explanation: "Kaspa achieves practical finality in about 10 seconds." },
      { id: "q-4-1-1", lessonId: "lesson-4-1", question: "What mining algorithm does Kaspa use?", options: ["SHA-256", "Ethash", "kHeavyHash", "Scrypt"], correctIndex: 2, explanation: "Kaspa uses the kHeavyHash mining algorithm." },
      { id: "q-4-2-1", lessonId: "lesson-4-2", question: "What is the best efficiency metric for comparing miners?", options: ["Price", "Hashrate only", "Joules per Terahash (J/TH)", "Weight"], correctIndex: 2, explanation: "J/TH measures power efficiency - lower is better." },
      { id: "q-4-3-1", lessonId: "lesson-4-3", question: "Why do most miners join pools?", options: ["It's required", "More consistent payouts", "Lower electricity costs", "Better hardware"], correctIndex: 1, explanation: "Pools provide smaller but more frequent and consistent payouts." },
      { id: "q-5-1-1", lessonId: "lesson-5-1", question: "What is the token standard for NFTs on Kasplex?", options: ["KRC-20", "KRC-721", "ERC-1155", "BRC-20"], correctIndex: 1, explanation: "KRC-721 is the NFT standard on Kasplex, similar to ERC-721." },
      { id: "q-5-2-1", lessonId: "lesson-5-2", question: "What does the 'lim' parameter control in KRC-20?", options: ["Total supply", "Max mint per transaction", "Decimal places", "Transfer fee"], correctIndex: 1, explanation: "The 'lim' parameter sets the maximum amount that can be minted per transaction." },
      { id: "q-5-3-1", lessonId: "lesson-5-3", question: "Why does KRC-721 use a commit-reveal pattern?", options: ["To save gas", "To prevent front-running", "For privacy", "For larger files"], correctIndex: 1, explanation: "The commit-reveal pattern prevents others from front-running your mint transaction." },
      { id: "q-5-4-1", lessonId: "lesson-5-4", question: "Where are NFT images typically stored?", options: ["On the blockchain", "On IPFS", "In the indexer", "In the wallet"], correctIndex: 1, explanation: "NFT images are stored on IPFS with references on the blockchain." },
    ];

    allQuestions.forEach((q) => this.quizQuestions.set(q.id, q));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.walletAddress === address);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      walletAddress: insertUser.walletAddress,
      displayName: insertUser.displayName,
      totalKasEarned: 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserKas(userId: string, amount: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.totalKasEarned += amount;
    }
  }

  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return Array.from(this.lessons.values())
      .filter((l) => l.courseId === courseId)
      .sort((a, b) => a.order - b.order);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getQuizQuestionsByLesson(lessonId: string): Promise<QuizQuestion[]> {
    return Array.from(this.quizQuestions.values()).filter((q) => q.lessonId === lessonId);
  }

  async saveQuizResult(result: Omit<QuizResult, "id" | "completedAt">): Promise<QuizResult> {
    const id = randomUUID();
    const quizResult: QuizResult = { ...result, id, completedAt: new Date() };
    this.quizResults.set(id, quizResult);
    return quizResult;
  }

  async getQuizResultsByUser(userId: string): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values()).filter((r) => r.userId === userId);
  }

  async getQuizResult(id: string): Promise<QuizResult | undefined> {
    return this.quizResults.get(id);
  }

  async getQuizResultsForCourse(userId: string, courseId: string): Promise<QuizResult[]> {
    const lessons = await this.getLessonsByCourse(courseId);
    const lessonIds = new Set(lessons.map(l => l.id));
    return Array.from(this.quizResults.values())
      .filter((r) => r.userId === userId && lessonIds.has(r.lessonId))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getCourseRewardsByUser(userId: string): Promise<CourseReward[]> {
    return Array.from(this.courseRewards.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getCourseReward(id: string): Promise<CourseReward | undefined> {
    return this.courseRewards.get(id);
  }

  async getCourseRewardForCourse(userId: string, courseId: string): Promise<CourseReward | undefined> {
    return Array.from(this.courseRewards.values())
      .find((r) => r.userId === userId && r.courseId === courseId);
  }

  async createCourseReward(reward: Omit<CourseReward, "id" | "completedAt">): Promise<CourseReward> {
    const id = randomUUID();
    const courseReward: CourseReward = { ...reward, id, completedAt: new Date() };
    this.courseRewards.set(id, courseReward);
    return courseReward;
  }

  async updateCourseReward(id: string, updates: Partial<CourseReward>): Promise<CourseReward | undefined> {
    const reward = this.courseRewards.get(id);
    if (!reward) return undefined;
    const updated = { ...reward, ...updates };
    this.courseRewards.set(id, updated);
    return updated;
  }

  async getClaimableCourseRewards(userId: string): Promise<CourseReward[]> {
    return Array.from(this.courseRewards.values())
      .filter((r) => r.userId === userId && ["pending", "failed", "confirming"].includes(r.status))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async checkCourseCompletion(userId: string, courseId: string): Promise<{completed: boolean; averageScore: number; lessonsCompleted: number; totalLessons: number}> {
    const lessons = await this.getLessonsByCourse(courseId);
    const quizResults = await this.getQuizResultsForCourse(userId, courseId);
    
    const passedLessons = new Set<string>();
    const scores: number[] = [];
    
    for (const result of quizResults) {
      if (result.passed) {
        passedLessons.add(result.lessonId);
        scores.push(result.score);
      }
    }
    
    const lessonsCompleted = passedLessons.size;
    const totalLessons = lessons.length;
    const completed = lessonsCompleted >= totalLessons;
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    return { completed, averageScore, lessonsCompleted, totalLessons };
  }

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    return Array.from(this.certificates.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  async createCertificate(cert: Omit<Certificate, "id">): Promise<Certificate> {
    const id = randomUUID();
    const certificate: Certificate = { ...cert, id };
    this.certificates.set(id, certificate);
    return certificate;
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate | undefined> {
    const certificate = this.certificates.get(id);
    if (!certificate) return undefined;
    const updated = { ...certificate, ...updates };
    this.certificates.set(id, updated);
    return updated;
  }

  async getCertificateCount(): Promise<number> {
    return this.certificates.size;
  }

  async getUserProgress(userId: string): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter((p) => p.userId === userId);
  }

  async getOrCreateProgress(userId: string, courseId: string): Promise<UserProgress> {
    const existing = Array.from(this.userProgress.values()).find(
      (p) => p.userId === userId && p.courseId === courseId
    );
    if (existing) return existing;

    const id = randomUUID();
    const progress: UserProgress = {
      id,
      userId,
      courseId,
      completedLessons: [],
      startedAt: new Date(),
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  async updateProgress(progressId: string, lessonId: string): Promise<UserProgress> {
    const progress = this.userProgress.get(progressId);
    if (!progress) throw new Error("Progress not found");

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }
    progress.currentLessonId = lessonId;
    return progress;
  }

  async getQAPostsByLesson(lessonId: string): Promise<QAPost[]> {
    return Array.from(this.qaPosts.values())
      .filter((p) => p.lessonId === lessonId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getQAPost(id: string): Promise<QAPost | undefined> {
    return this.qaPosts.get(id);
  }

  async createQAPost(post: InsertQAPost): Promise<QAPost> {
    const id = randomUUID();
    const qaPost: QAPost = {
      ...post,
      id,
      createdAt: new Date(),
      txHash: post.txHash, // Use provided txHash (may be undefined if not posted on-chain)
    };
    this.qaPosts.set(id, qaPost);
    return qaPost;
  }

  async getStats(): Promise<Stats> {
    const totalKas = Array.from(this.users.values()).reduce((sum, u) => sum + u.totalKasEarned, 0);
    return {
      totalKasDistributed: totalKas,
      certificatesMinted: this.certificates.size,
      activeLearners: this.users.size,
      coursesAvailable: this.courses.size,
    };
  }

  async getRecentQuizResults(limit: number): Promise<QuizResult[]> {
    const results = Array.from(this.quizResults.values());
    return results
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, limit);
  }

  async getRecentQAPosts(limit: number): Promise<QAPost[]> {
    const posts = Array.from(this.qaPosts.values());
    return posts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getTopLearners(limit: number): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.totalKasEarned - a.totalKasEarned)
      .slice(0, limit);
  }

  async getTotalQuizResults(): Promise<number> {
    return this.quizResults.size;
  }

  async getAverageScore(): Promise<number> {
    const results = Array.from(this.quizResults.values());
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    return Math.round(totalScore / results.length);
  }

  async getCourseCompletionCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const certificates = Array.from(this.certificates.values());
    for (const cert of certificates) {
      const current = counts.get(cert.courseId) || 0;
      counts.set(cert.courseId, current + 1);
    }
    return counts;
  }

  async getAllQuizResults(): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values());
  }
}

import { DbStorage } from "./db-storage";

export const storage: IStorage = process.env.DATABASE_URL 
  ? new DbStorage() 
  : new MemStorage();
