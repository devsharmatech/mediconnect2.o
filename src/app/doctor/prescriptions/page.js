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
import WritePrescriptionModal from '@/components/doctor/WritePrescriptionModal';
import PrescriptionViewerModal from '@/components/public-site/appointments/PrescriptionViewerModal';

export default function Prescriptions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState(null);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const calculatePatientAgeHelper = (dob, explicitAge) => {
    if (explicitAge) return explicitAge;
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowPatientDropdown(false);
    setIsLoadingWorkspace(true);
    try {
      const docId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const resApt = await api.post('/appointment/doctor-appointment', {
        doctor_id: docId,
        date_filter: 'all'
      });
      const appointmentsList = resApt.success && Array.isArray(resApt.data) 
        ? resApt.data 
        : (resApt.data?.appointments || []);
      
      const matchingApt = appointmentsList.find(a => 
        (a.patient_id === patient.id || a.patient?.id === patient.id) &&
        !['cancelled', 'rejected'].includes(String(a.status).toLowerCase())
      );

      if (!matchingApt) {
        toast.error("No valid consultation appointment found for this patient. Medical regulations require an active appointment before issuing a prescription.");
        setIsLoadingWorkspace(false);
        return;
      }

      const patientAgeVal = calculatePatientAgeHelper(patient.date_of_birth, patient.age);
      setMockAppointment({
        id: matchingApt.id,
        patient_id: patient.id,
        care_episode_id: matchingApt.care_episode_id || matchingApt.id,
        appointment_type: matchingApt.appointment_type || 'clinic_visit',
        appointment_date: matchingApt.appointment_date,
        patient: {
          id: patient.id,
          full_name: patient.full_name,
          gender: patient.gender,
          date_of_birth: patient.date_of_birth,
          age: patientAgeVal,
          blood_group: patient.blood_group,
          phone: patient.phone,
          email: patient.email,
        },
        status: matchingApt.status || 'ACTIVE'
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not verify consultation records for this patient.");
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
        let rawDiagnosis = p.diagnosis || p.icd_diagnosis || '';
        let diagnosisNotes = '';

        if (typeof rawDiagnosis === 'string' && rawDiagnosis.trim().startsWith('{')) {
          try {
            rawDiagnosis = JSON.parse(rawDiagnosis);
          } catch {}
        }

        let diagnosisText = '';
        if (typeof rawDiagnosis === 'string') {
          diagnosisText = rawDiagnosis.trim();
        } else if (Array.isArray(rawDiagnosis)) {
          diagnosisText = rawDiagnosis.filter(Boolean).join(', ');
        } else if (typeof rawDiagnosis === 'object' && rawDiagnosis !== null) {
          diagnosisText =
            rawDiagnosis.primary ||
            rawDiagnosis.provisional_diagnosis ||
            rawDiagnosis.diagnosis ||
            rawDiagnosis.name ||
            rawDiagnosis.text ||
            '';
          diagnosisNotes = rawDiagnosis.notes || rawDiagnosis.clinical_notes || '';
          if (!diagnosisText && rawDiagnosis.severity) {
            diagnosisText = `Severity: ${rawDiagnosis.severity}`;
          }
        }

        // Fallback to template_data if still empty
        if (!diagnosisText && p.template_data) {
          const td = typeof p.template_data === 'string' ? safeJsonParse(p.template_data, {}) : (p.template_data || {});
          diagnosisText = td['PROVISIONAL DIAGNOSIS__diagnosis'] || td.diagnosis || td.provisional_diagnosis || '';
          if (!diagnosisNotes) {
            diagnosisNotes = td['PROVISIONAL DIAGNOSIS__clinical_notes'] || td.diagnosis_notes || '';
          }
        }

        if (!diagnosisText) {
          diagnosisText = 'Not specified';
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
          raw: p,
          doctorId: p.doctor_id || userId,
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
          diagnosisNotes: diagnosisNotes,
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

  const handleDelete = (prescription) => {
    setPrescriptionToDelete(prescription);
  };

  const confirmDelete = async () => {
    if (!prescriptionToDelete) return;

    try {
      setIsDeleting(true);
      setError('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        setError('Please log in as a doctor to delete prescriptions.');
        setIsDeleting(false);
        setPrescriptionToDelete(null);
        return;
      }

      const res = await api.delete('/prescriptions/delete', {
        prescription_id: prescriptionToDelete.id,
        doctor_id: prescriptionToDelete.doctorId || userId,
      });

      if (!res.success) {
        setError(res.error || 'Unable to delete prescription.');
        setIsDeleting(false);
        return;
      }

      setPrescriptions(prev => prev.filter(p => p.id !== prescriptionToDelete.id));
      setPrescriptionToDelete(null);
      toast.success("Prescription deleted successfully.");
    } catch (err) {
      console.error('Error deleting prescription', err);
      setError('Unable to delete prescription. Please try again.');
    } finally {
      setIsDeleting(false);
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0067A1] hover:bg-[#0067A1]/5 hover:border-[#0067A1]/30 transition-colors"
                            >
                              <FaChevronRight className="w-3.5 h-3.5" />
                              <span>View</span>
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
                <p className="text-slate-500 max-w-md mx-auto">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : 'Prescriptions issued during consultations will appear here.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* New Prescription Modal */}
        {showNewPrescription && mockAppointment && (
          <WritePrescriptionModal
            appointmentId={mockAppointment.id}
            appointment={mockAppointment}
            onClose={() => {
              setShowNewPrescription(false);
              setMockAppointment(null);
              setSelectedPatient(null);
            }}
            onViewPrescription={() => {
              setShowNewPrescription(false);
              fetchPrescriptions();
            }}
            onPrescriptionSaved={() => {
              setShowNewPrescription(false);
              setMockAppointment(null);
              setSelectedPatient(null);
              fetchPrescriptions();
            }}
          />
        )}

        {showNewPrescription && !mockAppointment && (
          <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-hidden">
            <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 max-w-xl w-full h-full sm:h-auto sm:max-h-[95vh] overflow-hidden flex flex-col">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FaFileMedical className="text-[#0067A1]" /> Issue E-Prescription
                  </h3>
                  <p className="text-xs text-slate-500">Select patient with an active appointment to start</p>
                </div>
                <button
                  onClick={() => setShowNewPrescription(false)}
                  className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                >
                  <FaTimes className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 min-h-[320px] overflow-y-auto">
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
                            <p className="text-xs text-slate-500">{p.phone} • {p.gender}{calculatePatientAgeHelper(p.date_of_birth, p.age) ? ` • ${calculatePatientAgeHelper(p.date_of_birth, p.age)} yrs` : ''}{p.blood_group ? ` • ${p.blood_group}` : ''}</p>
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

            </div>
          </div>
        )}

        {/* Prescription Details Modal — Same proper A4 format as patient side */}
        {currentPrescription && (
          <PrescriptionViewerModal
            data={{
              ...(currentPrescription.raw || currentPrescription),
              doctor_details: currentPrescription.raw?.doctor_details || doctorInfo || {},
              patient_details: currentPrescription.raw?.patient_details || currentPrescription.patientDetails || {},
              appointments: currentPrescription.raw?.appointments || currentPrescription.appointment || {},
            }}
            onClose={() => setCurrentPrescription(null)}
            isDoctor={true}
          />
        )}
      </div>
    </div>
  );
}
