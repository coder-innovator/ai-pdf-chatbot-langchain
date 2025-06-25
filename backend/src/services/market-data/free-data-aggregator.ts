import { 
  Quote, 
  Bar, 
  Ticker, 
  NewsArticle,
  MarketHours,
  CryptoQuote
} from '../../types/index.js';
import { YahooFinanceService } from './yahoo-finance.js';

/**
 * Data source configuration
 */
interface DataSourceConfig {
  name: string;
  priority: number;
  enabled: boolean;
  rateLimit: number; // requests per minute
  reliability: number; // 0-1 score
}

/**
 * Data source interface
 */
interface DataSource {
  name: string;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]>;
  searchTickers(query: string): Promise<Ticker[]>;
  getNews?(symbols: string[]): Promise<NewsArticle[]>;
  getCryptoQuote?(symbol: string): Promise<CryptoQuote>;
  isHealthy(): Promise<boolean>;
}

/**
 * Free data aggregator that combines multiple sources for reliability
 * Automatically falls back between sources based on availability and reliability
 */
export class FreeDataAggregator {
  private dataSources: Map<string, DataSource> = new Map();
  private sourceConfigs: Map<string, DataSourceConfig> = new Map();
  private healthStatus: Map<string, { isHealthy: boolean; lastCheck: Date }> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: Date }> = new Map();
  
  // Fallback services
  private yahooFinance: YahooFinanceService;

  constructor() {
    this.yahooFinance = new YahooFinanceService({ mockFallback: true });
    this.initializeDataSources();
  }

  /**
   * Initialize all available data sources
   */
  private initializeDataSources(): void {
    // Yahoo Finance (free, reliable)
    this.addDataSource('yahoo', new YahooFinanceDataSource(this.yahooFinance), {
      name: 'Yahoo Finance',
      priority: 1,
      enabled: true,
      rateLimit: 2000, // 2000 requests per minute
      reliability: 0.9
    });

    // Alpha Vantage (free tier)
    this.addDataSource('alphavantage', new AlphaVantageDataSource(), {
      name: 'Alpha Vantage',
      priority: 2,
      enabled: true,
      rateLimit: 5, // 5 requests per minute on free tier
      reliability: 0.8
    });

    // IEX Cloud (free tier)
    this.addDataSource('iex', new IEXCloudDataSource(), {
      name: 'IEX Cloud',
      priority: 3,
      enabled: true,
      rateLimit: 100, // 100 requests per minute on free tier
      reliability: 0.85
    });

    // Finnhub (free tier)
    this.addDataSource('finnhub', new FinnhubDataSource(), {
      name: 'Finnhub',
      priority: 4,
      enabled: true,
      rateLimit: 60, // 60 requests per minute on free tier
      reliability: 0.75
    });

    // Twelve Data (free tier)
    this.addDataSource('twelvedata', new TwelveDataSource(), {
      name: 'Twelve Data',
      priority: 5,
      enabled: true,
      rateLimit: 8, // 8 requests per minute on free tier
      reliability: 0.7
    });
  }

  /**
   * Add a new data source
   */
  addDataSource(id: string, source: DataSource, config: DataSourceConfig): void {
    this.dataSources.set(id, source);
    this.sourceConfigs.set(id, config);
    this.healthStatus.set(id, { isHealthy: true, lastCheck: new Date() });
    this.requestCounts.set(id, { count: 0, resetTime: new Date(Date.now() + 60000) });
  }

  /**
   * Get quote with automatic fallback
   */
  async getQuote(symbol: string): Promise<Quote> {
    const sources = this.getSortedAvailableSources();
    
    for (const sourceId of sources) {
      try {
        if (!this.canMakeRequest(sourceId)) {
          console.warn(`Rate limit reached for ${sourceId}, skipping`);
          continue;
        }
        
        const source = this.dataSources.get(sourceId)!;
        const quote = await source.getQuote(symbol);
        
        this.recordSuccessfulRequest(sourceId);
        return quote;
      } catch (error) {
        console.warn(`Failed to get quote from ${sourceId}:`, error);
        this.recordFailedRequest(sourceId);
        continue;
      }
    }
    
    throw new Error(`Failed to get quote for ${symbol} from all sources`);
  }

  /**
   * Get multiple quotes with load balancing
   */
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes: Quote[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming sources
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          return await this.getQuote(symbol);
        } catch (error) {
          console.warn(`Failed to get quote for ${symbol}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      quotes.push(...batchResults.filter(q => q !== null) as Quote[]);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return quotes;
  }

  /**
   * Get historical data with fallback
   */
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    const sources = this.getSortedAvailableSources();
    
    for (const sourceId of sources) {
      try {
        if (!this.canMakeRequest(sourceId)) {
          continue;
        }
        
        const source = this.dataSources.get(sourceId)!;
        const data = await source.getHistoricalData(symbol, start, end);
        
        this.recordSuccessfulRequest(sourceId);
        return data;
      } catch (error) {
        console.warn(`Failed to get historical data from ${sourceId}:`, error);
        this.recordFailedRequest(sourceId);
        continue;
      }
    }
    
    throw new Error(`Failed to get historical data for ${symbol} from all sources`);
  }

  /**
   * Search tickers across multiple sources
   */
  async searchTickers(query: string): Promise<Ticker[]> {
    const sources = this.getSortedAvailableSources();
    const allResults: Ticker[] = [];
    const seenSymbols = new Set<string>();
    
    for (const sourceId of sources.slice(0, 3)) { // Only use top 3 sources for search
      try {
        if (!this.canMakeRequest(sourceId)) {
          continue;
        }
        
        const source = this.dataSources.get(sourceId)!;
        const results = await source.searchTickers(query);
        
        // Deduplicate results
        for (const ticker of results) {
          if (!seenSymbols.has(ticker.symbol)) {
            seenSymbols.add(ticker.symbol);
            allResults.push(ticker);
          }
        }
        
        this.recordSuccessfulRequest(sourceId);
        
        // If we have enough results, stop searching
        if (allResults.length >= 20) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to search tickers from ${sourceId}:`, error);
        this.recordFailedRequest(sourceId);
        continue;
      }
    }
    
    return allResults.slice(0, 20); // Limit to 20 results
  }

  /**
   * Get news from multiple sources
   */
  async getNews(symbols: string[]): Promise<NewsArticle[]> {
    const sources = this.getSortedAvailableSources();
    const allNews: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    for (const sourceId of sources) {
      try {
        if (!this.canMakeRequest(sourceId)) {
          continue;
        }
        
        const source = this.dataSources.get(sourceId)!;
        if (!source.getNews) {
          continue;
        }
        
        const news = await source.getNews(symbols);
        
        // Deduplicate by URL
        for (const article of news) {
          if (article.url && !seenUrls.has(article.url)) {
            seenUrls.add(article.url);
            allNews.push(article);
          }
        }
        
        this.recordSuccessfulRequest(sourceId);
      } catch (error) {
        console.warn(`Failed to get news from ${sourceId}:`, error);
        this.recordFailedRequest(sourceId);
        continue;
      }
    }
    
    // Sort by published date (most recent first)
    return allNews.sort((a, b) => 
      new Date(b.time_published).getTime() - new Date(a.time_published).getTime()
    );
  }

  /**
   * Get aggregated market status
   */
  async getMarketHours(): Promise<MarketHours> {
    // Use Yahoo Finance for market hours (most reliable)
    return this.yahooFinance.getMarketHours();
  }

  /**
   * Get health status of all sources
   */
  async getSourcesHealth(): Promise<{ [sourceId: string]: { healthy: boolean; lastCheck: Date; config: DataSourceConfig } }> {
    const health: { [sourceId: string]: { healthy: boolean; lastCheck: Date; config: DataSourceConfig } } = {};
    
    for (const [sourceId, source] of this.dataSources) {
      const config = this.sourceConfigs.get(sourceId)!;
      const status = this.healthStatus.get(sourceId)!;
      
      // Check health if it's been more than 5 minutes
      if (Date.now() - status.lastCheck.getTime() > 300000) {
        try {
          const isHealthy = await source.isHealthy();
          this.healthStatus.set(sourceId, { isHealthy, lastCheck: new Date() });
          status.isHealthy = isHealthy;
        } catch (error) {
          status.isHealthy = false;
          this.healthStatus.set(sourceId, { isHealthy: false, lastCheck: new Date() });
        }
      }
      
      health[sourceId] = {
        healthy: status.isHealthy,
        lastCheck: status.lastCheck,
        config
      };
    }
    
    return health;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { [sourceId: string]: { requests: number; resetTime: Date } } {
    const stats: { [sourceId: string]: { requests: number; resetTime: Date } } = {};
    
    for (const [sourceId, data] of this.requestCounts) {
      stats[sourceId] = {
        requests: data.count,
        resetTime: data.resetTime
      };
    }
    
    return stats;
  }

  // Private helper methods
  private getSortedAvailableSources(): string[] {
    const sources = Array.from(this.sourceConfigs.entries())
      .filter(([id, config]) => {
        const health = this.healthStatus.get(id);
        return config.enabled && health?.isHealthy !== false;
      })
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority)
        const priorityDiff = a[1].priority - b[1].priority;
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by reliability (higher = better)
        return b[1].reliability - a[1].reliability;
      })
      .map(([id]) => id);
    
    return sources;
  }

  private canMakeRequest(sourceId: string): boolean {
    const requestData = this.requestCounts.get(sourceId);
    const config = this.sourceConfigs.get(sourceId);
    
    if (!requestData || !config) return false;
    
    // Reset counter if time has passed
    if (Date.now() >= requestData.resetTime.getTime()) {
      this.requestCounts.set(sourceId, {
        count: 0,
        resetTime: new Date(Date.now() + 60000) // Reset in 1 minute
      });
      return true;
    }
    
    return requestData.count < config.rateLimit;
  }

  private recordSuccessfulRequest(sourceId: string): void {
    const requestData = this.requestCounts.get(sourceId);
    if (requestData) {
      requestData.count++;
    }
    
    // Mark source as healthy
    const healthData = this.healthStatus.get(sourceId);
    if (healthData) {
      healthData.isHealthy = true;
      healthData.lastCheck = new Date();
    }
  }

  private recordFailedRequest(sourceId: string): void {
    const requestData = this.requestCounts.get(sourceId);
    if (requestData) {
      requestData.count++;
    }
    
    // Mark source as potentially unhealthy
    const healthData = this.healthStatus.get(sourceId);
    if (healthData) {
      healthData.isHealthy = false;
      healthData.lastCheck = new Date();
    }
  }
}

