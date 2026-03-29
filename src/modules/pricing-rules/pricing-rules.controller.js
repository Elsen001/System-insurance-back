const service = require('./pricing-rules.service');
const { z } = require('zod');

const ruleSchema = z.object({
  name: z.string().min(2, 'Ad tələb olunur'),
  description: z.string().optional(),
  policy_type: z.enum(['auto', 'casco', 'property', 'travel', 'all']),
  condition_field: z.string().optional().nullable(),
  condition_operator: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']).optional().nullable(),
  condition_value: z.number().optional().nullable(),
  bonus_percent: z.number().min(-100).max(200),
});

const getAll = async (req, res) => {
  try {
    const rules = await service.getAll();
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const data = ruleSchema.parse(req.body);
    const rule = await service.create(data, req.user.id);
    res.status(201).json({ success: true, rule });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const rule = await service.update(req.params.id, req.body);
    res.json({ success: true, rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await service.remove(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Canlı preview — qaydalar tətbiq olunmuş qiymət
const preview = async (req, res) => {
  try {
    const { type, details } = req.body;
    const { calculate } = require('../policies/pricing.engine');
    const { applyRules } = require('./pricing-rules.service');
    const basePrice = calculate(type, details);
    const { totalBonus, applied } = await applyRules(type, details);
    const finalPrice = basePrice * (1 + totalBonus / 100);
    res.json({
      success: true,
      base_price: Math.round(basePrice * 100) / 100,
      bonus_percent: totalBonus,
      final_price: Math.round(finalPrice * 100) / 100,
      applied_rules: applied,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, create, update, remove, preview };
