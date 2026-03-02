const express = require('express');
const router = express.Router();
const { generalLimiter } = require('../middleware/rateLimiter');
const subscriberController = require('../controllers/subscriberController');

router.post('/', generalLimiter, subscriberController.subscribe);

module.exports = router;
