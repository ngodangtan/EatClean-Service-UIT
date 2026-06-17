/**
 * Mifflin-St Jeor BMR Calculator
 * Male:   10*W + 6.25*H - 5*A + 5
 * Female: 10*W + 6.25*H - 5*A - 161
 */
export function calculateBMR({ weight, height, age, gender }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}
