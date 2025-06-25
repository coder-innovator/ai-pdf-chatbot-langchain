/**
 * Financial Embedder Service
 * Specialized embedding service for financial content including news, signals, and market data
 */

import { Embeddings } from '@langchain/core/embeddings';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { 
  MockVectorStore, 
  VectorEmbedding, 
  SearchOptions, 
  SearchResult 
} from './mock-vector-store.js';
import { 
  Quote, 
  NewsArticle, 
  TradingSignal, 
  Ticker 
} from '../../types/index.js';

/**
 * Financial content type for embedding
 */
export type FinancialContentType = 'news' | 'signal' | 'quote' | 'ticker' | 'analysis' | 'custom';

/**
 * Embedding configuration options
 */
export interface EmbeddingConfig {
  model?: string;
  dimensions?: number;
  maxTokens?: number;
  batchSize?: number;
  cacheEmbeddings?: boolean;
}

/**
 * Financial text processing options
 */
export interface TextProcessingOptions {
  includeMetadata?: boolean;
  enhanceWithContext?: boolean;
  normalizeText?: boolean;
  chunkLongTexts?: boolean;
  maxChunkSize?: number;
}

/**
 * Embedding result interface
 */
export interface EmbeddingResult {
  id: string;
  embedding: number[];
  text: string;
  type: FinancialContentType;
  metadata: any;
  processingTime: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  successful: EmbeddingResult[];
  failed: Array<{ id: string; error: string; content: any }>;
  totalTime: number;
  averageTime: number;
}

/**
 * Financial content for embedding
 */
export interface FinancialContent {
  id: string;
  text: string;
  type: FinancialContentType;
  metadata?: {
    symbol?: string;
    timestamp?: Date;
    source?: string;
    sentiment?: string;
    [key: string]: any;
  };
}

/**
 * Financial Embedder Service
 * Handles embedding generation and vector storage for financial content
 */
export class FinancialEmbedder {
  private embeddings: Embeddings;
  private vectorStore: MockVectorStore;
  private config: Required<EmbeddingConfig>;
  private embeddingCache: Map<string, { embedding: number[]; timestamp: Date }> = new Map();

  constructor(
    config: EmbeddingConfig = {},
    vectorStore?: MockVectorStore
  ) {
    this.config = {
      model: config.model || 'Xenova/all-MiniLM-L6-v2',
      dimensions: config.dimensions || 384,
      maxTokens: config.maxTokens || 512,
      batchSize: config.batchSize || 10,
      cacheEmbeddings: config.cacheEmbeddings ?? true
    };

    this.embeddings = new HuggingFaceTransformersEmbeddings({
      model: this.config.model,
    });

    this.vectorStore = vectorStore || new MockVectorStore();

    console.log(`FinancialEmbedder initialized with model: ${this.config.model}`);
  }

