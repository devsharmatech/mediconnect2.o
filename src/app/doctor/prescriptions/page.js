"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  FaSearch, 
  FaPlus, 
  FaFileMedical, 
  FaCalendarAlt, 
  FaClock,
  FaEdit,
  FaTrash,
  FaUser,
  FaStethoscope,
  FaPills,
  FaNotesMedical,
  FaTimes,
  FaChevronRight,
  FaHistory,
  FaExclamationCircle,
  FaCheckCircle
} from 'react-icons/fa';
import api from '@/utils/websiteApi';
import toast from 'react-hot-toast';
import ConsultationWorkspace from '@/components/doctor/ConsultationWorkspace';

function formatSpecialMessage(text) {
  if (!text) return null;
  const cleanText = text.replace(/\[\s*(PRESENTING COMPLAINTS|COMPLAINTS)\s*\][^\[]*/gi, '');
  const lines = cleanText.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: "4px" }} />;
        
        // Match [SECTION NAME]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          const sectionTitle = trimmed.slice(1, -1).replace(/_/g, " ").toUpperCase();
          return (
            <div
              key={idx}
              style={{
                fontWeight: "bold",
                color: "#333",
                borderBottom: "1px solid #eee",
                paddingBottom: "2px",
                marginBottom: "6px",
                marginTop: "12px",
                fontSize: "11px",
                letterSpacing: "0.5px",
                textTransform: "uppercase"
              }}
            >
              {sectionTitle}
            </div>
          );
        }
        
        // Match key: value
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          return (
            <div key={idx} style={{ padding: "2px 0", display: "flex", gap: "8px", fontSize: "12px" }}>
              <span style={{ color: "#666", fontWeight: "600", shrink: 0 }}>{key}:</span>
              <span style={{ color: "#0067A1", fontWeight: "700" }}>{val}</span>
            </div>
          );
        }
        
        // Plain text line
        return (
          <div key={idx} style={{ color: "#444", fontSize: "12px", lineHeight: "1.4" }}>
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function Prescriptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState(null);

  // Patient and generic state
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [mockAppointment, setMockAppointment] = useState(null);

  useEffect(() => {
    if (showNewPrescription) {
      const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      if (!uid) return;
      api.post('/doctor/my-patients', { doctor_id: uid })
        .then(res => {
          if (res.success && Array.isArray(res.data)) {
            setPatients(res.data);
          }
        })
        .catch(console.error);
    } else {
      // Reset form states when closing
      setSelectedPatient(null);
      setPatientSearch('');
      setMockAppointment(null);
    }
  }, [showNewPrescription]);

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowPatientDropdown(false);
    setIsLoadingWorkspace(true);
    try {
      const res = await api.post('/consultation/start', {
        patient_id: patient.id,
        symptoms: 'Routine E-Prescription Creation',
        consultation_mode: 'CLINIC_VISIT'
      });
      if (res.success && res.data) {
        setMockAppointment({
          id: res.data.consultation_id,
          patient_id: patient.id,
          care_episode_id: res.data.care_episode_id,
          patient: { full_name: patient.full_name },
          status: 'ACTIVE'
        });
      } else {
        toast.error("Failed to initialize clinical workspace. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred starting the clinical workspace.");
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedView, setSelectedView] = useState('all'); // 'all', 'recent', 'today'

  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
  };

  const safeJsonParse = (value, fallback) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.warn('Failed to parse JSON in prescriptions page:', e);
        return fallback;
      }
    }
    return fallback;
  };

  const fetchPrescriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        setError('Please log in as a doctor to view prescriptions.');
        setPrescriptions([]);
        return;
      }

      const res = await api.post('/prescriptions/by-doctor', {
        doctor_id: userId,
      });

      if (!res.success || !Array.isArray(res.data)) {
        setError(res.error || 'Unable to load prescriptions.');
        setPrescriptions([]);
        return;
      }

      const mapped = res.data.map((p) => {
        const rawDiagnosis = p.diagnosis || p.icd_diagnosis || '';
        let diagnosisText = 'Not specified';

        if (rawDiagnosis) {
          if (typeof rawDiagnosis === 'string') {
            diagnosisText = rawDiagnosis;
          } else if (Array.isArray(rawDiagnosis)) {
            diagnosisText = rawDiagnosis.join(', ');
          } else if (typeof rawDiagnosis === 'object') {
            const parts = [];
            if (rawDiagnosis.provisional_diagnosis) parts.push(rawDiagnosis.provisional_diagnosis);
            if (rawDiagnosis.severity) parts.push(`Severity: ${rawDiagnosis.severity}`);
            if (Array.isArray(rawDiagnosis.icd_codes) && rawDiagnosis.icd_codes.length) {
              parts.push(`ICD: ${rawDiagnosis.icd_codes.join(', ')}`);
            }
            if (rawDiagnosis.notes) parts.push(rawDiagnosis.notes);
            diagnosisText = parts.length ? parts.join(' â€¢ ') : 'Not specified';
          }
        }

        // Medicines: support array, JSON string, or legacy medicines_list
        let rawMedicines = [];
        if (Array.isArray(p.medicines) && p.medicines.length) {
          rawMedicines = p.medicines;
        } else if (typeof p.medicines === 'string') {
          rawMedicines = safeJsonParse(p.medicines, []);
        } else if (Array.isArray(p.medicines_list)) {
          rawMedicines = p.medicines_list;
        }

        const normalizedMedicines = Array.isArray(rawMedicines)
          ? rawMedicines.map((m) => ({
              name: m.medicine_name || m.name || '',
              dosage: m.dosage || m.dose || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
              instructions: m.instructions || m.notes || ''
            }))
          : [];

        const vitalSigns = safeJsonParse(p.vital_signs, null);
        const examinationFindings = safeJsonParse(p.examination_findings, null);
        const labTests = safeJsonParse(p.lab_tests, []);
        const investigations = safeJsonParse(p.investigations, null);

        let invArray = [];
        if (investigations) {
          if (Array.isArray(investigations)) {
            invArray = investigations;
          } else if (investigations.requested && Array.isArray(investigations.requested)) {
            invArray = investigations.requested;
          } else if (typeof investigations === 'string') {
            invArray = [investigations];
          } else if (typeof investigations === 'object') {
            invArray = Object.values(investigations).filter(Boolean);
          }
        }

        const combinedLabs = [
          ...(Array.isArray(labTests) ? labTests : []),
          ...invArray
        ].filter(Boolean);

        const followUpInfo = safeJsonParse(p.follow_up, null);
        const specialInstructions = safeJsonParse(p.special_instructions, null);

        return {
          id: p.id,
          doctorId: p.doctor_id,
          patientName: p.patient_details?.full_name || 'Patient',
          patientId: p.patient_id,
          patientDetails: p.patient_details || null,
          patientExternalId:
            p.patient_details?.un_id ||
            p.patient_details?.users?.un_id ||
            p.patient_details?.user?.un_id ||
            null,
          appointment: p.appointments || null,
          date: p.created_at?.slice(0, 10) || '',
          time: p.created_at ? new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          diagnosis: diagnosisText,
          medicines: normalizedMedicines,
          notes: p.notes || p.instructions || '',
          followUp: p.follow_up_date || followUpInfo?.next_appointment_date || '',
          followUpInfo,
          vitalSigns,
          examinationFindings,
          labTests: combinedLabs,
          investigations,
          specialInstructions,
          specialMessage: p.special_message || '',
          appointmentType: p.appointment_type || p.appointments?.appointment_type || '',
          status: p.status || 'active',
          specialization: p.specialization || '',
          templateData: typeof p.template_data === 'string' ? safeJsonParse(p.template_data, {}) : (p.template_data || {})
        };
      });

      setPrescriptions(mapped);
    } catch (err) {
      console.error('Error loading prescriptions', err);
      setError('Unable to load prescriptions. Please try again.');
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  // Load doctor info for prescription letterhead
  const [doctorInfo, setDoctorInfo] = useState({});
  useEffect(() => {
    const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!uid) return;
    api.post('/profile/get', { user_id: uid })
      .then(d => {
        if (d.success && d.data) {
          const det = d.data.details || {};
          // Normalize arrays (qualification/specialization may be JSON arrays)
          const norm = (v) => {
            if (Array.isArray(v)) return v.join(', ');
            if (typeof v === 'string' && v.trim().startsWith('[')) {
              try { const p = JSON.parse(v); return Array.isArray(p) ? p.join(', ') : v; } catch { return v; }
            }
            return v || '';
          };
          setDoctorInfo({
            full_name: det.full_name || d.data.full_name || '',
            qualification: norm(det.qualification),
            specialization: norm(det.specialization),
            license_number: det.license_number || '',
            clinic_name: det.clinic_name || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const getFilteredPrescriptions = () => {
    let filtered = prescriptions.filter((prescription) =>
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply view filters
    if (selectedView === 'today') {
      const today = getTodayDateString();
      filtered = filtered.filter(p => p.date === today);
    } else if (selectedView === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(p => new Date(p.date) > oneWeekAgo);
    }

    return filtered;
  };

  const filteredPrescriptions = getFilteredPrescriptions();

  const handleDelete = async (prescription) => {
    if (!window.confirm('Are you sure you want to delete this prescription? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        setError('Please log in as a doctor to delete prescriptions.');
        setIsLoading(false);
        return;
      }

      const res = await api.delete('/prescriptions/delete', {
        prescription_id: prescription.id,
        doctor_id: prescription.doctorId || userId,
      });

      if (!res.success) {
        setError(res.error || 'Unable to delete prescription.');
        setIsLoading(false);
        return;
      }

      setPrescriptions(prev => prev.filter(p => p.id !== prescription.id));
    } catch (err) {
      console.error('Error deleting prescription', err);
      setError('Unable to delete prescription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getMedicineCountColor = (count) => {
    if (count === 0) return 'bg-slate-100 text-slate-600';
    if (count <= 3) return 'bg-[#0067A1]/10 text-[#0067A1]';
    if (count <= 6) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[#0067A1]/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaFileMedical className="w-10 h-10 text-[#0067A1]" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-700">Loading Prescriptions</h3>
              <p className="text-sm text-slate-500">Fetching patient medical records...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#0067A1] shadow-md">
                <FaFileMedical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">Medical Prescriptions</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage patient prescriptions and medical records</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold text-[#0067A1] uppercase tracking-wider mb-1">
                Total Prescriptions
              </div>
              <div className="text-base md:text-lg font-bold text-slate-800">{prescriptions.length}</div>
            </div>
            <button
              onClick={() => setShowNewPrescription(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200"
            >
              <FaPlus className="w-4 h-4" />
              New Prescription
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Prescriptions
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {prescriptions.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#0067A1]">
                <FaUser className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Today&apos;s Prescriptions
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {prescriptions.filter(p => p.date === getTodayDateString()).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#0067A1]">
                <FaCalendarAlt className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Medicines
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {prescriptions.reduce((total, p) => total + p.medicines.length, 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#0067A1]">
                <FaPills className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient name or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                {[
                  { id: 'all', label: 'All', icon: FaFileMedical },
                  { id: 'recent', label: 'Recent', icon: FaHistory },
                  { id: 'today', label: 'Today', icon: FaCalendarAlt }
                ].map((filter) => {
                  const Icon = filter.icon;
                  const isActive = selectedView === filter.id;
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedView(filter.id)}
                      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-[#0067A1] text-white shadow-md'
                          : 'text-slate-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-semibold">{filter.label}</span>
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={fetchPrescriptions}
                className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <FaExclamationCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Prescriptions List */}
          <div>
            {filteredPrescriptions.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Medicines</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredPrescriptions.map((prescription) => (
                      <tr key={prescription.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                              <FaUser className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">
                                {prescription.patientName}
                              </div>
                              <div className="text-xs text-slate-500">{getTimeAgo(prescription.date)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <FaStethoscope className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="line-clamp-2 text-xs sm:text-sm max-w-xs">
                              {prescription.diagnosis}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {formatDate(prescription.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                          {prescription.time || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getMedicineCountColor(prescription.medicines.length)}`}>
                            {prescription.medicines.length} medicines
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setCurrentPrescription(prescription)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            >
                              <FaChevronRight className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDelete(prescription)}
                              className="p-2 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50"
                              title="Delete"
                            >
                              <FaTrash className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-50 flex items-center justify-center shadow-sm">
                  <FaFileMedical className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  {searchTerm ? 'No prescriptions found' : 'No prescriptions yet'}
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : 'Start by creating your first prescription for a patient'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowNewPrescription(true)}
                    className="px-5 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200"
                  >
                    <FaPlus className="w-4 h-4 inline mr-2" />
                    Create New Prescription
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Prescription Modal */}
        {showNewPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FaFileMedical className="text-[#0067A1]" /> Issue E-Prescription
                  </h3>
                  <p className="text-xs text-slate-500">Secure clinical documentation and prescriptions</p>
                </div>
                <button
                  onClick={() => setShowNewPrescription(false)}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                >
                  <FaTimes className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto">
                {!mockAppointment ? (
                  <div className="p-6 space-y-4 min-h-[320px]">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Patient to Begin</h3>
                    <div className="relative">
                      <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patient by name or phone..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0067A1]"
                      />
                      {showPatientDropdown && patientSearch.trim().length > 0 && (
                        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                          {patients.filter(p => 
                            (p.full_name || '').toLowerCase().includes(patientSearch.toLowerCase()) || 
                            (p.phone && p.phone.includes(patientSearch))
                          ).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectPatient(p)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between text-sm text-slate-700"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{p.full_name}</p>
                                <p className="text-xs text-slate-500">{p.phone} • {p.gender} • {p.email}</p>
                              </div>
                              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{p.visit_count} Visits</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isLoadingWorkspace && (
                      <div className="flex items-center justify-center py-6 gap-2">
                        <div className="w-5 h-5 border-2 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-500 font-semibold">Initializing clinical workspace...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Consulting Patient</span>
                        <h4 className="font-bold text-slate-800 text-base">{selectedPatient?.full_name}</h4>
                      </div>
                      <button
                        onClick={() => { setMockAppointment(null); setSelectedPatient(null); }}
                        className="text-xs font-bold text-[#0067A1] hover:underline"
                      >
                        Change Patient
                      </button>
                    </div>
                    <ConsultationWorkspace
                      appointment={mockAppointment}
                      onConsultationUpdate={() => {
                        setShowNewPrescription(false);
                        fetchPrescriptions();
                      }}
                    />
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Prescription Details Modal â€” md-pdf style */}
        {currentPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden">

              {/* Modal toolbar */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-800 flex-shrink-0">
                <span className="text-white font-semibold text-sm">Prescription View</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById('rx-print-area');
                      const w = window.open('', '_blank');
                      w.document.write(`<html><head><title>Prescription</title><style>body{font-family:Segoe UI,sans-serif;margin:0;padding:0;} .no-print{display:none;} @media print{.no-print{display:none;}}</style></head><body>${el.innerHTML}</body></html>`);
                      w.document.close();
                      w.focus();
                      w.print();
                      w.close();
                    }}
                    className="px-4 py-1.5 bg-[#0080C6] text-white rounded-lg text-xs font-semibold hover:bg-[#0067A1] transition"
                  >
                    🖨 Print
                  </button>
                  <button
                    onClick={() => setCurrentPrescription(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable prescription document */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#f5f7fa] to-[#e4edf5] p-4">
                <div id="rx-print-area" style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', background: 'white', maxWidth: '100%', margin: '0 auto', padding: 24, borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', color: '#333' }}>

                  {/* HEADER */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'linear-gradient(135deg,#66baf7 0%,#62bcfb 100%)', borderRadius: 8, marginBottom: 16 }}>
                    <div>
                      <img src="/real-logo.png" alt="logo" style={{ width: 72, height: 72, borderRadius: '50%', background: 'white', objectFit: 'contain' }} />
                    </div>
                    <div style={{ textAlign: 'center', flexGrow: 1 }}>
                      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'black', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>MediConnect.fit</h1>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'black', fontWeight: 500 }}>
                        {(() => {
                          const spec = currentPrescription.specialization || doctorInfo.specialization;
                          if (!spec || spec === "—") return "Teleconsultation Care & Consultation";
                          const singleSpec = spec.split(',')[0].trim();
                          return `${singleSpec} Care & Consultation`;
                        })()}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'black' }}>📧 hello@mediconnect.fit</p>
                    </div>
                    <div style={{ width: 72, height: 72, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src="/md-pdf/dr.png" alt="dr" style={{ width: 56, height: 56 }} />
                    </div>
                  </div>

                  {/* TOP ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0f7ff', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    <div>Booking ID: <span style={{ color: '#0067A1' }}>{String(currentPrescription.id).slice(0, 8).toUpperCase()}</span></div>
                    <div>Date: <span style={{ color: '#0067A1' }}>{formatDate(currentPrescription.date)}</span></div>
                    <div>Time: <span style={{ color: '#0067A1' }}>{currentPrescription.time || '—'}</span></div>
                  </div>

                  {/* NOTICE */}
                  <div style={{ background: '#fff8d6', padding: '10px 14px', fontSize: 12, borderRadius: 6, borderLeft: '4px solid #ffc107', fontStyle: 'italic', marginBottom: 12 }}>
                    This prescription is based solely on information provided during teleconsultation without physical examination. If symptoms worsen, seek in-person evaluation or emergency care immediately.
                  </div>

                  <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '12px 0' }} />

                  {/* TWO COLUMNS */}
                  <div style={{ display: 'flex', gap: 20 }}>

                    {/* LEFT COLUMN */}
                    <div style={{ width: '50%', fontSize: 12 }}>
                      <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>DOCTOR DETAILS</h3>
                      {[['Name', `Dr. ${doctorInfo.full_name || 'Doctor'}`],
                        ['Qualification', doctorInfo.qualification || 'N/A'],
                        ['Specialization', currentPrescription.specialization ? currentPrescription.specialization.split(',')[0].trim() : (doctorInfo.specialization ? doctorInfo.specialization.split(',')[0].trim() : 'N/A')],
                        ['Reg No.', doctorInfo.license_number || 'N/A'],
                        ['Clinic', doctorInfo.clinic_name || 'Virtual Consultation Only']
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>{lbl}: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{val}</span>
                        </div>
                      ))}

                      <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 14 }}>PROVISIONAL DIAGNOSIS</h3>
                      <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                        <span style={{ color: '#0067A1', fontWeight: 500 }}>{currentPrescription.diagnosis || '—'}</span>
                      </div>

                      {currentPrescription.vitalSigns && Object.values(currentPrescription.vitalSigns).some(Boolean) && (
                        <>
                          <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>VITALS (Self-reported)</h4>
                          {Object.entries(currentPrescription.vitalSigns).map(([k, v]) => {
                            if (!v) return null;
                            const formatVital = (key, val) => {
                              let s = String(val).trim();
                              if (/[a-zA-Z%]/.test(s)) return s;
                              const kl = key.toLowerCase();
                              if (kl.includes('blood_pressure') || kl === 'bp') return `${s} mmHg`;
                              if (kl.includes('pulse') || kl === 'heart_rate') return `${s} bpm`;
                              if (kl.includes('temp')) return `${s} °F`;
                              if (kl.includes('weight')) return `${s} kg`;
                              if (kl.includes('height')) return `${s} cm`;
                              if (kl.includes('spo2') || kl.includes('oxygen')) return `${s} %`;
                              if (kl.includes('sugar') || kl.includes('glucose')) return `${s} mg/dL`;
                              return s;
                            };
                            return (
                              <div key={k} style={{ position: 'relative', paddingBottom: 5, margin: '4px 0', borderBottom: '1px dotted #e0e0e0' }}>
                                <span style={{ fontWeight: 600 }}>{k.replace(/_/g, ' ')}: </span>
                                <span style={{ color: '#0067A1', fontWeight: 500 }}>{formatVital(k, v)}</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {currentPrescription.labTests?.length > 0 && (
                        <>
                          <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>INVESTIGATIONS / LAB TESTS ADVISED</h4>
                          {currentPrescription.labTests.map((t, i) => (
                            <div key={i} style={{ paddingBottom: 5, margin: '4px 0', borderBottom: '1px dotted #e0e0e0' }}>
                              <span style={{ color: '#0067A1', fontWeight: 500 }}>{i+1}. {typeof t === 'object' ? (t.test_name || t.name || JSON.stringify(t)) : t}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ width: '50%', fontSize: 12 }}>
                      <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>PATIENT DETAILS</h3>
                      {[['Name', currentPrescription.patientName],
                        ['Gender', currentPrescription.patientDetails?.gender || '—'],
                        ['Blood Group', currentPrescription.patientDetails?.blood_group || '—'],
                        ['Age', (() => {
                          const dob = currentPrescription.patientDetails?.date_of_birth;
                          const explicitAge = currentPrescription.patientDetails?.age;
                          if (explicitAge) return `${explicitAge} yrs`;
                          if (!dob) return '—';
                          const bd = new Date(dob);
                          if(isNaN(bd)) return '—';
                          const today = new Date();
                          let a = today.getFullYear() - bd.getFullYear();
                          const m = today.getMonth() - bd.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) a--;
                          return a >= 0 ? `${a} yrs` : '—';
                        })()]
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>{lbl}: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{val}</span>
                        </div>
                      ))}

                      <div style={{ background: 'linear-gradient(135deg,#66baf7,#62bcfb)', color: 'black', textAlign: 'center', fontWeight: 900, padding: 10, margin: '12px 0', borderRadius: 6, fontSize: 13, letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        {(currentPrescription.appointmentType || 'TELECONSULTATION').toUpperCase().replace('_', ' ')}
                      </div>

                      {(() => {
                        let symp = {};
                        const td = currentPrescription.templateData;
                        if (td) {
                          if (td._dynamic_complaints && Array.isArray(td._dynamic_complaints)) {
                            td._dynamic_complaints.forEach(c => {
                              if (c.complaint) symp[c.complaint] = c.details || "Yes";
                            });
                          } else {
                            if (td['PRESENTING COMPLAINTS__fever']) symp['Fever / Chills'] = td['PRESENTING COMPLAINTS__fever'];
                            if (td['PRESENTING COMPLAINTS__cough']) symp['Cough / Cold / Sore throat'] = td['PRESENTING COMPLAINTS__cough'];
                            if (td['PRESENTING COMPLAINTS__headache']) symp['Headache / Bodyache'] = td['PRESENTING COMPLAINTS__headache'];
                            if (td['PRESENTING COMPLAINTS__gi_symptoms']) symp['Nausea / Vomiting / Diarrhea'] = td['PRESENTING COMPLAINTS__gi_symptoms'];
                            if (td['PRESENTING COMPLAINTS__weakness']) symp['Weakness / Fatigue'] = td['PRESENTING COMPLAINTS__weakness'];
                          }
                        }
                        
                        if (Object.keys(symp).length > 0) {
                          return (
                            <>
                              <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>PRESENTING COMPLAINTS</h3>
                              {Object.entries(symp).map(([k, v]) =>
                                v ? (
                                  <div key={k} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                                    <span style={{ fontWeight: 600 }}>{k}: </span>
                                    <span style={{ color: '#0067A1', fontWeight: 500 }}>{String(v)}</span>
                                  </div>
                                ) : null
                              )}
                            </>
                          );
                        }
                        return null;
                      })()}

                      {currentPrescription.medicines.length > 0 && (
                        <>
                          <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>TREATMENT (Rx)</h3>
                          {currentPrescription.medicines.map((med, idx) => (
                            <div key={idx} style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                              <span style={{ color: '#0067A1', fontWeight: 500 }}>
                                {idx + 1}. {med.name || `Medicine ${idx+1}`}
                                {med.dosage ? ` - ${med.dosage}` : ''}
                                {med.frequency ? `, ${med.frequency}` : ''}
                                {med.duration ? ` x ${med.duration}` : ''}
                                {med.instructions ? `. ${med.instructions}` : ''}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      <h3 style={{ borderBottom: '2px solid #000', paddingBottom: 5, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 12 }}>FOLLOW-UP</h3>
                      {currentPrescription.followUp && (
                        <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>Next Visit: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{currentPrescription.followUp}</span>
                        </div>
                      )}
                      {currentPrescription.followUpInfo?.return_after && (
                        <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600 }}>Return After: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>{currentPrescription.followUpInfo.return_after}</span>
                        </div>
                      )}
                      {currentPrescription.followUpInfo?.warning_signs?.length > 0 && (
                        <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0', borderBottom: '1px dotted #e0e0e0' }}>
                          <span style={{ fontWeight: 600, color: 'red' }}>Warning Signs: </span>
                          <span style={{ color: '#0067A1', fontWeight: 500 }}>
                            {Array.isArray(currentPrescription.followUpInfo.warning_signs)
                              ? currentPrescription.followUpInfo.warning_signs.join(', ')
                              : currentPrescription.followUpInfo.warning_signs}
                          </span>
                        </div>
                      )}
                      {(currentPrescription.notes || currentPrescription.specialMessage) && (
                        <>
                          <h4 style={{ margin: '12px 0 6px', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #0080C6', paddingLeft: 8 }}>SPECIAL ADVICE / CLINICAL NOTES</h4>
                          <div style={{ position: 'relative', paddingBottom: 5, margin: '5px 0' }}>
                            {formatSpecialMessage(currentPrescription.specialMessage || currentPrescription.notes)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <hr style={{ border: 'none', height: 1, background: 'linear-gradient(90deg,transparent,#0080C6,transparent)', margin: '14px 0 8px' }} />
                  <p style={{ textAlign: 'center', fontSize: 10, color: '#888', margin: 0 }}>MediConnect Healthcare Services &middot; Ref ID: {String(currentPrescription.id).slice(0, 8).toUpperCase()}</p>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
