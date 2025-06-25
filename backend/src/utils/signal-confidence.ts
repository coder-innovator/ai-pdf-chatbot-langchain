/**
 * Signal Confidence Calculation Utilities
 * Advanced confidence scoring for trading signals based on multiple factors
 */

import {
  TradingSignal,
  ConfidenceFactors,
  TechnicalContributions,
  SentimentContributions,
  RiskAssessment,
  PatternMatch,
  MarketContext,
  SignalAction,
  SignalStrength
} from '../types/trading-signals.js';

import { TechnicalAnalysis } from '../agents/technical-analysis.js';
import { SentimentAnalysis } from '../utils/sentiment-calculator.js';

/**
 * Confidence calculation configuration
 */
export interface ConfidenceConfig {
  weights: {
    technical: number;
    sentiment: number;
    pattern: number;
    volume: number;
    marketCondition: number;
    risk: number;
  };
  penalties: {
    conflictingSignals: number;
    lowVolume: number;
    highVolatility: number;
    uncertainMarket: number;
  };
  bonuses: {
    multipleConfirmations: number;
    strongTrend: number;
    clearBreakout: number;
    majorNews: number;
  };
}

/**
 * Signal agreement analysis
 */
export interface SignalAgreement {
  technicalSentimentAlignment: number;
  indicatorConsensus: number;
  patternConfirmation: number;
  conflictingSources: string[];
  supportingFactors: string[];
  overallAgreement: number;
}

/**
 * Confidence breakdown for transparency
 */
export interface ConfidenceBreakdown {
  baseConfidence: number;
  technicalContribution: number;
  sentimentContribution: number;
  patternContribution: number;
  volumeContribution: number;
  marketContribution: number;
  riskAdjustment: number;
  penalties: number;
  bonuses: number;
  finalConfidence: number;
  explanation: string[];
}

/**
 * Default confidence configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  weights: {
    technical: 0.30,
    sentiment: 0.25,
    pattern: 0.20,
    volume: 0.10,
    marketCondition: 0.10,
    risk: 0.05
  },
  penalties: {
    conflictingSignals: -0.20,
    lowVolume: -0.10,
    highVolatility: -0.15,
    uncertainMarket: -0.10
  },
  bonuses: {
    multipleConfirmations: 0.15,
    strongTrend: 0.10,
    clearBreakout: 0.12,
    majorNews: 0.08
  }
};

/**
 * Calculate comprehensive signal confidence
 */
