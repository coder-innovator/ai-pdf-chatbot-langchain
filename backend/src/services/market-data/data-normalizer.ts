import { 
  Quote, 
  Bar, 
  Ticker, 
  NewsArticle,
  CryptoQuote
} from '../../types/index.js';

/**
 * Raw data from various APIs (before normalization)
 */
export interface RawMarketData {
  source: string;
  symbol: string;
  timestamp: string | Date;
  data: any;
}

/**
 * Normalization configuration
 */
export interface NormalizationConfig {
  timezone: string;
  currency: string;
  precision: {
    price: number;
    volume: number;
    percentage: number;
  };
  validation: {
    strictMode: boolean;
    allowNegativePrices: boolean;
    maxPriceVariation: number; // Max % change from previous price
  };
  fallbacks: {
    useLastKnownPrice: boolean;
    defaultVolume: number;
    defaultSpread: number;
  };
}

/**
 * Data normalization result
 */
export interface NormalizationResult<T> {
  success: boolean;
  data: T | null;
  warnings: string[];
  errors: string[];
  source: string;
  normalizedAt: Date;
}

/**
 * Advanced data normalizer that standardizes market data from multiple sources
 * Handles different API formats, validates data quality, and applies corrections
 */
export class DataNormalizer {
  private config: NormalizationConfig;
  private lastKnownPrices: Map<string, number> = new Map();
  private dataQualityMetrics: Map<string, {
    successRate: number;
    errorCount: number;
    warningCount: number;
    lastUpdate: Date;
  }> = new Map();

  constructor(config: Partial<NormalizationConfig> = {}) {
    this.config = {
      timezone: config.timezone || 'America/New_York',
      currency: config.currency || 'USD',
      precision: {
        price: config.precision?.price || 4,
        volume: config.precision?.volume || 0,
        percentage: config.precision?.percentage || 2,
      },
      validation: {
        strictMode: config.validation?.strictMode || false,
        allowNegativePrices: config.validation?.allowNegativePrices || false,
        maxPriceVariation: config.validation?.maxPriceVariation || 0.5, // 50%
      },
      fallbacks: {
        useLastKnownPrice: config.fallbacks?.useLastKnownPrice || true,
        defaultVolume: config.fallbacks?.defaultVolume || 0,
        defaultSpread: config.fallbacks?.defaultSpread || 0.01,
      },
    };
  }

  /**
   * Normalize quote data from various sources
   */
  normalizeQuote(rawData: RawMarketData): NormalizationResult<Quote> {
    const result: NormalizationResult<Quote> = {
      success: false,
      data: null,
      warnings: [],
      errors: [],
      source: rawData.source,
      normalizedAt: new Date(),
    };

    try {
      const quote = this.extractQuoteData(rawData);
      
      // Validate required fields
      if (!this.validateQuoteData(quote, result)) {
        return result;
      }

      // Apply corrections and validations
      this.correctQuoteData(quote, result);
      
      // Final validation
      if (this.finalValidateQuote(quote, result)) {
        result.success = true;
        result.data = quote;
        
        // Store last known price
        this.lastKnownPrices.set(quote.symbol, quote.close);
      }
      
      this.updateQualityMetrics(rawData.source, result);
      return result;
      
    } catch (error) {
      result.errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateQualityMetrics(rawData.source, result);
      return result;
    }
  }

