import yahooFinance from 'yahoo-finance2';
import { 
  Quote, 
  Bar, 
  MarketHours,
  Ticker 
} from '../../types/index.js';

/**
 * Yahoo Finance API service with fallback to mock data
 * Provides real market data with graceful degradation for development
 */
export class YahooFinanceService {
  private mockFallbackEnabled: boolean;
  private rateLimitDelay: number; // ms between requests
  private lastRequestTime: number = 0;

  constructor(options: { mockFallback?: boolean; rateLimitDelay?: number } = {}) {
    this.mockFallbackEnabled = options.mockFallback ?? true;
    this.rateLimitDelay = options.rateLimitDelay ?? 100; // 100ms between requests
  }

  /**
   * Get current stock quote
   */
  async getStockPrice(ticker: string): Promise<Quote> {
    try {
      await this.respectRateLimit();
      
      const data = await yahooFinance.quote(ticker) as any;
      return this.normalizeQuoteData(ticker, data);
    } catch (error) {
      console.warn(`Yahoo Finance API failed for ${ticker}:`, error);
      
      if (this.mockFallbackEnabled) {
        console.log(`Falling back to mock data for ${ticker}`);
        return this.generateMockPrice(ticker);
      }
      
      throw error;
    }
  }

  /**
   * Get multiple stock quotes at once
   */
  async getMultipleQuotes(tickers: string[]): Promise<Quote[]> {
    try {
      await this.respectRateLimit();
      
      const data = await yahooFinance.quote(tickers) as any;
      const quotes: Quote[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.symbol) {
            quotes.push(this.normalizeQuoteData(item.symbol, item));
          }
        }
      } else if (data && data.symbol) {
        quotes.push(this.normalizeQuoteData(data.symbol, data));
      }
      
