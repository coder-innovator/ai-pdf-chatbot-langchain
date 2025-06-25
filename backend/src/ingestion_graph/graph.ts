/**
 * Enhanced ingestion graph with financial data processing capabilities
 * Supports both document indexing and financial market data ingestion
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import * as fs from 'fs/promises';

import { IndexStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import {
  ensureIndexConfiguration,
  IndexConfigurationAnnotation,
} from './configuration.js';
import { reduceDocs } from '../shared/state.js';

// Import financial processing nodes
import { MarketDataProcessor } from './nodes/market-data-processor.js';
import { FinancialEmbedder } from './nodes/financial-embedder.js';
import { MockStorageIngester } from './nodes/mock-storage-ingester.js';
import { 
  Quote, 
  NewsArticle, 
  TradingSignal, 
  Ticker 
} from '../types/index.js';

// Import sentiment analysis capabilities
import { 
  createSentimentAnalysisAgent,
  SentimentAnalysisAgent 
} from '../agents/sentiment-analysis.js';
import { 
  createNewsImpactAnalyzer,
  NewsImpactAnalyzer 
} from '../agents/news-impact-analyzer.js';
import { 
  createMockNewsProvider,
  MockNewsProvider 
} from '../services/mock-news-provider.js';
import { 
  NewsItem,
  SentimentAnalysis 
} from '../utils/sentiment-calculator.js';

/**
 * Enhanced state that supports both documents and financial data
 */
