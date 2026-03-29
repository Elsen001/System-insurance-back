require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  const sql = fs.readFileSync(path.join(__dirname, '003_pricing_rules.sql'), 'utf8');
  await c.query(sql);
  console.log('pricing_rules cedveli yaradildi ve seed data elave edildi');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
