const { getDatabase } = require('../config/database');

// List all active deals (with optional category filter)
function listDeals(req, res) {
    try {
        const db = getDatabase();
        const { category, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT * FROM deals WHERE status = ?';
        const params = ['active'];

        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category.toLowerCase());
        }

        if (search) {
            query += ' AND (title LIKE ? OR business_name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const deals = db.prepare(query).all(...params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM deals WHERE status = ?';
        const countParams = ['active'];
        if (category && category !== 'all') {
            countQuery += ' AND category = ?';
            countParams.push(category.toLowerCase());
        }
        const { total } = db.prepare(countQuery).get(...countParams);

        res.json({
            deals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('List deals error:', err.message);
        res.status(500).json({ error: 'Failed to load deals.' });
    }
}

// Get single deal by ID
function getDeal(req, res) {
    try {
        const db = getDatabase();
        const deal = db.prepare('SELECT * FROM deals WHERE id = ? AND status = ?').get(req.params.id, 'active');

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found.' });
        }

        // Get claim count
        const { count } = db.prepare('SELECT COUNT(*) as count FROM claims WHERE deal_id = ?').get(deal.id);
        deal.totalClaims = count;

        res.json({ deal });
    } catch (err) {
        console.error('Get deal error:', err.message);
        res.status(500).json({ error: 'Failed to load deal.' });
    }
}

module.exports = { listDeals, getDeal };
