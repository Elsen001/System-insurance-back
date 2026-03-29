-- Qiymət bonus/endirim qaydaları cədvəli
USE insurance_db;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  policy_type ENUM('auto', 'casco', 'property', 'travel', 'all') NOT NULL DEFAULT 'all',
  condition_field VARCHAR(100),
  condition_operator ENUM('gt', 'lt', 'gte', 'lte', 'eq') DEFAULT NULL,
  condition_value DECIMAL(10,2) DEFAULT NULL,
  bonus_percent DECIMAL(6,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Nümunə qaydalar
INSERT INTO pricing_rules (name, description, policy_type, condition_field, condition_operator, condition_value, bonus_percent, is_active) VALUES
('Köhnə avtomobil artımı', '15 ildən köhnə avtomobillər üçün +20% artım', 'auto', 'year', 'lt', 2010, 20.00, FALSE),
('Böyük motor artımı', 'Motor həcmi 3.0L-dən böyük avtomobillər +25%', 'auto', 'engine_volume', 'gt', 3.0, 25.00, FALSE),
('Yeni avtomobil endirimi', '3 ildən yeni avtomobillər üçün -10% endirim', 'casco', 'year', 'gte', 2022, -10.00, FALSE);
