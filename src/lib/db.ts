import fs from 'fs';
import path from 'path';

export interface DocumentRecord {
  id: string;
  filename: string;
  filetype: 'pdf' | 'docx';
  filesize: number;
  total_pages: number;
  total_words: number;
  raw_text: string;
  pages_json: string;
  clauses_json: string;
  created_at: string;
  status: 'processing' | 'ready' | 'error';
  error_message?: string | null;
}

export interface MessageRecord {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  quotes_json: string;
  coverage_json: string;
  agent_steps_json: string;
  created_at: string;
}

export interface ChatRecord {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonRecord {
  id: string;
  doc_a_id: string;
  doc_b_id: string;
  summary: string;
  diffs_json: string;
  created_at: string;
}

// Global cache for MongoDB connection across serverless invocations
declare global {
  var _mongoClientPromise: Promise<any> | undefined;
}

class DatabaseManager {
  private db: any = null;
  private isPostgres = false;
  private isMongo = false;
  private pgPool: any = null;
  private mongoDb: any = null;
  private mongoInitPromise: Promise<void> | null = null;
  private initialized = false;

  private ensureInit() {
    if (this.initialized) return;

    // 1. Check for MongoDB Atlas URI (Highest priority for serverless cloud persistence)
    const mongoUrl = process.env.MONGODB_URI || (process.env.DATABASE_URL?.startsWith('mongodb') ? process.env.DATABASE_URL : null);
    if (mongoUrl) {
      this.isMongo = true;
      if (!this.mongoInitPromise) {
        this.mongoInitPromise = (async () => {
          try {
            const { MongoClient } = require('mongodb');
            if (!global._mongoClientPromise) {
              const client = new MongoClient(mongoUrl, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
              });
              global._mongoClientPromise = client.connect();
            }
            const client = await global._mongoClientPromise;
            let dbName = 'veritas_legal_ai';
            try {
              const parsed = new URL(mongoUrl);
              const pathPart = parsed.pathname.replace(/^\//, '');
              if (pathPart) dbName = pathPart;
            } catch {}
            this.mongoDb = client.db(dbName);
            // Ensure essential indexes in background
            this.mongoDb.collection('documents').createIndex({ id: 1 }, { unique: true }).catch(() => {});
            this.mongoDb.collection('documents').createIndex({ created_at: -1 }).catch(() => {});
            this.mongoDb.collection('chats').createIndex({ document_id: 1, updated_at: -1 }).catch(() => {});
            this.mongoDb.collection('messages').createIndex({ chat_id: 1, created_at: 1 }).catch(() => {});
            this.initialized = true;
          } catch (err) {
            console.error('Failed to initialize MongoDB Atlas, falling back:', err);
            this.isMongo = false;
          }
        })();
      }
      return;
    }

    // 2. Check for PostgreSQL connection
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
      try {
        const { Pool } = require('pg');
        this.pgPool = new Pool({ connectionString: dbUrl });
        this.isPostgres = true;
        this.initPostgresSchema();
        this.initialized = true;
        return;
      } catch (err) {
        console.warn('Failed to connect to PostgreSQL, falling back to local SQLite:', err);
      }
    }

    // 3. Local SQLite fallback (with WAL mode & busy timeout)
    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
    const dataDir = isServerless ? '/tmp' : path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }
    const dbPath = path.join(dataDir, 'contracts.db');

    // On serverless cold starts, copy pre-seeded DB from source directory if available
    if (isServerless && !fs.existsSync(dbPath)) {
      const sourceDb = path.join(process.cwd(), 'data', 'contracts.db');
      if (fs.existsSync(sourceDb)) {
        try { fs.copyFileSync(sourceDb, dbPath); } catch (e) {
          console.warn('Could not copy initial seed DB to /tmp:', e);
        }
      }
    }

