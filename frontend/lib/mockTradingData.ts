/**
 * Mock trading data service for frontend components
 */

import { TradingSignal, MarketData, TradingAlert, MockTradingData, ChartDataPoint } from '../types/trading';

// Mock API base URL - points to your backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Generate mock chart data for a ticker
 */
function generateMockChartData(ticker: string, days: number = 30): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const basePrice = Math.random() * 200 + 50; // Random base price between 50-250
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const priceVariation = (Math.random() - 0.5) * 20; // ±10 price variation
    const price = Math.max(basePrice + priceVariation, 10); // Minimum price of 10
    const volume = Math.floor(Math.random() * 10000000) + 1000000; // 1M-11M volume
    
    data.push({
      timestamp: date.toISOString(),
      price: parseFloat(price.toFixed(2)),
      volume
    });
  }
  
  return data;
}

/**
 * Load mock trading data from backend or generate fallback data
 */
export async function loadMockTradingData(): Promise<MockTradingData> {
  try {
    // Try to fetch from your backend first
    const [signalsRes, marketRes, alertsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/trading/signals`).catch(() => null),
      fetch(`${API_BASE_URL}/api/demo/market-overview`).catch(() => null),
      fetch(`${API_BASE_URL}/api/trading/alerts`).catch(() => null)
    ]);

    let signals: TradingSignal[] = [];
    let marketData: MarketData[] = [];
    let alerts: TradingAlert[] = [];

    // Parse backend responses if available
    if (signalsRes?.ok) {
      const signalsData = await signalsRes.json();
      signals = signalsData.data?.signals || [];
    }

    if (marketRes?.ok) {
      const marketOverview = await marketRes.json();
      // Transform market overview to MarketData format
      marketData = [
        {
          ticker: 'AAPL',
          currentPrice: 150.25,
          change: 2.15,
          changePercent: 1.45,
          volume: 45000000,
          marketCap: 2400000000000,
          timestamp: new Date().toISOString()
        },
        {
          ticker: 'TSLA',
          currentPrice: 245.80,
          change: -3.20,
          changePercent: -1.28,
          volume: 35000000,
          marketCap: 780000000000,
          timestamp: new Date().toISOString()
        },
        {
          ticker: 'NVDA',
          currentPrice: 420.15,
          change: 8.75,
          changePercent: 2.13,
          volume: 28000000,
          marketCap: 1040000000000,
          timestamp: new Date().toISOString()
        }
      ];
    }

    if (alertsRes?.ok) {
      const alertsData = await alertsRes.json();
      alerts = alertsData.data?.alerts || [];
    }

    // Generate fallback data if backend is not available
    if (signals.length === 0) {
      signals = [
        {
          id: 'signal-1',
          ticker: 'AAPL',
          action: 'BUY',
          confidence: 0.85,
          price: 150.25,
          reasoning: 'Strong technical indicators and positive earnings outlook',
          timestamp: new Date().toISOString(),
          source: 'Technical Analysis',
          riskLevel: 'MEDIUM',
          priceTarget: 165.00,
          stopLoss: 145.00
        },
        {
          id: 'signal-2',
          ticker: 'TSLA',
          action: 'HOLD',
          confidence: 0.65,
          price: 245.80,
          reasoning: 'Mixed signals with high volatility expected',
          timestamp: new Date().toISOString(),
          source: 'Sentiment Analysis',
          riskLevel: 'HIGH',
          priceTarget: 260.00,
          stopLoss: 230.00
        },
        {
          id: 'signal-3',
          ticker: 'NVDA',
          action: 'STRONG_BUY',
          confidence: 0.92,
          price: 420.15,
          reasoning: 'AI boom continues with strong fundamentals',
          timestamp: new Date().toISOString(),
          source: 'Fundamental Analysis',
          riskLevel: 'MEDIUM',
          priceTarget: 480.00,
          stopLoss: 400.00
        }
      ];
    }

    if (alerts.length === 0) {
      alerts = [
        {
          id: 'alert-1',
          ticker: 'AAPL',
          type: 'PRICE_MOVEMENT',
          severity: 'HIGH',
          message: 'AAPL broke through resistance at $150',
          timestamp: new Date().toISOString(),
          isActive: true
        },
        {
          id: 'alert-2',
          ticker: 'TSLA',
          type: 'VOLUME_SPIKE',
          severity: 'MEDIUM',
          message: 'Unusual volume spike detected',
          timestamp: new Date().toISOString(),
          isActive: true
        },
        {
          id: 'alert-3',
          ticker: 'NVDA',
          type: 'TECHNICAL_INDICATOR',
          severity: 'LOW',
          message: 'RSI approaching overbought territory',
          timestamp: new Date().toISOString(),
          isActive: true
        }
      ];
    }

    // Generate chart data for main tickers
    const chartData = {
      AAPL: generateMockChartData('AAPL'),
      TSLA: generateMockChartData('TSLA'),
      NVDA: generateMockChartData('NVDA'),
      MSFT: generateMockChartData('MSFT'),
      GOOGL: generateMockChartData('GOOGL')
    };

    return {
      signals,
      marketData,
      alerts,
      chartData
    };

  } catch (error) {
    console.error('Error loading trading data:', error);
    
    // Return fallback data
    return {
      signals: [],
      marketData: [],
      alerts: [],
      chartData: {}
    };
  }
}

/**
 * Get real-time data updates (for WebSocket integration)
 */
export function connectToTradingStream(onUpdate: (data: any) => void) {
  try {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws/trading';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to trading stream');
      // Subscribe to all relevant channels
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'signals' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'alerts' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'market_updates' }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return ws;
  } catch (error) {
    console.error('Error connecting to trading stream:', error);
    return null;
  }
}