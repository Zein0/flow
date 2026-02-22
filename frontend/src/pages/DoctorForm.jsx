import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useDoctors, useCreateDoctor, useUpdateDoctor } from '../hooks/useDoctors';

export default function DoctorForm() {
  const { doctorId } = useParams(); // undefined when creating
  const isEdit = Boolean(doctorId);
  const navigate = useNavigate();

  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();
  const doctor = isEdit ? doctors.find((d) => d.id === doctorId) : null;

  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Pre-fill form when editing
  useEffect(() => {
    if (isEdit && doctor) {
      reset({
        name: doctor.name,
        specialty: doctor.specialty || '',
        active: doctor.active,
      });
    }
  }, [isEdit, doctor, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateDoctor.mutateAsync({ doctorId, ...data });
        navigate(`/doctors/${doctorId}`);
      } else {
        const created = await createDoctor.mutateAsync(data);
        navigate('/doctors');
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  if (doctorsLoading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isEdit && !doctor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Doctor not found.</p>
        <button onClick={() => navigate('/doctors')} className="text-primary-600 hover:underline mt-2 text-sm">
          Back to Doctors
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(isEdit ? `/doctors/${doctorId}` : '/doctors')}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `Edit Dr. ${doctor?.name}` : 'Add New Doctor'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit ? 'Update doctor information' : 'Create a new doctor profile and login account'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-gray-200">
          {/* Name */}
          <div className="px-6 py-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Salam El Baba"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Email & Password — only when creating */}
          {!isEdit && (
            <>
              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                  })}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="doctor@clinic.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'At least 6 characters' },
                  })}
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Min 6 characters"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            </>
          )}

          {/* Password change — only when editing */}
          {isEdit && (
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password <span className="text-xs text-gray-400">(leave blank to keep current)</span>
              </label>
              <input
                {...register('password', {
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter new password"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>
          )}

          {/* Specialty */}
          <div className="px-6 py-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialty</label>
            <input
              {...register('specialty')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., General Practice, Physiotherapy"
            />
          </div>

          {/* Active toggle */}
          <div className="px-6 py-5">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                {...register('active')}
                type="checkbox"
                defaultChecked={isEdit ? doctor?.active : true}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Active</span>
                <p className="text-xs text-gray-400">Inactive doctors won't appear in booking</p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/doctors/${doctorId}` : '/doctors')}
              className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDoctor.isPending || updateDoctor.isPending}
              className="px-5 py-2 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isEdit
                ? updateDoctor.isPending ? 'Saving...' : 'Save Changes'
                : createDoctor.isPending ? 'Creating...' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
