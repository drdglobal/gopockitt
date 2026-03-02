const express = require('express');
const router = express.Router();
const dealController = require('../controllers/dealController');

router.get('/', dealController.listDeals);
router.get('/:id', dealController.getDeal);

module.exports = router;
