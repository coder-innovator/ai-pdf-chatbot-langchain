import { 
  MarketData, 
  TradingSignal, 
  NewsArticle, 
  Quote, 
  Bar,
  AlpacaPosition,
  PortfolioAnalysis,
  ScheduledTask,
  Ticker
} from '../../types/index.js';

// Supabase-like response interfaces
export interface MockSupabaseResponse<T> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

export interface MockSupabaseSingleResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface QueryOptions {
  select?: string;
  eq?: { [key: string]: any };
  gt?: { [key: string]: any };
  gte?: { [key: string]: any };
  lt?: { [key: string]: any };
  lte?: { [key: string]: any };
  like?: { [key: string]: string };
  ilike?: { [key: string]: string };
  in?: { [key: string]: any[] };
  order?: { column: string; ascending?: boolean };
  range?: { from: number; to: number };
  limit?: number;
  single?: boolean;
}

export interface VectorSearchOptions {
  embedding: number[];
  matchThreshold?: number;
  matchCount?: number;
  filter?: { [key: string]: any };
}

/**
 * Mock storage service that mimics Supabase API patterns for testing and development
 * without requiring actual Supabase connection
 */
export class MockTradingStorage {
  // In-memory data stores
  private marketData: Map<string, MarketData[]> = new Map();
  private tradingSignals: TradingSignal[] = [];
  private newsData: NewsArticle[] = [];
  private quotes: Map<string, Quote[]> = new Map();
  private bars: Map<string, Bar[]> = new Map();
  private tickers: Ticker[] = [];
  private portfolioPositions: Map<string, AlpacaPosition[]> = new Map();
  private scheduledTasks: ScheduledTask[] = [];
  
  // Vector store for embeddings (simplified)
  private newsEmbeddings: Map<string, { article: NewsArticle; embedding: number[] }> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with some sample data for testing
   */
  private initializeMockData(): void {
    // Sample tickers
    const sampleTickers: Ticker[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        market_cap: 3000000000000,
        shares_outstanding: 16000000000,
        country: 'US',
        currency: 'USD',
        is_active: true,
        last_updated: new Date(),
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        exchange: 'NASDAQ',
        sector: 'Consumer Cyclical',
        industry: 'Auto Manufacturers',
        market_cap: 800000000000,
        shares_outstanding: 3000000000,
        country: 'US',
        currency: 'USD',
        is_active: true,
        last_updated: new Date(),
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Semiconductors',
        market_cap: 2500000000000,
        shares_outstanding: 25000000000,
        country: 'US',
        currency: 'USD',
        is_active: true,
        last_updated: new Date(),
      }
    ];

    this.tickers = sampleTickers;