// Data source implementations
class YahooFinanceDataSource implements DataSource {
  name = 'Yahoo Finance';
  
  constructor(private yahooService: YahooFinanceService) {}
  
  async getQuote(symbol: string): Promise<Quote> {
    return this.yahooService.getStockPrice(symbol);
  }
  
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return this.yahooService.getMultipleQuotes(symbols);
  }
  
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    return this.yahooService.getHistoricalData(symbol, start, end);
  }
  
  async searchTickers(query: string): Promise<Ticker[]> {
    return this.yahooService.searchTickers(query);
  }
  
  async isHealthy(): Promise<boolean> {
    try {
      await this.yahooService.getStockPrice('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

class AlphaVantageDataSource implements DataSource {
  name = 'Alpha Vantage';
  
  async getQuote(symbol: string): Promise<Quote> {
    // Mock implementation - replace with real Alpha Vantage API
    throw new Error('Alpha Vantage implementation pending');
  }
  
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(symbols.map(s => this.getQuote(s)));
    return quotes;
  }
  
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    // Mock implementation
    throw new Error('Alpha Vantage historical data implementation pending');
  }
  
  async searchTickers(query: string): Promise<Ticker[]> {
    // Mock implementation
    return [];
  }
  
  async isHealthy(): Promise<boolean> {
    return false; // Not implemented yet
  }
}

class IEXCloudDataSource implements DataSource {
  name = 'IEX Cloud';
  
  async getQuote(symbol: string): Promise<Quote> {
    // Mock implementation - replace with real IEX Cloud API
    throw new Error('IEX Cloud implementation pending');
  }
  
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(symbols.map(s => this.getQuote(s)));
    return quotes;
  }
  
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    // Mock implementation
    throw new Error('IEX Cloud historical data implementation pending');
  }
  
  async searchTickers(query: string): Promise<Ticker[]> {
    // Mock implementation
    return [];
  }
  
  async isHealthy(): Promise<boolean> {
    return false; // Not implemented yet
  }
}

