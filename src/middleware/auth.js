const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token təqdim edilməyib' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db('users')
      .where({ id: decoded.id, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ success: false, message: 'İstifadəçi tapılmadı və ya deaktiv edilib' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, commission_rate: user.commission_rate };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token müddəti bitib' });
    }
    return res.status(401).json({ success: false, message: 'Yanlış token' });
  }
};

module.exports = { authenticate };
