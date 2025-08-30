import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useUIStore } from '../stores/ui';
import { useDoctors } from '../hooks/useDoctors';
import CalendarGrid from '../components/CalendarGrid';
import BookingModal from '../components/BookingModal';

export default function Calendar() {
  const selectedDate = useUIStore(state => state.selectedDate);
  const selectedDoctor = useUIStore(state => state.selectedDoctor);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const setSelectedDoctor = useUIStore(state => state.setSelectedDoctor);
  
  const { data: doctors = [] } = useDoctors();

  const navigateDate = (direction) => {
    const newDate = direction === 'prev' 
      ? subDays(selectedDate, 1) 
      : addDays(selectedDate, 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage appointments and availability
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedDoctor?.id || ''}
            onChange={(e) => {
              const doctor = doctors.find(d => d.id === e.target.value);
              setSelectedDoctor(doctor || null);
            }}
            className="input max-w-xs"
          >
            <option value="">All Doctors</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateDate('prev')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Previous
        </button>
        
        <div className="text-center">
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="text-lg font-semibold text-gray-900 bg-transparent border-none text-center cursor-pointer hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
          />
        </div>
        
        <button
          onClick={() => navigateDate('next')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Next
          <ChevronRightIcon className="w-4 h-4 ml-1" />
        </button>
      </div>

      <CalendarGrid />
      <BookingModal />
    </div>
  );
}