/**
 * Trading Q&A Agent
 * Answers financial questions using mock vector search and context retrieval
 */

import { StorageAdapter } from '../../agents/technical-analysis.js';
import { TradingSignal, SignalAction, TimeHorizon } from '../../types/trading-signals.js';
import { 
  FinancialQueryProcessor, 
  ProcessedQuery, 
  createFinancialQueryProcessor 
} from '../nodes/financial-query-processor.js';
import { 
  MockContextRetriever, 
  RetrievedContext, 
  ContextItem,
  createMockContextRetriever 
} from '../nodes/mock-context-retriever.js';

/**
 * Trading answer with full context and reasoning
 */
export interface TradingAnswer {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  reasoning: string[];
  
  // Context and sources
  contextUsed: ContextItem[];
  sources: string[];
  
  // Related data
  relevantSignals?: TradingSignal[];
  relatedTickers?: string[];
  suggestedActions?: string[];
  
  // Answer metadata
  answerType: 'FACTUAL' | 'ANALYTICAL' | 'PREDICTIVE' | 'ADVISORY';
  timestamp: Date;
  processingTime: number;
  
  // Disclaimers and warnings
  disclaimers: string[];
  riskWarnings?: string[];
  
  // Follow-up suggestions
  followUpQuestions?: string[];
}

/**
 * Q&A session for tracking conversation context
 */
export interface QASession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  questions: TradingAnswer[];
  context: {
    focusTickers: string[];
    userRiskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
    timeHorizon?: TimeHorizon;
    portfolioContext?: any;
  };
}

/**
 * Q&A configuration
 */
export interface TradingQAConfig {
  // Answer generation settings
  maxAnswerLength: number;
  includeReasoningSteps: boolean;
  includeDisclamers: boolean;
  enableFollowUpSuggestions: boolean;
  
  // Context settings
  maxContextItems: number;
  contextRelevanceThreshold: number;
  
  // Signal integration
  includeCurrentSignals: boolean;
  signalLookbackDays: number;
  
  // Risk and compliance
  includeRiskWarnings: boolean;
  requireDisclamers: boolean;
  
  // Session management
  sessionTimeoutMinutes: number;
  maxQuestionsPerSession: number;
}

/**
 * Trading Q&A Agent Implementation
 */
export class TradingQAAgent {
  private queryProcessor: FinancialQueryProcessor;
  private contextRetriever: MockContextRetriever;
  private config: Required<TradingQAConfig>;
  private sessions = new Map<string, QASession>();

  constructor(
    private storage: StorageAdapter,
    config: Partial<TradingQAConfig> = {}
  ) {
    this.config = {
      maxAnswerLength: 2000,
      includeReasoningSteps: true,
      includeDisclamers: true,
      enableFollowUpSuggestions: true,
      maxContextItems: 10,
      contextRelevanceThreshold: 0.5,
      includeCurrentSignals: true,
      signalLookbackDays: 7,
      includeRiskWarnings: true,
      requireDisclamers: true,
      sessionTimeoutMinutes: 60,
      maxQuestionsPerSession: 50,
      ...config
    };

    this.queryProcessor = createFinancialQueryProcessor();
    this.contextRetriever = createMockContextRetriever({
      maxContextItems: this.config.maxContextItems,
      minRelevanceScore: this.config.contextRelevanceThreshold
    });
  }

