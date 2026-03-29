const authService = require('./auth.service');
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Düzgün email daxil edin'),
  password: z.string().min(1, 'Şifrə tələb olunur'),
});

const login = async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(401).json({ success: false, message: err.message });
  }
};

const logout = (req, res) => {
  res.json({ success: true, message: 'Çıxış edildi' });
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

const getAgents = async (req, res) => {
  try {
    const agents = await authService.getAgents();
    res.json({ success: true, agents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createAgent = async (req, res) => {
  try {
    const agentSchema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      commission_rate: z.number().min(0).max(100).optional(),
    });
    const data = agentSchema.parse(req.body);
    const agent = await authService.createAgent(data);
    res.status(201).json({ success: true, agent });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, message: err.errors[0].message });
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateAgent = async (req, res) => {
  try {
    const agent = await authService.updateAgent(req.params.id, req.body);
    res.json({ success: true, agent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { login, logout, getMe, getAgents, createAgent, updateAgent };
