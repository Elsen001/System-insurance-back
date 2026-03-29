const express = require('express');
const router = express.Router();
const ctrl = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/role');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/stats', requireAdmin, ctrl.getStats);
router.put('/:id/status', requireAdmin, ctrl.updateStatus);

module.exports = router;
