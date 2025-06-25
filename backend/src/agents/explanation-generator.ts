/**
 * Explanation Generator Agent
 * Generates comprehensive explanations for trading signals and decisions
 */

import { TradingSignal, SignalAction, RiskLevel, TimeHorizon } from '../types/trading-signals.js';
import { TechnicalAnalysis } from './technical-analysis.js';
import { SentimentAnalysis } from '../utils/sentiment-calculator.js';
import { RiskAssessment } from '../types/trading-signals.js';

/**
 * Trading explanation with comprehensive reasoning
 */
export interface TradingExplanation {
  id: string;
  signalId: string;
  ticker: string;
  timestamp: Date;
  
  // Core decision
  decision: SignalAction;
  confidence: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  
  // Main reasoning
  reasoning: string[];
  keyFactors: string[];
  
  // Supporting evidence
  technicalEvidence: TechnicalEvidence;
  sentimentEvidence: SentimentEvidence;
  historicalEvidence: HistoricalEvidence;
  
  // Risk analysis
  riskFactors: RiskFactor[];
  riskMitigation: string[];
  
  // Historical context
  supportingData: SupportingData;
  similarPatterns: SimilarPattern[];
  
  // Alternative scenarios
  alternativeScenarios: AlternativeScenario[];
  
  // Confidence breakdown
  confidenceBreakdown: ConfidenceBreakdown;
  
  // Human-readable summary
  summary: string;
  explanation: string;
  
  // Metadata
  explanationComplexity: 'SIMPLE' | 'INTERMEDIATE' | 'ADVANCED';
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  
  // Validation
  isVerified: boolean;
  verificationNotes?: string[];
}

/**
 * Technical evidence supporting the decision
 */
export interface TechnicalEvidence {
  indicators: {
    name: string;
    value: number;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number;
    explanation: string;
  }[];
  patterns: {
    name: string;
    confidence: number;
    outcome: string;
    explanation: string;
  }[];
  priceAction: {
    trend: string;
    momentum: string;
    volume: string;
    explanation: string;
  };
  supportResistance: {
    currentLevel: number;
    significance: number;
    explanation: string;
  }[];
}

/**
 * Sentiment evidence supporting the decision
 */
export interface SentimentEvidence {
  overallSentiment: {
    score: number;
    label: string;
    confidence: number;
    explanation: string;
  };
  newsImpact: {
    positiveNews: string[];
    negativeNews: string[];
    neutralNews: string[];
    overallImpact: string;
  };
  marketSentiment: {
    bullishFactors: string[];
    bearishFactors: string[];
    explanation: string;
  };
  analystOpinions: {
    averageRating: string;
    priceTargets: number[];
    consensus: string;
    explanation: string;
  };
}

/**
 * Historical evidence and patterns
 */
export interface HistoricalEvidence {
  successRate: number;
  averageReturn: number;
  timeToTarget: number;
  sampleSize: number;
  
  historicalPatterns: {
    pattern: string;
    frequency: number;
    successRate: number;
    averageReturn: number;
    explanation: string;
  }[];
  
  seasonality: {
    month: string;
    performance: number;
    significance: number;
  }[];
  
  marketRegimePerformance: {
    regime: string;
    performance: number;
    explanation: string;
  }[];
}

/**
 * Risk factors identified
 */
export interface RiskFactor {
  type: 'MARKET' | 'COMPANY' | 'TECHNICAL' | 'SENTIMENT' | 'LIQUIDITY' | 'VOLATILITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  probability: number;
  impact: number;
  mitigation: string[];
}

/**
 * Supporting data for the decision
 */
export interface SupportingData {
  marketData: {
    currentPrice: number;
    volume: number;
    volatility: number;
    beta: number;
  };
  
  financialMetrics: {
    peRatio?: number;
    pbRatio?: number;
    roe?: number;
    debtToEquity?: number;
  };
  
  competitorAnalysis: {
    relativePerformance: number;
    marketPosition: string;
    competitiveAdvantages: string[];
  };
  
