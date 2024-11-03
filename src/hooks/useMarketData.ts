import { useQuery } from '@tanstack/react-query';
import { getMarketData } from '@/lib/api';

export const useMarketData = (symbol: string) => {
  return useQuery({
    queryKey: ['market', symbol],
    queryFn: () => getMarketData(symbol),
  });
};