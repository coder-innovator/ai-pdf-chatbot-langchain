import { z } from 'zod';

// Real-time Market Data Types
export interface Ticker {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  market_cap: number;
  shares_outstanding: number;
  country: string;
  currency: string;
  is_active: boolean;
  last_updated: Date;
}

export interface Quote {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number; // Volume Weighted Average Price
  trade_count: number;
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;
  spread: number;
  spread_percent: number;
}

export interface Trade {
  id: string;
  symbol: string;
  timestamp: Date;
  price: number;
  size: number;
  exchange: string;
  conditions: string[];
  tape: string;
}

export interface Bar {
  symbol: string;
  timestamp: Date;
  timeframe: '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour' | '1day' | '1week' | '1month';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
  vwap: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: Array<{
    price: number;
    size: number;
  }>;
  asks: Array<{
    price: number;
    size: number;
  }>;
  spread: number;
  spread_percent: number;
}

// Market Status and Hours
export interface MarketStatus {
  market: 'NYSE' | 'NASDAQ' | 'CRYPTO' | 'FOREX';
  status: 'open' | 'closed' | 'pre_market' | 'after_hours';
  is_open: boolean;
  next_open: Date | null;
  next_close: Date | null;
  timezone: string;
  last_updated: Date;
}

export interface TradingCalendar {
  date: Date;
  market_open: Date;
  market_close: Date;
  pre_market_open: Date;
  after_hours_close: Date;
  is_holiday: boolean;
  holiday_name?: string;
  is_early_close: boolean;
  early_close_time?: Date;
}

// Market Indices and ETFs
export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  change_percent: number;
  timestamp: Date;
  components: string[]; // Array of ticker symbols
  weightings: Record<string, number>; // symbol -> weight mapping
}

export interface ETF {
  symbol: string;
  name: string;
  expense_ratio: number;
  aum: number; // Assets Under Management
  holdings: Array<{
    symbol: string;
    name: string;
    weight: number;
    shares: number;
    market_value: number;
  }>;
  sector_allocation: Record<string, number>;
  country_allocation: Record<string, number>;
  dividend_yield: number;
  inception_date: Date;
}

// Options Data
export interface OptionContract {
  symbol: string;
  underlying_symbol: string;
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: Date;
  days_to_expiration: number;
  bid: number;
  ask: number;
  last_price: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  intrinsic_value: number;
  time_value: number;
  in_the_money: boolean;
}

export interface OptionsChain {
  underlying_symbol: string;
  underlying_price: number;
  timestamp: Date;
  expiration_dates: Date[];
  strikes: number[];
  calls: OptionContract[];
  puts: OptionContract[];
  implied_volatility_rank: number;
  put_call_ratio: number;
}

// Crypto Market Data
export interface CryptoQuote {
  symbol: string;
  base_currency: string;
  quote_currency: string;
  price: number;
  volume_24h: number;
  market_cap: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  change_24h: number;
  change_7d: number;
  change_30d: number;
  ath: number; // All-time high
  ath_date: Date;
  atl: number; // All-time low
  atl_date: Date;
  timestamp: Date;
}

// Economic Data
export interface EconomicIndicator {
  indicator: string;
  country: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  unit: string;
  value: number;
  previous_value: number;
  forecast: number | null;
  release_date: Date;
  next_release: Date | null;
  importance: 'low' | 'medium' | 'high';
  actual_vs_forecast: number | null;
}

