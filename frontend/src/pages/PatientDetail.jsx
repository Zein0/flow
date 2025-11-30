import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CurrencyDollarIcon,
  XMarkIcon,
  MinusIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { usePatient, useDeleteFutureAppointments } from '../hooks/usePatients';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '../utils/api';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import { useAuthStore } from '../stores/auth';

export default function PatientDetail() {
  const { patientId } = useParams();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showWaiveForm, setShowWaiveForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showBundleForm, setShowBundleForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: patient, isLoading } = usePatient(patientId);
  const queryClient = useQueryClient();
  const deleteFutureAppointments = useDeleteFutureAppointments();
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin';

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerWaive, handleSubmit: handleWaiveSubmit, reset: resetWaive, formState: { errors: waiveErrors } } = useForm();
  const { register: registerReturn, handleSubmit: handleReturnSubmit, reset: resetReturn, formState: { errors: returnErrors } } = useForm();
  const { register: registerBundle, handleSubmit: handleBundleSubmit, reset: resetBundle, formState: { errors: bundleErrors } } = useForm();

  // Fetch active bundles
  const { data: bundles = [] } = useQuery({
    queryKey: ['bundles', 'active'],
    queryFn: async () => {
      const response = await api.get('/bundles?active=true');
      return response.data;
    }
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      const response = await api.post('/ledger/payments', paymentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Payment recorded');
      reset();
      setShowPaymentForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  });

  // Waive amount mutation
  const waiveAmountMutation = useMutation({
    mutationFn: async (waiveData) => {
      const response = await api.post('/ledger/waive', waiveData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Amount waived');
      resetWaive();
      setShowWaiveForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to waive amount');
    }
  });

  // Return money mutation
  const returnMoneyMutation = useMutation({
    mutationFn: async (returnData) => {
      const response = await api.post('/ledger/return', returnData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Money returned');
      resetReturn();
      setShowReturnForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to return money');
    }
  });

  const onPaymentSubmit = async (data) => {
    recordPaymentMutation.mutate({
      patientId,
      amount: parseFloat(data.amount),
      method: 'cash',
      orderId: data.orderId || undefined,
      notes: data.notes || undefined
    });
  };

  const onWaiveSubmit = async (data) => {
    waiveAmountMutation.mutate({
      patientId,
      amount: parseFloat(data.amount),
      reason: data.reason,
      orderId: data.orderId || undefined
    });
  };

  const onReturnSubmit = async (data) => {
    returnMoneyMutation.mutate({
      patientId,
      amount: parseFloat(data.amount),
      method: 'cash',
      reason: data.reason || undefined
    });
  };

  // Purchase bundle mutation
  const purchaseBundleMutation = useMutation({
    mutationFn: async (bundleData) => {
      const response = await api.post(`/patients/${patientId}/bundles/purchase`, bundleData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Bundle purchased successfully');
      resetBundle();
      setShowBundleForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to purchase bundle');
    }
  });

  const onBundleSubmit = async (data) => {
    purchaseBundleMutation.mutate({
      bundleId: data.bundleId,
      amountPaid: data.amountPaid ? parseFloat(data.amountPaid) : undefined
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  const outstandingOrders = patient.orders?.filter(order =>
    order.status === 'pending' || order.status === 'partially_paid'
  ) || [];

  const appointments = patient.appointments || [];
  const appointmentsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(appointments.length / appointmentsPerPage));
  const paginatedAppointments = appointments.slice((currentPage - 1) * appointmentsPerPage, currentPage * appointmentsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <div className="mt-1 flex items-center space-x-4 text-sm">
            {patient.phone && <span className="text-gray-500">{patient.phone}</span>}
            <span className={`font-medium ${patient.creditBalance > 0 ? 'text-green-600' : 'text-gray-500'}`}>
              Credit: ${patient.creditBalance?.toFixed(2) || '0.00'}
            </span>
            <span className={`font-medium ${(outstandingOrders.reduce((sum, order) => {
              const totalPaid = order.ledgers?.filter(l => l.kind === 'payment').reduce((s, l) => s + l.amount, 0) || 0;
              const totalWaived = Math.abs(order.ledgers?.filter(l => l.kind === 'waive').reduce((s, l) => s + l.amount, 0) || 0);
              return sum + Math.max(0, order.totalDue - totalPaid - totalWaived);
            }, 0)) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              Owes: ${outstandingOrders.reduce((sum, order) => {
                const totalPaid = order.ledgers?.filter(l => l.kind === 'payment').reduce((s, l) => s + l.amount, 0) || 0;
                const totalWaived = Math.abs(order.ledgers?.filter(l => l.kind === 'waive').reduce((s, l) => s + l.amount, 0) || 0);
                return sum + Math.max(0, order.totalDue - totalPaid - totalWaived);
              }, 0).toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center sm:justify-start space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowPaymentForm(true)}
            className="btn-primary"
          >
            <CurrencyDollarIcon className="w-4 h-4 mr-2" />
            Record Payment
          </button>
          <button
            onClick={() => setShowBundleForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CubeIcon className="w-4 h-4 mr-2" />
            Buy Bundle
          </button>
          {outstandingOrders.length > 0 && (
            <button
              onClick={() => setShowWaiveForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <MinusIcon className="w-4 h-4 mr-2" />
              Waive Amount
            </button>
          )}
          {patient.creditBalance > 0 && (
            <button
              onClick={() => setShowReturnForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Return Money
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete Future Appointments
            </button>
          )}
        </div>
      </div>

      {/* Service Credits Section */}
      {patient.creditsSummary && patient.creditsSummary.length > 0 && (
        <div className="card bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Service Credits</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {patient.creditsSummary.map(credit => (
                <div key={credit.sessionTypeId} className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-2xl font-bold text-indigo-600">{credit.quantity}x</p>
                  <p className="text-sm text-gray-600 mt-1">{credit.sessionTypeName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Appointments */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Appointments</h3>
            </div>
            <div className="card-body p-0">
              {appointments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No appointments scheduled
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {paginatedAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        className="p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {format(new Date(appointment.startAt), 'MMM do, yyyy')} at{' '}
                              {format(new Date(appointment.startAt), 'h:mm a')}
                            </p>
                            <p className="text-sm text-gray-500">
                              Dr. {appointment.doctor.name} • {appointment.sessionType.name}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn-secondary"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn-secondary"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Outstanding Orders */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Outstanding Orders</h3>
            </div>
            <div className="card-body p-0">
              {outstandingOrders.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No outstanding orders
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {outstandingOrders.map(order => {
                    const totalPaid = order.ledgers?.filter(l => l.kind === 'payment').reduce((s, l) => s + l.amount, 0) || 0;
                    const totalWaived = Math.abs(order.ledgers?.filter(l => l.kind === 'waive').reduce((s, l) => s + l.amount, 0) || 0);
                    const pendingAmount = Math.max(0, order.totalDue - totalPaid - totalWaived);
                    
                    return (
                      <div key={order.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Order #{order.id.slice(-6)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total: ${order.totalDue.toFixed(2)} • Pending: ${pendingAmount.toFixed(2)}
                            </p>
                            {totalPaid > 0 && (
                              <p className="text-xs text-green-600">
                                Paid: ${totalPaid.toFixed(2)}
                              </p>
                            )}
                            {totalWaived > 0 && (
                              <p className="text-xs text-orange-600">
                                Waived: ${totalWaived.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'partially_paid' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              ${pendingAmount.toFixed(2)} due
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            </div>
            <div className="card-body p-0">
              {patient.ledgers?.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No transactions
                </div>
              ) : (
                <div className={`divide-y divide-gray-200 ${patient.ledgers.length > 4 ? 'max-h-80 overflow-y-auto' : ''}`}>
                  {patient.ledgers?.map(ledger => (
                    <div key={ledger.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {ledger.kind}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(ledger.occurredAt), 'MMM do, yyyy')}
                          </p>
                          {ledger.notes && (
                            <p className="text-xs text-gray-600 mt-1">
                              {ledger.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${ledger.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${Math.abs(ledger.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {ledger.method}
                          </p>
                        </div>
                      </div>
                    </div>
                  )) || []}
                </div>
              )}
            </div>
          </div>

          {/* Patient Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Patient Info</h3>
            </div>
            <div className="card-body">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900">{patient.name}</dd>
                </div>
                {patient.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{patient.phone}</dd>
                  </div>
                )}
                {patient.notes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Notes</dt>
                    <dd className="text-sm text-gray-900">{patient.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowPaymentForm(false)} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Record Payment
                  </h3>
                  
                  <form onSubmit={handleSubmit(onPaymentSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        {...register('amount', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be greater than 0' }
                        })}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                      {errors.amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        {...register('notes')}
                        rows={2}
                        className="input"
                        placeholder="Payment notes..."
                      />
                    </div>
                    
                    {outstandingOrders.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Apply to Order (Optional)
                        </label>
                        <select {...register('orderId')} className="input">
                          <option value="">General payment</option>
                          {outstandingOrders.map(order => (
                            <option key={order.id} value={order.id}>
                              Order #{order.id.slice(-6)} - ${order.totalDue.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={recordPaymentMutation.isPending}
                        className="btn-primary"
                      >
                        {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waive Amount Modal */}
      {showWaiveForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowWaiveForm(false)} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  onClick={() => setShowWaiveForm(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Waive Amount
                  </h3>
                  
                  <form onSubmit={handleWaiveSubmit(onWaiveSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount to Waive *
                      </label>
                      <input
                        {...registerWaive('amount', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be greater than 0' }
                        })}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                      />
                      {waiveErrors.amount && (
                        <p className="mt-1 text-sm text-red-600">{waiveErrors.amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason *
                      </label>
                      <textarea
                        {...registerWaive('reason', { required: 'Reason is required' })}
                        rows={3}
                        className="input"
                        placeholder="Explain why this amount is being waived..."
                      />
                      {waiveErrors.reason && (
                        <p className="mt-1 text-sm text-red-600">{waiveErrors.reason.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apply to Order *
                      </label>
                      <select {...registerWaive('orderId', { required: 'Order is required' })} className="input">
                        <option value="">Select order to waive</option>
                        {outstandingOrders.map(order => {
                          const totalPaid = order.ledgers?.filter(l => l.kind === 'payment').reduce((s, l) => s + l.amount, 0) || 0;
                          const totalWaived = Math.abs(order.ledgers?.filter(l => l.kind === 'waive').reduce((s, l) => s + l.amount, 0) || 0);
                          const pendingAmount = Math.max(0, order.totalDue - totalPaid - totalWaived);
                          
                          return (
                            <option key={order.id} value={order.id}>
                              Order #{order.id.slice(-6)} - ${pendingAmount.toFixed(2)} pending
                            </option>
                          );
                        })}
                      </select>
                      {waiveErrors.orderId && (
                        <p className="mt-1 text-sm text-red-600">{waiveErrors.orderId.message}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowWaiveForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={waiveAmountMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                      >
                        {waiveAmountMutation.isPending ? 'Waiving...' : 'Waive Amount'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Money Modal */}
      {showReturnForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowReturnForm(false)} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  onClick={() => setShowReturnForm(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Return Money
                  </h3>
                  
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">
                      Available credit balance: <span className="font-medium">${patient.creditBalance?.toFixed(2) || '0.00'}</span>
                    </p>
                  </div>
                  
                  <form onSubmit={handleReturnSubmit(onReturnSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount to Return *
                      </label>
                      <input
                        {...registerReturn('amount', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be greater than 0' },
                          max: { value: patient.creditBalance || 0, message: `Amount cannot exceed credit balance of $${patient.creditBalance?.toFixed(2) || '0.00'}` }
                        })}
                        type="number"
                        step="0.01"
                        max={patient.creditBalance || 0}
                        className="input"
                        placeholder="0.00"
                      />
                      {returnErrors.amount && (
                        <p className="mt-1 text-sm text-red-600">{returnErrors.amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason (Optional)
                      </label>
                      <textarea
                        {...registerReturn('reason')}
                        rows={2}
                        className="input"
                        placeholder="Reason for return..."
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowReturnForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={returnMoneyMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {returnMoneyMutation.isPending ? 'Returning...' : 'Return Money'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowDeleteDialog(false)} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Delete Future Appointments
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to delete all future appointments for this patient? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteDialog(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteFutureAppointments.mutateAsync(patientId);
                          setShowDeleteDialog(false);
                        } catch (error) {
                          console.error('Failed to delete future appointments:', error);
                          alert('Failed to delete future appointments');
                        }
                      }}
                      disabled={deleteFutureAppointments.isPending}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {deleteFutureAppointments.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Bundle Modal */}
      {showBundleForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowBundleForm(false)} />
            <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  onClick={() => setShowBundleForm(false)}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Purchase Bundle
                  </h3>

                  <form onSubmit={handleBundleSubmit(onBundleSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Bundle *
                      </label>
                      <select
                        {...registerBundle('bundleId', { required: 'Bundle is required' })}
                        className="input"
                      >
                        <option value="">Choose a bundle...</option>
                        {bundles.map(bundle => (
                          <option key={bundle.id} value={bundle.id}>
                            {bundle.name} - ${bundle.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      {bundleErrors.bundleId && (
                        <p className="mt-1 text-sm text-red-600">{bundleErrors.bundleId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid (Optional)
                      </label>
                      <input
                        {...registerBundle('amountPaid', {
                          min: { value: 0, message: 'Amount must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="Leave empty for full price"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        If left empty, full price will be charged. Patient receives all credits regardless of payment.
                      </p>
                      {bundleErrors.amountPaid && (
                        <p className="mt-1 text-sm text-red-600">{bundleErrors.amountPaid.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowBundleForm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={purchaseBundleMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {purchaseBundleMutation.isPending ? 'Purchasing...' : 'Purchase Bundle'}
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