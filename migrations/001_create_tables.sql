-- insurance_db verilənlər bazası migration
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS insurance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE insurance_db;

-- İstifadəçilər cədvəli
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent') NOT NULL DEFAULT 'agent',
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sığortalar cədvəli
CREATE TABLE IF NOT EXISTS policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  type ENUM('auto', 'casco', 'property', 'travel') NOT NULL,
  policy_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  premium_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Sığorta detalları cədvəli (hər növ üçün fərqli JSON məlumat)
CREATE TABLE IF NOT EXISTS policy_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT NOT NULL UNIQUE,
  details JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- Ödənişlər cədvəli
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  policy_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMP NULL,
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- Komissiyalar cədvəli
CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  policy_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE
);

-- İndekslər
CREATE INDEX idx_policies_agent_id ON policies(agent_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_type ON policies(type);
CREATE INDEX idx_payments_policy_id ON payments(policy_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_commissions_agent_id ON commissions(agent_id);
