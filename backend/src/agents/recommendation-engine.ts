/**
 * Recommendation Engine
 * Generates comprehensive investment recommendations based on multiple analysis sources
 */

import {
  TradingSignal,
  SignalAction,
  SignalStrength,
  TimeHorizon,
  RiskLevel,
  PortfolioSignal,
  MultiTimeframeSignal,
  PriceTargets
} from '../types/trading-signals.js';

import { TechnicalAnalysis } from './technical-analysis.js';
import { SentimentAnalysis } from '../utils/sentiment-calculator.js';
import { RiskAssessment } from '../types/trading-signals.js';
import { StorageAdapter } from './technical-analysis.js';

/**
 * Recommendation configuration
 */
export interface RecommendationConfig {
  weights: {
    technical: number;
    sentiment: number;
    risk: number;
    momentum: number;
    value: number;
  };
  thresholds: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  riskAdjustment: {
    enabled: boolean;
    conservativeMultiplier: number;
    aggressiveMultiplier: number;
  };
  timeHorizonWeights: {
    [key in TimeHorizon]: {
      technical: number;
      sentiment: number;
      fundamental: number;
    };
  };
}

/**
 * Investment recommendation
 */
export interface InvestmentRecommendation {
  ticker: string;
  action: SignalAction;
  strength: SignalStrength;
  confidence: number;
  timeHorizon: TimeHorizon;
  
  // Price and targets
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  potentialReturn: number;
  riskRewardRatio: number;
  
  // Analysis summary
  technicalSummary: string;
  sentimentSummary: string;
  riskSummary: string;
  
  // Key factors
  bullishFactors: string[];
  bearishFactors: string[];
  keyRisks: string[];
  catalysts: string[];
  
  // Position sizing
  recommendedAllocation: number;
  maxAllocation: number;
  
  // Timing
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  validUntil: Date;
  nextReviewDate: Date;
  
  // Supporting data
  similarHistoricalOutcomes: Array<{
    date: Date;
    outcome: number;
    timeToTarget: number;
  }>;
  
  // Disclaimers and warnings
  disclaimers: string[];
  warnings: string[];
}

/**
 * Portfolio-level recommendation
 */
export interface PortfolioRecommendation {
  overallAction: 'AGGRESSIVE_GROWTH' | 'MODERATE_GROWTH' | 'CONSERVATIVE' | 'DEFENSIVE' | 'CASH';
  riskLevel: RiskLevel;
  expectedReturn: number;
  expectedVolatility: number;
  
  recommendations: InvestmentRecommendation[];
  
  // Portfolio adjustments
  rebalancing: Array<{
    ticker: string;
    currentWeight: number;
    targetWeight: number;
    action: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
    reasoning: string;
  }>;
  
  // Diversification
  sectorAllocation: { [sector: string]: number };
  geographicAllocation: { [region: string]: number };
  
  // Risk management
  hedging: Array<{
    instrument: string;
    purpose: string;
    allocation: number;
  }>;
  
  // Market outlook
  marketOutlook: {
    shortTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    mediumTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    longTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyThemes: string[];
  };
  
  // Performance expectations
  performance: {
    expectedReturn1M: number;
    expectedReturn3M: number;
    expectedReturn1Y: number;
    confidence: number;
  };
}

/**
 * Sector analysis and recommendations
 */
export interface SectorRecommendation {
  sector: string;
  rating: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
  outlook: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  
  drivers: string[];
  risks: string[];
  
  topPicks: Array<{
    ticker: string;
    ranking: number;
    rationale: string;
  }>;
  
  allocation: {
    current: number;
    target: number;
    adjustment: number;
  };
}

/**
 * Recommendation Engine Class
 */
export class RecommendationEngine {
  private storage: StorageAdapter;
  private config: Required<RecommendationConfig>;

