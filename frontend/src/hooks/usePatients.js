import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

export const usePatients = (search) => {
  return useQuery({
    queryKey: ['patients', search],
    queryFn: async () => {
      const response = await api.get('/patients', {
        params: search ? { search } : {}
      });
      return response.data;
    }
  });
};

export const usePatient = (patientId) => {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await api.get(`/patients/${patientId}`);
      return response.data;
    },
    enabled: !!patientId
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (patientData) => {
      const response = await api.post('/patients', patientData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create patient');
    }
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ patientId, ...patientData }) => {
      const response = await api.put(`/patients/${patientId}`, patientData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient', data.id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update patient');
    }
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ patientId, ...paymentData }) => {
      const response = await api.post(`/patients/${patientId}/payments`, paymentData);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  });
};

export const useDeleteFutureAppointments = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId) => {
      const response = await api.delete(`/patients/${patientId}/appointments/future`);
      return response.data;
    },
    onSuccess: (data, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Future appointments deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete appointments');
    }
  });
};