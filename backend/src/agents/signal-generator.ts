/**
 * Signal Generator Agent
 * Main orchestrator that combines technical analysis, sentiment analysis, and risk assessment
 * to generate comprehensive trading signals with vector search for pattern matching
 */

import {
  TradingSignal,
  SignalAction,
  SignalStrength,
  TimeHorizon,
  RiskLevel,
  TechnicalContributions,
  SentimentContributions,
  RiskAssessment,
  MarketContext,
  PatternMatch,
  PriceTargets,
  ConfidenceFactors,
  SignalRequest,
  BatchSignalResult,
  MultiTimeframeSignal,
  SignalConfig
} from '../types/trading-signals.js';

import { TechnicalAnalysisAgent, TechnicalAnalysis, StorageAdapter } from './technical-analysis.js';
import { SentimentAnalysisAgent } from './sentiment-analysis.js';
import { SentimentAnalysis } from '../utils/sentiment-calculator.js';
import { RiskAnalyzer } from './risk-analyzer.js';
import { RecommendationEngine, InvestmentRecommendation } from './recommendation-engine.js';

import {
  calculateSignalConfidence,
  analyzeSignalAgreement,
  generateConfidenceBreakdown,
  validateSignalConfidence,
  calculateDynamicThresholds,
  DEFAULT_CONFIDENCE_CONFIG
} from '../utils/signal-confidence.js';

import { MarketDataPoint } from '../utils/technical-calculations.js';

/**
 * Signal generation context for vector embeddings
 */
export interface SignalContext {
  ticker: string;
  technical: TechnicalAnalysis;
  sentiment: SentimentAnalysis;
  risk: RiskAssessment;
  marketConditions: MarketContext;
  priceAction: {
    trend: string;
    momentum: string;
    volatility: number;
    volume: string;
  };
}

/**
 * Historical pattern for similarity matching
 */
export interface HistoricalPattern {
  id: string;
  ticker: string;
  timestamp: Date;
  context: SignalContext;
  signal: TradingSignal;
  outcome: {
    actualReturn: number;
    timeToTarget: number;
    success: boolean;
  };
  embedding: number[];
}

/**
 * Vector search result for pattern matching
 */
export interface SimilarPattern {
  pattern: HistoricalPattern;
  similarity: number;
  relevance: number;
  weight: number;
}

/**
 * Signal generation statistics
 */
export interface SignalStats {
  totalGenerated: number;
  averageConfidence: number;
  successRate: number;
  distributionByAction: { [action in SignalAction]: number };
  distributionByRisk: { [risk in RiskLevel]: number };
  processingTime: number;
  lastUpdated: Date;
}

/**
 * Signal Generator Agent Class
 */
export class SignalGeneratorAgent {
  private technicalAgent: TechnicalAnalysisAgent;
  private sentimentAgent: SentimentAnalysisAgent;
  private riskAnalyzer: RiskAnalyzer;
  private recommendationEngine: RecommendationEngine;
  private storage: StorageAdapter;
  private config: SignalConfig;
  private stats: SignalStats;

