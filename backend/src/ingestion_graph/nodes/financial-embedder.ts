import { StateGraph, MemorySaver, Annotation } from '@langchain/langgraph';
import { Embeddings } from '@langchain/core/embeddings';
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';
import { 
  NewsArticle, 
  TradingSignal 
} from '../../types/index.js';

/**
 * State for financial embeddings workflow
 */
const EmbeddingState = Annotation.Root({
  // Input data
  newsArticles: Annotation<NewsArticle[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  tradingSignals: Annotation<TradingSignal[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  customTexts: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Embedding configuration
  model: Annotation<string>({
    reducer: (x, y) => y ?? x ?? 'Xenova/all-MiniLM-L6-v2',
  }),
  batchSize: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 10,
  }),
  
  // Processing state
  textChunks: Annotation<Array<{
    id: string;
    text: string;
    type: 'news' | 'signal' | 'custom';
    metadata: any;
  }>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Output embeddings
  embeddings: Annotation<Array<{
    id: string;
    embedding: number[];
    text: string;
    type: 'news' | 'signal' | 'custom';
    metadata: any;
    dimension: number;
  }>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Processing metrics
  embeddingStats: Annotation<{
    totalTexts: number;
    successfulEmbeddings: number;
    failedEmbeddings: number;
    averageDimension: number;
    processingTime: number;
    modelUsed: string;
  }>({
    reducer: (x, y) => y ?? x ?? {
      totalTexts: 0,
      successfulEmbeddings: 0,
      failedEmbeddings: 0,
      averageDimension: 0,
      processingTime: 0,
      modelUsed: ''
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

type EmbeddingStateType = typeof EmbeddingState.State;

/**
 * Document chunk interface for embedding processing
 */
interface DocumentChunk {
  id: string;
  text: string;
  type: 'news' | 'signal' | 'custom';
  metadata: any;
}

/**
 * Financial Embedder - LangGraph node for generating embeddings from financial texts
 * Handles news articles, trading signals, and custom financial text content
 */
export class FinancialEmbedder {
  private embeddings: Embeddings;
  private graph: StateGraph<EmbeddingStateType>;
  private defaultModel: string = 'Xenova/all-MiniLM-L6-v2';

  constructor(options?: {
    model?: string;
    batchSize?: number;
  }) {
    this.defaultModel = options?.model || this.defaultModel;
    this.embeddings = new HuggingFaceTransformersEmbeddings({
      model: this.defaultModel,
    });
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph embedding workflow
   */
  private buildGraph(): StateGraph<EmbeddingStateType> {
    const graph = new StateGraph(EmbeddingState)
      .addNode('extract_texts', this.extractTexts.bind(this))
      .addNode('chunk_texts', this.chunkTexts.bind(this))
      .addNode('generate_embeddings', this.generateEmbeddings.bind(this))
      .addNode('validate_embeddings', this.validateEmbeddings.bind(this))
      .addNode('calculate_stats', this.calculateStats.bind(this))
      .addEdge('__start__', 'extract_texts')
      .addEdge('extract_texts', 'chunk_texts')
      .addEdge('chunk_texts', 'generate_embeddings')
      .addEdge('generate_embeddings', 'validate_embeddings')
      .addEdge('validate_embeddings', 'calculate_stats')
      .addEdge('calculate_stats', '__end__');

    return graph;
  }

  /**
   * Generate embeddings for financial content
   */
  async generateFinancialEmbeddings(input: {
    newsArticles?: NewsArticle[];
    tradingSignals?: TradingSignal[];
    customTexts?: string[];
    model?: string;
    batchSize?: number;
  }): Promise<{
    embeddings: Array<{
      id: string;
      embedding: number[];
      text: string;
      type: 'news' | 'signal' | 'custom';
      metadata: any;
      dimension: number;
    }>;
    stats: any;
  }> {
    // Update model if specified
    if (input.model && input.model !== this.defaultModel) {
      this.embeddings = new HuggingFaceTransformersEmbeddings({
        model: input.model,
      });
    }

    const initialState: Partial<EmbeddingStateType> = {
      newsArticles: input.newsArticles || [],
      tradingSignals: input.tradingSignals || [],
      customTexts: input.customTexts || [],
      model: input.model || this.defaultModel,
      batchSize: input.batchSize || 10,
      currentStep: 'start'
    };

    const compiledGraph = this.graph.compile();
    const result = await compiledGraph.invoke(initialState);

    return {
      embeddings: result.embeddings || [],
      stats: result.embeddingStats
    };
  }

  /**
   * Extract text content from financial data structures
   */
  private async extractTexts(state: EmbeddingStateType): Promise<Partial<EmbeddingStateType>> {
    try {
      console.log('Extracting texts from financial data');
      
      const textChunks: DocumentChunk[] = [];
      
      // Extract from news articles
      for (const article of state.newsArticles) {
        const newsText = this.extractNewsText(article);
        textChunks.push({
          id: `news_${article.url || Date.now()}_${Math.random()}`,
          text: newsText,
          type: 'news',
          metadata: {
            title: article.title,
            source: article.source,
            published: article.time_published,
            sentiment: article.overall_sentiment_label,
            sentimentScore: article.overall_sentiment_score,
            symbols: article.ticker_sentiment.map(ts => ts.ticker),
            url: article.url
          }
        });
      }

      // Extract from trading signals
      for (const signal of state.tradingSignals) {
        const signalText = this.extractSignalText(signal);
        textChunks.push({
          id: `signal_${signal.symbol}_${signal.timestamp.getTime()}`,
          text: signalText,
          type: 'signal',
          metadata: {
            symbol: signal.symbol,
            action: signal.action,
            confidence: signal.confidence,
            price: signal.price,
            timestamp: signal.timestamp,
            reasoning: signal.reasoning,
            riskLevel: signal.risk_level
          }
        });
      }

      // Extract from custom texts
      state.customTexts.forEach((text, index) => {
        textChunks.push({
          id: `custom_${index}_${Date.now()}`,
          text: text,
          type: 'custom',
          metadata: {
            index,
            length: text.length
          }
        });
      });

      console.log(`Extracted ${textChunks.length} text chunks`);

      return {
        textChunks,
        currentStep: 'extract_texts_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to extract texts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'extract_texts_failed'
      };
    }
  }

  /**
   * Chunk texts for optimal embedding generation
   */
  private async chunkTexts(state: EmbeddingStateType): Promise<Partial<EmbeddingStateType>> {
    try {
      console.log('Chunking texts for embedding');
      
      const chunkedTexts: DocumentChunk[] = [];
      
      for (const chunk of state.textChunks) {
        // Split long texts into smaller chunks
        const chunks = this.splitTextIntoChunks(chunk.text, 512); // Max token length
        
        if (chunks.length === 1) {
          chunkedTexts.push(chunk);
        } else {
          chunks.forEach((chunkText, index) => {
            chunkedTexts.push({
              id: `${chunk.id}_chunk_${index}`,
              text: chunkText,
              type: chunk.type,
              metadata: {
                ...chunk.metadata,
                isChunk: true,
                chunkIndex: index,
                totalChunks: chunks.length,
                originalId: chunk.id
              }
            });
          });
        }
      }

      console.log(`Created ${chunkedTexts.length} text chunks from ${state.textChunks.length} documents`);

      return {
        textChunks: chunkedTexts,
        currentStep: 'chunk_texts_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to chunk texts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'chunk_texts_failed'
      };
    }
  }

  /**
   * Generate embeddings for all text chunks
   */
  private async generateEmbeddings(state: EmbeddingStateType): Promise<Partial<EmbeddingStateType>> {
    try {
      console.log(`Generating embeddings for ${state.textChunks.length} text chunks`);
      const startTime = Date.now();
      
      const embeddings: Array<{
        id: string;
        embedding: number[];
        text: string;
        type: 'news' | 'signal' | 'custom';
        metadata: any;
        dimension: number;
      }> = [];

      // Process in batches
      const batchSize = state.batchSize;
      for (let i = 0; i < state.textChunks.length; i += batchSize) {
        const batch = state.textChunks.slice(i, i + batchSize);
        
        try {
          // Generate embeddings for batch
          const batchTexts = batch.map(chunk => chunk.text);
          const batchEmbeddings = await this.embeddings.embedDocuments(batchTexts);
          
          // Store results
          for (let j = 0; j < batch.length; j++) {
            embeddings.push({
              id: batch[j].id,
              embedding: batchEmbeddings[j],
              text: batch[j].text,
              type: batch[j].type,
              metadata: batch[j].metadata,
              dimension: batchEmbeddings[j].length
            });
          }
          
          console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(state.textChunks.length / batchSize)}`);
        } catch (batchError) {
          console.error(`Failed to process batch starting at index ${i}:`, batchError);
          // Continue with next batch
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`Generated ${embeddings.length} embeddings in ${processingTime}ms`);

      return {
        embeddings,
        embeddingStats: {
          ...state.embeddingStats,
          totalTexts: state.textChunks.length,
          successfulEmbeddings: embeddings.length,
          failedEmbeddings: state.textChunks.length - embeddings.length,
          processingTime,
          modelUsed: state.model
        },
        currentStep: 'generate_embeddings_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'generate_embeddings_failed'
      };
    }
  }

  /**
   * Validate generated embeddings
   */
  private async validateEmbeddings(state: EmbeddingStateType): Promise<Partial<EmbeddingStateType>> {
    try {
      console.log('Validating generated embeddings');
      
      const validEmbeddings = state.embeddings.filter(emb => {
        // Check if embedding is valid
        return emb.embedding.length > 0 && 
               emb.embedding.every(val => !isNaN(val) && isFinite(val));
      });

      const invalidCount = state.embeddings.length - validEmbeddings.length;
      
      if (invalidCount > 0) {
        console.warn(`Found ${invalidCount} invalid embeddings`);
      }

      // Calculate average dimension
      const avgDimension = validEmbeddings.length > 0 
        ? validEmbeddings.reduce((sum, emb) => sum + emb.dimension, 0) / validEmbeddings.length
        : 0;

      return {
        embeddings: validEmbeddings,
        embeddingStats: {
          ...state.embeddingStats,
          successfulEmbeddings: validEmbeddings.length,
          failedEmbeddings: state.embeddingStats.failedEmbeddings + invalidCount,
          averageDimension: avgDimension
        },
        currentStep: 'validate_embeddings_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to validate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'validate_embeddings_failed'
      };
    }
  }

  /**
   * Calculate final statistics
   */
  private async calculateStats(state: EmbeddingStateType): Promise<Partial<EmbeddingStateType>> {
    try {
      console.log('Calculating embedding statistics');
      
      const stats = state.embeddingStats;
      const successRate = stats.totalTexts > 0 ? stats.successfulEmbeddings / stats.totalTexts : 0;
      
      // Group embeddings by type
      const byType = state.embeddings.reduce((acc, emb) => {
        acc[emb.type] = (acc[emb.type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      console.log(`Embedding generation completed:`);
      console.log(`- Total texts: ${stats.totalTexts}`);
      console.log(`- Successful embeddings: ${stats.successfulEmbeddings}`);
      console.log(`- Failed embeddings: ${stats.failedEmbeddings}`);
      console.log(`- Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`- Average dimension: ${stats.averageDimension.toFixed(0)}`);
      console.log(`- Processing time: ${stats.processingTime}ms`);
      console.log(`- By type:`, byType);

      return {
        embeddingStats: {
          ...stats,
          byType,
          successRate
        },
        currentStep: 'calculate_stats_completed'
      };
    } catch (error) {
      const errorMsg = `Failed to calculate stats: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      return {
        errors: [errorMsg],
        currentStep: 'calculate_stats_failed'
      };
    }
  }

  // Helper methods for text extraction
  private extractNewsText(article: NewsArticle): string {
    const parts = [
      article.title,
      article.summary,
      `Source: ${article.source}`,
      `Sentiment: ${article.overall_sentiment_label}`,
      article.ticker_sentiment.map(ts => 
        `${ts.ticker}: ${ts.ticker_sentiment_label} (${ts.ticker_sentiment_score.toFixed(2)})`
      ).join(', ')
    ].filter(Boolean);

    return parts.join('\n');
  }

  private extractSignalText(signal: TradingSignal): string {
    const parts = [
      `Trading Signal for ${signal.symbol}`,
      `Action: ${signal.action}`,
      `Confidence: ${(signal.confidence * 100).toFixed(1)}%`,
      `Price: $${signal.price.toFixed(2)}`,
      signal.target_price ? `Target: $${signal.target_price.toFixed(2)}` : '',
      signal.stop_loss ? `Stop Loss: $${signal.stop_loss.toFixed(2)}` : '',
      `Risk Level: ${signal.risk_level}`,
      `Reasoning: ${signal.reasoning}`,
      signal.indicators ? `Indicators: ${JSON.stringify(signal.indicators)}` : ''
    ].filter(Boolean);

    return parts.join('\n');
  }

  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If single sentence is too long, split by words
        if (trimmedSentence.length > maxLength) {
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 <= maxLength) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
  }

  /**
   * Batch embed custom texts
   */
  async embedTexts(texts: string[], batchSize: number = 10): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.embeddings.embedDocuments(batch);
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  }

  /**
   * Embed a single query
   */
  async embedQuery(query: string): Promise<number[]> {
    return await this.embeddings.embedQuery(query);
  }

  /**
   * Calculate similarity between embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    // Cosine similarity
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Get embedding model information
   */
  getModelInfo(): {
    model: string;
    defaultDimension: number;
    supportedTasks: string[];
  } {
    return {
      model: this.defaultModel,
      defaultDimension: 384, // typical for all-MiniLM-L6-v2
      supportedTasks: ['feature-extraction', 'sentence-similarity']
    };
  }
}