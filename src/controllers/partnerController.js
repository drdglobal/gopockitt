const { getDatabase } = require('../config/database');

// Get partner profile
function getProfile(req, res) {
    try {
        const db = getDatabase();
        const partner = db.prepare(
            'SELECT id, business_name, contact_name, email, phone, business_type, address, tier, created_at FROM partners WHERE id = ?'
        ).get(req.user.sub);

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found.' });
        }

        res.json({ partner });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get profile.' });
    }
}

// List partner's deals
function listDeals(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;

        const deals = db.prepare(`
            SELECT d.*,
                (SELECT COUNT(*) FROM claims WHERE deal_id = d.id) as total_claims,
                (SELECT COUNT(*) FROM claims WHERE deal_id = d.id AND status = 'redeemed') as total_redemptions
            FROM deals d
            WHERE d.partner_id = ?
            ORDER BY d.created_at DESC
        `).all(partnerId);

        res.json({ deals });
    } catch (err) {
        console.error('List partner deals error:', err.message);
        res.status(500).json({ error: 'Failed to load deals.' });
    }
}

// Create a new deal
function createDeal(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;
        const {
            title, description, category, location, timeRestriction,
            priceOriginal, priceDeal, discountLabel, badge, emoji, gradient
        } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ error: 'Title, description, and category are required.' });
        }

        // Get partner's business name
        const partner = db.prepare('SELECT business_name FROM partners WHERE id = ?').get(partnerId);
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found.' });
        }

        const result = db.prepare(`
            INSERT INTO deals (partner_id, title, business_name, description, category, location,
                time_restriction, price_original, price_deal, discount_label, badge, emoji, gradient)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            partnerId, title.trim(), partner.business_name, description.trim(),
            category.toLowerCase(), location || null, timeRestriction || null,
            priceOriginal || null, priceDeal || null, discountLabel || null,
            badge || null, emoji || '🎫',
            gradient || 'linear-gradient(135deg, #7B68EE 0%, #4ECDC4 100%)'
        );

        const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json({ deal });
    } catch (err) {
        console.error('Create deal error:', err.message);
        res.status(500).json({ error: 'Failed to create deal.' });
    }
}

// Update a deal
function updateDeal(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;
        const dealId = req.params.id;

        // Verify ownership
        const deal = db.prepare('SELECT * FROM deals WHERE id = ? AND partner_id = ?').get(dealId, partnerId);
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found.' });
        }

        const {
            title, description, category, location, timeRestriction,
            priceOriginal, priceDeal, discountLabel, badge, emoji, gradient
        } = req.body;

        db.prepare(`
            UPDATE deals SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                location = COALESCE(?, location),
                time_restriction = COALESCE(?, time_restriction),
                price_original = COALESCE(?, price_original),
                price_deal = COALESCE(?, price_deal),
                discount_label = COALESCE(?, discount_label),
                badge = COALESCE(?, badge),
                emoji = COALESCE(?, emoji),
                gradient = COALESCE(?, gradient),
                updated_at = datetime('now')
            WHERE id = ? AND partner_id = ?
        `).run(
            title || null, description || null, category || null, location || null,
            timeRestriction || null, priceOriginal || null, priceDeal || null,
            discountLabel || null, badge || null, emoji || null, gradient || null,
            dealId, partnerId
        );

        const updated = db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId);
        res.json({ deal: updated });
    } catch (err) {
        console.error('Update deal error:', err.message);
        res.status(500).json({ error: 'Failed to update deal.' });
    }
}

// Toggle deal status (pause/activate)
function updateDealStatus(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;
        const dealId = req.params.id;
        const { status } = req.body;

        if (!['active', 'paused'].includes(status)) {
            return res.status(400).json({ error: 'Status must be "active" or "paused".' });
        }

        const deal = db.prepare('SELECT * FROM deals WHERE id = ? AND partner_id = ?').get(dealId, partnerId);
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found.' });
        }

        db.prepare("UPDATE deals SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, dealId);

        res.json({ message: `Deal ${status === 'active' ? 'activated' : 'paused'}.`, status });
    } catch (err) {
        console.error('Update deal status error:', err.message);
        res.status(500).json({ error: 'Failed to update deal status.' });
    }
}

// Verify and redeem a student's code
function verifyCode(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required.' });
        }

        const normalizedCode = code.toUpperCase().trim();

        // Look up the claim
        const claim = db.prepare(`
            SELECT c.*, d.title as deal_title, d.partner_id, u.name as student_name
            FROM claims c
            JOIN deals d ON c.deal_id = d.id
            JOIN users u ON c.user_id = u.id
            WHERE c.code = ?
        `).get(normalizedCode);

        if (!claim) {
            return res.json({ valid: false, reason: 'Code not found. Please check and try again.' });
        }

        if (claim.status === 'expired' || new Date(claim.expires_at) < new Date()) {
            // Update status if not already expired
            if (claim.status !== 'expired') {
                db.prepare("UPDATE claims SET status = 'expired' WHERE id = ?").run(claim.id);
            }
            return res.json({ valid: false, reason: 'This code has expired.' });
        }

        if (claim.status === 'redeemed') {
            return res.json({
                valid: false,
                reason: `This code was already redeemed on ${new Date(claim.redeemed_at).toLocaleDateString()}.`
            });
        }

        if (claim.partner_id !== partnerId) {
            return res.json({ valid: false, reason: 'This code is for a different business.' });
        }

        // Redeem the code
        db.prepare(`
            UPDATE claims SET status = 'redeemed', redeemed_at = datetime('now'), redeemed_by_partner_id = ?
            WHERE id = ?
        `).run(partnerId, claim.id);

        res.json({
            valid: true,
            dealTitle: claim.deal_title,
            studentName: claim.student_name.split(' ')[0], // First name only for privacy
            redeemedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Verify code error:', err.message);
        res.status(500).json({ error: 'Failed to verify code.' });
    }
}

// Get partner analytics
function getAnalytics(req, res) {
    try {
        const db = getDatabase();
        const partnerId = req.user.sub;

        // Total claims and redemptions
        const stats = db.prepare(`
            SELECT
                COUNT(*) as total_claims,
                SUM(CASE WHEN c.status = 'redeemed' THEN 1 ELSE 0 END) as total_redemptions,
                SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_claims
            FROM claims c
            JOIN deals d ON c.deal_id = d.id
            WHERE d.partner_id = ?
        `).get(partnerId);

        // Claims by day (last 30 days)
        const dailyClaims = db.prepare(`
            SELECT DATE(c.claimed_at) as date, COUNT(*) as claims,
                   SUM(CASE WHEN c.status = 'redeemed' THEN 1 ELSE 0 END) as redemptions
            FROM claims c
            JOIN deals d ON c.deal_id = d.id
            WHERE d.partner_id = ? AND c.claimed_at >= datetime('now', '-30 days')
            GROUP BY DATE(c.claimed_at)
            ORDER BY date DESC
        `).all(partnerId);

        // Top deals
        const topDeals = db.prepare(`
            SELECT d.title, d.id,
                   COUNT(c.id) as claims,
                   SUM(CASE WHEN c.status = 'redeemed' THEN 1 ELSE 0 END) as redemptions
            FROM deals d
            LEFT JOIN claims c ON c.deal_id = d.id
            WHERE d.partner_id = ?
            GROUP BY d.id
            ORDER BY claims DESC
            LIMIT 5
        `).all(partnerId);

        // Recent activity
        const recentActivity = db.prepare(`
            SELECT c.code, c.status, c.claimed_at, c.redeemed_at,
                   d.title as deal_title, u.name as student_name
            FROM claims c
            JOIN deals d ON c.deal_id = d.id
            JOIN users u ON c.user_id = u.id
            WHERE d.partner_id = ?
            ORDER BY c.claimed_at DESC
            LIMIT 20
        `).all(partnerId);

        res.json({
            stats: {
                totalClaims: stats.total_claims || 0,
                totalRedemptions: stats.total_redemptions || 0,
                activeClaims: stats.active_claims || 0,
                conversionRate: stats.total_claims > 0
                    ? Math.round((stats.total_redemptions / stats.total_claims) * 100)
                    : 0
            },
            dailyClaims,
            topDeals,
            recentActivity
        });
    } catch (err) {
        console.error('Analytics error:', err.message);
        res.status(500).json({ error: 'Failed to load analytics.' });
    }
}

module.exports = { getProfile, listDeals, createDeal, updateDeal, updateDealStatus, verifyCode, getAnalytics };
