/**
 * Mock Vector Store for financial embeddings
 * Provides in-memory vector storage with similarity search capabilities
 */

import { 
  cosineSimilarity, 
  euclideanDistance, 
  findKNearestNeighbors,
  advancedSimilaritySearch,
  SimilaritySearchResult,
  validateVectorDimensions,
  validateVectorValues
} from '../../utils/vector-similarity.js';

/**
 * Vector embedding interface
 */
export interface VectorEmbedding {
  id: string;
  embedding: number[];
  metadata: {
    text?: string;
    type?: 'news' | 'signal' | 'quote' | 'ticker' | 'custom';
    symbol?: string;
    timestamp?: Date;
    source?: string;
    category?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search options interface
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  metric?: 'cosine' | 'euclidean' | 'manhattan' | 'pearson';
  includeMetadata?: boolean;
  filter?: {
    type?: string | string[];
    symbol?: string | string[];
    dateRange?: { start: Date; end: Date };
    [key: string]: any;
  };
}

/**
 * Search result interface
 */
export interface SearchResult extends VectorEmbedding {
  similarity: number;
  distance?: number;
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
  totalEmbeddings: number;
  dimensions: number;
  averageEmbeddingMagnitude: number;
  typeDistribution: { [type: string]: number };
  memoryUsage: number; // approximate bytes
  oldestEmbedding: Date | null;
  newestEmbedding: Date | null;
}

/**
 * Mock Vector Store implementation
 * In-memory vector storage with similarity search for financial embeddings
 */
export class MockVectorStore {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  private dimensionality: number | null = null;
  private indexByType: Map<string, Set<string>> = new Map();
  private indexBySymbol: Map<string, Set<string>> = new Map();

  constructor() {
    console.log('MockVectorStore initialized');
  }

  /**
   * Add a single embedding to the store
   */
  async addEmbedding(
    id: string, 
    embedding: number[], 
    metadata: VectorEmbedding['metadata'] = {}
  ): Promise<void> {
    // Validate embedding
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding vector cannot be empty');
    }

    if (!validateVectorValues([embedding])) {
      throw new Error('Embedding contains invalid values (NaN or Infinity)');
    }

    // Check dimensionality consistency
    if (this.dimensionality === null) {
      this.dimensionality = embedding.length;
    } else if (embedding.length !== this.dimensionality) {
      throw new Error(
        `Embedding dimension mismatch: expected ${this.dimensionality}, got ${embedding.length}`
      );
    }

    const now = new Date();
    const vectorEmbedding: VectorEmbedding = {
      id,
      embedding: [...embedding], // Create copy
      metadata: { ...metadata },
      createdAt: now,
      updatedAt: now
    };

    // Store embedding
    this.embeddings.set(id, vectorEmbedding);

    // Update indexes
    this.updateIndexes(id, vectorEmbedding);

    console.log(`Added embedding ${id} with dimension ${embedding.length}`);
  }

