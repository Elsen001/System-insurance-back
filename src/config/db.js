const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'insurance_db',
    charset: 'utf8mb4',
  },
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 10000,
});

module.exports = db;
