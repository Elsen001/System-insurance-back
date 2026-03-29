const currentYear = new Date().getFullYear();

// Avtomobil (MTPL - İcbari) sığortası
const calculateAuto = (details) => {
  const BASE_PRICE = 150; // AZN
  const carAge = currentYear - parseInt(details.year);

  const ageMultiplier = carAge > 15 ? 1.4 : carAge > 10 ? 1.25 : carAge > 5 ? 1.1 : 1.0;

  const engineMultiplier =
    details.engine_volume <= 1.2 ? 0.8 :
    details.engine_volume <= 1.8 ? 1.0 :
    details.engine_volume <= 2.5 ? 1.3 :
    details.engine_volume <= 3.5 ? 1.6 : 2.0;

  let premium = BASE_PRICE * ageMultiplier * engineMultiplier;

  // 10 ildən köhnə avtomobil üçün +15% əlavə
  if (carAge > 10) premium *= 1.15;

  return Math.round(premium * 100) / 100;
};

// Kasko sığortası
const calculateCasco = (details) => {
  const carAge = currentYear - parseInt(details.year);
  const carValue = parseFloat(details.car_value);

  // Yaşa görə faiz
  const ratePercent =
    carAge <= 2 ? 1.5 :
    carAge <= 5 ? 2.0 :
    carAge <= 10 ? 2.5 : 3.0;

  // Sürücü sayı üçün +3% hər əlavə sürücüyə
  const driverCount = parseInt(details.driver_count) || 1;
  const driverMultiplier = 1 + (Math.max(0, driverCount - 1) * 0.03);

  const premium = carValue * (ratePercent / 100) * driverMultiplier;
  return Math.round(premium * 100) / 100;
};

// Əmlak sığortası
const calculateProperty = (details) => {
  const BASE_RATE_PER_M2 = 2.5; // AZN/m²
  const area = parseFloat(details.area);
  const propertyValue = parseFloat(details.property_value);

  const regionMultiplier =
    details.region === 'baku' ? 1.5 :
    details.region === 'sumgait' ? 1.2 :
    details.region === 'ganja' ? 1.1 : 1.0;

  const typeMultiplier =
    details.building_type === 'apartment' ? 1.0 :
    details.building_type === 'house' ? 1.2 :
    details.building_type === 'commercial' ? 1.5 : 1.0;

  // İki hesablamadan böyüyünü al: sahə əsasında vs dəyər əsasında
  const byArea = area * BASE_RATE_PER_M2 * regionMultiplier * typeMultiplier;
  const byValue = propertyValue * 0.003 * regionMultiplier;

  const premium = Math.max(byArea, byValue);
  return Math.round(premium * 100) / 100;
};

// Səfər sığortası
const calculateTravel = (details) => {
  const BASE_PER_DAY_PER_PERSON = 3.5; // AZN
  const start = new Date(details.start_date);
  const end = new Date(details.end_date);
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const persons = parseInt(details.persons_count) || 1;

  const countryMultiplier =
    details.destination_zone === 'europe' ? 1.8 :
    details.destination_zone === 'usa_canada' ? 2.5 :
    details.destination_zone === 'asia' ? 1.3 :
    details.destination_zone === 'cis' ? 0.8 : 1.0;

  const coverageMultiplier =
    details.coverage_type === 'basic' ? 1.0 :
    details.coverage_type === 'standard' ? 1.4 :
    details.coverage_type === 'premium' ? 2.0 : 1.0;

  const premium = days * persons * BASE_PER_DAY_PER_PERSON * countryMultiplier * coverageMultiplier;
  return Math.round(premium * 100) / 100;
};

const calculate = (type, details) => {
  switch (type) {
    case 'auto': return calculateAuto(details);
    case 'casco': return calculateCasco(details);
    case 'property': return calculateProperty(details);
    case 'travel': return calculateTravel(details);
    default: throw new Error('Naməlum sığorta növü');
  }
};

// DB qaydaları ilə hesablama (async)
const calculateWithRules = async (type, details) => {
  const basePrice = calculate(type, details);
  try {
    const { applyRules } = require('../pricing-rules/pricing-rules.service');
    const { totalBonus, applied } = await applyRules(type, details);
    if (totalBonus === 0) return { premium: basePrice, base_price: basePrice, bonus_percent: 0, applied_rules: [] };
    const finalPrice = Math.round(basePrice * (1 + totalBonus / 100) * 100) / 100;
    return { premium: finalPrice, base_price: basePrice, bonus_percent: totalBonus, applied_rules: applied };
  } catch {
    return { premium: basePrice, base_price: basePrice, bonus_percent: 0, applied_rules: [] };
  }
};

const calculateCommission = (premiumAmount, commissionRate) => {
  return Math.round(premiumAmount * (commissionRate / 100) * 100) / 100;
};

module.exports = { calculate, calculateWithRules, calculateCommission };
