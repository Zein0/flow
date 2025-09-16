import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const useSessionTypes = () => {
  return useQuery({
    queryKey: ['sessionTypes'],
    queryFn: async () => {
      const response = await api.get('/session-types');
      return response.data;
    }
  });
};

export default useSessionTypes;