  constructor(
    storage: StorageAdapter,
    config: Partial<RecommendationConfig> = {}
  ) {
    this.storage = storage;
    this.config = {
      weights: {
        technical: 0.30,
        sentiment: 0.25,
        risk: 0.20,
        momentum: 0.15,
        value: 0.10,
        ...config.weights
      },
      thresholds: {
        strongBuy: 0.8,
        buy: 0.6,
        hold: 0.4,
        sell: 0.2,
        strongSell: 0.0,
        ...config.thresholds
      },
      riskAdjustment: {
        enabled: true,
        conservativeMultiplier: 0.8,
        aggressiveMultiplier: 1.2,
        ...config.riskAdjustment
      },
      timeHorizonWeights: {
        INTRADAY: { technical: 0.7, sentiment: 0.2, fundamental: 0.1 },
        SHORT_TERM: { technical: 0.5, sentiment: 0.3, fundamental: 0.2 },
        MEDIUM_TERM: { technical: 0.4, sentiment: 0.3, fundamental: 0.3 },
        LONG_TERM: { technical: 0.2, sentiment: 0.2, fundamental: 0.6 },
        ...config.timeHorizonWeights
      }
    };
  }

  /**
   * Generate comprehensive investment recommendation
   */
  async generateRecommendation(
    ticker: string,
    technicalAnalysis: TechnicalAnalysis,
    sentimentAnalysis: SentimentAnalysis,
    riskAssessment: RiskAssessment,
    timeHorizon: TimeHorizon = 'MEDIUM_TERM'
  ): Promise<InvestmentRecommendation> {
    // Calculate composite score
    const compositeScore = this.calculateCompositeScore(
      technicalAnalysis,
      sentimentAnalysis,
      riskAssessment,
      timeHorizon
    );

    // Determine action and strength
    const { action, strength } = this.mapScoreToAction(compositeScore);

    // Calculate price targets
    const priceTargets = this.calculatePriceTargets(
      technicalAnalysis,
      sentimentAnalysis,
      timeHorizon
    );

    // Generate summaries
    const summaries = this.generateAnalysisSummaries(
      technicalAnalysis,
      sentimentAnalysis,
      riskAssessment
    );

    // Identify factors and risks
    const factors = this.identifyKeyFactors(
      technicalAnalysis,
      sentimentAnalysis,
      riskAssessment
    );

    // Calculate position sizing
    const allocation = this.calculateAllocation(riskAssessment, compositeScore);

    // Determine timing and urgency
    const timing = this.assessTiming(technicalAnalysis, sentimentAnalysis);

    // Get historical context
    const historicalContext = await this.getHistoricalContext(ticker, action);

    return {
      ticker,
      action,
      strength,
      confidence: compositeScore,
      timeHorizon,
      
      currentPrice: technicalAnalysis.currentPrice,
      targetPrice: priceTargets.targets.moderate,
      stopLoss: riskAssessment.stopLossLevel || priceTargets.keyLevels.support[0],
      potentialReturn: this.calculatePotentialReturn(
        technicalAnalysis.currentPrice,
        priceTargets.targets.moderate
      ),
      riskRewardRatio: this.calculateRiskRewardRatio(
        technicalAnalysis.currentPrice,
        priceTargets.targets.moderate,
        riskAssessment.stopLossLevel || priceTargets.keyLevels.support[0]
      ),
      
      technicalSummary: summaries.technical,
      sentimentSummary: summaries.sentiment,
      riskSummary: summaries.risk,
      
      bullishFactors: factors.bullish,
      bearishFactors: factors.bearish,
      keyRisks: factors.risks,
      catalysts: factors.catalysts,
      
      recommendedAllocation: allocation.recommended,
      maxAllocation: allocation.maximum,
      
      urgency: timing.urgency,
      validUntil: timing.validUntil,
      nextReviewDate: timing.nextReview,
      
      similarHistoricalOutcomes: historicalContext,
      
      disclaimers: this.generateDisclaimers(action, riskAssessment),
      warnings: this.generateWarnings(riskAssessment, technicalAnalysis)
    };
  }

