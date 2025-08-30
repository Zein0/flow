import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../stores/auth';

export const useLogin = () => {
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    onSuccess: (data) => {
      login(data);
      toast.success('Logged in successfully');
      
      // Redirect admin to dashboard, others to home
      if (data.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Login failed');
    }
  });
};

export const useRegister = () => {
  const login = useAuthStore(state => state.login);
  
  return useMutation({
    mutationFn: async (userData) => {
      const response = await api.post('/auth/register', userData);
      return response.data;
    },
    onSuccess: (data) => {
      login(data);
      toast.success('Account created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Registration failed');
    }
  });
};

export const useLogout = () => {
  const logout = useAuthStore(state => state.logout);
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Clear any server-side session if needed
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
    }
  });
};