  constructor(
    technicalAgent: TechnicalAnalysisAgent,
    sentimentAgent: SentimentAnalysisAgent,
    storage: StorageAdapter,
    config: Partial<SignalConfig> = {}
  ) {
    this.technicalAgent = technicalAgent;
    this.sentimentAgent = sentimentAgent;
    this.storage = storage;
    this.riskAnalyzer = new RiskAnalyzer(storage);
    this.recommendationEngine = new RecommendationEngine(storage);
    
    this.config = {
      weights: {
        technical: 0.35,
        sentiment: 0.25,
        fundamental: 0.15,
        pattern: 0.25,
        ...config.weights
      },
      thresholds: {
        minimumConfidence: 0.6,
        strongSignalThreshold: 0.8,
        riskAdjustment: 0.1,
        ...config.thresholds
      },
      features: {
        usePatternMatching: true,
        useVectorSearch: true,
        useBacktesting: true,
        useRealTimeData: true,
        ...config.features
      },
      timeouts: {
        analysisTimeout: 30000, // 30 seconds
        dataFetchTimeout: 10000, // 10 seconds
        ...config.timeouts
      }
    };

    this.stats = {
      totalGenerated: 0,
      averageConfidence: 0,
      successRate: 0,
      distributionByAction: {
        'STRONG_BUY': 0, 'BUY': 0, 'HOLD': 0, 'SELL': 0, 'STRONG_SELL': 0, 'WATCH': 0
      },
      distributionByRisk: {
        'VERY_LOW': 0, 'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'VERY_HIGH': 0
      },
      processingTime: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate comprehensive trading signal for a ticker
   */
  async generateSignal(
    ticker: string,
    request: Partial<SignalRequest> = {}
  ): Promise<TradingSignal> {
    const startTime = Date.now();
    
    try {
      console.log(`Generating signal for ${ticker}...`);
      
      // Set default request parameters
      const signalRequest: SignalRequest = {
        ticker,
        timeHorizon: request.timeHorizon || 'MEDIUM_TERM',
        riskTolerance: request.riskTolerance || 'MEDIUM',
        analysisDepth: request.analysisDepth || 'STANDARD',
        includePatterns: request.includePatterns ?? this.config.features.usePatternMatching,
        includeBacktest: request.includeBacktest ?? this.config.features.useBacktesting,
        customWeights: request.customWeights || this.config.weights
      };

      // Step 1: Get analysis from individual agents
      const [technical, sentiment] = await Promise.all([
        this.technicalAgent.analyzeStock(ticker),
        this.sentimentAgent.analyzeSentiment(ticker)
      ]);

      // Step 2: Perform risk analysis
      const riskAssessment = await this.riskAnalyzer.analyzeSignalRisk(
        ticker,
        {},
        technical,
        sentiment
      );

      // Step 3: Create market context
      const marketContext = this.createMarketContext(technical, sentiment);

      // Step 4: Find similar historical patterns using vector search
      const similarPatterns = signalRequest.includePatterns ? 
        await this.findSimilarPatterns(ticker, technical, sentiment, marketContext) : [];

      // Step 5: Generate context embedding
      const contextEmbedding = await this.generateContextEmbedding(
        ticker, 
        technical, 
        sentiment, 
        marketContext
      );

      // Step 6: Combine all analysis into final signal
      const signal = await this.combineAnalysis(
        ticker,
        technical,
        sentiment,
        riskAssessment,
        marketContext,
        similarPatterns,
        contextEmbedding,
        signalRequest
      );

      // Step 7: Validate signal quality
      const validation = validateSignalConfidence(signal);
      if (!validation.isValid && signalRequest.analysisDepth === 'COMPREHENSIVE') {
        console.warn(`Signal validation failed for ${ticker}:`, validation.issues);
      }

      // Step 8: Store signal for future reference and learning
      await this.storeSignal(signal, contextEmbedding);

      // Update statistics
      this.updateStats(signal, Date.now() - startTime);

      console.log(`Signal generated for ${ticker}: ${signal.action} (${signal.confidence.toFixed(3)} confidence)`);
      
      return signal;

    } catch (error) {
      console.error(`Signal generation failed for ${ticker}:`, error);
      throw new Error(`Failed to generate signal for ${ticker}: ${error}`);
    }
  }

  /**
   * Generate signals for multiple tickers in batch
   */
  async generateBatchSignals(
    tickers: string[],
    request: Partial<SignalRequest> = {}
  ): Promise<BatchSignalResult> {
    const startTime = Date.now();
    const signals: TradingSignal[] = [];
    const errors: Array<{ ticker: string; error: string }> = [];

    console.log(`Generating batch signals for ${tickers.length} tickers...`);

    // Process tickers in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (ticker) => {
        try {
          return await this.generateSignal(ticker, request);
        } catch (error) {
          errors.push({
            ticker,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      signals.push(...batchResults.filter((signal): signal is TradingSignal => signal !== null));
    }

    // Calculate summary statistics
    const totalAnalyzed = tickers.length;
    const signalsGenerated = signals.length;
    const averageConfidence = signals.length > 0 
      ? signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length 
      : 0;

    const actionBreakdown = signals.reduce((acc, signal) => {
      acc[signal.action] = (acc[signal.action] || 0) + 1;
      return acc;
    }, {} as { [action in SignalAction]: number });

    const processingTime = Date.now() - startTime;

    return {
      signals,
      summary: {
        totalAnalyzed,
        signalsGenerated,
        averageConfidence,
        actionBreakdown,
        timeGenerated: new Date(),
        processingTime
      },
      errors
    };
  }

  /**
   * Generate multi-timeframe signal analysis
   */
  async generateMultiTimeframeSignal(ticker: string): Promise<MultiTimeframeSignal> {
    console.log(`Generating multi-timeframe analysis for ${ticker}...`);

    const timeframes: TimeHorizon[] = ['INTRADAY', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'];
    const signals: Partial<{ [K in TimeHorizon]: TradingSignal }> = {};

    // Generate signals for each timeframe
    for (const timeHorizon of timeframes) {
      try {
        signals[timeHorizon] = await this.generateSignal(ticker, { timeHorizon });
      } catch (error) {
        console.warn(`Failed to generate ${timeHorizon} signal for ${ticker}:`, error);
      }
    }

    // Analyze consensus across timeframes
    const validSignals = Object.values(signals).filter((s): s is TradingSignal => s !== undefined);
    const consensus = this.calculateTimeframeConsensus(validSignals);

    // Identify conflicts
    const conflicts = this.identifyTimeframeConflicts(validSignals);

    // Generate recommendations
    const recommendations = this.generateTimeframeRecommendations(validSignals, consensus, conflicts);

    return {
      ticker,
      signals: {
        intraday: signals.INTRADAY!,
        shortTerm: signals.SHORT_TERM!,
        mediumTerm: signals.MEDIUM_TERM!,
        longTerm: signals.LONG_TERM!
      },
      consensus,
      conflicts,
      recommendations
    };
  }

  /**
   * Update signal in real-time based on new data
   */
  async updateSignal(signalId: string, newMarketData?: MarketDataPoint[]): Promise<TradingSignal> {
    // Retrieve existing signal
    const existingSignal = await this.getStoredSignal(signalId);
    if (!existingSignal) {
      throw new Error(`Signal ${signalId} not found`);
    }

    // Re-analyze with latest data
    const updatedSignal = await this.generateSignal(existingSignal.ticker, {
      timeHorizon: existingSignal.timeHorizon,
      analysisDepth: 'QUICK'
    });

    // Compare with existing signal and determine if update is significant
    const significantChange = this.isSignificantChange(existingSignal, updatedSignal);
    
    if (significantChange) {
      console.log(`Significant signal change detected for ${existingSignal.ticker}`);
      await this.storeSignalUpdate(existingSignal, updatedSignal);
    }

    return updatedSignal;
  }

  // Private helper methods

  private async combineAnalysis(
    ticker: string,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment,
    marketContext: MarketContext,
    similarPatterns: SimilarPattern[],
    embedding: number[],
    request: SignalRequest
  ): Promise<TradingSignal> {
    
    // Convert SimilarPattern to PatternMatch for confidence calculation
    const patternMatches: PatternMatch[] = similarPatterns.map(sp => ({
      patternName: `Pattern-${sp.pattern.id.slice(-8)}`,
      similarity: sp.similarity,
      historicalOutcome: sp.pattern.outcome.success ? 'BULLISH' : 'BEARISH',
      averageReturn: sp.pattern.outcome.actualReturn,
      successRate: sp.pattern.outcome.success ? 0.8 : 0.2,
      timeToTarget: sp.pattern.outcome.timeToTarget,
      confidence: sp.relevance,
      description: `Historical pattern from ${sp.pattern.timestamp.toDateString()}`
    }));

    // Calculate base confidence from individual analyses
    const confidenceFactors = calculateSignalConfidence(
      technical,
      sentiment,
      patternMatches,
      marketContext,
      risk,
      DEFAULT_CONFIDENCE_CONFIG
    );

    // Analyze signal agreement
    const technicalSignal = technical.overallSignal;
    const sentimentSignal = sentiment.impact;
    const patternSignals = similarPatterns.map(p => p.pattern.signal.action);
    
    const agreement = analyzeSignalAgreement(
      technicalSignal,
      sentimentSignal,
      patternSignals
    );

    // Generate confidence breakdown
    const confidenceBreakdown = generateConfidenceBreakdown(
      confidenceFactors,
      agreement
    );

    // Determine final action and strength
    const finalScore = confidenceBreakdown.finalConfidence;
    const { action, strength } = this.mapScoreToActionStrength(finalScore, agreement);

    // Build technical contributions
    const technicalContributions: TechnicalContributions = {
      movingAverages: {
        signal: this.mapTechnicalSignal(technical.movingAverages.signal),
        weight: 0.3,
        confidence: technical.movingAverages.confidence,
        details: `Trend: ${technical.movingAverages.trend}, Signal: ${technical.movingAverages.signal}`
      },
      rsi: {
        signal: this.mapTechnicalSignal(technical.overallSignal),
        weight: 0.25,
        confidence: technical.confidence,
        value: 50, // Would get from actual RSI analysis
        details: `Technical analysis confidence: ${technical.confidence.toFixed(2)}`
      },
      macd: {
        signal: this.mapTechnicalSignal(technical.overallSignal),
        weight: 0.25,
        confidence: technical.confidence,
        details: `Overall technical signal: ${technical.overallSignal}`
      },
      volume: {
        signal: 'NEUTRAL',
        weight: 0.1,
        confidence: 0.5,
        details: 'Volume analysis not available'
      },
      support_resistance: {
        nearSupport: this.isNearLevel(technical.currentPrice, technical.supportLevels),
        nearResistance: this.isNearLevel(technical.currentPrice, technical.resistanceLevels),
        supportLevel: technical.supportLevels?.[0],
        resistanceLevel: technical.resistanceLevels?.[0],
        details: `Support: ${technical.supportLevels?.[0]?.toFixed(2) || 'N/A'}, Resistance: ${technical.resistanceLevels?.[0]?.toFixed(2) || 'N/A'}`
      }
    };

    // Build sentiment contributions
    const sentimentContributions: SentimentContributions = {
      newsImpact: {
        signal: this.mapSentimentSignal(sentiment.impact),
        weight: 0.4,
        confidence: sentiment.confidence,
        newsCount: sentiment.newsCount,
        sentimentScore: sentiment.sentimentScore,
        details: `${sentiment.newsCount} news items, sentiment: ${sentiment.sentimentLabel}`
      },
      marketSentiment: {
        signal: this.mapSentimentSignal(sentiment.impact),
        weight: 0.3,
        confidence: sentiment.confidence,
        details: `Market sentiment trending ${sentiment.trendDirection.toLowerCase()}`
      }
    };

    // Pattern matches from similar historical patterns (already converted above)

    // Calculate price targets
    const priceTargets = this.calculatePriceTargets(
      technical.currentPrice,
      request.timeHorizon || 'SHORT_TERM',
      finalScore,
      technical,
      sentiment
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      action,
      technical,
      sentiment,
      risk,
      agreement,
      similarPatterns
    );

    // Generate key factors
    const keyFactors = this.generateKeyFactors(
      technical,
      sentiment,
      risk,
      similarPatterns
    );

    // Generate warnings
    const warnings = [...risk.warnings];
    if (agreement.overallAgreement < 0.5) {
      warnings.push('Conflicting signals detected across different analysis methods');
    }

    const signal: TradingSignal = {
      id: `signal_${ticker}_${Date.now()}`,
      ticker,
      timestamp: new Date(),
      action,
      strength,
      confidence: finalScore,
      
      source: 'COMBINED',
      timeHorizon: request.timeHorizon || 'SHORT_TERM',
      currentPrice: technical.currentPrice,
      targetPrice: priceTargets.targets.moderate,
      stopLoss: risk.stopLossLevel,
      
      technicalContributions,
      sentimentContributions,
      riskAssessment: risk,
      
      marketContext,
      patternMatches,
      priceTargets,
      
      confidenceFactors,
      
      reasoning,
      keyFactors,
      warnings,
      
      version: '1.0',
      
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastUpdated: new Date(),
      updateFrequency: 'DAILY'
    };

    return signal;
  }

  private async generateContextEmbedding(
    ticker: string,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    marketContext: MarketContext
  ): Promise<number[]> {
    // Create a text representation of the current context
    const contextText = [
      `Ticker: ${ticker}`,
      `Technical Signal: ${technical.overallSignal}`,
      `Technical Confidence: ${technical.confidence}`,
      `Trend: ${technical.movingAverages?.trend || 'UNKNOWN'}`,
      `Sentiment: ${sentiment.sentimentLabel}`,
      `Sentiment Score: ${sentiment.sentimentScore}`,
      `News Count: ${sentiment.newsCount}`,
      `Market Condition: ${marketContext.condition}`,
      `Market Trend: ${marketContext.trend}`,
      `Volatility: ${marketContext.volatility}`,
      `Volume: ${marketContext.volume}`,
      `Price: ${technical.currentPrice}`
    ].join(' ');

    // Generate embedding (simplified - would use actual embedding model)
    const embedding = this.simpleTextToVector(contextText);
    
    return embedding;
  }

  private async findSimilarPatterns(
    ticker: string,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    marketContext: MarketContext
  ): Promise<SimilarPattern[]> {
    if (!this.config.features.useVectorSearch) {
      return [];
    }

    try {
      // Generate query embedding for current context
      const queryEmbedding = await this.generateContextEmbedding(
        ticker,
        technical,
        sentiment,
        marketContext
      );

      // Search for similar historical patterns
      const searchResults = await this.storage.select('historical_patterns', {
        limit: 10,
        where: {
          // Optionally filter by sector, market cap, etc.
        }
      });

      // Convert to SimilarPattern format and calculate relevance
      const similarPatterns: SimilarPattern[] = searchResults.map((result: any) => {
        const pattern: HistoricalPattern = result;
        const similarity = this.calculateCosineSimilarity(queryEmbedding, pattern.embedding);
        const relevance = this.calculatePatternRelevance(pattern, technical, sentiment);
        const weight = similarity * relevance;

        return {
          pattern,
          similarity,
          relevance,
          weight
        };
      });

      // Sort by relevance and return top matches
      return similarPatterns
        .filter(sp => sp.similarity > 0.7) // Minimum similarity threshold
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);

    } catch (error) {
      console.warn(`Pattern matching failed for ${ticker}:`, error);
      return [];
    }
  }

  private createMarketContext(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis
  ): MarketContext {
    // Map technical analysis to market context
    const condition = this.mapToMarketCondition(technical, sentiment);
    const trend = this.mapToTrend(technical.movingAverages?.trend);
    
    return {
      condition,
      trend,
      volatility: 'MEDIUM', // Would calculate from actual data
      volume: 'MEDIUM', // Would calculate from actual data
      sector: 'UNKNOWN', // Would need sector classification
      marketCap: 'LARGE', // Would need market cap data
      correlation: {
        market: 0.7, // Would calculate actual correlation
        sector: 0.8,
        peers: 0.6
      }
    };
  }

  private async storeSignal(signal: TradingSignal, embedding: number[]): Promise<void> {
    try {
      await this.storage.insert('trading_signals', signal as any);
    } catch (error) {
      console.warn(`Failed to store signal for ${signal.ticker}:`, error);
    }
  }

  private updateStats(signal: TradingSignal, processingTime: number): void {
    this.stats.totalGenerated++;
    this.stats.averageConfidence = (
      (this.stats.averageConfidence * (this.stats.totalGenerated - 1)) + 
      signal.confidence
    ) / this.stats.totalGenerated;
    
    this.stats.distributionByAction[signal.action]++;
    this.stats.distributionByRisk[signal.riskAssessment.overallRisk]++;
    
    this.stats.processingTime = (
      (this.stats.processingTime * (this.stats.totalGenerated - 1)) + 
      processingTime
    ) / this.stats.totalGenerated;
    
    this.stats.lastUpdated = new Date();
  }

  private mapScoreToActionStrength(
    score: number,
    agreement: any
  ): { action: SignalAction; strength: SignalStrength } {
    // Adjust thresholds based on agreement
    const agreementBonus = agreement.overallAgreement * 0.1;
    const adjustedScore = score + agreementBonus;

    if (adjustedScore >= 0.85) {
      return { action: 'STRONG_BUY', strength: 'VERY_STRONG' };
    } else if (adjustedScore >= 0.7) {
      return { action: 'BUY', strength: 'STRONG' };
    } else if (adjustedScore >= 0.55) {
      return { action: 'BUY', strength: 'MODERATE' };
    } else if (adjustedScore >= 0.45) {
      return { action: 'HOLD', strength: 'MODERATE' };
    } else if (adjustedScore >= 0.3) {
      return { action: 'SELL', strength: 'MODERATE' };
    } else if (adjustedScore >= 0.15) {
      return { action: 'SELL', strength: 'STRONG' };
    } else {
      return { action: 'STRONG_SELL', strength: 'VERY_STRONG' };
    }
  }

  // Helper mapping functions

  private mapTechnicalSignal(signal: string): 'BUY' | 'SELL' | 'NEUTRAL' {
    if (['BUY', 'STRONG_BUY'].includes(signal)) return 'BUY';
    if (['SELL', 'STRONG_SELL'].includes(signal)) return 'SELL';
    return 'NEUTRAL';
  }

  private mapSentimentSignal(signal: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    if (signal === 'Bullish') return 'BULLISH';
    if (signal === 'Bearish') return 'BEARISH';
    return 'NEUTRAL';
  }

  private mapToMarketCondition(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis
  ): MarketContext['condition'] {
    if (technical.confidence > 0.7 && sentiment.confidence > 0.7) {
      if (sentiment.sentimentScore > 0.3) return 'BULLISH';
      if (sentiment.sentimentScore < -0.3) return 'BEARISH';
    }
    
    if (technical.confidence < 0.5 || sentiment.confidence < 0.5) {
      return 'UNCERTAIN';
    }
    
    return 'SIDEWAYS';
  }

  private mapToTrend(trend?: string): 'UP' | 'DOWN' | 'SIDEWAYS' {
    if (trend === 'UPTREND') return 'UP';
    if (trend === 'DOWNTREND') return 'DOWN';
    return 'SIDEWAYS';
  }

  private isNearLevel(price: number, levels?: number[]): boolean {
    if (!levels || levels.length === 0) return false;
    const threshold = 0.02; // 2% threshold
    return levels.some(level => Math.abs(price - level) / price < threshold);
  }

  private calculatePriceTargets(
    currentPrice: number,
    timeHorizon: TimeHorizon,
    confidence: number,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis
  ): PriceTargets {
    const horizonMultipliers = {
      'INTRADAY': 0.02,
      'SHORT_TERM': 0.05,
      'MEDIUM_TERM': 0.12,
      'LONG_TERM': 0.25
    };
    
    const baseMultiplier = horizonMultipliers[timeHorizon];
    const sentimentAdjustment = sentiment.sentimentScore * 0.3;
    const confidenceAdjustment = (confidence - 0.5) * 0.2;
    
    const adjustedMultiplier = baseMultiplier + sentimentAdjustment + confidenceAdjustment;
    
    return {
      timeHorizon,
      targets: {
        conservative: currentPrice * (1 + adjustedMultiplier * 0.6),
        moderate: currentPrice * (1 + adjustedMultiplier),
        aggressive: currentPrice * (1 + adjustedMultiplier * 1.5)
      },
      probability: {
        upside: confidence * 0.8,
        downside: (1 - confidence) * 0.8
      },
      keyLevels: {
        support: technical.supportLevels || [currentPrice * 0.95],
        resistance: technical.resistanceLevels || [currentPrice * 1.05]
      }
    };
  }

  private generateReasoning(
    action: SignalAction,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment,
    agreement: any,
    patterns: SimilarPattern[]
  ): string {
    const parts = [
      `${action} signal based on combined analysis.`,
      `Technical analysis shows ${technical.overallSignal.toLowerCase()} with ${(technical.confidence * 100).toFixed(0)}% confidence.`,
      `Market sentiment is ${sentiment.sentimentLabel.toLowerCase()} based on ${sentiment.newsCount} news items.`,
      `Risk assessment indicates ${risk.overallRisk.toLowerCase()} risk level.`
    ];

    if (agreement.overallAgreement > 0.7) {
      parts.push('Multiple analysis methods are in agreement.');
    } else if (agreement.overallAgreement < 0.5) {
      parts.push('Some conflicting signals detected - proceed with caution.');
    }

    if (patterns.length > 0) {
      const avgPatternReturn = patterns.reduce((sum, p) => sum + p.pattern.outcome.actualReturn, 0) / patterns.length;
      parts.push(`Historical patterns suggest ${avgPatternReturn > 0 ? 'positive' : 'negative'} outcome.`);
    }

    return parts.join(' ');
  }

  private generateKeyFactors(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment,
    patterns: SimilarPattern[]
  ): string[] {
    const factors: string[] = [];
    
    // Technical factors
    if (technical.confidence > 0.7) {
      factors.push(`Strong technical signal (${technical.overallSignal})`);
    }
    
    if (technical.movingAverages?.trend) {
      factors.push(`${technical.movingAverages.trend.toLowerCase()} trend in moving averages`);
    }

    // Sentiment factors
    if (Math.abs(sentiment.sentimentScore) > 0.5) {
      factors.push(`${sentiment.sentimentScore > 0 ? 'Positive' : 'Negative'} market sentiment`);
    }
    
    if (sentiment.newsCount > 10) {
      factors.push(`High news volume (${sentiment.newsCount} articles)`);
    }

    // Risk factors
    if (risk.overallRisk === 'LOW' || risk.overallRisk === 'VERY_LOW') {
      factors.push('Low risk profile');
    } else if (risk.overallRisk === 'HIGH' || risk.overallRisk === 'VERY_HIGH') {
      factors.push('High risk - proceed with caution');
    }

    // Pattern factors
    if (patterns.length > 0) {
      const successfulPatterns = patterns.filter(p => p.pattern.outcome.success).length;
      factors.push(`${patterns.length} similar historical patterns (${successfulPatterns} successful)`);
    }

    return factors.slice(0, 5); // Limit to top 5 factors
  }

  // Additional utility methods

  private simpleTextToVector(text: string): number[] {
    // Simplified text-to-vector conversion (would use actual embedding model)
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(384).fill(0); // Common embedding dimension
    
    for (let i = 0; i < words.length && i < vector.length; i++) {
      const word = words[i];
      // Simple hash-based vector generation
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
      }
      vector[i % vector.length] += (hash % 1000) / 1000 - 0.5;
    }
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
  }

  private calculatePatternRelevance(
    pattern: HistoricalPattern,
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis
  ): number {
    let relevance = 0.5; // Base relevance
    
    // Time decay - more recent patterns are more relevant
    const daysSince = (Date.now() - pattern.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const timeDecay = Math.exp(-daysSince / 365); // Decay over a year
    relevance *= (0.5 + timeDecay * 0.5);
    
    // Similar technical conditions
    if (pattern.context.technical.overallSignal === technical.overallSignal) {
      relevance += 0.2;
    }
    
    // Similar sentiment conditions
    const sentimentSimilarity = 1 - Math.abs(pattern.context.sentiment.sentimentScore - sentiment.sentimentScore) / 2;
    relevance += sentimentSimilarity * 0.3;
    
    return Math.min(1, relevance);
  }

  private calculateTimeframeConsensus(signals: TradingSignal[]): {
    action: SignalAction;
    confidence: number;
    agreement: number;
  } {
    if (signals.length === 0) {
      return { action: 'HOLD', confidence: 0, agreement: 0 };
    }

    // Count action occurrences
    const actionCounts = signals.reduce((acc, signal) => {
      acc[signal.action] = (acc[signal.action] || 0) + 1;
      return acc;
    }, {} as { [action in SignalAction]: number });

    // Find most common action
    const dominantAction = Object.keys(actionCounts).reduce((a, b) => 
      actionCounts[a as SignalAction] > actionCounts[b as SignalAction] ? a : b
    ) as SignalAction;

    const agreement = actionCounts[dominantAction] / signals.length;
    const averageConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;

    return {
      action: dominantAction,
      confidence: averageConfidence * agreement, // Adjust confidence by agreement
      agreement
    };
  }

  private identifyTimeframeConflicts(signals: TradingSignal[]): string[] {
    const conflicts: string[] = [];
    
    const actions = signals.map(s => s.action);
    const uniqueActions = new Set(actions);
    
    if (uniqueActions.size > 2) {
      conflicts.push('Multiple conflicting signals across timeframes');
    }
    
    // Check for opposing signals
    const hasBuy = actions.some(a => ['BUY', 'STRONG_BUY'].includes(a));
    const hasSell = actions.some(a => ['SELL', 'STRONG_SELL'].includes(a));
    
    if (hasBuy && hasSell) {
      conflicts.push('Opposing buy and sell signals detected');
    }
    
    return conflicts;
  }

  private generateTimeframeRecommendations(
    signals: TradingSignal[],
    consensus: any,
    conflicts: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (consensus.agreement > 0.8) {
      recommendations.push('Strong consensus across timeframes - high confidence signal');
    } else if (consensus.agreement > 0.6) {
      recommendations.push('Moderate agreement across timeframes');
    } else {
      recommendations.push('Mixed signals - consider waiting for clearer direction');
    }
    
    if (conflicts.length > 0) {
      recommendations.push('Conflicting timeframes detected - use smaller position sizes');
    }
    
    return recommendations;
  }

  private async getStoredSignal(signalId: string): Promise<TradingSignal | null> {
    try {
      const results = await this.storage.select('trading_signals', {
        where: { id: signalId },
        limit: 1
      });
      return (results[0] as any) || null;
    } catch (error) {
      console.warn(`Failed to retrieve signal ${signalId}:`, error);
      return null;
    }
  }

  private isSignificantChange(oldSignal: TradingSignal, newSignal: TradingSignal): boolean {
    // Check if action changed
    if (oldSignal.action !== newSignal.action) return true;
    
    // Check if confidence changed significantly
    if (Math.abs(oldSignal.confidence - newSignal.confidence) > 0.2) return true;
    
    // Check if risk level changed
    if (oldSignal.riskAssessment.overallRisk !== newSignal.riskAssessment.overallRisk) return true;
    
    return false;
  }

  private async storeSignalUpdate(oldSignal: TradingSignal, newSignal: TradingSignal): Promise<void> {
    try {
      // Store the updated signal (in real implementation, this would be in a signal_updates table)
      await this.storage.insert('trading_signals', newSignal as any);
      console.log(`Signal updated for ${newSignal.ticker}: ${oldSignal.action} -> ${newSignal.action}`);
    } catch (error) {
      console.warn(`Failed to store signal update:`, error);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): SignalStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SignalConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      weights: { ...this.config.weights, ...newConfig.weights },
      thresholds: { ...this.config.thresholds, ...newConfig.thresholds },
      features: { ...this.config.features, ...newConfig.features },
      timeouts: { ...this.config.timeouts, ...newConfig.timeouts }
    };
  }
}

/**
 * Factory function to create SignalGeneratorAgent
 */
export function createSignalGeneratorAgent(
  technicalAgent: TechnicalAnalysisAgent,
  sentimentAgent: SentimentAnalysisAgent,
  storage: StorageAdapter,
  config?: Partial<SignalConfig>
): SignalGeneratorAgent {
  return new SignalGeneratorAgent(technicalAgent, sentimentAgent, storage, config);
}

export default SignalGeneratorAgent;