// Supabase-specific interface definitions for trading data
// These interfaces match the database schema and Supabase client patterns

import { 
  Quote, 
  Ticker, 
  NewsArticle, 
  TradingSignal
} from './index.js';

// Supabase response wrapper types
export interface SupabaseResponse<T> {
  data: T[] | null;
  error: SupabaseError | null;
  count?: number;
  status: number;
  statusText: string;
}

export interface SupabaseSingleResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  status: number;
  statusText: string;
}

export interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

// Database table interfaces (matching SQL schema)
export interface TickersTable {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  shares_outstanding: number | null;
  country: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuotesTable {
  id: string;
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number | null;
  trade_count: number;
  bid: number | null;
  ask: number | null;
  bid_size: number;
  ask_size: number;
  spread: number | null;
  spread_percent: number | null;
  created_at: string;
}

export interface BarsTable {
  id: string;
  symbol: string;
  timestamp: string;
  timeframe: 'min' | '5min' | '15min' | '30min' | '1hour' | '4hour' | '1day' | '1week' | '1month';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade_count: number;
  vwap: number | null;
  created_at: string;
}

export interface TradesTable {
  id: string;
  symbol: string;
  timestamp: string;
  price: number;
  size: number;
  exchange: string | null;
  conditions: string[] | null;
  tape: string | null;
  created_at: string;
}

export interface OptionsContractsTable {
  id: string;
  symbol: string;
  underlying_symbol: string;
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  bid: number | null;
  ask: number | null;
  last_price: number | null;
  volume: number;
  open_interest: number;
  implied_volatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
  intrinsic_value: number | null;
  time_value: number | null;
  in_the_money: boolean | null;
  timestamp: string;
  created_at: string;
}

export interface NewsArticlesTable {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  content: string | null;
  source: string;
  authors: string[] | null;
  published_at: string;
  category: string | null;
  topics: any | null; // JSONB
  overall_sentiment_score: number | null;
  overall_sentiment_label: 'bearish' | 'somewhat_bearish' | 'neutral' | 'somewhat_bullish' | 'bullish' | null;
  ticker_sentiments: any | null; // JSONB
  embedding: number[] | null; // Vector
  created_at: string;
}

export interface TradingSignalsTable {
  id: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  target_price: number | null;
  stop_loss: number | null;
  reasoning: string;
  technical_indicators: any | null; // JSONB
  sentiment_data: any | null; // JSONB
  risk_score: number | null;
  expected_return: number | null;
  time_horizon: string | null;
  generated_at: string;
  expires_at: string | null;
  is_active: boolean;
  executed: boolean;
  executed_at: string | null;
  execution_price: number | null;
  created_at: string;
}

export interface PortfolioPositionsTable {
  id: string;
  user_id: string | null;
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number | null;
  market_value: number | null;
  unrealized_pl: number | null;
  unrealized_pl_percent: number | null;
  day_pl: number | null;
  day_pl_percent: number | null;
  last_updated: string;
  created_at: string;
}

export interface OrdersTable {
  id: string;
  user_id: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price: number | null;
  stop_price: number | null;
  time_in_force: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial';
  filled_quantity: number;
  filled_avg_price: number | null;
  commission: number;
  signal_id: string | null;
  placed_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface WatchlistsTable {
  id: string;
  user_id: string | null;
  name: string;
  symbols: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTasksTable {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  action: string;
  parameters: any | null; // JSONB
  enabled: boolean;
  last_run: string | null;
  next_run: string;
  run_count: number;
  success_count: number;
  failure_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketSentimentTable {
  id: string;
  date: string;
  fear_greed_index: number | null;
  vix: number | null;
  put_call_ratio: number | null;
  margin_debt: number | null;
  insider_trading_ratio: number | null;
  safe_haven_demand: number | null;
  stock_price_momentum: number | null;
  market_volatility: number | null;
  overall_sentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed' | null;
  created_at: string;
}

export interface EconomicIndicatorsTable {
  id: string;
  indicator: string;
  country: string;
  frequency: string;
  unit: string | null;
  value: number;
  previous_value: number | null;
  forecast: number | null;
  release_date: string;
  next_release: string | null;
  importance: 'low' | 'medium' | 'high' | null;
  actual_vs_forecast: number | null;
  created_at: string;
}

export interface PortfolioSnapshotsTable {
  id: string;
  user_id: string | null;
  snapshot_date: string;
  total_value: number;
  cash_value: number;
  positions_value: number;
  day_pl: number | null;
  day_pl_percent: number | null;
  total_pl: number | null;
  total_pl_percent: number | null;
  positions_count: number;
  diversification_score: number | null;
  risk_metrics: any | null; // JSONB
  created_at: string;
}

// Supabase query builder types
export interface SupabaseQueryBuilder<T> {
  select(columns?: string): SupabaseQueryBuilder<T>;
  insert(values: Partial<T> | Partial<T>[]): SupabaseQueryBuilder<T>;
  update(values: Partial<T>): SupabaseQueryBuilder<T>;
  delete(): SupabaseQueryBuilder<T>;
  eq(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  neq(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  gt(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  gte(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  lt(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  lte(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  like(column: keyof T, pattern: string): SupabaseQueryBuilder<T>;
  ilike(column: keyof T, pattern: string): SupabaseQueryBuilder<T>;
  is(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  in(column: keyof T, values: any[]): SupabaseQueryBuilder<T>;
  contains(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  containedBy(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  rangeLt(column: keyof T, range: string): SupabaseQueryBuilder<T>;
  rangeGt(column: keyof T, range: string): SupabaseQueryBuilder<T>;
  rangeGte(column: keyof T, range: string): SupabaseQueryBuilder<T>;
  rangeLte(column: keyof T, range: string): SupabaseQueryBuilder<T>;
  rangeAdjacent(column: keyof T, range: string): SupabaseQueryBuilder<T>;
  overlaps(column: keyof T, value: any): SupabaseQueryBuilder<T>;
  textSearch(column: keyof T, query: string, options?: any): SupabaseQueryBuilder<T>;
  match(query: Record<string, any>): SupabaseQueryBuilder<T>;
  not(column: keyof T, operator: string, value: any): SupabaseQueryBuilder<T>;
  or(filters: string): SupabaseQueryBuilder<T>;
  filter(column: keyof T, operator: string, value: any): SupabaseQueryBuilder<T>;
  order(column: keyof T, options?: { ascending?: boolean; nullsFirst?: boolean }): SupabaseQueryBuilder<T>;
  limit(count: number): SupabaseQueryBuilder<T>;
  range(from: number, to: number): SupabaseQueryBuilder<T>;
  single(): Promise<SupabaseSingleResponse<T>>;
  maybeSingle(): Promise<SupabaseSingleResponse<T>>;
  csv(): Promise<string>;
  then<TResult1 = SupabaseResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

// Supabase client interface
export interface SupabaseTradingClient {
  // Table accessors
  from<T>(table: string): SupabaseQueryBuilder<T>;
  
  // Specific table methods
  tickers: SupabaseQueryBuilder<TickersTable>;
  quotes: SupabaseQueryBuilder<QuotesTable>;
  bars: SupabaseQueryBuilder<BarsTable>;
  trades: SupabaseQueryBuilder<TradesTable>;
  options_contracts: SupabaseQueryBuilder<OptionsContractsTable>;
  news_articles: SupabaseQueryBuilder<NewsArticlesTable>;
  trading_signals: SupabaseQueryBuilder<TradingSignalsTable>;
  portfolio_positions: SupabaseQueryBuilder<PortfolioPositionsTable>;
  orders: SupabaseQueryBuilder<OrdersTable>;
  watchlists: SupabaseQueryBuilder<WatchlistsTable>;
  scheduled_tasks: SupabaseQueryBuilder<ScheduledTasksTable>;
  market_sentiment: SupabaseQueryBuilder<MarketSentimentTable>;
  economic_indicators: SupabaseQueryBuilder<EconomicIndicatorsTable>;
  portfolio_snapshots: SupabaseQueryBuilder<PortfolioSnapshotsTable>;

  // RPC (Remote Procedure Calls) for custom functions
  rpc<T>(
    fn: 'match_news_articles' | 'get_latest_quote' | 'calculate_portfolio_performance',
    args?: Record<string, any>
  ): Promise<SupabaseResponse<T>>;

  // Vector similarity search
  matchNewsArticles(
    queryEmbedding: number[],
    matchThreshold?: number,
    matchCount?: number
  ): Promise<SupabaseResponse<NewsArticlesTable & { similarity: number }>>;

  // Storage for file uploads (if needed)
  storage: {
    from(bucket: string): {
      upload(path: string, file: File | Buffer, options?: any): Promise<any>;
      download(path: string): Promise<any>;
      remove(paths: string[]): Promise<any>;
      list(path?: string): Promise<any>;
    };
  };

  // Realtime subscriptions
  channel(name: string): {
    on(
      event: 'postgres_changes',
      filter: {
        event: 'INSERT' | 'UPDATE' | 'DELETE';
        schema: string;
        table: string;
        filter?: string;
      },
      callback: (payload: any) => void
    ): any;
    subscribe(): Promise<any>;
    unsubscribe(): Promise<any>;
  };

  // Authentication (if using Supabase auth)
  auth: {
    getUser(): Promise<{ data: { user: any } | null; error: any }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<any>;
    signOut(): Promise<any>;
  };
}

// Helper types for type transformations
export type DatabaseToApi<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends string 
    ? T[K] extends `${number}-${number}-${number}T${number}:${number}:${number}`
      ? Date
      : T[K]
    : T[K];
};

export type ApiToDatabase<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Date ? string : T[K];
};

// Specific transformation types
export type QuoteFromDB = DatabaseToApi<QuotesTable>;
export type QuoteToDB = ApiToDatabase<Quote>;

export type TickerFromDB = DatabaseToApi<TickersTable>;
export type TickerToDB = ApiToDatabase<Ticker>;

export type TradingSignalFromDB = DatabaseToApi<TradingSignalsTable>;
export type TradingSignalToDB = ApiToDatabase<TradingSignal>;

export type NewsArticleFromDB = DatabaseToApi<NewsArticlesTable>;
export type NewsArticleToDB = ApiToDatabase<NewsArticle>;

// Utility types for common patterns
export type InsertPayload<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'created_at'>>;

// Real-time subscription payload types
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

// Configuration for Supabase client
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    realtime?: {
      params?: {
        eventsPerSecond?: number;
      };
    };
  };
}