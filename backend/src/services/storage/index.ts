// Central export file for all storage services
// Provides unified access to different storage implementations

export { MockTradingStorage } from './mock-trading-storage.js';
export type { 
  MockSupabaseResponse, 
  MockSupabaseSingleResponse, 
  QueryOptions, 
  VectorSearchOptions 
} from './mock-trading-storage.js';

export { InMemoryVectorStore } from './in-memory-vector-store.js';
export type { 
  VectorSearchResult, 
  VectorSearchOptions as VectorStoreSearchOptions 
} from './in-memory-vector-store.js';

// Re-export Supabase types for convenience
export type {
  SupabaseResponse,
  SupabaseSingleResponse,
  SupabaseError,
  SupabaseTradingClient,
  SupabaseConfig,
  RealtimePayload,
  TickersTable,
  QuotesTable,
  BarsTable,
  TradesTable,
  NewsArticlesTable,
  TradingSignalsTable,
  PortfolioPositionsTable,
  OrdersTable,
  WatchlistsTable,
  ScheduledTasksTable,
  MarketSentimentTable,
  EconomicIndicatorsTable,
  PortfolioSnapshotsTable,
  DatabaseToApi,
  ApiToDatabase,
  InsertPayload,
  UpdatePayload
} from '../../types/supabase-trading.js';

import { Embeddings } from '@langchain/core/embeddings';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { MockTradingStorage } from './mock-trading-storage.js';
import { InMemoryVectorStore } from './in-memory-vector-store.js';

/**
 * Storage factory interface
 */
export interface StorageFactory {
  createTradingStorage(): MockTradingStorage;
  createVectorStore(embeddings?: Embeddings): Promise<InMemoryVectorStore>;
  createEmbeddings(): Embeddings;
}

/**
 * Default storage factory implementation
 */
export class DefaultStorageFactory implements StorageFactory {
  private tradingStorageInstance?: MockTradingStorage;
  private vectorStoreInstance?: InMemoryVectorStore;
  private embeddingsInstance?: Embeddings;

  /**
   * Create or return existing trading storage instance
   */
  createTradingStorage(): MockTradingStorage {
    if (!this.tradingStorageInstance) {
      this.tradingStorageInstance = new MockTradingStorage();
    }
    return this.tradingStorageInstance;
  }

  /**
   * Create or return existing vector store instance
   */
  async createVectorStore(embeddings?: Embeddings): Promise<InMemoryVectorStore> {
    if (!this.vectorStoreInstance) {
      const embeddingModel = embeddings || this.createEmbeddings();
      this.vectorStoreInstance = new InMemoryVectorStore(embeddingModel);
    }
    return this.vectorStoreInstance;
  }

  /**
   * Create or return existing embeddings instance
   */
  createEmbeddings(): Embeddings {
    if (!this.embeddingsInstance) {
      this.embeddingsInstance = new HuggingFaceTransformersEmbeddings({
        model: 'Xenova/all-MiniLM-L6-v2',
      });
    }
    return this.embeddingsInstance;
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  clearInstances(): void {
    this.tradingStorageInstance = undefined;
    this.vectorStoreInstance = undefined;
    this.embeddingsInstance = undefined;
  }
}

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  type: 'mock' | 'supabase' | 'hybrid';
  vectorStore: {
    type: 'memory' | 'supabase' | 'chroma';
    embeddingModel?: string;
  };
  cache?: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number;
  };
  options?: {
    mockDataSize?: 'small' | 'medium' | 'large';
    enableRealtime?: boolean;
    enableMetrics?: boolean;
  };
}

/**
 * Storage manager that handles different storage backends
 */
export class StorageManager {
  private config: StorageConfig;
  private factory: StorageFactory;
  private tradingStorage?: MockTradingStorage;
  private vectorStore?: InMemoryVectorStore;

  constructor(config: StorageConfig, factory?: StorageFactory) {
    this.config = config;
    this.factory = factory || new DefaultStorageFactory();
  }

  /**
   * Initialize storage backends
   */
  async initialize(): Promise<void> {
    // Initialize trading storage
    this.tradingStorage = this.factory.createTradingStorage();

    // Initialize vector store
    this.vectorStore = await this.factory.createVectorStore();

    console.log(`Storage initialized with type: ${this.config.type}`);
  }