  /**
   * Embed news articles
   */
  async embedNewsArticles(
    articles: NewsArticle[],
    options: TextProcessingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const successful: EmbeddingResult[] = [];
    const failed: Array<{ id: string; error: string; content: any }> = [];

    for (const article of articles) {
      try {
        const text = this.extractNewsText(article, options);
        const id = `news_${article.url}_${Date.now()}`;
        
        const embedding = await this.generateEmbedding(text);
        const metadata = {
          title: article.title,
          source: article.source,
          url: article.url,
          timestamp: new Date(article.time_published),
          sentiment: article.overall_sentiment_label,
          sentimentScore: article.overall_sentiment_score,
          symbols: article.ticker_sentiment.map(ts => ts.ticker),
          type: 'news' as const
        };

        // Store in vector store
        await this.vectorStore.addEmbedding(id, embedding, metadata);

        successful.push({
          id,
          embedding,
          text,
          type: 'news',
          metadata,
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        failed.push({
          id: `news_error_${Date.now()}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: article
        });
      }
    }

    const totalTime = Date.now() - startTime;
    
    return {
      successful,
      failed,
      totalTime,
      averageTime: successful.length > 0 ? totalTime / successful.length : 0
    };
  }

  /**
   * Embed trading signals
   */
  async embedTradingSignals(
    signals: TradingSignal[],
    options: TextProcessingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const successful: EmbeddingResult[] = [];
    const failed: Array<{ id: string; error: string; content: any }> = [];

    for (const signal of signals) {
      try {
        const text = this.extractSignalText(signal, options);
        const id = `signal_${signal.symbol}_${signal.timestamp.getTime()}`;
        
        const embedding = await this.generateEmbedding(text);
        const metadata = {
          symbol: signal.symbol,
          action: signal.action,
          confidence: signal.confidence,
          price: signal.price,
          timestamp: signal.timestamp,
          reasoning: signal.reasoning,
          riskLevel: signal.risk_level,
          type: 'signal' as const
        };

        // Store in vector store
        await this.vectorStore.addEmbedding(id, embedding, metadata);

        successful.push({
          id,
          embedding,
          text,
          type: 'signal',
          metadata,
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        failed.push({
          id: `signal_error_${Date.now()}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: signal
        });
      }
    }

    const totalTime = Date.now() - startTime;
    
    return {
      successful,
      failed,
      totalTime,
      averageTime: successful.length > 0 ? totalTime / successful.length : 0
    };
  }

  /**
   * Embed market quotes
   */
  async embedQuotes(
    quotes: Quote[],
    options: TextProcessingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const successful: EmbeddingResult[] = [];
    const failed: Array<{ id: string; error: string; content: any }> = [];

    for (const quote of quotes) {
      try {
        const text = this.extractQuoteText(quote, options);
        const id = `quote_${quote.symbol}_${quote.timestamp.getTime()}`;
        
        const embedding = await this.generateEmbedding(text);
        const metadata = {
          symbol: quote.symbol,
          timestamp: quote.timestamp,
          price: quote.close,
          volume: quote.volume,
          change: ((quote.close - quote.open) / quote.open) * 100,
          type: 'quote' as const
        };

        // Store in vector store
        await this.vectorStore.addEmbedding(id, embedding, metadata);

        successful.push({
          id,
          embedding,
          text,
          type: 'quote',
          metadata,
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        failed.push({
          id: `quote_error_${Date.now()}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: quote
        });
      }
    }

    const totalTime = Date.now() - startTime;
    
    return {
      successful,
      failed,
      totalTime,
      averageTime: successful.length > 0 ? totalTime / successful.length : 0
    };
  }

  /**
   * Embed custom financial content
   */
  async embedCustomContent(
    content: FinancialContent[],
    options: TextProcessingOptions = {}
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    const successful: EmbeddingResult[] = [];
    const failed: Array<{ id: string; error: string; content: any }> = [];

    for (const item of content) {
      try {
        const processedText = this.processText(item.text, options);
        const embedding = await this.generateEmbedding(processedText);

        // Store in vector store
        await this.vectorStore.addEmbedding(item.id, embedding, {
          ...item.metadata,
          type: item.type,
          originalText: item.text
        });

        successful.push({
          id: item.id,
          embedding,
          text: processedText,
          type: item.type,
          metadata: item.metadata || {},
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        failed.push({
          id: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          content: item
        });
      }
    }

    const totalTime = Date.now() - startTime;
    
    return {
      successful,
      failed,
      totalTime,
      averageTime: successful.length > 0 ? totalTime / successful.length : 0
    };
  }

  /**
   * Search for similar financial content
   */
  async searchSimilarContent(
    query: string,
    options: SearchOptions & {
      contentTypes?: FinancialContentType[];
      symbols?: string[];
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Prepare search options
    const searchOptions: SearchOptions = {
      ...options,
      filter: {
        ...options.filter,
        ...(options.contentTypes && { type: options.contentTypes }),
        ...(options.symbols && { symbol: options.symbols }),
        ...(options.dateRange && { dateRange: options.dateRange })
      }
    };

    return await this.vectorStore.similaritySearch(queryEmbedding, searchOptions);
  }

  /**
   * Get similar content to existing content
   */
  async findSimilarContent(
    contentId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    return await this.vectorStore.findSimilar(contentId, options);
  }

  /**
   * Search by financial concept
   */
  async searchByFinancialConcept(
    concept: string,
    options: {
      symbols?: string[];
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    // Enhance query with financial context
    const enhancedQuery = this.enhanceFinancialQuery(concept);
    
    return await this.searchSimilarContent(enhancedQuery, {
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
      symbols: options.symbols
    });
  }

  /**
   * Get content by symbol
   */
  async getContentBySymbol(symbol: string): Promise<VectorEmbedding[]> {
    return await this.vectorStore.getEmbeddingsBySymbol(symbol);
  }

  /**
   * Get content by type
   */
  async getContentByType(type: FinancialContentType): Promise<VectorEmbedding[]> {
    return await this.vectorStore.getEmbeddingsByType(type);
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<any> {
    const vectorStats = await this.vectorStore.getStats();
    
    return {
      vectorStore: vectorStats,
      embedder: {
        model: this.config.model,
        dimensions: this.config.dimensions,
        cacheSize: this.embeddingCache.size,
        configuration: this.config
      }
    };
  }

  /**
   * Clear all embeddings
   */
  async clearEmbeddings(): Promise<void> {
    await this.vectorStore.clear();
    this.embeddingCache.clear();
  }

  // Private methods

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.config.cacheEmbeddings) {
      const cached = this.embeddingCache.get(text);
      if (cached) {
        return cached.embedding;
      }
    }

    // Generate new embedding
    const embedding = await this.embeddings.embedQuery(text);

    // Cache if enabled
    if (this.config.cacheEmbeddings) {
      this.embeddingCache.set(text, {
        embedding,
        timestamp: new Date()
      });

      // Clean old cache entries (keep last 1000)
      if (this.embeddingCache.size > 1000) {
        const entries = Array.from(this.embeddingCache.entries());
        entries.sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());
        
        this.embeddingCache.clear();
        for (const [key, value] of entries.slice(0, 1000)) {
          this.embeddingCache.set(key, value);
        }
      }
    }

    return embedding;
  }

  private extractNewsText(article: NewsArticle, options: TextProcessingOptions): string {
    const parts = [
      article.title,
      article.summary,
      `Source: ${article.source}`,
      `Sentiment: ${article.overall_sentiment_label}`,
    ];

    if (options.includeMetadata) {
      parts.push(
        `Published: ${article.time_published}`,
        `Symbols: ${article.ticker_sentiment.map(ts => ts.ticker).join(', ')}`
      );
    }

    const text = parts.filter(Boolean).join('\n');
    return this.processText(text, options);
  }

  private extractSignalText(signal: TradingSignal, options: TextProcessingOptions): string {
    const parts = [
      `Trading Signal for ${signal.symbol}`,
      `Action: ${signal.action}`,
      `Confidence: ${(signal.confidence * 100).toFixed(1)}%`,
      `Price: $${signal.price.toFixed(2)}`,
      `Risk Level: ${signal.risk_level}`,
      `Reasoning: ${signal.reasoning}`
    ];

    if (options.includeMetadata) {
      parts.push(
        `Timestamp: ${signal.timestamp.toISOString()}`,
        signal.indicators ? `Indicators: ${JSON.stringify(signal.indicators)}` : ''
      );
    }

    const text = parts.filter(Boolean).join('\n');
    return this.processText(text, options);
  }

  private extractQuoteText(quote: Quote, options: TextProcessingOptions): string {
    const change = ((quote.close - quote.open) / quote.open) * 100;
    const parts = [
      `Market Quote for ${quote.symbol}`,
      `Price: $${quote.close.toFixed(2)}`,
      `Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
      `Volume: ${quote.volume.toLocaleString()}`,
      `Range: $${quote.low.toFixed(2)} - $${quote.high.toFixed(2)}`
    ];

    if (options.includeMetadata) {
      parts.push(
        `Timestamp: ${quote.timestamp.toISOString()}`,
        `Bid/Ask: $${quote.bid?.toFixed(2)}/$${quote.ask?.toFixed(2)}`
      );
    }

    const text = parts.filter(Boolean).join('\n');
    return this.processText(text, options);
  }

  private processText(text: string, options: TextProcessingOptions): string {
    let processed = text;

    if (options.normalizeText) {
      // Basic text normalization
      processed = processed
        .toLowerCase()
        .replace(/[^\w\s$%.,:-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (options.chunkLongTexts && processed.length > (options.maxChunkSize || 500)) {
      // Take first chunk for now - could be enhanced to handle multiple chunks
      processed = processed.substring(0, options.maxChunkSize || 500);
    }

    return processed;
  }

  private enhanceFinancialQuery(concept: string): string {
    // Add financial context to queries
    const financialTerms = {
      'bullish': 'bullish market sentiment positive outlook buy signal',
      'bearish': 'bearish market sentiment negative outlook sell signal',
      'earnings': 'earnings report financial performance revenue profit',
      'volatility': 'market volatility price swings trading risk',
      'momentum': 'price momentum trend direction market movement'
    };

    const lowerConcept = concept.toLowerCase();
    for (const [term, enhancement] of Object.entries(financialTerms)) {
      if (lowerConcept.includes(term)) {
        return `${concept} ${enhancement}`;
      }
    }

    return concept;
  }

  /**
   * Export embeddings for backup/analysis
   */
  async exportEmbeddings(): Promise<VectorEmbedding[]> {
    const allIds = this.vectorStore.getAllIds();
    const embeddings: VectorEmbedding[] = [];

    for (const id of allIds) {
      const embedding = await this.vectorStore.getEmbedding(id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    return embeddings;
  }

  /**
   * Import embeddings from backup
   */
  async importEmbeddings(embeddings: VectorEmbedding[]): Promise<void> {
    for (const embedding of embeddings) {
      await this.vectorStore.addEmbedding(
        embedding.id,
        embedding.embedding,
        embedding.metadata
      );
    }
  }
}

/**
 * Create a new FinancialEmbedder instance
 */
export function createFinancialEmbedder(
  config?: EmbeddingConfig,
  vectorStore?: MockVectorStore
): FinancialEmbedder {
  return new FinancialEmbedder(config, vectorStore);
}

/**
 * Default export
 */
export default FinancialEmbedder;