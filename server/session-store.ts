/**
 * Session Store for Kaspa University
 * 
 * Provides an abstraction layer for session storage that supports:
 * - In-memory storage (default, single instance)
 * - Redis storage (for multi-instance deployments)
 * 
 * This enables horizontal scaling when Redis is configured.
 */

interface SessionData {
  walletAddress: string;
  verifiedAt: number;
  expiresAt: number;
}

interface ChallengeData {
  challenge: string;
  timestamp: number;
  expiresAt: number;
  walletAddress: string;
}

interface QuizSessionData {
  sessionId: string;
  lessonId: string;
  walletAddress: string;
  questionHashes: string[];
  startTime: number;
  expiresAt: number;
}

interface SessionStoreConfig {
  redisUrl?: string;
  prefix?: string;
}

interface ISessionStore {
  setSession(token: string, data: SessionData): Promise<void>;
  getSession(token: string): Promise<SessionData | null>;
  deleteSession(token: string): Promise<void>;
  
  setChallenge(challenge: string, data: ChallengeData): Promise<void>;
  getChallenge(challenge: string): Promise<ChallengeData | null>;
  deleteChallenge(challenge: string): Promise<void>;
  
  setQuizSession(key: string, data: QuizSessionData): Promise<void>;
  getQuizSession(key: string): Promise<QuizSessionData | null>;
  deleteQuizSession(key: string): Promise<void>;
  
  cleanup(): Promise<number>;
  getStats(): Promise<{ sessions: number; challenges: number; quizSessions: number }>;
}

class MemorySessionStore implements ISessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private challenges: Map<string, ChallengeData> = new Map();
  private quizSessions: Map<string, QuizSessionData> = new Map();

  async setSession(token: string, data: SessionData): Promise<void> {
    this.sessions.set(token, data);
  }

  async getSession(token: string): Promise<SessionData | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async setChallenge(challenge: string, data: ChallengeData): Promise<void> {
    this.challenges.set(challenge, data);
  }

  async getChallenge(challenge: string): Promise<ChallengeData | null> {
    const challengeData = this.challenges.get(challenge);
    if (!challengeData) return null;
    if (Date.now() > challengeData.expiresAt) {
      this.challenges.delete(challenge);
      return null;
    }
    return challengeData;
  }

  async deleteChallenge(challenge: string): Promise<void> {
    this.challenges.delete(challenge);
  }

  async setQuizSession(key: string, data: QuizSessionData): Promise<void> {
    this.quizSessions.set(key, data);
  }

  async getQuizSession(key: string): Promise<QuizSessionData | null> {
    const session = this.quizSessions.get(key);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.quizSessions.delete(key);
      return null;
    }
    return session;
  }

  async deleteQuizSession(key: string): Promise<void> {
    this.quizSessions.delete(key);
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, session] of Array.from(this.sessions.entries())) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
        cleaned++;
      }
    }

    for (const [key, challenge] of Array.from(this.challenges.entries())) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(key);
        cleaned++;
      }
    }

    for (const [key, session] of Array.from(this.quizSessions.entries())) {
      if (now > session.expiresAt) {
        this.quizSessions.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  async getStats(): Promise<{ sessions: number; challenges: number; quizSessions: number }> {
    return {
      sessions: this.sessions.size,
      challenges: this.challenges.size,
      quizSessions: this.quizSessions.size,
    };
  }
}

class RedisSessionStore implements ISessionStore {
  private redisUrl: string;
  private prefix: string;
  private client: any = null;

  constructor(redisUrl: string, prefix: string = "ku:") {
    this.redisUrl = redisUrl;
    this.prefix = prefix;
  }

  private async getClient(): Promise<any> {
    if (this.client) return this.client;
    
    try {
      // @ts-ignore - redis module may not be installed
      const redis = await import("redis");
      this.client = (redis as any).createClient({ url: this.redisUrl });
      await this.client.connect();
      console.log("[SessionStore] Connected to Redis");
      return this.client;
    } catch (error: any) {
      console.error("[SessionStore] Redis connection failed:", error.message);
      throw error;
    }
  }

  async setSession(token: string, data: SessionData): Promise<void> {
    const client = await this.getClient();
    const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);
    await client.set(`${this.prefix}session:${token}`, JSON.stringify(data), { EX: ttl });
  }

  async getSession(token: string): Promise<SessionData | null> {
    const client = await this.getClient();
    const data = await client.get(`${this.prefix}session:${token}`);
    if (!data) return null;
    const session = JSON.parse(data);
    if (Date.now() > session.expiresAt) return null;
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.prefix}session:${token}`);
  }

  async setChallenge(challenge: string, data: ChallengeData): Promise<void> {
    const client = await this.getClient();
    const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);
    await client.set(`${this.prefix}challenge:${challenge}`, JSON.stringify(data), { EX: ttl });
  }

  async getChallenge(challenge: string): Promise<ChallengeData | null> {
    const client = await this.getClient();
    const data = await client.get(`${this.prefix}challenge:${challenge}`);
    if (!data) return null;
    const challengeData = JSON.parse(data);
    if (Date.now() > challengeData.expiresAt) return null;
    return challengeData;
  }

  async deleteChallenge(challenge: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.prefix}challenge:${challenge}`);
  }

  async setQuizSession(key: string, data: QuizSessionData): Promise<void> {
    const client = await this.getClient();
    const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);
    await client.set(`${this.prefix}quiz:${key}`, JSON.stringify(data), { EX: ttl });
  }

  async getQuizSession(key: string): Promise<QuizSessionData | null> {
    const client = await this.getClient();
    const data = await client.get(`${this.prefix}quiz:${key}`);
    if (!data) return null;
    const session = JSON.parse(data);
    if (Date.now() > session.expiresAt) return null;
    return session;
  }

  async deleteQuizSession(key: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`${this.prefix}quiz:${key}`);
  }

  async cleanup(): Promise<number> {
    return 0;
  }

  async getStats(): Promise<{ sessions: number; challenges: number; quizSessions: number }> {
    const client = await this.getClient();
    const sessionKeys = await client.keys(`${this.prefix}session:*`);
    const challengeKeys = await client.keys(`${this.prefix}challenge:*`);
    const quizKeys = await client.keys(`${this.prefix}quiz:*`);
    
    return {
      sessions: sessionKeys.length,
      challenges: challengeKeys.length,
      quizSessions: quizKeys.length,
    };
  }
}

let sessionStoreInstance: ISessionStore | null = null;

export async function getSessionStore(): Promise<ISessionStore> {
  if (sessionStoreInstance) return sessionStoreInstance;

  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      sessionStoreInstance = new RedisSessionStore(redisUrl);
      console.log("[SessionStore] Using Redis storage for sessions");
    } catch (error) {
      console.log("[SessionStore] Redis not available, falling back to memory");
      sessionStoreInstance = new MemorySessionStore();
    }
  } else {
    console.log("[SessionStore] Using in-memory session storage");
    sessionStoreInstance = new MemorySessionStore();
  }

  setInterval(async () => {
    try {
      const cleaned = await sessionStoreInstance!.cleanup();
      if (cleaned > 0) {
        console.log(`[SessionStore] Cleaned up ${cleaned} expired entries`);
      }
    } catch (error) {
    }
  }, 60 * 1000);

  return sessionStoreInstance;
}

export { ISessionStore, SessionData, ChallengeData, QuizSessionData };