  macroeconomicFactors: {
    economicIndicators: string[];
    sectorTrends: string[];
    geopoliticalFactors: string[];
  };
}

/**
 * Similar historical patterns
 */
export interface SimilarPattern {
  patternId: string;
  similarity: number;
  date: Date;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  returnAchieved: number;
  timeToOutcome: number;
  marketConditions: string;
  explanation: string;
}

/**
 * Alternative scenarios and their implications
 */
export interface AlternativeScenario {
  scenario: string;
  probability: number;
  expectedOutcome: string;
  implications: string[];
  reasoning: string;
}

/**
 * Detailed confidence breakdown
 */
export interface ConfidenceBreakdown {
  technicalConfidence: number;
  sentimentConfidence: number;
  historicalConfidence: number;
  marketConditionConfidence: number;
  overallConfidence: number;
  
  confidenceFactors: {
    factor: string;
    contribution: number;
    explanation: string;
  }[];
  
  uncertaintyFactors: {
    factor: string;
    impact: number;
    explanation: string;
  }[];
}

/**
 * Explanation generation configuration
 */
export interface ExplanationConfig {
  // Detail level
  includeHistoricalData: boolean;
  includeRiskAnalysis: boolean;
  includeAlternativeScenarios: boolean;
  includeConfidenceBreakdown: boolean;
  
  // Complexity settings
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  explanationDepth: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  
  // Historical data settings
  historicalLookbackMonths: number;
  minimumPatternMatches: number;
  
  // Risk settings
  includeAllRiskFactors: boolean;
  riskThreshold: number;
  
  // Language settings
  useSimpleLanguage: boolean;
  includeTechnicalTerms: boolean;
  includeExamples: boolean;
}

/**
 * Main Explanation Generator Agent
 */
export class ExplanationGenerator {
  private config: Required<ExplanationConfig>;

  constructor(config: Partial<ExplanationConfig> = {}) {
    this.config = {
      includeHistoricalData: true,
      includeRiskAnalysis: true,
      includeAlternativeScenarios: true,
      includeConfidenceBreakdown: true,
      targetAudience: 'INTERMEDIATE',
      explanationDepth: 'DETAILED',
      historicalLookbackMonths: 24,
      minimumPatternMatches: 5,
      includeAllRiskFactors: false,
      riskThreshold: 0.3,
      useSimpleLanguage: false,
      includeTechnicalTerms: true,
      includeExamples: true,
      ...config
    };
  }

  /**
   * Generate comprehensive explanation for a trading signal
   */
  generateExplanation(signal: TradingSignal): TradingExplanation {
    console.log(`📝 Generating explanation for ${signal.ticker} ${signal.action} signal`);

    const explanationId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate main reasoning
    const reasoning = this.generateMainReasoning(signal);
    const keyFactors = this.extractKeyFactors(signal);
    
    // Generate evidence
    const technicalEvidence = this.generateTechnicalEvidence(signal);
    const sentimentEvidence = this.generateSentimentEvidence(signal);
    const historicalEvidence = this.generateHistoricalEvidence(signal);
    
    // Analyze risks
    const riskFactors = this.identifyRisks(signal);
    const riskMitigation = this.generateRiskMitigation(riskFactors);
    
    // Generate supporting data
    const supportingData = this.generateSupportingData(signal);
    const similarPatterns = this.findSimilarPatterns(signal);
    
    // Alternative scenarios
    const alternativeScenarios = this.generateAlternativeScenarios(signal);
    
    // Confidence breakdown
    const confidenceBreakdown = this.generateConfidenceBreakdown(signal);
    
    // Generate human-readable content
    const summary = this.generateSummary(signal, reasoning);
    const explanation = this.generateDetailedExplanation(signal, reasoning, technicalEvidence, sentimentEvidence);
    
    // Determine complexity and audience
    const explanationComplexity = this.assessComplexity(signal);
    const targetAudience = this.config.targetAudience;
    
    const tradingExplanation: TradingExplanation = {
      id: explanationId,
      signalId: signal.id,
      ticker: signal.ticker,
      timestamp: new Date(),
      
      decision: signal.action,
      confidence: signal.confidence,
      strength: this.mapConfidenceToStrength(signal.confidence),
      
      reasoning,
      keyFactors,
      
      technicalEvidence,
      sentimentEvidence,
      historicalEvidence,
      
      riskFactors,
      riskMitigation,
      
      supportingData,
      similarPatterns,
      
      alternativeScenarios,
      confidenceBreakdown,
      
      summary,
      explanation,
      
      explanationComplexity,
      targetAudience,
      
      isVerified: this.verifyExplanation(signal, reasoning),
      verificationNotes: this.generateVerificationNotes(signal)
    };

    console.log(`✅ Generated ${explanationComplexity.toLowerCase()} explanation with ${reasoning.length} reasoning points`);
    return tradingExplanation;
  }

