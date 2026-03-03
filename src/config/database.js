const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDatabase() {
    // Use DATA_DIR env var (for Railway volume mount) or default to local data/ folder
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');

    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory: ${dataDir}`);
    }

    const dbPath = path.join(dataDir, 'gopockitt.db');
    console.log(`Database path: ${dbPath}`);
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            university TEXT,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            verification_expires TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS partners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone TEXT,
            business_type TEXT,
            address TEXT,
            tier TEXT DEFAULT 'starter',
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS deals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            business_name TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT,
            time_restriction TEXT,
            price_original TEXT,
            price_deal TEXT,
            discount_label TEXT,
            badge TEXT,
            emoji TEXT DEFAULT '🎫',
            gradient TEXT,
            rating REAL DEFAULT 4.5,
            max_claims_per_day INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (partner_id) REFERENCES partners(id)
        );

        CREATE TABLE IF NOT EXISTS claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            deal_id INTEGER NOT NULL,
            code TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'active',
            claimed_at TEXT DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            redeemed_at TEXT,
            redeemed_by_partner_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (deal_id) REFERENCES deals(id)
        );

        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            university TEXT,
            subscribed_at TEXT DEFAULT (datetime('now')),
            unsubscribed INTEGER DEFAULT 0
        );
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
        CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
        CREATE INDEX IF NOT EXISTS idx_claims_code ON claims(code);
        CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);
        CREATE INDEX IF NOT EXISTS idx_claims_deal ON claims(deal_id);
        CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
    `);

    console.log('Database initialized successfully');
    return db;
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

module.exports = { initDatabase, getDatabase };
