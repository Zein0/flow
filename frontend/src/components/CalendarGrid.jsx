import { format } from 'date-fns';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAvailability, useAppointments } from '../hooks/useAppointments';
import { useUIStore } from '../stores/ui';

// Generate 30-minute time slots from 8 AM to 6 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour < 18; hour++) {
    slots.push({ hour, minute: 0 });
    slots.push({ hour, minute: 30 });
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function CalendarGrid() {
  const selectedDate = useUIStore(state => state.selectedDate);
  const selectedDoctor = useUIStore(state => state.selectedDoctor);
  const setBookingModalOpen = useUIStore(state => state.setBookingModalOpen);

  const { data: availability = [] } = useAvailability(selectedDate, selectedDoctor?.id);
  const { data: appointments = [] } = useAppointments({
    date: format(selectedDate, 'yyyy-MM-dd'),
    ...(selectedDoctor?.id && { doctorId: selectedDoctor.id })
  });

  // Filter out cancelled appointments
  const activeAppointments = appointments.filter(apt => apt.status !== 'cancelled');

  // Get all appointments that START at this specific time slot
  const getAppointmentsStartingAtSlot = (hour, minute) => {
    return activeAppointments.filter(apt => {
      const aptStart = new Date(apt.startAt);
      return aptStart.getHours() === hour && aptStart.getMinutes() === minute;
    });
  };

  const getAvailabilityForSlot = (hour, minute) => {
    return availability.find(avail => avail.hour === hour && avail.minute === minute) || {
      globalCapacity: 0,
      doctorAvailable: true,
      available: true
    };
  };

  const getAppointmentDuration = (appointment) => {
    const start = new Date(appointment.startAt);
    const end = new Date(appointment.endAt);
    return (end - start) / (1000 * 60); // Duration in minutes
  };

  const handleSlotClick = (hour, minute) => {
    const avail = getAvailabilityForSlot(hour, minute);
    if (avail.available) {
      const slotDate = new Date(selectedDate);
      slotDate.setHours(hour, minute, 0, 0);
      useUIStore.setState({
        selectedDate: slotDate,
        bookingModalOpen: true
      });
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-base sm:text-lg font-medium text-gray-900">
          {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          {selectedDoctor && (
            <span className="ml-2 text-sm text-gray-500">
              - Dr. {selectedDoctor.name}
            </span>
          )}
        </h3>
      </div>
      <div className="card-body p-0 overflow-x-auto">
        <div className="divide-y divide-gray-200 min-w-[640px]">
          {timeSlots.map(({ hour, minute }) => {
            const appointmentsStartingHere = getAppointmentsStartingAtSlot(hour, minute);
            const slotAvailability = getAvailabilityForSlot(hour, minute);
            const isAvailable = slotAvailability.available;

            return (
              <div key={`${hour}-${minute}`} className="flex items-stretch min-h-[4rem] hover:bg-gray-50">
                <div className="w-16 sm:w-20 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-500 border-r border-gray-200 flex items-start">
                  {format(new Date().setHours(hour, minute, 0, 0), 'h:mm a')}
                </div>

                <div className="flex-1 px-2 sm:px-4 py-2 sm:py-3">
                  {appointmentsStartingHere.length > 0 ? (
                    <div className="space-y-2">
                      {appointmentsStartingHere.map(appointment => {
                        const duration = getAppointmentDuration(appointment);

                        return (
                          <div
                            key={appointment.id}
                            className={`p-2 sm:p-3 rounded-lg border ${
                              appointment.status === 'confirmed'
                                ? 'bg-green-50 border-green-200'
                                : appointment.status === 'cancelled'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {appointment.patient.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  Dr. {appointment.doctor.name} • {appointment.sessionType.name}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {format(new Date(appointment.startAt), 'h:mm a')} - {format(new Date(appointment.endAt), 'h:mm a')}
                                  {duration === 60 && <span className="ml-1">(60 min)</span>}
                                  {duration === 30 && <span className="ml-1">(30 min)</span>}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 self-start sm:self-auto ${
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
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          Capacity: {slotAvailability.globalCapacity}/6
                        </span>
                        {!slotAvailability.doctorAvailable && selectedDoctor && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Doctor Busy
                          </span>
                        )}
                      </div>
                      {isAvailable && (
                        <button
                          onClick={() => handleSlotClick(hour, minute)}
                          className="inline-flex items-center p-1 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
                          title="Book appointment"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      )}
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
