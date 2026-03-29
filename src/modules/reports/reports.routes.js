const express = require('express');
const router = express.Router();
const ctrl = require('./reports.controller');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/role');

router.use(authenticate, requireAdmin);

router.get('/summary', ctrl.getSummary);
router.get('/agent/:id', ctrl.getAgentReport);
router.get('/export', ctrl.exportData);

module.exports = router;
