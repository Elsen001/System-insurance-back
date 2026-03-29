const express = require('express');
const router = express.Router();
const ctrl = require('./policies.controller');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/role');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/preview-price', ctrl.previewPrice);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
