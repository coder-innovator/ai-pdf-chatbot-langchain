import { StateGraph, MemorySaver, Annotation } from '@langchain/langgraph';
import { 
  Quote, 
  NewsArticle, 
  TradingSignal, 
  Ticker 
} from '../../types/index.js';
import { 
  YahooFinanceService 
} from '../../services/market-data/yahoo-finance.js';
import { 
  FreeDataAggregator 
} from '../../services/market-data/free-data-aggregator.js';
import { 
  DataNormalizer, 
  NormalizationResult,
  RawMarketData 
} from '../../services/market-data/data-normalizer.js';
import { 
  getDataServiceFactory 
} from '../../config/data-sources.js';

/**
 * State for market data processing workflow
 */
const MarketDataState = Annotation.Root({
  // Input
  symbols: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  newsSymbols: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  dataTypes: Annotation<('quotes' | 'news' | 'tickers' | 'historical')[]>({
    reducer: (x, y) => y ?? x ?? ['quotes'],
  }),
  
  // Processing state
  rawQuotes: Annotation<RawMarketData[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  rawNews: Annotation<RawMarketData[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  rawTickers: Annotation<RawMarketData[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Processed output
  processedQuotes: Annotation<Quote[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  processedNews: Annotation<NewsArticle[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  processedTickers: Annotation<Ticker[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  processedSignals: Annotation<TradingSignal[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Quality metrics
  processingStats: Annotation<{
    totalItems: number;
    successfulItems: number;
    failedItems: number;
    warnings: number;
    errors: string[];
  }>({
    reducer: (x, y) => y ?? x ?? {
      totalItems: 0,
      successfulItems: 0,
      failedItems: 0,
      warnings: 0,
      errors: []
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

type MarketDataStateType = typeof MarketDataState.State;

/**
 * Market Data Processor - LangGraph node for fetching and processing market data
 * Handles multiple data sources, normalization, and quality validation
 */
export class MarketDataProcessor {
  private dataService: YahooFinanceService | FreeDataAggregator;
  private normalizer: DataNormalizer;
  private graph: StateGraph<MarketDataStateType>;

  constructor() {
    const factory = getDataServiceFactory();
    this.dataService = factory.getPrimaryDataService();
    this.normalizer = factory.getDataNormalizer();
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph processing workflow
   */
  private buildGraph(): StateGraph<MarketDataStateType> {
    const graph = new StateGraph(MarketDataState)
      .addNode('fetch_quotes', this.fetchQuotes.bind(this))
      .addNode('fetch_news', this.fetchNews.bind(this))
      .addNode('fetch_tickers', this.fetchTickers.bind(this))
      .addNode('normalize_data', this.normalizeData.bind(this))
      .addNode('validate_quality', this.validateQuality.bind(this))
      .addNode('generate_signals', this.generateSignals.bind(this))
      .addEdge('__start__', 'fetch_quotes')
      .addConditionalEdges(
        'fetch_quotes',
        this.shouldFetchNews.bind(this),
        {
          fetch_news: 'fetch_news',
          fetch_tickers: 'fetch_tickers',
          normalize: 'normalize_data'
        }
      )
      .addConditionalEdges(
        'fetch_news',
        this.shouldFetchTickers.bind(this),
        {
          fetch_tickers: 'fetch_tickers',
          normalize: 'normalize_data'
        }
      )
      .addEdge('fetch_tickers', 'normalize_data')
      .addEdge('normalize_data', 'validate_quality')
      .addEdge('validate_quality', 'generate_signals')
      .addEdge('generate_signals', '__end__');

    return graph;
  }

  /**
   * Process market data for given symbols
   */
  async processMarketData(input: {
    symbols: string[];
    newsSymbols?: string[];
    dataTypes?: ('quotes' | 'news' | 'tickers' | 'historical')[];
  }): Promise<{
    quotes: Quote[];
    news: NewsArticle[];
    tickers: Ticker[];
    signals: TradingSignal[];
    stats: any;
  }> {
    const initialState: Partial<MarketDataStateType> = {
      symbols: input.symbols,
      newsSymbols: input.newsSymbols || input.symbols,
      dataTypes: input.dataTypes || ['quotes', 'news'],
      currentStep: 'start'
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);

    return {
      quotes: result.processedQuotes || [],
      news: result.processedNews || [],
      tickers: result.processedTickers || [],
      signals: result.processedSignals || [],
      stats: result.processingStats
    };
  }

  /**
   * Fetch quotes for symbols
   */
  private async fetchQuotes(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    if (!state.dataTypes.includes('quotes')) {
      return { currentStep: 'fetch_quotes_skipped' };
    }

    try {
      console.log(`Fetching quotes for ${state.symbols.length} symbols`);
      
      const rawQuotes: RawMarketData[] = [];
      
      if (this.dataService instanceof YahooFinanceService) {
        // Use Yahoo Finance for single source
        const quotes = await this.dataService.getMultipleQuotes(state.symbols);
        for (const quote of quotes) {
          rawQuotes.push({
            source: 'yahoo',
            symbol: quote.symbol,
            timestamp: quote.timestamp,
            data: quote
          });
        }
      } else if (this.dataService instanceof FreeDataAggregator) {
        // Use aggregator for multiple sources
        const quotes = await this.dataService.getQuotes(state.symbols);
        for (const quote of quotes) {
          rawQuotes.push({
            source: 'aggregator',
            symbol: quote.symbol,
            timestamp: quote.timestamp,
            data: quote
          });
        }
      }

      return {
        rawQuotes,
        currentStep: 'fetch_quotes_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to fetch quotes: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'fetch_quotes_failed'
      };
    }
  }

  /**
   * Fetch news articles for symbols
   */
  private async fetchNews(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    if (!state.dataTypes.includes('news')) {
      return { currentStep: 'fetch_news_skipped' };
    }

    try {
      console.log(`Fetching news for ${state.newsSymbols.length} symbols`);
      
      const rawNews: RawMarketData[] = [];
      
      if (this.dataService instanceof FreeDataAggregator) {
        const news = await this.dataService.getNews(state.newsSymbols);
        for (const article of news) {
          rawNews.push({
            source: 'aggregator',
            symbol: state.newsSymbols[0], // News applies to multiple symbols
            timestamp: new Date(article.time_published),
            data: article
          });
        }
      } else {
        // Mock news for development
        const mockNews = this.generateMockNews(state.newsSymbols);
        for (const article of mockNews) {
          rawNews.push({
            source: 'mock',
            symbol: state.newsSymbols[0],
            timestamp: new Date(article.time_published),
            data: article
          });
        }
      }

      return {
        rawNews,
        currentStep: 'fetch_news_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'fetch_news_failed'
      };
    }
  }

  /**
   * Fetch ticker/company information
   */
  private async fetchTickers(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    if (!state.dataTypes.includes('tickers')) {
      return { currentStep: 'fetch_tickers_skipped' };
    }

    try {
      console.log(`Fetching ticker info for ${state.symbols.length} symbols`);
      
      const rawTickers: RawMarketData[] = [];
      
      // Generate ticker information based on symbols
      for (const symbol of state.symbols) {
        const tickerInfo = await this.fetchTickerInfo(symbol);
        rawTickers.push({
          source: 'generated',
          symbol,
          timestamp: new Date(),
          data: tickerInfo
        });
      }

      return {
        rawTickers,
        currentStep: 'fetch_tickers_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to fetch tickers: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'fetch_tickers_failed'
      };
    }
  }

  /**
   * Normalize all fetched data
   */
  private async normalizeData(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    try {
      console.log('Normalizing fetched data');
      
      const processedQuotes: Quote[] = [];
      const processedNews: NewsArticle[] = [];
      const processedTickers: Ticker[] = [];
      
      let totalItems = 0;
      let successfulItems = 0;
      let failedItems = 0;
      let warnings = 0;
      const errors: string[] = [];

      // Normalize quotes
      for (const rawQuote of state.rawQuotes) {
        totalItems++;
        const result = this.normalizer.normalizeQuote(rawQuote);
        
        if (result.success && result.data) {
          processedQuotes.push(result.data);
          successfulItems++;
        } else {
          failedItems++;
          errors.push(...result.errors);
        }
        warnings += result.warnings.length;
      }

      // Normalize news
      for (const rawNews of state.rawNews) {
        totalItems++;
        const result = this.normalizer.normalizeNewsArticle(rawNews);
        
        if (result.success && result.data) {
          processedNews.push(result.data);
          successfulItems++;
        } else {
          failedItems++;
          errors.push(...result.errors);
        }
        warnings += result.warnings.length;
      }

      // Normalize tickers
      for (const rawTicker of state.rawTickers) {
        totalItems++;
        const result = this.normalizer.normalizeTicker(rawTicker);
        
        if (result.success && result.data) {
          processedTickers.push(result.data);
          successfulItems++;
        } else {
          failedItems++;
          errors.push(...result.errors);
        }
        warnings += result.warnings.length;
      }

      return {
        processedQuotes,
        processedNews,
        processedTickers,
        processingStats: {
          totalItems,
          successfulItems,
          failedItems,
          warnings,
          errors
        },
        currentStep: 'normalize_data_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to normalize data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'normalize_data_failed'
      };
    }
  }

  /**
   * Validate data quality
   */
  private async validateQuality(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    try {
      console.log('Validating data quality');
      
      const stats = state.processingStats;
      const successRate = stats.totalItems > 0 ? stats.successfulItems / stats.totalItems : 0;
      
      // Quality thresholds
      const minSuccessRate = 0.8; // 80% success rate
      const maxWarnings = stats.totalItems * 0.3; // 30% warning rate
      
      if (successRate < minSuccessRate) {
        const errorMsg = `Data quality below threshold: ${(successRate * 100).toFixed(1)}% success rate`;
        return {
          errors: [errorMsg],
          currentStep: 'quality_validation_failed'
        };
      }
      
      if (stats.warnings > maxWarnings) {
        console.warn(`High warning count: ${stats.warnings} warnings for ${stats.totalItems} items`);
      }

      console.log(`Data quality validation passed: ${(successRate * 100).toFixed(1)}% success rate`);
      
      return {
        currentStep: 'quality_validation_passed'
      };
    } catch (error) {
      const errorMsg = `Quality validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'quality_validation_error'
      };
    }
  }

  /**
   * Generate trading signals based on processed data
   */
  private async generateSignals(state: MarketDataStateType): Promise<Partial<MarketDataStateType>> {
    try {
      console.log('Generating trading signals');
      
      const signals: TradingSignal[] = [];
      
      // Simple signal generation based on quotes and news sentiment
      for (const quote of state.processedQuotes) {
        const signal = this.generateSignalForQuote(quote, state.processedNews);
        if (signal) {
          signals.push(signal);
        }
      }

      return {
        processedSignals: signals,
        currentStep: 'generate_signals_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to generate signals: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'generate_signals_failed'
      };
    }
  }

  // Conditional routing functions
  private shouldFetchNews(state: MarketDataStateType): string {
    if (state.dataTypes.includes('news')) {
      return 'fetch_news';
    }
    return this.shouldFetchTickers(state);
  }

  private shouldFetchTickers(state: MarketDataStateType): string {
    if (state.dataTypes.includes('tickers')) {
      return 'fetch_tickers';
    }
    return 'normalize';
  }

  // Helper methods
  private async fetchTickerInfo(symbol: string): Promise<Ticker> {
    // Mock ticker information - in production, this would call a real API
    const sectors = ['Technology', 'Healthcare', 'Financial Services', 'Energy', 'Consumer'];
    const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];
    
    return {
      symbol,
      name: `${symbol} Corporation`,
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      industry: 'Software',
      market_cap: Math.floor(Math.random() * 1000000000000),
      shares_outstanding: Math.floor(Math.random() * 10000000000),
      country: 'US',
      currency: 'USD',
      is_active: true,
      last_updated: new Date()
    };
  }

  private generateMockNews(symbols: string[]): NewsArticle[] {
    const newsTemplates = [
      'earnings beat expectations',
      'announces new product launch',
      'reports strong quarterly growth',
      'faces regulatory challenges',
      'expands into new markets'
    ];

    return symbols.slice(0, 3).map((symbol, index) => ({
      title: `${symbol} ${newsTemplates[index % newsTemplates.length]}`,
      summary: `Analysis of ${symbol} recent developments and market performance.`,
      url: `https://example.com/news/${symbol.toLowerCase()}-${Date.now()}`,
      time_published: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      authors: ['Market Analyst'],
      source: 'Financial News',
      category_within_source: 'Earnings',
      source_domain: 'example.com',
      topics: [symbol, 'earnings', 'stocks'],
      overall_sentiment_score: (Math.random() - 0.5) * 2, // -1 to 1
      overall_sentiment_label: Math.random() > 0.5 ? 'Bullish' : 'Bearish',
      ticker_sentiment: [
        {
          ticker: symbol,
          relevance_score: 0.8 + Math.random() * 0.2,
          ticker_sentiment_score: (Math.random() - 0.5) * 2,
          ticker_sentiment_label: Math.random() > 0.5 ? 'Bullish' : 'Bearish'
        }
      ]
    }));
  }

  private generateSignalForQuote(quote: Quote, news: NewsArticle[]): TradingSignal | null {
    // Simple signal generation logic
    const relatedNews = news.filter(article => 
      article.ticker_sentiment.some(ts => ts.ticker === quote.symbol)
    );

    // Calculate basic technical indicator (price momentum)
    const priceMomentum = (quote.close - quote.open) / quote.open;
    
    // Calculate sentiment score from news
    const avgSentiment = relatedNews.length > 0 
      ? relatedNews.reduce((sum, article) => sum + (article.overall_sentiment_score || 0), 0) / relatedNews.length
      : 0;

    // Simple signal logic
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.5;
    
    if (priceMomentum > 0.02 && avgSentiment > 0.3) {
      action = 'BUY';
      confidence = Math.min(0.9, 0.6 + priceMomentum + avgSentiment);
    } else if (priceMomentum < -0.02 && avgSentiment < -0.3) {
      action = 'SELL';
      confidence = Math.min(0.9, 0.6 + Math.abs(priceMomentum) + Math.abs(avgSentiment));
    }

    if (action === 'HOLD') {
      return null; // Don't generate signals for HOLD
    }

    return {
      symbol: quote.symbol,
      action,
      confidence,
      price: quote.close,
      target_price: action === 'BUY' ? quote.close * 1.1 : quote.close * 0.9,
      stop_loss: action === 'BUY' ? quote.close * 0.95 : quote.close * 1.05,
      reasoning: `Generated based on price momentum ${(priceMomentum * 100).toFixed(2)}% and sentiment ${avgSentiment.toFixed(2)}`,
      timestamp: new Date(),
      indicators: {
        price_momentum: priceMomentum,
        sentiment_score: avgSentiment,
        volume_ratio: quote.volume / (quote.volume * 0.8), // Mock volume ratio
      },
      risk_level: confidence < 0.7 ? 'high' : 'medium'
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): any {
    return {
      dataService: this.dataService.constructor.name,
      normalizer: 'DataNormalizer',
      supportedDataTypes: ['quotes', 'news', 'tickers', 'historical']
    };
  }
}