  /**
   * Generate portfolio-level recommendations
   */
  async generatePortfolioRecommendation(
    positions: Array<{
      ticker: string;
      weight: number;
      technicalAnalysis: TechnicalAnalysis;
      sentimentAnalysis: SentimentAnalysis;
      riskAssessment: RiskAssessment;
    }>,
    riskTolerance: RiskLevel = 'MEDIUM',
    timeHorizon: TimeHorizon = 'MEDIUM_TERM'
  ): Promise<PortfolioRecommendation> {
    // Generate individual recommendations
    const recommendations: InvestmentRecommendation[] = [];
    for (const position of positions) {
      const recommendation = await this.generateRecommendation(
        position.ticker,
        position.technicalAnalysis,
        position.sentimentAnalysis,
        position.riskAssessment,
        timeHorizon
      );
      recommendations.push(recommendation);
    }

    // Calculate portfolio metrics
    const portfolioMetrics = this.calculatePortfolioMetrics(recommendations, positions);

    // Determine overall action
    const overallAction = this.determineOverallPortfolioAction(
      recommendations,
      riskTolerance
    );

    // Generate rebalancing recommendations
    const rebalancing = this.generateRebalancingRecommendations(
      positions,
      recommendations,
      riskTolerance
    );

    // Analyze sector allocation
    const sectorAnalysis = this.analyzeSectorAllocation(recommendations);

    // Generate market outlook
    const marketOutlook = this.generateMarketOutlook(recommendations);

    // Calculate performance expectations
    const performance = this.calculatePerformanceExpectations(
      recommendations,
      timeHorizon
    );

    return {
      overallAction,
      riskLevel: this.assessPortfolioRisk(recommendations),
      expectedReturn: portfolioMetrics.expectedReturn,
      expectedVolatility: portfolioMetrics.expectedVolatility,
      
      recommendations,
      rebalancing,
      
      sectorAllocation: sectorAnalysis.allocation,
      geographicAllocation: { 'US': 0.7, 'International': 0.3 }, // Simplified
      
      hedging: this.generateHedgingRecommendations(riskTolerance, portfolioMetrics),
      
      marketOutlook,
      performance
    };
  }

  /**
   * Generate sector-specific recommendations
   */
  async generateSectorRecommendations(
    sectors: string[],
    marketConditions: 'BULL' | 'BEAR' | 'NEUTRAL' = 'NEUTRAL'
  ): Promise<SectorRecommendation[]> {
    const sectorRecommendations: SectorRecommendation[] = [];

    for (const sector of sectors) {
      // Analyze sector fundamentals (simplified)
      const sectorData = await this.analyzeSector(sector, marketConditions);
      
      sectorRecommendations.push({
        sector,
        rating: sectorData.rating,
        outlook: sectorData.outlook,
        drivers: sectorData.drivers,
        risks: sectorData.risks,
        topPicks: sectorData.topPicks,
        allocation: sectorData.allocation
      });
    }

    return sectorRecommendations.sort((a, b) => {
      const ratingOrder = { 'OVERWEIGHT': 3, 'NEUTRAL': 2, 'UNDERWEIGHT': 1 };
      return ratingOrder[b.rating] - ratingOrder[a.rating];
    });
  }

  // Private helper methods

  private calculateCompositeScore(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment,
    timeHorizon: TimeHorizon
  ): number {
    const weights = this.config.timeHorizonWeights[timeHorizon];
    
    // Normalize scores to 0-1 range
    const technicalScore = this.normalizeTechnicalScore(technical);
    const sentimentScore = this.normalizeSentimentScore(sentiment);
    const riskScore = 1 - (risk.riskScore / 100); // Invert risk score
    
    // Calculate weighted composite
    let composite = (
      technicalScore * weights.technical +
      sentimentScore * weights.sentiment +
      riskScore * this.config.weights.risk
    );
    
    // Apply risk adjustment if enabled
    if (this.config.riskAdjustment.enabled) {
      if (risk.overallRisk === 'HIGH' || risk.overallRisk === 'VERY_HIGH') {
        composite *= this.config.riskAdjustment.conservativeMultiplier;
      } else if (risk.overallRisk === 'LOW' || risk.overallRisk === 'VERY_LOW') {
        composite *= this.config.riskAdjustment.aggressiveMultiplier;
      }
    }
    
    return Math.max(0, Math.min(1, composite));
  }

  private normalizeTechnicalScore(technical: TechnicalAnalysis): number {
    const signalScores = {
      'STRONG_BUY': 1.0,
      'BUY': 0.75,
      'HOLD': 0.5,
      'NEUTRAL': 0.5,
      'SELL': 0.25,
      'STRONG_SELL': 0.0
    };
    
    const baseScore = signalScores[technical.overallSignal] || 0.5;
    return baseScore * technical.confidence;
  }

  private normalizeSentimentScore(sentiment: SentimentAnalysis): number {
    // Convert sentiment score (-1 to 1) to 0-1 range
    const normalizedSentiment = (sentiment.sentimentScore + 1) / 2;
    return normalizedSentiment * sentiment.confidence;
  }

