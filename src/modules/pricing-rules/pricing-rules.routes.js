const express = require('express');
const router = express.Router();
const ctrl = require('./pricing-rules.controller');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/role');

router.use(authenticate);

router.get('/', ctrl.getAll);                    // admin + agent görə bilər
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);
router.post('/preview', ctrl.preview);           // qiymət preview

module.exports = router;