  /**
   * Generate main reasoning points
   */
  private generateMainReasoning(signal: TradingSignal): string[] {
    const reasoning: string[] = [];

    // Technical reasoning
    if (signal.technicalContributions) {
      const technical = signal.technicalContributions;
      
      if (technical.movingAverages.confidence > 0.7) {
        reasoning.push(`Technical indicators suggest ${technical.movingAverages.details.toLowerCase()}`);
      }
      
      if (technical.rsi.confidence > 0.7) {
        const rsiCondition = technical.rsi.value > 70 ? 'overbought' : 
                           technical.rsi.value < 30 ? 'oversold' : 'neutral';
        reasoning.push(`RSI at ${technical.rsi.value.toFixed(1)} indicates ${rsiCondition} conditions`);
      }
      
      if (technical.volume.confidence > 0.6) {
        reasoning.push(`Volume analysis shows ${technical.volume.details.toLowerCase()}`);
      }
    }

    // Sentiment reasoning
    if (signal.sentimentContributions) {
      const sentiment = signal.sentimentContributions;
      
      if (sentiment.newsImpact.confidence > 0.6) {
        const sentimentLabel = sentiment.newsImpact.sentimentScore > 0.5 ? 'positive' : 
                             sentiment.newsImpact.sentimentScore < -0.5 ? 'negative' : 'neutral';
        reasoning.push(`Market sentiment is ${sentimentLabel} based on recent news analysis`);
      }
      
      if (sentiment.marketSentiment.confidence > 0.6) {
        reasoning.push(`Overall market sentiment supports ${signal.action.toLowerCase()} decision`);
      }
    }

    // Historical reasoning
    if (signal.patternMatches && signal.patternMatches.length > 0) {
      const bestPattern = signal.patternMatches.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      reasoning.push(`Similar patterns from our analysis show ${(bestPattern.successRate * 100).toFixed(0)}% success rate`);
    }

    // Risk reasoning
    if (signal.riskAssessment) {
      const risk = signal.riskAssessment;
      
      if (risk.overallRisk !== 'MEDIUM') {
        reasoning.push(`Risk assessment indicates ${risk.overallRisk.toLowerCase()} risk level requiring ${risk.overallRisk === 'HIGH' ? 'careful' : 'standard'} position management`);
      }
    }

    // Market context reasoning
    if (signal.marketContext) {
      const context = signal.marketContext;
      
      if (context.volatility === 'HIGH') {
        reasoning.push(`Current high market volatility requires enhanced risk management`);
      }
      
      if (context.volume === 'HIGH') {
        reasoning.push(`Above-average trading volume supports the strength of this signal`);
      }
    }

    return reasoning.slice(0, 6); // Limit to 6 main points
  }

  /**
   * Extract key factors from signal
   */
  private extractKeyFactors(signal: TradingSignal): string[] {
    const factors: string[] = [];

    // Add explicit key factors if available
    if (signal.keyFactors) {
      factors.push(...signal.keyFactors);
    }

    // Extract from technical analysis
    if (signal.technicalContributions) {
      const tech = signal.technicalContributions;
      
      if (tech.movingAverages.confidence > 0.8) {
        factors.push(`Strong moving average signal (${tech.movingAverages.signal})`);
      }
      
      if (tech.rsi.confidence > 0.8) {
        factors.push(`RSI momentum indicator (${tech.rsi.value.toFixed(1)})`);
      }
    }

    // Extract from pattern matches
    if (signal.patternMatches && signal.patternMatches.length > 0) {
      const topPattern = signal.patternMatches[0];
      factors.push(`${topPattern.patternName} pattern detected`);
    }

    return factors.slice(0, 5); // Limit to 5 key factors
  }

