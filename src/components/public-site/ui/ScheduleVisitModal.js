'use client';

import { useState } from 'react';
import Button from './Button';

export default function ScheduleVisitModal({ isOpen, onClose, doctorName, specializations, onConfirm }) {
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  // Generate dates (next 5 days)
  const dates = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push({
      day: days[date.getDay()],
      date: date.getDate(),
      fullDate: date
    });
  }

  // Available time slots
  const timeSlots = ['11:45', '12:00', '12:15', '12:30', '12:45', '13:00'];

  const handleConfirm = () => {
    if (!selectedTime || !consentGiven) return;
    
    onConfirm({
      date: dates[selectedDate].fullDate,
      time: selectedTime,
      notes
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Clinic Visit</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Doctor Info */}
          <div className="px-6 pt-4">
            <p className="text-sm text-gray-700">{doctorName} • {specializations}</p>
          </div>

          {/* Date Selection */}
          <div className="px-6 pt-4">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {dates.map((date, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(index)}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border ${
                    selectedDate === index 
                      ? 'bg-blue-50 border-blue-500 text-[#004F7C]' 
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">{date.date}</span>
                  <span className="text-xs">{date.day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="px-6 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available slots</h4>
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((time, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTime(time)}
                  className={`px-4 py-2 rounded-lg border ${
                    selectedTime === time
                      ? 'bg-blue-50 border-blue-500 text-[#004F7C]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 pt-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              id="notes"
              placeholder="Symptoms, directions, parking notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Consent Checkbox */}
          <div className="px-6 pt-3">
            <label className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-[#0067A1] border-gray-300 rounded focus:ring-blue-500"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-700">I consent to the visit & clinic fee.</span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedTime || !consentGiven}
              className={`px-6 ${(!selectedTime || !consentGiven) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Confirm Visit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
