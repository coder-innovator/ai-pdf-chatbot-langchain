/**
 * Rate-Limited Yahoo Finance Service
 * Enhanced version with comprehensive rate limiting and fallbacks
 */

import yahooFinance from 'yahoo-finance2';
import { rateLimitedClient } from '../rate-limiting/rate-limited-client.js';
import { Quote, Bar } from '../../types/index.js';

export interface RateLimitedQuote {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  trade_count: number;
  bid: number;
  ask: number;
  bid_size: number;
  ask_size: number;
  spread: number;
  spread_percent: number;
  // Rate limiting specific fields
  source: 'api' | 'cache' | 'fallback';
  lastUpdated: Date;
  rateLimitInfo?: {
    remainingCalls: number;
    resetTime: Date;
    estimatedCost: number;
  };
  // Legacy fields for compatibility
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  dayLow: number;
  dayHigh: number;
  week52Low: number;
  week52High: number;
  preMarketPrice?: number;
  afterHoursPrice?: number;
}

/**
 * Yahoo Finance service with built-in rate limiting and intelligent fallbacks
 */
export class RateLimitedYahooFinanceService {
  private mockPrices: Map<string, number> = new Map();

  constructor() {
    this.initializeMockPrices();
  }

  /**
   * Get stock price with rate limiting and fallbacks
   */
  async getStockPrice(ticker: string): Promise<RateLimitedQuote> {
    const result = await rateLimitedClient.makeAPICall(
      async () => {
        const data = await yahooFinance.quote(ticker);
        return this.transformYahooQuote(data, ticker);
      },
      {
        provider: 'yahoo',
        endpoint: 'quote',
        priority: 'medium',
        maxRetries: 2,
        fallbackToCache: true,
        fallbackData: this.generateFallbackQuote(ticker)
      }
    );

    if (result.success && result.data) {
      return {
        ...result.data,
        source: result.fromCache ? 'cache' : 'api',
        lastUpdated: new Date(),
        rateLimitInfo: {
          remainingCalls: result.rateLimitInfo.usage.remainingCalls,
          resetTime: result.rateLimitInfo.usage.resetTime,
          estimatedCost: result.rateLimitInfo.usage.estimatedCost
        }
      };
    } else {
      // Return fallback quote with error info
      const fallbackQuote = this.generateFallbackQuote(ticker);
      return {
        ...fallbackQuote,
        source: 'fallback',
        lastUpdated: new Date(),
        rateLimitInfo: {
          remainingCalls: 0,
          resetTime: result.rateLimitInfo.usage.resetTime,
          estimatedCost: result.rateLimitInfo.usage.estimatedCost
        }
      };
    }
  }

