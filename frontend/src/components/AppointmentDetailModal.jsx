import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useCancelAppointment } from '../hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';

export default function AppointmentDetailModal({ appointment, onClose }) {
  const [cancelling, setCancelling] = useState(false);
  const cancelMutation = useCancelAppointment();
  const queryClient = useQueryClient();

  if (!appointment) return null;

  const isFuture = new Date(appointment.startAt) > new Date();

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await cancelMutation.mutateAsync({ appointmentId: appointment.id });
      await queryClient.invalidateQueries({ queryKey: ['patient', appointment.patientId] });
      onClose();
    } catch (err) {
      console.error('Cancel failed', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900">Appointment Details</Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span> {format(new Date(appointment.startAt), 'PPP p')}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Doctor:</span> {appointment.doctor?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Session:</span> {appointment.sessionType?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Status:</span> {appointment.status}
                  </p>
                  {appointment.notes && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {appointment.notes}
                    </p>
                  )}
                </div>

                {isFuture && appointment.status !== 'cancelled' && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
                  </button>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
