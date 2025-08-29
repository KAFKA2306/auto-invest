import axios from 'axios';
import type { MarketData, PerformanceMetrics } from '@/types/market';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const getMarketData = async (symbol: string): Promise<MarketData[]> => {
  const response = await api.get<MarketData[]>(`/market?symbol=${symbol}`);
  return response.data;
};

export const analyzeMarket = async (
  data: MarketData[],
): Promise<PerformanceMetrics> => {
  const response = await api.post<PerformanceMetrics>('/analysis', data);
  return response.data;
};
