/**
 * Mock Context Retriever Node
 * Simulates vector search and context retrieval for financial queries
 */

import { ProcessedQuery } from './financial-query-processor.js';
import { TradingSignal } from '../../types/trading-signals.js';
import { TechnicalAnalysis } from '../../agents/technical-analysis.js';
import { SentimentAnalysis } from '../../utils/sentiment-calculator.js';

/**
 * Context item from retrieval
 */
export interface ContextItem {
  id: string;
  type: 'TECHNICAL_ANALYSIS' | 'TRADING_SIGNAL' | 'NEWS' | 'RESEARCH' | 'HISTORICAL_DATA' | 'MARKET_DATA';
  ticker?: string;
  timestamp: Date;
  content: string;
  metadata: {
    source: string;
    confidence: number;
    relevanceScore: number;
    dataPoints?: number;
  };
  embedding?: number[]; // Mock embedding vector
}

/**
 * Retrieved context for a query
 */
export interface RetrievedContext {
  query: ProcessedQuery;
  contextItems: ContextItem[];
  totalResults: number;
  retrievalTime: number;
  averageRelevance: number;
  sources: string[];
  summary: {
    technicalItems: number;
    signalItems: number;
    newsItems: number;
    researchItems: number;
    historicalItems: number;
  };
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  similarity: number;
  content: any;
  metadata: Record<string, any>;
}

/**
 * Context retrieval configuration
 */
export interface ContextRetrieverConfig {
  maxContextItems: number;
  minRelevanceScore: number;
  diversityThreshold: number;
  enableReranking: boolean;
  includeSources: string[];
  timeWeightDecay: number; // How much to weight recent items
  vectorDimensions: number;
}

/**
 * Mock Context Retriever Node
 */
export class MockContextRetriever {
  private config: Required<ContextRetrieverConfig>;
  private mockDatabase: Map<string, ContextItem[]> = new Map();

  constructor(config: Partial<ContextRetrieverConfig> = {}) {
    this.config = {
      maxContextItems: 10,
      minRelevanceScore: 0.3,
      diversityThreshold: 0.7,
      enableReranking: true,
      includeSources: ['technical', 'signals', 'news', 'research'],
      timeWeightDecay: 0.95,
      vectorDimensions: 384,
      ...config
    };

    this.initializeMockData();
  }

  /**
   * Retrieve relevant context for a processed query
   */
  async retrieveContext(query: ProcessedQuery): Promise<RetrievedContext> {
    const startTime = Date.now();
    
    console.log(`🔍 Retrieving context for query: ${query.intent} (${query.queryType})`);

    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(query);

    // Perform vector search
    const searchResults = await this.vectorSearch(queryEmbedding, query);

    // Filter and rank results
    const filteredResults = this.filterResults(searchResults, query);
    const rankedResults = this.rankResults(filteredResults, query);

    // Select diverse context items
    const selectedItems = this.selectDiverseContext(rankedResults, query);

    const retrievalTime = Date.now() - startTime;
    const averageRelevance = selectedItems.reduce((sum, item) => 
      sum + item.metadata.relevanceScore, 0) / Math.max(selectedItems.length, 1);

    const sources = [...new Set(selectedItems.map(item => item.metadata.source))];
    const summary = this.generateContextSummary(selectedItems);

    const context: RetrievedContext = {
      query,
      contextItems: selectedItems,
      totalResults: searchResults.length,
      retrievalTime,
      averageRelevance,
      sources,
      summary
    };

    console.log(`✅ Retrieved ${selectedItems.length} context items (avg relevance: ${averageRelevance.toFixed(2)})`);
    return context;
  }

  /**
   * Mock vector search implementation
   */
  async vectorSearch(
    queryEmbedding: number[],
    query: ProcessedQuery,
    limit: number = 50
  ): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    // Search through all tickers mentioned in the query
    for (const ticker of query.entities.tickers) {
      const tickerData = this.mockDatabase.get(ticker) || [];
      
      for (const item of tickerData) {
        const similarity = this.calculateSimilarity(queryEmbedding, item.embedding || []);
        
        if (similarity > 0.1) { // Minimum similarity threshold
          results.push({
            id: item.id,
            similarity,
            content: item,
            metadata: item.metadata
          });
        }
      }
    }

