/**
 * Trading Signal Types and Interfaces
 * Comprehensive type definitions for trading signals, risk assessment, and recommendations
 */

/**
 * Signal action types
 */
export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL' | 'WATCH';

/**
 * Technical signal types (used in technical analysis)
 */
export type TechnicalSignal = 'BUY' | 'SELL' | 'NEUTRAL';

/**
 * Sentiment signal types (used in sentiment analysis)
 */
export type SentimentSignal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

/**
 * Signal strength levels
 */
export type SignalStrength = 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'VERY_WEAK';

/**
 * Signal time horizons
 */
export type TimeHorizon = 'INTRADAY' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

/**
 * Risk levels
 */
export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * Signal sources
 */
export type SignalSource = 'TECHNICAL' | 'SENTIMENT' | 'FUNDAMENTAL' | 'COMBINED' | 'PATTERN' | 'AI_MODEL';

/**
 * Market conditions
 */
export type MarketCondition = 'BULLISH' | 'BEARISH' | 'SIDEWAYS' | 'VOLATILE' | 'UNCERTAIN';

/**
 * Signal confidence factors
 */
export interface ConfidenceFactors {
  technicalConfidence: number;
  sentimentConfidence: number;
  fundamentalConfidence?: number;
  patternMatchConfidence: number;
  volumeConfidence: number;
  marketConditionConfidence: number;
  historicalAccuracy?: number;
}

/**
 * Technical indicators contributing to signal
 */
export interface TechnicalContributions {
  movingAverages: {
    signal: TechnicalSignal;
    weight: number;
    confidence: number;
    details: string;
  };
  rsi: {
    signal: TechnicalSignal;
    weight: number;
    confidence: number;
    value: number;
    details: string;
  };
  macd: {
    signal: TechnicalSignal;
    weight: number;
    confidence: number;
    details: string;
  };
  volume: {
    signal: TechnicalSignal;
    weight: number;
    confidence: number;
    details: string;
  };
  support_resistance: {
    nearSupport: boolean;
    nearResistance: boolean;
    supportLevel?: number;
    resistanceLevel?: number;
    details: string;
  };
}

/**
 * Sentiment factors contributing to signal
 */
export interface SentimentContributions {
  newsImpact: {
    signal: SentimentSignal;
    weight: number;
    confidence: number;
    newsCount: number;
    sentimentScore: number;
    details: string;
  };
  socialSentiment?: {
    signal: SentimentSignal;
    weight: number;
    confidence: number;
    details: string;
  };
  analystSentiment?: {
    signal: SentimentSignal;
    weight: number;
    confidence: number;
    details: string;
  };
  marketSentiment: {
    signal: SentimentSignal;
    weight: number;
    confidence: number;
    details: string;
  };
}

/**
 * Risk assessment details
 */
export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  factors: {
    volatilityRisk: number;
    liquidityRisk: number;
    concentrationRisk: number;
    marketRisk: number;
    sentimentRisk: number;
    technicalRisk: number;
  };
  warnings: string[];
  recommendations: string[];
  maxPositionSize?: number; // Percentage of portfolio
  stopLossLevel?: number;
  takeProfitLevel?: number;
}

/**
 * Pattern matching information
 */
export interface PatternMatch {
  patternName: string;
  similarity: number;
  historicalOutcome: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  averageReturn: number;
  successRate: number;
  timeToTarget: number; // Days
  confidence: number;
  description: string;
}

/**
 * Market context information
 */
export interface MarketContext {
  condition: MarketCondition;
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  volume: 'LOW' | 'MEDIUM' | 'HIGH';
  sector: string;
  marketCap: 'SMALL' | 'MID' | 'LARGE' | 'MEGA';
  correlation: {
    market: number;
    sector: number;
    peers: number;
  };
}

/**
 * Price targets and projections
 */
export interface PriceTargets {
  timeHorizon: TimeHorizon;
  targets: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  probability: {
    upside: number;
    downside: number;
  };
  keyLevels: {
    support: number[];
    resistance: number[];
  };
}

/**
 * Main trading signal interface
 */
export interface TradingSignal {
  // Basic signal information
  id: string;
  ticker: string;
  timestamp: Date;
  action: SignalAction;
  strength: SignalStrength;
  confidence: number; // 0-1
  
  // Signal details
  source: SignalSource;
  timeHorizon: TimeHorizon;
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  
  // Analysis components
  technicalContributions: TechnicalContributions;
  sentimentContributions: SentimentContributions;
  riskAssessment: RiskAssessment;
  
  // Context and patterns
  marketContext: MarketContext;
  patternMatches: PatternMatch[];
  priceTargets: PriceTargets;
  
  // Confidence breakdown
  confidenceFactors: ConfidenceFactors;
  
  // Reasoning and explanations
  reasoning: string;
  keyFactors: string[];
  warnings: string[];
  
