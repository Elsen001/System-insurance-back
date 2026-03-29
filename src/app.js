require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const authRoutes = require('./modules/auth/auth.routes');
const policiesRoutes = require('./modules/policies/policies.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const pricingRulesRoutes = require('./modules/pricing-rules/pricing-rules.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sağlamlıq yoxlaması
app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date() });
  } catch {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Route-lar
app.use('/api/auth', authRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/pricing-rules', pricingRulesRoutes);

// Xəta handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server xətası baş verdi' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tapılmadı' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server işə düşdü: http://localhost:${PORT}`);
  console.log(`📊 Sağlamlıq yoxlaması: http://localhost:${PORT}/health`);
  console.log(`🔧 Mühit: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
