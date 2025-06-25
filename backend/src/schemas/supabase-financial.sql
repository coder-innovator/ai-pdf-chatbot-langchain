-- Financial Data Schema for Supabase
-- This schema creates tables to store financial market data, trading signals, and portfolio information

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create enum types
CREATE TYPE market_status AS ENUM ('open', 'closed', 'pre_market', 'after_hours');
CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_type AS ENUM ('market', 'limit', 'stop', 'stop_limit');
CREATE TYPE order_status AS ENUM ('pending', 'filled', 'cancelled', 'rejected', 'partial');
CREATE TYPE signal_action AS ENUM ('BUY', 'SELL', 'HOLD');
CREATE TYPE timeframe AS ENUM ('1min', '5min', '15min', '30min', '1hour', '4hour', '1day', '1week', '1month');
CREATE TYPE option_type AS ENUM ('call', 'put');
CREATE TYPE sentiment_label AS ENUM ('bearish', 'somewhat_bearish', 'neutral', 'somewhat_bullish', 'bullish');

-- Tickers/Symbols table
CREATE TABLE IF NOT EXISTS tickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    sector TEXT,
    industry TEXT,
    market_cap BIGINT,
    shares_outstanding BIGINT,
    country TEXT DEFAULT 'US',
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market data quotes
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(12,4) NOT NULL,
    high DECIMAL(12,4) NOT NULL,
    low DECIMAL(12,4) NOT NULL,
    close DECIMAL(12,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    vwap DECIMAL(12,4),
    trade_count INTEGER DEFAULT 0,
    bid DECIMAL(12,4),
    ask DECIMAL(12,4),
    bid_size INTEGER DEFAULT 0,
    ask_size INTEGER DEFAULT 0,
    spread DECIMAL(12,4),
    spread_percent DECIMAL(8,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timestamp)
);

-- Historical bars/candles
CREATE TABLE IF NOT EXISTS bars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    timestamp TIMESTAMPTZ NOT NULL,
    timeframe timeframe NOT NULL,
    open DECIMAL(12,4) NOT NULL,
    high DECIMAL(12,4) NOT NULL,
    low DECIMAL(12,4) NOT NULL,
    close DECIMAL(12,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    vwap DECIMAL(12,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timestamp, timeframe)
);

-- Individual trades
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    timestamp TIMESTAMPTZ NOT NULL,
    price DECIMAL(12,4) NOT NULL,
    size INTEGER NOT NULL,
    exchange TEXT,
    conditions TEXT[],
    tape TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options contracts
CREATE TABLE IF NOT EXISTS options_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    underlying_symbol TEXT NOT NULL REFERENCES tickers(symbol),
    option_type option_type NOT NULL,
    strike_price DECIMAL(12,4) NOT NULL,
    expiration_date DATE NOT NULL,
    bid DECIMAL(8,4),
    ask DECIMAL(8,4),
    last_price DECIMAL(8,4),
    volume INTEGER DEFAULT 0,
    open_interest INTEGER DEFAULT 0,
    implied_volatility DECIMAL(8,6),
    delta DECIMAL(8,6),
    gamma DECIMAL(8,6),
    theta DECIMAL(8,6),
    vega DECIMAL(8,6),
    rho DECIMAL(8,6),
    intrinsic_value DECIMAL(8,4),
    time_value DECIMAL(8,4),
    in_the_money BOOLEAN,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timestamp)
);

-- Economic indicators
CREATE TABLE IF NOT EXISTS economic_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    indicator TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    frequency TEXT NOT NULL,
    unit TEXT,
    value DECIMAL(15,6) NOT NULL,
    previous_value DECIMAL(15,6),
    forecast DECIMAL(15,6),
    release_date TIMESTAMPTZ NOT NULL,
    next_release TIMESTAMPTZ,
    importance TEXT CHECK (importance IN ('low', 'medium', 'high')),
    actual_vs_forecast DECIMAL(8,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(indicator, country, release_date)
);

-- Market sentiment data
CREATE TABLE IF NOT EXISTS market_sentiment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    fear_greed_index INTEGER CHECK (fear_greed_index >= 0 AND fear_greed_index <= 100),
    vix DECIMAL(8,4),
    put_call_ratio DECIMAL(8,4),
    margin_debt BIGINT,
    insider_trading_ratio DECIMAL(8,4),
    safe_haven_demand DECIMAL(8,4),
    stock_price_momentum DECIMAL(8,4),
    market_volatility DECIMAL(8,4),
    overall_sentiment sentiment_label,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News articles with sentiment
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT UNIQUE,
    content TEXT,
    source TEXT NOT NULL,
    authors TEXT[],
    published_at TIMESTAMPTZ NOT NULL,
    category TEXT,
    topics JSONB,
    overall_sentiment_score DECIMAL(4,3),
    overall_sentiment_label sentiment_label,
    ticker_sentiments JSONB, -- Array of {ticker, score, label}
    embedding VECTOR(1536), -- For semantic search
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading signals generated by AI
CREATE TABLE IF NOT EXISTS trading_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    action signal_action NOT NULL,
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    price DECIMAL(12,4) NOT NULL,
    target_price DECIMAL(12,4),
    stop_loss DECIMAL(12,4),
    reasoning TEXT NOT NULL,
    technical_indicators JSONB, -- RSI, MACD, etc.
    sentiment_data JSONB,
    risk_score DECIMAL(4,3),
    expected_return DECIMAL(8,4),
    time_horizon TEXT, -- 'short', 'medium', 'long'
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    execution_price DECIMAL(12,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio positions
CREATE TABLE IF NOT EXISTS portfolio_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users if using Supabase auth
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    quantity DECIMAL(12,4) NOT NULL,
    avg_cost DECIMAL(12,4) NOT NULL,
    current_price DECIMAL(12,4),
    market_value DECIMAL(15,2),
    unrealized_pl DECIMAL(15,2),
    unrealized_pl_percent DECIMAL(8,4),
    day_pl DECIMAL(15,2),
    day_pl_percent DECIMAL(8,4),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, symbol)
);