  // Metadata
  version: string;
  modelVersion?: string;
  backtestResults?: {
    accuracy: number;
    avgReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  
  // Validity and updates
  validUntil: Date;
  lastUpdated: Date;
  updateFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
}

/**
 * Signal generation request
 */
export interface SignalRequest {
  ticker: string;
  timeHorizon?: TimeHorizon;
  riskTolerance?: RiskLevel;
  analysisDepth?: 'QUICK' | 'STANDARD' | 'COMPREHENSIVE';
  includePatterns?: boolean;
  includeBacktest?: boolean;
  customWeights?: {
    technical?: number;
    sentiment?: number;
    fundamental?: number;
  };
}

/**
 * Batch signal generation result
 */
export interface BatchSignalResult {
  signals: TradingSignal[];
  summary: {
    totalAnalyzed: number;
    signalsGenerated: number;
    averageConfidence: number;
    actionBreakdown: { [action in SignalAction]: number };
    timeGenerated: Date;
    processingTime: number;
  };
  errors: Array<{
    ticker: string;
    error: string;
  }>;
}

/**
 * Historical signal performance
 */
export interface SignalPerformance {
  signalId: string;
  ticker: string;
  originalSignal: TradingSignal;
  outcome: {
    actualReturn: number;
    timeToTarget: number;
    maxGain: number;
    maxLoss: number;
    hitTarget: boolean;
    hitStopLoss: boolean;
  };
  accuracy: 'CORRECT' | 'INCORRECT' | 'PARTIAL';
  lessons: string[];
}

/**
 * Signal validation rules
 */
export interface SignalValidation {
  rules: {
    minimumConfidence: number;
    maximumRisk: RiskLevel;
    requiredIndicators: string[];
    blacklistedTickers: string[];
    marketConditions: MarketCondition[];
  };
  checks: {
    passed: string[];
    failed: string[];
    warnings: string[];
  };
  isValid: boolean;
}

/**
 * Real-time signal update
 */
export interface SignalUpdate {
  signalId: string;
  ticker: string;
  timestamp: Date;
  changes: {
    confidence?: number;
    action?: SignalAction;
    targetPrice?: number;
    stopLoss?: number;
    riskLevel?: RiskLevel;
  };
  reason: string;
  autoGenerated: boolean;
}

/**
 * Portfolio signal allocation
 */
export interface PortfolioSignal {
  signals: TradingSignal[];
  allocation: {
    ticker: string;
    weight: number;
    action: SignalAction;
    reasoning: string;
  }[];
  portfolioMetrics: {
    expectedReturn: number;
    risk: number;
    sharpeRatio: number;
    diversification: number;
  };
  rebalancing: {
    required: boolean;
    suggestions: string[];
  };
}

/**
 * Signal monitoring configuration
 */
export interface SignalMonitoring {
  ticker: string;
  signalId: string;
  triggers: {
    priceChange: number; // Percentage
    volumeSpike: number; // Multiple of average
    newsEvents: boolean;
    timeDecay: boolean;
  };
  notifications: {
    email?: boolean;
    webhook?: string;
    frequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY';
  };
  autoActions: {
    updateSignal: boolean;
    closePosition: boolean;
    rebalance: boolean;
  };
}

/**
 * Signal aggregation for multi-timeframe analysis
 */
export interface MultiTimeframeSignal {
  ticker: string;
  signals: {
    intraday: TradingSignal;
    shortTerm: TradingSignal;
    mediumTerm: TradingSignal;
    longTerm: TradingSignal;
  };
  consensus: {
    action: SignalAction;
    confidence: number;
    agreement: number; // 0-1, how much signals agree
  };
  conflicts: string[];
  recommendations: string[];
}

/**
 * Signal factory configuration
 */
export interface SignalConfig {
  weights: {
    technical: number;
    sentiment: number;
    fundamental: number;
    pattern: number;
  };
  thresholds: {
    minimumConfidence: number;
    strongSignalThreshold: number;
    riskAdjustment: number;
  };
  features: {
    usePatternMatching: boolean;
    useVectorSearch: boolean;
    useBacktesting: boolean;
    useRealTimeData: boolean;
  };
  timeouts: {
    analysisTimeout: number;
    dataFetchTimeout: number;
  };
}

/**
 * Export utility types
 */
export type { TradingSignal as DefaultTradingSignal };

/**
 * Signal type guards
 */
export function isTradingSignal(obj: any): obj is TradingSignal {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.ticker === 'string' &&
    obj.timestamp instanceof Date &&
    ['BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL', 'WATCH'].includes(obj.action) &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 && obj.confidence <= 1
  );
}

export function isValidSignalAction(action: string): action is SignalAction {
  return ['BUY', 'SELL', 'HOLD', 'STRONG_BUY', 'STRONG_SELL', 'WATCH'].includes(action);
}

export function isValidRiskLevel(risk: string): risk is RiskLevel {
  return ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(risk);
}

/**
 * Signal utilities
 */
export const SignalUtils = {
  /**
   * Calculate overall signal score
   */
  calculateSignalScore(signal: TradingSignal): number {
    const actionScores = {
      'STRONG_BUY': 1.0,
      'BUY': 0.5,
      'WATCH': 0.1,
      'HOLD': 0.0,
      'SELL': -0.5,
      'STRONG_SELL': -1.0
    };
    
    const actionScore = actionScores[signal.action];
    return actionScore * signal.confidence;
  },

  /**
   * Determine if signal is bullish
   */
  isBullishSignal(signal: TradingSignal): boolean {
    return ['BUY', 'STRONG_BUY'].includes(signal.action);
  },

  /**
   * Determine if signal is bearish
   */
  isBearishSignal(signal: TradingSignal): boolean {
    return ['SELL', 'STRONG_SELL'].includes(signal.action);
  },

  /**
   * Get signal priority
   */
  getSignalPriority(signal: TradingSignal): number {
    const strengthWeights = {
      'VERY_STRONG': 5,
      'STRONG': 4,
      'MODERATE': 3,
      'WEAK': 2,
      'VERY_WEAK': 1
    };
    
    return strengthWeights[signal.strength] * signal.confidence;
  },

  /**
   * Check if signal is expired
   */
  isSignalExpired(signal: TradingSignal): boolean {
    return new Date() > signal.validUntil;
  }
};

export default {
  SignalUtils,
  isTradingSignal,
  isValidSignalAction,
  isValidRiskLevel
};