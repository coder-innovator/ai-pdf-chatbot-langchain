import { 
  Quote, 
  NewsArticle, 
  TradingSignal, 
  Ticker 
} from '../../types/index.js';
import { 
  SupabaseResponse, 
  SupabaseSingleResponse,
  TickersTable,
  QuotesTable,
  NewsArticlesTable,
  TradingSignalsTable
} from '../../types/supabase-trading.js';
import { MockTradingStorage } from '../../services/storage/mock-trading-storage.js';
import { InMemoryVectorStore } from '../../services/storage/in-memory-vector-store.js';

/**
 * Storage adapter interface for easy mock-to-production transition
 * Provides unified API for data storage regardless of backend
 */
export interface StorageAdapter {
  // Basic CRUD operations
  insert<T>(table: string, data: T | T[]): Promise<SupabaseResponse<T>>;
  select<T>(table: string, query?: StorageQuery): Promise<SupabaseResponse<T>>;
  update<T>(table: string, data: Partial<T>, filter: StorageFilter): Promise<SupabaseResponse<T>>;
  delete<T>(table: string, filter: StorageFilter): Promise<SupabaseResponse<T>>;
  
  // Vector operations
  vectorSearch(
    embedding: number[], 
    options: VectorSearchOptions
  ): Promise<SupabaseResponse<NewsArticlesTable & { similarity: number }>>;
  
  // Specialized financial operations
  insertQuote(quote: Quote): Promise<SupabaseSingleResponse<QuotesTable>>;
  insertNewsArticle(article: NewsArticle): Promise<SupabaseSingleResponse<NewsArticlesTable>>;
  insertTradingSignal(signal: TradingSignal): Promise<SupabaseSingleResponse<TradingSignalsTable>>;
  insertTicker(ticker: Ticker): Promise<SupabaseSingleResponse<TickersTable>>;
  
  // Batch operations
  insertQuotesBatch(quotes: Quote[]): Promise<SupabaseResponse<QuotesTable>>;
  insertNewsArticlesBatch(articles: NewsArticle[]): Promise<SupabaseResponse<NewsArticlesTable>>;
  
  // Health and stats
  healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }>;
  getStats(): Promise<{ tables: { [table: string]: number }; totalSize: number }>;
}

/**
 * Query interface for storage operations
 */
export interface StorageQuery {
  select?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
  filter?: StorageFilter;
}

/**
 * Filter interface for query conditions
 */
export interface StorageFilter {
  [column: string]: any;
  equals?: { [column: string]: any };
  greaterThan?: { [column: string]: any };
  lessThan?: { [column: string]: any };
  like?: { [column: string]: string };
  in?: { [column: string]: any[] };
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  matchThreshold?: number;
  matchCount?: number;
  table?: string;
  filter?: StorageFilter;
}

/**
 * Mock storage adapter implementation
 * Uses in-memory storage for development and testing
 */
export class MockStorageAdapter implements StorageAdapter {
  private mockStorage: MockTradingStorage;
  private vectorStore: InMemoryVectorStore;

  constructor() {
    this.mockStorage = new MockTradingStorage();
    this.vectorStore = new InMemoryVectorStore();
  }

