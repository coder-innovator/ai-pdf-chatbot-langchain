/**
 * Financial Query Processor Node
 * Processes and analyzes financial questions to extract key information
 */

import { TimeHorizon, SignalAction } from '../../types/trading-signals.js';

/**
 * Query types for financial questions
 */
export type QueryType = 
  | 'PRICE_INQUIRY'
  | 'SIGNAL_REQUEST'
  | 'TECHNICAL_ANALYSIS'
  | 'RISK_ASSESSMENT'
  | 'MARKET_SENTIMENT'
  | 'RECOMMENDATION'
  | 'COMPARISON'
  | 'HISTORICAL_DATA'
  | 'NEWS_ANALYSIS'
  | 'PORTFOLIO_QUESTION'
  | 'GENERAL_MARKET';

/**
 * Query intent for more specific classification
 */
export type QueryIntent = 
  | 'GET_CURRENT_PRICE'
  | 'GET_SIGNAL'
  | 'SHOULD_BUY_SELL'
  | 'RISK_ANALYSIS'
  | 'PRICE_PREDICTION'
  | 'COMPARE_STOCKS'
  | 'MARKET_OVERVIEW'
  | 'NEWS_IMPACT'
  | 'TECHNICAL_INDICATORS'
  | 'PORTFOLIO_ADVICE';

/**
 * Extracted financial entities from query
 */
export interface FinancialEntities {
  tickers: string[];
  timeframes: TimeHorizon[];
  actions: SignalAction[];
  indicators: string[];
  amounts: number[];
  dates: Date[];
  companies: string[];
  sectors: string[];
}

/**
 * Processed query result
 */
export interface ProcessedQuery {
  originalQuery: string;
  cleanedQuery: string;
  queryType: QueryType;
  intent: QueryIntent;
  entities: FinancialEntities;
  confidence: number;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  requiresRealTimeData: boolean;
  requiresHistoricalData: boolean;
  contextRequired: string[];
  expectedAnswerType: 'FACTUAL' | 'ANALYTICAL' | 'PREDICTIVE' | 'ADVISORY';
}

/**
 * Query processing configuration
 */
export interface QueryProcessorConfig {
  // Entity extraction settings
  enableTickerExtraction: boolean;
  enableDateExtraction: boolean;
  enableAmountExtraction: boolean;
  
  // Classification thresholds
  confidenceThreshold: number;
  complexityThreshold: number;
  
  // Context requirements
  maxContextItems: number;
  contextRelevanceThreshold: number;
  
  // Processing limits
  maxQueryLength: number;
  processingTimeoutMs: number;
}

/**
 * Financial Query Processor Node
 */
export class FinancialQueryProcessor {
  private config: Required<QueryProcessorConfig>;
  
  // Common financial terms and patterns
  private readonly TICKER_PATTERNS = [
    /\b[A-Z]{1,5}\b/g,
    /\$[A-Z]{1,5}\b/g,
    /(?:stock|ticker|symbol)\s+([A-Z]{1,5})/gi
  ];
  
  private readonly TIME_PATTERNS = {
    'INTRADAY': /(?:today|intraday|1d|daily)/i,
    'SHORT_TERM': /(?:short.?term|week|1w|5d|few days)/i,
    'MEDIUM_TERM': /(?:medium.?term|month|1m|3m|quarter)/i,
    'LONG_TERM': /(?:long.?term|year|1y|annual|decade)/i
  };
  
  private readonly ACTION_PATTERNS = {
    'BUY': /(?:buy|purchase|long|bullish|invest in)/i,
    'SELL': /(?:sell|short|bearish|dump|exit)/i,
    'HOLD': /(?:hold|keep|maintain|stay)/i
  };
  
  private readonly INDICATOR_PATTERNS = {
    'RSI': /(?:rsi|relative strength)/i,
    'MACD': /(?:macd|moving average convergence)/i,
    'SMA': /(?:sma|simple moving average)/i,
    'EMA': /(?:ema|exponential moving average)/i,
    'BB': /(?:bollinger bands?|bb)/i,
    'volume': /(?:volume|trading volume)/i,
    'support': /(?:support levels?)/i,
    'resistance': /(?:resistance levels?)/i
  };

