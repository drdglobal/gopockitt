const express = require('express');
const router = express.Router();
const { verifyToken, requireStudent } = require('../middleware/auth');
const { claimLimiter } = require('../middleware/rateLimiter');
const claimController = require('../controllers/claimController');

router.post('/', verifyToken, requireStudent, claimLimiter, claimController.createClaim);
router.get('/my', verifyToken, requireStudent, claimController.getMyClaims);

module.exports = router;