  async insert<T>(table: string, data: T | T[]): Promise<SupabaseResponse<T>> {
    try {
      const result = await this.mockStorage.insert(table, data);
      return {
        data: Array.isArray(data) ? result.data : [result.data],
        error: null,
        count: Array.isArray(data) ? data.length : 1,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Insert failed',
          details: '',
          hint: '',
          code: 'INSERT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async select<T>(table: string, query: StorageQuery = {}): Promise<SupabaseResponse<T>> {
    try {
      const mockQuery = this.convertToMockQuery(query);
      const result = await this.mockStorage.select(table, mockQuery);
      return {
        data: result.data,
        error: null,
        count: result.data?.length || 0,
        status: 200,
        statusText: 'OK'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Select failed',
          details: '',
          hint: '',
          code: 'SELECT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async update<T>(table: string, data: Partial<T>, filter: StorageFilter): Promise<SupabaseResponse<T>> {
    try {
      const result = await this.mockStorage.update(table, data, filter);
      return {
        data: [result.data],
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Update failed',
          details: '',
          hint: '',
          code: 'UPDATE_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async delete<T>(table: string, filter: StorageFilter): Promise<SupabaseResponse<T>> {
    try {
      await this.mockStorage.delete(table, filter);
      return {
        data: [],
        error: null,
        count: 0,
        status: 204,
        statusText: 'No Content'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Delete failed',
          details: '',
          hint: '',
          code: 'DELETE_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async vectorSearch(
    embedding: number[], 
    options: VectorSearchOptions
  ): Promise<SupabaseResponse<NewsArticlesTable & { similarity: number }>> {
    try {
      const results = await this.vectorStore.similaritySearch(
        embedding, 
        options.matchCount || 10,
        options.matchThreshold || 0.7
      );
      
      return {
        data: results.map(result => ({
          ...result,
          similarity: result.score || 0
        } as any)),
        error: null,
        count: results.length,
        status: 200,
        statusText: 'OK'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Vector search failed',
          details: '',
          hint: '',
          code: 'VECTOR_SEARCH_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertQuote(quote: Quote): Promise<SupabaseSingleResponse<QuotesTable>> {
    try {
      const quoteData = this.convertQuoteToTable(quote);
      const result = await this.mockStorage.insert('quotes', quoteData);
      return {
        data: result.data,
        error: null,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Quote insert failed',
          details: '',
          hint: '',
          code: 'QUOTE_INSERT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertNewsArticle(article: NewsArticle): Promise<SupabaseSingleResponse<NewsArticlesTable>> {
    try {
      const articleData = this.convertNewsToTable(article);
      const result = await this.mockStorage.insert('news_articles', articleData);
      return {
        data: result.data,
        error: null,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'News article insert failed',
          details: '',
          hint: '',
          code: 'NEWS_INSERT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertTradingSignal(signal: TradingSignal): Promise<SupabaseSingleResponse<TradingSignalsTable>> {
    try {
      const signalData = this.convertSignalToTable(signal);
      const result = await this.mockStorage.insert('trading_signals', signalData);
      return {
        data: result.data,
        error: null,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Trading signal insert failed',
          details: '',
          hint: '',
          code: 'SIGNAL_INSERT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertTicker(ticker: Ticker): Promise<SupabaseSingleResponse<TickersTable>> {
    try {
      const tickerData = this.convertTickerToTable(ticker);
      const result = await this.mockStorage.insert('tickers', tickerData);
      return {
        data: result.data,
        error: null,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Ticker insert failed',
          details: '',
          hint: '',
          code: 'TICKER_INSERT_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertQuotesBatch(quotes: Quote[]): Promise<SupabaseResponse<QuotesTable>> {
    try {
      const quotesData = quotes.map(q => this.convertQuoteToTable(q));
      const result = await this.mockStorage.insertBatch('quotes', quotesData);
      return {
        data: result.data,
        error: null,
        count: quotes.length,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Batch quotes insert failed',
          details: '',
          hint: '',
          code: 'BATCH_QUOTES_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async insertNewsArticlesBatch(articles: NewsArticle[]): Promise<SupabaseResponse<NewsArticlesTable>> {
    try {
      const articlesData = articles.map(a => this.convertNewsToTable(a));
      const result = await this.mockStorage.insertBatch('news_articles', articlesData);
      return {
        data: result.data,
        error: null,
        count: articles.length,
        status: 201,
        statusText: 'Created'
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Batch news insert failed',
          details: '',
          hint: '',
          code: 'BATCH_NEWS_ERROR'
        },
        status: 500,
        statusText: 'Internal Server Error'
      };
    }
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      // Test basic operations
      await this.select('tickers', { limit: 1 });
      const vectorCount = this.vectorStore.getDocumentCount();
      
      return {
        status: 'ok',
        message: `Mock storage healthy. Vector documents: ${vectorCount}`
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  async getStats(): Promise<{ tables: { [table: string]: number }; totalSize: number }> {
    const stats = this.mockStorage.getStats();
    const vectorStats = this.vectorStore.getStats();
    
    return {
      tables: {
        ...stats,
        vector_documents: vectorStats.documentCount
      },
      totalSize: vectorStats.memoryUsage || 0
    };
  }

  // Helper methods for data conversion
  private convertToMockQuery(query: StorageQuery): any {
    return {
      limit: query.limit,
      offset: query.offset,
      orderBy: query.orderBy,
      ...query.filter
    };
  }

  private convertQuoteToTable(quote: Quote): Partial<QuotesTable> {
    return {
      symbol: quote.symbol,
      timestamp: quote.timestamp.toISOString(),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume,
      vwap: quote.vwap,
      trade_count: quote.trade_count,
      bid: quote.bid,
      ask: quote.ask,
      bid_size: quote.bid_size,
      ask_size: quote.ask_size,
      spread: quote.spread,
      spread_percent: quote.spread_percent,
      created_at: new Date().toISOString()
    };
  }

  private convertNewsToTable(article: NewsArticle): Partial<NewsArticlesTable> {
    return {
      title: article.title,
      summary: article.summary,
      url: article.url,
      source: article.source,
      authors: article.authors,
      published_at: article.time_published,
      category: article.category_within_source,
      overall_sentiment_score: article.overall_sentiment_score,
      overall_sentiment_label: this.mapSentimentLabel(article.overall_sentiment_label),
      ticker_sentiments: article.ticker_sentiment,
      created_at: new Date().toISOString()
    };
  }

  private convertSignalToTable(signal: TradingSignal): Partial<TradingSignalsTable> {
    return {
      symbol: signal.symbol,
      action: signal.action,
      confidence: signal.confidence,
      price: signal.price,
      target_price: signal.target_price,
      stop_loss: signal.stop_loss,
      reasoning: signal.reasoning,
      technical_indicators: signal.indicators,
      risk_score: signal.risk_level,
      generated_at: signal.timestamp.toISOString(),
      is_active: true,
      executed: false,
      created_at: new Date().toISOString()
    };
  }

  private convertTickerToTable(ticker: Ticker): Partial<TickersTable> {
    return {
      symbol: ticker.symbol,
      name: ticker.name,
      exchange: ticker.exchange,
      sector: ticker.sector,
      industry: ticker.industry,
      market_cap: ticker.market_cap,
      shares_outstanding: ticker.shares_outstanding,
      country: ticker.country,
      currency: ticker.currency,
      is_active: ticker.is_active,
      created_at: new Date().toISOString(),
      updated_at: ticker.last_updated.toISOString()
    };
  }

  private mapSentimentLabel(label: string): NewsArticlesTable['overall_sentiment_label'] {
    const mapping: { [key: string]: NewsArticlesTable['overall_sentiment_label'] } = {
      'Bearish': 'bearish',
      'Somewhat-Bearish': 'somewhat_bearish',
      'Neutral': 'neutral',
      'Somewhat-Bullish': 'somewhat_bullish',
      'Bullish': 'bullish'
    };
    return mapping[label] || 'neutral';
  }
}

/**
 * Supabase storage adapter implementation (for future production use)
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  // TODO: Implement with real Supabase client
  // This class will mirror the MockStorageAdapter interface
  // but use actual Supabase operations
  
  constructor(private supabaseUrl: string, private supabaseKey: string) {
    // Initialize Supabase client
  }

  async insert<T>(table: string, data: T | T[]): Promise<SupabaseResponse<T>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async select<T>(table: string, query?: StorageQuery): Promise<SupabaseResponse<T>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async update<T>(table: string, data: Partial<T>, filter: StorageFilter): Promise<SupabaseResponse<T>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async delete<T>(table: string, filter: StorageFilter): Promise<SupabaseResponse<T>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async vectorSearch(
    embedding: number[], 
    options: VectorSearchOptions
  ): Promise<SupabaseResponse<NewsArticlesTable & { similarity: number }>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertQuote(quote: Quote): Promise<SupabaseSingleResponse<QuotesTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertNewsArticle(article: NewsArticle): Promise<SupabaseSingleResponse<NewsArticlesTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertTradingSignal(signal: TradingSignal): Promise<SupabaseSingleResponse<TradingSignalsTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertTicker(ticker: Ticker): Promise<SupabaseSingleResponse<TickersTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertQuotesBatch(quotes: Quote[]): Promise<SupabaseResponse<QuotesTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async insertNewsArticlesBatch(articles: NewsArticle[]): Promise<SupabaseResponse<NewsArticlesTable>> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    throw new Error('Supabase adapter not implemented yet');
  }

  async getStats(): Promise<{ tables: { [table: string]: number }; totalSize: number }> {
    throw new Error('Supabase adapter not implemented yet');
  }
}

/**
 * Factory function to create storage adapter based on environment
 */
export function createStorageAdapter(config?: { 
  type: 'mock' | 'supabase';
  supabaseUrl?: string;
  supabaseKey?: string;
}): StorageAdapter {
  const adapterType = config?.type || process.env.STORAGE_ADAPTER || 'mock';
  
  switch (adapterType) {
    case 'supabase':
      if (!config?.supabaseUrl || !config?.supabaseKey) {
        console.warn('Supabase credentials not provided, falling back to mock adapter');
        return new MockStorageAdapter();
      }
      return new SupabaseStorageAdapter(config.supabaseUrl, config.supabaseKey);
    
    case 'mock':
    default:
      return new MockStorageAdapter();
  }
}