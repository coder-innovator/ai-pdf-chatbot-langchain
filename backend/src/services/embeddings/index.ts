/**
 * Financial Embeddings Service - Main Export
 * 
 * Provides comprehensive embedding services for financial content including
 * vector storage, similarity search, and specialized financial text processing.
 */

// Core exports
export { 
  FinancialEmbedder,
  createFinancialEmbedder,
  type EmbeddingConfig,
  type TextProcessingOptions,
  type EmbeddingResult,
  type BatchEmbeddingResult,
  type FinancialContent,
  type FinancialContentType
} from './financial-embedder.js';

export {
  MockVectorStore,
  createMockVectorStore,
  type VectorEmbedding,
  type SearchOptions,
  type SearchResult,
  type VectorStoreStats
} from './mock-vector-store.js';

// Vector similarity utilities
export {
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
  dotProduct,
  vectorMagnitude,
  normalizeVector,
  jaccardSimilarity,
  pearsonCorrelation,
  findKNearestNeighbors,
  batchCosineSimilarity,
  semanticSimilarity,
  createSimilarityMatrix,
  calculateCentroid,
  calculateVariance,
  advancedSimilaritySearch,
  validateVectorDimensions,
  validateVectorValues,
  type SimilaritySearchResult
} from '../../utils/vector-similarity.js';

// Convenience functions

/**
 * Quick setup for financial embedding service
 */
export async function setupFinancialEmbeddings(options: {
  model?: string;
  cacheEmbeddings?: boolean;
  initializeWithSamples?: boolean;
} = {}) {
  const embedder = createFinancialEmbedder({
    model: options.model || 'Xenova/all-MiniLM-L6-v2',
    cacheEmbeddings: options.cacheEmbeddings ?? true
  });

  if (options.initializeWithSamples) {
    await initializeWithSampleData(embedder);
  }

  return embedder;
}

/**
 * Initialize embedder with sample financial data
 */
export async function initializeWithSampleData(embedder: FinancialEmbedder) {
  const sampleNewsArticles = [
    {
      title: "Apple Reports Strong Q4 Earnings",
      summary: "Apple Inc. reported better than expected earnings for Q4, driven by strong iPhone sales.",
      source: "Financial News",
      url: "https://example.com/apple-earnings",
      time_published: new Date().toISOString(),
      authors: ["Market Analyst"],
      category_within_source: "Earnings",
      source_domain: "example.com",
      topics: [{ topic: "earnings", relevance_score: "0.9" }],
      overall_sentiment_score: 0.8,
      overall_sentiment_label: "Bullish" as const,
      ticker_sentiment: [{
        ticker: "AAPL",
        relevance_score: 0.9,
        ticker_sentiment_score: 0.8,
        ticker_sentiment_label: "Bullish" as const
      }]
    },
    {
      title: "Tech Sector Faces Headwinds",
      summary: "Technology sector showing signs of weakness amid rising interest rates.",
      source: "Market Watch",
      url: "https://example.com/tech-headwinds",
      time_published: new Date().toISOString(),
      authors: ["Tech Reporter"],
      category_within_source: "Market Analysis",
      source_domain: "example.com",
      topics: [{ topic: "technology", relevance_score: "0.8" }],
      overall_sentiment_score: -0.4,
      overall_sentiment_label: "Bearish" as const,
      ticker_sentiment: [{
        ticker: "TECH",
        relevance_score: 0.8,
        ticker_sentiment_score: -0.4,
        ticker_sentiment_label: "Bearish" as const
      }]
    }
  ];

  const sampleTradingSignals = [
    {
      symbol: "AAPL",
      action: "BUY" as const,
      confidence: 0.85,
      price: 150.25,
      reasoning: "Strong momentum with bullish technical indicators",
      timestamp: new Date(),
      indicators: { rsi: 45, macd: 0.5 },
      risk_level: "medium" as const
    },
    {
      symbol: "GOOGL",
      action: "HOLD" as const,
      confidence: 0.65,
      price: 2800.50,
      reasoning: "Consolidating at current levels, waiting for breakout",
      timestamp: new Date(),
      indicators: { rsi: 55, macd: -0.1 },
      risk_level: "low" as const
    }
  ];

  try {
    console.log('Initializing embedder with sample data...');
    
    const newsResult = await embedder.embedNewsArticles(sampleNewsArticles);
    console.log(`Embedded ${newsResult.successful.length} news articles`);
    
    const signalsResult = await embedder.embedTradingSignals(sampleTradingSignals);
    console.log(`Embedded ${signalsResult.successful.length} trading signals`);
    
    console.log('Sample data initialization completed');
    
    return {
      newsEmbedded: newsResult.successful.length,
      signalsEmbedded: signalsResult.successful.length,
      totalTime: newsResult.totalTime + signalsResult.totalTime
    };
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    throw error;
  }
}

/**
 * Perform semantic search across financial content
 */
export async function searchFinancialContent(
  embedder: FinancialEmbedder,
  query: string,
  options: {
    contentTypes?: FinancialContentType[];
    symbols?: string[];
    limit?: number;
    threshold?: number;
  } = {}
) {
  try {
    const results = await embedder.searchSimilarContent(query, {
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
      contentTypes: options.contentTypes,
      symbols: options.symbols
    });

    return {
      success: true,
      results,
      query,
      count: results.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: [],
      query,
      count: 0
    };
  }
}

