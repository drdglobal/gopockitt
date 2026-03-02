const express = require('express');
const router = express.Router();
const { verifyToken, requirePartner } = require('../middleware/auth');
const partnerController = require('../controllers/partnerController');

// All partner routes require authentication
router.get('/me', verifyToken, requirePartner, partnerController.getProfile);
router.get('/deals', verifyToken, requirePartner, partnerController.listDeals);
router.post('/deals', verifyToken, requirePartner, partnerController.createDeal);
router.put('/deals/:id', verifyToken, requirePartner, partnerController.updateDeal);
router.patch('/deals/:id/status', verifyToken, requirePartner, partnerController.updateDealStatus);
router.post('/verify-code', verifyToken, requirePartner, partnerController.verifyCode);
router.get('/analytics', verifyToken, requirePartner, partnerController.getAnalytics);

module.exports = router;
