const { getDatabase } = require('../config/database');

function subscribe(req, res) {
    try {
        const db = getDatabase();
        const { name, email, university } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required.' });
        }

        // Check if already subscribed
        const existing = db.prepare('SELECT id, unsubscribed FROM subscribers WHERE email = ?').get(email.toLowerCase());
        if (existing) {
            if (existing.unsubscribed) {
                // Re-subscribe
                db.prepare('UPDATE subscribers SET unsubscribed = 0, name = ?, university = ? WHERE id = ?')
                    .run(name.trim(), university || null, existing.id);
                return res.json({ message: 'Welcome back! You have been re-subscribed.' });
            }
            return res.json({ message: "You're already subscribed!" });
        }

        db.prepare('INSERT INTO subscribers (name, email, university) VALUES (?, ?, ?)')
            .run(name.trim(), email.toLowerCase().trim(), university || null);

        res.status(201).json({ message: 'Successfully subscribed!' });
    } catch (err) {
        console.error('Subscribe error:', err.message);
        res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
    }
}

function getCount(req, res) {
    try {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE unsubscribed = 0').get();
        res.json({ count: result.count });
    } catch (err) {
        console.error('Subscriber count error:', err.message);
        res.status(500).json({ error: 'Failed to get count.' });
    }
}

module.exports = { subscribe, getCount };