  private mapScoreToAction(score: number): { action: SignalAction; strength: SignalStrength } {
    if (score >= this.config.thresholds.strongBuy) {
      return { action: 'STRONG_BUY', strength: 'VERY_STRONG' };
    } else if (score >= this.config.thresholds.buy) {
      return { action: 'BUY', strength: score > 0.7 ? 'STRONG' : 'MODERATE' };
    } else if (score >= this.config.thresholds.hold) {
      return { action: 'HOLD', strength: 'MODERATE' };
    } else if (score >= this.config.thresholds.sell) {
      return { action: 'SELL', strength: 'MODERATE' };
    } else {
      return { action: 'STRONG_SELL', strength: 'STRONG' };
    }
  }

  private calculatePriceTargets(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    timeHorizon: TimeHorizon
  ): PriceTargets {
    const currentPrice = technical.currentPrice;
    const volatility = 0.02; // Simplified - would calculate from historical data
    
    // Base targets on time horizon
    const horizonMultipliers = {
      'INTRADAY': { conservative: 0.01, moderate: 0.02, aggressive: 0.03 },
      'SHORT_TERM': { conservative: 0.03, moderate: 0.05, aggressive: 0.08 },
      'MEDIUM_TERM': { conservative: 0.08, moderate: 0.12, aggressive: 0.18 },
      'LONG_TERM': { conservative: 0.15, moderate: 0.25, aggressive: 0.40 }
    };
    
    const multipliers = horizonMultipliers[timeHorizon];
    
    // Adjust based on sentiment
    const sentimentAdjustment = sentiment.sentimentScore * 0.5;
    
    return {
      timeHorizon,
      targets: {
        conservative: currentPrice * (1 + multipliers.conservative + sentimentAdjustment),
        moderate: currentPrice * (1 + multipliers.moderate + sentimentAdjustment),
        aggressive: currentPrice * (1 + multipliers.aggressive + sentimentAdjustment)
      },
      probability: {
        upside: sentiment.sentimentScore > 0 ? 0.6 + sentiment.confidence * 0.2 : 0.4,
        downside: sentiment.sentimentScore < 0 ? 0.6 + sentiment.confidence * 0.2 : 0.4
      },
      keyLevels: {
        support: technical.supportLevels || [currentPrice * 0.95, currentPrice * 0.90],
        resistance: technical.resistanceLevels || [currentPrice * 1.05, currentPrice * 1.10]
      }
    };
  }

  private generateAnalysisSummaries(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment
  ): { technical: string; sentiment: string; risk: string } {
    const technical_summary = `Technical analysis shows ${technical.overallSignal.toLowerCase()} signal with ${(technical.confidence * 100).toFixed(0)}% confidence. ` +
      `Moving averages indicate ${technical.movingAverages.trend.toLowerCase()} trend.`;
    
    const sentiment_summary = `Market sentiment is ${sentiment.sentimentLabel.toLowerCase()} with ${sentiment.newsCount} recent news items. ` +
      `Overall impact appears ${sentiment.impact.toLowerCase()}.`;
    
    const risk_summary = `Risk assessment indicates ${risk.overallRisk.toLowerCase()} risk level. ` +
      `Key concerns include ${risk.warnings.slice(0, 2).join(' and ').toLowerCase()}.`;
    
    return {
      technical: technical_summary,
      sentiment: sentiment_summary,
      risk: risk_summary
    };
  }

  private identifyKeyFactors(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis,
    risk: RiskAssessment
  ): { bullish: string[]; bearish: string[]; risks: string[]; catalysts: string[] } {
    const bullish = [...(technical.bullishFactors || [])];
    const bearish = [...(technical.bearishFactors || [])];
    const risks = [...risk.warnings];
    const catalysts: string[] = [];
    
    // Add sentiment-based factors
    if (sentiment.sentimentScore > 0.3) {
      bullish.push(`Positive market sentiment (${sentiment.sentimentLabel})`);
    } else if (sentiment.sentimentScore < -0.3) {
      bearish.push(`Negative market sentiment (${sentiment.sentimentLabel})`);
    }
    
    // Add potential catalysts
    if (sentiment.newsCount > 10) {
      catalysts.push('High news volume indicating potential price movement');
    }
    
    if (technical.confidence > 0.8) {
      catalysts.push('Strong technical signal confirmation');
    }
    
    return { bullish, bearish, risks, catalysts };
  }