  /**
   * Generate technical evidence
   */
  private generateTechnicalEvidence(signal: TradingSignal): TechnicalEvidence {
    const indicators: TechnicalEvidence['indicators'] = [];
    const patterns: TechnicalEvidence['patterns'] = [];
    
    // Process technical contributions
    if (signal.technicalContributions) {
      const tech = signal.technicalContributions;
      
      // Moving averages
      indicators.push({
        name: 'Moving Averages',
        value: tech.movingAverages.confidence,
        signal: tech.movingAverages.signal === 'BUY' ? 'BULLISH' : 
               tech.movingAverages.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL',
        strength: tech.movingAverages.confidence,
        explanation: tech.movingAverages.details
      });
      
      // RSI
      indicators.push({
        name: 'RSI',
        value: tech.rsi.value,
        signal: tech.rsi.signal === 'BUY' ? 'BULLISH' : 
               tech.rsi.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL',
        strength: tech.rsi.confidence,
        explanation: tech.rsi.details
      });
      
      // MACD
      indicators.push({
        name: 'MACD',
        value: tech.macd.confidence,
        signal: tech.macd.signal === 'BUY' ? 'BULLISH' : 
               tech.macd.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL',
        strength: tech.macd.confidence,
        explanation: tech.macd.details
      });
    }

    // Process pattern matches
    if (signal.patternMatches) {
      for (const pattern of signal.patternMatches.slice(0, 3)) {
        patterns.push({
          name: pattern.patternName,
          confidence: pattern.confidence,
          outcome: pattern.historicalOutcome,
          explanation: pattern.description
        });
      }
    }

    // Generate price action summary
    const priceAction = {
      trend: signal.marketContext?.trend || 'UNKNOWN',
      momentum: 'STRONG', // Mock data
      volume: signal.marketContext?.volume || 'MEDIUM',
      explanation: `Price action shows ${signal.marketContext?.trend?.toLowerCase() || 'unclear'} trend with ${signal.marketContext?.volume?.toLowerCase() || 'moderate'} volume`
    };

    // Generate support/resistance levels
    const supportResistance = [];
    if (signal.technicalContributions?.support_resistance) {
      const sr = signal.technicalContributions.support_resistance;
      
      if (sr.supportLevel) {
        supportResistance.push({
          currentLevel: sr.supportLevel,
          significance: sr.nearSupport ? 0.8 : 0.5,
          explanation: `Support level at ${sr.supportLevel.toFixed(2)}`
        });
      }
      
      if (sr.resistanceLevel) {
        supportResistance.push({
          currentLevel: sr.resistanceLevel,
          significance: sr.nearResistance ? 0.8 : 0.5,
          explanation: `Resistance level at ${sr.resistanceLevel.toFixed(2)}`
        });
      }
    }

    return {
      indicators,
      patterns,
      priceAction,
      supportResistance
    };
  }

