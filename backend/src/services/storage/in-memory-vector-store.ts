import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';

/**
 * Document with embedding for internal storage
 */
interface EmbeddedDocument {
  id: string;
  document: Document;
  embedding: number[];
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Search result with similarity score
 */
export interface VectorSearchResult {
  document: Document;
  score: number;
  id: string;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  k?: number;
  threshold?: number;
  filter?: Record<string, any>;
  includeEmbeddings?: boolean;
}

/**
 * In-memory vector store implementation for development and testing
 * Provides vector similarity search without external dependencies
 */
export class InMemoryVectorStore extends VectorStore {
  private documents: Map<string, EmbeddedDocument> = new Map();
  public embeddings: Embeddings;
  private nextId: number = 1;

  declare FilterType: Record<string, any>;

  constructor(embeddings: Embeddings) {
    super(embeddings, {});
    this.embeddings = embeddings;
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const ids = options?.ids || documents.map(() => this.generateId());
    
    if (ids.length !== documents.length) {
      throw new Error('Number of ids must match number of documents');
    }

    // Generate embeddings for all documents
    const texts = documents.map(doc => doc.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);

    const addedIds: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      const id = ids[i];
      const document = documents[i];
      const embedding = embeddings[i];

      const embeddedDoc: EmbeddedDocument = {
        id,
        document,
        embedding,
        metadata: document.metadata || {},
        timestamp: new Date(),
      };

      this.documents.set(id, embeddedDoc);
      addedIds.push(id);
    }

    return addedIds;
  }

  /**
   * Add vectors directly (when you already have embeddings)
   */
  async addVectors(
    vectors: number[][],
    documents: Document[],
    options?: { ids?: string[] }
  ): Promise<string[]> {
    const ids = options?.ids || documents.map(() => this.generateId());
    
    if (ids.length !== documents.length || vectors.length !== documents.length) {
      throw new Error('Number of ids, vectors, and documents must match');
    }

    const addedIds: string[] = [];

    for (let i = 0; i < documents.length; i++) {
      const id = ids[i];
      const document = documents[i];
      const embedding = vectors[i];

      const embeddedDoc: EmbeddedDocument = {
        id,
        document,
        embedding,
        metadata: document.metadata || {},
        timestamp: new Date(),
      };

      this.documents.set(id, embeddedDoc);
      addedIds.push(id);
    }

    return addedIds;
  }

  /**
   * Similarity search with scores
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    return this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
  }

  /**
   * Similarity search using query vector
   */
  async similaritySearchVectorWithScore(
    queryVector: number[],
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const results = await this.searchVectors(queryVector, { k, filter });
    return results.map(result => [result.document, result.score]);
  }

