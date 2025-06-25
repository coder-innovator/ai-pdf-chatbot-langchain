/**
 * Retrieval Graph - Financial Q&A System
 * Main export file for the enhanced retrieval graph with financial query capabilities
 */

// Core graph and configuration
export { graph } from './graph.js';
export { AgentStateAnnotation } from './state.js';
export { AgentConfigurationAnnotation, ensureAgentConfiguration } from './configuration.js';
export { formatDocs } from './utils.js';
export { RESPONSE_SYSTEM_PROMPT, ROUTER_SYSTEM_PROMPT } from './prompts.js';

// Financial Query Processing
export {
  FinancialQueryProcessor,
  createFinancialQueryProcessor,
  type ProcessedQuery,
  type QueryType,
  type QueryIntent,
  type FinancialEntities
} from './nodes/financial-query-processor.js';

// Mock Context Retrieval
export {
  MockContextRetriever,
  createMockContextRetriever,
  type ContextItem,
  type RetrievedContext,
  type VectorSearchResult,
  type ContextRetrieverConfig
} from './nodes/mock-context-retriever.js';

// Trading Q&A Agent
export {
  TradingQAAgent,
  createTradingQAAgent,
  type TradingAnswer,
  type QASession,
  type TradingQAConfig
} from './agents/trading-qa.js';

/**
 * Financial Q&A System Factory
 * Creates a complete financial Q&A system with all components
 */
export interface FinancialQASystem {
  queryProcessor: FinancialQueryProcessor;
  contextRetriever: MockContextRetriever;
  qaAgent: TradingQAAgent;
  graph: typeof graph;
}

/**
 * Configuration for the Financial Q&A System
 */
export interface FinancialQASystemConfig {
  // Query processing settings
  queryProcessor?: {
    enableTickerExtraction?: boolean;
    enableDateExtraction?: boolean;
    enableAmountExtraction?: boolean;
    confidenceThreshold?: number;
  };
  
  // Context retrieval settings
  contextRetriever?: {
    maxContextItems?: number;
    minRelevanceScore?: number;
    enableReranking?: boolean;
    vectorDimensions?: number;
  };
  
  // Q&A agent settings
  qaAgent?: {
    maxAnswerLength?: number;
    includeReasoningSteps?: boolean;
    includeDisclamers?: boolean;
    enableFollowUpSuggestions?: boolean;
    includeCurrentSignals?: boolean;
  };
}

/**
 * Create a complete financial Q&A system
 */
export function createFinancialQASystem(
  storage: any, // StorageAdapter interface
  config: FinancialQASystemConfig = {}
): FinancialQASystem {
  console.log('🏗️ Creating Financial Q&A System...');
  
  // Create query processor
  const queryProcessor = createFinancialQueryProcessor(config.queryProcessor);
  
  // Create context retriever
  const contextRetriever = createMockContextRetriever(config.contextRetriever);
  
  // Create Q&A agent
  const qaAgent = createTradingQAAgent(storage, config.qaAgent);
  
  console.log('✅ Financial Q&A System created successfully');
  
  return {
    queryProcessor,
    contextRetriever,
    qaAgent,
    graph
  };
}

/**
 * Quick Q&A utility for simple queries
 */
export async function quickFinancialQA(
  question: string,
  storage: any,
  config: FinancialQASystemConfig = {}
): Promise<TradingAnswer> {
  const system = createFinancialQASystem(storage, config);
  return await system.qaAgent.answerQuestion(question);
}

/**
 * Common query templates for financial questions
 */
