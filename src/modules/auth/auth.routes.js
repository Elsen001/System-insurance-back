const express = require('express');
const router = express.Router();
const ctrl = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/role');

router.post('/login', ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);

// Agent idarəetməsi (yalnız admin)
router.get('/agents', authenticate, requireAdmin, ctrl.getAgents);
router.post('/agents', authenticate, requireAdmin, ctrl.createAgent);
router.put('/agents/:id', authenticate, requireAdmin, ctrl.updateAgent);

module.exports = router;
