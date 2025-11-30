import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

export default function Bundles() {
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      price: '',
      active: true,
      items: [{ sessionTypeId: '', quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Fetch bundles
  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['bundles', showActiveOnly],
    queryFn: async () => {
      const response = await api.get(`/bundles${showActiveOnly ? '?active=true' : ''}`);
      return response.data;
    }
  });

  // Fetch session types
  const { data: sessionTypes = [] } = useQuery({
    queryKey: ['sessionTypes'],
    queryFn: async () => {
      const response = await api.get('/session-types');
      return response.data;
    }
  });

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/bundles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle created successfully');
      reset();
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create bundle');
    }
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/bundles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle updated successfully');
      reset();
      setEditingBundle(null);
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update bundle');
    }
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/bundles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete bundle');
    }
  });

  const onSubmit = (data) => {
    const bundleData = {
      name: data.name,
      price: parseFloat(data.price),
      active: data.active,
      items: data.items.map(item => ({
        sessionTypeId: item.sessionTypeId,
        quantity: parseInt(item.quantity)
      }))
    };

    if (editingBundle) {
      updateBundleMutation.mutate({ id: editingBundle.id, data: bundleData });
    } else {
      createBundleMutation.mutate(bundleData);
    }
  };

  const handleEdit = (bundle) => {
    setEditingBundle(bundle);
    reset({
      name: bundle.name,
      price: bundle.price,
      active: bundle.active,
      items: bundle.items.map(item => ({
        sessionTypeId: item.sessionTypeId,
        quantity: item.quantity
      }))
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this bundle?')) {
      deleteBundleMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBundle(null);
    reset();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bundles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage service bundles
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active only</span>
          </label>

          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Bundle
          </button>
        </div>
      </div>

      {bundles.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500">No bundles found</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-4"
            >
              Create your first bundle
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {bundles.map(bundle => (
            <div key={bundle.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {bundle.name}
                      </h3>
                      {!bundle.active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="text-2xl font-bold text-primary-600 mt-2">
                      ${bundle.price.toFixed(2)}
                    </p>

                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Includes:</p>
                      <ul className="space-y-1">
                        {bundle.items.map(item => (
                          <li key={item.id} className="text-sm text-gray-600">
                            {item.quantity}x {item.sessionType.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(bundle)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(bundle.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bundle Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleCancel} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={handleCancel}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {editingBundle ? 'Edit Bundle' : 'Create New Bundle'}
                  </h3>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bundle Name *
                      </label>
                      <input
                        {...register('name', { required: 'Name is required' })}
                        type="text"
                        className="input"
                        placeholder="e.g., 5 Session Package"
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
                          min: { value: 0, message: 'Price must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="inline-flex items-center">
                        <input
                          {...register('active')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Services *
                        </label>
                        <button
                          type="button"
                          onClick={() => append({ sessionTypeId: '', quantity: 1 })}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          + Add Service
                        </button>
                      </div>

                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex items-start space-x-2">
                            <div className="flex-1">
                              <select
                                {...register(`items.${index}.sessionTypeId`, {
                                  required: 'Service is required'
                                })}
                                className="input"
                              >
                                <option value="">Select service...</option>
                                {sessionTypes.map(type => (
                                  <option key={type.id} value={type.id}>
                                    {type.name} (${type.price})
                                  </option>
                                ))}
                              </select>
                              {errors.items?.[index]?.sessionTypeId && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.items[index].sessionTypeId.message}
                                </p>
                              )}
                            </div>

                            <div className="w-24">
                              <input
                                {...register(`items.${index}.quantity`, {
                                  required: 'Quantity is required',
                                  min: { value: 1, message: 'Min 1' }
                                })}
                                type="number"
                                min="1"
                                className="input"
                                placeholder="Qty"
                              />
                              {errors.items?.[index]?.quantity && (
                                <p className="mt-1 text-sm text-red-600">
                                  {errors.items[index].quantity.message}
                                </p>
                              )}
                            </div>

                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <XMarkIcon className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createBundleMutation.isPending || updateBundleMutation.isPending}
                        className="btn-primary"
                      >
                        {createBundleMutation.isPending || updateBundleMutation.isPending
                          ? 'Saving...'
                          : editingBundle
                          ? 'Update Bundle'
                          : 'Create Bundle'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
