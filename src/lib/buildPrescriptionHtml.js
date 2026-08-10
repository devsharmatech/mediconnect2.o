import dayjs from "dayjs";

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sanitizeUrl = (url) => {
  if (!url) return "";
  const str = String(url).trim();
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  return "";
};

export const buildPrescriptionHtml = (rec, options = {}) => {
  const parseArray = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseJsonStr = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) || {};
        } catch {
            return {};
        }
    }
    return {};
  }

  const createdAt = dayjs(rec.created_at).format("DD MMM YYYY, hh:mm A");

  const appointmentDate = rec.appointments?.appointment_date
    ? dayjs(rec.appointments.appointment_date).format("DD MMM YYYY")
    : "N/A";

  const appointmentTime = rec.appointments?.appointment_time || "N/A";

  const logoUrl = options.logoUrl || process.env.MEDICONNECT_LOGO_URL || "https://mediconnect.fit/real-logo.png";
  const doctorIcon = "https://mediconnect-lemon.vercel.app/dr.png";

  const specialization = (() => {
    let s = rec.specialization;
    if (!s) s = rec.doctor_details?.specialization;
    if (!s) return "";
    let str = "";
    if (Array.isArray(s)) {
      str = s.filter(Boolean).join(", ");
    } else if (typeof s === "string") {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          str = parsed.filter(Boolean).join(", ");
        } else {
          str = s;
        }
      } catch {
        str = s;
      }
    } else {
      str = String(s);
    }
    return str.split(",")[0].trim();
  })();

  const tagline = specialization && specialization !== "—"
    ? `${specialization} Care & Consultation`
    : "Teleconsultation Care & Consultation";

  // Normalize Qualification
  const qualification = (() => {
    const q = rec.doctor_details?.qualification;
    if (!q) return "—";
    if (Array.isArray(q)) return q.join(", ");
    if (typeof q === "string") {
      try {
        const parsed = JSON.parse(q);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch {}
    }
    return String(q);
  })();

  const isChemistView = options.isChemistView || options.mode === 'chemist' || options.type === 'chemist';

  const calculateQty = (m) => {
    if (m.quantity || m.qty) return String(m.quantity || m.qty);
    
    // Parse duration number
    const durationMatch = (m.duration || "").match(/(\d+)/);
    const days = durationMatch ? parseInt(durationMatch[1], 10) : 0;
    
    // Parse frequency
    const freqStr = (m.frequency || "").toLowerCase();
    let perDay = 1;
    if (freqStr.includes('1-0-1') || freqStr.includes('bid') || freqStr.includes('twice')) perDay = 2;
    else if (freqStr.includes('1-1-1') || freqStr.includes('tid') || freqStr.includes('thrice')) perDay = 3;
    else if (freqStr.includes('1-1-1-1') || freqStr.includes('qid')) perDay = 4;
    else if (freqStr.includes('1-0-0') || freqStr.includes('0-0-1') || freqStr.includes('once') || freqStr.includes('qd')) perDay = 1;

    if (days > 0) {
      const totalUnits = days * perDay;
      return `${totalUnits} Units (${days} days)`;
    }
    return "As Prescribed";
  };

  const safeMedicines = parseArray(rec.medicines);
  const medicinesHtml = safeMedicines.length
    ? safeMedicines
        .map(
          (m, i) => `
<div class="field">
  ${i + 1}. <span class="value">${escapeHtml(m.name)}</span> — 
  ${escapeHtml(m.dose || m.dosage || "")}, ${escapeHtml(m.frequency || "")}, ${escapeHtml(m.duration || "")} 
  <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-left: 6px;">Required Qty: ${escapeHtml(calculateQty(m))}</span><br/>
  ${m.notes || m.instructions ? `<small>${escapeHtml(m.notes || m.instructions)}</small>` : ''}
</div>`
        )
        .join("")
    : `<div class="field">No medicines prescribed</div>`;

  const safeLabTests = parseArray(rec.lab_tests);
  const safeInvestigations = parseArray(rec.investigations?.requested || rec.investigations);

  const combinedLabsAndInvestigations = [
    ...safeLabTests.map(t => ({
      name: typeof t === "string" ? t : (t.test_name || t.name || ""),
      instructions: typeof t === "string" ? "" : (t.instructions || ""),
      urgency: typeof t === "string" ? "" : (t.urgency || "")
    })),
    ...safeInvestigations.map(inv => ({
      name: typeof inv === "string" ? inv : (inv.name || inv.test_name || ""),
      instructions: typeof inv === "string" ? "" : (inv.instructions || ""),
      urgency: typeof inv === "string" ? "" : (inv.urgency || "")
    }))
  ].filter(item => item.name && item.name.trim());

  const labTestsHtml = combinedLabsAndInvestigations.length
    ? combinedLabsAndInvestigations
        .map(
          (t, i) => `
<div class="field">
  ${i + 1}. <span class="value">${escapeHtml(t.name)}</span>
  ${t.urgency ? `(${escapeHtml(t.urgency)})` : ""} ${t.instructions ? `— ${escapeHtml(t.instructions)}` : ""}
</div>`
        )
        .join("")
    : `<div class="field">No investigations or lab tests advised</div>`;

  const safeVitalSigns = parseJsonStr(rec.vital_signs);
  const vitalsHtml = Object.keys(safeVitalSigns).length > 0
    ? Object.entries(safeVitalSigns)
        .map(
          ([k, v]) => `
<div class="field">${escapeHtml(k.replaceAll("_", " "))}: <span class="value">${escapeHtml(v)}</span></div>`
        )
        .join("")
    : `<div class="field">Not recorded</div>`;

  let followUpWarningSigns = rec.follow_up?.warning_signs || rec.follow_up?.notes;
  if (typeof followUpWarningSigns === 'string' && followUpWarningSigns.startsWith('[')) {
      try { followUpWarningSigns = JSON.parse(followUpWarningSigns); } catch {}
  }
  const warningSignsHtml = followUpWarningSigns?.length
    ? (Array.isArray(followUpWarningSigns) ? followUpWarningSigns.join(", ") : followUpWarningSigns)
    : "Seek immediate medical attention if you experience high fever, severe breathlessness, chest pain, or sudden weakness.";
    
  let diagnosisText = rec.diagnosis?.primary || rec.diagnosis?.provisional_diagnosis || rec.diagnosis || "—";
  if (typeof diagnosisText === 'string' && diagnosisText.startsWith('{')) {
      try {
          const p = JSON.parse(diagnosisText);
          diagnosisText = p.primary || p.provisional_diagnosis || "—";
      } catch {}
  }

  // Doctor Signature parsing
  const parseUrl = (raw) => {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] || null;
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr[0] : raw; } catch { return raw; }
    }
    return raw;
  };
  const signatureUrl =
    parseUrl(rec.doctor_details?.signature_url) ||
    "https://placehold.co/200x60?text=Doctor+Signature";

  // Patient Details safe fallback
  const pDetails = rec.patient_details || {};

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Medical Prescription</title>

