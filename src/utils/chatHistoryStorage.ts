/**
 * IndexedDB-based chat history storage
 * Persists conversation memory across browser sessions
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  ticker?: string;
  metadata?: Record<string, any>;
}

interface ChatSession {
  sessionId: string;
  ticker: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'StockExAI';
const DB_VERSION = 1;
const STORE_NAME = 'chatSessions';

class ChatHistoryStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
          store.createIndex('ticker', 'ticker', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  async saveSession(session: ChatSession): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = store.put(session);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const request = store.get(sessionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getSessionsByTicker(ticker: string): Promise<ChatSession[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const index = store.index('ticker');
      const request = index.getAll(ticker);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push(message);
    session.updatedAt = Date.now();
    await this.saveSession(session);
  }

  async createSession(ticker: string): Promise<string> {
    const sessionId = `session-${ticker}-${Date.now()}`;
    const session: ChatSession = {
      sessionId,
      ticker,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveSession(session);
    return sessionId;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);
      const request = store.delete(sessionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getRecentSessions(limit: number = 10): Promise<ChatSession[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const results: ChatSession[] = [];
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }
}

export const chatHistoryStorage = new ChatHistoryStorage();
export type { ChatMessage, ChatSession };