export const FinancialQueryTemplates = {
  // Price queries
  getCurrentPrice: (ticker: string) => `What is the current price of ${ticker}?`,
  getPriceTarget: (ticker: string) => `What is the price target for ${ticker}?`,
  
  // Signal queries
  getTradingSignal: (ticker: string) => `What is the trading signal for ${ticker}?`,
  shouldBuy: (ticker: string) => `Should I buy ${ticker}?`,
  shouldSell: (ticker: string) => `Should I sell ${ticker}?`,
  
  // Analysis queries
  getTechnicalAnalysis: (ticker: string) => `What does technical analysis show for ${ticker}?`,
  getRiskAssessment: (ticker: string) => `What is the risk assessment for ${ticker}?`,
  getMarketSentiment: (ticker: string) => `What is the market sentiment for ${ticker}?`,
  
  // Comparison queries
  compareStocks: (ticker1: string, ticker2: string) => `Compare ${ticker1} vs ${ticker2}`,
  
  // General queries
  getMarketOverview: () => 'What are the current market conditions?',
  getTopStocks: () => 'What are the top performing stocks today?',
  getMarketNews: () => 'What is the latest market news?'
};

/**
 * Financial Q&A utilities
 */
export const FinancialQAUtils = {
  /**
   * Extract tickers from a question
   */
  extractTickers: async (question: string): Promise<string[]> => {
    const processor = createFinancialQueryProcessor();
    const processed = await processor.processQuery(question);
    return processed.entities.tickers;
  },

  /**
   * Classify query type
   */
  classifyQuery: async (question: string): Promise<{ type: QueryType; confidence: number }> => {
    const processor = createFinancialQueryProcessor();
    const processed = await processor.processQuery(question);
    return { type: processed.queryType, confidence: processed.confidence };
  },

  /**
   * Check if question is financial
   */
  isFinancialQuery: async (question: string): Promise<boolean> => {
    const processor = createFinancialQueryProcessor();
    try {
      const processed = await processor.processQuery(question);
      return processed.confidence > 0.5 || 
             processed.entities.tickers.length > 0 ||
             ['PRICE_INQUIRY', 'SIGNAL_REQUEST', 'TECHNICAL_ANALYSIS', 'RISK_ASSESSMENT'].includes(processed.queryType);
    } catch {
      return false;
    }
  },

  /**
   * Generate follow-up questions
   */
  generateFollowUps: (answer: TradingAnswer): string[] => {
    return answer.followUpQuestions || [];
  },

  /**
   * Format answer for display
   */
  formatAnswer: (answer: TradingAnswer): string => {
    let formatted = answer.answer;
    
    if (answer.confidence < 0.7) {
      formatted += '\n\n⚠️ Moderate confidence - please verify with additional sources.';
    }
    
    if (answer.suggestedActions?.length) {
      formatted += '\n\n💡 Suggested Actions:\n' + 
        answer.suggestedActions.map(action => `• ${action}`).join('\n');
    }
    
    if (answer.disclaimers?.length) {
      formatted += '\n\n📋 Important:\n' + 
        answer.disclaimers.map(disclaimer => `• ${disclaimer}`).join('\n');
    }
    
    return formatted;
  }
};

/**
 * Demo function to showcase the financial Q&A system
 */
export async function demoFinancialQA(storage: any): Promise<void> {
  console.log('🚀 Financial Q&A System Demo');
  console.log('============================');
  
  const system = createFinancialQASystem(storage);
  
  const sampleQuestions = [
    'What is the current price of AAPL?',
    'Should I buy Tesla stock?',
    'What does technical analysis show for Google?',
    'Compare Apple vs Microsoft',
    'What are the current market conditions?'
  ];
  
  for (const question of sampleQuestions) {
    console.log(`\n❓ Question: ${question}`);
    
    try {
      const answer = await system.qaAgent.answerQuestion(question);
      console.log(`💬 Answer: ${answer.answer.substring(0, 200)}...`);
      console.log(`🎯 Confidence: ${(answer.confidence * 100).toFixed(1)}%`);
      console.log(`📊 Type: ${answer.answerType}`);
      
      if (answer.relatedTickers?.length) {
        console.log(`🏷️ Tickers: ${answer.relatedTickers.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
  
  console.log('\n✅ Demo completed');
}

/**
 * Default export - the enhanced graph with financial capabilities
 */
export default {
  graph,
  createFinancialQASystem,
  quickFinancialQA,
  FinancialQueryTemplates,
  FinancialQAUtils,
  demoFinancialQA
};