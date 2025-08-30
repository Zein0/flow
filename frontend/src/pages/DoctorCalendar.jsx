import { useState } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAppointments, useAppointmentCounts } from '../hooks/useAppointments';
import { useAuthStore } from '../stores/auth';

const statusColors = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function DoctorCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [clickedDate, setClickedDate] = useState(null);
  const [view, setView] = useState('week'); // 'week' or 'month'
  const { user } = useAuthStore();

  const getDateRange = () => {
    if (view === 'week') {
      return {
        start: startOfWeek(selectedDate),
        end: endOfWeek(selectedDate)
      };
    }
    return {
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate)
    };
  };

  const { start, end } = getDateRange();
  const days = eachDayOfInterval({ start, end });

  // Get appointment counts for the date range
  const { data: appointmentCounts = {} } = useAppointmentCounts(
    start, 
    end, 
    user.doctorId || user.id
  );

  // Get detailed appointments only for the clicked date
  const { data: dayAppointments = [], isLoading: isLoadingDayAppointments } = useAppointments(
    clickedDate ? { 
      date: format(clickedDate, 'yyyy-MM-dd'),
      doctorId: user.doctorId || user.id 
    } : {}
  );

  const getAppointmentCount = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return appointmentCounts[dateKey] || 0;
  };

  const handleDayClick = (day) => {
    setClickedDate(day);
  };

  const navigateDate = (direction) => {
    const amount = view === 'week' ? 7 : 30;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? amount : -amount));
    setSelectedDate(newDate);
    setClickedDate(null); // Clear selected day when navigating
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            View-only calendar of your appointments
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => {
                setView('week');
                setClickedDate(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                view === 'week' 
                  ? 'bg-primary-600 text-white border-primary-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => {
                setView('month');
                setClickedDate(null);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                view === 'month' 
                  ? 'bg-primary-600 text-white border-primary-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {view === 'week' 
            ? `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
            : format(selectedDate, 'MMMM yyyy')
          }
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setClickedDate(null);
            }}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            Today
          </button>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {view === 'week' ? (
          <div className="grid grid-cols-7 gap-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                {day}
              </div>
            ))}
            {days.map(day => {
              const appointmentCount = getAppointmentCount(day);
              const isSelected = clickedDate && isSameDay(day, clickedDate);
              return (
                <div 
                  key={day.toString()} 
                  className={`min-h-[120px] p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isToday(day) ? 'text-primary-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {appointmentCount > 0 && (
                    <div className="flex items-center justify-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {appointmentCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-7 gap-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0">
              {days.map(day => {
                const appointmentCount = getAppointmentCount(day);
                const isSelected = clickedDate && isSameDay(day, clickedDate);
                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[100px] p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? 'text-primary-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {appointmentCount > 0 && (
                      <div className="flex items-center justify-center mt-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full">
                          {appointmentCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Appointment List for Selected Day */}
      {clickedDate && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Appointments for {format(clickedDate, 'EEEE, MMMM do, yyyy')}
              </h3>
              <button
                onClick={() => setClickedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {isLoadingDayAppointments ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm">Loading appointments...</p>
              </div>
            ) : dayAppointments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No appointments scheduled</p>
                <p className="text-sm">You have no appointments for this day.</p>
              </div>
            ) : (
              dayAppointments
                .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
                .map(apt => (
                  <div key={apt.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <ClockIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(apt.startAt), 'h:mm a')} - {format(new Date(apt.endAt), 'h:mm a')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {apt.sessionType.name} (${apt.finalPrice || apt.sessionType.price})
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {apt.patient.name}
                          </span>
                          {apt.patient.phone && (
                            <span className="text-sm text-gray-500 ml-2">
                              {apt.patient.phone}
                            </span>
                          )}
                        </div>
                        
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[apt.status]}`}>
                          {apt.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {apt.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {apt.notes}
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}