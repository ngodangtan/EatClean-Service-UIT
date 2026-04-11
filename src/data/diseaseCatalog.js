/**
 * Disease catalog — lists available diseases with Vietnamese display names
 * and their related health indicators for user selection in health profiles.
 */

const DISEASE_CATALOG = [
  {
    key: 'diabetes',
    name: 'Tiểu đường',
    relatedIndicators: [
      { name: 'Đường huyết lúc đói (Fasting Glucose)', unit: 'mg/dL', normalRange: '70 - 100' },
      { name: 'HbA1c', unit: '%', normalRange: '< 5.7' },
      { name: 'Insulin lúc đói (Fasting Insulin)', unit: 'µU/mL', normalRange: '2.6 - 24.9' }
    ]
  },
  {
    key: 'kidney-disease',
    name: 'Bệnh thận',
    relatedIndicators: [
      { name: 'Creatinine', unit: 'mg/dL', normalRange: '0.7 - 1.3' },
      { name: 'BUN (Blood Urea Nitrogen)', unit: 'mg/dL', normalRange: '7 - 20' },
      { name: 'GFR (Mức lọc cầu thận)', unit: 'mL/min', normalRange: '> 90' },
      { name: 'Albumin niệu (Urine Albumin)', unit: 'mg/L', normalRange: '< 30' }
    ]
  },
  {
    key: 'high-uric-acid',
    name: 'Acid uric cao / Gout',
    relatedIndicators: [
      { name: 'Acid uric máu', unit: 'mg/dL', normalRange: '3.5 - 7.2 (nam), 2.6 - 6.0 (nữ)' },
      { name: 'CRP (C-Reactive Protein)', unit: 'mg/L', normalRange: '< 3' }
    ]
  },
  {
    key: 'hypertension',
    name: 'Tăng huyết áp',
    relatedIndicators: [
      { name: 'Huyết áp tâm thu (Systolic BP)', unit: 'mmHg', normalRange: '< 120' },
      { name: 'Huyết áp tâm trương (Diastolic BP)', unit: 'mmHg', normalRange: '< 80' },
      { name: 'Nhịp tim (Heart Rate)', unit: 'bpm', normalRange: '60 - 100' }
    ]
  },
  {
    key: 'fatty-liver',
    name: 'Gan nhiễm mỡ',
    relatedIndicators: [
      { name: 'ALT (SGPT)', unit: 'U/L', normalRange: '7 - 56' },
      { name: 'AST (SGOT)', unit: 'U/L', normalRange: '10 - 40' },
      { name: 'GGT (Gamma-GT)', unit: 'U/L', normalRange: '9 - 48' },
      { name: 'Triglycerides', unit: 'mg/dL', normalRange: '< 150' }
    ]
  },
  {
    key: 'high-cholesterol',
    name: 'Mỡ máu cao',
    relatedIndicators: [
      { name: 'Cholesterol toàn phần', unit: 'mg/dL', normalRange: '< 200' },
      { name: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '< 100' },
      { name: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '> 40 (nam), > 50 (nữ)' },
      { name: 'Triglycerides', unit: 'mg/dL', normalRange: '< 150' }
    ]
  },
  {
    key: 'heart-disease',
    name: 'Bệnh tim mạch',
    relatedIndicators: [
      { name: 'Cholesterol toàn phần', unit: 'mg/dL', normalRange: '< 200' },
      { name: 'Huyết áp tâm thu', unit: 'mmHg', normalRange: '< 120' },
      { name: 'Nhịp tim (Heart Rate)', unit: 'bpm', normalRange: '60 - 100' },
      { name: 'Troponin', unit: 'ng/mL', normalRange: '< 0.04' }
    ]
  },
  {
    key: 'obesity',
    name: 'Béo phì',
    relatedIndicators: [
      { name: 'BMI (Chỉ số khối cơ thể)', unit: 'kg/m²', normalRange: '18.5 - 24.9' },
      { name: 'Vòng eo', unit: 'cm', normalRange: '< 90 (nam), < 80 (nữ)' },
      { name: 'Tỷ lệ mỡ cơ thể', unit: '%', normalRange: '10-20 (nam), 18-28 (nữ)' }
    ]
  },
  {
    key: 'anemia',
    name: 'Thiếu máu',
    relatedIndicators: [
      { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.5-17.5 (nam), 12-16 (nữ)' },
      { name: 'Ferritin', unit: 'ng/mL', normalRange: '12 - 300 (nam), 12 - 150 (nữ)' },
      { name: 'Sắt huyết thanh (Serum Iron)', unit: 'µg/dL', normalRange: '60 - 170' }
    ]
  },
  {
    key: 'gastritis',
    name: 'Viêm dạ dày',
    relatedIndicators: [
      { name: 'H. pylori test', unit: '', normalRange: 'Âm tính' },
      { name: 'Pepsinogen I/II ratio', unit: '', normalRange: '> 3' }
    ]
  }
];

export default DISEASE_CATALOG;
