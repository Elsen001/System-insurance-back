const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const login = async (email, password) => {
  const user = await db('users').where({ email }).first();
  if (!user) throw new Error('Email və ya şifrə yanlışdır');
  if (!user.is_active) throw new Error('Hesabınız deaktiv edilib');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Email və ya şifrə yanlışdır');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      commission_rate: user.commission_rate,
    },
  };
};

const getMe = async (userId) => {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new Error('İstifadəçi tapılmadı');
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

const getAgents = async () => {
  return db('users').where({ role: 'agent', is_active: true }).select('id', 'name', 'email', 'commission_rate', 'created_at');
};

const createAgent = async (data) => {
  const { name, email, password, commission_rate } = data;
  const exists = await db('users').where({ email }).first();
  if (exists) throw new Error('Bu email artıq istifadə olunur');
  const hashed = await bcrypt.hash(password, 10);
  const [id] = await db('users').insert({ name, email, password: hashed, role: 'agent', commission_rate: commission_rate || 10 });
  return { id, name, email, role: 'agent', commission_rate: commission_rate || 10 };
};

const updateAgent = async (id, data) => {
  const { name, commission_rate, is_active, password } = data;
  const update = {};
  if (name) update.name = name;
  if (commission_rate !== undefined) update.commission_rate = commission_rate;
  if (is_active !== undefined) update.is_active = is_active;
  if (password) update.password = await bcrypt.hash(password, 10);
  await db('users').where({ id }).update(update);
  return getMe(id);
};

module.exports = { login, getMe, getAgents, createAgent, updateAgent };
