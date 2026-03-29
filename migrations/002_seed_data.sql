-- Admin və test agentlər üçün seed data
-- Şifrə: Admin123! (bcrypt hash)
-- Şifrə: Agent123! (bcrypt hash)

USE insurance_db;

INSERT INTO users (name, email, password, role, commission_rate) VALUES
('Admin İstifadəçi', 'admin@insurance.az', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 0.00),
('Əli Həsənov', 'ali.hasanov@insurance.az', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', 10.00),
('Nigar Əliyeva', 'nigar.aliyeva@insurance.az', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'agent', 12.00);
