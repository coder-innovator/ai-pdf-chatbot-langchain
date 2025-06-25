"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MockTradingSignalsHook, TradingSignal } from '@/types/trading';

interface UseMockTradingSignalsOptions {
  updateInterval?: number; // milliseconds
  maxSignals?: number;
  enableRealTime?: boolean;
  apiUrl?: string;
  autoGenerate?: boolean; // Generate signals based on market conditions
}

/**
 * Custom hook for real-time mock trading signals
 * Generates intelligent trading signals based on market conditions
 */
export function useMockTradingSignals(
  ticker?: string,
  options: UseMockTradingSignalsOptions = {}
): MockTradingSignalsHook {
  const {
    updateInterval = 15000, // 15 seconds
    maxSignals = 50,
    enableRealTime = true,
    apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    autoGenerate = true
  } = options;

  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const signalCounterRef = useRef(0);

  // Generate realistic trading signal
  const generateTradingSignal = useCallback((targetTicker?: string): TradingSignal => {
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'];
    const selectedTicker = targetTicker || tickers[Math.floor(Math.random() * tickers.length)];
    
    // Base prices for realistic signals
    const basePrices: { [key: string]: number } = {
      'AAPL': 150,
      'TSLA': 245,
      'NVDA': 420,
      'MSFT': 380,
      'GOOGL': 135,
      'AMZN': 145,
      'META': 320
    };

    const basePrice = basePrices[selectedTicker] || 100;
    const currentPrice = basePrice * (0.95 + Math.random() * 0.1); // ±5% variation

    // Generate signal based on "market conditions"
    const marketCondition = Math.random();
    let action: TradingSignal['action'];
    let confidence: number;
    let reasoning: string;
    let riskLevel: TradingSignal['riskLevel'];
    let source: string;

    if (marketCondition < 0.25) {
      // Strong bullish signal
      action = 'STRONG_BUY';
      confidence = 0.8 + Math.random() * 0.15;
      reasoning = generateBullishReasoning(selectedTicker);
      riskLevel = 'MEDIUM';
      source = 'Technical Analysis';
    } else if (marketCondition < 0.45) {
      // Moderate bullish signal
      action = 'BUY';
      confidence = 0.65 + Math.random() * 0.2;
      reasoning = generateModerateBullishReasoning(selectedTicker);
      riskLevel = Math.random() < 0.5 ? 'LOW' : 'MEDIUM';
      source = 'Fundamental Analysis';
    } else if (marketCondition < 0.55) {
      // Hold signal
      action = 'HOLD';
      confidence = 0.5 + Math.random() * 0.3;
      reasoning = generateHoldReasoning(selectedTicker);
      riskLevel = 'LOW';
      source = 'Market Analysis';
    } else if (marketCondition < 0.75) {
      // Moderate bearish signal
      action = 'SELL';
      confidence = 0.6 + Math.random() * 0.25;
      reasoning = generateBearishReasoning(selectedTicker);
      riskLevel = 'MEDIUM';
      source = 'Risk Analysis';
    } else {
      // Strong bearish signal
      action = 'STRONG_SELL';
      confidence = 0.75 + Math.random() * 0.2;
      reasoning = generateStrongBearishReasoning(selectedTicker);
      riskLevel = 'HIGH';
      source = 'Technical Analysis';
    }

    // Calculate price targets
    const priceTarget = action.includes('BUY') 
      ? currentPrice * (1.05 + Math.random() * 0.15) 
      : action.includes('SELL') 
        ? currentPrice * (0.85 + Math.random() * 0.1)
        : undefined;

    const stopLoss = action.includes('BUY')
      ? currentPrice * (0.92 + Math.random() * 0.05)
      : action.includes('SELL')
        ? currentPrice * (1.05 + Math.random() * 0.08)
        : undefined;

    signalCounterRef.current += 1;

    return {
      id: `signal-${Date.now()}-${signalCounterRef.current}`,
      ticker: selectedTicker,
      action,
      confidence,
      price: parseFloat(currentPrice.toFixed(2)),
      reasoning,
      timestamp: new Date().toISOString(),
      source,
      riskLevel,
      priceTarget: priceTarget ? parseFloat(priceTarget.toFixed(2)) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(2)) : undefined
    };
  }, []);

  // Reasoning generators
  const generateBullishReasoning = useCallback((ticker: string): string => {
    const reasons = [
      `${ticker} shows strong momentum with RSI at 45, indicating potential upward movement`,
      `Technical breakout confirmed for ${ticker} above key resistance at MA20`,
      `${ticker} earnings expectations exceeded, institutional buying detected`,
      `Volume spike in ${ticker} with bullish divergence pattern forming`,
      `${ticker} shows strong support at current levels, uptrend likely to continue`,
      `Positive sector rotation favoring ${ticker} with strong fundamentals`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }, []);

  const generateModerateBullishReasoning = useCallback((ticker: string): string => {
    const reasons = [
      `${ticker} trading above MA50 with moderate volume, cautiously bullish`,
      `${ticker} shows consolidation pattern, potential for gradual upward movement`,
      `Fundamental strength in ${ticker} with improving market sentiment`,
      `${ticker} breaking minor resistance, monitor for sustained momentum`,
      `Technical indicators for ${ticker} showing bullish convergence`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }, []);

  const generateHoldReasoning = useCallback((ticker: string): string => {
    const reasons = [
      `${ticker} in consolidation phase, await clearer directional signals`,
      `Mixed signals for ${ticker}, recommend maintaining current position`,
      `${ticker} showing sideways movement, market uncertainty present`,
      `Technical indicators neutral for ${ticker}, patience recommended`,
      `${ticker} at fair value, no immediate action required`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }, []);

  const generateBearishReasoning = useCallback((ticker: string): string => {
    const reasons = [
      `${ticker} breaking below key support, consider reducing exposure`,
      `RSI overbought for ${ticker}, potential correction ahead`,
      `${ticker} showing bearish divergence with declining volume`,
      `Technical weakness in ${ticker} with negative momentum building`,
      `${ticker} facing headwinds, risk management advised`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }, []);

  const generateStrongBearishReasoning = useCallback((ticker: string): string => {
    const reasons = [
      `${ticker} in clear downtrend, immediate exit recommended`,
      `Critical support broken for ${ticker}, significant downside risk`,
      `${ticker} showing distribution pattern, institutional selling detected`,
      `Technical breakdown confirmed for ${ticker}, stop loss triggered`,
      `${ticker} fundamental deterioration with negative catalysts`
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }, []);

  // Load initial signals from backend or generate mock
  const loadInitialSignals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try backend first
      const endpoint = ticker 
        ? `${apiUrl}/api/trading/signals/${ticker}`
        : `${apiUrl}/api/trading/signals`;
      
      const response = await fetch(endpoint).catch(() => null);
      
      let initialSignals: TradingSignal[] = [];
      
      if (response?.ok) {
        const data = await response.json();
        if (data.data?.signals) {
          initialSignals = data.data.signals.slice(0, maxSignals);
        }
      }
      
      // Generate mock signals if no backend data
      if (initialSignals.length === 0) {
        for (let i = 0; i < 15; i++) {
          const signal = generateTradingSignal(ticker);
          // Backdate signals for initial history
          signal.timestamp = new Date(Date.now() - (14 - i) * 60000 * 5).toISOString();
          initialSignals.push(signal);
        }
      }

      setSignals(initialSignals);
    } catch (err) {
      console.error('Error loading trading signals:', err);
      setError('Failed to load trading signals');
      
      // Fallback to pure mock data
      const fallbackSignals: TradingSignal[] = [];
      for (let i = 0; i < 10; i++) {
        const signal = generateTradingSignal(ticker);
        signal.timestamp = new Date(Date.now() - (9 - i) * 60000 * 10).toISOString();
        fallbackSignals.push(signal);
      }
      setSignals(fallbackSignals);
    } finally {
      setIsLoading(false);
    }
  }, [ticker, apiUrl, maxSignals, generateTradingSignal]);

  // Start real-time signal generation
  const startRealTimeUpdates = useCallback(() => {
    if (!enableRealTime || !autoGenerate) return;

    intervalRef.current = setInterval(() => {
      // Generate new signal with some probability
      if (Math.random() < 0.4) { // 40% chance of new signal each interval
        setSignals(prevSignals => {
          const newSignal = generateTradingSignal(ticker);
          const updatedSignals = [...prevSignals, newSignal];
          
          // Keep only the latest maxSignals
          return updatedSignals.slice(-maxSignals);
        });
      }
    }, updateInterval);
  }, [ticker, updateInterval, maxSignals, enableRealTime, autoGenerate, generateTradingSignal]);

  // Stop real-time updates
  const stopRealTimeUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refetch signals
  const refetch = useCallback(() => {
    stopRealTimeUpdates();
    loadInitialSignals().then(() => {
      if (enableRealTime && autoGenerate) {
        startRealTimeUpdates();
      }
    });
  }, [loadInitialSignals, startRealTimeUpdates, stopRealTimeUpdates, enableRealTime, autoGenerate]);

  // Initialize and start updates
  useEffect(() => {
    loadInitialSignals().then(() => {
      if (enableRealTime && autoGenerate) {
        startRealTimeUpdates();
      }
    });

    return () => {
      stopRealTimeUpdates();
    };
  }, [ticker]); // Only depend on ticker

  // Get latest signal
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  return {
    signals,
    latestSignal,
    isLoading,
    error,
    refetch
  };
}