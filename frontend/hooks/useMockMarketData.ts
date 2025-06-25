"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MockMarketDataHook, MockMarketDataPoint } from '@/types/trading';

interface UseMockMarketDataOptions {
  updateInterval?: number; // milliseconds
  maxDataPoints?: number;
  enableRealTime?: boolean;
  apiUrl?: string;
}

/**
 * Custom hook for real-time mock market data
 * Simulates live market updates with realistic price movements
 */
export function useMockMarketData(
  ticker: string,
  options: UseMockMarketDataOptions = {}
): MockMarketDataHook {
  const {
    updateInterval = 5000, // 5 seconds
    maxDataPoints = 100,
    enableRealTime = true,
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  } = options;

  const [data, setData] = useState<MockMarketDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<number | null>(null);

  // Get base price for ticker
  const getBasePrice = useCallback((ticker: string): number => {
    const basePrices: { [key: string]: number } = {
      'AAPL': 150,
      'TSLA': 245,
      'NVDA': 420,
      'MSFT': 380,
      'GOOGL': 135,
      'AMZN': 145,
      'META': 320,
      'NFLX': 450,
      'AMD': 120,
      'CRM': 210
    };
    return basePrices[ticker] || 100;
  }, []);

  // Generate realistic technical indicators
  const generateIndicators = useCallback((price: number, previousData: MockMarketDataPoint[]) => {
    const recentPrices = previousData.slice(-20).map(d => d.price);
    recentPrices.push(price);

    // Simple Moving Averages
    const ma20 = recentPrices.length >= 20 
      ? recentPrices.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : price;
    const ma50 = recentPrices.length >= 50 
      ? recentPrices.slice(-50).reduce((a, b) => a + b, 0) / 50 
      : price;

    // RSI (simplified)
    const gains = [];
    const losses = [];
    for (let i = 1; i < Math.min(recentPrices.length, 14); i++) {
      const change = recentPrices[i] - recentPrices[i - 1];
      if (change > 0) gains.push(change);
      else losses.push(-change);
    }
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 1;
    const rsi = 100 - (100 / (1 + avgGain / avgLoss));

    // MACD (simplified)
    const ema12 = price * 0.15 + (previousData[previousData.length - 1]?.indicators?.macd || price) * 0.85;
    const ema26 = price * 0.075 + (previousData[previousData.length - 1]?.indicators?.macd || price) * 0.925;
    const macd = ema12 - ema26;

    // Bollinger Bands
    const sma = ma20;
    const variance = recentPrices.slice(-20).reduce((acc, p) => acc + Math.pow(p - sma, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    const bollinger = {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    };

    return {
      rsi: Math.max(0, Math.min(100, rsi)),
      macd,
      ma20,
      ma50,
      bollinger
    };
  }, []);

  // Generate mock data point
  const generateMockDataPoint = useCallback((ticker: string, previousData: MockMarketDataPoint[]): MockMarketDataPoint => {
    const basePrice = getBasePrice(ticker);
    const lastPrice = lastPriceRef.current || previousData[previousData.length - 1]?.price || basePrice;
    
    // Generate realistic price movement (±2% typical volatility)
    const volatility = 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const trendFactor = Math.sin(Date.now() / 100000) * 0.005; // Long-term trend
    const newPrice = lastPrice * (1 + randomChange + trendFactor);
    
    // Ensure price doesn't go too far from base
    const constrainedPrice = Math.max(basePrice * 0.7, Math.min(basePrice * 1.5, newPrice));
    lastPriceRef.current = constrainedPrice;

    // Generate volume (realistic market volume)
    const baseVolume = {
      'AAPL': 45000000,
      'TSLA': 35000000,
      'NVDA': 28000000,
      'MSFT': 25000000,
      'GOOGL': 20000000
    }[ticker] || 15000000;
    
    const volumeVariation = 0.3;
    const volume = Math.floor(baseVolume * (1 + (Math.random() - 0.5) * volumeVariation));

    const indicators = generateIndicators(constrainedPrice, previousData);

    return {
      ticker,
      timestamp: new Date().toISOString(),
      price: parseFloat(constrainedPrice.toFixed(2)),
      volume,
      indicators
    };
  }, [getBasePrice, generateIndicators]);

  // Load initial mock data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from backend first
      const response = await fetch(`${apiUrl}/api/trading/signals/${ticker}`).catch(() => null);
      
      let initialData: MockMarketDataPoint[] = [];
      
      if (response?.ok) {
        const backendData = await response.json();
        // Transform backend data if available
        if (backendData.data?.signals?.length > 0) {
          initialData = backendData.data.signals.slice(0, 20).map((signal: any) => ({
            ticker,
            timestamp: signal.timestamp,
            price: signal.price,
            volume: Math.floor(Math.random() * 10000000) + 5000000,
            indicators: generateIndicators(signal.price, [])
          }));
        }
      }
      
      // Generate mock data if no backend data
      if (initialData.length === 0) {
        const basePrice = getBasePrice(ticker);
        lastPriceRef.current = basePrice;
        
        for (let i = 0; i < 30; i++) {
          const point = generateMockDataPoint(ticker, initialData);
          point.timestamp = new Date(Date.now() - (29 - i) * 60000).toISOString(); // 1 minute intervals
          initialData.push(point);
        }
      }

      setData(initialData);
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to load market data');
      
      // Fallback to pure mock data
      const basePrice = getBasePrice(ticker);
      lastPriceRef.current = basePrice;
      const fallbackData: MockMarketDataPoint[] = [];
      
      for (let i = 0; i < 30; i++) {
        const point = generateMockDataPoint(ticker, fallbackData);
        point.timestamp = new Date(Date.now() - (29 - i) * 60000).toISOString();
        fallbackData.push(point);
      }
      
      setData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, [ticker, apiUrl, getBasePrice, generateMockDataPoint, generateIndicators]);

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (!enableRealTime) return;

    intervalRef.current = setInterval(() => {
      setData(prevData => {
        const newDataPoint = generateMockDataPoint(ticker, prevData);
        const updatedData = [...prevData, newDataPoint];
        
        // Keep only the latest maxDataPoints
        return updatedData.slice(-maxDataPoints);
      });
    }, updateInterval);
  }, [ticker, updateInterval, maxDataPoints, enableRealTime, generateMockDataPoint]);

  // Stop real-time updates
  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refetch data
  const refetch = useCallback(() => {
    stopRealTimeUpdates();
    loadInitialData().then(() => {
      if (enableRealTime) {
        startRealTimeUpdates();
      }
    });
  }, [loadInitialData, startRealTimeUpdates, stopRealTimeUpdates, enableRealTime]);

  // Initialize data and start updates
  useEffect(() => {
    loadInitialData().then(() => {
      if (enableRealTime) {
        startRealTimeUpdates();
      }
    });

    return () => {
      stopRealTimeUpdates();
    };
  }, [ticker]); // Only depend on ticker to avoid infinite re-renders

  // Calculate latest price and change
  const latestPrice = data.length > 0 ? data[data.length - 1].price : 0;
  const priceChange = data.length > 1 
    ? latestPrice - data[data.length - 2].price 
    : 0;

  return {
    data,
    latestPrice,
    priceChange,
    isLoading,
    error,
    refetch
  };
}