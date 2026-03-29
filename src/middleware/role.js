const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Autentifikasiya tələb olunur' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bu əməliyyat üçün icazəniz yoxdur' });
    }
    next();
  };
};

const requireAdmin = requireRole('admin');
const requireAgent = requireRole('admin', 'agent');

module.exports = { requireRole, requireAdmin, requireAgent };
