"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaCalendarPlus,
  FaCalendarCheck,
  FaCalendarTimes,
  FaSpinner,
  FaExclamationCircle,
  FaFilter,
  FaUserClock,
  FaCalendarDay,
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import api from '@/utils/websiteApi';

export default function ManageSlots() {
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedView, setSelectedView] = useState('all');
  const [weeklyAvailability, setWeeklyAvailability] = useState({
    leave_days: [],
    clinic_slots: {},
    video_slots: {},
    home_slots: {},
  });

  // ── Availability toggle state ──────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [slotInterval, setSlotInterval] = useState(10);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [blockedAppointments, setBlockedAppointments] = useState([]);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');


  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const loadAvailability = useCallback(async () => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;
    try {
      const res = await fetch('/api/doctor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: userId, action: 'get' }),
      });
      const json = await res.json();
      if (json.success) {
        setIsOpen(json.data?.is_open ?? false);
        setSlotInterval(json.data?.slot_interval_minutes ?? 10);
      }
    } catch (err) {
      console.error('Failed to load availability:', err);
    }
  }, []);

  useEffect(() => {
    // Initialize selected date on client only to avoid SSR/client mismatch
    if (!selectedDate) {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
    }
    loadAvailability();
  }, [selectedDate, loadAvailability]);

  const handleToggle = async (newValue) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;
    setToggleLoading(true);
    setAvailabilityMessage('');
    try {
      const res = await fetch('/api/doctor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: userId, action: 'toggle', is_open: newValue }),
      });
      const json = await res.json();
      if (res.status === 409) {
        setBlockedAppointments(json.appointments || []);
        setShowBlockedModal(true);
      } else if (json.success) {
        setIsOpen(newValue);
        setAvailabilityMessage(json.message || '');
        setTimeout(() => setAvailabilityMessage(''), 3000);
      } else {
        setAvailabilityMessage(json.message || 'Failed to update availability');
      }
    } catch (err) {
      setAvailabilityMessage('Failed to update availability');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleIntervalChange = async (interval) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;
    setSlotInterval(interval);
    try {
      await fetch('/api/doctor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: userId, action: 'set_interval', slot_interval_minutes: interval }),
      });
    } catch (err) {
      console.error('Failed to update interval:', err);
    }
  };


  const loadWeeklyAvailability = useCallback(async () => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        return;
      }

      const res = await api.post('/profile/get', { user_id: userId });

      if (!res.success || !res.data) {
        console.error('Failed to fetch profile for weekly availability', res.error);
        return;
      }

      const parsed = res.data;
      const details = parsed?.details || {};

      const parseSlots = (value) => {
        if (!value) return {};
        if (typeof value === 'string') {
          try {
            const parsedValue = JSON.parse(value);
            return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
          } catch {
            return {};
          }
        }
        if (typeof value === 'object') return value;
        return {};
      };

      const parseLeaveDays = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const parsedArr = JSON.parse(trimmed);
              return Array.isArray(parsedArr) ? parsedArr : [];
            } catch {
              return [];
            }
          }
          return trimmed
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean);
        }
        return [];
      };

      const clinicSlots = parseSlots(details.clinic_slots);
      const videoSlots = parseSlots(details.video_slots);
      const homeSlots = parseSlots(details.home_slots);
      const leaveDays = parseLeaveDays(details.leave_days);

      setWeeklyAvailability({
        leave_days: leaveDays,
        clinic_slots: clinicSlots,
        video_slots: videoSlots,
        home_slots: homeSlots,
      });
    } catch (err) {
      console.error('Failed to load weekly availability for slots', err);
    }
  }, []);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const trimmed = String(timeStr).trim();
    if (!trimmed) return null;

    // Handle formats like "10:00 AM" or "10:00PM"
    const match12h = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (match12h) {
      let hours = parseInt(match12h[1], 10);
      const minutes = parseInt(match12h[2], 10);
      const suffix = match12h[3]?.toLowerCase();
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      if (suffix === 'pm' && hours !== 12) hours += 12;
      if (suffix === 'am' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    // Fallback: assume 24h "HH:MM"
    const parts = trimmed.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }
    return null;
  };

  const formatTimeTo12h = (timeStr) => {
    const mins = parseTimeToMinutes(timeStr);
    if (mins == null) return timeStr || '';
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    const mm = minutes.toString().padStart(2, '0');
    return `${hours}:${mm} ${suffix}`;
  };

  const fetchSlots = useCallback(async (date) => {
    try {
      setIsLoading(true);
      setMessage('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        setMessage('Please log in as a doctor to manage slots.');
        setTimeSlots([]);
        return;
      }

      const res = await api.post('/doctors/slots/get-for-doctor', {
        doctor_id: userId,
        date,
      });

      if (!res.success || !Array.isArray(res.data)) {
        setMessage(res.error || 'Could not load slots for this date.');
        setTimeSlots([]);
        return;
      }

      const sortedSlots = res.data.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.time) ?? 0;
        const timeB = parseTimeToMinutes(b.time) ?? 0;
        return timeA - timeB;
      });

      setTimeSlots(sortedSlots);
      setMessage('');
    } catch (err) {
      console.error('Error loading slots', err);
      setMessage('Unable to load slots. Please try again.');
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    fetchSlots(selectedDate);
    loadWeeklyAvailability();
  }, [selectedDate, fetchSlots, loadWeeklyAvailability]);

  const handleDateChange = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatShortDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFilteredSlots = () => {
    switch(selectedView) {
      case 'available':
        return timeSlots.filter(slot => slot.status === 'available' || slot.slot_booked === false);
      case 'booked':
        return timeSlots.filter(slot => slot.status === 'booked' || slot.slot_booked === true);
      default:
        return timeSlots;
    }
  };

  const availableSlots = timeSlots.filter(slot => slot.status === 'available' || slot.slot_booked === false);
  const bookedSlots = timeSlots.filter(slot => slot.status === 'booked' || slot.slot_booked === true);

  const timeRanges = {
    morning: { label: 'Morning', start: 6 * 60, end: 12 * 60 },
    afternoon: { label: 'Afternoon', start: 12 * 60, end: 17 * 60 },
    evening: { label: 'Evening', start: 17 * 60, end: 22 * 60 },
  };

  const getTimeRange = (time) => {
    const mins = parseTimeToMinutes(time);
    if (mins == null) return 'morning';
    if (mins >= timeRanges.morning.start && mins < timeRanges.morning.end) return 'morning';
    if (mins >= timeRanges.afternoon.start && mins < timeRanges.afternoon.end) return 'afternoon';
    if (mins >= timeRanges.evening.start && mins < timeRanges.evening.end) return 'evening';
    return 'evening';
  };

  const getSlotIcon = (slot) => {
    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    return isAvailable ? (
      <FaCheck className="w-4 h-4 text-[#0067A1]" />
    ) : (
      <FaTimes className="w-4 h-4 text-rose-500" />
    );
  };

  const getSlotStatus = (slot) => {
    if (slot.status === 'freezed') return 'Blocked';

    if (["booked", "approved", "completed"].includes(slot.status)) {
      return 'Booked';
    }

    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    return isAvailable ? 'Available' : 'Booked';
  };

  const getSlotColor = (slot) => {
    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    return {
      bg: isAvailable ? 'bg-[#0067A1]/5' : 'bg-rose-50',
      border: isAvailable ? 'border-[#0067A1]/20' : 'border-rose-200',
      text: isAvailable ? 'text-[#0067A1]' : 'text-rose-700',
      iconBg: isAvailable ? 'bg-[#0067A1]/10' : 'bg-rose-100'
    };
  };

  const getSlotCategory = (slot) => {
    // Derive slot type from doctor's weekly timings for the selected day
    try {
      const date = new Date(selectedDate);
      const dayName = daysOfWeek[date.getDay()];

      const slotMinutes = parseTimeToMinutes(slot.time);
      if (slotMinutes == null) return 'clinic';

      const windows = {
        clinic: weeklyAvailability.clinic_slots?.[dayName],
        video: weeklyAvailability.video_slots?.[dayName],
        home: weeklyAvailability.home_slots?.[dayName],
      };

      const inWindow = (window) => {
        if (!window) return false;
        const intervals = Array.isArray(window) ? window : [window];
        return intervals.some((interval) => {
          if (!interval.start || !interval.end) return false;
          const startMins = parseTimeToMinutes(interval.start);
          const endMins = parseTimeToMinutes(interval.end);
          if (startMins == null || endMins == null) return false;
          return slotMinutes >= startMins && slotMinutes <= endMins;
        });
      };

      if (inWindow(windows.clinic)) return 'clinic';
      if (inWindow(windows.video)) return 'video';
      if (inWindow(windows.home)) return 'home';

      return 'clinic';
    } catch {
      return 'clinic';
    }
  };

  const getSlotCategoryLabel = (category) => {
    switch (category) {
      case 'video':
        return 'Video Consultation';
      case 'home':
        return 'Home Visit';
      case 'clinic':
      default:
        return 'Clinic Visit';
    }
  };

  const handleSlotToggle = async (slot) => {
    try {
      setIsLoading(true);
      setMessage('');

      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      const role = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      if (!userId || role !== 'doctor') {
        setMessage('Please log in as a doctor to manage slots.');
        setIsLoading(false);
        return;
      }

      const action = slot.status === 'freezed' ? 'unfreeze' : 'freeze';

      const res = await api.post('/doctors/slots/status', {
        doctor_id: userId,
        appointment_date: selectedDate,
        appointment_times: [slot.time],
        action,
      });

      if (!res.success) {
        setMessage(res.error || 'Unable to update slot status.');
        setIsLoading(false);
        return;
      }

      setMessage(
        action === 'freeze'
          ? 'Slot blocked successfully for this date.'
          : 'Slot unblocked successfully for this date.'
      );

      await fetchSlots(selectedDate);
    } catch (error) {
      console.error('Failed to update slot status', error);
      setMessage('Unable to update slot status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-[#0067A1]/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaCalendarAlt className="w-10 h-10 text-[#0067A1]" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-700">Loading Time Slots</h3>
              <p className="text-sm text-slate-500">Fetching schedule for {formatDate(selectedDate)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSlotCard = (slot) => {
    const colors = getSlotColor(slot);
    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    const category = getSlotCategory(slot);

    return (
      <div
        key={slot.time}
        className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 ${
          isAvailable ? 'border-[#0067A1]/20' : 'border-rose-100'
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  isAvailable ? 'bg-[#0067A1]/10' : 'bg-rose-100'
                }`}
              >
                {getSlotIcon(slot)}
              </div>
              <div>
                <div className="text-lg md:text-xl font-bold text-slate-800">
                  {formatTimeTo12h(slot.time)}
                </div>
                <div
                  className={`text-xs font-semibold mt-1 ${
                    isAvailable ? 'text-[#0067A1]' : 'text-rose-600'
                  }`}
                >
                  {getSlotStatus(slot)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Consultation Type</span>
              <span className="font-medium text-slate-700">
                {getSlotCategoryLabel(category)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Duration</span>
              <span className="font-medium text-slate-700">
                {slot.duration || '30 min'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Time Range</span>
              <span className="font-medium text-slate-700 capitalize">
                {getTimeRange(slot.time)}
              </span>
            </div>
          </div>

          {slot.patient_name && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm">
                <FaUsers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Patient</span>
              </div>
              <p className="text-sm font-medium text-slate-700 truncate mt-1">
                {slot.patient_name}
              </p>
            </div>
          )}
        </div>

        <div
          className={`px-4 py-3 rounded-b-xl ${
            isAvailable ? 'bg-[#0067A1]/5' : 'bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Slot ID: #{slot.id || slot.time.replace(/[: ]/g, '')}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                isAvailable
                  ? 'bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20'
                  : 'bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {getSlotStatus(slot)}
            </span>
          </div>
          {(slot.status === 'available' || slot.status === 'freezed') && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSlotToggle(slot)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  slot.status === 'freezed'
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    : 'bg-[#0067A1] text-white border-[#0067A1] hover:bg-[#004F7C]'
                }`}
              >
                {slot.status === 'freezed' ? 'Unblock Slot' : 'Block Slot'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="w-full mx-auto space-y-4 md:space-y-6">
        {/* Header - Matching Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#0067A1] shadow-md">
                <FaCalendarAlt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800">Time Slot Management</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage your consultation availability and schedule</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold text-[#0067A1] uppercase tracking-wider mb-1">
                Selected Date
              </div>
              <div className="text-sm md:text-base font-semibold text-slate-800">{formatShortDate(selectedDate)}</div>
            </div>
            <button
              onClick={() => fetchSlots(selectedDate)}
              className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── Blocked Appointments Modal ──────────────────────────────── */}
        {showBlockedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <FaExclamationCircle className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Cannot Go Offline</h3>
                  <p className="text-sm text-gray-500">You have active appointments today</p>
                </div>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {blockedAppointments.map((apt, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100 text-sm">
                    <span className="font-medium text-gray-800">
                      {apt.appointment_time?.slice(0, 5)} — {apt.appointment_type?.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${apt.status === 'booked' ? 'bg-blue-100 text-[#004F7C]' : 'bg-green-100 text-green-700'}`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">Complete or cancel these appointments before going offline.</p>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="w-full py-2.5 bg-[#0067A1] text-white rounded-xl font-semibold text-sm hover:bg-[#09403c] transition-colors"
              >
                OK, Got It
              </button>
            </div>
          </div>
        )}

        {/* ── Availability Toggle Card ──────────────────────────────────── */}
        <div className={`rounded-2xl border-2 shadow-lg p-5 transition-all duration-500 ${isOpen ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Section */}
            <div className="flex items-center gap-4">
              <div className={`relative w-16 h-8 rounded-full cursor-pointer transition-colors duration-300 shadow-inner ${toggleLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`}
                onClick={() => !toggleLoading && handleToggle(!isOpen)}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isOpen ? 'translate-x-9' : 'translate-x-1'}`} />
                {toggleLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaSpinner className="animate-spin text-white w-4 h-4" />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-bold text-lg ${isOpen ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {isOpen ? '🟢 Open for Appointments' : '🔴 Currently Closed'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isOpen
                    ? 'Patients can see your slots and book appointments. You appear in instant calls.'
                    : 'Your slots are hidden. You do not appear in instant call listings.'}
                </p>
                {availabilityMessage && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">{availabilityMessage}</p>
                )}
              </div>
            </div>

            {/* Slot Interval Section */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slot Interval</p>
              <div className="flex items-center gap-2">
                {[5, 10, 15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleIntervalChange(mins)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${slotInterval === mins
                      ? 'bg-[#0067A1] text-white border-[#0067A1] shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#0067A1] hover:text-[#0067A1]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">Each appointment slot duration</p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Matching Dashboard Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Total Slots
                </p>
                <p className="text-2xl font-bold text-slate-800">{timeSlots.length}</p>
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
                  Available
                </p>
                <p className="text-2xl font-bold text-slate-800">{availableSlots.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0067A1]">
                <FaCalendarCheck className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Booked
                </p>
                <p className="text-2xl font-bold text-slate-800">{bookedSlots.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0067A1]">
                <FaCalendarTimes className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#0067A1]/10">
                <FaCalendarDay className="w-5 h-5 text-[#0067A1]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Select Date</h3>
                <p className="text-sm text-slate-500">Choose date to view availability</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                <button
                  onClick={() => handleDateChange(-1)}
                  className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                  title="Previous day"
                >
                  <FaChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2.5 pl-11 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0067A1] focus:border-transparent"
                  />
                  <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
                
                <button
                  onClick={() => handleDateChange(1)}
                  className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                  title="Next day"
                >
                  <FaChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              
              <button
                onClick={handleToday}
                className="px-4 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all duration-200"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5">
          {/* Filter Tabs - Matching Dashboard Style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Time Slots</h3>
              <p className="text-sm text-slate-500 mt-1">Manage your consultation slots</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
              {[
                { id: 'all', label: 'All Slots', count: timeSlots.length, icon: FaCalendarAlt },
                { id: 'available', label: 'Available', count: availableSlots.length, icon: FaCheck },
                { id: 'booked', label: 'Booked', count: bookedSlots.length, icon: FaTimes }
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              message.toLowerCase().includes('error') || 
              message.toLowerCase().includes('unable') || 
              message.toLowerCase().includes('please log in')
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <FaExclamationCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                message.toLowerCase().includes('error') || 
                message.toLowerCase().includes('unable') || 
                message.toLowerCase().includes('please log in')
                  ? 'text-rose-500'
                  : 'text-emerald-500'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${
                  message.toLowerCase().includes('error') || 
                  message.toLowerCase().includes('unable') || 
                  message.toLowerCase().includes('please log in')
                    ? 'text-rose-700'
                    : 'text-emerald-700'
                }`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Slots Display */}
          {getFilteredSlots().length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-50 flex items-center justify-center shadow-sm">
                <FaClock className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {timeSlots.length === 0 ? 'No Slots Available' : 'No Slots Match Filter'}
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {timeSlots.length === 0 
                  ? 'No time slots are scheduled for this date. Please set up your availability in settings.'
                  : `No ${selectedView} slots found for ${formatDate(selectedDate)}.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped by Consultation Type */}
              {['clinic', 'video', 'home'].map((category) => {
                const slotsForCategory = getFilteredSlots().filter(
                  (slot) => getSlotCategory(slot) === category
                );

                if (!slotsForCategory.length) return null;

                const availableInCategory = slotsForCategory.filter(
                  (slot) => slot.status === 'available' || slot.slot_booked === false
                );

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-slate-800">
                          {getSlotCategoryLabel(category)} Slots
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {slotsForCategory.length} total • {availableInCategory.length} available
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {slotsForCategory.map((slot) => renderSlotCard(slot))}
                    </div>
                  </div>
                );
              })}

              {/* Time Range Summary */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#0067A1]/10">
                    <FaClock className="w-5 h-5 text-[#0067A1]" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-800">Time Distribution</h4>
                    <p className="text-sm text-slate-500">Slot availability by time of day</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(timeRanges).map(([rangeKey, rangeConfig]) => {
                    const slotsInRange = getFilteredSlots().filter((slot) => {
                      const mins = parseTimeToMinutes(slot.time);
                      if (mins == null) return false;
                      return mins >= rangeConfig.start && mins < rangeConfig.end;
                    });
                    const availableInRange = slotsInRange.filter(slot => 
                      slot.status === 'available' || slot.slot_booked === false
                    );
                    
                    return (
                      <div key={rangeKey} className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-slate-700 capitalize">{rangeConfig.label}</h5>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            {slotsInRange.length} slots
                          </span>
                        </div>
                        <div className="space-y-2">
                          {slotsInRange.length > 0 ? (
                            slotsInRange.map(slot => (
                              <div key={slot.time} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{slot.time}</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  slot.status === 'available' || slot.slot_booked === false
                                    ? 'bg-[#0067A1]/10 text-[#0067A1] border border-[#0067A1]/20'
                                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                                }`}>
                                  {getSlotStatus(slot)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400 text-center py-2">No slots in this range</p>
                          )}
                        </div>
                        {availableInRange.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                {availableInRange.length} available
                              </span>
                              <span className="text-xs font-semibold text-emerald-600">
                                {Math.round((availableInRange.length / slotsInRange.length) * 100)}% available
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              {selectedView === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0067A1]/5 rounded-2xl p-5 border border-[#0067A1]/20">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-[#0067A1]">
                        <FaCalendarCheck className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-emerald-800 mb-3">Available Slots</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableSlots.slice(0, 6).map(slot => (
                            <span 
                              key={slot.time} 
                              className="px-3 py-1.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm border border-emerald-200"
                            >
                              {formatTimeTo12h(slot.time)}
                            </span>
                          ))}
                          {availableSlots.length > 6 && (
                            <span className="px-3 py-1.5 bg-white text-emerald-700 font-semibold rounded-lg text-sm border border-emerald-200">
                              +{availableSlots.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-[#0067A1]">
                        <FaCalendarTimes className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-rose-800 mb-3">Booked Slots</h4>
                        <div className="flex flex-wrap gap-2">
                          {bookedSlots.slice(0, 6).map(slot => (
                            <span 
                              key={slot.time} 
                              className="px-3 py-1.5 bg-white text-rose-700 font-semibold rounded-lg text-sm border border-rose-200"
                            >
                              {formatTimeTo12h(slot.time)}
                            </span>
                          ))}
                          {bookedSlots.length > 6 && (
                            <span className="px-3 py-1.5 bg-white text-rose-700 font-semibold rounded-lg text-sm border border-rose-200">
                              +{bookedSlots.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            Total {timeSlots.length} slots • {availableSlots.length} available • {bookedSlots.length} booked
          </p>
        </div>
      </div>
    </div>
  );
}