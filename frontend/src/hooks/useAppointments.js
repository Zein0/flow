import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

export const useAppointments = (filters = {}) => {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const response = await api.get('/appointments', { params: filters });
      return response.data;
    }
  });
};

export const useAppointmentCounts = (startDate, endDate, doctorId) => {
  return useQuery({
    queryKey: ['appointment-counts', startDate, endDate, doctorId],
    queryFn: async () => {
      const response = await api.get('/appointments/counts', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ...(doctorId && { doctorId })
        }
      });
      return response.data;
    },
    enabled: !!startDate && !!endDate
  });
};

export const useAvailability = (date, doctorId) => {
  return useQuery({
    queryKey: ['availability', format(date, 'yyyy-MM-dd'), doctorId],
    queryFn: async () => {
      const response = await api.get('/appointments/availability', {
        params: {
          date: format(date, 'yyyy-MM-dd'),
          ...(doctorId && { doctorId })
        }
      });
      return response.data;
    }
  });
};

export const useAvailableDoctors = (date, hour) => {
  return useQuery({
    queryKey: ['available-doctors', format(date, 'yyyy-MM-dd'), hour],
    queryFn: async () => {
      const response = await api.get('/appointments/available-doctors', {
        params: {
          date: format(date, 'yyyy-MM-dd'),
          hour
        }
      });
      return response.data;
    },
    enabled: !!date && hour !== undefined
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (appointmentData) => {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Appointment created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create appointment');
    }
  });
};

export const useConfirmAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, finalPrice }) => {
      const response = await api.post(`/appointments/${appointmentId}/confirm`, {
        finalPrice
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Appointment confirmed');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to confirm appointment');
    }
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, reason }) => {
      const response = await api.post(`/appointments/${appointmentId}/cancel`, {
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to cancel appointment');
    }
  });
};

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ appointmentId, status }) => {
      const response = await api.put(`/appointments/${appointmentId}/status`, {
        status
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment status updated');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  });
};