class FinnhubDataSource implements DataSource {
  name = 'Finnhub';
  
  async getQuote(symbol: string): Promise<Quote> {
    // Mock implementation - replace with real Finnhub API
    throw new Error('Finnhub implementation pending');
  }
  
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(symbols.map(s => this.getQuote(s)));
    return quotes;
  }
  
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    // Mock implementation
    throw new Error('Finnhub historical data implementation pending');
  }
  
  async searchTickers(query: string): Promise<Ticker[]> {
    // Mock implementation
    return [];
  }
  
  async getNews(symbols: string[]): Promise<NewsArticle[]> {
    // Mock implementation
    return [];
  }
  
  async isHealthy(): Promise<boolean> {
    return false; // Not implemented yet
  }
}

class TwelveDataSource implements DataSource {
  name = 'Twelve Data';
  
  async getQuote(symbol: string): Promise<Quote> {
    // Mock implementation - replace with real Twelve Data API
    throw new Error('Twelve Data implementation pending');
  }
  
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await Promise.all(symbols.map(s => this.getQuote(s)));
    return quotes;
  }
  
  async getHistoricalData(symbol: string, start: Date, end: Date): Promise<Bar[]> {
    // Mock implementation
    throw new Error('Twelve Data historical data implementation pending');
  }
  
  async searchTickers(query: string): Promise<Ticker[]> {
    // Mock implementation
    return [];
  }
  
  async isHealthy(): Promise<boolean> {
    return false; // Not implemented yet
  }
}