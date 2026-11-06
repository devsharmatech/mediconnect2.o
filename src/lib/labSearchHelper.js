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
  'vitamin d': ['vitamin d', 'd3', 'calciferol', '25-hydroxy', 'cholecalciferol'],
  'vitamin d3': ['vitamin d', 'd3', 'calciferol', '25-hydroxy', 'cholecalciferol'],
  'vit d': ['vitamin d', 'd3', 'calciferol'],
  'vitamin b12': ['vitamin b12', 'b12', 'cobalamin', 'cyanocobalamin'],
  'vit b12': ['vitamin b12', 'b12', 'cobalamin'],
  vitamin: ['vitamin'],
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
  let matchedMultiWord = false;
  if (MEDICAL_SYNONYMS[normalizedPhrase]) {
    MEDICAL_SYNONYMS[normalizedPhrase].forEach(s => termSet.add(s));
    matchedMultiWord = true;
  }

  // Tokenize by spaces and punctuation only if no exact multi-word synonym match
  if (!matchedMultiWord) {
    const tokens = normalizedPhrase.split(/[\s,+/&|_-]+/).map(t => t.replace(/[^\w]/g, '').trim()).filter(t => t.length >= 2);
    for (const token of tokens) {
      if (!stopWords.has(token)) {
        termSet.add(token);
      }
      if (MEDICAL_SYNONYMS[token]) {
        MEDICAL_SYNONYMS[token].forEach(s => termSet.add(s));
      }
    }
  }

  // Cross-contamination guards (e.g. searching Vitamin D must never return Vitamin B12)
  const result = Array.from(termSet).filter(t => t && t.length >= 2);
  const isVitaminDQuery = /\b(vitamin\s*d|vit\s*d|d3)\b/i.test(normalizedPhrase);
  if (isVitaminDQuery) {
    return result.filter(t => !['b12', 'cobalamin', 'cyanocobalamin'].includes(t.toLowerCase()));
  }

  return result;
}

/**
 * Determines whether a test requires a Lab Visit ('lab') or supports Home Collection ('home' / 'both').
 */
export function resolveTestCollectionType(test) {
  if (!test) return 'lab';
  const raw = String(test.collection_type || '').trim().toLowerCase();
  if (raw === 'home' || raw === 'both') return raw;

  const name = (test.test_name || '').toLowerCase();
  const spec = (test.specimen_type || '').toLowerCase();
  const cat = (test.category?.name || test.category_name || '').toLowerCase();

  // Radiology, Imaging, Cardiology procedures -> strictly Lab Visit
  if (
    cat.includes('radiology') ||
    cat.includes('x-ray') ||
    cat.includes('ultrasound') ||
    cat.includes('doppler') ||
    cat.includes('mri') ||
    cat.includes('ct') ||
    cat.includes('cardiology') ||
    /\b(x-ray|xray|ultrasound|usg|sonography|doppler|ct scan|hrct|cect|ncct|mri|mrcp|angiography|mammography|mammogram|dexa|bone densitometry|bmd|ecg|ekg|echo|echocardiography|tmt|holter|eeg|emg|ncv|bera|pft|spirometry|uroflowmetry|endoscopy|colonoscopy|bronchoscopy|barium|ivp|mcu|rgu|hsg|fistulogram|sinogram|lopogram|fluoroscopy|pet scan|scintigraphy|oae)\b/i.test(name)
  ) {
    return 'lab';
  }

  // Primary blood/serum/urine specimens (even if alternate prenatal fluid is listed after comma)
  if (/^(whole blood|edta|serum|plasma|citrate|fluoride|24 hr urine|spot urine|random urine|urine|stool)\b/i.test(spec.trim()) && !/\b(fluid|csf|bone marrow|biopsy|tissue|ffpe|ihc)\b/i.test(name)) {
    return 'home';
  }

  // Surgical / Invasive / Hospital specimens -> strictly Lab Visit
  if (
    /\b(tissue|ffpe|formalin|biopsy|block|slides|fnac|bone marrow|csf|cerebrospinal|synovial|pleural|ascitic|peritoneal|pericardial|amniotic|bronchoalveolar|bal|aspirate|pus|calculi|stone|isolate|semen|seminal|cervical swab|vaginal swab|urethral|pap smear|lbc|skin scraping|nail clipping|plucked hair|arterial blood|abg)\b/i.test(spec + ' ' + name)
  ) {
    return 'lab';
  }

  // If specimen is null and not a known blood/urine/pathology test -> Lab Visit
  if (
    !spec &&
    !/\b(blood|serum|urine|stool|vitamin|thyroid|lipid|glucose|hb|cbc|hemoglobin|liver|kidney|renal|iron|calcium|testosterone|insulin|hba1c|cholesterol|triglycerides|crp|esr|dengue|malaria|typhoid|widals|hiv|hbsag|hcv|vdrl|lh|fsh|prolactin|psa|tsh|t3|t4|electrolytes|urea|creatinine|uric acid|bilirubin|sgot|sgpt|alkaline phosphatase|albumin|protein|amylase|lipase)\b/i.test(name)
  ) {
    return 'lab';
  }

  return 'home';
}

