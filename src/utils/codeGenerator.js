const { getDatabase } = require('../config/database');

// Characters that can't be confused: no 0/O, 1/I/L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode() {
    const db = getDatabase();
    let code;
    let attempts = 0;

    do {
        code = 'PKT-';
        for (let i = 0; i < 4; i++) {
            code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        attempts++;
        if (attempts > 100) {
            throw new Error('Unable to generate unique code after 100 attempts');
        }
    } while (db.prepare('SELECT 1 FROM claims WHERE code = ?').get(code));

    return code;
}

module.exports = { generateCode };