const EnhancedIngestionState = Annotation.Root({
  // Document processing (existing)
  docs: Annotation<
    import('@langchain/core/documents').Document[],
    import('@langchain/core/documents').Document[] | { [key: string]: unknown }[] | string[] | string | 'delete'
  >({
    default: () => [],
    reducer: reduceDocs,
  }),
  
  // Financial data processing (new)
  symbols: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  financialData: Annotation<{
    quotes: Quote[];
    news: NewsArticle[];
    signals: TradingSignal[];
    tickers: Ticker[];
  }>({
    reducer: (x, y) => y ?? x ?? {
      quotes: [],
      news: [],
      signals: [],
      tickers: []
    },
  }),
  embeddings: Annotation<Array<{
    id: string;
    embedding: number[];
    text: string;
    type: 'news' | 'signal' | 'custom';
    metadata: any;
  }>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Sentiment analysis data
  newsItems: Annotation<NewsItem[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  sentimentAnalysis: Annotation<{ [ticker: string]: SentimentAnalysis }>({
    reducer: (x, y) => y ?? x ?? {},
  }),
  newsImpact: Annotation<any>({
    reducer: (x, y) => y ?? x ?? null,
  }),
  processingMode: Annotation<'documents' | 'financial' | 'both'>({
    reducer: (x, y) => y ?? x ?? 'documents',
  }),
  ingestionResults: Annotation<{
    documents: { successful: number; failed: number };
    financial: { successful: number; failed: number };
  }>({
    reducer: (x, y) => y ?? x ?? {
      documents: { successful: 0, failed: 0 },
      financial: { successful: 0, failed: 0 }
    },
  }),
});

type EnhancedIngestionStateType = typeof EnhancedIngestionState.State;

// Initialize financial processing services
const marketDataProcessor = new MarketDataProcessor();
const financialEmbedder = new FinancialEmbedder();
const storageIngester = new MockStorageIngester();

// Initialize sentiment analysis services
const mockNewsProvider = createMockNewsProvider();

// Mock storage adapter for sentiment analysis
const mockStorageAdapter = {
  async select(table: string, options: any) {
    if (table === 'news_sentiment') {
      const ticker = options.ticker;
      const limit = options.limit || 50;
      
      // Generate mock news data
      const newsItems = mockNewsProvider.generateNewsForTicker(ticker, {
        daysBack: 7,
        articlesPerDay: Math.floor(limit / 7),
        sentimentBias: 'mixed'
      });
      
      return newsItems;
    }
    return [];
  },
  async insert(table: string, data: any) { /* Mock implementation */ },
  async update(table: string, id: string, data: any) { /* Mock implementation */ },
  async delete(table: string, id: string) { /* Mock implementation */ }
};

const sentimentAgent = createSentimentAnalysisAgent(mockStorageAdapter);
const newsImpactAnalyzer = createNewsImpactAnalyzer(mockStorageAdapter);

async function ingestDocs(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  if (!config) {
    throw new Error('Configuration required to run index_docs.');
  }

  const configuration = ensureIndexConfiguration(config);
  let docs = state.docs;

  if (!docs || docs.length === 0) {
    if (configuration.useSampleDocs) {
      const fileContent = await fs.readFile(configuration.docsFile, 'utf-8');
      const serializedDocs = JSON.parse(fileContent);
      docs = reduceDocs([], serializedDocs);
    } else {
      throw new Error('No sample documents to index.');
    }
  } else {
    docs = reduceDocs([], docs);
  }

  const retriever = await makeRetriever(config);
  await retriever.addDocuments(docs);

  return { 
    docs: 'delete' as any,
    ingestionResults: {
      ...state.ingestionResults,
      documents: { successful: docs.length, failed: 0 }
    }
  };
}

/**
 * Process financial market data
 */
async function processFinancialData(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  try {
    console.log(`Processing financial data for symbols: ${state.symbols.join(', ')}`);
    
    // Fetch and process market data
    const marketDataResult = await marketDataProcessor.processMarketData({
      symbols: state.symbols,
      dataTypes: ['quotes', 'news', 'tickers']
    });

    return {
      financialData: {
        quotes: marketDataResult.quotes,
        news: marketDataResult.news,
        signals: marketDataResult.signals,
        tickers: marketDataResult.tickers
      }
    };
  } catch (error) {
    console.error('Financial data processing failed:', error);
    return {
      ingestionResults: {
        ...state.ingestionResults,
        financial: { successful: 0, failed: state.symbols.length }
      }
    };
  }
}

/**
 * Generate embeddings for financial content
 */
async function generateFinancialEmbeddings(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  try {
    console.log('Generating embeddings for financial content');
    
    const embeddingResult = await financialEmbedder.generateFinancialEmbeddings({
      newsArticles: state.financialData.news,
      tradingSignals: state.financialData.signals
    });

    return {
      embeddings: embeddingResult.embeddings
    };
  } catch (error) {
    console.error('Financial embedding generation failed:', error);
    return { embeddings: [] };
  }
}

/**
 * Generate news sentiment analysis
 */
async function analyzeSentiment(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  try {
    console.log('Analyzing sentiment for symbols:', state.symbols);
    
    const sentimentResults: { [ticker: string]: SentimentAnalysis } = {};
    
    // Analyze sentiment for each symbol
    for (const symbol of state.symbols) {
      try {
        const analysis = await sentimentAgent.analyzeSentiment(symbol);
        sentimentResults[symbol] = analysis;
        console.log(`Sentiment for ${symbol}: ${analysis.sentimentLabel} (${analysis.sentimentScore.toFixed(3)})`);
      } catch (error) {
        console.warn(`Failed to analyze sentiment for ${symbol}:`, error);
      }
    }
    
    return {
      sentimentAnalysis: sentimentResults
    };
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return { sentimentAnalysis: {} };
  }
}

/**
 * Analyze news impact on market movements
 */
async function analyzeNewsImpact(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  try {
    console.log('Analyzing news impact for symbols:', state.symbols);
    
    const impactResults: any = {};
    
    for (const symbol of state.symbols) {
      try {
        const impact = await newsImpactAnalyzer.analyzeTickerNewsImpact(symbol, '7d');
        impactResults[symbol] = impact;
        console.log(`News impact for ${symbol}: ${impact.averageImpact} (${impact.totalNewsCount} articles)`);
      } catch (error) {
        console.warn(`Failed to analyze news impact for ${symbol}:`, error);
      }
    }
    
    return {
      newsImpact: impactResults
    };
  } catch (error) {
    console.error('News impact analysis failed:', error);
    return { newsImpact: {} };
  }
}

/**
 * Store financial data and embeddings
 */
async function storeFinancialData(
  state: EnhancedIngestionStateType,
  config?: RunnableConfig,
): Promise<Partial<EnhancedIngestionStateType>> {
  try {
    console.log('Storing financial data to mock storage');
    
    const storageResult = await storageIngester.ingestFinancialData({
      quotes: state.financialData.quotes,
      newsArticles: state.financialData.news,
      tradingSignals: state.financialData.signals,
      tickers: state.financialData.tickers,
      embeddings: state.embeddings
    });

    const results = storageResult.results;
    const totalSuccessful = results.quotes.successful + results.news.successful + 
                           results.signals.successful + results.tickers.successful + 
                           results.embeddings.successful;
    const totalFailed = results.quotes.failed + results.news.failed + 
                       results.signals.failed + results.tickers.failed + 
                       results.embeddings.failed;

    // Log sentiment and news impact results
    if (Object.keys(state.sentimentAnalysis).length > 0) {
      console.log('\nSentiment Analysis Results:');
      for (const [symbol, analysis] of Object.entries(state.sentimentAnalysis)) {
        console.log(`  ${symbol}: ${analysis.sentimentLabel} (${analysis.confidence.toFixed(2)} confidence)`);
        console.log(`    Impact: ${analysis.impact}, News Count: ${analysis.newsCount}`);
        console.log(`    Summary: ${analysis.summary}`);
      }
    }

    if (state.newsImpact && Object.keys(state.newsImpact).length > 0) {
      console.log('\nNews Impact Analysis Results:');
      for (const [symbol, impact] of Object.entries(state.newsImpact)) {
        console.log(`  ${symbol}: ${impact.averageImpact} impact`);
        console.log(`    Articles: ${impact.totalNewsCount}, Impactful: ${impact.impactfulNewsCount}`);
        console.log(`    Price Correlation: ${impact.priceCorrelation.toFixed(3)}`);
      }
    }

    return {
      ingestionResults: {
        ...state.ingestionResults,
        financial: { successful: totalSuccessful, failed: totalFailed }
      }
    };
  } catch (error) {
    console.error('Financial data storage failed:', error);
    return {
      ingestionResults: {
        ...state.ingestionResults,
        financial: { successful: 0, failed: 1 }
      }
    };
  }
}

/**
 * Route based on processing mode
 */
function routeProcessingMode(state: EnhancedIngestionStateType): string {
  switch (state.processingMode) {
    case 'documents':
      return 'ingestDocs';
    case 'financial':
      return 'processFinancialData';
    case 'both':
      return 'ingestDocs'; // Process documents first, then financial
    default:
      return 'ingestDocs';
  }
}

/**
 * Continue to financial processing after documents
 */
function shouldProcessFinancial(state: EnhancedIngestionStateType): string {
  if (state.processingMode === 'both' || state.processingMode === 'financial') {
    return 'processFinancialData';
  }
  return END;
}

// Define the enhanced graph with financial processing capabilities
const enhancedBuilder = new StateGraph(
  EnhancedIngestionState,
  IndexConfigurationAnnotation,
)
  .addNode('routeProcessingMode', (state: EnhancedIngestionStateType) => state)
  .addNode('ingestDocs', ingestDocs)
  .addNode('processFinancialData', processFinancialData)
  .addNode('generateFinancialEmbeddings', generateFinancialEmbeddings)
  .addNode('analyzeSentiment', analyzeSentiment)
  .addNode('analyzeNewsImpact', analyzeNewsImpact)
  .addNode('storeFinancialData', storeFinancialData)
  .addEdge(START, 'routeProcessingMode')
  .addConditionalEdges(
    'routeProcessingMode',
    routeProcessingMode,
    {
      'ingestDocs': 'ingestDocs',
      'processFinancialData': 'processFinancialData'
    }
  )
  .addConditionalEdges(
    'ingestDocs',
    shouldProcessFinancial,
    {
      'processFinancialData': 'processFinancialData'
    }
  )
  .addEdge('processFinancialData', 'generateFinancialEmbeddings')
  .addEdge('generateFinancialEmbeddings', 'analyzeSentiment')
  .addEdge('analyzeSentiment', 'analyzeNewsImpact')
  .addEdge('analyzeNewsImpact', 'storeFinancialData')
  .addEdge('storeFinancialData', END);

// Legacy graph for backward compatibility
const legacyBuilder = new StateGraph(
  IndexStateAnnotation,
  IndexConfigurationAnnotation,
)
  .addNode('ingestDocs', async (state, config) => {
    const result = await ingestDocs(state as any, config);
    return { docs: result.docs as any };
  })
  .addEdge(START, 'ingestDocs')
  .addEdge('ingestDocs', END);

// Compile graphs
export const enhancedGraph = enhancedBuilder
  .compile()
  .withConfig({ runName: 'EnhancedIngestionGraph' });

export const graph = legacyBuilder
  .compile()
  .withConfig({ runName: 'IngestionGraph' });

// Export both for different use cases
export { EnhancedIngestionState, EnhancedIngestionStateType };
