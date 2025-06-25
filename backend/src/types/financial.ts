import { z } from 'zod';

// Yahoo Finance Types
export interface YahooFinanceQuote {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: Date;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
  beta: number;
  eps: number;
  pe: number;
  dividendYield: number;
}

export interface YahooFinanceHistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
}

// Alpaca API Types
export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  regt_buying_power: string;
  daytrading_buying_power: string;
  effective_buying_power: string;
  non_marginable_buying_power: string;
  bod_dtbp: string;
  cash: string;
  accrued_fees: string;
  pending_transfer_out: string;
  pending_transfer_in: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  sma: string;
  daytrade_count: number;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

// Technical Indicators Types
export interface TechnicalIndicatorInput {
  period: number;
  values: number[];
}

export interface MovingAverageResult {
  value: number;
  timestamp: Date;
}

export interface RSIResult {
  rsi: number;
  timestamp: Date;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  timestamp: Date;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  timestamp: Date;
}

// Sentiment Analysis Types
export interface SentimentResult {
  score: number;
  comparative: number;
  calculation: Array<{
    [word: string]: number;
  }>;
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  time_published: string;
  authors: string[];
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: Array<{
    topic: string;
    relevance_score: string;
  }>;
  overall_sentiment_score: number;
  overall_sentiment_label: 'Bearish' | 'Somewhat-Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Bullish';
  ticker_sentiment: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: 'Bearish' | 'Somewhat-Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Bullish';
  }>;
}

// Trading Strategy Types
export interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: Date;
  reasoning: string;
  indicators: {
    rsi?: number;
    macd?: MACDResult;
    ma_short?: number;
    ma_long?: number;
    bollinger?: BollingerBandsResult;
  };
  sentiment?: {
    score: number;
    news_count: number;
    articles: NewsArticle[];
  };
}

export interface PortfolioAnalysis {
  total_value: number;
  total_pl: number;
  total_pl_percent: number;
  day_pl: number;
  day_pl_percent: number;
  positions: AlpacaPosition[];
  diversification_score: number;
  risk_metrics: {
    beta: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
}

// Market Data Types
export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;
}

export interface MarketHours {
  is_open: boolean;
  next_open: Date;
  next_close: Date;
}

// Cron Job Types
export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  action: 'MARKET_SCAN' | 'PORTFOLIO_REBALANCE' | 'NEWS_ANALYSIS' | 'TECHNICAL_ANALYSIS';
  enabled: boolean;
  last_run?: Date;
  next_run: Date;
  parameters?: Record<string, any>;
}

// Zod Schemas for Validation
export const TradingSignalSchema = z.object({
  symbol: z.string(),
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  confidence: z.number().min(0).max(1),
  price: z.number().positive(),
  timestamp: z.date(),
  reasoning: z.string(),
  indicators: z.object({
    rsi: z.number().optional(),
    macd: z.object({
      macd: z.number(),
      signal: z.number(),
      histogram: z.number(),
      timestamp: z.date(),
    }).optional(),
    ma_short: z.number().optional(),
    ma_long: z.number().optional(),
    bollinger: z.object({
      upper: z.number(),
      middle: z.number(),
      lower: z.number(),
      timestamp: z.date(),
    }).optional(),
  }),
  sentiment: z.object({
    score: z.number(),
    news_count: z.number(),
    articles: z.array(z.any()),
  }).optional(),
});

export const MarketDataSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  volume: z.number().nonnegative(),
  timestamp: z.date(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  bid_size: z.number().nonnegative(),
  ask_size: z.number().nonnegative(),
});

export const ScheduledTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  schedule: z.string(),
  action: z.enum(['MARKET_SCAN', 'PORTFOLIO_REBALANCE', 'NEWS_ANALYSIS', 'TECHNICAL_ANALYSIS']),
  enabled: z.boolean(),
  last_run: z.date().optional(),
  next_run: z.date(),
  parameters: z.record(z.any()).optional(),
});

// All types are already exported above