  /**
   * Generate sentiment evidence
   */
  private generateSentimentEvidence(signal: TradingSignal): SentimentEvidence {
    const sentiment = signal.sentimentContributions;
    
    const overallSentiment = {
      score: sentiment?.newsImpact?.sentimentScore || 0,
      label: sentiment?.newsImpact?.sentimentScore > 0.5 ? 'POSITIVE' : 
             sentiment?.newsImpact?.sentimentScore < -0.5 ? 'NEGATIVE' : 'NEUTRAL',
      confidence: sentiment?.newsImpact?.confidence || 0.5,
      explanation: sentiment?.newsImpact?.details || 'No sentiment data available'
    };

    const newsImpact = {
      positiveNews: ['Strong earnings report', 'Positive analyst upgrade'], // Mock data
      negativeNews: ['Market volatility concerns'], // Mock data
      neutralNews: ['Routine corporate update'], // Mock data
      overallImpact: sentiment?.newsImpact?.details || 'Mixed news sentiment'
    };

    const marketSentiment = {
      bullishFactors: ['Technical breakout', 'Volume confirmation'],
      bearishFactors: ['Economic uncertainty'],
      explanation: 'Market sentiment analysis based on multiple data sources'
    };

    const analystOpinions = {
      averageRating: 'BUY', // Mock data
      priceTargets: [signal.targetPrice || signal.currentPrice * 1.1], // Mock data
      consensus: 'Moderately bullish',
      explanation: 'Analyst consensus based on recent research reports'
    };

    return {
      overallSentiment,
      newsImpact,
      marketSentiment,
      analystOpinions
    };
  }

  /**
   * Generate historical evidence
   */
  private generateHistoricalEvidence(signal: TradingSignal): HistoricalEvidence {
    // Calculate success rate from pattern matches
    let successRate = 0.65; // Default
    let averageReturn = 0.08; // Default 8%
    let timeToTarget = 15; // Default 15 days
    let sampleSize = 50; // Default sample size

    if (signal.patternMatches && signal.patternMatches.length > 0) {
      successRate = signal.patternMatches.reduce((sum, p) => sum + p.successRate, 0) / signal.patternMatches.length;
      averageReturn = signal.patternMatches.reduce((sum, p) => sum + p.averageReturn, 0) / signal.patternMatches.length;
      timeToTarget = signal.patternMatches.reduce((sum, p) => sum + p.timeToTarget, 0) / signal.patternMatches.length;
      sampleSize = signal.patternMatches.length * 10; // Estimate
    }

    const historicalPatterns = signal.patternMatches?.map(pattern => ({
      pattern: pattern.patternName,
      frequency: 0.1, // 10% frequency (mock)
      successRate: pattern.successRate,
      averageReturn: pattern.averageReturn,
      explanation: pattern.description
    })) || [];

    // Mock seasonality data
    const seasonality = [
      { month: 'January', performance: 0.05, significance: 0.7 },
      { month: 'December', performance: 0.03, significance: 0.6 }
    ];

    // Mock market regime performance
    const marketRegimePerformance = [
      { regime: 'Bull Market', performance: 0.12, explanation: 'Strong performance in bull markets' },
      { regime: 'Bear Market', performance: -0.05, explanation: 'Defensive characteristics in bear markets' },
      { regime: 'Sideways Market', performance: 0.02, explanation: 'Modest performance in ranging markets' }
    ];

    return {
      successRate,
      averageReturn,
      timeToTarget,
      sampleSize,
      historicalPatterns,
      seasonality,
      marketRegimePerformance
    };
  }

  /**
   * Identify risk factors
   */
  identifyRisks(signal: TradingSignal): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Market risks
    if (signal.marketContext?.volatility === 'HIGH') {
      risks.push({
        type: 'VOLATILITY',
        severity: 'HIGH',
        description: 'High market volatility may lead to unexpected price movements',
        probability: 0.7,
        impact: 0.8,
        mitigation: ['Use smaller position sizes', 'Implement stop-loss orders', 'Monitor closely']
      });
    }

    // Technical risks
    if (signal.confidence < 0.7) {
      risks.push({
        type: 'TECHNICAL',
        severity: 'MEDIUM',
        description: 'Lower confidence in technical signals increases uncertainty',
        probability: 0.6,
        impact: 0.6,
        mitigation: ['Wait for confirmation', 'Use multiple timeframes', 'Diversify positions']
      });
    }

    // Liquidity risks
    if (signal.marketContext?.volume === 'LOW') {
      risks.push({
        type: 'LIQUIDITY',
        severity: 'MEDIUM',
        description: 'Low trading volume may impact execution and spreads',
        probability: 0.5,
        impact: 0.5,
        mitigation: ['Use limit orders', 'Split large orders', 'Monitor bid-ask spreads']
      });
    }