    // If no specific tickers, search general market data
    if (query.entities.tickers.length === 0) {
      const generalData = this.mockDatabase.get('MARKET') || [];
      
      for (const item of generalData) {
        const similarity = this.calculateSimilarity(queryEmbedding, item.embedding || []);
        
        if (similarity > 0.1) {
          results.push({
            id: item.id,
            similarity,
            content: item,
            metadata: item.metadata
          });
        }
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Generate mock embedding for query
   */
  private async generateQueryEmbedding(query: ProcessedQuery): Promise<number[]> {
    // Generate a mock embedding based on query characteristics
    const embedding = new Array(this.config.vectorDimensions).fill(0);
    
    // Use query hash to generate consistent "embedding"
    const queryText = query.cleanedQuery + query.queryType + query.intent;
    let hash = 0;
    for (let i = 0; i < queryText.length; i++) {
      const char = queryText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate pseudo-random but consistent embedding
    const random = this.seededRandom(Math.abs(hash));
    for (let i = 0; i < this.config.vectorDimensions; i++) {
      embedding[i] = (random() - 0.5) * 2; // Range: -1 to 1
    }

    // Add some bias based on query characteristics
    if (query.entities.tickers.length > 0) {
      for (let i = 0; i < 50; i++) {
        embedding[i] += 0.1; // Boost ticker-related dimensions
      }
    }

    if (query.entities.indicators.length > 0) {
      for (let i = 50; i < 100; i++) {
        embedding[i] += 0.1; // Boost technical analysis dimensions
      }
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length === 0 || vec2.length === 0) return 0;
    
    const minLength = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Filter search results based on query requirements
   */
  private filterResults(results: VectorSearchResult[], query: ProcessedQuery): ContextItem[] {
    return results
      .map(result => result.content as ContextItem)
      .filter(item => {
        // Filter by minimum relevance
        if (item.metadata.relevanceScore < this.config.minRelevanceScore) {
          return false;
        }

        // Filter by required sources
        if (!this.config.includeSources.includes(item.metadata.source)) {
          return false;
        }

        // Filter by ticker if specified
        if (query.entities.tickers.length > 0 && item.ticker) {
          return query.entities.tickers.includes(item.ticker);
        }

        return true;
      });
  }

  /**
   * Rank and score context items
   */
  private rankResults(items: ContextItem[], query: ProcessedQuery): ContextItem[] {
    return items.map(item => {
      let score = item.metadata.relevanceScore;

      // Time decay factor
      const ageDays = (Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.pow(this.config.timeWeightDecay, ageDays);
      score *= timeWeight;

      // Boost based on query type matching
      if (this.matchesQueryType(item, query)) {
        score *= 1.2;
      }

      // Boost for exact ticker matches
      if (item.ticker && query.entities.tickers.includes(item.ticker)) {
        score *= 1.3;
      }

      // Update relevance score
      item.metadata.relevanceScore = score;
      return item;
    }).sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore);
  }

  /**
   * Select diverse context items to avoid redundancy
   */
  private selectDiverseContext(items: ContextItem[], query: ProcessedQuery): ContextItem[] {
    const selected: ContextItem[] = [];
    const sourceCount: { [source: string]: number } = {};
    const typeCount: { [type: string]: number } = {};

    for (const item of items) {
      if (selected.length >= this.config.maxContextItems) break;

      // Enforce diversity constraints
      const source = item.metadata.source;
      const type = item.type;
      
      const sourceLimit = Math.ceil(this.config.maxContextItems / this.config.includeSources.length);
      const typeLimit = Math.ceil(this.config.maxContextItems / 5); // 5 main types

      if ((sourceCount[source] || 0) < sourceLimit && (typeCount[type] || 0) < typeLimit) {
        selected.push(item);
        sourceCount[source] = (sourceCount[source] || 0) + 1;
        typeCount[type] = (typeCount[type] || 0) + 1;
      }
    }

    return selected;
  }

  /**
   * Check if context item matches query type
   */
  private matchesQueryType(item: ContextItem, query: ProcessedQuery): boolean {
    const typeMatches = {
      'TECHNICAL_ANALYSIS': ['TECHNICAL_ANALYSIS', 'TRADING_SIGNAL'],
      'SIGNAL_REQUEST': ['TRADING_SIGNAL', 'TECHNICAL_ANALYSIS'],
      'PRICE_INQUIRY': ['MARKET_DATA', 'TRADING_SIGNAL'],
      'MARKET_SENTIMENT': ['NEWS', 'RESEARCH'],
      'RISK_ASSESSMENT': ['TECHNICAL_ANALYSIS', 'RESEARCH'],
      'RECOMMENDATION': ['TRADING_SIGNAL', 'RESEARCH'],
      'HISTORICAL_DATA': ['HISTORICAL_DATA', 'MARKET_DATA']
    };

    const relevantTypes = typeMatches[query.queryType] || [];
    return relevantTypes.includes(item.type);
  }

  /**
   * Generate context summary
   */
  private generateContextSummary(items: ContextItem[]): {
    technicalItems: number;
    signalItems: number;
    newsItems: number;
    researchItems: number;
    historicalItems: number;
  } {
    const summary = {
      technicalItems: 0,
      signalItems: 0,
      newsItems: 0,
      researchItems: 0,
      historicalItems: 0
    };

    for (const item of items) {
      switch (item.type) {
        case 'TECHNICAL_ANALYSIS':
          summary.technicalItems++;
          break;
        case 'TRADING_SIGNAL':
          summary.signalItems++;
          break;
        case 'NEWS':
          summary.newsItems++;
          break;
        case 'RESEARCH':
          summary.researchItems++;
          break;
        case 'HISTORICAL_DATA':
          summary.historicalItems++;
          break;
      }
    }

    return summary;
  }

  /**
   * Initialize mock data for different tickers
   */
  private initializeMockData(): void {
    const tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX'];
    
    for (const ticker of tickers) {
      const contextItems: ContextItem[] = [];

      // Generate mock technical analysis
      contextItems.push({
        id: `tech-${ticker}-${Date.now()}`,
        type: 'TECHNICAL_ANALYSIS',
        ticker,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        content: `Technical analysis for ${ticker} shows ${this.randomChoice(['bullish', 'bearish', 'neutral'])} signals with RSI at ${(Math.random() * 100).toFixed(1)} and MACD ${this.randomChoice(['above', 'below'])} signal line.`,
        metadata: {
          source: 'technical',
          confidence: 0.7 + Math.random() * 0.3,
          relevanceScore: 0.8 + Math.random() * 0.2,
          dataPoints: 252
        },
        embedding: this.generateMockEmbedding()
      });

      // Generate mock trading signals
      contextItems.push({
        id: `signal-${ticker}-${Date.now()}`,
        type: 'TRADING_SIGNAL',
        ticker,
        timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000), // Last 3 days
        content: `Trading signal for ${ticker}: ${this.randomChoice(['BUY', 'SELL', 'HOLD'])} with confidence ${(0.6 + Math.random() * 0.4).toFixed(2)}. Target price $${(100 + Math.random() * 500).toFixed(2)}.`,
        metadata: {
          source: 'signals',
          confidence: 0.6 + Math.random() * 0.4,
          relevanceScore: 0.9,
          dataPoints: 1
        },
        embedding: this.generateMockEmbedding()
      });

      // Generate mock news
      contextItems.push({
        id: `news-${ticker}-${Date.now()}`,
        type: 'NEWS',
        ticker,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Last 24 hours
        content: `Recent news: ${ticker} ${this.randomChoice(['beats', 'misses', 'meets'])} earnings expectations. Stock ${this.randomChoice(['rallies', 'declines', 'holds steady'])} in after-hours trading.`,
        metadata: {
          source: 'news',
          confidence: 0.8,
          relevanceScore: 0.7 + Math.random() * 0.3
        },
        embedding: this.generateMockEmbedding()
      });

      // Generate mock research
      contextItems.push({
        id: `research-${ticker}-${Date.now()}`,
        type: 'RESEARCH',
        ticker,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        content: `Analyst research on ${ticker}: ${this.randomChoice(['Upgrade', 'Downgrade', 'Maintain'])} rating to ${this.randomChoice(['BUY', 'HOLD', 'SELL'])}. Price target $${(100 + Math.random() * 500).toFixed(2)}.`,
        metadata: {
          source: 'research',
          confidence: 0.75,
          relevanceScore: 0.6 + Math.random() * 0.4
        },
        embedding: this.generateMockEmbedding()
      });

      // Generate mock historical data
      contextItems.push({
        id: `hist-${ticker}-${Date.now()}`,
        type: 'HISTORICAL_DATA',
        ticker,
        timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Last year
        content: `Historical performance: ${ticker} ${this.randomChoice(['outperformed', 'underperformed', 'matched'])} the market with ${((Math.random() - 0.5) * 100).toFixed(1)}% return over the past year.`,
        metadata: {
          source: 'historical',
          confidence: 0.95,
          relevanceScore: 0.5 + Math.random() * 0.3,
          dataPoints: 252
        },
        embedding: this.generateMockEmbedding()
      });

      this.mockDatabase.set(ticker, contextItems);
    }

    // Add general market data
    const marketItems: ContextItem[] = [
      {
        id: `market-${Date.now()}`,
        type: 'MARKET_DATA',
        timestamp: new Date(),
        content: `Market overview: S&P 500 ${this.randomChoice(['up', 'down'])} ${(Math.random() * 3).toFixed(2)}%. VIX at ${(10 + Math.random() * 30).toFixed(1)}. Fed funds rate at ${(Math.random() * 5).toFixed(2)}%.`,
        metadata: {
          source: 'market',
          confidence: 0.9,
          relevanceScore: 0.8
        },
        embedding: this.generateMockEmbedding()
      }
    ];

    this.mockDatabase.set('MARKET', marketItems);
  }

  /**
   * Generate mock embedding vector
   */
  private generateMockEmbedding(): number[] {
    const embedding = new Array(this.config.vectorDimensions);
    for (let i = 0; i < this.config.vectorDimensions; i++) {
      embedding[i] = (Math.random() - 0.5) * 2; // Range: -1 to 1
    }
    return embedding;
  }

  /**
   * Seeded random number generator for consistency
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Random choice from array
   */
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Add context item to mock database
   */
  addContextItem(ticker: string, item: ContextItem): void {
    const existing = this.mockDatabase.get(ticker) || [];
    existing.push(item);
    this.mockDatabase.set(ticker, existing);
  }

  /**
   * Get retrieval statistics
   */
  getRetrievalStats(): {
    totalItems: number;
    itemsByType: { [type: string]: number };
    itemsBySource: { [source: string]: number };
    averageRelevance: number;
  } {
    let totalItems = 0;
    const itemsByType: { [type: string]: number } = {};
    const itemsBySource: { [source: string]: number } = {};
    let totalRelevance = 0;

    for (const items of this.mockDatabase.values()) {
      totalItems += items.length;
      
      for (const item of items) {
        itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
        itemsBySource[item.metadata.source] = (itemsBySource[item.metadata.source] || 0) + 1;
        totalRelevance += item.metadata.relevanceScore;
      }
    }

    return {
      totalItems,
      itemsByType,
      itemsBySource,
      averageRelevance: totalItems > 0 ? totalRelevance / totalItems : 0
    };
  }
}

/**
 * Factory function to create mock context retriever
 */
export function createMockContextRetriever(config?: Partial<ContextRetrieverConfig>): MockContextRetriever {
  return new MockContextRetriever(config);
}

export default MockContextRetriever;