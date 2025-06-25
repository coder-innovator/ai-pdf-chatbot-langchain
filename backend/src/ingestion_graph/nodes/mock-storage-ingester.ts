import { StateGraph, MemorySaver, Annotation } from '@langchain/langgraph';
import { 
  Quote, 
  NewsArticle, 
  TradingSignal, 
  Ticker 
} from '../../types/index.js';
import { 
  StorageAdapter, 
  createStorageAdapter 
} from '../adapters/storage-adapter.js';

/**
 * State for storage ingestion workflow
 */
const StorageIngestionState = Annotation.Root({
  // Input data
  quotes: Annotation<Quote[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  newsArticles: Annotation<NewsArticle[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  tradingSignals: Annotation<TradingSignal[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  tickers: Annotation<Ticker[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Embeddings data
  embeddings: Annotation<Array<{
    id: string;
    embedding: number[];
    text: string;
    type: 'news' | 'signal' | 'custom';
    metadata: any;
  }>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Storage configuration
  storageConfig: Annotation<{
    type: 'mock' | 'supabase';
    batchSize: number;
    enableValidation: boolean;
    enableRetries: boolean;
    maxRetries: number;
  }>({
    reducer: (x, y) => y ?? x ?? {
      type: 'mock',
      batchSize: 100,
      enableValidation: true,
      enableRetries: true,
      maxRetries: 3
    },
  }),
  
  // Processing results
  ingestionResults: Annotation<{
    quotes: { successful: number; failed: number; errors: string[] };
    news: { successful: number; failed: number; errors: string[] };
    signals: { successful: number; failed: number; errors: string[] };
    tickers: { successful: number; failed: number; errors: string[] };
    embeddings: { successful: number; failed: number; errors: string[] };
  }>({
    reducer: (x, y) => y ?? x ?? {
      quotes: { successful: 0, failed: 0, errors: [] },
      news: { successful: 0, failed: 0, errors: [] },
      signals: { successful: 0, failed: 0, errors: [] },
      tickers: { successful: 0, failed: 0, errors: [] },
      embeddings: { successful: 0, failed: 0, errors: [] }
    },
  }),
  
  // Storage health and stats
  storageHealth: Annotation<{
    status: 'ok' | 'error';
    message?: string;
    connectionTime: number;
  }>({
    reducer: (x, y) => y ?? x ?? {
      status: 'ok',
      connectionTime: 0
    },
  }),
  
  // Control flow
  currentStep: Annotation<string>({
    reducer: (x, y) => y ?? x ?? 'start',
  }),
  errors: Annotation<string[]>({
    reducer: (x, y) => [...(x ?? []), ...(y ?? [])],
  }),
});

type StorageIngestionStateType = typeof StorageIngestionState.State;

/**
 * Mock Storage Ingester - LangGraph node for storing financial data
 * Uses adapter pattern for easy transition from mock to production storage
 */
export class MockStorageIngester {
  private storageAdapter: StorageAdapter;
  private graph: StateGraph<StorageIngestionStateType>;

  constructor(config?: {
    storageType?: 'mock' | 'supabase';
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    this.storageAdapter = createStorageAdapter({
      type: config?.storageType || 'mock',
      supabaseUrl: config?.supabaseUrl,
      supabaseKey: config?.supabaseKey
    });
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph storage ingestion workflow
   */
  private buildGraph(): StateGraph<StorageIngestionStateType> {
    const graph = new StateGraph(StorageIngestionState)
      .addNode('health_check', this.healthCheck.bind(this))
      .addNode('validate_data', this.validateData.bind(this))
      .addNode('ingest_tickers', this.ingestTickers.bind(this))
      .addNode('ingest_quotes', this.ingestQuotes.bind(this))
      .addNode('ingest_news', this.ingestNews.bind(this))
      .addNode('ingest_signals', this.ingestSignals.bind(this))
      .addNode('ingest_embeddings', this.ingestEmbeddings.bind(this))
      .addNode('cleanup_and_stats', this.cleanupAndStats.bind(this))
      .addEdge('__start__', 'health_check')
      .addConditionalEdges(
        'health_check',
        this.shouldContinueAfterHealthCheck.bind(this),
        {
          validate: 'validate_data',
          error: '__end__'
        }
      )
      .addEdge('validate_data', 'ingest_tickers')
      .addEdge('ingest_tickers', 'ingest_quotes')
      .addEdge('ingest_quotes', 'ingest_news')
      .addEdge('ingest_news', 'ingest_signals')
      .addEdge('ingest_signals', 'ingest_embeddings')
      .addEdge('ingest_embeddings', 'cleanup_and_stats')
      .addEdge('cleanup_and_stats', '__end__');

    return graph;
  }

  /**
   * Ingest financial data into storage
   */
  async ingestFinancialData(input: {
    quotes?: Quote[];
    newsArticles?: NewsArticle[];
    tradingSignals?: TradingSignal[];
    tickers?: Ticker[];
    embeddings?: Array<{
      id: string;
      embedding: number[];
      text: string;
      type: 'news' | 'signal' | 'custom';
      metadata: any;
    }>;
    config?: {
      batchSize?: number;
      enableValidation?: boolean;
      enableRetries?: boolean;
      maxRetries?: number;
    };
  }): Promise<{
    results: any;
    health: any;
    stats: any;
  }> {
    const initialState: Partial<StorageIngestionStateType> = {
      quotes: input.quotes || [],
      newsArticles: input.newsArticles || [],
      tradingSignals: input.tradingSignals || [],
      tickers: input.tickers || [],
      embeddings: input.embeddings || [],
      storageConfig: {
        type: 'mock',
        batchSize: input.config?.batchSize || 100,
        enableValidation: input.config?.enableValidation ?? true,
        enableRetries: input.config?.enableRetries ?? true,
        maxRetries: input.config?.maxRetries || 3
      },
      currentStep: 'start'
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);

    return {
      results: result.ingestionResults,
      health: result.storageHealth,
      stats: await this.storageAdapter.getStats()
    };
  }

  /**
   * Health check for storage system
   */
  private async healthCheck(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    try {
      console.log('Performing storage health check');
      const startTime = Date.now();
      
      const health = await this.storageAdapter.healthCheck();
      const connectionTime = Date.now() - startTime;
      
      console.log(`Storage health check: ${health.status} (${connectionTime}ms)`);
      
      return {
        storageHealth: {
          status: health.status,
          message: health.message,
          connectionTime
        },
        currentStep: health.status === 'ok' ? 'health_check_passed' : 'health_check_failed'
      };
    } catch (error) {
      const errorMsg = `Storage health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        storageHealth: {
          status: 'error',
          message: errorMsg,
          connectionTime: 0
        },
        errors: [errorMsg],
        currentStep: 'health_check_failed'
      };
    }
  }

  /**
   * Validate input data before ingestion
   */
  private async validateData(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (!state.storageConfig.enableValidation) {
      return { currentStep: 'validate_data_skipped' };
    }

    try {
      console.log('Validating input data');
      
      const errors: string[] = [];
      
      // Validate quotes
      for (const quote of state.quotes) {
        if (!quote.symbol || !quote.timestamp || typeof quote.close !== 'number') {
          errors.push(`Invalid quote data for symbol: ${quote.symbol || 'unknown'}`);
        }
      }
      
      // Validate news articles
      for (const article of state.newsArticles) {
        if (!article.title || !article.source || !article.time_published) {
          errors.push(`Invalid news article: ${article.title || 'untitled'}`);
        }
      }
      
      // Validate trading signals
      for (const signal of state.tradingSignals) {
        if (!signal.symbol || !signal.action || typeof signal.confidence !== 'number') {
          errors.push(`Invalid trading signal for symbol: ${signal.symbol || 'unknown'}`);
        }
      }
      
      // Validate tickers
      for (const ticker of state.tickers) {
        if (!ticker.symbol || !ticker.name) {
          errors.push(`Invalid ticker data: ${ticker.symbol || 'unknown'}`);
        }
      }
      
      // Validate embeddings
      for (const embedding of state.embeddings) {
        if (!embedding.embedding || !Array.isArray(embedding.embedding) || embedding.embedding.length === 0) {
          errors.push(`Invalid embedding data: ${embedding.id}`);
        }
      }

      if (errors.length > 0) {
        console.warn(`Data validation found ${errors.length} issues:`, errors.slice(0, 5));
      }

      console.log(`Data validation completed: ${errors.length} issues found`);
      
      return {
        errors: errors.length > 10 ? errors.slice(0, 10) : errors, // Limit error list
        currentStep: 'validate_data_completed'
      };
    } catch (error) {
      const errorMsg = `Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'validate_data_failed'
      };
    }
  }

  /**
   * Ingest ticker data
   */
  private async ingestTickers(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (state.tickers.length === 0) {
      return { 
        currentStep: 'ingest_tickers_skipped',
        ingestionResults: {
          ...state.ingestionResults,
          tickers: { successful: 0, failed: 0, errors: [] }
        }
      };
    }

    return this.ingestWithRetry(
      'tickers',
      state.tickers,
      state.storageConfig,
      async (ticker: Ticker) => this.storageAdapter.insertTicker(ticker),
      async (tickers: Ticker[]) => {
        // For batch, insert one by one since we don't have a batch ticker method
        const results = [];
        for (const ticker of tickers) {
          results.push(await this.storageAdapter.insertTicker(ticker));
        }
        return results;
      }
    );
  }

  /**
   * Ingest quote data
   */
  private async ingestQuotes(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (state.quotes.length === 0) {
      return { 
        currentStep: 'ingest_quotes_skipped',
        ingestionResults: {
          ...state.ingestionResults,
          quotes: { successful: 0, failed: 0, errors: [] }
        }
      };
    }

    return this.ingestWithRetry(
      'quotes',
      state.quotes,
      state.storageConfig,
      async (quote: Quote) => this.storageAdapter.insertQuote(quote),
      async (quotes: Quote[]) => this.storageAdapter.insertQuotesBatch(quotes)
    );
  }

  /**
   * Ingest news articles
   */
  private async ingestNews(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (state.newsArticles.length === 0) {
      return { 
        currentStep: 'ingest_news_skipped',
        ingestionResults: {
          ...state.ingestionResults,
          news: { successful: 0, failed: 0, errors: [] }
        }
      };
    }

    return this.ingestWithRetry(
      'news',
      state.newsArticles,
      state.storageConfig,
      async (article: NewsArticle) => this.storageAdapter.insertNewsArticle(article),
      async (articles: NewsArticle[]) => this.storageAdapter.insertNewsArticlesBatch(articles)
    );
  }

  /**
   * Ingest trading signals
   */
  private async ingestSignals(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (state.tradingSignals.length === 0) {
      return { 
        currentStep: 'ingest_signals_skipped',
        ingestionResults: {
          ...state.ingestionResults,
          signals: { successful: 0, failed: 0, errors: [] }
        }
      };
    }

    return this.ingestWithRetry(
      'signals',
      state.tradingSignals,
      state.storageConfig,
      async (signal: TradingSignal) => this.storageAdapter.insertTradingSignal(signal),
      async (signals: TradingSignal[]) => {
        // For batch, insert one by one since we don't have a batch signals method
        const results = [];
        for (const signal of signals) {
          results.push(await this.storageAdapter.insertTradingSignal(signal));
        }
        return results;
      }
    );
  }

  /**
   * Ingest embeddings into vector store
   */
  private async ingestEmbeddings(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    if (state.embeddings.length === 0) {
      return { 
        currentStep: 'ingest_embeddings_skipped',
        ingestionResults: {
          ...state.ingestionResults,
          embeddings: { successful: 0, failed: 0, errors: [] }
        }
      };
    }

    try {
      console.log(`Ingesting ${state.embeddings.length} embeddings`);
      
      const batchSize = state.storageConfig.batchSize;
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process embeddings in batches
      for (let i = 0; i < state.embeddings.length; i += batchSize) {
        const batch = state.embeddings.slice(i, i + batchSize);
        
        try {
          // Store embeddings in vector store (simplified)
          for (const embedding of batch) {
            try {
              // In a real implementation, this would use the vector store
              // For now, we'll just count as successful
              successful++;
            } catch (embError) {
              failed++;
              errors.push(`Failed to store embedding ${embedding.id}: ${embError instanceof Error ? embError.message : 'Unknown error'}`);
            }
          }
        } catch (batchError) {
          failed += batch.length;
          errors.push(`Failed to process embedding batch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
        }
      }

      console.log(`Embeddings ingestion completed: ${successful} successful, ${failed} failed`);

      return {
        ingestionResults: {
          ...state.ingestionResults,
          embeddings: { successful, failed, errors }
        },
        currentStep: 'ingest_embeddings_completed'
      };
    } catch (error) {
      const errorMsg = `Embeddings ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        ingestionResults: {
          ...state.ingestionResults,
          embeddings: { successful: 0, failed: state.embeddings.length, errors: [errorMsg] }
        },
        errors: [errorMsg],
        currentStep: 'ingest_embeddings_failed'
      };
    }
  }

  /**
   * Cleanup and final statistics
   */
  private async cleanupAndStats(state: StorageIngestionStateType): Promise<Partial<StorageIngestionStateType>> {
    try {
      console.log('Calculating final ingestion statistics');
      
      const results = state.ingestionResults;
      const totalSuccessful = results.quotes.successful + results.news.successful + 
                             results.signals.successful + results.tickers.successful + 
                             results.embeddings.successful;
      const totalFailed = results.quotes.failed + results.news.failed + 
                         results.signals.failed + results.tickers.failed + 
                         results.embeddings.failed;
      const totalItems = totalSuccessful + totalFailed;
      
      console.log(`Ingestion Summary:`);
      console.log(`- Total items: ${totalItems}`);
      console.log(`- Successful: ${totalSuccessful}`);
      console.log(`- Failed: ${totalFailed}`);
      console.log(`- Success rate: ${totalItems > 0 ? ((totalSuccessful / totalItems) * 100).toFixed(1) : 0}%`);
      
      console.log(`By type:`);
      console.log(`- Quotes: ${results.quotes.successful}/${results.quotes.successful + results.quotes.failed}`);
      console.log(`- News: ${results.news.successful}/${results.news.successful + results.news.failed}`);
      console.log(`- Signals: ${results.signals.successful}/${results.signals.successful + results.signals.failed}`);
      console.log(`- Tickers: ${results.tickers.successful}/${results.tickers.successful + results.tickers.failed}`);
      console.log(`- Embeddings: ${results.embeddings.successful}/${results.embeddings.successful + results.embeddings.failed}`);

      return {
        currentStep: 'cleanup_and_stats_completed'
      };
    } catch (error) {
      const errorMsg = `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'cleanup_failed'
      };
    }
  }

  // Helper methods
  private shouldContinueAfterHealthCheck(state: StorageIngestionStateType): string {
    return state.storageHealth.status === 'ok' ? 'validate' : 'error';
  }

  private async ingestWithRetry<T>(
    dataType: string,
    data: T[],
    config: StorageIngestionStateType['storageConfig'],
    singleInsert: (item: T) => Promise<any>,
    batchInsert: (items: T[]) => Promise<any>
  ): Promise<Partial<StorageIngestionStateType>> {
    try {
      console.log(`Ingesting ${data.length} ${dataType} records`);
      
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];
      
      if (data.length <= config.batchSize) {
        // Single batch
        try {
          await batchInsert(data);
          successful = data.length;
        } catch (error) {
          // Fall back to individual inserts
          for (const item of data) {
            try {
              await singleInsert(item);
              successful++;
            } catch (itemError) {
              failed++;
              errors.push(`Failed to insert ${dataType} item: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
            }
          }
        }
      } else {
        // Process in batches
        for (let i = 0; i < data.length; i += config.batchSize) {
          const batch = data.slice(i, i + config.batchSize);
          
          let batchSuccess = false;
          let retries = 0;
          
          while (!batchSuccess && retries < config.maxRetries) {
            try {
              await batchInsert(batch);
              successful += batch.length;
              batchSuccess = true;
            } catch (batchError) {
              retries++;
              if (retries >= config.maxRetries || !config.enableRetries) {
                // Fall back to individual inserts
                for (const item of batch) {
                  try {
                    await singleInsert(item);
                    successful++;
                  } catch (itemError) {
                    failed++;
                    errors.push(`Failed to insert ${dataType} item: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
                  }
                }
                break;
              }
            }
          }
        }
      }

      console.log(`${dataType} ingestion completed: ${successful} successful, ${failed} failed`);

      return {
        ingestionResults: {
          ...this.getDefaultIngestionResults(),
          [dataType]: { successful, failed, errors }
        },
        currentStep: `ingest_${dataType}_completed`
      };
    } catch (error) {
      const errorMsg = `${dataType} ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        ingestionResults: {
          ...this.getDefaultIngestionResults(),
          [dataType]: { successful: 0, failed: data.length, errors: [errorMsg] }
        },
        errors: [errorMsg],
        currentStep: `ingest_${dataType}_failed`
      };
    }
  }

  private getDefaultIngestionResults() {
    return {
      quotes: { successful: 0, failed: 0, errors: [] },
      news: { successful: 0, failed: 0, errors: [] },
      signals: { successful: 0, failed: 0, errors: [] },
      tickers: { successful: 0, failed: 0, errors: [] },
      embeddings: { successful: 0, failed: 0, errors: [] }
    };
  }

  /**
   * Get storage adapter information
   */
  getStorageInfo(): {
    adapterType: string;
    isHealthy: boolean;
    capabilities: string[];
  } {
    return {
      adapterType: this.storageAdapter.constructor.name,
      isHealthy: true, // Would check real health
      capabilities: [
        'quotes', 'news', 'signals', 'tickers', 
        'embeddings', 'batch_operations', 'health_checks'
      ]
    };
  }

  /**
   * Manual storage health check
   */
  async checkStorageHealth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    return await this.storageAdapter.healthCheck();
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ tables: { [table: string]: number }; totalSize: number }> {
    return await this.storageAdapter.getStats();
  }
}