  constructor(config: Partial<QueryProcessorConfig> = {}) {
    this.config = {
      enableTickerExtraction: true,
      enableDateExtraction: true,
      enableAmountExtraction: true,
      confidenceThreshold: 0.7,
      complexityThreshold: 0.6,
      maxContextItems: 10,
      contextRelevanceThreshold: 0.5,
      maxQueryLength: 1000,
      processingTimeoutMs: 5000,
      ...config
    };
  }

  /**
   * Process a financial query and extract key information
   */
  async processQuery(query: string): Promise<ProcessedQuery> {
    if (query.length > this.config.maxQueryLength) {
      throw new Error(`Query too long: ${query.length} > ${this.config.maxQueryLength}`);
    }

    console.log(`🔍 Processing financial query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

    const cleanedQuery = this.cleanQuery(query);
    const entities = this.extractEntities(cleanedQuery);
    const { queryType, confidence } = this.classifyQuery(cleanedQuery, entities);
    const intent = this.determineIntent(cleanedQuery, queryType, entities);
    const complexity = this.assessComplexity(cleanedQuery, entities);
    const dataRequirements = this.analyzeDataRequirements(cleanedQuery, queryType);
    const contextRequired = this.identifyRequiredContext(cleanedQuery, queryType, entities);
    const expectedAnswerType = this.determineAnswerType(queryType, intent);

    const processed: ProcessedQuery = {
      originalQuery: query,
      cleanedQuery,
      queryType,
      intent,
      entities,
      confidence,
      complexity,
      requiresRealTimeData: dataRequirements.realTime,
      requiresHistoricalData: dataRequirements.historical,
      contextRequired,
      expectedAnswerType
    };

    console.log(`✅ Query processed - Type: ${queryType}, Intent: ${intent}, Confidence: ${confidence.toFixed(2)}`);
    return processed;
  }

  /**
   * Extract ticker symbols from query
   */
  extractTickers(query: string): string[] {
    if (!this.config.enableTickerExtraction) return [];

    const tickers = new Set<string>();
    
    // Try each ticker pattern
    for (const pattern of this.TICKER_PATTERNS) {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace('$', '').toUpperCase();
          // Basic validation - common tickers are 1-5 characters
          if (cleaned.length >= 1 && cleaned.length <= 5 && /^[A-Z]+$/.test(cleaned)) {
            // Filter out common English words that might match ticker pattern
            if (!this.isCommonWord(cleaned)) {
              tickers.add(cleaned);
            }
          }
        });
      }
    }

    // Check for company names that might map to tickers
    const companyTickers = this.extractCompanyTickers(query);
    companyTickers.forEach(ticker => tickers.add(ticker));

    return Array.from(tickers);
  }

  /**
   * Determine the primary intent of the query
   */
  private determineIntent(query: string, queryType: QueryType, entities: FinancialEntities): QueryIntent {
    const lowerQuery = query.toLowerCase();

    // Price-related intents
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('value')) {
      if (lowerQuery.includes('current') || lowerQuery.includes('now')) {
        return 'GET_CURRENT_PRICE';
      }
      if (lowerQuery.includes('predict') || lowerQuery.includes('forecast') || lowerQuery.includes('target')) {
        return 'PRICE_PREDICTION';
      }
    }

    // Trading action intents
    if (lowerQuery.match(/(?:should i|can i|recommend|advice)/)) {
      if (entities.actions.length > 0) {
        return 'SHOULD_BUY_SELL';
      }
      return 'PORTFOLIO_ADVICE';
    }

    // Signal and recommendation intents
    if (lowerQuery.match(/(?:signal|recommendation|rating|outlook)/)) {
      return 'GET_SIGNAL';
    }

    // Risk-related intents
    if (lowerQuery.match(/(?:risk|safe|dangerous|volatile)/)) {
      return 'RISK_ANALYSIS';
    }

    // Comparison intents
    if (lowerQuery.match(/(?:compare|versus|vs|better|best|worst)/) || entities.tickers.length > 1) {
      return 'COMPARE_STOCKS';
    }

    // Technical analysis intents
    if (entities.indicators.length > 0 || lowerQuery.match(/(?:technical|chart|pattern)/)) {
      return 'TECHNICAL_INDICATORS';
    }

    // News and market intents
    if (lowerQuery.match(/(?:news|market|sentiment|overview)/)) {
      if (lowerQuery.includes('market') && !entities.tickers.length) {
        return 'MARKET_OVERVIEW';
      }
      return 'NEWS_IMPACT';
    }

    // Default fallback based on query type
    switch (queryType) {
      case 'PRICE_INQUIRY': return 'GET_CURRENT_PRICE';
      case 'SIGNAL_REQUEST': return 'GET_SIGNAL';
      case 'TECHNICAL_ANALYSIS': return 'TECHNICAL_INDICATORS';
      case 'RISK_ASSESSMENT': return 'RISK_ANALYSIS';
      case 'RECOMMENDATION': return 'SHOULD_BUY_SELL';
      case 'COMPARISON': return 'COMPARE_STOCKS';
      case 'MARKET_SENTIMENT': return 'MARKET_OVERVIEW';
      default: return 'GET_SIGNAL';
    }
  }

  /**
   * Clean and normalize the query
   */
  private cleanQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s$.,?!-]/g, '')
      .toLowerCase();
  }

  /**
   * Extract financial entities from the query
   */
  private extractEntities(query: string): FinancialEntities {
    const entities: FinancialEntities = {
      tickers: this.extractTickers(query),
      timeframes: this.extractTimeframes(query),
      actions: this.extractActions(query),
      indicators: this.extractIndicators(query),
      amounts: this.extractAmounts(query),
      dates: this.extractDates(query),
      companies: this.extractCompanies(query),
      sectors: this.extractSectors(query)
    };

    return entities;
  }

  /**
   * Classify the query type
   */
  private classifyQuery(query: string, entities: FinancialEntities): { queryType: QueryType; confidence: number } {
    const patterns = {
      'PRICE_INQUIRY': [
        /(?:price|cost|value|worth)/i,
        /(?:how much|what.*cost)/i,
        /(?:\$|dollar|usd)/i
      ],
      'SIGNAL_REQUEST': [
        /(?:signal|buy|sell|hold|recommendation)/i,
        /(?:should i|what.*do|advice)/i,
        /(?:rating|outlook|opinion)/i
      ],
      'TECHNICAL_ANALYSIS': [
        /(?:technical|chart|pattern|indicator)/i,
        /(?:rsi|macd|moving average|bollinger)/i,
        /(?:support|resistance|trend)/i
      ],
      'RISK_ASSESSMENT': [
        /(?:risk|safe|dangerous|volatile|volatility)/i,
        /(?:drawdown|beta|sharpe)/i
      ],
      'MARKET_SENTIMENT': [
        /(?:sentiment|mood|feeling|opinion)/i,
        /(?:bullish|bearish|optimistic|pessimistic)/i,
        /(?:news|headlines|events)/i
      ],
      'RECOMMENDATION': [
        /(?:recommend|suggest|advice|guidance)/i,
        /(?:portfolio|allocation|diversif)/i
      ],
      'COMPARISON': [
        /(?:compare|versus|vs|better|best|worst)/i,
        /(?:difference|similar|alternative)/i
      ],
      'HISTORICAL_DATA': [
        /(?:historical|history|past|previous)/i,
        /(?:performance|return|chart)/i
      ]
    };

    let bestMatch: QueryType = 'GENERAL_MARKET';
    let bestScore = 0;

    for (const [type, typePatterns] of Object.entries(patterns)) {
      let score = 0;
      for (const pattern of typePatterns) {
        if (pattern.test(query)) {
          score += 1;
        }
      }
      
      // Boost score based on entity matches
      if (type === 'TECHNICAL_ANALYSIS' && entities.indicators.length > 0) score += 2;
      if (type === 'COMPARISON' && entities.tickers.length > 1) score += 2;
      if (type === 'SIGNAL_REQUEST' && entities.actions.length > 0) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = type as QueryType;
      }
    }

    const confidence = Math.min(bestScore / 3, 1.0); // Normalize to 0-1
    return { queryType: bestMatch, confidence };
  }

  /**
   * Extract timeframes from query
   */
  private extractTimeframes(query: string): TimeHorizon[] {
    const timeframes: TimeHorizon[] = [];
    
    for (const [timeframe, pattern] of Object.entries(this.TIME_PATTERNS)) {
      if (pattern.test(query)) {
        timeframes.push(timeframe as TimeHorizon);
      }
    }

    return timeframes;
  }

  /**
   * Extract trading actions from query
   */
  private extractActions(query: string): SignalAction[] {
    const actions: SignalAction[] = [];
    
    for (const [action, pattern] of Object.entries(this.ACTION_PATTERNS)) {
      if (pattern.test(query)) {
        actions.push(action as SignalAction);
      }
    }

    return actions;
  }

  /**
   * Extract technical indicators from query
   */
  private extractIndicators(query: string): string[] {
    const indicators: string[] = [];
    
    for (const [indicator, pattern] of Object.entries(this.INDICATOR_PATTERNS)) {
      if (pattern.test(query)) {
        indicators.push(indicator);
      }
    }

    return indicators;
  }

  /**
   * Extract monetary amounts from query
   */
  private extractAmounts(query: string): number[] {
    if (!this.config.enableAmountExtraction) return [];

    const amounts: number[] = [];
    const patterns = [
      /\$[\d,]+(?:\.\d+)?/g,
      /(?:\$|dollar|usd)\s*([\d,]+(?:\.\d+)?)/gi,
      /([\d,]+(?:\.\d+)?)\s*(?:dollar|usd|\$)/gi
    ];

    for (const pattern of patterns) {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const numStr = match.replace(/[^\d.]/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num) && num > 0) {
            amounts.push(num);
          }
        });
      }
    }

    return amounts;
  }

  /**
   * Extract dates from query
   */
  private extractDates(query: string): Date[] {
    if (!this.config.enableDateExtraction) return [];

    const dates: Date[] = [];
    const today = new Date();
    
    // Simple date extraction - could be enhanced with more sophisticated NLP
    if (query.includes('today')) {
      dates.push(today);
    }
    if (query.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dates.push(yesterday);
    }

    return dates;
  }

  /**
   * Extract company names from query
   */
  private extractCompanies(query: string): string[] {
    // Simple company name extraction - could be enhanced with NER
    const commonCompanies = {
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'netflix': 'NFLX',
      'facebook': 'META',
      'meta': 'META'
    };

    const companies: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [company, ticker] of Object.entries(commonCompanies)) {
      if (lowerQuery.includes(company)) {
        companies.push(company);
      }
    }

    return companies;
  }

  /**
   * Extract company tickers from company names
   */
  private extractCompanyTickers(query: string): string[] {
    const commonCompanies = {
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'netflix': 'NFLX',
      'facebook': 'META',
      'meta': 'META'
    };

    const tickers: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [company, ticker] of Object.entries(commonCompanies)) {
      if (lowerQuery.includes(company)) {
        tickers.push(ticker);
      }
    }

    return tickers;
  }

  /**
   * Extract sectors from query
   */
  private extractSectors(query: string): string[] {
    const sectors = [
      'technology', 'healthcare', 'financial', 'energy', 'consumer',
      'industrial', 'materials', 'utilities', 'real estate', 'telecommunications'
    ];

    const foundSectors: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const sector of sectors) {
      if (lowerQuery.includes(sector)) {
        foundSectors.push(sector);
      }
    }

    return foundSectors;
  }

  /**
   * Assess query complexity
   */
  private assessComplexity(query: string, entities: FinancialEntities): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    let complexityScore = 0;

    // Length factor
    if (query.length > 100) complexityScore += 1;
    if (query.length > 200) complexityScore += 1;

    // Entity count factor
    const totalEntities = entities.tickers.length + entities.indicators.length + 
                         entities.timeframes.length + entities.actions.length;
    if (totalEntities > 2) complexityScore += 1;
    if (totalEntities > 5) complexityScore += 1;

    // Multiple tickers = comparison complexity
    if (entities.tickers.length > 1) complexityScore += 1;

    // Technical indicators add complexity
    if (entities.indicators.length > 2) complexityScore += 1;

    // Question complexity keywords
    const complexKeywords = ['compare', 'analyze', 'forecast', 'predict', 'strategy', 'portfolio'];
    if (complexKeywords.some(keyword => query.toLowerCase().includes(keyword))) {
      complexityScore += 1;
    }

    if (complexityScore >= 4) return 'COMPLEX';
    if (complexityScore >= 2) return 'MODERATE';
    return 'SIMPLE';
  }

  /**
   * Analyze data requirements
   */
  private analyzeDataRequirements(query: string, queryType: QueryType): {
    realTime: boolean;
    historical: boolean;
  } {
    const lowerQuery = query.toLowerCase();
    
    const realTimeKeywords = ['current', 'now', 'today', 'live', 'real-time'];
    const historicalKeywords = ['historical', 'past', 'trend', 'performance', 'chart'];

    const requiresRealTime = realTimeKeywords.some(keyword => lowerQuery.includes(keyword)) ||
                            queryType === 'PRICE_INQUIRY' ||
                            queryType === 'SIGNAL_REQUEST';

    const requiresHistorical = historicalKeywords.some(keyword => lowerQuery.includes(keyword)) ||
                              queryType === 'TECHNICAL_ANALYSIS' ||
                              queryType === 'HISTORICAL_DATA' ||
                              queryType === 'COMPARISON';

    return {
      realTime: requiresRealTime,
      historical: requiresHistorical
    };
  }

  /**
   * Identify required context for answering the query
   */
  private identifyRequiredContext(query: string, queryType: QueryType, entities: FinancialEntities): string[] {
    const context: string[] = [];

    // Add ticker-specific context
    if (entities.tickers.length > 0) {
      context.push('current_price', 'trading_signals', 'technical_analysis');
    }

    // Add context based on query type
    switch (queryType) {
      case 'TECHNICAL_ANALYSIS':
        context.push('technical_indicators', 'chart_patterns', 'support_resistance');
        break;
      case 'RISK_ASSESSMENT':
        context.push('risk_metrics', 'volatility_data', 'beta_correlation');
        break;
      case 'MARKET_SENTIMENT':
        context.push('news_sentiment', 'social_sentiment', 'analyst_opinions');
        break;
      case 'RECOMMENDATION':
        context.push('analyst_ratings', 'price_targets', 'investment_recommendations');
        break;
      case 'COMPARISON':
        context.push('comparative_metrics', 'peer_analysis', 'sector_performance');
        break;
      case 'HISTORICAL_DATA':
        context.push('price_history', 'performance_metrics', 'historical_patterns');
        break;
    }

    // Add indicator-specific context
    if (entities.indicators.length > 0) {
      context.push('technical_indicators');
    }

    return [...new Set(context)]; // Remove duplicates
  }

  /**
   * Determine expected answer type
   */
  private determineAnswerType(queryType: QueryType, intent: QueryIntent): 'FACTUAL' | 'ANALYTICAL' | 'PREDICTIVE' | 'ADVISORY' {
    // Predictive answers
    if (intent === 'PRICE_PREDICTION' || queryType === 'RECOMMENDATION') {
      return 'PREDICTIVE';
    }

    // Advisory answers
    if (intent === 'SHOULD_BUY_SELL' || intent === 'PORTFOLIO_ADVICE' || intent === 'GET_SIGNAL') {
      return 'ADVISORY';
    }

    // Analytical answers
    if (queryType === 'TECHNICAL_ANALYSIS' || queryType === 'RISK_ASSESSMENT' || 
        queryType === 'COMPARISON' || intent === 'COMPARE_STOCKS') {
      return 'ANALYTICAL';
    }

    // Factual answers (default)
    return 'FACTUAL';
  }

  /**
   * Check if a word is a common English word (to filter out false ticker matches)
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
      'OUR', 'HAD', 'BUT', 'HAS', 'HIS', 'HIM', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD',
      'SEE', 'TWO', 'WHO', 'BOY', 'DID', 'GET', 'LET', 'SAY', 'SHE', 'TOO', 'USE'
    ]);
    return commonWords.has(word.toUpperCase());
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    queriesProcessed: number;
    averageProcessingTime: number;
    commonQueryTypes: { [type: string]: number };
  } {
    // Mock statistics - in real implementation would track actual metrics
    return {
      queriesProcessed: 0,
      averageProcessingTime: 0,
      commonQueryTypes: {}
    };
  }
}

/**
 * Factory function to create financial query processor
 */
export function createFinancialQueryProcessor(config?: Partial<QueryProcessorConfig>): FinancialQueryProcessor {
  return new FinancialQueryProcessor(config);
}

export default FinancialQueryProcessor;