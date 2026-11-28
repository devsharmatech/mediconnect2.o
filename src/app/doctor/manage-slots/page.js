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
import toast from 'react-hot-toast';

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

  // ── Date Off & Busy Hours States ──────────────────────────────────────────
  const [dateOffLoading, setDateOffLoading] = useState(false);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [busyStart, setBusyStart] = useState('02:00 PM');
  const [busyEnd, setBusyEnd] = useState('05:00 PM');
  const [busyReason, setBusyReason] = useState('Surgery');
  const [busyLoading, setBusyLoading] = useState(false);

  const standardTimeOptions = [
    '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
    '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'
  ];


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
        const statusText = newValue
          ? 'Accepting New Bookings — Patients can book available slots'
          : 'Not Accepting New Bookings — Confirmed appointments remain unchanged';
        setAvailabilityMessage(statusText);
        toast.success(statusText);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('doctor-availability-changed', { detail: { is_open: newValue } }));
        }
        if (selectedDate) {
          fetchSlots(selectedDate);
        }
        setTimeout(() => setAvailabilityMessage(''), 4000);
      } else {
        setAvailabilityMessage(json.message || 'Failed to update availability');
        toast.error(json.message || 'Failed to update availability');
      }
    } catch (err) {
      setAvailabilityMessage('Failed to update availability');
      toast.error('Failed to update availability');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleIntervalChange = async (interval) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;
    setSlotInterval(interval);
    try {
      const res = await fetch('/api/doctor/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: userId, action: 'set_interval', slot_interval_minutes: interval }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Slot interval updated to ${interval}m`);
        if (selectedDate) {
          fetchSlots(selectedDate);
        }
      }
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
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
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
    slot1: { label: 'Slot 1: Morning (09:00 - 12:00)', start: 9 * 60, end: 12 * 60 },
    slot2: { label: 'Slot 2: Afternoon (12:00 - 16:00)', start: 12 * 60, end: 16 * 60 },
    slot3: { label: 'Slot 3: Evening (16:00 - 19:00)', start: 16 * 60, end: 19 * 60 },
    slot4: { label: 'Slot 4: Night (19:00 - 21:00)', start: 19 * 60, end: 21 * 60 },
  };

  const getTimeRange = (time) => {
    const mins = parseTimeToMinutes(time);
    if (mins == null) return 'slot1';
    if (mins < timeRanges.slot2.start) return 'slot1';
    if (mins < timeRanges.slot3.start) return 'slot2';
    if (mins < timeRanges.slot4.start) return 'slot3';
    return 'slot4';
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
    if (slot.status === 'freezed') {
      return slot.block_reason && slot.block_reason !== 'Blocked'
        ? `Blocked (${slot.block_reason})`
        : 'Blocked';
    }

    if (["booked", "approved", "completed"].includes(slot.status)) {
      return 'Booked';
    }

    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    return isAvailable ? 'Available' : 'Booked';
  };

  const isDateOff = (() => {
    if (!selectedDate) return false;
    const leaveDays = weeklyAvailability?.leave_days || [];
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) return false;
    const dayName = daysOfWeek[date.getDay()];
    return leaveDays.some((ld) => {
      const ldStr = String(ld).trim().toLowerCase();
      return ldStr === selectedDate.toLowerCase() || (dayName && ldStr === dayName.toLowerCase());
    });
  })();

  const handleToggleDateOff = async (isMarkingOff) => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;

    setDateOffLoading(true);
    try {
      const res = await fetch('/api/doctor/date-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: userId,
          date: selectedDate,
          action: isMarkingOff ? 'mark_off' : 'mark_available',
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          isMarkingOff
            ? `${formatShortDate(selectedDate)} marked as Day Off`
            : `${formatShortDate(selectedDate)} marked as Working Day`
        );
        setWeeklyAvailability((prev) => ({
          ...prev,
          leave_days: json.data?.leave_days || [],
        }));
        await fetchSlots(selectedDate);
      } else {
        toast.error(json.message || 'Failed to update date status');
      }
    } catch (err) {
      toast.error('Failed to update date status');
    } finally {
      setDateOffLoading(false);
    }
  };

  const handleBlockBusyHours = async (action = 'freeze') => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;

    const startMins = parseTimeToMinutes(busyStart);
    const endMins = parseTimeToMinutes(busyEnd);

    if (startMins == null || endMins == null || startMins >= endMins) {
      toast.error('End time must be after start time');
      return;
    }

    let matchingTimes = [];
    if (timeSlots.length > 0) {
      matchingTimes = timeSlots
        .map((s) => s.time)
        .filter((t) => {
          const m = parseTimeToMinutes(t);
          return m != null && m >= startMins && m < endMins;
        });
    }

    if (matchingTimes.length === 0) {
      const step = slotInterval || 10;
      let curr = startMins;
      while (curr < endMins) {
        const hh = String(Math.floor(curr / 60)).padStart(2, '0');
        const mm = String(curr % 60).padStart(2, '0');
        matchingTimes.push(`${hh}:${mm}`);
        curr += step;
      }
    }

    setBusyLoading(true);
    try {
      const res = await api.post('/doctors/slots/status', {
        doctor_id: userId,
        appointment_date: selectedDate,
        appointment_times: matchingTimes,
        action,
        reason: busyReason,
      });

      if (res.success) {
        toast.success(
          action === 'freeze'
            ? `Blocked ${matchingTimes.length} slots for ${busyReason}`
            : `Unblocked ${matchingTimes.length} slots`
        );
        setShowBusyModal(false);
        await fetchSlots(selectedDate);
      } else {
        toast.error(res.error || 'Failed to update slots');
      }
    } catch (err) {
      toast.error('Failed to update slots');
    } finally {
      setBusyLoading(false);
    }
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
    const isAvailable = slot.status === 'available' || slot.slot_booked === false;
    const category = getSlotCategory(slot);

    return (
      <div
        key={slot.time}
        className={`bg-white rounded-md border transition-colors ${
          isAvailable ? 'border-sky-200 hover:border-[#0067A1]' : slot.status === 'freezed' ? 'border-amber-200 hover:border-amber-300' : 'border-rose-200 hover:border-rose-300'
        }`}
      >
        <div className="p-3 sm:p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${
                  isAvailable ? 'bg-sky-50 text-[#0067A1] border-sky-100' : slot.status === 'freezed' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}
              >
                {getSlotIcon(slot)}
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-tight">
                  {formatTimeTo12h(slot.time)}
                </div>
                <div
                  className={`text-[11px] font-medium leading-tight mt-0.5 truncate ${
                    isAvailable ? 'text-[#0067A1]' : slot.status === 'freezed' ? 'text-amber-700' : 'text-rose-600'
                  }`}
                >
                  {slot.status === 'freezed'
                    ? (slot.block_reason && slot.block_reason !== 'Blocked' ? `Blocked (${slot.block_reason})` : 'Blocked')
                    : getSlotStatus(slot)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Consultation Type</span>
              <span className="text-xs font-medium text-slate-700">
                {getSlotCategoryLabel(category)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Duration</span>
              <span className="text-xs font-medium text-slate-700">
                {slot.duration || '30 min'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Time Range</span>
              <span className="text-xs font-medium text-slate-700 capitalize">
                {getTimeRange(slot.time)}
              </span>
            </div>
          </div>

          {slot.patient_name && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <FaUsers className="w-3 h-3 text-slate-400" />
                <span>Patient</span>
              </div>
              <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                {slot.patient_name}
              </p>
            </div>
          )}
        </div>

        <div
          className={`px-3 py-2 rounded-b-md border-t border-slate-100 flex items-center justify-between gap-1.5 ${
            isAvailable ? 'bg-sky-50/30' : slot.status === 'freezed' ? 'bg-amber-50/30' : 'bg-rose-50/30'
          }`}
        >
          <span className="text-[10px] text-slate-400 font-mono shrink-0">
            #{slot.time ? slot.time.replace(/[: ]/g, '') : String(slot.id || '').slice(0, 6)}
          </span>
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border truncate max-w-[120px] ${
                isAvailable
                  ? 'bg-sky-50 text-[#0067A1] border-sky-200'
                  : slot.status === 'freezed'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={slot.status === 'freezed' ? (slot.block_reason || 'Blocked') : getSlotStatus(slot)}
            >
              {slot.status === 'freezed' ? (slot.block_reason || 'Blocked') : getSlotStatus(slot)}
            </span>
            {(slot.status === 'available' || slot.status === 'freezed') && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSlotToggle(slot)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors disabled:opacity-50 cursor-pointer shrink-0 ${
                  slot.status === 'freezed'
                    ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    : 'bg-[#0067A1] text-white border-[#0067A1] hover:bg-[#004F7C]'
                }`}
              >
                {slot.status === 'freezed' ? 'Unblock' : 'Block'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-8">
      <div className="w-full mx-auto space-y-3.5 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-[#0067A1] text-white flex items-center justify-center shrink-0">
              <FaCalendarAlt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-800 tracking-tight">Time Slot Management</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your consultation availability and schedule</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-1.5 bg-white rounded-md border border-slate-200">
              <div className="text-[10px] font-medium text-[#0067A1] uppercase tracking-wider">
                Selected Date
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">{formatShortDate(selectedDate)}</div>
            </div>
            <button
              onClick={() => fetchSlots(selectedDate)}
              className="px-3 py-1.5 bg-white rounded-md border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── Blocked Appointments Modal ──────────────────────────────── */}
        {showBlockedModal && (
          <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center p-0 sm:p-4 bg-black/50 overflow-hidden">
            <div className="bg-white rounded-none sm:rounded-md border border-slate-200 w-full h-full sm:h-auto sm:max-w-md p-5 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-center shrink-0">
                    <FaExclamationCircle className="text-amber-600 w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900">Cannot Go Offline</h3>
                    <p className="text-xs text-slate-500">You have active appointments today</p>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {blockedAppointments.map((apt, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-amber-50/70 rounded-md border border-amber-200 text-xs">
                      <span className="font-medium text-slate-800">
                        {apt.appointment_time?.slice(0, 5)} — {['clinic', 'clinic_visit', 'in_person'].includes(String(apt.appointment_type || '').toLowerCase()) ? 'Clinic' : (apt.appointment_type?.replace('_', ' ') || 'Consultation')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${apt.status === 'booked' ? 'bg-sky-50 text-[#0067A1] border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Complete or cancel these appointments before going offline.</p>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="w-full mt-4 py-2 bg-[#0067A1] text-white rounded-md font-medium text-xs sm:text-sm hover:bg-[#004F7C] transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        )}

        {/* ── Availability Toggle Card ──────────────────────────────────── */}
        <div className={`rounded-md border p-4 transition-colors ${isOpen ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/70 border-slate-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Section */}
            <div className="flex items-start sm:items-center gap-3">
              <div className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-200 shrink-0 mt-0.5 sm:mt-0 ${toggleLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isOpen ? 'bg-emerald-600' : 'bg-slate-300'}`}
                onClick={() => !toggleLoading && handleToggle(!isOpen)}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${isOpen ? 'translate-x-6' : 'translate-x-0.5'}`} />
                {toggleLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaSpinner className="animate-spin text-white w-3 h-3" />
                  </div>
                )}
              </div>
              <div>
                <p className={`font-semibold text-sm sm:text-base ${isOpen ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {isOpen ? 'Accepting New Bookings' : 'Not Accepting New Bookings'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  When turned off, patients cannot make new bookings. Confirmed appointments remain unchanged.
                </p>
                {availabilityMessage && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">{availabilityMessage}</p>
                )}
              </div>
            </div>

            {/* Slot Interval Section */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Slot Interval</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleIntervalChange(mins)}
                    className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors border cursor-pointer ${slotInterval === mins
                      ? 'bg-[#0067A1] text-white border-[#0067A1]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">Duration applies to future unbooked consultation slots across all modes (5–60 min).</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-white rounded-md border border-slate-200 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Total Slots
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-slate-800">{timeSlots.length}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-sky-50 text-[#0067A1] border border-sky-100 flex items-center justify-center shrink-0">
                <FaCalendarAlt className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md border border-slate-200 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Available
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-slate-800">{availableSlots.length}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                <FaCalendarCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md border border-slate-200 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">
                  Booked
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-slate-800">{bookedSlots.length}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center shrink-0">
                <FaCalendarTimes className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white rounded-md border border-slate-200 p-3.5 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-sky-50 text-[#0067A1] border border-sky-100 flex items-center justify-center shrink-0">
                <FaCalendarDay className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800">Select Date</h3>
                  {isDateOff ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Day Off
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Working Day
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Manage duty, leaves, and busy hours for this date</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 rounded-md p-1 border border-slate-200 w-full sm:w-auto">
                <button
                  onClick={() => handleDateChange(-1)}
                  className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors cursor-pointer"
                  title="Previous day"
                >
                  <FaChevronLeft className="w-3.5 h-3.5" />
                </button>
                
                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto px-2.5 py-1.5 pl-8 rounded-md border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#0067A1]"
                  />
                  <FaCalendarAlt className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
                
                <button
                  onClick={() => handleDateChange(1)}
                  className="p-1.5 rounded-md hover:bg-white text-slate-600 transition-colors cursor-pointer"
                  title="Next day"
                >
                  <FaChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-[#0067A1] hover:bg-[#004F7C] text-white text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer shrink-0"
              >
                Today
              </button>

              <button
                disabled={dateOffLoading}
                onClick={() => handleToggleDateOff(!isDateOff)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer border shrink-0 disabled:opacity-50 ${
                  isDateOff
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                    : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {dateOffLoading ? (
                  <span className="flex items-center gap-1.5"><FaSpinner className="animate-spin w-3 h-3" /> Updating...</span>
                ) : isDateOff ? (
                  'Mark as Working'
                ) : (
                  'Mark Date Off'
                )}
              </button>

              <button
                onClick={() => setShowBusyModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <FaUserClock className="w-3.5 h-3.5 text-amber-300" />
                <span>Busy Hours</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-md border border-slate-200 p-3.5 sm:p-5">
          {/* Day Off Warning Banner if Date is Off */}
          {isDateOff && (
            <div className="mb-4 p-4 bg-amber-50/80 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <FaCalendarTimes className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    {formatDate(selectedDate)} is Marked as Day Off
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You are marked on leave for this specific date. All slots are hidden from patients, while other dates remain available.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={dateOffLoading}
                onClick={() => handleToggleDateOff(false)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                Resume Duty
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-800">Time Slots</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage your consultation slots</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-200">
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
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0067A1] text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{filter.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] sm:text-xs font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-md border flex items-start gap-2.5 ${
              message.toLowerCase().includes('error') || 
              message.toLowerCase().includes('unable') || 
              message.toLowerCase().includes('please log in')
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <FaExclamationCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                message.toLowerCase().includes('error') || 
                message.toLowerCase().includes('unable') || 
                message.toLowerCase().includes('please log in')
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`} />
              <div className="flex-1">
                <p className={`text-xs sm:text-sm font-medium ${
                  message.toLowerCase().includes('error') || 
                  message.toLowerCase().includes('unable') || 
                  message.toLowerCase().includes('please log in')
                    ? 'text-rose-700'
                    : 'text-emerald-800'
                }`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Slots Display */}
          {getFilteredSlots().length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/50 rounded-md border border-dashed border-slate-200">
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                <FaClock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {timeSlots.length === 0 ? 'No Slots Available' : 'No Slots Match Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {timeSlots.length === 0 
                  ? 'No time slots are scheduled for this date. Please set up your availability in settings.'
                  : `No ${selectedView} slots found for ${formatDate(selectedDate)}.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-5">
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
                  <div key={category} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-slate-800">
                          {getSlotCategoryLabel(category)} Slots
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {slotsForCategory.length} total • {availableInCategory.length} available
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                      {slotsForCategory.map((slot) => renderSlotCard(slot))}
                    </div>
                  </div>
                );
              })}

              {/* Time Range Summary */}
              <div className="bg-slate-50/70 rounded-md p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-sky-50 text-[#0067A1] border border-sky-100 flex items-center justify-center shrink-0">
                    <FaClock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800">Time Distribution</h4>
                    <p className="text-[11px] text-slate-500">Slot availability by time of day</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
                      <div key={rangeKey} className="bg-white rounded-md p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-semibold text-slate-700 capitalize">{rangeConfig.label}</h5>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {slotsInRange.length} slots
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {slotsInRange.length > 0 ? (
                            slotsInRange.map(slot => (
                              <div key={slot.time} className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-mono">{slot.time}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  slot.status === 'available' || slot.slot_booked === false
                                    ? 'bg-sky-50 text-[#0067A1] border-sky-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {getSlotStatus(slot)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2">No slots in this range</p>
                          )}
                        </div>
                        {availableInRange.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">
                                {availableInRange.length} available
                              </span>
                              <span className="font-semibold text-emerald-700">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="bg-sky-50/40 rounded-md p-3.5 sm:p-4 border border-sky-100">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-[#0067A1] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <FaCalendarCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">Available Slots</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSlots.slice(0, 6).map(slot => (
                            <span 
                              key={slot.time} 
                              className="px-2 py-1 bg-white text-emerald-800 font-medium rounded-md text-xs border border-emerald-200 font-mono"
                            >
                              {formatTimeTo12h(slot.time)}
                            </span>
                          ))}
                          {availableSlots.length > 6 && (
                            <span className="px-2 py-1 bg-white text-emerald-800 font-medium rounded-md text-xs border border-emerald-200">
                              +{availableSlots.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50/40 rounded-md p-3.5 sm:p-4 border border-rose-100">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <FaCalendarTimes className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-2">Booked Slots</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {bookedSlots.slice(0, 6).map(slot => (
                            <span 
                              key={slot.time} 
                              className="px-2 py-1 bg-white text-rose-800 font-medium rounded-md text-xs border border-rose-200 font-mono"
                            >
                              {formatTimeTo12h(slot.time)}
                            </span>
                          ))}
                          {bookedSlots.length > 6 && (
                            <span className="px-2 py-1 bg-white text-rose-800 font-medium rounded-md text-xs border border-rose-200">
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

        {/* ── Set Busy Hours Modal ──────────────────────────────── */}
        {showBusyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                    <FaUserClock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-slate-800">Set Busy Hours</h3>
                    <p className="text-xs text-slate-500">Block a time window on {formatShortDate(selectedDate)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBusyModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      From Time
                    </label>
                    <select
                      value={busyStart}
                      onChange={(e) => setBusyStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-[#0067A1]"
                    >
                      {standardTimeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      To Time
                    </label>
                    <select
                      value={busyEnd}
                      onChange={(e) => setBusyEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-[#0067A1]"
                    >
                      {standardTimeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Reason / Duty Type
                  </label>
                  <select
                    value={busyReason}
                    onChange={(e) => setBusyReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 text-xs sm:text-sm focus:outline-none focus:border-[#0067A1]"
                  >
                    <option value="Surgery">Surgery</option>
                    <option value="Hospital Rounds">Hospital Rounds</option>
                    <option value="Lunch Break">Lunch Break</option>
                    <option value="Clinical Duty">Clinical Duty</option>
                    <option value="Personal Emergency">Personal Emergency</option>
                    <option value="Out of Clinic">Out of Clinic</option>
                    <option value="Other">Other Duty</option>
                  </select>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-500">
                  Slots between <span className="font-semibold text-slate-700">{busyStart}</span> and <span className="font-semibold text-slate-700">{busyEnd}</span> on {formatShortDate(selectedDate)} will be marked as busy.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBusyModal(false)}
                  className="px-3 py-1.5 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busyLoading}
                  onClick={() => handleBlockBusyHours('unfreeze')}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Unblock
                </button>
                <button
                  type="button"
                  disabled={busyLoading}
                  onClick={() => handleBlockBusyHours('freeze')}
                  className="px-4 py-1.5 text-xs sm:text-sm bg-[#0067A1] hover:bg-[#004F7C] text-white font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {busyLoading ? 'Saving...' : 'Block Hours'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Total {timeSlots.length} slots • {availableSlots.length} available • {bookedSlots.length} booked
          </p>
        </div>
      </div>
    </div>
  );
}