  private calculateAllocation(
    risk: RiskAssessment,
    confidence: number
  ): { recommended: number; maximum: number } {
    let baseAllocation = 0.05; // 5% base allocation
    
    // Adjust for confidence
    baseAllocation *= confidence;
    
    // Adjust for risk
    const riskMultipliers = {
      'VERY_LOW': 1.5,
      'LOW': 1.2,
      'MEDIUM': 1.0,
      'HIGH': 0.7,
      'VERY_HIGH': 0.4
    };
    
    baseAllocation *= riskMultipliers[risk.overallRisk];
    
    return {
      recommended: Math.max(0.01, Math.min(0.10, baseAllocation)),
      maximum: Math.min(0.15, baseAllocation * 1.5)
    };
  }

  private assessTiming(
    technical: TechnicalAnalysis,
    sentiment: SentimentAnalysis
  ): { urgency: 'HIGH' | 'MEDIUM' | 'LOW'; validUntil: Date; nextReview: Date } {
    let urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    
    // High urgency for strong signals
    if (technical.confidence > 0.8 && Math.abs(sentiment.sentimentScore) > 0.6) {
      urgency = 'HIGH';
    } else if (technical.confidence < 0.6 && Math.abs(sentiment.sentimentScore) < 0.3) {
      urgency = 'LOW';
    }
    
    const now = new Date();
    const validUntil = new Date(now.getTime() + (urgency === 'HIGH' ? 24 : urgency === 'MEDIUM' ? 72 : 168) * 60 * 60 * 1000);
    const nextReview = new Date(now.getTime() + (urgency === 'HIGH' ? 6 : urgency === 'MEDIUM' ? 24 : 72) * 60 * 60 * 1000);
    
    return { urgency, validUntil, nextReview };
  }

  private async getHistoricalContext(
    ticker: string,
    action: SignalAction
  ): Promise<Array<{ date: Date; outcome: number; timeToTarget: number }>> {
    // Simplified historical context - would query actual historical data
    return [
      { date: new Date('2023-01-15'), outcome: 0.08, timeToTarget: 14 },
      { date: new Date('2023-03-22'), outcome: -0.03, timeToTarget: 7 },
      { date: new Date('2023-06-10'), outcome: 0.12, timeToTarget: 21 }
    ];
  }

  private calculatePotentialReturn(currentPrice: number, targetPrice: number): number {
    return (targetPrice - currentPrice) / currentPrice;
  }

  private calculateRiskRewardRatio(currentPrice: number, targetPrice: number, stopLoss: number): number {
    const potentialGain = targetPrice - currentPrice;
    const potentialLoss = currentPrice - stopLoss;
    return potentialLoss > 0 ? potentialGain / potentialLoss : 0;
  }

  private generateDisclaimers(action: SignalAction, risk: RiskAssessment): string[] {
    const disclaimers = [
      'This recommendation is based on current market analysis and is subject to change',
      'Past performance does not guarantee future results',
      'All investments carry risk of loss'
    ];
    
    if (risk.overallRisk === 'HIGH' || risk.overallRisk === 'VERY_HIGH') {
      disclaimers.push('This is a high-risk recommendation suitable only for risk-tolerant investors');
    }
    
    return disclaimers;
  }

  private generateWarnings(risk: RiskAssessment, technical: TechnicalAnalysis): string[] {
    const warnings: string[] = [...risk.warnings];
    
    if (technical.confidence < 0.6) {
      warnings.push('Technical analysis shows mixed signals');
    }
    
    return warnings;
  }

  // Portfolio-level helper methods

  private calculatePortfolioMetrics(
    recommendations: InvestmentRecommendation[],
    positions: Array<{ weight: number }>
  ): { expectedReturn: number; expectedVolatility: number } {
    let weightedReturn = 0;
    let weightedVolatility = 0;
    
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      const weight = positions[i].weight;
      
      weightedReturn += rec.potentialReturn * weight;
      weightedVolatility += 0.2 * weight; // Simplified volatility estimate
    }
    
