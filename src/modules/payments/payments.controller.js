const paymentsService = require('./payments.service');

const getAll = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      agent_id: req.query.agent_id,
      from: req.query.from,
      to: req.query.to,
    };
    const payments = await paymentsService.getPayments(req.user, filters);
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { status, payment_method } = req.body;
    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Yanlış status' });
    }
    const payment = await paymentsService.updatePaymentStatus(req.params.id, status, payment_method);
    res.json({ success: true, payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await paymentsService.getPaymentStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, updateStatus, getStats };