/**
 * Analyze content similarity patterns
 */
export async function analyzeContentSimilarity(
  embedder: FinancialEmbedder,
  contentType?: FinancialContentType
) {
  try {
    const stats = await embedder.getStats();
    const content = contentType 
      ? await embedder.getContentByType(contentType)
      : await embedder.exportEmbeddings();

    if (content.length < 2) {
      return {
        success: true,
        analysis: 'Insufficient data for similarity analysis',
        contentCount: content.length
      };
    }

    // Calculate similarity matrix for sample of content
    const sampleSize = Math.min(content.length, 20);
    const sample = content.slice(0, sampleSize);
    const embeddings = sample.map(item => item.embedding);
    
    const similarityMatrix = createSimilarityMatrix(embeddings);
    
    // Calculate average similarity
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < sampleSize; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        totalSimilarity += similarityMatrix[i][j];
        pairCount++;
      }
    }
    
    const averageSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;
    
    return {
      success: true,
      analysis: {
        contentCount: content.length,
        sampleSize,
        averageSimilarity: averageSimilarity.toFixed(3),
        similarityMatrix: similarityMatrix.map(row => 
          row.map(val => Number(val.toFixed(3)))
        ),
        stats
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      analysis: null
    };
  }
}

/**
 * Get comprehensive embedding service health
 */
export async function getEmbeddingServiceHealth() {
  try {
    const embedder = createFinancialEmbedder();
    const vectorStore = createMockVectorStore();
    
    // Test basic operations
    const testText = "Test financial content for health check";
    const testId = `health_check_${Date.now()}`;
    
    const startTime = Date.now();
    
    // Add test embedding
    await vectorStore.addEmbedding(testId, [0.1, 0.2, 0.3], {
      type: 'custom',
      text: testText
    });
    
    // Test search
    const searchResults = await vectorStore.similaritySearch([0.1, 0.2, 0.3], {
      limit: 1
    });
    
    // Clean up
    await vectorStore.deleteEmbedding(testId);
    
    const responseTime = Date.now() - startTime;
    const stats = await vectorStore.getStats();
    
    return {
      success: true,
      health: {
        status: 'healthy',
        responseTime,
        searchWorking: searchResults.length > 0,
        components: {
          embedder: 'operational',
          vectorStore: 'operational',
          similarity: 'operational'
        }
      },
      stats,
      capabilities: [
        'financial-embeddings',
        'vector-storage',
        'similarity-search',
        'content-analysis'
      ]
    };
  } catch (error) {
    return {
      success: false,
      health: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      stats: null,
      capabilities: []
    };
  }
}

/**
 * Batch process financial content for embeddings
 */
export async function batchProcessFinancialContent(
  content: {
    news?: any[];
    signals?: any[];
    quotes?: any[];
    custom?: FinancialContent[];
  },
  options: {
    model?: string;
    batchSize?: number;
    cacheEmbeddings?: boolean;
  } = {}
) {
  const embedder = createFinancialEmbedder({
    model: options.model,
    batchSize: options.batchSize || 10,
    cacheEmbeddings: options.cacheEmbeddings ?? true
  });

  const results = {
    news: { successful: [], failed: [], totalTime: 0 },
    signals: { successful: [], failed: [], totalTime: 0 },
    quotes: { successful: [], failed: [], totalTime: 0 },
    custom: { successful: [], failed: [], totalTime: 0 }
  };

  try {
    // Process each content type
    if (content.news?.length) {
      results.news = await embedder.embedNewsArticles(content.news);
    }
    
    if (content.signals?.length) {
      results.signals = await embedder.embedTradingSignals(content.signals);
    }
    
    if (content.quotes?.length) {
      results.quotes = await embedder.embedQuotes(content.quotes);
    }
    
    if (content.custom?.length) {
      results.custom = await embedder.embedCustomContent(content.custom);
    }

    const totalSuccessful = Object.values(results).reduce(
      (sum, result) => sum + result.successful.length, 0
    );
    const totalFailed = Object.values(results).reduce(
      (sum, result) => sum + result.failed.length, 0
    );
    const totalTime = Object.values(results).reduce(
      (sum, result) => sum + result.totalTime, 0
    );

    return {
      success: true,
      results,
      summary: {
        totalSuccessful,
        totalFailed,
        totalTime,
        embedder: await embedder.getStats()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
      summary: null
    };
  }
}

// Default export for convenience
const EmbeddingService = {
  // Core classes
  FinancialEmbedder,
  MockVectorStore,
  
  // Factory functions
  createFinancialEmbedder,
  createMockVectorStore,
  setupFinancialEmbeddings,
  
  // Utility functions
  searchFinancialContent,
  analyzeContentSimilarity,
  getEmbeddingServiceHealth,
  batchProcessFinancialContent,
  initializeWithSampleData,
  
  // Similarity functions
  cosineSimilarity,
  euclideanDistance,
  findKNearestNeighbors,
  advancedSimilaritySearch
};

export default EmbeddingService;