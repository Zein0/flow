import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAvailability, useAppointments } from '../hooks/useAppointments';
import { useUIStore } from '../stores/ui';

const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 6 PM

export default function CalendarGrid() {
  const selectedDate = useUIStore(state => state.selectedDate);
  const selectedDoctor = useUIStore(state => state.selectedDoctor);
  const setBookingModalOpen = useUIStore(state => state.setBookingModalOpen);
  
  const { data: availability = [] } = useAvailability(selectedDate, selectedDoctor?.id);
  const { data: appointments = [] } = useAppointments({
    date: format(selectedDate, 'yyyy-MM-dd'),
    ...(selectedDoctor?.id && { doctorId: selectedDoctor.id })
  });

  const getAppointmentsForHour = (hour) => {
    return appointments.filter(apt => 
      new Date(apt.startAt).getHours() === hour && apt.status !== 'cancelled'
    );
  };

  const getAvailabilityForHour = (hour) => {
    return availability.find(avail => avail.hour === hour) || {
      globalCapacity: 6,
      doctorAvailable: true,
      available: true
    };
  };

  const handleSlotClick = (hour) => {
    const avail = getAvailabilityForHour(hour);
    if (avail.available) {
      useUIStore.setState({
        selectedDate: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour),
        bookingModalOpen: true
      });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">
          {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          {selectedDoctor && (
            <span className="ml-2 text-sm text-gray-500">
              - Dr. {selectedDoctor.name}
            </span>
          )}
        </h3>
      </div>
      <div className="card-body p-0">
        <div className="divide-y divide-gray-200">
          {timeSlots.map(hour => {
            const hourAppointments = getAppointmentsForHour(hour);
            const availability = getAvailabilityForHour(hour);
            const isAvailable = availability.available;
            
            return (
              <div key={hour} className="flex items-center min-h-[4rem] hover:bg-gray-50">
                <div className="w-20 px-4 py-3 text-sm font-medium text-gray-500 border-r border-gray-200">
                  {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                </div>
                
                <div className="flex-1 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        Capacity: {availability.globalCapacity}/6
                      </span>
                      {!availability.doctorAvailable && selectedDoctor && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Doctor Busy
                        </span>
                      )}
                    </div>
                    {isAvailable && (
                      <button
                        onClick={() => handleSlotClick(hour)}
                        className="inline-flex items-center p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
                        title="Book appointment"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {hourAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        className={`p-3 rounded-lg border ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-50 border-green-200' 
                            : appointment.status === 'cancelled'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {appointment.patient.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Dr. {appointment.doctor.name} • {appointment.sessionType.name}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {hourAppointments.length === 0 && !isAvailable && (
                    <div className="text-center py-4 text-gray-400">
                      No slots available
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}