  /**
   * Answer a financial question (main entry point)
   */
  async answerQuestion(
    question: string, 
    sessionId?: string,
    userId?: string
  ): Promise<TradingAnswer> {
    const startTime = Date.now();
    
    console.log(`💬 Processing Q&A: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);

    try {
      // Process the query
      const processedQuery = await this.queryProcessor.processQuery(question);
      
      // Extract ticker from question
      const ticker = this.extractPrimaryTicker(processedQuery);
      
      // Get relevant context using mock vector search
      const questionEmbedding = await this.embedQuestion(processedQuery);
      const vectorContext = await this.storage.vectorSearch(questionEmbedding, 5);
      
      // Get context from retriever
      const retrievedContext = await this.contextRetriever.retrieveContext(processedQuery);
      
      // Get current signals and analysis
      const currentSignals = await this.getCurrentSignals(ticker, processedQuery);
      
      // Generate the answer
      const answer = await this.generateAnswer(
        processedQuery,
        retrievedContext,
        vectorContext,
        currentSignals
      );

      // Update session if provided
      if (sessionId) {
        this.updateSession(sessionId, answer, userId);
      }

      const processingTime = Date.now() - startTime;
      answer.processingTime = processingTime;

      console.log(`✅ Q&A completed in ${processingTime}ms - Confidence: ${answer.confidence.toFixed(2)}`);
      return answer;

    } catch (error) {
      console.error('Error processing question:', error);
      
      // Return fallback answer
      return this.createFallbackAnswer(question, startTime);
    }
  }

  /**
   * Extract primary ticker from processed query
   */
  extractTicker(question: string): string | null {
    const processed = this.queryProcessor.processQuery(question);
    return processed.then(p => this.extractPrimaryTicker(p));
  }

  /**
   * Generate embedding for question (mock implementation)
   */
  async embedQuestion(processedQuery: ProcessedQuery): Promise<number[]> {
    // Generate a mock embedding based on query characteristics
    const dimensions = 384; // Common embedding dimension
    const embedding = new Array(dimensions).fill(0);
    
    // Use query features to generate consistent embedding
    const features = [
      processedQuery.queryType,
      processedQuery.intent,
      ...processedQuery.entities.tickers,
      ...processedQuery.entities.indicators,
      ...processedQuery.entities.timeframes
    ].join('');

    // Generate pseudo-random but consistent values
    let hash = 0;
    for (let i = 0; i < features.length; i++) {
      const char = features.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const random = this.seededRandom(Math.abs(hash));
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = (random() - 0.5) * 2;
    }

    return embedding;
  }

  /**
   * Get current trading signals for ticker
   */
  private async getCurrentSignals(
    ticker: string | null,
    query: ProcessedQuery
  ): Promise<TradingSignal[]> {
    if (!this.config.includeCurrentSignals || !ticker) {
      return [];
    }

    try {
      const signals = await this.storage.select('trading_signals', {
        ticker,
        limit: 5,
        orderBy: 'created_at desc',
        where: {
          created_at: {
            gte: new Date(Date.now() - this.config.signalLookbackDays * 24 * 60 * 60 * 1000)
          }
        }
      });

      return signals || [];
    } catch (error) {
      console.warn(`Failed to fetch signals for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Generate comprehensive answer
   */
  private async generateAnswer(
    query: ProcessedQuery,
    context: RetrievedContext,
    vectorContext: any[],
    signals: TradingSignal[]
  ): Promise<TradingAnswer> {
    const answerId = `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate main answer based on query type and available context
    const mainAnswer = this.generateMainAnswer(query, context, signals);
    
    // Generate reasoning steps
    const reasoning = this.generateReasoning(query, context, signals);
    
    // Calculate confidence
    const confidence = this.calculateAnswerConfidence(query, context, signals);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(query, signals);
    
    // Generate disclaimers and warnings
    const disclaimers = this.generateDisclamers(query);
    const riskWarnings = this.generateRiskWarnings(query, signals);
    
    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUpQuestions(query);

    const answer: TradingAnswer = {
      id: answerId,
      question: query.originalQuery,
      answer: mainAnswer,
      confidence,
      reasoning,
      
      contextUsed: context.contextItems,
      sources: context.sources,
      
      relevantSignals: signals,
      relatedTickers: query.entities.tickers,
      suggestedActions,
      
      answerType: query.expectedAnswerType,
      timestamp: new Date(),
      processingTime: 0, // Will be set by caller
      
      disclaimers,
      riskWarnings,
      followUpQuestions
    };

    return answer;
  }

  /**
   * Generate main answer text
   */
  private generateMainAnswer(
    query: ProcessedQuery,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    const ticker = this.extractPrimaryTicker(query);
    let answer = '';

    switch (query.intent) {
      case 'GET_CURRENT_PRICE':
        answer = this.generatePriceAnswer(ticker, context, signals);
        break;
      
      case 'GET_SIGNAL':
        answer = this.generateSignalAnswer(ticker, context, signals);
        break;
      
      case 'SHOULD_BUY_SELL':
        answer = this.generateActionAnswer(ticker, query, context, signals);
        break;
      
      case 'RISK_ANALYSIS':
        answer = this.generateRiskAnswer(ticker, context, signals);
        break;
      
      case 'PRICE_PREDICTION':
        answer = this.generatePredictionAnswer(ticker, context, signals);
        break;
      
      case 'COMPARE_STOCKS':
        answer = this.generateComparisonAnswer(query.entities.tickers, context, signals);
        break;
      
      case 'TECHNICAL_INDICATORS':
        answer = this.generateTechnicalAnswer(ticker, query, context);
        break;
      
      case 'MARKET_OVERVIEW':
        answer = this.generateMarketAnswer(context);
        break;
      
      default:
        answer = this.generateGeneralAnswer(query, context, signals);
    }

    return answer.substring(0, this.config.maxAnswerLength);
  }

  /**
   * Generate price-related answer
   */
  private generatePriceAnswer(
    ticker: string | null,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (!ticker) {
      return "I need a specific stock ticker to provide current price information. Please specify which stock you're interested in.";
    }

    const signal = signals.find(s => s.ticker === ticker);
    const priceContext = context.contextItems.find(item => 
      item.type === 'MARKET_DATA' || item.type === 'TRADING_SIGNAL'
    );

    let answer = `Based on the latest available data for ${ticker}`;

    if (signal?.currentPrice) {
      answer += `, the current price is approximately $${signal.currentPrice.toFixed(2)}`;
      
      if (signal.priceTargets) {
        answer += `. The moderate price target is $${signal.priceTargets.targets?.moderate?.toFixed(2)}`;
      }
    } else if (priceContext) {
      answer += `, ${priceContext.content}`;
    } else {
      answer += `, I don't have current price data available. Please check a financial data provider for real-time pricing.`;
    }

    return answer;
  }

  /**
   * Generate signal-related answer
   */
  private generateSignalAnswer(
    ticker: string | null,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (!ticker) {
      return "Please specify a stock ticker to get trading signals and recommendations.";
    }

    const signal = signals.find(s => s.ticker === ticker);
    
    if (signal) {
      let answer = `Current trading signal for ${ticker}: ${signal.action}`;
      answer += ` with ${(signal.confidence * 100).toFixed(1)}% confidence.`;
      
      if (signal.reasoning) {
        answer += ` ${signal.reasoning}`;
      }
      
      if (signal.keyFactors && signal.keyFactors.length > 0) {
        answer += ` Key factors: ${signal.keyFactors.slice(0, 3).join(', ')}.`;
      }
      
      return answer;
    }

    const signalContext = context.contextItems.find(item => item.type === 'TRADING_SIGNAL');
    if (signalContext) {
      return `Based on recent analysis: ${signalContext.content}`;
    }

    return `I don't have current trading signals for ${ticker}. Consider looking at technical indicators and recent market trends.`;
  }

  /**
   * Generate action recommendation answer
   */
  private generateActionAnswer(
    ticker: string | null,
    query: ProcessedQuery,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (!ticker) {
      return "I need a specific stock ticker to provide buy/sell recommendations.";
    }

    const signal = signals.find(s => s.ticker === ticker);
    
    let answer = `For ${ticker}, `;
    
    if (signal) {
      switch (signal.action) {
        case 'STRONG_BUY':
        case 'BUY':
          answer += `the current recommendation is to BUY based on ${(signal.confidence * 100).toFixed(1)}% confidence. `;
          break;
        case 'STRONG_SELL':
        case 'SELL':
          answer += `the current recommendation is to SELL based on ${(signal.confidence * 100).toFixed(1)}% confidence. `;
          break;
        default:
          answer += `the current recommendation is to HOLD. `;
      }
      
      if (signal.riskAssessment) {
        answer += `Risk level is assessed as ${signal.riskAssessment.overallRisk}. `;
      }
    } else {
      answer += `I don't have a current trading recommendation. `;
    }

    answer += "Please consider your own risk tolerance and investment goals before making any trading decisions.";
    
    return answer;
  }

  /**
   * Generate risk analysis answer
   */
  private generateRiskAnswer(
    ticker: string | null,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (!ticker) {
      return "Please specify a stock ticker for risk analysis.";
    }

    const signal = signals.find(s => s.ticker === ticker);
    
    if (signal?.riskAssessment) {
      const risk = signal.riskAssessment;
      let answer = `Risk analysis for ${ticker}: Overall risk level is ${risk.overallRisk}`;
      answer += ` with a risk score of ${risk.riskScore}/100. `;
      
      if (risk.warnings.length > 0) {
        answer += `Key risk factors: ${risk.warnings.slice(0, 2).join(', ')}. `;
      }
      
      if (risk.recommendations.length > 0) {
        answer += `Recommended actions: ${risk.recommendations.slice(0, 2).join(', ')}.`;
      }
      
      return answer;
    }

    return `Risk analysis data for ${ticker} is not currently available. Consider factors like volatility, beta, and market conditions.`;
  }

  /**
   * Generate prediction answer
   */
  private generatePredictionAnswer(
    ticker: string | null,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    const disclaimer = "Please note that price predictions are speculative and should not be considered as investment advice.";
    
    if (!ticker) {
      return `I cannot provide price predictions without a specific stock ticker. ${disclaimer}`;
    }

    const signal = signals.find(s => s.ticker === ticker);
    
    if (signal?.targetPrice) {
      let answer = `Based on current analysis, ${ticker} has a target price of $${signal.targetPrice.toFixed(2)}`;
      
      if (signal.timeHorizon) {
        answer += ` for the ${signal.timeHorizon.toLowerCase().replace('_', ' ')} timeframe`;
      }
      
      if (signal.currentPrice) {
        const potential = ((signal.targetPrice - signal.currentPrice) / signal.currentPrice) * 100;
        answer += `, representing a potential ${potential > 0 ? 'upside' : 'downside'} of ${Math.abs(potential).toFixed(1)}%`;
      }
      
      answer += `. ${disclaimer}`;
      return answer;
    }

    return `Price prediction data for ${ticker} is not currently available. ${disclaimer}`;
  }

  /**
   * Generate comparison answer
   */
  private generateComparisonAnswer(
    tickers: string[],
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (tickers.length < 2) {
      return "Please specify at least two stock tickers for comparison.";
    }

    const relevantSignals = signals.filter(s => tickers.includes(s.ticker));
    
    let answer = `Comparing ${tickers.join(' vs ')}: `;
    
    if (relevantSignals.length > 0) {
      const comparisons = relevantSignals.map(signal => 
        `${signal.ticker} has a ${signal.action} signal with ${(signal.confidence * 100).toFixed(1)}% confidence`
      );
      
      answer += comparisons.join(', ') + '. ';
    }

    answer += "Consider factors like financial performance, valuation metrics, and growth prospects when comparing stocks.";
    
    return answer;
  }

  /**
   * Generate technical analysis answer
   */
  private generateTechnicalAnswer(
    ticker: string | null,
    query: ProcessedQuery,
    context: RetrievedContext
  ): string {
    if (!ticker) {
      return "Please specify a stock ticker for technical analysis.";
    }

    const technicalContext = context.contextItems.find(item => 
      item.type === 'TECHNICAL_ANALYSIS' && item.ticker === ticker
    );

    if (technicalContext) {
      return `Technical analysis for ${ticker}: ${technicalContext.content}`;
    }

    const indicators = query.entities.indicators;
    if (indicators.length > 0) {
      return `Technical indicator analysis for ${ticker} focusing on ${indicators.join(', ')} is not currently available. Please check a technical analysis platform for detailed indicator data.`;
    }

    return `Technical analysis data for ${ticker} is not currently available.`;
  }

  /**
   * Generate market overview answer
   */
  private generateMarketAnswer(context: RetrievedContext): string {
    const marketContext = context.contextItems.find(item => 
      item.type === 'MARKET_DATA' || item.ticker === undefined
    );

    if (marketContext) {
      return marketContext.content;
    }

    return "Current market overview data is not available. Please check financial news sources for the latest market conditions.";
  }

  /**
   * Generate general answer
   */
  private generateGeneralAnswer(
    query: ProcessedQuery,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string {
    if (context.contextItems.length > 0) {
      const mostRelevant = context.contextItems[0];
      return `Based on available information: ${mostRelevant.content}`;
    }

    return "I don't have specific information to answer your question. Please try rephrasing or providing more specific details.";
  }

  /**
   * Extract primary ticker from processed query
   */
  private extractPrimaryTicker(query: ProcessedQuery): string | null {
    if (query.entities.tickers.length === 0) return null;
    return query.entities.tickers[0]; // Return first ticker as primary
  }

  /**
   * Generate reasoning steps
   */
  private generateReasoning(
    query: ProcessedQuery,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): string[] {
    if (!this.config.includeReasoningSteps) return [];

    const reasoning: string[] = [];
    
    reasoning.push(`Analyzed query type: ${query.queryType} with intent: ${query.intent}`);
    
    if (query.entities.tickers.length > 0) {
      reasoning.push(`Focused on ticker(s): ${query.entities.tickers.join(', ')}`);
    }
    
    if (context.contextItems.length > 0) {
      reasoning.push(`Retrieved ${context.contextItems.length} relevant context items from ${context.sources.join(', ')}`);
    }
    
    if (signals.length > 0) {
      reasoning.push(`Incorporated ${signals.length} recent trading signal(s)`);
    }
    
    reasoning.push(`Query confidence: ${query.confidence.toFixed(2)}, Context relevance: ${context.averageRelevance.toFixed(2)}`);
    
    return reasoning;
  }

  /**
   * Calculate answer confidence
   */
  private calculateAnswerConfidence(
    query: ProcessedQuery,
    context: RetrievedContext,
    signals: TradingSignal[]
  ): number {
    let confidence = query.confidence * 0.4; // Base from query processing
    
    // Add context quality
    confidence += Math.min(context.averageRelevance * 0.3, 0.3);
    
    // Add signal availability
    if (signals.length > 0) {
      const avgSignalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
      confidence += avgSignalConfidence * 0.2;
    }
    
    // Add context coverage
    confidence += Math.min(context.contextItems.length / 5, 0.1);
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Generate suggested actions
   */
  private generateSuggestedActions(query: ProcessedQuery, signals: TradingSignal[]): string[] {
    const actions: string[] = [];
    
    if (query.entities.tickers.length > 0) {
      actions.push('Monitor price movements and volume');
      actions.push('Check latest news and earnings');
    }
    
    if (signals.length > 0) {
      const signal = signals[0];
      if (signal.suggestedActions) {
        actions.push(...signal.suggestedActions.slice(0, 2));
      }
    }
    
    switch (query.intent) {
      case 'SHOULD_BUY_SELL':
        actions.push('Consider your risk tolerance');
        actions.push('Review your portfolio allocation');
        break;
      case 'RISK_ANALYSIS':
        actions.push('Assess position sizing');
        actions.push('Consider stop-loss levels');
        break;
      case 'PRICE_PREDICTION':
        actions.push('Monitor key support/resistance levels');
        actions.push('Watch for confirmation signals');
        break;
    }
    
    return actions.slice(0, 4); // Limit to 4 actions
  }

  /**
   * Generate disclaimers
   */
  private generateDisclamers(query: ProcessedQuery): string[] {
    if (!this.config.includeDisclamers) return [];

    const disclaimers = [
      'This information is for educational purposes only and should not be considered as financial advice.',
      'Past performance does not guarantee future results.',
      'All investments carry risk of loss.'
    ];

    if (query.expectedAnswerType === 'PREDICTIVE') {
      disclaimers.push('Price predictions are speculative and based on current analysis only.');
    }

    if (query.expectedAnswerType === 'ADVISORY') {
      disclaimers.push('Please consult with a qualified financial advisor before making investment decisions.');
    }

    return disclaimers;
  }

  /**
   * Generate risk warnings
   */
  private generateRiskWarnings(query: ProcessedQuery, signals: TradingSignal[]): string[] | undefined {
    if (!this.config.includeRiskWarnings) return undefined;

    const warnings: string[] = [];
    
    for (const signal of signals) {
      if (signal.riskAssessment?.overallRisk === 'HIGH' || signal.riskAssessment?.overallRisk === 'VERY_HIGH') {
        warnings.push(`${signal.ticker} shows ${signal.riskAssessment.overallRisk} risk level`);
      }
    }
    
    if (query.entities.tickers.length > 0 && query.intent === 'SHOULD_BUY_SELL') {
      warnings.push('Consider position sizing and stop-loss levels');
    }
    
    return warnings.length > 0 ? warnings : undefined;
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(query: ProcessedQuery): string[] | undefined {
    if (!this.config.enableFollowUpSuggestions) return undefined;

    const followUps: string[] = [];
    const ticker = this.extractPrimaryTicker(query);
    
    if (ticker) {
      switch (query.intent) {
        case 'GET_CURRENT_PRICE':
          followUps.push(`What is the trading signal for ${ticker}?`);
          followUps.push(`What are the technical indicators showing for ${ticker}?`);
          break;
        case 'GET_SIGNAL':
          followUps.push(`What is the risk assessment for ${ticker}?`);
          followUps.push(`What are the price targets for ${ticker}?`);
          break;
        case 'SHOULD_BUY_SELL':
          followUps.push(`What is the market sentiment for ${ticker}?`);
          followUps.push(`How does ${ticker} compare to its peers?`);
          break;
      }
    }
    
    // General follow-ups
    followUps.push('What are the current market conditions?');
    followUps.push('What stocks are trending today?');
    
    return followUps.slice(0, 3);
  }

  /**
   * Create fallback answer for errors
   */
  private createFallbackAnswer(question: string, startTime: number): TradingAnswer {
    return {
      id: `fallback-${Date.now()}`,
      question,
      answer: "I'm sorry, I couldn't process your question properly. Please try rephrasing it or asking about a specific stock ticker.",
      confidence: 0.1,
      reasoning: ['Error occurred during processing'],
      contextUsed: [],
      sources: [],
      answerType: 'FACTUAL',
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
      disclaimers: ['This is a fallback response due to processing error']
    };
  }

  /**
   * Update Q&A session
   */
  private updateSession(sessionId: string, answer: TradingAnswer, userId?: string): void {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        questions: [],
        context: {
          focusTickers: [],
          userRiskTolerance: undefined,
          timeHorizon: undefined
        }
      };
    }
    
    session.lastActivity = new Date();
    session.questions.push(answer);
    
    // Update focus tickers
    if (answer.relatedTickers) {
      for (const ticker of answer.relatedTickers) {
        if (!session.context.focusTickers.includes(ticker)) {
          session.context.focusTickers.push(ticker);
        }
      }
      // Keep only last 5 focus tickers
      session.context.focusTickers = session.context.focusTickers.slice(-5);
    }
    
    // Limit questions per session
    if (session.questions.length > this.config.maxQuestionsPerSession) {
      session.questions = session.questions.slice(-this.config.maxQuestionsPerSession);
    }
    
    this.sessions.set(sessionId, session);
  }

  /**
   * Seeded random for consistent embeddings
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): QASession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get Q&A statistics
   */
  getQAStats(): {
    totalQuestions: number;
    averageConfidence: number;
    commonQueryTypes: { [type: string]: number };
    activeSessions: number;
  } {
    let totalQuestions = 0;
    let totalConfidence = 0;
    const queryTypes: { [type: string]: number } = {};
    
    for (const session of this.sessions.values()) {
      totalQuestions += session.questions.length;
      
      for (const question of session.questions) {
        totalConfidence += question.confidence;
        // Would track query types if stored in answer
      }
    }
    
    return {
      totalQuestions,
      averageConfidence: totalQuestions > 0 ? totalConfidence / totalQuestions : 0,
      commonQueryTypes: queryTypes,
      activeSessions: this.sessions.size
    };
  }
}

/**
 * Factory function to create trading Q&A agent
 */
export function createTradingQAAgent(
  storage: StorageAdapter,
  config?: Partial<TradingQAConfig>
): TradingQAAgent {
  return new TradingQAAgent(storage, config);
}

export default TradingQAAgent;