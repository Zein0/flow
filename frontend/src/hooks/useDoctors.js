import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await api.get('/doctors');
      return response.data;
    }
  });
};

export const useDoctor = (doctorId) => {
  return useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: async () => {
      const response = await api.get(`/doctors/${doctorId}`);
      return response.data;
    },
    enabled: !!doctorId
  });
};

export const useCreateDoctor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (doctorData) => {
      const response = await api.post('/doctors', doctorData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success('Doctor created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create doctor');
    }
  });
};

export const useUpdateDoctor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ doctorId, ...doctorData }) => {
      const response = await api.put(`/doctors/${doctorId}`, doctorData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', data.id] });
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      toast.success('Doctor updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update doctor');
    }
  });
};

export const useAddDoctorSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ doctorId, sessionTypeId, customPrice }) => {
      const response = await api.post(`/doctors/${doctorId}/sessions`, {
        sessionTypeId,
        customPrice
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] });
      queryClient.refetchQueries({ queryKey: ['doctors'] });
      toast.success('Session added to doctor');
    },
    onError: (error) => {
      console.error('Add session error:', error);
      toast.error(error.response?.data?.error || 'Failed to add session');
    }
  });
};

export const useUpdateDoctorSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ doctorId, sessionListId, customPrice }) => {
      const response = await api.put(`/doctors/${doctorId}/sessions/${sessionListId}`, {
        customPrice
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] });
      toast.success('Session price updated');
    },
    onError: (error) => {
      console.error('Update session error:', error);
      toast.error(error.response?.data?.error || 'Failed to update session');
    }
  });
};

export const useDeleteDoctorSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ doctorId, sessionListId }) => {
      await api.delete(`/doctors/${doctorId}/sessions/${sessionListId}`);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', variables.doctorId] });
      toast.success('Session removed from doctor');
    },
    onError: (error) => {
      console.error('Delete session error:', error);
      toast.error(error.response?.data?.error || 'Failed to remove session');
    }
  });
};