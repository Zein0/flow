import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  useDoctors,
  useAddDoctorSession,
  useAddAllDoctorSessions,
  useUpdateDoctorSession,
  useDeleteDoctorSession,
} from '../hooks/useDoctors';
import { useSessionTypes } from '../hooks/useSessionTypes';
import { useAuthStore } from '../stores/auth';
import api from '../utils/api';

export default function DoctorDetail() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [editingSession, setEditingSession] = useState(null);
  const [showAddSession, setShowAddSession] = useState(false);

  const {
    register: registerSession,
    handleSubmit: handleSessionSubmit,
    reset: resetSession,
    setValue: setSessionValue,
    formState: { errors: sessionErrors },
  } = useForm();

  // Fetch all doctors (reuse cached query) and pick this one
  const { data: doctors = [], isLoading } = useDoctors();
  const doctor = doctors.find((d) => d.id === doctorId);

  const { data: sessionTypes = [] } = useSessionTypes();
  const addSession = useAddDoctorSession();
  const addAllSessions = useAddAllDoctorSessions();
  const updateSession = useUpdateDoctorSession();
  const deleteSession = useDeleteDoctorSession();

  const handleAddAll = async () => {
    await addAllSessions.mutateAsync(doctorId);
    await queryClient.refetchQueries({ queryKey: ['doctors'] });
  };

  const onSessionSubmit = async (data) => {
    try {
      if (editingSession) {
        await updateSession.mutateAsync({
          doctorId,
          sessionListId: editingSession.id,
          customPrice: data.customPrice ? parseFloat(data.customPrice) : null,
        });
        setEditingSession(null);
      } else {
        await addSession.mutateAsync({
          doctorId,
          sessionTypeId: data.sessionTypeId,
          customPrice: data.customPrice ? parseFloat(data.customPrice) : null,
        });
        setShowAddSession(false);
      }
      resetSession();
      await queryClient.refetchQueries({ queryKey: ['doctors'] });
    } catch (error) {
      console.error('Session operation failed:', error);
    }
  };

  const handleDeleteSession = async (sessionListId) => {
    if (confirm('Remove this session from the doctor?')) {
      await deleteSession.mutateAsync({ doctorId, sessionListId });
      await queryClient.refetchQueries({ queryKey: ['doctors'] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Doctor not found.</p>
        <button onClick={() => navigate('/doctors')} className="text-primary-600 hover:underline mt-2 text-sm">
          Back to Doctors
        </button>
      </div>
    );
  }

  const availableToAdd = sessionTypes.filter(
    (st) => st.active && !doctor.sessionLists?.some((sl) => sl.sessionTypeId === st.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/doctors')}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dr. {doctor.name}</h1>
              <div className="flex items-center space-x-3 mt-0.5">
                {doctor.specialty && (
                  <span className="text-sm text-gray-500">{doctor.specialty}</span>
                )}
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    doctor.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {doctor.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate(`/doctors/${doctorId}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Doctor
          </button>
        )}
      </div>

      {/* Sessions Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sessions Offered</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {doctor.sessionLists?.length || 0} session{doctor.sessionLists?.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddAll}
                disabled={addAllSessions.isPending || availableToAdd.length === 0}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                {addAllSessions.isPending ? 'Adding...' : 'Add All'}
              </button>
              <button
                onClick={() => {
                  setShowAddSession(true);
                  setEditingSession(null);
                  resetSession();
                }}
                disabled={availableToAdd.length === 0}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                Add Session
              </button>
            </div>
          )}
        </div>

        {/* Add / Edit Session Form */}
        {(showAddSession || editingSession) && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <form onSubmit={handleSessionSubmit(onSessionSubmit)} className="flex flex-col sm:flex-row items-end gap-3">
              {!editingSession && (
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Session Type</label>
                  <select
                    {...registerSession('sessionTypeId', { required: 'Required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onChange={(e) => {
                      const st = sessionTypes.find((t) => t.id === e.target.value);
                      if (st) setSessionValue('customPrice', st.price);
                      registerSession('sessionTypeId').onChange(e);
                    }}
                  >
                    <option value="">Select...</option>
                    {availableToAdd.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — ${st.price}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={editingSession ? 'flex-1 w-full' : 'w-full sm:w-40'}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {editingSession ? `Price for ${editingSession.sessionType.name}` : 'Custom Price'}
                </label>
                <input
                  {...registerSession('customPrice')}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Default"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={addSession.isPending || updateSession.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {editingSession
                    ? updateSession.isPending ? 'Saving...' : 'Save'
                    : addSession.isPending ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSession(false);
                    setEditingSession(null);
                    resetSession();
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions Table */}
        {doctor.sessionLists?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {doctor.sessionLists.map((sl) => (
                  <tr key={sl.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sl.sessionType.name}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      ${sl.sessionType.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(sl.customPrice ?? sl.sessionType.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {sl.sessionType.durationMinutes} min
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => {
                            setEditingSession(sl);
                            setShowAddSession(false);
                            setSessionValue('customPrice', sl.customPrice ?? sl.sessionType.price);
                          }}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          <PencilIcon className="h-3.5 w-3.5 mr-1" />
                          Price
                        </button>
                        <button
                          onClick={() => handleDeleteSession(sl.id)}
                          disabled={deleteSession.isPending}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <TrashIcon className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <UserIcon className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No sessions configured yet.</p>
            {isAdmin && (
              <button
                onClick={handleAddAll}
                disabled={addAllSessions.isPending}
                className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200"
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                {addAllSessions.isPending ? 'Adding...' : 'Add All Active Sessions'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
