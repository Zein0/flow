import { useState } from 'react';
import { format } from 'date-fns';
import { CheckIcon, XMarkIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAppointments, useConfirmAppointment, useCancelAppointment } from '../hooks/useAppointments';

const statusColors = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-gray-100 text-gray-800'
};

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStatus, setSelectedStatus] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cancelReason, setCancelReason] = useState('');

  const filters = {
    ...(selectedDate && { date: selectedDate }),
    ...(selectedStatus && { status: selectedStatus })
  };

  const { data: appointments = [], isLoading } = useAppointments(filters);
  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();

  const handleConfirm = async (appointmentId) => {
    try {
      await confirmMutation.mutateAsync({
        appointmentId,
        finalPrice: paymentMethod === 'cash' && finalPrice ? parseFloat(finalPrice) : undefined,
        paymentMethod
      });
      setConfirmingId(null);
      setFinalPrice('');
      setPaymentMethod('cash');
    } catch (error) {
      console.error('Failed to confirm appointment:', error);
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      await cancelMutation.mutateAsync({
        appointmentId,
        reason: cancelReason
      });
      setCancellingId(null);
      setCancelReason('');
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No appointments found</p>
            <p className="text-sm">Try adjusting your filters or selecting a different date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide" style={{maxWidth: '100vw'}}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patient.name}
                          </div>
                          {appointment.patient.phone && (
                            <div className="text-sm text-gray-500">
                              {appointment.patient.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.doctor.name}
                      </div>
                      {appointment.doctor.specialty && (
                        <div className="text-sm text-gray-500">
                          {appointment.doctor.specialty}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {format(new Date(appointment.startAt), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                        {format(new Date(appointment.startAt), 'HH:mm')} - {format(new Date(appointment.endAt), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.sessionType.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${appointment.finalPrice || appointment.sessionType.price}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[appointment.status]}`}>
                        {appointment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {appointment.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => setConfirmingId(appointment.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Confirm & Pay
                          </button>
                          <button
                            onClick={() => setCancellingId(appointment.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmingId && (() => {
        const appointment = appointments.find(a => a.id === confirmingId);
        const patient = appointment?.patient;
        const sessionType = appointment?.sessionType;

        // Check if patient has service credits for this session type
        const hasCredits = patient?.creditsSummary?.some(
          c => c.sessionTypeId === sessionType?.id && c.quantity > 0
        );

        return (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Appointment & Record Payment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">Pay with Cash</span>
                    </label>
                    {hasCredits && (
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="service_credit"
                          checked={paymentMethod === 'service_credit'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          Use Service Credit
                          <span className="ml-1 text-indigo-600 font-medium">
                            ({patient.creditsSummary.find(c => c.sessionTypeId === sessionType.id)?.quantity} available)
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Final Price (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                      placeholder="Leave blank to use default price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                {paymentMethod === 'service_credit' && (
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-sm text-indigo-800">
                      This appointment will be paid with 1 service credit for {sessionType?.name}.
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleConfirm(confirmingId)}
                    disabled={confirmMutation.isPending}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {confirmMutation.isPending ? 'Confirming...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingId(null);
                      setFinalPrice('');
                      setPaymentMethod('cash');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Modal */}
      {cancellingId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleCancel(cancellingId)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
                <button
                  onClick={() => {
                    setCancellingId(null);
                    setCancelReason('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Keep Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}