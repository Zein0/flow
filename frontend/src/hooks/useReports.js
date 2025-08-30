import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/reports/dashboard');
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000 // Refetch every 5 minutes
  });
};

export const useBillingReport = (filters) => {
  return useQuery({
    queryKey: ['billing-report', filters],
    queryFn: async () => {
      const response = await api.get('/reports/billing', { params: filters });
      return response.data;
    },
    enabled: !!(filters.from && filters.to)
  });
};

export const useBillingSummary = (filters) => {
  return useQuery({
    queryKey: ['billing-summary', { from: filters.from, to: filters.to, patientId: filters.patientId }],
    queryFn: async () => {
      const params = {
        from: filters.from,
        to: filters.to,
        patientId: filters.patientId
      };
      const response = await api.get('/reports/billing/summary', { params });
      return response.data;
    },
    enabled: !!(filters.from && filters.to)
  });
};

export const useOutstandingOrders = () => {
  return useQuery({
    queryKey: ['outstanding-orders'],
    queryFn: async () => {
      const response = await api.get('/ledger/outstanding');
      return response.data;
    }
  });
};

export const exportBillingReportToCsv = async (filters) => {
  try {
    const response = await api.get('/reports/billing', {
      params: { ...filters, export: 'csv' },
      responseType: 'blob'
    });
    
    // Create blob link to download file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `billing-report-${filters.from}-to-${filters.to}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export CSV');
  }
};