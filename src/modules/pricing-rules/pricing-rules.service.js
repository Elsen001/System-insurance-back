const db = require('../../config/db');

const getAll = async () => {
  return db('pricing_rules')
    .leftJoin('users', 'pricing_rules.created_by', 'users.id')
    .select('pricing_rules.*', 'users.name as created_by_name')
    .orderBy('pricing_rules.created_at', 'desc');
};

const getActive = async (policyType) => {
  return db('pricing_rules')
    .where('is_active', true)
    .where(function () {
      this.where('policy_type', policyType).orWhere('policy_type', 'all');
    });
};

const create = async (data, adminId) => {
  const { name, description, policy_type, condition_field, condition_operator, condition_value, bonus_percent } = data;
  const [id] = await db('pricing_rules').insert({
    name, description, policy_type,
    condition_field: condition_field || null,
    condition_operator: condition_operator || null,
    condition_value: condition_value !== undefined ? condition_value : null,
    bonus_percent,
    is_active: true,
    created_by: adminId,
  });
  return db('pricing_rules').where({ id }).first();
};

const update = async (id, data) => {
  const { name, description, policy_type, condition_field, condition_operator, condition_value, bonus_percent, is_active } = data;
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (policy_type !== undefined) update.policy_type = policy_type;
  if (condition_field !== undefined) update.condition_field = condition_field;
  if (condition_operator !== undefined) update.condition_operator = condition_operator;
  if (condition_value !== undefined) update.condition_value = condition_value;
  if (bonus_percent !== undefined) update.bonus_percent = bonus_percent;
  if (is_active !== undefined) update.is_active = is_active;
  await db('pricing_rules').where({ id }).update(update);
  return db('pricing_rules').where({ id }).first();
};

const remove = async (id) => {
  await db('pricing_rules').where({ id }).delete();
  return { message: 'Qayda silindi' };
};

// Qaydaları verilən detallara tətbiq et — əlavə bonus faizini qaytarır
const applyRules = async (policyType, details) => {
  const rules = await getActive(policyType);
  let totalBonus = 0;
  const applied = [];

  for (const rule of rules) {
    if (!rule.condition_field) {
      // Şərtsiz qayda — həmişə tətbiq olunur
      totalBonus += parseFloat(rule.bonus_percent);
      applied.push({ name: rule.name, bonus: rule.bonus_percent });
      continue;
    }

    const fieldValue = parseFloat(details[rule.condition_field]);
    if (isNaN(fieldValue)) continue;

    const condVal = parseFloat(rule.condition_value);
    let matches = false;

    switch (rule.condition_operator) {
      case 'gt':  matches = fieldValue > condVal; break;
      case 'lt':  matches = fieldValue < condVal; break;
      case 'gte': matches = fieldValue >= condVal; break;
      case 'lte': matches = fieldValue <= condVal; break;
      case 'eq':  matches = fieldValue === condVal; break;
    }

    if (matches) {
      totalBonus += parseFloat(rule.bonus_percent);
      applied.push({ name: rule.name, bonus: rule.bonus_percent });
    }
  }

  return { totalBonus, applied };
};

module.exports = { getAll, getActive, create, update, remove, applyRules };
