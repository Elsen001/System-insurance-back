const policiesService = require('./policies.service');
const { z } = require('zod');

const policySchema = z.object({
  type: z.enum(['auto', 'casco', 'property', 'travel']),
  customer_name: z.string().min(2, 'Müştəri adı tələb olunur'),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  start_date: z.string(),
  end_date: z.string(),
  details: z.record(z.any()),
  notes: z.string().optional(),
});

const getAll = async (req, res) => {
  try {
    const policies = await policiesService.getPolicies(req.user);
    res.json({ success: true, policies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const policy = await policiesService.getPolicyById(req.params.id, req.user);
    res.json({ success: true, policy });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const data = policySchema.parse(req.body);
    const policy = await policiesService.createPolicy(data, req.user);
    res.status(201).json({ success: true, policy });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const policy = await policiesService.updatePolicy(req.params.id, req.body);
    res.json({ success: true, policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const result = await policiesService.deletePolicy(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const previewPrice = async (req, res) => {
  try {
    const { type, details } = req.body;
    if (!type || !details) return res.status(400).json({ success: false, message: 'type və details tələb olunur' });
    const result = policiesService.calculatePreview(type, details);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, previewPrice };
