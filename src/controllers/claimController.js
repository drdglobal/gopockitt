const { getDatabase } = require('../config/database');
const { generateCode } = require('../utils/codeGenerator');

// Claim a deal
function createClaim(req, res) {
    try {
        const db = getDatabase();
        const userId = req.user.sub;
        const { dealId } = req.body;

        if (!dealId) {
            return res.status(400).json({ error: 'Deal ID is required.' });
        }

        // Check deal exists and is active
        const deal = db.prepare('SELECT * FROM deals WHERE id = ? AND status = ?').get(dealId, 'active');
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found or no longer available.' });
        }

        // Expire stale claims first
        db.prepare("UPDATE claims SET status = 'expired' WHERE expires_at < datetime('now') AND status = 'active'").run();

        // Check if user already has an active or redeemed claim for this deal
        const existingClaim = db.prepare(
            "SELECT * FROM claims WHERE user_id = ? AND deal_id = ? AND status IN ('active', 'redeemed')"
        ).get(userId, dealId);

        if (existingClaim) {
            if (existingClaim.status === 'redeemed') {
                return res.status(409).json({ error: 'You have already redeemed this deal.' });
            }
            // Return existing active claim
            return res.json({
                claim: {
                    id: existingClaim.id,
                    code: existingClaim.code,
                    dealTitle: deal.title,
                    businessName: deal.business_name,
                    expiresAt: existingClaim.expires_at,
                    alreadyClaimed: true
                }
            });
        }

        // Generate unique code
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        // Insert claim
        const result = db.prepare(`
            INSERT INTO claims (user_id, deal_id, code, expires_at)
            VALUES (?, ?, ?, ?)
        `).run(userId, dealId, code, expiresAt);

        // Increment deal claims count (if tracking)
        db.prepare(`UPDATE deals SET updated_at = datetime('now') WHERE id = ?`).run(dealId);

        res.status(201).json({
            claim: {
                id: result.lastInsertRowid,
                code,
                dealTitle: deal.title,
                businessName: deal.business_name,
                expiresAt
            }
        });
    } catch (err) {
        console.error('Claim error:', err.message);
        if (err.message.includes('UNIQUE constraint')) {
            return res.status(409).json({ error: 'You have already claimed this deal.' });
        }
        res.status(500).json({ error: 'Failed to claim deal.' });
    }
}

// Get user's claims
function getMyClaims(req, res) {
    try {
        const db = getDatabase();
        const userId = req.user.sub;

        // Expire stale claims first
        db.prepare("UPDATE claims SET status = 'expired' WHERE expires_at < datetime('now') AND status = 'active'").run();

        const claims = db.prepare(`
            SELECT c.*, d.title as deal_title, d.business_name, d.emoji, d.category, d.location,
                   d.price_original, d.price_deal, d.discount_label
            FROM claims c
            JOIN deals d ON c.deal_id = d.id
            WHERE c.user_id = ?
            ORDER BY c.claimed_at DESC
        `).all(userId);

        res.json({ claims });
    } catch (err) {
        console.error('Get claims error:', err.message);
        res.status(500).json({ error: 'Failed to load your claims.' });
    }
}

module.exports = { createClaim, getMyClaims };
