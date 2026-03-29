const db = require('../../config/db');

const updateOverduePayments = async () => {
  const today = new Date().toISOString().split('T')[0];
  await db('payments')
    .where('status', 'pending')
    .where('due_date', '<', today)
    .update({ status: 'overdue' });
};

const getPayments = async (user, filters = {}) => {
  await updateOverduePayments();

  let query = db('payments')
    .join('policies', 'payments.policy_id', 'policies.id')
    .join('users', 'policies.agent_id', 'users.id')
    .select(
      'payments.*',
      'policies.policy_number',
      'policies.type as policy_type',
      'policies.customer_name',
      'users.name as agent_name',
      'users.id as agent_id'
    )
    .orderBy('payments.due_date', 'asc');

  if (user.role === 'agent') {
    query = query.where('policies.agent_id', user.id);
  }

  if (filters.status) query = query.where('payments.status', filters.status);
  if (filters.agent_id && user.role === 'admin') query = query.where('policies.agent_id', filters.agent_id);
  if (filters.from) query = query.where('payments.due_date', '>=', filters.from);
  if (filters.to) query = query.where('payments.due_date', '<=', filters.to);

  return query;
};

const updatePaymentStatus = async (id, status, payment_method) => {
  const payment = await db('payments').where({ id }).first();
  if (!payment) throw new Error('Ödəniş tapılmadı');

  const update = { status };
  if (status === 'paid') {
    update.paid_at = new Date();
    if (payment_method) update.payment_method = payment_method;
    // Komissiyanı da ödənilmiş kimi işarələ
    await db('commissions').where({ policy_id: payment.policy_id }).update({ status: 'paid', paid_at: new Date() });
  }

  await db('payments').where({ id }).update(update);
  return db('payments').where({ id }).first();
};

const getPaymentStats = async () => {
  await updateOverduePayments();
  const stats = await db('payments')
    .select('status')
    .count('* as count')
    .sum('amount as total')
    .groupBy('status');
  return stats;
};

module.exports = { getPayments, updatePaymentStatus, getPaymentStats, updateOverduePayments };
