import { useState } from 'react';
import { PlusIcon, UserIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useDoctors, useCreateDoctor, useUpdateDoctor, useAddDoctorSession, useUpdateDoctorSession, useDeleteDoctorSession } from '../hooks/useDoctors';
import { useSessionTypes } from '../hooks/useSessionTypes';
import { useAuthStore } from '../stores/auth';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

export default function Doctors() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [managingSessions, setManagingSessions] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  
  const { data: doctors = [], isLoading } = useDoctors();
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const addSession = useAddDoctorSession();
  const updateSession = useUpdateDoctorSession();
  const deleteSession = useDeleteDoctorSession();
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const { register: registerSession, handleSubmit: handleSessionSubmit, reset: resetSession, setValue: setSessionValue, formState: { errors: sessionErrors } } = useForm();

  const { data: sessionTypes = [] } = useSessionTypes();

  const onSubmit = async (data) => {
    try {
      if (editingDoctor) {
        await updateDoctor.mutateAsync({ doctorId: editingDoctor.id, ...data });
        setEditingDoctor(null);
      } else {
        await createDoctor.mutateAsync(data);
        setShowNewForm(false);
      }
      reset();
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const onSessionSubmit = async (data) => {
    try {
      if (editingSession) {
        await updateSession.mutateAsync({
          doctorId: managingSessions.id,
          sessionListId: editingSession.id,
          customPrice: data.customPrice ? parseFloat(data.customPrice) : null
        });
        setEditingSession(null);
      } else {
        await addSession.mutateAsync({
          doctorId: managingSessions.id,
          sessionTypeId: data.sessionTypeId,
          customPrice: data.customPrice ? parseFloat(data.customPrice) : null
        });
      }
      resetSession();
      // Force refresh doctors data and update managingSessions
      await queryClient.refetchQueries({ queryKey: ['doctors'] });
      const refreshedDoctors = queryClient.getQueryData(['doctors']);
      const updatedDoctor = refreshedDoctors?.find(d => d.id === managingSessions.id);
      if (updatedDoctor) {
        setManagingSessions(updatedDoctor);
      }
    } catch (error) {
      console.error('Session operation failed:', error);
    }
  };

  const startEdit = (doctor) => {
    setEditingDoctor(doctor);
    setValue('name', doctor.name);
    setValue('specialty', doctor.specialty || '');
    setValue('active', doctor.active);
    setShowNewForm(true);
  };

  const startEditSession = (session) => {
    setEditingSession(session);
    setSessionValue('customPrice', session.customPrice || '');
  };

  const handleDeleteSession = async (sessionListId) => {
    if (confirm('Are you sure you want to remove this session?')) {
      await deleteSession.mutateAsync({
        doctorId: managingSessions.id,
        sessionListId
      });
      // Force refresh and update managingSessions immediately
      await queryClient.refetchQueries({ queryKey: ['doctors'] });
      const refreshedDoctors = queryClient.getQueryData(['doctors']);
      const updatedDoctor = refreshedDoctors?.find(d => d.id === managingSessions.id);
      if (updatedDoctor) {
        setManagingSessions(updatedDoctor);
      }
    }
  };

  const cancelEdit = () => {
    setEditingDoctor(null);
    setShowNewForm(false);
    reset();
  };

  const cancelSessionManagement = () => {
    setManagingSessions(null);
    setEditingSession(null);
    resetSession();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage doctor profiles and their session offerings
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary mt-4 sm:mt-0"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Doctor
          </button>
        )}
      </div>

      {showNewForm && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDoctor ? 'Edit Doctor' : 'New Doctor'}
              </h3>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="input"
                  placeholder="Doctor name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              {!editingDoctor && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: 'Invalid email address'
                        }
                      })}
                      type="email"
                      className="input"
                      placeholder="doctor@clinic.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      })}
                      type="password"
                      className="input"
                      placeholder="Enter password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>
                </>
              )}
              {editingDoctor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (optional)
                  </label>
                  <input
                    {...register('password', { 
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    type="password"
                    className="input"
                    placeholder="Leave blank to keep current password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty
                </label>
                <input
                  {...register('specialty')}
                  className="input"
                  placeholder="Medical specialty"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  {...register('active')}
                  type="checkbox"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDoctor.isPending || updateDoctor.isPending}
                  className="btn-primary"
                >
                  {editingDoctor 
                    ? (updateDoctor.isPending ? 'Updating...' : 'Update Doctor')
                    : (createDoctor.isPending ? 'Creating...' : 'Create Doctor')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingSessions && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Manage Sessions - Dr. {managingSessions.name}
              </h3>
              <button
                onClick={cancelSessionManagement}
                className="text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
          </div>
          <div className="card-body space-y-4">
            <form onSubmit={handleSessionSubmit(onSessionSubmit)} className="space-y-4">
              {!editingSession && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Session Type
                  </label>
                  <select
                    {...registerSession('sessionTypeId', { required: 'Session type is required' })}
                    className="input"
                    onChange={(e) => {
                      const selectedType = sessionTypes.find(type => type.id === e.target.value);
                      if (selectedType) {
                        setSessionValue('customPrice', selectedType.price);
                      }
                      registerSession('sessionTypeId').onChange(e);
                    }}
                  >
                    <option value="">Select session type</option>
                    {sessionTypes
                      .filter(type => !managingSessions.sessionLists?.some(sl => sl.sessionTypeId === type.id))
                      .map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} (Default: ${type.price})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Price (optional)
                </label>
                <input
                  {...registerSession('customPrice')}
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="Leave blank for default price"
                />
              </div>
              <div className="flex justify-end space-x-3">
                {editingSession && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSession(null);
                      resetSession();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={addSession.isPending || updateSession.isPending}
                  className="btn-primary"
                >
                  {editingSession 
                    ? (updateSession.isPending ? 'Updating...' : 'Update Price')
                    : (addSession.isPending ? 'Adding...' : 'Add Session')
                  }
                </button>
              </div>
            </form>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Sessions</h4>
              <div className="space-y-2">
                {managingSessions.sessionLists?.map(sessionList => (
                  <div key={sessionList.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{sessionList.sessionType.name}</span>
                      <span className="ml-2 text-gray-600">
                        ${sessionList.customPrice || sessionList.sessionType.price}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditSession(sessionList)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(sessionList.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {managingSessions.sessionLists?.length === 0 && (
                  <p className="text-sm text-gray-500">No sessions configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : doctors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No doctors found.</p>
          </div>
        ) : (
          doctors.map(doctor => (
            <div key={doctor.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Dr. {doctor.name}
                      </h3>
                      {doctor.specialty && (
                        <p className="text-sm text-gray-500">{doctor.specialty}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      doctor.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {doctor.active ? 'Active' : 'Inactive'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => startEdit(doctor)}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Sessions Offered
                  </h4>
                  {doctor.sessionLists?.length > 0 ? (
                    <div className="space-y-1">
                      {doctor.sessionLists.map(sessionList => (
                        <div key={sessionList.id} className="flex justify-between text-sm">
                          <span>{sessionList.sessionType.name}</span>
                          <span className="font-medium">
                            ${sessionList.customPrice || sessionList.sessionType.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No sessions configured</p>
                  )}
                  
                  {isAdmin && (
                    <button
                      onClick={() => setManagingSessions(doctor)}
                      className="text-xs text-primary-600 hover:text-primary-700 mt-2"
                    >
                      Manage Sessions
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}