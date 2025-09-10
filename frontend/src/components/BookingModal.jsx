import { Fragment, useState } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { useUIStore } from '../stores/ui';
import { useCreateAppointment, useAvailableDoctors } from '../hooks/useAppointments';
import { usePatients, useCreatePatient } from '../hooks/usePatients';

export default function BookingModal() {
  const isOpen = useUIStore(state => state.bookingModalOpen);
  const selectedDate = useUIStore(state => state.selectedDate);
  const setSelectedDate = useUIStore(state => state.setSelectedDate);
  const setBookingModalOpen = useUIStore(state => state.setBookingModalOpen);
  
  const [patientQuery, setPatientQuery] = useState('');
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);

  const { data: patients = [] } = usePatients(patientQuery);
  const { data: availableDoctors = [] } = useAvailableDoctors(selectedDate, selectedDate?.getHours());
  const timeSlots = Array.from({ length: 10 }, (_, i) => i + 8);
  const createAppointment = useCreateAppointment();
  const createPatient = useCreatePatient();

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      doctorId: '',
      sessionTypeId: '',
      notes: '',
      recurrence: false,
      endDate: ''
    }
  });

  const selectedDoctorId = watch('doctorId');
  const selectedDoctorData = availableDoctors.find(d => d.id === selectedDoctorId);

  const filteredPatients = patientQuery === ''
    ? patients
    : patients.filter(patient =>
        patient.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
        patient.phone?.includes(patientQuery) || true
      );

  const onClose = () => {
    setBookingModalOpen(false);
    setShowNewPatientForm(false);
    setPatientQuery('');
    reset();
  };

  const onSubmit = async (data) => {
    try {
      let patientId = data.patientId;
      
      // Create new patient if needed
      if (showNewPatientForm) {
        const newPatient = await createPatient.mutateAsync({
          name: data.newPatientName,
          phone: data.newPatientPhone,
          notes: data.newPatientNotes
        });
        patientId = newPatient.id;
      }

      const appointmentData = {
        patientId,
        doctorId: data.doctorId,
        sessionTypeId: data.sessionTypeId,
        startAt: selectedDate.toISOString(),
        notes: data.notes
      };

      await createAppointment.mutateAsync(appointmentData);
      
      // Handle recurrence if selected
      if (data.recurrence && data.endDate) {
        // TODO: Implement recurrence creation
        console.log('Creating recurrence until', data.endDate);
      }

      onClose();
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-md sm:max-w-lg lg:max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Book Appointment
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        newDate.setHours(selectedDate.getHours(), 0, 0, 0);
                        setSelectedDate(newDate);
                      }}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <select
                      value={selectedDate.getHours()}
                      onChange={(e) => {
                        const newDate = new Date(selectedDate);
                        newDate.setHours(parseInt(e.target.value), 0, 0, 0);
                        setSelectedDate(newDate);
                      }}
                      className="input"
                    >
                      {timeSlots.map(hour => (
                        <option key={hour} value={hour}>
                          {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
                    {!showNewPatientForm ? (
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patient
                        </label>
                        <Controller
                          name="patientId"
                          control={control}
                          rules={{ required: 'Patient is required' }}
                          render={({ field }) => (
                            <Combobox value={field.value} onChange={field.onChange}>
                              <div className='relative'>
                                <Combobox.Input
                                  className="input pr-10"
                                  displayValue={(patientId) => 
                                    patients.find(p => p.id === patientId)?.name || ''
                                  }
                                  onChange={(event) => setPatientQuery(event.target.value)}
                                  placeholder="Search patients..."
                                />
                                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                  <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                </Combobox.Button>
                              </div>
                              <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                              >
                                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none left-0 right-0">
                                  {filteredPatients.map((patient) => (
                                    <Combobox.Option
                                      key={patient.id}
                                      className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                          active ? 'bg-primary-600 text-white' : 'text-gray-900'
                                        }`
                                      }
                                      value={patient.id}
                                    >
                                      {({ selected, active }) => (
                                        <>
                                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                            {patient.name}
                                          </span>
                                          {patient.phone && (
                                            <span className={`block text-sm ${active ? 'text-primary-200' : 'text-gray-500'}`}>
                                              {patient.phone}
                                            </span>
                                          )}
                                          {selected && (
                                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                              active ? 'text-white' : 'text-primary-600'
                                            }`}>
                                              <CheckIcon className="w-5 h-5" />
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </Combobox.Option>
                                  ))}
                                  <div className="border-t border-gray-200 mt-1 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowNewPatientForm(true);
                                        if (patientQuery) {
                                          reset({ ...watch(), newPatientName: patientQuery });
                                        }
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                                    >
                                      + Create new patient{patientQuery ? `: "${patientQuery}"` : ''}
                                    </button>
                                  </div>
                                </Combobox.Options>
                              </Transition>
                            </Combobox>
                          )}
                        />
                        {errors.patientId && (
                          <p className="mt-1 text-sm text-red-600">{errors.patientId.message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">New Patient</h4>
                          <button
                            type="button"
                            onClick={() => setShowNewPatientForm(false)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Select Existing
                          </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <input
                            {...register('newPatientName', { required: 'Name is required' })}
                            className="input"
                            placeholder="Patient name"
                          />
                          <input
                            {...register('newPatientPhone')}
                            className="input"
                            placeholder="Phone number"
                          />
                        </div>
                        <textarea
                          {...register('newPatientNotes')}
                          className="input"
                          rows={2}
                          placeholder="Notes"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Doctors
                      </label>
                      <select
                        {...register('doctorId', { required: 'Doctor is required' })}
                        className="input"
                        onChange={(e) => {
                          register('doctorId').onChange(e);
                          reset({ ...watch(), sessionTypeId: '' });
                        }}
                      >
                        <option value="">Select doctor</option>
                        {availableDoctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id}>
                            Dr. {doctor.name} {doctor.specialty && `(${doctor.specialty})`}
                          </option>
                        ))}
                      </select>
                      {errors.doctorId && (
                        <p className="mt-1 text-sm text-red-600">{errors.doctorId.message}</p>
                      )}
                    </div>

                    {selectedDoctorData && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Session Type
                        </label>
                        <select
                          {...register('sessionTypeId', { required: 'Session type is required' })}
                          className="input"
                        >
                          <option value="">Select session type</option>
                          {selectedDoctorData.sessionLists.map(sessionList => (
                            <option key={sessionList.id} value={sessionList.sessionTypeId}>
                              {sessionList.sessionType.name} - ${sessionList.customPrice || sessionList.sessionType.price}
                            </option>
                          ))}
                        </select>
                        {errors.sessionTypeId && (
                          <p className="mt-1 text-sm text-red-600">{errors.sessionTypeId.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      {...register('notes')}
                      className="input"
                      rows={3}
                      placeholder="Appointment notes"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register('recurrence')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label className="text-sm text-gray-700">
                        Reserve always (weekly recurrence)
                      </label>
                    </div>

                    {watch('recurrence') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          {...register('endDate', { 
                            required: watch('recurrence') ? 'End date is required for recurrence' : false 
                          })}
                          type="date"
                          className="input"
                        />
                        {errors.endDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-secondary order-2 sm:order-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createAppointment.isPending}
                      className="btn-primary order-1 sm:order-2"
                    >
                      {createAppointment.isPending ? 'Booking...' : 'Book Appointment'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}