  /**
   * Normalize historical bar data
   */
  normalizeBars(rawData: RawMarketData[]): NormalizationResult<Bar[]> {
    const result: NormalizationResult<Bar[]> = {
      success: false,
      data: [],
      warnings: [],
      errors: [],
      source: rawData[0]?.source || 'unknown',
      normalizedAt: new Date(),
    };

    try {
      const bars: Bar[] = [];
      let validCount = 0;
      
      for (const raw of rawData) {
        try {
          const bar = this.extractBarData(raw);
          
          if (this.validateBarData(bar, result)) {
            this.correctBarData(bar, result);
            bars.push(bar);
            validCount++;
          }
        } catch (error) {
          result.warnings.push(`Skipped invalid bar: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Sort bars by timestamp
      bars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Validate sequence
      this.validateBarSequence(bars, result);
      
      if (validCount > 0) {
        result.success = true;
        result.data = bars;
      } else {
        result.errors.push('No valid bars found in dataset');
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`Bar normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Normalize ticker/company data
   */
  normalizeTicker(rawData: RawMarketData): NormalizationResult<Ticker> {
    const result: NormalizationResult<Ticker> = {
      success: false,
      data: null,
      warnings: [],
      errors: [],
      source: rawData.source,
      normalizedAt: new Date(),
    };

    try {
      const ticker = this.extractTickerData(rawData);
      
      if (this.validateTickerData(ticker, result)) {
        this.correctTickerData(ticker, result);
        result.success = true;
        result.data = ticker;
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`Ticker normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Normalize news article data
   */
  normalizeNewsArticle(rawData: RawMarketData): NormalizationResult<NewsArticle> {
    const result: NormalizationResult<NewsArticle> = {
      success: false,
      data: null,
      warnings: [],
      errors: [],
      source: rawData.source,
      normalizedAt: new Date(),
    };

    try {
      const article = this.extractNewsData(rawData);
      
      if (this.validateNewsData(article, result)) {
        this.correctNewsData(article, result);
        result.success = true;
        result.data = article;
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`News normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Normalize cryptocurrency data
   */
  normalizeCryptoQuote(rawData: RawMarketData): NormalizationResult<CryptoQuote> {
    const result: NormalizationResult<CryptoQuote> = {
      success: false,
      data: null,
      warnings: [],
      errors: [],
      source: rawData.source,
      normalizedAt: new Date(),
    };

    try {
      const crypto = this.extractCryptoData(rawData);
      
      if (this.validateCryptoData(crypto, result)) {
        this.correctCryptoData(crypto, result);
        result.success = true;
        result.data = crypto;
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`Crypto normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Batch normalize multiple data points
   */
  async normalizeBatch<T>(
    rawDataArray: RawMarketData[],
    normalizeFunction: (data: RawMarketData) => NormalizationResult<T>
  ): Promise<{
    successful: T[];
    failed: RawMarketData[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      warnings: number;
      errors: number;
    };
  }> {
    const successful: T[] = [];
    const failed: RawMarketData[] = [];
    let totalWarnings = 0;
    let totalErrors = 0;

    for (const rawData of rawDataArray) {
      const result = normalizeFunction.call(this, rawData);
      
      if (result.success && result.data) {
        successful.push(result.data);
      } else {
        failed.push(rawData);
      }
      
      totalWarnings += result.warnings.length;
      totalErrors += result.errors.length;
    }

    return {
      successful,
      failed,
      summary: {
        total: rawDataArray.length,
        successful: successful.length,
        failed: failed.length,
        warnings: totalWarnings,
        errors: totalErrors,
      },
    };
  }

  /**
   * Get data quality metrics
   */
  getQualityMetrics(): { [source: string]: {
    successRate: number;
    errorCount: number;
    warningCount: number;
    lastUpdate: Date;
  } } {
    const metrics: { [source: string]: any } = {};
    
    for (const [source, data] of this.dataQualityMetrics) {
      metrics[source] = { ...data };
    }
    
    return metrics;
  }

  // Private extraction methods for different data sources
  private extractQuoteData(rawData: RawMarketData): Quote {
    const data = rawData.data;
    const symbol = rawData.symbol || data.symbol || data.ticker;
    
    // Handle different API response formats
    switch (rawData.source.toLowerCase()) {
      case 'yahoo':
        return this.extractYahooQuote(symbol, data);
      case 'alphavantage':
        return this.extractAlphaVantageQuote(symbol, data);
      case 'iex':
        return this.extractIEXQuote(symbol, data);
      case 'finnhub':
        return this.extractFinnhubQuote(symbol, data);
      default:
        return this.extractGenericQuote(symbol, data);
    }
  }

  private extractYahooQuote(symbol: string, data: any): Quote {
    return {
      symbol,
      timestamp: this.normalizeTimestamp(data.regularMarketTime || new Date()),
      open: this.normalizePrice(data.regularMarketOpen),
      high: this.normalizePrice(data.regularMarketDayHigh),
      low: this.normalizePrice(data.regularMarketDayLow),
      close: this.normalizePrice(data.regularMarketPrice),
      volume: this.normalizeVolume(data.regularMarketVolume),
      vwap: this.normalizePrice(data.regularMarketPrice), // Yahoo doesn't provide VWAP
      trade_count: 0, // Not available
      bid: this.normalizePrice(data.bid),
      ask: this.normalizePrice(data.ask),
      bid_size: this.normalizeVolume(data.bidSize),
      ask_size: this.normalizeVolume(data.askSize),
      spread: this.calculateSpread(data.bid, data.ask),
      spread_percent: this.calculateSpreadPercent(data.bid, data.ask),
    };
  }

  private extractAlphaVantageQuote(symbol: string, data: any): Quote {
    // Alpha Vantage format (implement as needed)
    const quote = data['Global Quote'] || data;
    
    return {
      symbol,
      timestamp: this.normalizeTimestamp(new Date()),
      open: this.normalizePrice(quote['02. open']),
      high: this.normalizePrice(quote['03. high']),
      low: this.normalizePrice(quote['04. low']),
      close: this.normalizePrice(quote['05. price']),
      volume: this.normalizeVolume(quote['06. volume']),
      vwap: this.normalizePrice(quote['05. price']),
      trade_count: 0,
      bid: this.normalizePrice(quote['05. price']) * 0.999,
      ask: this.normalizePrice(quote['05. price']) * 1.001,
      bid_size: 100,
      ask_size: 100,
      spread: this.normalizePrice(quote['05. price']) * 0.002,
      spread_percent: 0.2,
    };
  }

  private extractIEXQuote(symbol: string, data: any): Quote {
    return {
      symbol,
      timestamp: this.normalizeTimestamp(data.latestUpdate || new Date()),
      open: this.normalizePrice(data.open),
      high: this.normalizePrice(data.high),
      low: this.normalizePrice(data.low),
      close: this.normalizePrice(data.latestPrice),
      volume: this.normalizeVolume(data.latestVolume),
      vwap: this.normalizePrice(data.latestPrice),
      trade_count: 0,
      bid: this.normalizePrice(data.iexBidPrice),
      ask: this.normalizePrice(data.iexAskPrice),
      bid_size: this.normalizeVolume(data.iexBidSize),
      ask_size: this.normalizeVolume(data.iexAskSize),
      spread: this.calculateSpread(data.iexBidPrice, data.iexAskPrice),
      spread_percent: this.calculateSpreadPercent(data.iexBidPrice, data.iexAskPrice),
    };
  }

  private extractFinnhubQuote(symbol: string, data: any): Quote {
    return {
      symbol,
      timestamp: this.normalizeTimestamp(data.t ? new Date(data.t * 1000) : new Date()),
      open: this.normalizePrice(data.o),
      high: this.normalizePrice(data.h),
      low: this.normalizePrice(data.l),
      close: this.normalizePrice(data.c),
      volume: this.normalizeVolume(data.v),
      vwap: this.normalizePrice(data.c),
      trade_count: 0,
      bid: this.normalizePrice(data.c) * 0.999,
      ask: this.normalizePrice(data.c) * 1.001,
      bid_size: 100,
      ask_size: 100,
      spread: this.normalizePrice(data.c) * 0.002,
      spread_percent: 0.2,
    };
  }

  private extractGenericQuote(symbol: string, data: any): Quote {
    // Generic extraction for unknown sources
    const price = this.findPrice(data);
    const volume = this.findVolume(data);
    const timestamp = this.findTimestamp(data);

    return {
      symbol,
      timestamp,
      open: price * 0.99,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume,
      vwap: price,
      trade_count: 0,
      bid: price * 0.999,
      ask: price * 1.001,
      bid_size: 100,
      ask_size: 100,
      spread: price * 0.002,
      spread_percent: 0.2,
    };
  }

  private extractBarData(rawData: RawMarketData): Bar {
    const data = rawData.data;
    const symbol = rawData.symbol || data.symbol;
    
    return {
      symbol,
      timestamp: this.normalizeTimestamp(data.date || data.timestamp || data.t),
      timeframe: this.normalizeTimeframe(data.interval || '1day'),
      open: this.normalizePrice(data.open || data.o),
      high: this.normalizePrice(data.high || data.h),
      low: this.normalizePrice(data.low || data.l),
      close: this.normalizePrice(data.close || data.c),
      volume: this.normalizeVolume(data.volume || data.v),
      trade_count: this.normalizeVolume(data.trade_count || 0),
      vwap: this.normalizePrice(data.vwap || (data.open + data.high + data.low + data.close) / 4),
    };
  }

  private extractTickerData(rawData: RawMarketData): Ticker {
    const data = rawData.data;
    
    return {
      symbol: rawData.symbol || data.symbol,
      name: data.longName || data.shortName || data.name || `${rawData.symbol} Corporation`,
      exchange: data.exchange || data.fullExchangeName || 'UNKNOWN',
      sector: data.sector || '',
      industry: data.industry || '',
      market_cap: this.normalizeNumber(data.marketCap || data.market_cap),
      shares_outstanding: this.normalizeNumber(data.sharesOutstanding || data.shares_outstanding),
      country: data.country || 'US',
      currency: data.currency || this.config.currency,
      is_active: data.is_active !== false,
      last_updated: new Date(),
    };
  }

  private extractNewsData(rawData: RawMarketData): NewsArticle {
    const data = rawData.data;
    
    return {
      title: data.title || '',
      summary: data.summary || data.description || '',
      url: data.url || data.link || '',
      time_published: this.normalizeTimestamp(data.time_published || data.published_at || data.date).toISOString(),
      authors: Array.isArray(data.authors) ? data.authors : [data.author || 'Unknown'],
      source: data.source || rawData.source,
      category_within_source: data.category || 'General',
      source_domain: data.source_domain || new URL(data.url || 'https://example.com').hostname,
      topics: data.topics || [],
      overall_sentiment_score: this.normalizeSentimentScore(data.sentiment_score),
      overall_sentiment_label: this.normalizeSentimentLabel(data.sentiment_label),
      ticker_sentiment: data.ticker_sentiment || [],
    };
  }

  private extractCryptoData(rawData: RawMarketData): CryptoQuote {
    const data = rawData.data;
    const symbol = rawData.symbol || data.symbol;
    const [base, quote] = symbol.split('-') || symbol.split('/') || [symbol, 'USD'];
    
    return {
      symbol,
      base_currency: base,
      quote_currency: quote || 'USD',
      price: this.normalizePrice(data.price || data.current_price),
      volume_24h: this.normalizeVolume(data.volume_24h || data.total_volume),
      market_cap: this.normalizeNumber(data.market_cap),
      circulating_supply: this.normalizeNumber(data.circulating_supply),
      total_supply: this.normalizeNumber(data.total_supply),
      max_supply: data.max_supply ? this.normalizeNumber(data.max_supply) : null,
      change_24h: this.normalizePercentage(data.price_change_percentage_24h),
      change_7d: this.normalizePercentage(data.price_change_percentage_7d),
      change_30d: this.normalizePercentage(data.price_change_percentage_30d),
      ath: this.normalizePrice(data.ath),
      ath_date: this.normalizeTimestamp(data.ath_date),
      atl: this.normalizePrice(data.atl),
      atl_date: this.normalizeTimestamp(data.atl_date),
      timestamp: new Date(),
    };
  }

  // Validation methods
  private validateQuoteData(quote: Quote, result: NormalizationResult<Quote>): boolean {
    if (!quote.symbol) {
      result.errors.push('Missing symbol');
      return false;
    }

    if (quote.close <= 0 && !this.config.validation.allowNegativePrices) {
      result.errors.push('Invalid price: must be positive');
      return false;
    }

    if (quote.volume < 0) {
      result.errors.push('Invalid volume: must be non-negative');
      return false;
    }

    return true;
  }

  private validateBarData(bar: Bar, result: NormalizationResult<Bar[]>): boolean {
    if (!bar.symbol) {
      result.warnings.push('Missing symbol in bar data');
      return false;
    }

    if (bar.high < bar.low) {
      result.warnings.push('High price less than low price');
      return false;
    }

    if (bar.open < 0 || bar.close < 0) {
      result.warnings.push('Negative prices in bar data');
      return false;
    }

    return true;
  }

  private validateTickerData(ticker: Ticker, result: NormalizationResult<Ticker>): boolean {
    if (!ticker.symbol) {
      result.errors.push('Missing symbol');
      return false;
    }

    if (!ticker.name) {
      result.warnings.push('Missing company name');
    }

    return true;
  }

  private validateNewsData(article: NewsArticle, result: NormalizationResult<NewsArticle>): boolean {
    if (!article.title) {
      result.errors.push('Missing article title');
      return false;
    }

    if (!article.url) {
      result.warnings.push('Missing article URL');
    }

    return true;
  }

  private validateCryptoData(crypto: CryptoQuote, result: NormalizationResult<CryptoQuote>): boolean {
    if (!crypto.symbol) {
      result.errors.push('Missing crypto symbol');
      return false;
    }

    if (crypto.price <= 0) {
      result.errors.push('Invalid crypto price');
      return false;
    }

    return true;
  }

  // Correction methods
  private correctQuoteData(quote: Quote, result: NormalizationResult<Quote>): void {
    // Check for extreme price variations
    const lastPrice = this.lastKnownPrices.get(quote.symbol);
    if (lastPrice && this.config.validation.maxPriceVariation > 0) {
      const variation = Math.abs(quote.close - lastPrice) / lastPrice;
      if (variation > this.config.validation.maxPriceVariation) {
        result.warnings.push(`Large price variation detected: ${(variation * 100).toFixed(2)}%`);
        
        if (this.config.fallbacks.useLastKnownPrice) {
          quote.close = lastPrice;
          result.warnings.push('Used last known price as fallback');
        }
      }
    }

    // Ensure OHLC consistency
    if (quote.high < Math.max(quote.open, quote.close)) {
      quote.high = Math.max(quote.open, quote.close);
      result.warnings.push('Adjusted high price for OHLC consistency');
    }

    if (quote.low > Math.min(quote.open, quote.close)) {
      quote.low = Math.min(quote.open, quote.close);
      result.warnings.push('Adjusted low price for OHLC consistency');
    }

    // Calculate missing spread if needed
    if (!quote.spread && quote.bid && quote.ask) {
      quote.spread = quote.ask - quote.bid;
      quote.spread_percent = (quote.spread / quote.close) * 100;
    }
  }

  private correctBarData(bar: Bar, result: NormalizationResult<Bar[]>): void {
    // Similar corrections as quote data
    this.correctQuoteData(bar as any, result as any);
  }

  private correctTickerData(ticker: Ticker, result: NormalizationResult<Ticker>): void {
    // Ensure reasonable market cap
    if (ticker.market_cap && ticker.market_cap < 0) {
      ticker.market_cap = 0;
      result.warnings.push('Corrected negative market cap');
    }
  }

  private correctNewsData(article: NewsArticle, result: NormalizationResult<NewsArticle>): void {
    // Ensure sentiment score is in valid range
    if (article.overall_sentiment_score !== undefined) {
      article.overall_sentiment_score = Math.max(-1, Math.min(1, article.overall_sentiment_score));
    }
  }

  private correctCryptoData(crypto: CryptoQuote, result: NormalizationResult<CryptoQuote>): void {
    // Ensure supply values are reasonable
    if (crypto.circulating_supply && crypto.total_supply && 
        crypto.circulating_supply > crypto.total_supply) {
      result.warnings.push('Circulating supply exceeds total supply');
    }
  }

  // Final validation
  private finalValidateQuote(quote: Quote, result: NormalizationResult<Quote>): boolean {
    if (this.config.validation.strictMode) {
      if (!quote.bid || !quote.ask || !quote.volume) {
        result.errors.push('Strict mode: missing required fields');
        return false;
      }
    }
    return true;
  }

  private validateBarSequence(bars: Bar[], result: NormalizationResult<Bar[]>): void {
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].timestamp <= bars[i - 1].timestamp) {
        result.warnings.push('Non-sequential timestamps detected');
        break;
      }
    }
  }

  // Utility methods
  private normalizeTimestamp(value: any): Date {
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    if (typeof value === 'number') {
      // Handle Unix timestamps (seconds or milliseconds)
      const timestamp = value < 10000000000 ? value * 1000 : value;
      return new Date(timestamp);
    }
    return new Date();
  }

  private normalizePrice(value: any): number {
    const price = parseFloat(value) || 0;
    return Math.round(price * Math.pow(10, this.config.precision.price)) / Math.pow(10, this.config.precision.price);
  }

  private normalizeVolume(value: any): number {
    return Math.round(parseFloat(value) || 0);
  }

  private normalizeNumber(value: any): number {
    return parseFloat(value) || 0;
  }

  private normalizePercentage(value: any): number {
    const percentage = parseFloat(value) || 0;
    return Math.round(percentage * Math.pow(10, this.config.precision.percentage)) / Math.pow(10, this.config.precision.percentage);
  }

  private normalizeTimeframe(value: any): Bar['timeframe'] {
    const timeframes: { [key: string]: Bar['timeframe'] } = {
      '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
      '1h': '1hour', '4h': '4hour', '1d': '1day', '1w': '1week', '1M': '1month'
    };
    return timeframes[value] || '1day';
  }

  private normalizeSentimentScore(value: any): number {
    if (value === undefined || value === null) return 0;
    return Math.max(-1, Math.min(1, parseFloat(value) || 0));
  }

  private normalizeSentimentLabel(value: any): NewsArticle['overall_sentiment_label'] {
    const label = String(value || '').toLowerCase();
    const mapping: { [key: string]: NewsArticle['overall_sentiment_label'] } = {
      'bearish': 'Bearish',
      'negative': 'Bearish',
      'somewhat-bearish': 'Somewhat-Bearish',
      'neutral': 'Neutral',
      'somewhat-bullish': 'Somewhat-Bullish',
      'bullish': 'Bullish',
      'positive': 'Bullish',
    };
    return mapping[label] || 'Neutral';
  }

  private calculateSpread(bid: any, ask: any): number {
    const bidPrice = parseFloat(bid) || 0;
    const askPrice = parseFloat(ask) || 0;
    return askPrice - bidPrice;
  }

  private calculateSpreadPercent(bid: any, ask: any): number {
    const bidPrice = parseFloat(bid) || 0;
    const askPrice = parseFloat(ask) || 0;
    if (bidPrice === 0) return 0;
    return ((askPrice - bidPrice) / bidPrice) * 100;
  }

  private findPrice(data: any): number {
    const priceFields = ['price', 'close', 'last', 'current_price', 'regularMarketPrice'];
    for (const field of priceFields) {
      if (data[field] !== undefined) {
        return parseFloat(data[field]) || 0;
      }
    }
    return 0;
  }

  private findVolume(data: any): number {
    const volumeFields = ['volume', 'vol', 'regularMarketVolume'];
    for (const field of volumeFields) {
      if (data[field] !== undefined) {
        return Math.round(parseFloat(data[field]) || 0);
      }
    }
    return this.config.fallbacks.defaultVolume;
  }

  private findTimestamp(data: any): Date {
    const timestampFields = ['timestamp', 'time', 'date', 'regularMarketTime'];
    for (const field of timestampFields) {
      if (data[field] !== undefined) {
        return this.normalizeTimestamp(data[field]);
      }
    }
    return new Date();
  }

  private updateQualityMetrics(source: string, result: NormalizationResult<any>): void {
    const current = this.dataQualityMetrics.get(source) || {
      successRate: 0,
      errorCount: 0,
      warningCount: 0,
      lastUpdate: new Date(),
    };

    current.errorCount += result.errors.length;
    current.warningCount += result.warnings.length;
    current.lastUpdate = new Date();

    // Calculate success rate (simple moving average)
    const alpha = 0.1; // Smoothing factor
    current.successRate = current.successRate * (1 - alpha) + (result.success ? 1 : 0) * alpha;

    this.dataQualityMetrics.set(source, current);
  }
}