  /**
   * Get multiple stock prices efficiently (batched with rate limiting)
   */
  async getMultipleStockPrices(tickers: string[]): Promise<RateLimitedQuote[]> {
    const results: RateLimitedQuote[] = [];
    
    console.log(`📊 Fetching ${tickers.length} stock prices with rate limiting...`);

    for (const ticker of tickers) {
      try {
        const quote = await this.getStockPrice(ticker);
        results.push(quote);
        
        // Small delay between calls to be respectful
        await this.sleep(200);
        
      } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        
        // Add fallback quote for failed ticker
        const fallbackQuote = this.generateFallbackQuote(ticker);
        results.push({
          ...fallbackQuote,
          source: 'fallback',
          lastUpdated: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Get historical data with rate limiting
   */
  async getHistoricalData(ticker: string, period: string = '1mo', interval: string = '1d'): Promise<Bar[]> {
    const result = await rateLimitedClient.makeAPICall(
      async () => {
        const data = await yahooFinance.historical(ticker, {
          period1: this.getPeriodStartDate(period),
          interval: interval as any
        });
        
        return data.map(item => ({
          symbol: ticker,
          timestamp: item.date,
          timeframe: '1day' as const,
          open: item.open || 0,
          high: item.high || 0,
          low: item.low || 0,
          close: item.close || 0,
          volume: item.volume || 0,
          trade_count: item.volume ? Math.floor(item.volume / 100) : 0,
          vwap: item.close || 0
        }));
      },
      {
        provider: 'yahoo',
        endpoint: 'historical',
        priority: 'low', // Historical data is less time-sensitive
        maxRetries: 1,
        fallbackToCache: true,
        fallbackData: this.generateFallbackHistoricalData(ticker)
      }
    );

    return result.success && result.data ? result.data : this.generateFallbackHistoricalData(ticker);
  }

  /**
   * Get usage statistics for monitoring
   */
  getUsageStats() {
    return rateLimitedClient.getCacheStats();
  }

  /**
   * Transform Yahoo Finance quote to our format
   */
  private transformYahooQuote(data: any, ticker: string): RateLimitedQuote {
    const price = data.regularMarketPrice || data.price || 0;
    const open = data.regularMarketOpen || data.open || price;
    const high = data.regularMarketDayHigh || data.high || price;
    const low = data.regularMarketDayLow || data.low || price;
    const volume = data.regularMarketVolume || data.volume || 0;
    const bid = data.bid || price - 0.01;
    const ask = data.ask || price + 0.01;
    
    return {
      symbol: ticker.toUpperCase(),
      timestamp: new Date(),
      open,
      high,
      low,
      close: price,
      volume,
      vwap: price, // Simplified VWAP calculation
      trade_count: volume > 0 ? Math.floor(volume / 100) : 0,
      bid,
      ask,
      bid_size: 100,
      ask_size: 100,
      spread: ask - bid,
      spread_percent: ((ask - bid) / price) * 100,
      // Legacy compatibility fields
      price,
      change: data.regularMarketChange || 0,
      changePercent: data.regularMarketChangePercent || 0,
      marketCap: data.marketCap || 0,
      dayLow: low,
      dayHigh: high,
      week52Low: data.fiftyTwoWeekLow || price * 0.8,
      week52High: data.fiftyTwoWeekHigh || price * 1.3,
      preMarketPrice: data.preMarketPrice,
      afterHoursPrice: data.postMarketPrice,
      // Rate limiting fields (set by caller)
      source: 'api',
      lastUpdated: new Date()
    };
  }

  /**
   * Generate realistic fallback quote when API is unavailable
   */
  private generateFallbackQuote(ticker: string): RateLimitedQuote {
    const basePrice = this.mockPrices.get(ticker.toUpperCase()) || 100;
    
    // Add some realistic variance
    const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
    const price = basePrice * (1 + variance);
    const change = basePrice * variance;
    const changePercent = variance * 100;
    const open = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(price, open) * (1 + Math.random() * 0.01);
    const low = Math.min(price, open) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 100000;
    const bid = price - 0.01;
    const ask = price + 0.01;

    return {
      symbol: ticker.toUpperCase(),
      timestamp: new Date(),
      open,
      high,
      low,
      close: price,
      volume,
      vwap: price,
      trade_count: Math.floor(volume / 100),
      bid,
      ask,
      bid_size: 100,
      ask_size: 100,
      spread: ask - bid,
      spread_percent: ((ask - bid) / price) * 100,
      // Legacy compatibility fields
      price,
      change,
      changePercent,
      marketCap: price * 1000000000,
      dayLow: low,
      dayHigh: high,
      week52Low: price * 0.8,
      week52High: price * 1.3,
      preMarketPrice: price * (1 + (Math.random() - 0.5) * 0.01),
      afterHoursPrice: price * (1 + (Math.random() - 0.5) * 0.01),
      source: 'fallback',
      lastUpdated: new Date()
    };
  }

  /**
   * Generate fallback historical data
   */
  private generateFallbackHistoricalData(ticker: string): Bar[] {
    const bars: Bar[] = [];
    const basePrice = this.mockPrices.get(ticker.toUpperCase()) || 100;
    const days = 30;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const variance = (Math.random() - 0.5) * 0.05; // ±2.5% daily variance
      const open = basePrice * (1 + variance);
      const close = open * (1 + (Math.random() - 0.5) * 0.03);
      const high = Math.max(open, close) * (1 + Math.random() * 0.02);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      
      bars.push({
        symbol: ticker,
        timestamp: date,
        timeframe: '1day' as const,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000) + 100000,
        trade_count: Math.floor(Math.random() * 10000) + 1000,
        vwap: (open + high + low + close) / 4
      });
    }

    return bars;
  }

  /**
   * Initialize realistic mock prices for common stocks
   */
  private initializeMockPrices() {
    this.mockPrices.set('AAPL', 175.00);
    this.mockPrices.set('MSFT', 380.00);
    this.mockPrices.set('GOOGL', 140.00);
    this.mockPrices.set('AMZN', 145.00);
    this.mockPrices.set('TSLA', 240.00);
    this.mockPrices.set('NVDA', 750.00);
    this.mockPrices.set('META', 320.00);
    this.mockPrices.set('SPY', 480.00);
    this.mockPrices.set('QQQ', 425.00);
    this.mockPrices.set('IWM', 205.00);
  }

  /**
   * Get period start date for historical data
   */
  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    const date = new Date(now);

    switch (period) {
      case '1d':
        date.setDate(date.getDate() - 1);
        break;
      case '5d':
        date.setDate(date.getDate() - 5);
        break;
      case '1mo':
        date.setMonth(date.getMonth() - 1);
        break;
      case '3mo':
        date.setMonth(date.getMonth() - 3);
        break;
      case '6mo':
        date.setMonth(date.getMonth() - 6);
        break;
      case '1y':
        date.setFullYear(date.getFullYear() - 1);
        break;
      case '2y':
        date.setFullYear(date.getFullYear() - 2);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }

    return date;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const rateLimitedYahooFinance = new RateLimitedYahooFinanceService();