    try {
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(dbPath);
      try {
        this.db.exec('PRAGMA journal_mode = WAL;');
        this.db.exec('PRAGMA busy_timeout = 5000;');
      } catch {}

      this.initSqliteSchema();
      this.initialized = true;
    } catch (e) {
      console.error('Failed to initialize node:sqlite:', e);
    }
  }

  private async ensureReady() {
    this.ensureInit();
    if (this.mongoInitPromise) {
      await this.mongoInitPromise;
    }
  }

  private initSqliteSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filetype TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        total_pages INTEGER NOT NULL,
        total_words INTEGER NOT NULL,
        raw_text TEXT NOT NULL,
        pages_json TEXT NOT NULL,
        clauses_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        quotes_json TEXT NOT NULL,
        coverage_json TEXT NOT NULL,
        agent_steps_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comparisons (
        id TEXT PRIMARY KEY,
        doc_a_id TEXT NOT NULL,
        doc_b_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        diffs_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  private async initPostgresSchema() {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filetype TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        total_pages INTEGER NOT NULL,
        total_words INTEGER NOT NULL,
        raw_text TEXT NOT NULL,
        pages_json TEXT NOT NULL,
        clauses_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        quotes_json TEXT NOT NULL,
        coverage_json TEXT NOT NULL,
        agent_steps_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comparisons (
        id TEXT PRIMARY KEY,
        doc_a_id TEXT NOT NULL,
        doc_b_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        diffs_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  // --- Document Operations ---
  public async saveDocument(doc: DocumentRecord): Promise<void> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      await this.mongoDb.collection('documents').updateOne(
        { id: doc.id },
        { $set: { ...doc, _id: doc.id } },
        { upsert: true }
      );
      return;
    }

    if (this.isPostgres) {
      await this.pgPool.query(
        `INSERT INTO documents (id, filename, filetype, filesize, total_pages, total_words, raw_text, pages_json, clauses_json, created_at, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
          filename = EXCLUDED.filename,
          raw_text = EXCLUDED.raw_text,
          pages_json = EXCLUDED.pages_json,
          clauses_json = EXCLUDED.clauses_json,
          status = EXCLUDED.status,
          error_message = EXCLUDED.error_message`,
        [doc.id, doc.filename, doc.filetype, doc.filesize, doc.total_pages, doc.total_words, doc.raw_text, doc.pages_json, doc.clauses_json, doc.created_at, doc.status, doc.error_message || null]
      );
      return;
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents 
      (id, filename, filetype, filesize, total_pages, total_words, raw_text, pages_json, clauses_json, created_at, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.filename, doc.filetype, doc.filesize, doc.total_pages, doc.total_words, doc.raw_text, doc.pages_json, doc.clauses_json, doc.created_at, doc.status, doc.error_message || null);
  }

  public async getDocument(id: string): Promise<DocumentRecord | null> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const doc = await this.mongoDb.collection('documents').findOne({ id });
      if (!doc) return null;
      const { _id, ...rest } = doc;
      return rest as DocumentRecord;
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM documents WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
    const row = stmt.get(id);
    return (row as DocumentRecord) || null;
  }

  public async listDocuments(): Promise<Omit<DocumentRecord, 'raw_text' | 'pages_json'>[]> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const docs = await this.mongoDb.collection('documents')
        .find({}, { projection: { raw_text: 0, pages_json: 0 } })
        .sort({ created_at: -1 })
        .toArray();
      return docs.map(({ _id, ...rest }: any) => rest);
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query(
        'SELECT id, filename, filetype, filesize, total_pages, total_words, clauses_json, created_at, status, error_message FROM documents ORDER BY created_at DESC'
      );
      return res.rows;
    }
    const stmt = this.db.prepare(
      'SELECT id, filename, filetype, filesize, total_pages, total_words, clauses_json, created_at, status, error_message FROM documents ORDER BY created_at DESC'
    );
    return stmt.all() as any[];
  }

  public async deleteDocument(id: string): Promise<void> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      await this.mongoDb.collection('documents').deleteOne({ id });
      await this.mongoDb.collection('chats').deleteMany({ document_id: id });
      return;
    }

    if (this.isPostgres) {
      await this.pgPool.query('DELETE FROM documents WHERE id = $1', [id]);
      await this.pgPool.query('DELETE FROM chats WHERE document_id = $1', [id]);
      return;
    }
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM chats WHERE document_id = ?').run(id);
  }

  // --- Chat & Messages ---
  public async getOrCreateChat(documentId: string, title = 'New Conversation'): Promise<ChatRecord> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const chatsCol = this.mongoDb.collection('chats');
      const existing = await chatsCol.findOne({ document_id: documentId }, { sort: { updated_at: -1 } });
      if (existing) {
        const { _id, ...rest } = existing;
        return rest as ChatRecord;
      }
      const newChat: ChatRecord = {
        id: 'chat_' + Math.random().toString(36).substring(2, 11),
        document_id: documentId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await chatsCol.insertOne({ ...newChat, _id: newChat.id });
      return newChat;
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM chats WHERE document_id = $1 ORDER BY updated_at DESC LIMIT 1', [documentId]);
      if (res.rows[0]) return res.rows[0];

      const newChat: ChatRecord = {
        id: 'chat_' + Math.random().toString(36).substring(2, 11),
        document_id: documentId,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await this.pgPool.query(
        'INSERT INTO chats (id, document_id, title, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [newChat.id, newChat.document_id, newChat.title, newChat.created_at, newChat.updated_at]
      );
      return newChat;
    }

    const existing = this.db.prepare('SELECT * FROM chats WHERE document_id = ? ORDER BY updated_at DESC LIMIT 1').get(documentId);
    if (existing) return existing as ChatRecord;

    const newChat: ChatRecord = {
      id: 'chat_' + Math.random().toString(36).substring(2, 11),
      document_id: documentId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.prepare('INSERT INTO chats (id, document_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      newChat.id,
      newChat.document_id,
      newChat.title,
      newChat.created_at,
      newChat.updated_at
    );
    return newChat;
  }

  public async getChat(chatId: string): Promise<ChatRecord | null> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const chat = await this.mongoDb.collection('chats').findOne({ id: chatId });
      if (!chat) return null;
      const { _id, ...rest } = chat;
      return rest as ChatRecord;
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM chats WHERE id = $1', [chatId]);
      return res.rows[0] || null;
    }
    const row = this.db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
    return (row as ChatRecord) || null;
  }

  public async listChatsForDoc(documentId: string): Promise<ChatRecord[]> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const chats = await this.mongoDb.collection('chats')
        .find({ document_id: documentId })
        .sort({ updated_at: -1 })
        .toArray();
      return chats.map(({ _id, ...rest }: any) => rest as ChatRecord);
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM chats WHERE document_id = $1 ORDER BY updated_at DESC', [documentId]);
      return res.rows;
    }
    return this.db.prepare('SELECT * FROM chats WHERE document_id = ? ORDER BY updated_at DESC').all(documentId) as ChatRecord[];
  }

  public async saveMessage(msg: MessageRecord): Promise<void> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      await this.mongoDb.collection('messages').updateOne(
        { id: msg.id },
        { $set: { ...msg, _id: msg.id } },
        { upsert: true }
      );
      await this.mongoDb.collection('chats').updateOne(
        { id: msg.chat_id },
        { $set: { updated_at: new Date().toISOString() } }
      );
      return;
    }

    if (this.isPostgres) {
      await this.pgPool.query(
        `INSERT INTO messages (id, chat_id, role, content, quotes_json, coverage_json, agent_steps_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, quotes_json = EXCLUDED.quotes_json, coverage_json = EXCLUDED.coverage_json, agent_steps_json = EXCLUDED.agent_steps_json`,
        [msg.id, msg.chat_id, msg.role, msg.content, msg.quotes_json, msg.coverage_json, msg.agent_steps_json, msg.created_at]
      );
      await this.pgPool.query('UPDATE chats SET updated_at = $1 WHERE id = $2', [new Date().toISOString(), msg.chat_id]);
      return;
    }

    this.db.prepare(`
      INSERT OR REPLACE INTO messages
      (id, chat_id, role, content, quotes_json, coverage_json, agent_steps_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(msg.id, msg.chat_id, msg.role, msg.content, msg.quotes_json, msg.coverage_json, msg.agent_steps_json, msg.created_at);

    this.db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), msg.chat_id);
  }

  public async getMessages(chatId: string): Promise<MessageRecord[]> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const messages = await this.mongoDb.collection('messages')
        .find({ chat_id: chatId })
        .sort({ created_at: 1 })
        .toArray();
      return messages.map(({ _id, ...rest }: any) => rest as MessageRecord);
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
      return res.rows;
    }
    return this.db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC').all(chatId) as MessageRecord[];
  }

  public async deleteChat(chatId: string): Promise<void> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      await this.mongoDb.collection('messages').deleteMany({ chat_id: chatId });
      await this.mongoDb.collection('chats').deleteOne({ id: chatId });
      return;
    }

    if (this.isPostgres) {
      await this.pgPool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);
      await this.pgPool.query('DELETE FROM chats WHERE id = $1', [chatId]);
      return;
    }
    this.db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
    this.db.prepare('DELETE FROM chats WHERE id = ?').run(chatId);
  }

  // --- Comparison Records ---
  public async saveComparison(comp: ComparisonRecord): Promise<void> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      await this.mongoDb.collection('comparisons').updateOne(
        { id: comp.id },
        { $set: { ...comp, _id: comp.id } },
        { upsert: true }
      );
      return;
    }

    if (this.isPostgres) {
      await this.pgPool.query(
        `INSERT INTO comparisons (id, doc_a_id, doc_b_id, summary, diffs_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary, diffs_json = EXCLUDED.diffs_json`,
        [comp.id, comp.doc_a_id, comp.doc_b_id, comp.summary, comp.diffs_json, comp.created_at]
      );
      return;
    }
    this.db.prepare(`
      INSERT OR REPLACE INTO comparisons (id, doc_a_id, doc_b_id, summary, diffs_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(comp.id, comp.doc_a_id, comp.doc_b_id, comp.summary, comp.diffs_json, comp.created_at);
  }

  public async getComparison(id: string): Promise<ComparisonRecord | null> {
    await this.ensureReady();

    if (this.isMongo && this.mongoDb) {
      const comp = await this.mongoDb.collection('comparisons').findOne({ id });
      if (!comp) return null;
      const { _id, ...rest } = comp;
      return rest as ComparisonRecord;
    }

    if (this.isPostgres) {
      const res = await this.pgPool.query('SELECT * FROM comparisons WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const row = this.db.prepare('SELECT * FROM comparisons WHERE id = ?').get(id);
    return (row as ComparisonRecord) || null;
  }
}

export const db = new DatabaseManager();
