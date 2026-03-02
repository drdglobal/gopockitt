const express = require('express');
const router = express.Router();
const { verifyToken, requireStudent } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// Student auth
router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/me', verifyToken, requireStudent, authController.getMe);

// Partner auth
router.post('/partner/register', registerLimiter, authController.partnerRegister);
router.post('/partner/login', authLimiter, authController.partnerLogin);

module.exports = router;
