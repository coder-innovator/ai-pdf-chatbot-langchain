/**
 * Enhanced Ingestion Graph - Entry point for financial data processing
 * 
 * This module provides both legacy document ingestion and new financial
 * data processing capabilities through LangGraph workflows.
 */

// Export the original graph for backward compatibility
export { graph } from './graph.js';

// Export enhanced graph and financial processing components
export {
  enhancedGraph,
  EnhancedIngestionState,
  EnhancedIngestionStateType
} from './graph.js';

// Export state definitions
export { 
  IndexStateAnnotation,
  IndexStateType 
} from './state.js';

// Export configuration
export {
  ensureIndexConfiguration,
  IndexConfigurationAnnotation
} from './configuration.js';

// Export financial processing nodes
export { MarketDataProcessor } from './nodes/market-data-processor.js';
export { FinancialEmbedder } from './nodes/financial-embedder.js';
export { MockStorageIngester } from './nodes/mock-storage-ingester.js';

// Export storage adapters
export {
  StorageAdapter,
  StorageQuery,
  StorageFilter,
  VectorSearchOptions,
  MockStorageAdapter,
  SupabaseStorageAdapter,
  createStorageAdapter
} from './adapters/storage-adapter.js';

// Convenience functions for common workflows

/**
 * Process financial data for given symbols
 */
export async function processFinancialSymbols(
  symbols: string[],
  options?: {
    dataTypes?: ('quotes' | 'news' | 'tickers' | 'historical')[];
    storageType?: 'mock' | 'supabase';
    embeddings?: boolean;
  }
) {
  const { enhancedGraph } = await import('./graph.js');
  
  const initialState = {
    symbols,
    processingMode: 'financial' as const,
    financialData: {
      quotes: [],
      news: [],
      signals: [],
      tickers: []
    },
    embeddings: [],
    ingestionResults: {
      documents: { successful: 0, failed: 0 },
      financial: { successful: 0, failed: 0 }
    }
  };

  try {
    const result = await enhancedGraph.invoke(initialState);
    return {
      success: true,
      data: result.financialData,
      embeddings: result.embeddings,
      stats: result.ingestionResults,
      symbols: result.symbols
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      embeddings: [],
      stats: null,
      symbols
    };
  }
}

/**
 * Process documents and financial data together
 */
export async function processHybridContent(
  documents: any[],
  symbols: string[],
  config?: any
) {
  const { enhancedGraph } = await import('./graph.js');
  
  const initialState = {
    docs: documents,
    symbols,
    processingMode: 'both' as const,
    financialData: {
      quotes: [],
      news: [],
      signals: [],
      tickers: []
    },
    embeddings: [],
    ingestionResults: {
      documents: { successful: 0, failed: 0 },
      financial: { successful: 0, failed: 0 }
    }
  };

  try {
    const result = await enhancedGraph.invoke(initialState, config);
    return {
      success: true,
      documents: result.docs,
      financial: result.financialData,
      embeddings: result.embeddings,
      stats: result.ingestionResults
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      documents: null,
      financial: null,
      embeddings: [],
      stats: null
    };
  }
}

/**
 * Create and test storage adapter
 */
export async function createAndTestStorageAdapter(
  type: 'mock' | 'supabase' = 'mock',
  config?: { supabaseUrl?: string; supabaseKey?: string }
) {
  const { createStorageAdapter } = await import('./adapters/storage-adapter.js');
  
  const adapter = createStorageAdapter({
    type,
    supabaseUrl: config?.supabaseUrl,
    supabaseKey: config?.supabaseKey
  });

  try {
    const health = await adapter.healthCheck();
    const stats = await adapter.getStats();
    
    return {
      success: true,
      adapter,
      health,
      stats,
      type
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      adapter: null,
      health: { status: 'error', message: 'Failed to initialize' },
      stats: null,
      type
    };
  }
}

/**
 * Generate embeddings for custom financial text
 */
export async function generateFinancialEmbeddings(
  texts: string[],
  model?: string
) {
  const { FinancialEmbedder } = await import('./nodes/financial-embedder.js');
  
  const embedder = new FinancialEmbedder({ model });
  
  try {
    const result = await embedder.generateFinancialEmbeddings({
      customTexts: texts
    });
    
    return {
      success: true,
      embeddings: result.embeddings,
      stats: result.stats,
      model: embedder.getModelInfo()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      embeddings: [],
      stats: null,
      model: null
    };
  }
}

/**
 * Get system health and capabilities
 */
export async function getSystemHealth() {
  try {
    const { createStorageAdapter } = await import('./adapters/storage-adapter.js');
    const { MarketDataProcessor } = await import('./nodes/market-data-processor.js');
    const { FinancialEmbedder } = await import('./nodes/financial-embedder.js');
    
    // Test components
    const storageAdapter = createStorageAdapter({ type: 'mock' });
    const marketProcessor = new MarketDataProcessor();
    const embedder = new FinancialEmbedder();
    
    const [
      storageHealth,
      storageStats,
      processingStats,
      modelInfo
    ] = await Promise.all([
      storageAdapter.healthCheck(),
      storageAdapter.getStats(),
      Promise.resolve(marketProcessor.getProcessingStats()),
      Promise.resolve(embedder.getModelInfo())
    ]);

    return {
      success: true,
      components: {
        storage: {
          health: storageHealth,
          stats: storageStats,
          type: 'MockStorageAdapter'
        },
        processing: {
          stats: processingStats,
          capabilities: ['quotes', 'news', 'signals', 'tickers']
        },
        embeddings: {
          model: modelInfo,
          capabilities: ['news', 'signals', 'custom']
        }
      },
      graphs: {
        legacy: 'IngestionGraph',
        enhanced: 'EnhancedIngestionGraph'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      components: null,
      graphs: null
    };
  }
}

// Type exports for external use
export type {
  Quote,
  NewsArticle,
  TradingSignal,
  Ticker
} from '../types/index.js';

// Re-import for default export
import { graph as _graph, enhancedGraph as _enhancedGraph } from './graph.js';
import { MarketDataProcessor as _MarketDataProcessor } from './nodes/market-data-processor.js';
import { FinancialEmbedder as _FinancialEmbedder } from './nodes/financial-embedder.js';
import { MockStorageIngester as _MockStorageIngester } from './nodes/mock-storage-ingester.js';
import { createStorageAdapter as _createStorageAdapter } from './adapters/storage-adapter.js';

// Default export for convenience
export default {
  // Core graphs
  graph: _graph,
  enhancedGraph: _enhancedGraph,
  
  // Processing functions
  processFinancialSymbols,
  processHybridContent,
  generateFinancialEmbeddings,
  
  // Utilities
  createAndTestStorageAdapter,
  getSystemHealth,
  
  // Classes
  MarketDataProcessor: _MarketDataProcessor,
  FinancialEmbedder: _FinancialEmbedder,
  MockStorageIngester: _MockStorageIngester,
  createStorageAdapter: _createStorageAdapter
};