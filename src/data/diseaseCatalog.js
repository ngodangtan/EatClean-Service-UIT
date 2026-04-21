/**
 * Disease catalog — lists available diseases with Vietnamese display names
 * and their related health indicators for user selection in health profiles.
 *
 * Field conventions:
 * - `key`             — stable, language-independent identifier (snake/kebab-case English).
 *                       This is what HealthProfile stores. Never rename without a migration.
 * - `name`            — Vietnamese display name. Safe to edit.
 * - `supported`       — true if the disease engine adjusts macros and filters ingredients
 *                       for this disease. Diseases with supported=false can still be
 *                       recorded by the user, but the AI meal generation will ignore them.
 * - `indicators[].key`  — stable identifier for cross-referencing user-entered values.
 * - `indicators[].name` — Vietnamese display name. Safe to edit.
 * - `generationLimits`  — optional array of conditions that block AI meal plan generation
 *                         when met. Each entry:
 *                           source    — 'entry' (default) checks a direct field on the
 *                                       disease entry (e.g. stage); 'indicator' looks up
 *                                       the numeric value from entry.indicators[] by key.
 *                           field     — field name (source='entry') or indicator key
 *                                       (source='indicator') to evaluate.
 *                           operator  — comparison: 'gte'|'gt'|'lte'|'lt'|'eq'|'neq'
 *                           value     — numeric threshold to compare against
 *                           reason    — machine-readable reason code in the API response
 *                           messageVi — Vietnamese error message. Use {fieldName} to
 *                                       interpolate: direct-entry fields from the entry
 *                                       object; indicator field resolves to its numeric value.
 *
 * To add a generation limit for a new disease, add a `generationLimits` array to its
 * catalog entry — no service or controller code changes required.
 */

