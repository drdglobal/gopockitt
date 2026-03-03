require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase } = require('./src/config/database');

const authRoutes = require('./src/routes/auth');
const dealRoutes = require('./src/routes/deals');
const claimRoutes = require('./src/routes/claims');
const partnerRoutes = require('./src/routes/partners');
const subscriberRoutes = require('./src/routes/subscribers');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDatabase();

// Auto-seed if database is empty (first deploy)
const dealCount = db.prepare('SELECT COUNT(*) as count FROM deals').get();
if (dealCount.count === 0) {
    console.log('Empty database detected — running seed...');
    require('./src/scripts/seed');
    console.log('Seed complete!');
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/subscribers', subscriberRoutes);

// Fallback: serve index.html for any non-API, non-file route
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Periodic cleanup: expire stale claims every hour
setInterval(() => {
    try {
        db.prepare("UPDATE claims SET status = 'expired' WHERE expires_at < datetime('now') AND status = 'active'").run();
    } catch (err) {
        console.error('Claim cleanup error:', err.message);
    }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`GoPockitt server running on http://localhost:${PORT}`);
});

module.exports = app;