<style>
@page { size: 297mm 420mm; margin: 20mm; }

body {
  margin: 0;
  font-family: DejaVu Sans, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #000;
}

table { width:100%; border-collapse:collapse; }
.page { width:100%; }

.header {
  background: linear-gradient(135deg, #66baf7 0%, #62bcfb 100%);
  border-radius: 8px;
}
.header td { padding:18px; }

.title { text-align:center; }
.title h1 {
  margin:0;
  font-size:34px;
  font-weight:800;
  color: black;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
}
.title .tagline { margin:5px 0 0; font-size:15px; font-weight:500; color: black; }
.title .email { margin-top:5px; font-size:14px; color: black; }

.top-info {
  background:#eef6ff;
  font-weight:600;
}
.top-info td { padding:12px; }

h3 {
  font-size:18px;
  margin:22px 0 10px;
  padding-bottom:6px;
  border-bottom:2px solid #000;
  text-transform:uppercase;
}

h4 {
  font-size:16px;
  margin:18px 0 8px;
  padding-left:10px;
  border-left:4px solid #0080C6;
}

.field {
  padding:8px 0;
  border-bottom:1px dotted #bbb;
}

.value { color:#0b5ea8; font-weight:600; }

.badge {
  background:#6fbdf2;
  font-size:17px;
  font-weight:800;
  text-align:center;
  padding:14px;
  margin:18px 0;
}

.two-col td {
  width:50%;
  vertical-align:top;
  padding:20px;
}

.warning { color:#c00000; font-weight:700; }

.logo-box img {
  width:90px;
  height:90px;
  border-radius:50%;
  background:#fff;
  object-fit:contain;
}

.medical-cross {
  width: 90px;
  height: 90px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-left: auto;
}
.medical-cross img { width:70px; height:70px; }

.signature-box img {
  height: 40px;
  margin-bottom: 2px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 2px;
}
.blur-text {
  filter: blur(5px);
  user-select: none;
  opacity: 0.8;
}
</style>
</head>

<body>
<div class="page">

<!-- HEADER -->
<table class="header">
<tr>
  <td width="20%">
    <div class="logo-box"><img src="${sanitizeUrl(logoUrl)}"></div>
  </td>
  <td width="60%" class="title">
    <h1>MediConnect.fit</h1>
    <p class="tagline">${escapeHtml(tagline)}</p>
    <p class="email">📧 hello@mediconnect.fit</p>
  </td>
  <td width="20%" align="right">
    <div class="medical-cross"><img src="${sanitizeUrl(doctorIcon)}"></div>
  </td>
</tr>
</table>

<!-- TOP INFO -->
<table class="top-info">
<tr>
  <td>Prescription ID: <span class="value">${escapeHtml(rec.pid || "N/A")}</span></td>
  <td align="right">Date: <span class="value">${escapeHtml(createdAt)}</span></td>
</tr>
</table>

<!-- BODY -->
<table class="two-col">
<tr>

<!-- LEFT -->
<td>
<h3>Doctor Details</h3>
<div class="field">Name: <span class="value">${escapeHtml(rec.doctor_details?.full_name || "-")}</span></div>
<div class="field">Qualification: <span class="value">${escapeHtml(qualification)}</span></div>
<div class="field">Specialization: <span class="value">${escapeHtml(rec.doctor_details?.specialization || "-")}</span></div>
<div class="field">License No: <span class="value">${escapeHtml(rec.doctor_details?.license_number || "-")}</span></div>
<div class="field">Clinic: ${options.hideClinicDetails ? `<span class="value blur-text">Teleconsultation Clinic, Virtual Online Consultation, Medical Block 404</span>` : `<span class="value">${escapeHtml(rec.doctor_details?.clinic_name || "-")}, ${escapeHtml(rec.doctor_details?.clinic_address || "")}</span>`}</div>

${isChemistView ? '' : `
<h3>Diagnosis</h3>
<div class="field"><span class="value">${escapeHtml(diagnosisText)}</span></div>

<h4>Vital Signs</h4>
${vitalsHtml}
`}

</td>

<!-- RIGHT -->
<td>
<h3>Patient Details</h3>
<div class="field">Name: <span class="value">${escapeHtml(pDetails.full_name || "-")}</span></div>
<div class="field">Gender: <span class="value">${escapeHtml(pDetails.gender || "-")}</span></div>
<div class="field">DOB: <span class="value">${escapeHtml(pDetails.date_of_birth ? dayjs(pDetails.date_of_birth).format("DD MMM YYYY") : "-")}</span></div>
<div class="field">Address: <span class="value">${escapeHtml(pDetails.address || "-")}</span></div>

<div class="badge">PRESCRIPTION</div>

<h3>Medicines</h3>
${medicinesHtml}

${isChemistView ? '' : `
<h3>Investigations / Lab Tests</h3>
${labTestsHtml}

<h3>Follow Up</h3>
<div class="field">Return After: <span class="value">${escapeHtml(rec.follow_up?.return_after || rec.follow_up?.date || "-")}</span></div>
<div class="field"><span class="warning">Warning Signs:</span> ${escapeHtml(warningSignsHtml)}</div>
`}

<h3>Digital Signature</h3>
<div class="signature-box"><img src="${sanitizeUrl(signatureUrl)}" alt="Doctor's Signature" /></div>
<div class="field">Signed by: <span class="value">${escapeHtml(rec.doctor_details?.full_name || "-")}</span></div>
<div class="field">Signed at: <span class="value">${escapeHtml(rec.signed_at ? dayjs(rec.signed_at).format("DD MMM YYYY, hh:mm A") : "-")}</span></div>

</td>

</tr>
</table>

</div>
</body>
  </html>
`;
};
