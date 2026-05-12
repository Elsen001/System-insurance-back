-- Pricing rules üçün effective_from əlavə edilir
-- Bu tarixdən sonra yaradılan sığortalara tətbiq olunur
-- NULL olarsa həmişə tətbiq olunur (geriyə uyğunluq üçün)
USE insurance_db;

ALTER TABLE pricing_rules ADD COLUMN effective_from TIMESTAMP NULL DEFAULT NULL AFTER is_active;