export function calculateSignalConfidence(
  technicalAnalysis: TechnicalAnalysis,
  sentimentAnalysis: SentimentAnalysis,
  patternMatches: PatternMatch[],
  marketContext: MarketContext,
  riskAssessment: RiskAssessment,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ConfidenceFactors {
  // Calculate individual confidence components
  const technicalConfidence = calculateTechnicalConfidence(technicalAnalysis);
  const sentimentConfidence = calculateSentimentConfidence(sentimentAnalysis);
  const patternMatchConfidence = calculatePatternConfidence(patternMatches);
  const volumeConfidence = calculateVolumeConfidence(marketContext);
  const marketConditionConfidence = calculateMarketConditionConfidence(marketContext);

  return {
    technicalConfidence,
    sentimentConfidence,
    patternMatchConfidence,
    volumeConfidence,
    marketConditionConfidence,
    historicalAccuracy: calculateHistoricalAccuracy(patternMatches)
  };
}

/**
 * Calculate technical analysis confidence
 */
export function calculateTechnicalConfidence(analysis: TechnicalAnalysis): number {
  let confidence = analysis.confidence || 0.5;
  
  // Adjust based on signal strength
  const signalStrengthBonus = getSignalStrengthBonus(analysis.overallSignal);
  confidence += signalStrengthBonus;
  
  // Check for multiple indicator confirmation
  const confirmationBonus = calculateIndicatorConfirmation(analysis);
  confidence += confirmationBonus;
  
  // Penalty for conflicting indicators
  const conflictPenalty = calculateIndicatorConflicts(analysis);
  confidence -= conflictPenalty;
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate sentiment analysis confidence
 */
export function calculateSentimentConfidence(analysis: SentimentAnalysis): number {
  let confidence = analysis.confidence || 0.5;
  
  // Boost confidence for high news volume
  if (analysis.newsCount > 10) {
    confidence += 0.1;
  } else if (analysis.newsCount > 5) {
    confidence += 0.05;
  }
  
  // Boost for strong sentiment
  const sentimentStrength = Math.abs(analysis.sentimentScore);
  if (sentimentStrength > 0.7) {
    confidence += 0.15;
  } else if (sentimentStrength > 0.4) {
    confidence += 0.08;
  }
  
  // Boost for improving trend
  if (analysis.trendDirection === 'Improving') {
    confidence += 0.1;
  } else if (analysis.trendDirection === 'Declining') {
    confidence -= 0.05;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate pattern matching confidence
 */
export function calculatePatternConfidence(patterns: PatternMatch[]): number {
  if (patterns.length === 0) return 0.3; // Base confidence without patterns
  
  // Find the best pattern match
  const bestPattern = patterns.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
  
  let confidence = bestPattern.confidence;
  
  // Boost for high success rate
  if (bestPattern.successRate > 0.8) {
    confidence += 0.15;
  } else if (bestPattern.successRate > 0.6) {
    confidence += 0.08;
  }
  
  // Boost for multiple confirming patterns
  const confirmingPatterns = patterns.filter(p => 
    p.historicalOutcome === bestPattern.historicalOutcome && p.confidence > 0.6
  );
  
  if (confirmingPatterns.length > 1) {
    confidence += Math.min(0.2, confirmingPatterns.length * 0.05);
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate volume confidence
 */
export function calculateVolumeConfidence(context: MarketContext): number {
  switch (context.volume) {
    case 'HIGH':
      return 0.9;
    case 'MEDIUM':
      return 0.7;
    case 'LOW':
      return 0.3;
    default:
      return 0.5;
  }
}

/**
 * Calculate market condition confidence
 */
export function calculateMarketConditionConfidence(context: MarketContext): number {
  let confidence = 0.5;
  
  // Clear trending markets have higher confidence
  if (context.trend === 'UP' || context.trend === 'DOWN') {
    confidence += 0.2;
  }
  
  // Low volatility increases confidence
  if (context.volatility === 'LOW') {
    confidence += 0.15;
  } else if (context.volatility === 'HIGH') {
    confidence -= 0.1;
  }
  
  // Market condition clarity
  switch (context.condition) {
    case 'BULLISH':
    case 'BEARISH':
      confidence += 0.1;
      break;
    case 'UNCERTAIN':
      confidence -= 0.15;
      break;
    case 'VOLATILE':
      confidence -= 0.1;
      break;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate historical accuracy from patterns
 */
export function calculateHistoricalAccuracy(patterns: PatternMatch[]): number {
  if (patterns.length === 0) return 0.5;
  
  const totalSuccessRate = patterns.reduce((sum, pattern) => 
    sum + pattern.successRate, 0
  );
  
  return totalSuccessRate / patterns.length;
}

/**
 * Analyze agreement between different signal sources
 */
export function analyzeSignalAgreement(
  technicalSignal: string,
  sentimentSignal: string,
  patternSignals: string[]
): SignalAgreement {
  const allSignals = [technicalSignal, sentimentSignal, ...patternSignals];
  const signalCounts = allSignals.reduce((counts, signal) => {
    counts[signal] = (counts[signal] || 0) + 1;
    return counts;
  }, {} as { [key: string]: number });
  
  // Find the most common signal
  const dominantSignal = Object.keys(signalCounts).reduce((a, b) => 
    signalCounts[a] > signalCounts[b] ? a : b
  );
  
  const agreement = signalCounts[dominantSignal] / allSignals.length;
  
  // Specific alignments
  const technicalSentimentAlignment = calculateAlignment(technicalSignal, sentimentSignal);
  
  const supportingFactors: string[] = [];
  const conflictingSources: string[] = [];
  
  if (technicalSignal === sentimentSignal) {
    supportingFactors.push('Technical and sentiment analysis agree');
  } else {
    conflictingSources.push('Technical and sentiment analysis disagree');
  }
  
  const agreeingPatterns = patternSignals.filter(p => p === dominantSignal).length;
  if (agreeingPatterns > 0) {
    supportingFactors.push(`${agreeingPatterns} pattern(s) support the signal`);
  }
  
  return {
    technicalSentimentAlignment,
    indicatorConsensus: agreement,
    patternConfirmation: agreeingPatterns / Math.max(1, patternSignals.length),
    conflictingSources,
    supportingFactors,
    overallAgreement: agreement
  };
}

/**
 * Generate detailed confidence breakdown
 */
export function generateConfidenceBreakdown(
  factors: ConfidenceFactors,
  agreement: SignalAgreement,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ConfidenceBreakdown {
  const baseConfidence = 0.5;
  const explanation: string[] = [`Starting with base confidence of ${baseConfidence.toFixed(2)}`];
  
  // Calculate weighted contributions
  const technicalContribution = factors.technicalConfidence * config.weights.technical;
  const sentimentContribution = factors.sentimentConfidence * config.weights.sentiment;
  const patternContribution = factors.patternMatchConfidence * config.weights.pattern;
  const volumeContribution = factors.volumeConfidence * config.weights.volume;
  const marketContribution = factors.marketConditionConfidence * config.weights.marketCondition;
  
  explanation.push(`Technical analysis: ${factors.technicalConfidence.toFixed(2)} × ${config.weights.technical} = ${technicalContribution.toFixed(3)}`);
  explanation.push(`Sentiment analysis: ${factors.sentimentConfidence.toFixed(2)} × ${config.weights.sentiment} = ${sentimentContribution.toFixed(3)}`);
  explanation.push(`Pattern matching: ${factors.patternMatchConfidence.toFixed(2)} × ${config.weights.pattern} = ${patternContribution.toFixed(3)}`);
  explanation.push(`Volume confirmation: ${factors.volumeConfidence.toFixed(2)} × ${config.weights.volume} = ${volumeContribution.toFixed(3)}`);
  explanation.push(`Market conditions: ${factors.marketConditionConfidence.toFixed(2)} × ${config.weights.marketCondition} = ${marketContribution.toFixed(3)}`);
  
  // Calculate bonuses and penalties
  let bonuses = 0;
  let penalties = 0;
  
  // Agreement bonus
  if (agreement.overallAgreement > 0.8) {
    bonuses += config.bonuses.multipleConfirmations;
    explanation.push(`Multiple confirmations bonus: +${config.bonuses.multipleConfirmations.toFixed(3)}`);
  }
  
  // Conflict penalty
  if (agreement.overallAgreement < 0.5) {
    penalties += Math.abs(config.penalties.conflictingSignals);
    explanation.push(`Conflicting signals penalty: ${config.penalties.conflictingSignals.toFixed(3)}`);
  }
  
  // Risk adjustment
  const riskAdjustment = -0.1; // Placeholder - would come from risk assessment
  
  // Calculate final confidence
  const finalConfidence = Math.max(0, Math.min(1,
    baseConfidence +
    technicalContribution +
    sentimentContribution +
    patternContribution +
    volumeContribution +
    marketContribution +
    bonuses +
    penalties +
    riskAdjustment
  ));
  
  explanation.push(`Final confidence: ${finalConfidence.toFixed(3)}`);
  
  return {
    baseConfidence,
    technicalContribution,
    sentimentContribution,
    patternContribution,
    volumeContribution,
    marketContribution,
    riskAdjustment,
    penalties,
    bonuses,
    finalConfidence,
    explanation
  };
}

/**
 * Validate signal confidence
 */
export function validateSignalConfidence(
  signal: TradingSignal,
  minimumConfidence: number = 0.6
): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check minimum confidence
  if (signal.confidence < minimumConfidence) {
    issues.push(`Confidence ${signal.confidence.toFixed(3)} below minimum ${minimumConfidence}`);
    recommendations.push('Consider requiring higher confidence threshold');
  }
  
  // Check for conflicting factors
  const factors = signal.confidenceFactors;
  const agreement = Math.abs(factors.technicalConfidence - factors.sentimentConfidence);
  if (agreement > 0.4) {
    issues.push('Large disagreement between technical and sentiment analysis');
    recommendations.push('Investigate conflicting signals before acting');
  }
  
  // Check pattern support
  if (factors.patternMatchConfidence < 0.3) {
    issues.push('Low pattern matching confidence');
    recommendations.push('Look for additional pattern confirmation');
  }
  
  // Check market conditions
  if (factors.marketConditionConfidence < 0.4) {
    issues.push('Uncertain market conditions');
    recommendations.push('Consider waiting for clearer market direction');
  }
  
  const isValid = issues.length === 0 && signal.confidence >= minimumConfidence;
  
  return { isValid, issues, recommendations };
}

/**
 * Calculate dynamic confidence thresholds based on market conditions
 */
export function calculateDynamicThresholds(
  marketContext: MarketContext,
  baseThreshold: number = 0.6
): {
  minimumConfidence: number;
  strongSignalThreshold: number;
  reasoning: string[];
} {
  let adjustment = 0;
  const reasoning: string[] = [];
  
  // Volatile markets require higher confidence
  if (marketContext.volatility === 'HIGH') {
    adjustment -= 0.1;
    reasoning.push('Lowered threshold due to high volatility');
  }
  
  // Uncertain markets require higher confidence
  if (marketContext.condition === 'UNCERTAIN') {
    adjustment -= 0.1;
    reasoning.push('Lowered threshold due to uncertain market conditions');
  }
  
  // Clear trends allow lower thresholds
  if (marketContext.trend !== 'SIDEWAYS' && marketContext.condition !== 'UNCERTAIN') {
    adjustment += 0.05;
    reasoning.push('Raised threshold due to clear market trend');
  }
  
  const minimumConfidence = Math.max(0.3, Math.min(0.9, baseThreshold + adjustment));
  const strongSignalThreshold = Math.min(0.95, minimumConfidence + 0.2);
  
  return {
    minimumConfidence,
    strongSignalThreshold,
    reasoning
  };
}

// Helper functions

function getSignalStrengthBonus(signal: string): number {
  const bonuses = {
    'STRONG_BUY': 0.15,
    'STRONG_SELL': 0.15,
    'BUY': 0.08,
    'SELL': 0.08,
    'HOLD': 0,
    'NEUTRAL': 0
  };
  return bonuses[signal as keyof typeof bonuses] || 0;
}

function calculateIndicatorConfirmation(analysis: TechnicalAnalysis): number {
  let confirmations = 0;
  let total = 0;
  
  // Count confirmations across different indicators
  const signals = [
    analysis.movingAverages.signal,
    analysis.overallSignal
  ];
  
  // Find the dominant signal
  const signalCounts = signals.reduce((counts, signal) => {
    counts[signal] = (counts[signal] || 0) + 1;
    return counts;
  }, {} as { [key: string]: number });
  
  const dominantSignal = Object.keys(signalCounts).reduce((a, b) => 
    signalCounts[a] > signalCounts[b] ? a : b
  );
  
  confirmations = signalCounts[dominantSignal];
  total = signals.length;
  
  const confirmationRatio = confirmations / total;
  
  // Return bonus based on confirmation ratio
  if (confirmationRatio >= 0.8) return 0.1;
  if (confirmationRatio >= 0.6) return 0.05;
  return 0;
}

function calculateIndicatorConflicts(analysis: TechnicalAnalysis): number {
  // Simplified conflict detection
  const signals = [analysis.movingAverages.signal, analysis.overallSignal];
  const uniqueSignals = new Set(signals);
  
  if (uniqueSignals.size > signals.length * 0.5) {
    return 0.1; // High conflict
  }
  
  return 0;
}

function calculateAlignment(signal1: string, signal2: string): number {
  const bullishSignals = ['BUY', 'STRONG_BUY', 'BULLISH'];
  const bearishSignals = ['SELL', 'STRONG_SELL', 'BEARISH'];
  const neutralSignals = ['HOLD', 'NEUTRAL'];
  
  const isBullish1 = bullishSignals.includes(signal1);
  const isBearish1 = bearishSignals.includes(signal1);
  const isNeutral1 = neutralSignals.includes(signal1);
  
  const isBullish2 = bullishSignals.includes(signal2);
  const isBearish2 = bearishSignals.includes(signal2);
  const isNeutral2 = neutralSignals.includes(signal2);
  
  if ((isBullish1 && isBullish2) || (isBearish1 && isBearish2) || (isNeutral1 && isNeutral2)) {
    return 1.0; // Perfect alignment
  }
  
  if ((isNeutral1 && !isNeutral2) || (!isNeutral1 && isNeutral2)) {
    return 0.5; // Partial alignment
  }
  
  return 0.0; // Opposite signals
}

/**
 * Default export with utility functions
 */
export default {
  calculateSignalConfidence,
  calculateTechnicalConfidence,
  calculateSentimentConfidence,
  calculatePatternConfidence,
  analyzeSignalAgreement,
  generateConfidenceBreakdown,
  validateSignalConfidence,
  calculateDynamicThresholds,
  DEFAULT_CONFIDENCE_CONFIG
};