    // Sample quotes
    sampleTickers.forEach(ticker => {
      const quotes: Quote[] = [];
      const basePrice = ticker.symbol === 'AAPL' ? 180 : ticker.symbol === 'TSLA' ? 250 : 800;
      
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const variation = (Math.random() - 0.5) * 0.1;
        const price = basePrice * (1 + variation);
        
        quotes.push({
          symbol: ticker.symbol,
          timestamp: date,
          open: price * 0.99,
          high: price * 1.02,
          low: price * 0.97,
          close: price,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          vwap: price * 1.001,
          trade_count: Math.floor(Math.random() * 10000) + 1000,
          bid: price * 0.999,
          ask: price * 1.001,
          bid_size: Math.floor(Math.random() * 1000) + 100,
          ask_size: Math.floor(Math.random() * 1000) + 100,
          spread: price * 0.002,
          spread_percent: 0.2,
        });
      }
      
      this.quotes.set(ticker.symbol, quotes);
    });

    // Sample trading signals
    this.tradingSignals = [
      {
        symbol: 'AAPL',
        action: 'BUY',
        confidence: 0.85,
        price: 180.50,
        timestamp: new Date(),
        reasoning: 'Strong technical indicators and positive earnings outlook',
        indicators: {
          rsi: 45,
          ma_short: 178.30,
          ma_long: 175.20,
        },
        sentiment: {
          score: 0.7,
          news_count: 15,
          articles: [],
        },
      },
      {
        symbol: 'TSLA',
        action: 'HOLD',
        confidence: 0.60,
        price: 250.75,
        timestamp: new Date(Date.now() - 3600000),
        reasoning: 'Mixed signals, awaiting clearer direction',
        indicators: {
          rsi: 55,
          ma_short: 248.90,
          ma_long: 252.10,
        },
      },
    ];

    // Sample news articles
    this.newsData = [
      {
        title: 'Apple Reports Strong Q4 Earnings',
        summary: 'Apple Inc. reported better-than-expected quarterly earnings driven by strong iPhone sales.',
        url: 'https://example.com/apple-earnings',
        time_published: new Date(Date.now() - 7200000).toISOString(),
        authors: ['John Doe', 'Jane Smith'],
        source: 'Financial News',
        category_within_source: 'Technology',
        source_domain: 'financialnews.com',
        topics: [
          { topic: 'Earnings', relevance_score: '0.9' },
          { topic: 'Technology', relevance_score: '0.8' }
        ],
        overall_sentiment_score: 0.8,
        overall_sentiment_label: 'Bullish',
        ticker_sentiment: [
          {
            ticker: 'AAPL',
            relevance_score: '0.95',
            ticker_sentiment_score: '0.8',
            ticker_sentiment_label: 'Bullish'
          }
        ],
      },
      {
        title: 'Tesla Faces Production Challenges',
        summary: 'Tesla is experiencing supply chain issues affecting production targets.',
        url: 'https://example.com/tesla-production',
        time_published: new Date(Date.now() - 14400000).toISOString(),
        authors: ['Bob Wilson'],
        source: 'Auto News',
        category_within_source: 'Automotive',
        source_domain: 'autonews.com',
        topics: [
          { topic: 'Production', relevance_score: '0.9' },
          { topic: 'Supply Chain', relevance_score: '0.7' }
        ],
        overall_sentiment_score: -0.3,
        overall_sentiment_label: 'Somewhat-Bearish',
        ticker_sentiment: [
          {
            ticker: 'TSLA',
            relevance_score: '0.9',
            ticker_sentiment_score: '-0.3',
            ticker_sentiment_label: 'Somewhat-Bearish'
          }
        ],
      },
    ];
  }

  /**
   * Mimic Supabase insert operation
   */
  async insert<T>(table: string, data: T | T[]): Promise<MockSupabaseResponse<T>> {
    try {
      const items = Array.isArray(data) ? data : [data];
      
      switch (table) {
        case 'trading_signals':
          this.tradingSignals.push(...(items as TradingSignal[]));
          break;
        case 'news_articles':
          this.newsData.push(...(items as NewsArticle[]));
          break;
        case 'tickers':
          this.tickers.push(...(items as Ticker[]));
          break;
        case 'quotes':
          items.forEach(item => {
            const quote = item as Quote;
            const existing = this.quotes.get(quote.symbol) || [];
            existing.push(quote);
            this.quotes.set(quote.symbol, existing);
          });
          break;
        case 'bars':
          items.forEach(item => {
            const bar = item as Bar;
            const existing = this.bars.get(bar.symbol) || [];
            existing.push(bar);
            this.bars.set(bar.symbol, existing);
          });
          break;
        default:
          throw new Error(`Table ${table} not supported in mock storage`);
      }

      return { data: items, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Mimic Supabase select operation with filtering
   */
  async select<T>(table: string, options: QueryOptions = {}): Promise<MockSupabaseResponse<T>> {
    try {
      let data: any[] = [];

      // Get base data
      switch (table) {
        case 'trading_signals':
          data = [...this.tradingSignals];
          break;
        case 'news_articles':
          data = [...this.newsData];
          break;
        case 'tickers':
          data = [...this.tickers];
          break;
        case 'quotes':
          data = Array.from(this.quotes.values()).flat();
          break;
        case 'bars':
          data = Array.from(this.bars.values()).flat();
          break;
        default:
          throw new Error(`Table ${table} not supported in mock storage`);
      }

      // Apply filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          data = data.filter(item => item[key] === value);
        });
      }

      if (options.gt) {
        Object.entries(options.gt).forEach(([key, value]) => {
          data = data.filter(item => item[key] > value);
        });
      }

      if (options.gte) {
        Object.entries(options.gte).forEach(([key, value]) => {
          data = data.filter(item => item[key] >= value);
        });
      }

      if (options.lt) {
        Object.entries(options.lt).forEach(([key, value]) => {
          data = data.filter(item => item[key] < value);
        });
      }

      if (options.lte) {
        Object.entries(options.lte).forEach(([key, value]) => {
          data = data.filter(item => item[key] <= value);
        });
      }

      if (options.like) {
        Object.entries(options.like).forEach(([key, pattern]) => {
          const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
          data = data.filter(item => regex.test(item[key]));
        });
      }

      if (options.in) {
        Object.entries(options.in).forEach(([key, values]) => {
          data = data.filter(item => values.includes(item[key]));
        });
      }

      // Apply ordering
      if (options.order) {
        const { column, ascending = true } = options.order;
        data.sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          
          if (aVal < bVal) return ascending ? -1 : 1;
          if (aVal > bVal) return ascending ? 1 : -1;
          return 0;
        });
      }

      // Apply range/pagination
      if (options.range) {
        const { from, to } = options.range;
        data = data.slice(from, to + 1);
      } else if (options.limit) {
        data = data.slice(0, options.limit);
      }

      // Return single item if requested
      if (options.single) {
        return { 
          data: data.length > 0 ? data[0] : null, 
          error: null 
        } as any;
      }

      return { data, error: null, count: data.length };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Mimic Supabase update operation
   */
  async update<T>(table: string, updates: Partial<T>, options: QueryOptions = {}): Promise<MockSupabaseResponse<T>> {
    try {
      const selectResult = await this.select<T>(table, options);
      if (selectResult.error || !selectResult.data) {
        return selectResult;
      }

      const itemsToUpdate = Array.isArray(selectResult.data) ? selectResult.data : [selectResult.data];
      
      // Apply updates
      itemsToUpdate.forEach(item => {
        Object.assign(item as any, updates);
      });

      return { data: itemsToUpdate, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Mimic Supabase delete operation
   */
  async delete<T>(table: string, options: QueryOptions = {}): Promise<MockSupabaseResponse<T>> {
    try {
      const selectResult = await this.select<T>(table, options);
      if (selectResult.error || !selectResult.data) {
        return selectResult;
      }

      const itemsToDelete = Array.isArray(selectResult.data) ? selectResult.data : [selectResult.data];

      // Remove items from storage
      switch (table) {
        case 'trading_signals':
          itemsToDelete.forEach(item => {
            const index = this.tradingSignals.findIndex(signal => 
              JSON.stringify(signal) === JSON.stringify(item)
            );
            if (index > -1) this.tradingSignals.splice(index, 1);
          });
          break;
        case 'news_articles':
          itemsToDelete.forEach(item => {
            const index = this.newsData.findIndex(article => 
              JSON.stringify(article) === JSON.stringify(item)
            );
            if (index > -1) this.newsData.splice(index, 1);
          });
          break;
        // Add other tables as needed
      }

      return { data: itemsToDelete, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Mimic vector similarity search for news articles
   */
  async vectorSimilarity(options: VectorSearchOptions): Promise<MockSupabaseResponse<NewsArticle & { similarity: number }>> {
    try {
      const { embedding, matchThreshold = 0.8, matchCount = 10, filter = {} } = options;

      // Simple cosine similarity calculation (mock implementation)
      const similarities: Array<NewsArticle & { similarity: number }> = [];

      this.newsData.forEach(article => {
        // Generate a mock embedding for comparison (in real implementation, this would be stored)
        const articleEmbedding = this.generateMockEmbedding(article.title + ' ' + article.summary);
        
        const similarity = this.cosineSimilarity(embedding, articleEmbedding);
        
        if (similarity >= matchThreshold) {
          similarities.push({ ...article, similarity });
        }
      });

      // Sort by similarity (descending)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Apply limit
      const results = similarities.slice(0, matchCount);

      return { data: results, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Get latest market data for symbols
   */
  async getLatestQuotes(symbols: string[]): Promise<MockSupabaseResponse<Quote>> {
    try {
      const latestQuotes: Quote[] = [];

      symbols.forEach(symbol => {
        const quotes = this.quotes.get(symbol);
        if (quotes && quotes.length > 0) {
          // Get the most recent quote
          const latest = quotes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          latestQuotes.push(latest);
        }
      });

      return { data: latestQuotes, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Get active trading signals
   */
  async getActiveSignals(symbols?: string[]): Promise<MockSupabaseResponse<TradingSignal>> {
    try {
      let signals = [...this.tradingSignals];

      if (symbols) {
        signals = signals.filter(signal => symbols.includes(signal.symbol));
      }

      // Sort by timestamp (most recent first)
      signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return { data: signals, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { message: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  async clearAll(): Promise<void> {
    this.marketData.clear();
    this.tradingSignals = [];
    this.newsData = [];
    this.quotes.clear();
    this.bars.clear();
    this.tickers = [];
    this.portfolioPositions.clear();
    this.scheduledTasks = [];
    this.newsEmbeddings.clear();
  }

  /**
   * Get storage statistics
   */
  getStats(): { [key: string]: number } {
    return {
      tickers: this.tickers.length,
      quotes: Array.from(this.quotes.values()).reduce((sum, quotes) => sum + quotes.length, 0),
      bars: Array.from(this.bars.values()).reduce((sum, bars) => sum + bars.length, 0),
      tradingSignals: this.tradingSignals.length,
      newsArticles: this.newsData.length,
      marketDataSeries: this.marketData.size,
      portfolioUsers: this.portfolioPositions.size,
      scheduledTasks: this.scheduledTasks.length,
    };
  }

  // Helper methods
  private generateMockEmbedding(text: string): number[] {
    // Simple mock embedding generation (in reality, use a proper embedding model)
    const embedding = new Array(1536).fill(0);
    for (let i = 0; i < text.length && i < 100; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % 1536] += charCode / 1000;
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * StorageAdapter-compatible delete method
   */
  async deleteById(table: string, id: string): Promise<void> {
    await this.delete(table, { id });
  }
}