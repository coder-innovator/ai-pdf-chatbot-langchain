// Central export file for all type definitions

// Financial types
export * from './financial.js';

// Market data types  
export * from './market-data.js';

// Re-export commonly used types with aliases for convenience
export type {
  TradingSignal as Signal,
  AlpacaPosition as Position,
  MarketData as RealTimeData,
  NewsArticle as News,
  SentimentResult as Sentiment,
} from './financial.js';

export type {
  Ticker as Stock,
  Bar as Candle,
  OrderBook as BookDepth,
  MarketSentiment as MarketMood,
  ScreenerResult as ScreenMatch,
} from './market-data.js';

// Type guards for runtime type checking
export function isTradingSignal(obj: any): obj is import('./financial.js').TradingSignal {
  return obj && 
    typeof obj.symbol === 'string' &&
    ['BUY', 'SELL', 'HOLD'].includes(obj.action) &&
    typeof obj.confidence === 'number' &&
    typeof obj.price === 'number' &&
    obj.timestamp instanceof Date &&
    typeof obj.reasoning === 'string';
}

export function isMarketData(obj: any): obj is import('./financial.js').MarketData {
  return obj &&
    typeof obj.symbol === 'string' &&
    typeof obj.price === 'number' &&
    typeof obj.volume === 'number' &&
    obj.timestamp instanceof Date;
}

export function isQuote(obj: any): obj is import('./market-data.js').Quote {
  return obj &&
    typeof obj.symbol === 'string' &&
    typeof obj.open === 'number' &&
    typeof obj.high === 'number' &&
    typeof obj.low === 'number' &&
    typeof obj.close === 'number' &&
    typeof obj.volume === 'number' &&
    obj.timestamp instanceof Date;
}

export function isNewsArticle(obj: any): obj is import('./financial.js').NewsArticle {
  return obj &&
    typeof obj.title === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.source === 'string' &&
    Array.isArray(obj.authors) &&
    typeof obj.overall_sentiment_score === 'number';
}

// Utility types for API responses
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface StreamMessage<T> {
  type: 'data' | 'error' | 'complete';
  payload: T;
  timestamp: Date;
}

// Database connection types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

// API client configuration
export interface APIClientConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  rateLimit?: {
    requests: number;
    period: number; // in milliseconds
  };
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
  heartbeat?: {
    enabled: boolean;
    interval: number;
  };
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
}

// Logging configuration
export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destinations: ('console' | 'file' | 'database')[];
  file?: {
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

// Application configuration
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  port: number;
  database: DatabaseConfig;
  apis: {
    alpaca: APIClientConfig;
    yahoo: APIClientConfig;
    finnhub?: APIClientConfig;
    polygon?: APIClientConfig;
  };
  websockets?: {
    alpaca?: WebSocketConfig;
    polygon?: WebSocketConfig;
  };
  cache: CacheConfig;
  logging: LogConfig;
  features: {
    trading: boolean;
    backtesting: boolean;
    paperTrading: boolean;
    realTimeData: boolean;
    technicalAnalysis: boolean;
    sentimentAnalysis: boolean;
    newsAnalysis: boolean;
  };
}

// Error types
export class FinancialDataError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'FinancialDataError';
  }
}

export class TradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public orderId?: string,
    public symbol?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TradingError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public constraint: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Event types for real-time updates
export interface MarketDataEvent {
  type: 'quote' | 'trade' | 'bar' | 'status';
  symbol: string;
  data: any;
  timestamp: Date;
}

export interface TradingEvent {
  type: 'order_placed' | 'order_filled' | 'order_cancelled' | 'position_updated';
  orderId?: string;
  symbol: string;
  data: any;
  timestamp: Date;
}

export interface PortfolioEvent {
  type: 'balance_updated' | 'position_changed' | 'performance_calculated';
  userId: string;
  data: any;
  timestamp: Date;
}

export interface NewsEvent {
  type: 'article_published' | 'sentiment_updated';
  symbols: string[];
  data: any;
  timestamp: Date;
}

// Union types for events
export type SystemEvent = MarketDataEvent | TradingEvent | PortfolioEvent | NewsEvent;

// Constants
export const MARKET_HOURS = {
  NYSE: {
    open: '09:30',
    close: '16:00',
    timezone: 'America/New_York',
  },
  NASDAQ: {
    open: '09:30',
    close: '16:00', 
    timezone: 'America/New_York',
  },
  CRYPTO: {
    open: '00:00',
    close: '23:59',
    timezone: 'UTC',
  },
} as const;

export const TIMEFRAMES = [
  '1min', '5min', '15min', '30min', 
  '1hour', '4hour', '1day', '1week', '1month'
] as const;

export const EXCHANGES = [
  'NYSE', 'NASDAQ', 'AMEX', 'ARCA', 
  'BATS', 'IEX', 'CRYPTO'
] as const;

export const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services',
  'Consumer Cyclical', 'Communication Services',
  'Industrials', 'Consumer Defensive', 'Energy',
  'Utilities', 'Real Estate', 'Basic Materials'
] as const;

// Type for timeframes
export type Timeframe = typeof TIMEFRAMES[number];
export type Exchange = typeof EXCHANGES[number];
export type Sector = typeof SECTORS[number];