      return quotes;
    } catch (error) {
      console.warn('Yahoo Finance API failed for multiple quotes:', error);
      
      if (this.mockFallbackEnabled) {
        console.log('Falling back to mock data for multiple quotes');
        return Promise.all(tickers.map(ticker => this.generateMockPrice(ticker)));
      }
      
      throw error;
    }
  }

  /**
   * Get historical stock data
   */
  async getHistoricalData(
    ticker: string,
    period1: Date,
    period2: Date,
    interval: '1d' | '1wk' | '1mo' = '1d'
  ): Promise<Bar[]> {
    try {
      await this.respectRateLimit();
      
      const data = await yahooFinance.historical(ticker, {
        period1: period1.toISOString().split('T')[0],
        period2: period2.toISOString().split('T')[0],
        interval,
      });
      
      return data.map(item => this.normalizeHistoricalData(ticker, item, interval));
    } catch (error) {
      console.warn(`Yahoo Finance historical data failed for ${ticker}:`, error);
      
      if (this.mockFallbackEnabled) {
        console.log(`Falling back to mock historical data for ${ticker}`);
        return this.generateMockHistoricalData(ticker, period1, period2, interval);
      }
      
      throw error;
    }
  }

  /**
   * Search for tickers by name or symbol
   */
  async searchTickers(query: string): Promise<Ticker[]> {
    try {
      await this.respectRateLimit();
      
      const data = await yahooFinance.search(query);
      return data.quotes.map(item => this.normalizeTickerData(item));
    } catch (error) {
      console.warn(`Yahoo Finance search failed for "${query}":`, error);
      
      if (this.mockFallbackEnabled) {
        console.log(`Falling back to mock search results for "${query}"`);
        return this.generateMockSearchResults(query);
      }
      
      throw error;
    }
  }

  /**
   * Get company information
   */
  async getCompanyInfo(ticker: string): Promise<Ticker> {
    try {
      await this.respectRateLimit();
      
      const [quote, modules] = await Promise.all([
        yahooFinance.quote(ticker),
        yahooFinance.quoteSummary(ticker, { modules: ['assetProfile', 'summaryProfile'] })
      ]);
      
      return this.normalizeCompanyData(ticker, quote, modules);
    } catch (error) {
      console.warn(`Yahoo Finance company info failed for ${ticker}:`, error);
      
      if (this.mockFallbackEnabled) {
        console.log(`Falling back to mock company info for ${ticker}`);
        return this.generateMockCompanyInfo(ticker);
      }
      
      throw error;
    }
  }

  /**
   * Get market hours for a specific exchange
   */
  async getMarketHours(exchange: string = 'NYSE'): Promise<MarketHours> {
    try {
      // Yahoo Finance doesn't have a direct market hours API
      // We'll check if major markets are open based on time
      return this.calculateMarketHours(exchange);
    } catch (error) {
      console.warn(`Market hours calculation failed for ${exchange}:`, error);
      
      if (this.mockFallbackEnabled) {
        return this.generateMockMarketHours(exchange);
      }
      
      throw error;
    }
  }

  /**
   * Get trending tickers
   */
  async getTrendingTickers(region: string = 'US'): Promise<Ticker[]> {
    try {
      await this.respectRateLimit();
      
      const data = await yahooFinance.trendingSymbols(region) as any;
      return data.finance?.result?.[0]?.quotes?.map((item: any) => 
        this.normalizeTickerData(item)
      ) || [];
    } catch (error) {
      console.warn(`Yahoo Finance trending tickers failed for ${region}:`, error);
      
      if (this.mockFallbackEnabled) {
        console.log(`Falling back to mock trending tickers for ${region}`);
        return this.generateMockTrendingTickers();
      }
      
      throw error;
    }
  }

  // Data normalization methods
  private normalizeQuoteData(symbol: string, data: any): Quote {
    const now = new Date();
    
    const quote: Quote = {
      symbol,
      timestamp: now,
      open: data.regularMarketOpen || data.previousClose || 0,
      high: data.regularMarketDayHigh || data.regularMarketPrice || 0,
      low: data.regularMarketDayLow || data.regularMarketPrice || 0,
      close: data.regularMarketPrice || 0,
      volume: data.regularMarketVolume || 0,
      vwap: data.regularMarketPrice || 0, // Yahoo doesn't provide VWAP directly
      trade_count: 0, // Not available in Yahoo Finance
      bid: data.bid || data.regularMarketPrice || 0,
      ask: data.ask || data.regularMarketPrice || 0,
      bid_size: data.bidSize || 0,
      ask_size: data.askSize || 0,
      spread: data.ask && data.bid ? data.ask - data.bid : 0,
      spread_percent: data.ask && data.bid && data.bid > 0 ? 
        ((data.ask - data.bid) / data.bid) * 100 : 0,
    };
    
    return quote;
  }

  private normalizeHistoricalData(
    symbol: string, 
    data: any, 
    interval: string
  ): Bar {
    const timeframe = this.mapIntervalToTimeframe(interval);
    
    return {
      symbol,
      timestamp: new Date(data.date),
      timeframe,
      open: data.open || 0,
      high: data.high || 0,
      low: data.low || 0,
      close: data.close || 0,
      volume: data.volume || 0,
      trade_count: 0, // Not available
      vwap: (data.open + data.high + data.low + data.close) / 4, // Approximation
    };
  }

  private normalizeTickerData(data: any): Ticker {
    return {
      symbol: data.symbol || '',
      name: data.longname || data.shortname || '',
      exchange: data.exchange || '',
      sector: data.sector || '',
      industry: data.industry || '',
      market_cap: data.marketCap || 0,
      shares_outstanding: data.sharesOutstanding || 0,
      country: data.country || 'US',
      currency: data.currency || 'USD',
      is_active: true,
      last_updated: new Date(),
    };
  }

  private normalizeCompanyData(symbol: string, quote: any, modules: any): Ticker {
    const profile = modules.assetProfile || modules.summaryProfile || {};
    
    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      exchange: quote.fullExchangeName || quote.exchange || '',
      sector: profile.sector || '',
      industry: profile.industry || '',
      market_cap: quote.marketCap || 0,
      shares_outstanding: quote.sharesOutstanding || 0,
      country: profile.country || 'US',
      currency: quote.currency || 'USD',
      is_active: true,
      last_updated: new Date(),
    };
  }

  // Mock data generation methods
  private generateMockPrice(ticker: string): Quote {
    const basePrice = this.getBasePriceForTicker(ticker);
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    const volume = Math.floor(Math.random() * 10000000) + 1000000;
    
    const now = new Date();
    
    const quote: Quote = {
      symbol: ticker,
      timestamp: now,
      open: price * 0.99,
      high: price * 1.02,
      low: price * 0.97,
      close: price,
      volume,
      vwap: price * 1.001,
      trade_count: Math.floor(volume / 100),
      bid: price * 0.999,
      ask: price * 1.001,
      bid_size: Math.floor(Math.random() * 1000) + 100,
      ask_size: Math.floor(Math.random() * 1000) + 100,
      spread: price * 0.002,
      spread_percent: 0.2,
    };
    
    return quote;
  }

  private generateMockHistoricalData(
    ticker: string, 
    startDate: Date, 
    endDate: Date, 
    interval: string
  ): Bar[] {
    const bars: Bar[] = [];
    const basePrice = this.getBasePriceForTicker(ticker);
    const timeframe = this.mapIntervalToTimeframe(interval);
    
    let currentDate = new Date(startDate);
    let currentPrice = basePrice;
    
    while (currentDate <= endDate) {
      const variation = (Math.random() - 0.5) * 0.05; // ±2.5% daily variation
      currentPrice *= (1 + variation);
      
      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
      const close = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
      const high = Math.max(open, close) * (1 + Math.random() * 0.03);
      const low = Math.min(open, close) * (1 - Math.random() * 0.03);
      
      bars.push({
        symbol: ticker,
        timestamp: new Date(currentDate),
        timeframe,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 5000000) + 1000000,
        trade_count: Math.floor(Math.random() * 10000) + 1000,
        vwap: (open + high + low + close) / 4,
      });
      
      // Increment date based on interval
      if (interval === '1d') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (interval === '1wk') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (interval === '1mo') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    return bars;
  }

  private generateMockSearchResults(query: string): Ticker[] {
    const mockTickers = [
      'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'
    ];
    
    return mockTickers
      .filter(symbol => 
        symbol.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(symbol.toLowerCase())
      )
      .slice(0, 5)
      .map(symbol => ({
        symbol,
        name: this.getCompanyNameForTicker(symbol),
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software',
        market_cap: Math.floor(Math.random() * 1000000000000) + 100000000000,
        shares_outstanding: Math.floor(Math.random() * 10000000000) + 1000000000,
        country: 'US',
        currency: 'USD',
        is_active: true,
        last_updated: new Date(),
      }));
  }

  private generateMockCompanyInfo(ticker: string): Ticker {
    return {
      symbol: ticker,
      name: this.getCompanyNameForTicker(ticker),
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      market_cap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      shares_outstanding: Math.floor(Math.random() * 10000000000) + 1000000000,
      country: 'US',
      currency: 'USD',
      is_active: true,
      last_updated: new Date(),
    };
  }

  private generateMockTrendingTickers(): Ticker[] {
    const trending = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'MSFT'];
    
    return trending.map(symbol => ({
      symbol,
      name: this.getCompanyNameForTicker(symbol),
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      market_cap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      shares_outstanding: Math.floor(Math.random() * 10000000000) + 1000000000,
      country: 'US',
      currency: 'USD',
      is_active: true,
      last_updated: new Date(),
    }));
  }

  private calculateMarketHours(exchange: string): MarketHours {
    const now = new Date();
    const easternTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    
    const [hours, minutes] = easternTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    
    // NYSE/NASDAQ: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    const isOpen = currentMinutes >= marketOpen && currentMinutes < marketClose;
    
    // Calculate next open/close
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let nextOpen: Date;
    let nextClose: Date;
    
    if (isOpen) {
      // Market is open, next close is today
      nextClose = new Date(now);
      nextClose.setHours(16, 0, 0, 0);
      
      // Next open is tomorrow
      nextOpen = new Date(tomorrow);
      nextOpen.setHours(9, 30, 0, 0);
    } else {
      // Market is closed
      if (currentMinutes < marketOpen) {
        // Before market open today
        nextOpen = new Date(now);
        nextOpen.setHours(9, 30, 0, 0);
        
        nextClose = new Date(now);
        nextClose.setHours(16, 0, 0, 0);
      } else {
        // After market close, next open is tomorrow
        nextOpen = new Date(tomorrow);
        nextOpen.setHours(9, 30, 0, 0);
        
        nextClose = new Date(tomorrow);
        nextClose.setHours(16, 0, 0, 0);
      }
    }
    
    return {
      is_open: isOpen,
      next_open: nextOpen,
      next_close: nextClose,
    };
  }

  private generateMockMarketHours(exchange: string): MarketHours {
    const now = new Date();
    const hour = now.getHours();
    
    // Simple mock: market is open 9-16 UTC
    const isOpen = hour >= 9 && hour < 16;
    
    const nextOpen = new Date(now);
    const nextClose = new Date(now);
    
    if (isOpen) {
      nextClose.setHours(16, 0, 0, 0);
      nextOpen.setDate(nextOpen.getDate() + 1);
      nextOpen.setHours(9, 0, 0, 0);
    } else {
      if (hour < 9) {
        nextOpen.setHours(9, 0, 0, 0);
        nextClose.setHours(16, 0, 0, 0);
      } else {
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(9, 0, 0, 0);
        nextClose.setDate(nextClose.getDate() + 1);
        nextClose.setHours(16, 0, 0, 0);
      }
    }
    
    return {
      is_open: isOpen,
      next_open: nextOpen,
      next_close: nextClose,
    };
  }

  // Helper methods
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private mapIntervalToTimeframe(interval: string): Bar['timeframe'] {
    switch (interval) {
      case '1d': return '1day';
      case '1wk': return '1week';
      case '1mo': return '1month';
      default: return '1day';
    }
  }

  private getBasePriceForTicker(ticker: string): number {
    const prices: { [key: string]: number } = {
      'AAPL': 180,
      'GOOGL': 140,
      'MSFT': 350,
      'AMZN': 150,
      'TSLA': 250,
      'META': 300,
      'NVDA': 800,
      'NFLX': 400,
    };
    
    return prices[ticker] || 100;
  }

  private getCompanyNameForTicker(ticker: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla, Inc.',
      'META': 'Meta Platforms, Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix, Inc.',
    };
    
    return names[ticker] || `${ticker} Corporation`;
  }
}