  /**
   * Get trading storage instance
   */
  getTradingStorage(): MockTradingStorage {
    if (!this.tradingStorage) {
      throw new Error('Trading storage not initialized. Call initialize() first.');
    }
    return this.tradingStorage;
  }

  /**
   * Get vector store instance
   */
  getVectorStore(): InMemoryVectorStore {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }
    return this.vectorStore;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    trading: { [key: string]: number };
    vector: {
      documentCount: number;
      avgEmbeddingDimension: number;
      memoryUsage: number;
      oldestDocument: Date | null;
      newestDocument: Date | null;
    };
  }> {
    return {
      trading: this.tradingStorage?.getStats() || {},
      vector: this.vectorStore?.getStats() || {
        documentCount: 0,
        avgEmbeddingDimension: 0,
        memoryUsage: 0,
        oldestDocument: null,
        newestDocument: null,
      },
    };
  }

  /**
   * Health check for all storage backends
   */
  async healthCheck(): Promise<{
    trading: { status: 'ok' | 'error'; message?: string };
    vector: { status: 'ok' | 'error'; message?: string };
  }> {
    const result = {
      trading: { status: 'ok' as const },
      vector: { status: 'ok' as const },
    };

    // Check trading storage
    try {
      if (!this.tradingStorage) {
        throw new Error('Trading storage not initialized');
      }
      // Simple test query
      await this.tradingStorage.select('tickers', { limit: 1 });
    } catch (error) {
      (result.trading as any) = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check vector store
    try {
      if (!this.vectorStore) {
        throw new Error('Vector store not initialized');
      }
      // Simple test
      this.vectorStore.getDocumentCount();
    } catch (error) {
      (result.vector as any) = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return result;
  }

  /**
   * Clear all data (useful for testing)
   */
  async clearAll(): Promise<void> {
    if (this.tradingStorage) {
      await this.tradingStorage.clearAll();
    }
    if (this.vectorStore) {
      await this.vectorStore.clear();
    }
  }

  /**
   * Export all data
   */
  async exportData(): Promise<{
    trading: { [key: string]: number };
    vector: any;
    timestamp: Date;
  }> {
    return {
      trading: this.tradingStorage?.getStats() || {},
      vector: this.vectorStore?.export() || null,
      timestamp: new Date(),
    };
  }
}

/**
 * Default storage configuration for development
 */
export const defaultStorageConfig: StorageConfig = {
  type: 'mock',
  vectorStore: {
    type: 'memory',
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  },
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000,
  },
  options: {
    mockDataSize: 'medium',
    enableRealtime: false,
    enableMetrics: true,
  },
};

/**
 * Create a storage manager with default configuration
 */
export function createStorageManager(config?: Partial<StorageConfig>): StorageManager {
  const finalConfig = { ...defaultStorageConfig, ...config };
  return new StorageManager(finalConfig);
}

/**
 * Global storage manager instance (singleton pattern)
 */
let globalStorageManager: StorageManager | null = null;

/**
 * Get or create the global storage manager
 */
export function getStorageManager(config?: Partial<StorageConfig>): StorageManager {
  if (!globalStorageManager) {
    globalStorageManager = createStorageManager(config);
  }
  return globalStorageManager;
}

/**
 * Reset the global storage manager (useful for testing)
 */
export function resetStorageManager(): void {
  globalStorageManager = null;
}

// Utility functions for common storage operations
export const StorageUtils = {
  /**
   * Convert API dates to database format
   */
  dateToDb(date: Date): string {
    return date.toISOString();
  },

  /**
   * Convert database dates to API format
   */
  dateFromDb(dateStr: string): Date {
    return new Date(dateStr);
  },

  /**
   * Validate symbol format
   */
  isValidSymbol(symbol: string): boolean {
    return /^[A-Z]{1,5}$/.test(symbol);
  },

  /**
   * Generate pagination parameters
   */
  getPaginationParams(page: number, limit: number): { from: number; to: number } {
    const from = page * limit;
    const to = from + limit - 1;
    return { from, to };
  },

  /**
   * Create a filter for date ranges
   */
  createDateRangeFilter(
    column: string,
    startDate: Date,
    endDate: Date
  ): { gte: { [key: string]: string }; lte: { [key: string]: string } } {
    return {
      gte: { [column]: startDate.toISOString() },
      lte: { [column]: endDate.toISOString() },
    };
  },
};