// Market Screener
export interface ScreenerCriteria {
  market_cap_min?: number;
  market_cap_max?: number;
  price_min?: number;
  price_max?: number;
  volume_min?: number;
  pe_ratio_min?: number;
  pe_ratio_max?: number;
  dividend_yield_min?: number;
  beta_min?: number;
  beta_max?: number;
  sector?: string[];
  exchange?: string[];
  country?: string[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  volume: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  beta: number;
  sector: string;
  score: number; // Relevance score based on criteria
}

// Market Analytics
export interface MarketSentiment {
  date: Date;
  fear_greed_index: number; // 0-100 scale
  vix: number; // Volatility Index
  put_call_ratio: number;
  margin_debt: number;
  insider_trading_ratio: number;
  safe_haven_demand: number;
  stock_price_momentum: number;
  market_volatility: number;
  overall_sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
}

export interface SectorPerformance {
  sector: string;
  current_return: number;
  one_day_return: number;
  one_week_return: number;
  one_month_return: number;
  three_month_return: number;
  ytd_return: number;
  one_year_return: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  top_performers: string[];
  worst_performers: string[];
}

// WebSocket Subscription Types
export interface MarketDataSubscription {
  id: string;
  symbols: string[];
  data_types: ('trades' | 'quotes' | 'bars' | 'orderbook')[];
  timeframe?: string;
  is_active: boolean;
  created_at: Date;
  last_received: Date | null;
  message_count: number;
}

export interface MarketDataMessage {
  subscription_id: string;
  type: 'trade' | 'quote' | 'bar' | 'orderbook';
  symbol: string;
  timestamp: Date;
  data: Trade | Quote | Bar | OrderBook;
}

// Market Data Aggregations
export interface DailyMarketSummary {
  date: Date;
  total_volume: number;
  total_trades: number;
  advancing_stocks: number;
  declining_stocks: number;
  unchanged_stocks: number;
  new_highs: number;
  new_lows: number;
  up_volume: number;
  down_volume: number;
  advance_decline_ratio: number;
  arms_index: number; // TRIN
  mcclellan_oscillator: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  market_cap: number;
  reason?: string; // News, earnings, etc.
  category: 'gainer' | 'loser' | 'active' | 'unusual_volume';
}

// Zod Schemas for Validation
export const TickerSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string(),
  sector: z.string(),
  industry: z.string(),
  market_cap: z.number().nonnegative(),
  shares_outstanding: z.number().positive(),
  country: z.string(),
  currency: z.string(),
  is_active: z.boolean(),
  last_updated: z.date(),
});

export const QuoteSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  vwap: z.number().positive(),
  trade_count: z.number().nonnegative(),
  bid: z.number().positive(),
  ask: z.number().positive(),
  bid_size: z.number().nonnegative(),
  ask_size: z.number().nonnegative(),
  spread: z.number().nonnegative(),
  spread_percent: z.number().nonnegative(),
});

export const BarSchema = z.object({
  symbol: z.string(),
  timestamp: z.date(),
  timeframe: z.enum(['1min', '5min', '15min', '30min', '1hour', '4hour', '1day', '1week', '1month']),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative(),
  trade_count: z.number().nonnegative(),
  vwap: z.number().positive(),
});

export const MarketStatusSchema = z.object({
  market: z.enum(['NYSE', 'NASDAQ', 'CRYPTO', 'FOREX']),
  status: z.enum(['open', 'closed', 'pre_market', 'after_hours']),
  is_open: z.boolean(),
  next_open: z.date().nullable(),
  next_close: z.date().nullable(),
  timezone: z.string(),
  last_updated: z.date(),
});

export const ScreenerCriteriaSchema = z.object({
  market_cap_min: z.number().nonnegative().optional(),
  market_cap_max: z.number().nonnegative().optional(),
  price_min: z.number().nonnegative().optional(),
  price_max: z.number().nonnegative().optional(),
  volume_min: z.number().nonnegative().optional(),
  pe_ratio_min: z.number().optional(),
  pe_ratio_max: z.number().optional(),
  dividend_yield_min: z.number().nonnegative().optional(),
  beta_min: z.number().optional(),
  beta_max: z.number().optional(),
  sector: z.array(z.string()).optional(),
  exchange: z.array(z.string()).optional(),
  country: z.array(z.string()).optional(),
});

// All types are already exported above