    // Risk assessment specific risks
    if (signal.riskAssessment) {
      const riskAssessment = signal.riskAssessment;
      
      if (riskAssessment.overallRisk === 'HIGH' || riskAssessment.overallRisk === 'VERY_HIGH') {
        risks.push({
          type: 'MARKET',
          severity: riskAssessment.overallRisk === 'VERY_HIGH' ? 'CRITICAL' : 'HIGH',
          description: `Risk assessment indicates ${riskAssessment.overallRisk.toLowerCase()} risk level`,
          probability: 0.8,
          impact: 0.9,
          mitigation: riskAssessment.recommendations.slice(0, 3)
        });
      }
    }

    // Company-specific risks (mock)
    if (signal.ticker) {
      risks.push({
        type: 'COMPANY',
        severity: 'LOW',
        description: `Company-specific risks related to ${signal.ticker}`,
        probability: 0.3,
        impact: 0.4,
        mitigation: ['Monitor earnings', 'Track news', 'Diversify holdings']
      });
    }

    return risks.filter(risk => 
      this.config.includeAllRiskFactors || 
      risk.probability * risk.impact >= this.config.riskThreshold
    );
  }

  /**
   * Generate risk mitigation strategies
   */
  private generateRiskMitigation(riskFactors: RiskFactor[]): string[] {
    const mitigation = new Set<string>();

    for (const risk of riskFactors) {
      risk.mitigation.forEach(strategy => mitigation.add(strategy));
    }

    // Add general mitigation strategies
    mitigation.add('Maintain proper position sizing');
    mitigation.add('Set appropriate stop-loss levels');
    mitigation.add('Monitor market conditions regularly');

    return Array.from(mitigation).slice(0, 8);
  }

  /**
   * Generate supporting data
   */
  private generateSupportingData(signal: TradingSignal): SupportingData {
    return {
      marketData: {
        currentPrice: signal.currentPrice,
        volume: 1000000, // Mock volume
        volatility: 0.25, // Mock volatility
        beta: 1.2 // Mock beta
      },
      
      financialMetrics: {
        peRatio: 15.5, // Mock P/E
        pbRatio: 2.1, // Mock P/B
        roe: 0.18, // Mock ROE
        debtToEquity: 0.45 // Mock D/E
      },
      
      competitorAnalysis: {
        relativePerformance: 0.05, // Outperforming by 5%
        marketPosition: 'Market leader',
        competitiveAdvantages: ['Strong brand', 'Innovation pipeline', 'Market share']
      },
      
      macroeconomicFactors: {
        economicIndicators: ['GDP growth', 'Low inflation', 'Stable employment'],
        sectorTrends: ['Digital transformation', 'ESG focus'],
        geopoliticalFactors: ['Trade stability', 'Regulatory environment']
      }
    };
  }

  /**
   * Find similar historical patterns
   */
  private findSimilarPatterns(signal: TradingSignal): SimilarPattern[] {
    const patterns: SimilarPattern[] = [];

    // Generate mock similar patterns
    for (let i = 0; i < 3; i++) {
      patterns.push({
        patternId: `pattern-${i + 1}`,
        similarity: 0.8 - i * 0.1,
        date: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000), // i+1 months ago
        outcome: i === 0 ? 'SUCCESS' : i === 1 ? 'PARTIAL' : 'SUCCESS',
        returnAchieved: (0.08 - i * 0.02), // 8%, 6%, 4%
        timeToOutcome: 15 + i * 5, // 15, 20, 25 days
        marketConditions: i === 0 ? 'Bullish' : i === 1 ? 'Neutral' : 'Volatile',
        explanation: `Similar ${signal.action.toLowerCase()} signal with ${(0.8 - i * 0.1) * 100}% pattern similarity`
      });
    }

    return patterns;
  }

  /**
   * Generate alternative scenarios
   */
  private generateAlternativeScenarios(signal: TradingSignal): AlternativeScenario[] {
    if (!this.config.includeAlternativeScenarios) return [];

    const scenarios: AlternativeScenario[] = [];

    // Base case
    scenarios.push({
      scenario: 'Base Case',
      probability: 0.6,
      expectedOutcome: `Target price achieved with ${(signal.confidence * 100).toFixed(0)}% confidence`,
      implications: ['Expected return achieved', 'Timeline met', 'Risk managed'],
      reasoning: 'Most likely outcome based on current analysis'
    });

    // Optimistic case
    scenarios.push({
      scenario: 'Optimistic Case',
      probability: 0.2,
      expectedOutcome: 'Target exceeded due to favorable market conditions',
      implications: ['Higher than expected returns', 'Faster timeline', 'Consider taking profits'],
      reasoning: 'Strong market momentum and positive catalysts'
    });

    // Pessimistic case
    scenarios.push({
      scenario: 'Pessimistic Case',
      probability: 0.2,
      expectedOutcome: 'Target not achieved due to adverse conditions',
      implications: ['Lower returns or losses', 'Extended timeline', 'Risk management crucial'],
      reasoning: 'Market volatility or unexpected negative events'
    });

    return scenarios;
  }

  /**
   * Generate confidence breakdown
   */
  private generateConfidenceBreakdown(signal: TradingSignal): ConfidenceBreakdown {
    const factors = signal.confidenceFactors;
    
    const confidenceFactors = [
      {
        factor: 'Technical Analysis',
        contribution: factors.technicalConfidence * 0.3,
        explanation: 'Contribution from technical indicators and patterns'
      },
      {
        factor: 'Market Sentiment',
        contribution: factors.sentimentConfidence * 0.25,
        explanation: 'Impact of news and market sentiment analysis'
      },
      {
        factor: 'Historical Patterns',
        contribution: factors.patternMatchConfidence * 0.2,
        explanation: 'Similarity to successful historical patterns'
      },
      {
        factor: 'Market Conditions',
        contribution: factors.marketConditionConfidence * 0.15,
        explanation: 'Current market environment and volume'
      },
      {
        factor: 'Volume Confirmation',
        contribution: factors.volumeConfidence * 0.1,
        explanation: 'Trading volume supporting the signal'
      }
    ];

    const uncertaintyFactors = [
      {
        factor: 'Market Volatility',
        impact: 0.1,
        explanation: 'Current market volatility adds uncertainty'
      },
      {
        factor: 'External Events',
        impact: 0.05,
        explanation: 'Unpredictable external factors'
      }
    ];

    return {
      technicalConfidence: factors.technicalConfidence,
      sentimentConfidence: factors.sentimentConfidence,
      historicalConfidence: factors.historicalAccuracy || factors.patternMatchConfidence,
      marketConditionConfidence: factors.marketConditionConfidence,
      overallConfidence: signal.confidence,
      confidenceFactors,
      uncertaintyFactors
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(signal: TradingSignal, reasoning: string[]): string {
    const action = signal.action;
    const ticker = signal.ticker;
    const confidence = (signal.confidence * 100).toFixed(0);
    
    let summary = `${action} signal for ${ticker} with ${confidence}% confidence. `;
    
    if (reasoning.length > 0) {
      summary += `Key reasons: ${reasoning[0]}`;
      if (reasoning.length > 1) {
        summary += ` and ${reasoning[1]}`;
      }
      summary += '.';
    }
    
    if (signal.riskAssessment && signal.riskAssessment.overallRisk !== 'MEDIUM') {
      summary += ` Risk level: ${signal.riskAssessment.overallRisk}.`;
    }
    
    return summary;
  }

  /**
   * Generate detailed explanation
   */
  private generateDetailedExplanation(
    signal: TradingSignal,
    reasoning: string[],
    technicalEvidence: TechnicalEvidence,
    sentimentEvidence: SentimentEvidence
  ): string {
    let explanation = `This ${signal.action} recommendation for ${signal.ticker} is based on comprehensive analysis of multiple factors.\n\n`;
    
    explanation += `**Technical Analysis:**\n`;
    technicalEvidence.indicators.forEach(indicator => {
      explanation += `• ${indicator.name}: ${indicator.explanation}\n`;
    });
    
    explanation += `\n**Market Sentiment:**\n`;
    explanation += `• ${sentimentEvidence.overallSentiment.explanation}\n`;
    explanation += `• ${sentimentEvidence.newsImpact.overallImpact}\n`;
    
    explanation += `\n**Key Reasoning:**\n`;
    reasoning.forEach(reason => {
      explanation += `• ${reason}\n`;
    });
    
    if (signal.riskAssessment) {
      explanation += `\n**Risk Assessment:**\n`;
      explanation += `• Overall risk level: ${signal.riskAssessment.overallRisk}\n`;
      explanation += `• Risk score: ${signal.riskAssessment.riskScore}/100\n`;
    }
    
    return explanation;
  }

  /**
   * Map confidence to strength
   */
  private mapConfidenceToStrength(confidence: number): 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' {
    if (confidence >= 0.9) return 'VERY_STRONG';
    if (confidence >= 0.75) return 'STRONG';
    if (confidence >= 0.6) return 'MODERATE';
    return 'WEAK';
  }

  /**
   * Assess explanation complexity
   */
  private assessComplexity(signal: TradingSignal): 'SIMPLE' | 'INTERMEDIATE' | 'ADVANCED' {
    let complexityScore = 0;
    
    // Technical indicators add complexity
    if (signal.technicalContributions) {
      complexityScore += Object.keys(signal.technicalContributions).length;
    }
    
    // Pattern matches add complexity
    if (signal.patternMatches && signal.patternMatches.length > 0) {
      complexityScore += signal.patternMatches.length;
    }
    
    // Risk factors add complexity
    if (signal.riskAssessment && signal.riskAssessment.warnings.length > 2) {
      complexityScore += 2;
    }
    
    if (complexityScore >= 8) return 'ADVANCED';
    if (complexityScore >= 4) return 'INTERMEDIATE';
    return 'SIMPLE';
  }

  /**
   * Verify explanation consistency
   */
  private verifyExplanation(signal: TradingSignal, reasoning: string[]): boolean {
    // Check if reasoning aligns with signal action
    const positiveReasons = reasoning.filter(r => 
      r.includes('positive') || r.includes('bullish') || r.includes('strong')
    ).length;
    
    const negativeReasons = reasoning.filter(r => 
      r.includes('negative') || r.includes('bearish') || r.includes('weak')
    ).length;
    
    const isBullishSignal = ['BUY', 'STRONG_BUY'].includes(signal.action);
    const isBearishSignal = ['SELL', 'STRONG_SELL'].includes(signal.action);
    
    if (isBullishSignal && positiveReasons >= negativeReasons) return true;
    if (isBearishSignal && negativeReasons >= positiveReasons) return true;
    if (signal.action === 'HOLD') return true;
    
    return false;
  }

  /**
   * Generate verification notes
   */
  private generateVerificationNotes(signal: TradingSignal): string[] {
    const notes: string[] = [];
    
    if (signal.confidence < 0.6) {
      notes.push('Low confidence signal - requires additional confirmation');
    }
    
    if (signal.riskAssessment?.overallRisk === 'HIGH') {
      notes.push('High risk signal - implement strict risk management');
    }
    
    if (!signal.patternMatches || signal.patternMatches.length === 0) {
      notes.push('Limited historical pattern matches available');
    }
    
    return notes;
  }

  /**
   * Get explanation statistics
   */
  getExplanationStats(): {
    totalExplanations: number;
    averageComplexity: string;
    verificationRate: number;
  } {
    // Mock statistics - in real implementation would track actual metrics
    return {
      totalExplanations: 0,
      averageComplexity: 'INTERMEDIATE',
      verificationRate: 0.85
    };
  }
}

/**
 * Factory function to create explanation generator
 */
export function createExplanationGenerator(config?: Partial<ExplanationConfig>): ExplanationGenerator {
  return new ExplanationGenerator(config);
}

export default ExplanationGenerator;