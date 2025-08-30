import { useState } from 'react';
import { PlusIcon, PencilIcon, EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '../utils/api';

export default function Services() {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['session-types'],
    queryFn: async () => {
      const response = await api.get('/session-types');
      return response.data;
    }
  });

  // Create/Update service
  const saveServiceMutation = useMutation({
    mutationFn: async (serviceData) => {
      if (editingService) {
        const response = await api.put(`/session-types/${editingService.id}`, serviceData);
        return response.data;
      } else {
        const response = await api.post('/session-types', serviceData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-types'] });
      toast.success(editingService ? 'Service updated' : 'Service created');
      setShowModal(false);
      setEditingService(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to save service');
    }
  });

  // Toggle service active status
  const toggleServiceMutation = useMutation({
    mutationFn: async ({ serviceId, active }) => {
      const response = await api.put(`/session-types/${serviceId}`, { active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-types'] });
      toast.success('Service status updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update service');
    }
  });

  const handleEdit = (service) => {
    setEditingService(service);
    reset({
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes
    });
    setShowModal(true);
  };

  const handleToggleActive = (service) => {
    toggleServiceMutation.mutate({
      serviceId: service.id,
      active: !service.active
    });
  };

  const onSubmit = (data) => {
    saveServiceMutation.mutate({
      name: data.name,
      price: parseFloat(data.price),
      durationMinutes: parseInt(data.durationMinutes)
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    reset();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage clinic services and pricing
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Service
        </button>
      </div>

      {/* Services List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {services.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <PlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No services found</p>
            <p className="text-sm">Create your first service to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
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
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${service.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {service.durationMinutes} min
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        service.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {service.active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(service)}
                        disabled={toggleServiceMutation.isPending}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          service.active
                            ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 focus:ring-gray-500'
                            : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                        }`}
                      >
                        {service.active ? (
                          <>
                            <EyeSlashIcon className="h-4 w-4 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Show
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <input
                  {...register('name', { required: 'Service name is required' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Consultation, X-Ray, etc."
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0.01, message: 'Price must be greater than 0' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  {...register('durationMinutes', { 
                    required: 'Duration is required',
                    min: { value: 1, message: 'Duration must be at least 1 minute' }
                  })}
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="60"
                />
                {errors.durationMinutes && (
                  <p className="mt-1 text-sm text-red-600">{errors.durationMinutes.message}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saveServiceMutation.isPending}
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {saveServiceMutation.isPending 
                    ? (editingService ? 'Updating...' : 'Creating...') 
                    : (editingService ? 'Update Service' : 'Create Service')
                  }
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}