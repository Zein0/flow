import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlusIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { usePatients, useCreatePatient } from '../hooks/usePatients';
import { useForm } from 'react-hook-form';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  
  const { data: patients = [], isLoading } = usePatients(search);
  const createPatient = useCreatePatient();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      await createPatient.mutateAsync(data);
      reset();
      setShowNewForm(false);
    } catch (error) {
      console.error('Failed to create patient:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage patient information and history
          </p>
        </div>
        
        <button
          onClick={() => setShowNewForm(true)}
          className="btn-primary mt-4 sm:mt-0"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Patient
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder="Search patients by name or phone..."
        />
      </div>

      {showNewForm && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">New Patient</h3>
              <button
                onClick={() => setShowNewForm(false)}
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
                  placeholder="Patient name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="input"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...register('notes')}
                  className="input"
                  rows={3}
                  placeholder="Patient notes"
                />
              </div>
              <div className="flex items-center">
                <input
                  {...register('insurance')}
                  type="checkbox"
                  id="insurance"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="insurance" className="ml-2 block text-sm text-gray-700">
                  Has Insurance Coverage
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPatient.isPending}
                  className="btn-primary"
                >
                  {createPatient.isPending ? 'Creating...' : 'Create Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="card-body">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {search ? 'No patients found matching your search.' : 'No patients yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map(patient => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="card hover:shadow-soft-lg transition-shadow"
              >
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {patient.name}
                    </h3>
                    {patient.insurance && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Insurance
                      </span>
                    )}
                  </div>
                  {patient.phone && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <PhoneIcon className="w-4 h-4 mr-1" />
                      {patient.phone}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Transactions:</span>
                    <span className="font-medium">{patient._count?.ledgers || 0}</span>
                  </div>
                  {patient.creditBalance > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Credit:</span>
                      <span className="font-medium text-green-600">${patient.creditBalance.toFixed(2)}</span>
                    </div>
                  )}
                  {patient.notes && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                      {patient.notes}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}