const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { error: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const claimLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: 'Too many claims. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { authLimiter, registerLimiter, claimLimiter, generalLimiter };