-- Order history
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users
    symbol TEXT NOT NULL REFERENCES tickers(symbol),
    side order_side NOT NULL,
    order_type order_type NOT NULL,
    quantity DECIMAL(12,4) NOT NULL,
    price DECIMAL(12,4),
    stop_price DECIMAL(12,4),
    time_in_force TEXT DEFAULT 'day',
    status order_status NOT NULL DEFAULT 'pending',
    filled_quantity DECIMAL(12,4) DEFAULT 0,
    filled_avg_price DECIMAL(12,4),
    commission DECIMAL(8,2) DEFAULT 0,
    signal_id UUID REFERENCES trading_signals(id),
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users
    name TEXT NOT NULL,
    symbols TEXT[] NOT NULL DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- Scheduled tasks for automation
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    schedule TEXT NOT NULL, -- Cron expression
    action TEXT NOT NULL, -- 'MARKET_SCAN', 'PORTFOLIO_REBALANCE', etc.
    parameters JSONB,
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ NOT NULL,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance tracking
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users
    snapshot_date DATE NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    cash_value DECIMAL(15,2) NOT NULL,
    positions_value DECIMAL(15,2) NOT NULL,
    day_pl DECIMAL(15,2),
    day_pl_percent DECIMAL(8,4),
    total_pl DECIMAL(15,2),
    total_pl_percent DECIMAL(8,4),
    positions_count INTEGER DEFAULT 0,
    diversification_score DECIMAL(4,3),
    risk_metrics JSONB, -- beta, volatility, sharpe_ratio, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, snapshot_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_symbol_timestamp ON quotes(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bars_symbol_timeframe_timestamp ON bars(symbol, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol_timestamp ON trades(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_symbol_generated ON trading_signals(symbol, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_active ON trading_signals(is_active, generated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_embedding ON news_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_user ON portfolio_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run) WHERE enabled = true;

-- Enable Row Level Security (RLS)
ALTER TABLE portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (assuming Supabase auth)
CREATE POLICY "Users can view own portfolio positions" ON portfolio_positions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio positions" ON portfolio_positions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio positions" ON portfolio_positions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own watchlists" ON watchlists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for similarity search on news articles
CREATE OR REPLACE FUNCTION match_news_articles(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.8,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    summary TEXT,
    url TEXT,
    published_at TIMESTAMPTZ,
    overall_sentiment_score DECIMAL,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        news_articles.id,
        news_articles.title,
        news_articles.summary,
        news_articles.url,
        news_articles.published_at,
        news_articles.overall_sentiment_score,
        1 - (news_articles.embedding <=> query_embedding) AS similarity
    FROM news_articles
    WHERE 1 - (news_articles.embedding <=> query_embedding) > match_threshold
    ORDER BY news_articles.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get latest quote for a symbol
CREATE OR REPLACE FUNCTION get_latest_quote(symbol_param TEXT)
RETURNS TABLE (
    symbol TEXT,
    price DECIMAL,
    change DECIMAL,
    change_percent DECIMAL,
    volume BIGINT,
    timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.symbol,
        q.close AS price,
        (q.close - prev.close) AS change,
        ((q.close - prev.close) / prev.close * 100) AS change_percent,
        q.volume,
        q.timestamp
    FROM quotes q
    LEFT JOIN quotes prev ON prev.symbol = q.symbol 
        AND prev.timestamp = (
            SELECT MAX(timestamp) 
            FROM quotes 
            WHERE symbol = q.symbol 
            AND timestamp < q.timestamp
        )
    WHERE q.symbol = symbol_param
    ORDER BY q.timestamp DESC
    LIMIT 1;
END;
$$;

-- Function to calculate portfolio performance
CREATE OR REPLACE FUNCTION calculate_portfolio_performance(user_id_param UUID)
RETURNS TABLE (
    total_value DECIMAL,
    day_pl DECIMAL,
    day_pl_percent DECIMAL,
    total_pl DECIMAL,
    total_pl_percent DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    result RECORD;
BEGIN
    SELECT
        SUM(market_value) AS total_val,
        SUM(day_pl) AS daily_pl,
        SUM(unrealized_pl) AS total_unrealized_pl,
        SUM(quantity * avg_cost) AS total_cost
    INTO result
    FROM portfolio_positions
    WHERE portfolio_positions.user_id = user_id_param;

    RETURN QUERY
    SELECT
        result.total_val,
        result.daily_pl,
        CASE 
            WHEN result.total_val > 0 THEN (result.daily_pl / result.total_val * 100)
            ELSE 0
        END,
        result.total_unrealized_pl,
        CASE 
            WHEN result.total_cost > 0 THEN (result.total_unrealized_pl / result.total_cost * 100)
            ELSE 0
        END;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickers_updated_at BEFORE UPDATE ON tickers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();