  /**
   * Standard similarity search (without scores)
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<Document[]> {
    const results = await this.similaritySearchWithScore(query, k, filter);
    return results.map(([doc]) => doc);
  }

  /**
   * Advanced vector search with options
   */
  async searchVectors(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { k = 4, threshold = 0, filter, includeEmbeddings = false } = options;

    const candidates: Array<{
      doc: EmbeddedDocument;
      similarity: number;
    }> = [];

    // Calculate similarities for all documents
    for (const [id, embeddedDoc] of this.documents) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(embeddedDoc, filter)) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryVector, embeddedDoc.embedding);
      
      if (similarity >= threshold) {
        candidates.push({ doc: embeddedDoc, similarity });
      }
    }

    // Sort by similarity (descending)
    candidates.sort((a, b) => b.similarity - a.similarity);

    // Take top k results
    const topResults = candidates.slice(0, k);

    return topResults.map(({ doc, similarity }) => ({
      document: includeEmbeddings 
        ? new Document({
            pageContent: doc.document.pageContent,
            metadata: { ...doc.metadata, embedding: doc.embedding }
          })
        : doc.document,
      score: similarity,
      id: doc.id,
    }));
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const embeddedDoc = this.documents.get(id);
    return embeddedDoc ? embeddedDoc.document : null;
  }

  /**
   * Get all document IDs
   */
  getDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Get total number of documents
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Remove documents by IDs
   */
  async removeDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.nextId = 1;
  }

  /**
   * Update document metadata
   */
  async updateMetadata(id: string, metadata: Record<string, any>): Promise<boolean> {
    const embeddedDoc = this.documents.get(id);
    if (!embeddedDoc) {
      return false;
    }

    embeddedDoc.metadata = { ...embeddedDoc.metadata, ...metadata };
    embeddedDoc.document.metadata = embeddedDoc.metadata;
    return true;
  }

  /**
   * Get documents by metadata filter
   */
  async getDocumentsByMetadata(filter: Record<string, any>): Promise<VectorSearchResult[]> {
    const results: VectorSearchResult[] = [];

    for (const [id, embeddedDoc] of this.documents) {
      if (this.matchesFilter(embeddedDoc, filter)) {
        results.push({
          document: embeddedDoc.document,
          score: 1.0, // No similarity calculated for metadata-only search
          id,
        });
      }
    }

    return results;
  }

  /**
   * Export vector store data
   */
  export(): {
    documents: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      embedding: number[];
    }>;
    count: number;
  } {
    const exported = Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      content: doc.document.pageContent,
      metadata: doc.metadata,
      embedding: doc.embedding,
    }));

    return {
      documents: exported,
      count: exported.length,
    };
  }

  /**
   * Import vector store data
   */
  async import(data: {
    documents: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      embedding: number[];
    }>;
  }): Promise<void> {
    await this.clear();

    for (const docData of data.documents) {
      const document = new Document({
        pageContent: docData.content,
        metadata: docData.metadata,
      });

      const embeddedDoc: EmbeddedDocument = {
        id: docData.id,
        document,
        embedding: docData.embedding,
        metadata: docData.metadata,
        timestamp: new Date(),
      };

      this.documents.set(docData.id, embeddedDoc);
    }

    // Update next ID to avoid conflicts
    const maxId = Math.max(
      ...data.documents
        .map(d => parseInt(d.id))
        .filter(id => !isNaN(id)),
      0
    );
    this.nextId = maxId + 1;
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    documentCount: number;
    avgEmbeddingDimension: number;
    memoryUsage: number; // Approximate in bytes
    oldestDocument: Date | null;
    newestDocument: Date | null;
  } {
    if (this.documents.size === 0) {
      return {
        documentCount: 0,
        avgEmbeddingDimension: 0,
        memoryUsage: 0,
        oldestDocument: null,
        newestDocument: null,
      };
    }

    const docs = Array.from(this.documents.values());
    const avgDimension = docs.reduce((sum, doc) => sum + doc.embedding.length, 0) / docs.length;
    
    // Rough memory usage calculation
    const memoryUsage = docs.reduce((sum, doc) => {
      return sum + 
        doc.document.pageContent.length * 2 + // UTF-16 string
        doc.embedding.length * 8 + // 64-bit floats
        JSON.stringify(doc.metadata).length * 2; // Metadata as string
    }, 0);

    const timestamps = docs.map(doc => doc.timestamp);
    const oldestDocument = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const newestDocument = new Date(Math.max(...timestamps.map(t => t.getTime())));

    return {
      documentCount: this.documents.size,
      avgEmbeddingDimension: Math.round(avgDimension),
      memoryUsage,
      oldestDocument,
      newestDocument,
    };
  }

  // Static factory method
  static async fromTexts(
    texts: string[],
    metadatas: Record<string, any>[] | Record<string, any>,
    embeddings: Embeddings,
    dbConfig?: any
  ): Promise<InMemoryVectorStore> {
    const store = new InMemoryVectorStore(embeddings);
    
    const docs = texts.map((text, i) => new Document({
      pageContent: text,
      metadata: Array.isArray(metadatas) ? metadatas[i] || {} : metadatas || {},
    }));

    await store.addDocuments(docs);
    return store;
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: Embeddings,
    dbConfig?: any
  ): Promise<InMemoryVectorStore> {
    const store = new InMemoryVectorStore(embeddings);
    await store.addDocuments(docs);
    return store;
  }

  // Helper methods
  private generateId(): string {
    return `doc_${this.nextId++}`;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private matchesFilter(embeddedDoc: EmbeddedDocument, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (embeddedDoc.metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Required by VectorStore abstract class
  _vectorstoreType(): string {
    return 'in-memory';
  }
}