/**
 * Identifies whether a test row is a multi-parameter Health Package / Checkup Profile.
 */
export function isHealthPackage(test) {
  if (!test) return false;
  if (test.is_package === true) return true;
  const code = String(test.test_code || '').trim().toUpperCase();
  if (code.startsWith('PKG')) return true;
  const dept = String(test.department || '').trim().toLowerCase();
  if (dept === 'health packages' || dept === 'packages') return true;
  return false;
}

/**
 * Extracts the array of included test names for a Health Package from its remarks/details.
 */
export function extractPackageTests(test) {
  if (!test || !test.remarks) return [];
  const raw = String(test.remarks).replace(/^Includes:\s*/i, '').trim();
  if (!raw) return [];
  return raw
    .split(/\s*,\s*/)
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Resolves a clean clinical department/type category for filtering and card display.
 */
export function resolveTestDepartment(test) {
  if (!test) return 'Other Lab Tests';
  if (isHealthPackage(test)) return 'Health Packages';
  const name = (test.test_name || '').toLowerCase();
  const spec = (test.specimen_type || '').toLowerCase();
  const cat = (test.category?.name || test.category_name || '').toLowerCase();

  if (cat.includes('x-ray') || /\b(x-ray|xray|barium|ivp|mcu|rgu|hsg|fistulogram|sinogram|lopogram|mammography|mammogram)\b/i.test(name)) {
    return 'X-Ray & Fluoroscopy';
  }
  if (cat.includes('ultrasound') || cat.includes('doppler') || /\b(ultrasound|usg|sonography|doppler|follicular|nt nb|anomaly scan|level ii)\b/i.test(name)) {
    return 'Ultrasound & Doppler';
  }
  if (cat.includes('ct') || cat.includes('mri') || /\b(ct scan|hrct|cect|ncct|mri|mrcp|angiography|pet scan|dexa)\b/i.test(name + ' ' + cat)) {
    return 'CT & MRI Scans';
  }
  if (cat.includes('cardiology') || /\b(ecg|ekg|echo|echocardiography|tmt|holter)\b/i.test(name)) {
    return 'Heart & Cardiology';
  }
  if (/\b(tissue|ffpe|formalin|biopsy|block|slides|fnac|histopathology|cytology|pap smear|lbc|ihc)\b/i.test(spec + ' ' + name)) {
    return 'Biopsy & Histopathology';
  }
  if (/^(whole blood|edta|serum|plasma|citrate|fluoride|heparin)\b/i.test(spec.trim()) && !/\b(urine|stool|csf|sputum)\b/i.test(name)) {
    return 'Blood & Serum Tests';
  }
  if (/\b(urine|stool|sputum|swab|csf|synovial|pleural|ascitic|fluid|pus|culture|semen)\b/i.test(spec + ' ' + name)) {
    return 'Urine, Fluid & Culture';
  }
  if (/\b(serum|blood|edta|plasma|citrate|fluoride|heparin|bone marrow)\b/i.test(spec) || resolveTestCollectionType(test) === 'home') {
    return 'Blood & Serum Tests';
  }
  return 'Other Lab Tests';
}

/**
 * Resolves a clean, concise sample or imaging modality label so cards never look blank.
 */
export function resolveTestSampleLabel(test) {
  if (!test) return 'Clinical Sample';
  const rawSpec = (test.specimen_type || '').trim();
  const name = (test.test_name || '').toLowerCase();
  const cat = (test.category?.name || test.category_name || '').toLowerCase();

  if (rawSpec) {
    if (/tissue|ffpe|formalin|block/i.test(rawSpec)) return 'Tissue / Biopsy Block';
    if (/whole blood edta|edta whole blood|peripheral blood/i.test(rawSpec)) return 'Whole Blood (EDTA)';
    if (/whole blood heparin|bone marrow/i.test(rawSpec)) return 'Heparin Blood / Marrow';
    if (/edta plasma/i.test(rawSpec)) return 'EDTA Plasma';
    if (/24 hr urine/i.test(rawSpec)) return '24 Hr Urine';
    if (/tuberculosis isolate|culture/i.test(rawSpec)) return 'Culture Isolate';
    if (rawSpec.length > 26) return rawSpec.slice(0, 24).trim() + '…';
    return rawSpec;
  }

  // Fallback for imaging / procedures where specimen_type is null
  if (cat.includes('x-ray') || /\b(x-ray|xray|barium|ivp|hsg|mammography)\b/i.test(name)) return 'X-Ray Imaging';
  if (cat.includes('doppler') || /\bdoppler\b/i.test(name)) return 'Color Doppler Scan';
  if (cat.includes('ultrasound') || /\b(ultrasound|usg|sonography)\b/i.test(name)) return 'Ultrasound (USG)';
  if (cat.includes('mri') || /\b(mri|mrcp)\b/i.test(name)) return 'MRI Scan';
  if (cat.includes('ct') || /\b(ct |hrct|cect|ncct)\b/i.test(name)) return 'CT Scan';
  if (cat.includes('cardiology') || /\b(ecg|echo|tmt|holter)\b/i.test(name)) return 'Cardiac Procedure';
  return 'In-Lab Procedure';
}