const DISEASE_CATALOG = [
  {
    key: 'diabetes',
    name: 'Tiểu đường',
    supported: true,
    relatedIndicators: [
      { key: 'fasting_glucose', name: 'Đường huyết lúc đói', unit: 'mg/dL', normalRange: '70 - 100' },
      { key: 'hba1c', name: 'HbA1c', unit: '%', normalRange: '< 5.7' },
      { key: 'fasting_insulin', name: 'Insulin lúc đói', unit: 'µU/mL', normalRange: '2.6 - 24.9' }
    ]
  },
  {
    key: 'kidney-disease',
    name: 'Bệnh thận',
    supported: true,
    generationLimits: [
      {
        // Explicit CKD stage entered by the user
        source: 'entry',
        field: 'stage',
        operator: 'gte',
        value: 4,
        reason: 'kidney_disease_stage_restriction',
        messageVi: 'Bệnh thận mạn giai đoạn {stage} yêu cầu chế độ ăn được kê đơn bởi bác sĩ chuyên khoa. Hệ thống không thể tạo thực đơn tự động cho trường hợp này.'
      },
      {
        // GFR < 30 mL/min corresponds to CKD stage 4+ (GFR 15–29 = stage 4, < 15 = stage 5)
        source: 'indicator',
        field: 'gfr',
        operator: 'lt',
        value: 30,
        reason: 'kidney_disease_stage_restriction',
        messageVi: 'Chỉ số GFR {gfr} mL/min tương ứng với bệnh thận mạn giai đoạn 4 trở lên. Trường hợp này yêu cầu chế độ ăn được kê đơn bởi bác sĩ chuyên khoa thận. Hệ thống không thể tạo thực đơn tự động.'
      }
    ],
    relatedIndicators: [
      { key: 'creatinine', name: 'Creatinine', unit: 'mg/dL', normalRange: '0.7 - 1.3' },
      { key: 'bun', name: 'BUN (Ure máu)', unit: 'mg/dL', normalRange: '7 - 20' },
      { key: 'gfr', name: 'GFR (Mức lọc cầu thận)', unit: 'mL/min', normalRange: '> 90' },
      { key: 'urine_albumin', name: 'Albumin niệu', unit: 'mg/L', normalRange: '< 30' }
    ]
  },
  {
    key: 'high-uric-acid',
    name: 'Acid uric cao / Gout',
    supported: true,
    relatedIndicators: [
      { key: 'serum_uric_acid', name: 'Acid uric máu', unit: 'mg/dL', normalRange: '3.5 - 7.2 (nam), 2.6 - 6.0 (nữ)' },
      { key: 'crp', name: 'CRP (Protein phản ứng C)', unit: 'mg/L', normalRange: '< 3' }
    ]
  },
  {
    key: 'hypertension',
    name: 'Tăng huyết áp',
    supported: true,
    relatedIndicators: [
      { key: 'systolic_bp', name: 'Huyết áp tâm thu', unit: 'mmHg', normalRange: '< 120' },
      { key: 'diastolic_bp', name: 'Huyết áp tâm trương', unit: 'mmHg', normalRange: '< 80' },
      { key: 'heart_rate', name: 'Nhịp tim', unit: 'bpm', normalRange: '60 - 100' }
    ]
  },
  {
    key: 'fatty-liver',
    name: 'Gan nhiễm mỡ',
    supported: false,
    relatedIndicators: [
      { key: 'alt', name: 'ALT (SGPT)', unit: 'U/L', normalRange: '7 - 56' },
      { key: 'ast', name: 'AST (SGOT)', unit: 'U/L', normalRange: '10 - 40' },
      { key: 'ggt', name: 'GGT (Gamma-GT)', unit: 'U/L', normalRange: '9 - 48' },
      { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', normalRange: '< 150' }
    ]
  },
  {
    key: 'high-cholesterol',
    name: 'Mỡ máu cao',
    supported: false,
    relatedIndicators: [
      { key: 'total_cholesterol', name: 'Cholesterol toàn phần', unit: 'mg/dL', normalRange: '< 200' },
      { key: 'ldl', name: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '< 100' },
      { key: 'hdl', name: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '> 40 (nam), > 50 (nữ)' },
      { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', normalRange: '< 150' }
    ]
  },
  {
    key: 'heart-disease',
    name: 'Bệnh tim mạch',
    supported: false,
    relatedIndicators: [
      { key: 'total_cholesterol', name: 'Cholesterol toàn phần', unit: 'mg/dL', normalRange: '< 200' },
      { key: 'systolic_bp', name: 'Huyết áp tâm thu', unit: 'mmHg', normalRange: '< 120' },
      { key: 'heart_rate', name: 'Nhịp tim', unit: 'bpm', normalRange: '60 - 100' },
      { key: 'troponin', name: 'Troponin', unit: 'ng/mL', normalRange: '< 0.04' }
    ]
  },
  {
    key: 'obesity',
    name: 'Béo phì',
    supported: false,
    relatedIndicators: [
      { key: 'bmi', name: 'BMI (Chỉ số khối cơ thể)', unit: 'kg/m²', normalRange: '18.5 - 24.9' },
      { key: 'waist_circumference', name: 'Vòng eo', unit: 'cm', normalRange: '< 90 (nam), < 80 (nữ)' },
      { key: 'body_fat_pct', name: 'Tỷ lệ mỡ cơ thể', unit: '%', normalRange: '10-20 (nam), 18-28 (nữ)' }
    ]
  },
  {
    key: 'anemia',
    name: 'Thiếu máu',
    supported: false,
    relatedIndicators: [
      { key: 'hemoglobin', name: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.5-17.5 (nam), 12-16 (nữ)' },
      { key: 'ferritin', name: 'Ferritin', unit: 'ng/mL', normalRange: '12 - 300 (nam), 12 - 150 (nữ)' },
      { key: 'serum_iron', name: 'Sắt huyết thanh', unit: 'µg/dL', normalRange: '60 - 170' }
    ]
  },
  {
    key: 'gastritis',
    name: 'Viêm dạ dày',
    supported: false,
    relatedIndicators: [
      { key: 'h_pylori', name: 'H. pylori test', unit: '', normalRange: 'Âm tính' },
      { key: 'pepsinogen_ratio', name: 'Pepsinogen I/II ratio', unit: '', normalRange: '> 3' }
    ]
  }
];

/**
 * Build a lookup map: { [diseaseKey]: { ...disease, indicatorKeys: Set } }
 * Used by validators and the disease engine adapter.
 */
const DISEASE_INDEX = new Map(
  DISEASE_CATALOG.map(d => [
    d.key,
    {
      ...d,
      indicatorKeySet: new Set(d.relatedIndicators.map(i => i.key)),
      indicatorByKey: new Map(d.relatedIndicators.map(i => [i.key, i]))
    }
  ])
);

/**
 * @returns {object|undefined} catalog entry for a disease key, or undefined if unknown
 */
export function getDiseaseByKey(diseaseKey) {
  return DISEASE_INDEX.get(diseaseKey);
}

/**
 * @returns {boolean} true if the disease engine adjusts macros for this disease
 */
export function isSupportedDisease(diseaseKey) {
  const entry = DISEASE_INDEX.get(diseaseKey);
  return Boolean(entry && entry.supported);
}

/**
 * @returns {string[]} all valid disease keys (supported and unsupported)
 */
export function getAllDiseaseKeys() {
  return DISEASE_CATALOG.map(d => d.key);
}

export default DISEASE_CATALOG;