    return {
      expectedReturn: weightedReturn,
      expectedVolatility: weightedVolatility
    };
  }

  private determineOverallPortfolioAction(
    recommendations: InvestmentRecommendation[],
    riskTolerance: RiskLevel
  ): 'AGGRESSIVE_GROWTH' | 'MODERATE_GROWTH' | 'CONSERVATIVE' | 'DEFENSIVE' | 'CASH' {
    const actionScores: Record<SignalAction, number> = {
      'STRONG_BUY': 2,
      'BUY': 1,
      'HOLD': 0,
      'SELL': -1,
      'STRONG_SELL': -2,
      'WATCH': 0
    };
    
    const avgScore = recommendations.reduce((sum, rec) => 
      sum + actionScores[rec.action], 0) / recommendations.length;
    
    if (riskTolerance === 'HIGH' || riskTolerance === 'VERY_HIGH') {
      if (avgScore > 1) return 'AGGRESSIVE_GROWTH';
      if (avgScore > 0) return 'MODERATE_GROWTH';
    } else if (riskTolerance === 'LOW' || riskTolerance === 'VERY_LOW') {
      if (avgScore > 0.5) return 'CONSERVATIVE';
      if (avgScore < -0.5) return 'DEFENSIVE';
    }
    
    if (avgScore > 0.5) return 'MODERATE_GROWTH';
    if (avgScore < -0.5) return 'DEFENSIVE';
    return 'CONSERVATIVE';
  }

  private generateRebalancingRecommendations(
    positions: Array<{ ticker: string; weight: number }>,
    recommendations: InvestmentRecommendation[],
    riskTolerance: RiskLevel
  ): Array<{ ticker: string; currentWeight: number; targetWeight: number; action: 'INCREASE' | 'DECREASE' | 'MAINTAIN'; reasoning: string }> {
    return positions.map((position, index) => {
      const rec = recommendations[index];
      const currentWeight = position.weight;
      let targetWeight = currentWeight;
      let action: 'INCREASE' | 'DECREASE' | 'MAINTAIN' = 'MAINTAIN';
      let reasoning = 'No significant change recommended';
      
      // Adjust based on recommendation strength
      if (rec.action === 'STRONG_BUY' && rec.confidence > 0.8) {
        targetWeight = Math.min(0.15, currentWeight * 1.5);
        action = 'INCREASE';
        reasoning = 'Strong buy signal with high confidence';
      } else if (rec.action === 'STRONG_SELL') {
        targetWeight = Math.max(0.01, currentWeight * 0.5);
        action = 'DECREASE';
        reasoning = 'Strong sell signal - reduce exposure';
      }
      
      return {
        ticker: position.ticker,
        currentWeight,
        targetWeight,
        action,
        reasoning
      };
    });
  }

  private analyzeSectorAllocation(
    recommendations: InvestmentRecommendation[]
  ): { allocation: { [sector: string]: number } } {
    // Simplified sector analysis
    const sectors = ['Technology', 'Healthcare', 'Financial', 'Consumer', 'Industrial'];
    const allocation: { [sector: string]: number } = {};
    
    sectors.forEach((sector, index) => {
      allocation[sector] = 0.2; // Equal weight for simplification
    });
    
    return { allocation };
  }

  private generateMarketOutlook(recommendations: InvestmentRecommendation[]): {
    shortTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    mediumTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    longTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyThemes: string[];
  } {
    const bullishCount = recommendations.filter(r => 
      r.action === 'BUY' || r.action === 'STRONG_BUY').length;
    const bearishCount = recommendations.filter(r => 
      r.action === 'SELL' || r.action === 'STRONG_SELL').length;
    
    const outlookMapper = (bullish: number, bearish: number) => {
      if (bullish > bearish * 1.5) return 'BULLISH';
      if (bearish > bullish * 1.5) return 'BEARISH';
      return 'NEUTRAL';
    };
    
    return {
      shortTerm: outlookMapper(bullishCount, bearishCount),
      mediumTerm: outlookMapper(bullishCount, bearishCount),
      longTerm: 'NEUTRAL', // Simplified
      keyThemes: ['Technology innovation', 'Economic recovery', 'Market volatility']
    };
  }

  private calculatePerformanceExpectations(
    recommendations: InvestmentRecommendation[],
    timeHorizon: TimeHorizon
  ): { expectedReturn1M: number; expectedReturn3M: number; expectedReturn1Y: number; confidence: number } {
    const avgReturn = recommendations.reduce((sum, rec) => sum + rec.potentialReturn, 0) / recommendations.length;
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
    
    // Scale returns by time horizon
    const timeMultipliers = {
      'INTRADAY': { '1M': 0.1, '3M': 0.3, '1Y': 1.0 },
      'SHORT_TERM': { '1M': 0.3, '3M': 0.8, '1Y': 1.0 },
      'MEDIUM_TERM': { '1M': 0.2, '3M': 0.6, '1Y': 1.0 },
      'LONG_TERM': { '1M': 0.1, '3M': 0.3, '1Y': 1.0 }
    };
    
    const multipliers = timeMultipliers[timeHorizon];
    
    return {
      expectedReturn1M: avgReturn * multipliers['1M'],
      expectedReturn3M: avgReturn * multipliers['3M'],
      expectedReturn1Y: avgReturn * multipliers['1Y'],
      confidence: avgConfidence
    };
  }

  private assessPortfolioRisk(recommendations: InvestmentRecommendation[]): RiskLevel {
    const riskScores = {
      'VERY_LOW': 1,
      'LOW': 2,
      'MEDIUM': 3,
      'HIGH': 4,
      'VERY_HIGH': 5
    };
    
    // This would need to access risk assessments
    return 'MEDIUM'; // Simplified
  }

  private generateHedgingRecommendations(
    riskTolerance: RiskLevel,
    portfolioMetrics: { expectedReturn: number; expectedVolatility: number }
  ): Array<{ instrument: string; purpose: string; allocation: number }> {
    const hedging = [];
    
    if (riskTolerance === 'LOW' || riskTolerance === 'VERY_LOW') {
      hedging.push({
        instrument: 'VIX Options',
        purpose: 'Volatility hedge',
        allocation: 0.05
      });
    }
    
    if (portfolioMetrics.expectedVolatility > 0.3) {
      hedging.push({
        instrument: 'Treasury Bonds',
        purpose: 'Risk reduction',
        allocation: 0.10
      });
    }
    
    return hedging;
  }

  private async analyzeSector(
    sector: string,
    marketConditions: 'BULL' | 'BEAR' | 'NEUTRAL'
  ): Promise<{
    rating: 'OVERWEIGHT' | 'NEUTRAL' | 'UNDERWEIGHT';
    outlook: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    drivers: string[];
    risks: string[];
    topPicks: Array<{ ticker: string; ranking: number; rationale: string }>;
    allocation: { current: number; target: number; adjustment: number };
  }> {
    // Simplified sector analysis
    const sectorData = {
      'Technology': {
        rating: 'OVERWEIGHT' as const,
        outlook: 'POSITIVE' as const,
        drivers: ['AI innovation', 'Digital transformation', 'Cloud adoption'],
        risks: ['Valuation concerns', 'Regulatory pressure'],
        topPicks: [
          { ticker: 'AAPL', ranking: 1, rationale: 'Strong ecosystem and innovation' },
          { ticker: 'MSFT', ranking: 2, rationale: 'Cloud leadership and AI integration' }
        ]
      },
      'Healthcare': {
        rating: 'NEUTRAL' as const,
        outlook: 'NEUTRAL' as const,
        drivers: ['Aging demographics', 'Medical innovation'],
        risks: ['Drug pricing pressure', 'Regulatory changes'],
        topPicks: [
          { ticker: 'JNJ', ranking: 1, rationale: 'Diversified portfolio and strong pipeline' }
        ]
      }
    };
    
    const data = sectorData[sector as keyof typeof sectorData] || {
      rating: 'NEUTRAL' as const,
      outlook: 'NEUTRAL' as const,
      drivers: ['General market trends'],
      risks: ['Market volatility'],
      topPicks: []
    };
    
    return {
      ...data,
      allocation: {
        current: 0.2,
        target: (data.rating as any) === 'OVERWEIGHT' ? 0.25 : (data.rating as any) === 'UNDERWEIGHT' ? 0.15 : 0.2,
        adjustment: 0
      }
    };
  }
}

/**
 * Factory function to create RecommendationEngine
 */
export function createRecommendationEngine(
  storage: StorageAdapter,
  config?: Partial<RecommendationConfig>
): RecommendationEngine {
  return new RecommendationEngine(storage, config);
}

export default RecommendationEngine;