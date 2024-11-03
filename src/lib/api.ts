import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

export const getMarketData = async (symbol: string) => {
  const response = await api.get(`/market?symbol=${symbol}`);
  return response.data;
};

export const analyzeMarket = async (data: any) => {
  const response = await api.post('/analysis', data);
  return response.data;
};