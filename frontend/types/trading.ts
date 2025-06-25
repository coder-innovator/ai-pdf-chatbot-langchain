/**
 * Trading-related type definitions for frontend components
 */

export interface TradingSignal {
  id: string;
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence: number;
  price: number;
  reasoning: string;
  timestamp: string;
  source: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priceTarget?: number;
  stopLoss?: number;
}

export interface MarketData {
  ticker: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  timestamp: string;
}

export interface TradingAlert {
  id: string;
  ticker: string;
  type: 'PRICE_MOVEMENT' | 'VOLUME_SPIKE' | 'TECHNICAL_INDICATOR' | 'NEWS_IMPACT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  isActive: boolean;
}

export interface ChartDataPoint {
  timestamp: string;
  price: number;
  volume: number;
}

export interface MockTradingData {
  signals: TradingSignal[];
  marketData: MarketData[];
  alerts: TradingAlert[];
  chartData: { [ticker: string]: ChartDataPoint[] };
}

// AI Trading Response Types
export interface TradingRecommendation {
  action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  confidence: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priceTarget?: number;
  stopLoss?: number;
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  allocation?: number; // Percentage of portfolio
}

export interface TradingAnswer {
  answer: string;
  confidence: number;
  answerType: 'STRATEGY' | 'ANALYSIS' | 'EDUCATION' | 'RISK_ASSESSMENT' | 'MARKET_INSIGHT';
  recommendation?: TradingRecommendation;
  relatedTickers?: string[];
  suggestedActions?: string[];
  processingTime: number;
  sources?: string[];
}

// Enhanced Chart Data Types
export interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  timestamp: string;
}

export interface LiveTickerData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  timestamp: string;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  isMarketOpen: boolean;
}

export interface MockMarketDataPoint {
  ticker: string;
  timestamp: string;
  price: number;
  volume: number;
  indicators?: {
    rsi?: number;
    macd?: number;
    ma20?: number;
    ma50?: number;
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
}

// Hook return types
export interface MockMarketDataHook {
  data: MockMarketDataPoint[];
  latestPrice: number;
  priceChange: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface MockTradingSignalsHook {
  signals: TradingSignal[];
  latestSignal: TradingSignal | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}