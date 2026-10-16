const MEDICAL_SYNONYMS = {
  sugar: ['glucose', 'sugar', 'hba1c', 'diabetes', 'fasting blood sugar'],
  diabetes: ['glucose', 'sugar', 'hba1c', 'diabetes'],
  glucose: ['glucose', 'sugar', 'hba1c', 'diabetes'],
  hba1c: ['hba1c', 'glycosylated hemoglobin', 'glycated hemoglobin', 'glucose'],
  cbc: ['cbc', 'complete blood count', 'hemogram'],
  hemogram: ['cbc', 'complete blood count', 'hemogram'],
  'blood count': ['cbc', 'complete blood count'],
  lft: ['lft', 'liver function', 'liver', 'bilirubin', 'sgot', 'sgpt'],
  liver: ['liver', 'lft', 'bilirubin', 'sgot', 'sgpt', 'hepatic'],
  kft: ['kft', 'kidney function', 'kidney', 'creatinine', 'urea', 'renal'],
  kidney: ['kidney', 'kft', 'creatinine', 'urea', 'renal'],
  renal: ['renal', 'kidney', 'kft', 'creatinine'],
  creatinine: ['creatinine', 'kft', 'kidney'],
  thyroid: ['thyroid', 'tsh', 't3', 't4'],
  tsh: ['tsh', 'thyroid'],
  lipid: ['lipid', 'cholesterol', 'triglyceride', 'hdl', 'ldl'],
  cholesterol: ['cholesterol', 'lipid', 'triglyceride', 'hdl', 'ldl'],
  vitamin: ['vitamin', 'b12', 'd3', 'hydroxy vitamin', 'cobalamin'],
  b12: ['vitamin b12', 'b12', 'cobalamin'],
  d3: ['vitamin d', 'd3', 'calciferol'],
  urine: ['urine routine', 'urine', 'urinalysis'],
  urinalysis: ['urinalysis', 'urine'],
  xray: ['x-ray', 'xray'],
  'x-ray': ['x-ray', 'xray'],
  ultrasound: ['ultrasound', 'usg', 'sonography'],
  usg: ['ultrasound', 'usg', 'sonography'],
  sonography: ['ultrasound', 'usg', 'sonography'],
  mri: ['mri', 'magnetic resonance'],
  ct: ['ct scan', 'cect', 'hrct'],
  'ct scan': ['ct scan', 'cect', 'hrct'],
  doppler: ['doppler', 'color doppler'],
  cardiology: ['cardiology', 'ecg', 'echo', 'troponin'],
  dengue: ['dengue', 'ns1'],
  malaria: ['malaria', 'smear'],
  typhoid: ['typhoid', 'widal']
};

export function expandLabSearchTerms(query) {
  if (!query || typeof query !== 'string') return [];
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  // Stop words that shouldn't expand on their own
  const stopWords = new Set(['test', 'tests', 'check', 'profile', 'panel', 'blood', 'lab', 'labs', 'for', 'and', 'or', 'in', 'the', 'with']);

  const termSet = new Set();
  // Clean raw phrase
  const normalizedPhrase = clean.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalizedPhrase) {
    termSet.add(normalizedPhrase);
  }

  // Check multi-word phrase matching directly
  if (MEDICAL_SYNONYMS[normalizedPhrase]) {
    MEDICAL_SYNONYMS[normalizedPhrase].forEach(s => termSet.add(s));
  }

  // Tokenize by spaces and punctuation
  const tokens = normalizedPhrase.split(/[\s,+/&|_-]+/).map(t => t.replace(/[^\w]/g, '').trim()).filter(t => t.length >= 2);
  for (const token of tokens) {
    if (!stopWords.has(token)) {
      termSet.add(token);
    }
    if (MEDICAL_SYNONYMS[token]) {
      MEDICAL_SYNONYMS[token].forEach(s => termSet.add(s));
    }
  }

  return Array.from(termSet).filter(t => t && t.length >= 2);
}
