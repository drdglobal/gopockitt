const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function requireStudent(req, res, next) {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Student access only.' });
    }
    next();
}

function requirePartner(req, res, next) {
    if (req.user.role !== 'partner') {
        return res.status(403).json({ error: 'Partner access only.' });
    }
    next();
}

module.exports = { verifyToken, requireStudent, requirePartner };
