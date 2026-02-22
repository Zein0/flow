import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, EyeSlashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const PAGE_SIZE = 15;

export default function Bundles() {
  const [showForm, setShowForm] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'inactive'
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleStatusFilter = (v) => { setStatusFilter(v); setPage(1); };

  // Fetch bundles from backend with search/filter/pagination
  const { data: result, isLoading } = useQuery({
    queryKey: ['bundles', { search, status: statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', PAGE_SIZE);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const response = await api.get(`/bundles?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true,
  });

  const bundles = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;
  const currentPage = result?.page ?? 1;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bundles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage service bundles
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          New Bundle
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bundles or included services..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex rounded-md shadow-sm">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
          ].map((opt, i) => (
            <button
              key={opt.key}
              onClick={() => handleStatusFilter(opt.key)}
              className={`px-4 py-2 text-sm font-medium border ${
                i === 0 ? 'rounded-l-md' : i === 2 ? 'rounded-r-md -ml-px' : '-ml-px'
              } ${
                statusFilter === opt.key
                  ? 'bg-primary-600 text-white border-primary-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bundles Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {bundles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {!search && statusFilter === 'all' ? (
              <>
                <PlusIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No bundles found</p>
                <p className="text-sm">Create your first bundle to get started.</p>
              </>
            ) : (
              <p className="text-sm">No bundles match your filters.</p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-hide" style={{ maxWidth: '100vw' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bundle Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Included Services
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
                  {bundles.map((bundle) => (
                    <tr key={bundle.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {bundle.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary-600">
                          ${bundle.price.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {bundle.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
                            >
                              {item.quantity}x {item.sessionType.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bundle.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bundle.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(bundle)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(bundle.id)}
                          disabled={deleteBundleMutation.isPending}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> bundles
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        p === currentPage
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