  /**
   * Add multiple embeddings in batch
   */
  async addEmbeddings(
    embeddings: Array<{
      id: string;
      embedding: number[];
      metadata?: VectorEmbedding['metadata'];
    }>
  ): Promise<void> {
    // Validate all embeddings first
    const embeddingVectors = embeddings.map(e => e.embedding);
    
    if (!validateVectorDimensions(embeddingVectors)) {
      throw new Error('All embeddings must have the same dimensions');
    }

    if (!validateVectorValues(embeddingVectors)) {
      throw new Error('Some embeddings contain invalid values');
    }

    // Add each embedding
    for (const { id, embedding, metadata = {} } of embeddings) {
      await this.addEmbedding(id, embedding, metadata);
    }

    console.log(`Added ${embeddings.length} embeddings in batch`);
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(
    queryEmbedding: number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      limit = 10,
      threshold = 0,
      metric = 'cosine',
      includeMetadata = true,
      filter
    } = options;

    // Validate query embedding
    if (!queryEmbedding || queryEmbedding.length === 0) {
      throw new Error('Query embedding cannot be empty');
    }

    if (this.dimensionality !== null && queryEmbedding.length !== this.dimensionality) {
      throw new Error(
        `Query embedding dimension mismatch: expected ${this.dimensionality}, got ${queryEmbedding.length}`
      );
    }

    // Get embeddings to search (apply pre-filtering)
    let searchEmbeddings = Array.from(this.embeddings.values());
    
    if (filter) {
      searchEmbeddings = this.applyFilter(searchEmbeddings, filter);
    }

    if (searchEmbeddings.length === 0) {
      return [];
    }

    // Calculate similarities
    const results: SearchResult[] = [];

    for (const embedding of searchEmbeddings) {
      let similarity = 0;
      let distance: number | undefined;

      switch (metric) {
        case 'cosine':
          similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
          break;
        case 'euclidean':
          distance = euclideanDistance(queryEmbedding, embedding.embedding);
          // Convert distance to similarity (inverse relationship)
          const maxDistance = Math.sqrt(queryEmbedding.length * 4); // Approximate max
          similarity = Math.max(0, 1 - distance / maxDistance);
          break;
        default:
          similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
      }

      if (similarity >= threshold) {
        results.push({
          ...embedding,
          similarity,
          distance,
          metadata: includeMetadata ? embedding.metadata : {}
        });
      }
    }

    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  /**
   * Get embedding by ID
   */
  async getEmbedding(id: string): Promise<VectorEmbedding | null> {
    return this.embeddings.get(id) || null;
  }

  /**
   * Update embedding metadata
   */
  async updateEmbedding(
    id: string, 
    updates: {
      embedding?: number[];
      metadata?: Partial<VectorEmbedding['metadata']>;
    }
  ): Promise<boolean> {
    const existing = this.embeddings.get(id);
    if (!existing) {
      return false;
    }

    const updated: VectorEmbedding = {
      ...existing,
      updatedAt: new Date()
    };

    if (updates.embedding) {
      if (updates.embedding.length !== this.dimensionality) {
        throw new Error('Cannot change embedding dimensionality');
      }
      updated.embedding = [...updates.embedding];
    }

    if (updates.metadata) {
      updated.metadata = { ...existing.metadata, ...updates.metadata };
    }

    // Remove old indexes
    this.removeFromIndexes(id, existing);
    
    // Store updated embedding
    this.embeddings.set(id, updated);
    
    // Update indexes
    this.updateIndexes(id, updated);

    return true;
  }

  /**
   * Delete embedding by ID
   */
  async deleteEmbedding(id: string): Promise<boolean> {
    const existing = this.embeddings.get(id);
    if (!existing) {
      return false;
    }

    // Remove from indexes
    this.removeFromIndexes(id, existing);
    
    // Delete from main store
    this.embeddings.delete(id);

    console.log(`Deleted embedding ${id}`);
    return true;
  }

  /**
   * Clear all embeddings
   */
  async clear(): Promise<void> {
    this.embeddings.clear();
    this.indexByType.clear();
    this.indexBySymbol.clear();
    this.dimensionality = null;
    
    console.log('MockVectorStore cleared');
  }

  /**
   * Get embeddings by type
   */
  async getEmbeddingsByType(type: string): Promise<VectorEmbedding[]> {
    const ids = this.indexByType.get(type) || new Set();
    const embeddings: VectorEmbedding[] = [];
    
    for (const id of ids) {
      const embedding = this.embeddings.get(id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }
    
    return embeddings;
  }

  /**
   * Get embeddings by symbol
   */
  async getEmbeddingsBySymbol(symbol: string): Promise<VectorEmbedding[]> {
    const ids = this.indexBySymbol.get(symbol) || new Set();
    const embeddings: VectorEmbedding[] = [];
    
    for (const id of ids) {
      const embedding = this.embeddings.get(id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }
    
    return embeddings;
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    const embeddings = Array.from(this.embeddings.values());
    
    if (embeddings.length === 0) {
      return {
        totalEmbeddings: 0,
        dimensions: 0,
        averageEmbeddingMagnitude: 0,
        typeDistribution: {},
        memoryUsage: 0,
        oldestEmbedding: null,
        newestEmbedding: null
      };
    }

    // Calculate statistics
    let totalMagnitude = 0;
    const typeDistribution: { [type: string]: number } = {};
    let oldestDate = embeddings[0].createdAt;
    let newestDate = embeddings[0].createdAt;

    for (const embedding of embeddings) {
      // Calculate magnitude
      const magnitude = Math.sqrt(
        embedding.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      totalMagnitude += magnitude;

      // Type distribution
      const type = embedding.metadata.type || 'unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;

      // Date range
      if (embedding.createdAt < oldestDate) {
        oldestDate = embedding.createdAt;
      }
      if (embedding.createdAt > newestDate) {
        newestDate = embedding.createdAt;
      }
    }

    // Estimate memory usage (rough approximation)
    const avgEmbeddingSize = this.dimensionality ? this.dimensionality * 8 : 0; // 8 bytes per number
    const avgMetadataSize = 200; // Estimated metadata size
    const memoryUsage = embeddings.length * (avgEmbeddingSize + avgMetadataSize);

    return {
      totalEmbeddings: embeddings.length,
      dimensions: this.dimensionality || 0,
      averageEmbeddingMagnitude: totalMagnitude / embeddings.length,
      typeDistribution,
      memoryUsage,
      oldestEmbedding: oldestDate,
      newestEmbedding: newestDate
    };
  }

  /**
   * Find similar embeddings to a given embedding ID
   */
  async findSimilar(
    embeddingId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const embedding = await this.getEmbedding(embeddingId);
    if (!embedding) {
      throw new Error(`Embedding with ID ${embeddingId} not found`);
    }

    // Exclude the original embedding from results
    const results = await this.similaritySearch(embedding.embedding, options);
    return results.filter(result => result.id !== embeddingId);
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.embeddings.size;
  }

  /**
   * Check if store is empty
   */
  isEmpty(): boolean {
    return this.embeddings.size === 0;
  }

  /**
   * Get all embedding IDs
   */
  getAllIds(): string[] {
    return Array.from(this.embeddings.keys());
  }

  // Private helper methods

  private updateIndexes(id: string, embedding: VectorEmbedding): void {
    // Index by type
    const type = embedding.metadata.type;
    if (type) {
      if (!this.indexByType.has(type)) {
        this.indexByType.set(type, new Set());
      }
      this.indexByType.get(type)!.add(id);
    }

    // Index by symbol
    const symbol = embedding.metadata.symbol;
    if (symbol) {
      if (!this.indexBySymbol.has(symbol)) {
        this.indexBySymbol.set(symbol, new Set());
      }
      this.indexBySymbol.get(symbol)!.add(id);
    }
  }

  private removeFromIndexes(id: string, embedding: VectorEmbedding): void {
    // Remove from type index
    const type = embedding.metadata.type;
    if (type && this.indexByType.has(type)) {
      this.indexByType.get(type)!.delete(id);
      if (this.indexByType.get(type)!.size === 0) {
        this.indexByType.delete(type);
      }
    }

    // Remove from symbol index
    const symbol = embedding.metadata.symbol;
    if (symbol && this.indexBySymbol.has(symbol)) {
      this.indexBySymbol.get(symbol)!.delete(id);
      if (this.indexBySymbol.get(symbol)!.size === 0) {
        this.indexBySymbol.delete(symbol);
      }
    }
  }

  private applyFilter(
    embeddings: VectorEmbedding[], 
    filter: NonNullable<SearchOptions['filter']>
  ): VectorEmbedding[] {
    return embeddings.filter(embedding => {
      // Type filter
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        if (!types.includes(embedding.metadata.type || '')) {
          return false;
        }
      }

      // Symbol filter
      if (filter.symbol) {
        const symbols = Array.isArray(filter.symbol) ? filter.symbol : [filter.symbol];
        if (!symbols.includes(embedding.metadata.symbol || '')) {
          return false;
        }
      }

      // Date range filter
      if (filter.dateRange) {
        const embeddingDate = embedding.metadata.timestamp || embedding.createdAt;
        if (embeddingDate < filter.dateRange.start || embeddingDate > filter.dateRange.end) {
          return false;
        }
      }

      // Custom metadata filters
      for (const [key, value] of Object.entries(filter)) {
        if (['type', 'symbol', 'dateRange'].includes(key)) {
          continue; // Skip already processed filters
        }

        if (embedding.metadata[key] !== value) {
          return false;
        }
      }

      return true;
    });
  }
}

/**
 * Create a new MockVectorStore instance
 */
export function createMockVectorStore(): MockVectorStore {
  return new MockVectorStore();
}

/**
 * Default export
 */
export default MockVectorStore;