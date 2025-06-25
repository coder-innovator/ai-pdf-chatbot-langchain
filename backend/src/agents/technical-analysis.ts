/**
 * Technical Analysis Agent
 * Main agent that coordinates technical indicators and provides comprehensive analysis
 */

import { 
  MarketDataPoint, 
  validateMarketData,
  extractPriceArrays
} from '../utils/technical-calculations.js';

import { 
  MovingAveragesIndicator, 
  MovingAverageAnalysis,
  MovingAverageSignal 
} from './indicators/moving-averages.js';

import { 
  RSIIndicator, 
  RSIAnalysis,
  RSISignal 
} from './indicators/rsi.js';

import { 
  MACDIndicator, 
  MACDAnalysis,
  MACDSignal 
} from './indicators/macd.js';

/**
 * Storage adapter interface for flexible data storage
 */
export interface StorageAdapter {
  select(table: string, options: {
    ticker?: string;
    limit?: number;
    orderBy?: string;
    where?: Record<string, any>;
  }): Promise<MarketDataPoint[]>;
  
  insert(table: string, data: MarketDataPoint[]): Promise<void>;
  update(table: string, id: string, data: Partial<MarketDataPoint>): Promise<void>;
  delete(table: string, id: string): Promise<void>;
}

/**
 * Overall technical analysis signal
 */
export type TechnicalSignal = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'NEUTRAL';

/**
 * Technical analysis result interface
 */
export interface TechnicalAnalysis {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  
  // Individual indicator results
  movingAverages: MovingAverageAnalysis;
  rsi: RSIAnalysis;
  macd: MACDAnalysis;
  
  // Overall assessment
  overallSignal: TechnicalSignal;
  recommendation: string;
  confidence: number;
  
  // Key levels
  supportLevels: number[];
  resistanceLevels: number[];
  
  // Risk metrics
  volatility: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  
  // Summary
  bullishFactors: string[];
  bearishFactors: string[];
}

/**
 * Analysis configuration options
 */
export interface AnalysisConfig {
  movingAverages?: {
    sma20?: boolean;
    sma50?: boolean;
    sma200?: boolean;
    ema12?: boolean;
    ema26?: boolean;
  };
  rsi?: {
    period?: number;
    overboughtLevel?: number;
    oversoldLevel?: number;
  };
  macd?: {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  };
  minimumDataPoints?: number;
}

/**
 * Technical Analysis Agent Class
 */
export class TechnicalAnalysisAgent {
  private storage: StorageAdapter;
  private config: Required<AnalysisConfig>;
  
  // Indicators
  private maIndicator: MovingAveragesIndicator;
  private rsiIndicator: RSIIndicator;
  private macdIndicator: MACDIndicator;
  
  constructor(storage: StorageAdapter, config: AnalysisConfig = {}) {
    this.storage = storage;
    this.config = {
      movingAverages: {
        sma20: true,
        sma50: true,
        sma200: true,
        ema12: true,
        ema26: true,
        ...config.movingAverages
      },
      rsi: {
        period: 14,
        overboughtLevel: 70,
        oversoldLevel: 30,
        ...config.rsi
      },
      macd: {
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        ...config.macd
      },
      minimumDataPoints: config.minimumDataPoints || 200
    };
    
    // Initialize indicators
    this.maIndicator = new MovingAveragesIndicator();
    this.rsiIndicator = new RSIIndicator(
      this.config.rsi.period,
      this.config.rsi.overboughtLevel,
      this.config.rsi.oversoldLevel
    );
    this.macdIndicator = new MACDIndicator(
      this.config.macd.fastPeriod,
      this.config.macd.slowPeriod,
      this.config.macd.signalPeriod
    );
  }

  /**
   * Analyze a stock with comprehensive technical analysis
   */
  async analyzeStock(ticker: string): Promise<TechnicalAnalysis> {
    // Get historical data from storage
    const historicalData = await this.storage.select('market_data', {
      ticker,
      limit: this.config.minimumDataPoints,
      orderBy: 'timestamp'
    });

    if (!historicalData || historicalData.length < 50) {
      throw new Error(`Insufficient data for ${ticker}. Need at least 50 data points.`);
    }

    if (!validateMarketData(historicalData)) {
      throw new Error(`Invalid market data for ${ticker}`);
    }

    // Update all indicators with historical data
    this.maIndicator.updateData(historicalData);
    this.rsiIndicator.updateData(historicalData);
    this.macdIndicator.updateData(historicalData);

    // Perform individual analyses
    const movingAverages = this.analyzeMovingAverages();
    const rsi = this.analyzeRSI();
    const macd = this.analyzeMACD();

    // Calculate overall assessment
    const currentPrice = historicalData[historicalData.length - 1].close;
    const overallSignal = this.calculateOverallSignal(movingAverages, rsi, macd);
    const recommendation = this.generateRecommendation(overallSignal, movingAverages, rsi, macd);
    const confidence = this.calculateConfidence(movingAverages, rsi, macd);

    // Identify key levels
    const supportLevels = this.identifySupportLevels(movingAverages, rsi);
    const resistanceLevels = this.identifyResistanceLevels(movingAverages, rsi);

    // Calculate risk metrics
    const volatility = this.calculateVolatility(historicalData);
    const riskLevel = this.assessRiskLevel(volatility, rsi.currentRSI, macd);

    // Generate factors
    const { bullishFactors, bearishFactors } = this.identifyMarketFactors(movingAverages, rsi, macd);

    return {
      ticker,
      timestamp: new Date(),
      currentPrice,
      movingAverages,
      rsi,
      macd,
      overallSignal,
      recommendation,
      confidence,
      supportLevels,
      resistanceLevels,
      volatility,
      riskLevel,
      bullishFactors,
      bearishFactors
    };
  }

  /**
   * Quick analysis with minimal data requirements
   */
  async quickAnalysis(ticker: string): Promise<Partial<TechnicalAnalysis>> {
    const historicalData = await this.storage.select('market_data', {
      ticker,
      limit: 50,
      orderBy: 'timestamp'
    });

    if (!historicalData || historicalData.length < 20) {
      throw new Error(`Insufficient data for quick analysis of ${ticker}`);
    }

    const currentPrice = historicalData[historicalData.length - 1].close;
    const { closes } = extractPriceArrays(historicalData);

    // Quick moving average analysis
    let maSignal: MovingAverageSignal = 'NEUTRAL';
    try {
      this.maIndicator.updateData(historicalData);
      maSignal = this.maIndicator.generateSignal();
    } catch {
      // Continue with neutral signal
    }

    // Quick RSI analysis
    let rsiSignal: RSISignal = 'NEUTRAL';
    try {
      this.rsiIndicator.updateData(historicalData);
      rsiSignal = this.rsiIndicator.generateSignal();
    } catch {
      // Continue with neutral signal
    }

    // Simple overall signal
    const overallSignal = this.simpleOverallSignal(maSignal, rsiSignal);

    return {
      ticker,
      timestamp: new Date(),
      currentPrice,
      overallSignal,
      recommendation: this.simpleRecommendation(overallSignal),
      confidence: 0.6 // Lower confidence for quick analysis
    };
  }

  /**
   * Batch analyze multiple stocks
   */
  async batchAnalyze(tickers: string[]): Promise<{ [ticker: string]: TechnicalAnalysis }> {
    const results: { [ticker: string]: TechnicalAnalysis } = {};
    
    for (const ticker of tickers) {
      try {
        results[ticker] = await this.analyzeStock(ticker);
      } catch (error) {
        console.warn(`Failed to analyze ${ticker}:`, error);
        // Continue with other tickers
      }
    }
    
    return results;
  }

  /**
   * Generate market screening results
   */
  async screenMarket(
    tickers: string[],
    criteria: {
      signal?: TechnicalSignal[];
      minConfidence?: number;
      rsiRange?: { min: number; max: number };
      trend?: ('UPTREND' | 'DOWNTREND' | 'SIDEWAYS')[];
    }
  ): Promise<TechnicalAnalysis[]> {
    const allAnalyses = await this.batchAnalyze(tickers);
    const results: TechnicalAnalysis[] = [];

    for (const analysis of Object.values(allAnalyses)) {
      let matches = true;

      // Check signal criteria
      if (criteria.signal && !criteria.signal.includes(analysis.overallSignal)) {
        matches = false;
      }

      // Check confidence criteria
      if (criteria.minConfidence && analysis.confidence < criteria.minConfidence) {
        matches = false;
      }

      // Check RSI criteria
      if (criteria.rsiRange) {
        const rsi = analysis.rsi.currentRSI;
        if (rsi < criteria.rsiRange.min || rsi > criteria.rsiRange.max) {
          matches = false;
        }
      }

      // Check trend criteria
      if (criteria.trend && !criteria.trend.includes(analysis.movingAverages.trend)) {
        matches = false;
      }

      if (matches) {
        results.push(analysis);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // Private analysis methods

  private analyzeMovingAverages(): MovingAverageAnalysis {
    try {
      return this.maIndicator.analyze();
    } catch (error) {
      throw new Error(`Moving averages analysis failed: ${error}`);
    }
  }

  private analyzeRSI(): RSIAnalysis {
    try {
      return this.rsiIndicator.analyze();
    } catch (error) {
      throw new Error(`RSI analysis failed: ${error}`);
    }
  }

  private analyzeMACD(): MACDAnalysis {
    try {
      return this.macdIndicator.analyze();
    } catch (error) {
      throw new Error(`MACD analysis failed: ${error}`);
    }
  }

  private calculateOverallSignal(
    ma: MovingAverageAnalysis,
    rsi: RSIAnalysis,
    macd: MACDAnalysis
  ): TechnicalSignal {
    const signals = {
      ma: this.mapMASignal(ma.signal),
      rsi: this.mapRSISignal(rsi.signal),
      macd: this.mapMACDSignal(macd.signal)
    };

    // Weight the signals
    const weights = { ma: 0.4, rsi: 0.3, macd: 0.3 };
    let totalScore = 0;
    let totalWeight = 0;

    for (const [indicator, signal] of Object.entries(signals)) {
      const weight = weights[indicator as keyof typeof weights];
      totalScore += this.getSignalScore(signal) * weight;
      totalWeight += weight;
    }

    const avgScore = totalScore / totalWeight;

    // Convert score to signal
    if (avgScore >= 0.6) return 'STRONG_BUY';
    if (avgScore >= 0.2) return 'BUY';
    if (avgScore >= -0.2) return 'HOLD';
    if (avgScore >= -0.6) return 'SELL';
    return 'STRONG_SELL';
  }

  private calculateConfidence(
    ma: MovingAverageAnalysis,
    rsi: RSIAnalysis,
    macd: MACDAnalysis
  ): number {
    const confidences = [ma.confidence, rsi.confidence, macd.confidence];
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    // Boost confidence if indicators agree
    const signals = [
      this.mapMASignal(ma.signal),
      this.mapRSISignal(rsi.signal),
      this.mapMACDSignal(macd.signal)
    ];

    const signalScores = signals.map(this.getSignalScore);
    const maxScore = Math.max(...signalScores);
    const minScore = Math.min(...signalScores);
    const agreement = 1 - (maxScore - minScore) / 2; // 0 to 1

    return Math.min(0.95, avgConfidence * (0.7 + agreement * 0.3));
  }

  private generateRecommendation(
    overallSignal: TechnicalSignal,
    ma: MovingAverageAnalysis,
    rsi: RSIAnalysis,
    macd: MACDAnalysis
  ): string {
    const recommendations: { [key in TechnicalSignal]: string } = {
      'STRONG_BUY': 'Strong buy signal with multiple confirmations. Consider entering position.',
      'BUY': 'Buy signal detected. Monitor for entry opportunity.',
      'HOLD': 'Mixed signals suggest holding current position or waiting for clearer direction.',
      'SELL': 'Sell signal detected. Consider reducing position or taking profits.',
      'STRONG_SELL': 'Strong sell signal with multiple confirmations. Consider exiting position.',
      'NEUTRAL': 'No clear directional bias. Wait for more definitive signals.'
    };

    let base = recommendations[overallSignal];

    // Add specific insights
    if (rsi.currentRSI > 70) {
      base += ' RSI indicates overbought conditions.';
    } else if (rsi.currentRSI < 30) {
      base += ' RSI indicates oversold conditions.';
    }

    if (ma.trend === 'UPTREND') {
      base += ' Price remains above key moving averages.';
    } else if (ma.trend === 'DOWNTREND') {
      base += ' Price is below key moving averages.';
    }

    return base;
  }

  private identifySupportLevels(ma: MovingAverageAnalysis, rsi: RSIAnalysis): number[] {
    const levels: number[] = [];
    
    if (ma.support) levels.push(ma.support);
    if (rsi.supportLevel) levels.push(rsi.supportLevel);
    
    // Add key moving averages as potential support
    if (ma.currentSMA20 > 0) levels.push(ma.currentSMA20);
    if (ma.currentSMA50 > 0) levels.push(ma.currentSMA50);
    
    return [...new Set(levels)].sort((a, b) => b - a).slice(0, 3);
  }

  private identifyResistanceLevels(ma: MovingAverageAnalysis, rsi: RSIAnalysis): number[] {
    const levels: number[] = [];
    
    if (ma.resistance) levels.push(ma.resistance);
    if (rsi.resistanceLevel) levels.push(rsi.resistanceLevel);
    
    // Add key moving averages as potential resistance
    if (ma.currentSMA20 > 0) levels.push(ma.currentSMA20);
    if (ma.currentSMA50 > 0) levels.push(ma.currentSMA50);
    
    return [...new Set(levels)].sort((a, b) => a - b).slice(0, 3);
  }

  private calculateVolatility(data: MarketDataPoint[]): number {
    if (data.length < 20) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private assessRiskLevel(volatility: number, rsi: number, macd: MACDAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;
    
    // Volatility component
    if (volatility > 0.4) riskScore += 2;
    else if (volatility > 0.25) riskScore += 1;
    
    // RSI extreme levels
    if (rsi > 80 || rsi < 20) riskScore += 1;
    
    // MACD divergence
    if (macd.divergence !== 'NONE') riskScore += 1;
    
    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private identifyMarketFactors(
    ma: MovingAverageAnalysis,
    rsi: RSIAnalysis,
    macd: MACDAnalysis
  ): { bullishFactors: string[]; bearishFactors: string[] } {
    const bullishFactors: string[] = [];
    const bearishFactors: string[] = [];

    // Moving averages
    if (ma.trend === 'UPTREND') {
      bullishFactors.push('Price above key moving averages');
    } else if (ma.trend === 'DOWNTREND') {
      bearishFactors.push('Price below key moving averages');
    }

    // RSI
    if (rsi.currentRSI < 30) {
      bullishFactors.push('RSI oversold - potential reversal');
    } else if (rsi.currentRSI > 70) {
      bearishFactors.push('RSI overbought - potential reversal');
    }

    if (rsi.divergence === 'BULLISH') {
      bullishFactors.push('Bullish RSI divergence detected');
    } else if (rsi.divergence === 'BEARISH') {
      bearishFactors.push('Bearish RSI divergence detected');
    }

    // MACD
    if (macd.trend === 'BULLISH') {
      bullishFactors.push('MACD showing bullish momentum');
    } else if (macd.trend === 'BEARISH') {
      bearishFactors.push('MACD showing bearish momentum');
    }

    if (macd.currentHistogram > 0) {
      bullishFactors.push('MACD histogram positive');
    } else {
      bearishFactors.push('MACD histogram negative');
    }

    return { bullishFactors, bearishFactors };
  }

  // Helper methods for signal mapping

  private mapMASignal(signal: MovingAverageSignal): TechnicalSignal {
    const mapping: { [key in MovingAverageSignal]: TechnicalSignal } = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'HOLD': 'HOLD',
      'NEUTRAL': 'NEUTRAL'
    };
    return mapping[signal];
  }

  private mapRSISignal(signal: RSISignal): TechnicalSignal {
    const mapping: { [key in RSISignal]: TechnicalSignal } = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'HOLD': 'HOLD',
      'NEUTRAL': 'NEUTRAL',
      'OVERSOLD': 'BUY',
      'OVERBOUGHT': 'SELL'
    };
    return mapping[signal];
  }

  private mapMACDSignal(signal: MACDSignal): TechnicalSignal {
    const mapping: { [key in MACDSignal]: TechnicalSignal } = {
      'BUY': 'BUY',
      'SELL': 'SELL',
      'HOLD': 'HOLD',
      'NEUTRAL': 'NEUTRAL',
      'BULLISH': 'BUY',
      'BEARISH': 'SELL'
    };
    return mapping[signal];
  }

  private getSignalScore(signal: TechnicalSignal): number {
    const scores: { [key in TechnicalSignal]: number } = {
      'STRONG_BUY': 1,
      'BUY': 0.5,
      'HOLD': 0,
      'NEUTRAL': 0,
      'SELL': -0.5,
      'STRONG_SELL': -1
    };
    return scores[signal];
  }

  private simpleOverallSignal(maSignal: MovingAverageSignal, rsiSignal: RSISignal): TechnicalSignal {
    const bullish = (maSignal === 'BUY') && (rsiSignal === 'BUY' || rsiSignal === 'OVERSOLD');
    const bearish = (maSignal === 'SELL') && (rsiSignal === 'SELL' || rsiSignal === 'OVERBOUGHT');
    
    if (bullish) return 'BUY';
    if (bearish) return 'SELL';
    return 'HOLD';
  }

  private simpleRecommendation(signal: TechnicalSignal): string {
    const simple: { [key in TechnicalSignal]: string } = {
      'STRONG_BUY': 'Strong buy opportunity',
      'BUY': 'Consider buying',
      'HOLD': 'Hold position',
      'SELL': 'Consider selling',
      'STRONG_SELL': 'Strong sell signal',
      'NEUTRAL': 'No clear signal'
    };
    return simple[signal];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      movingAverages: { ...this.config.movingAverages, ...newConfig.movingAverages },
      rsi: { ...this.config.rsi, ...newConfig.rsi },
      macd: { ...this.config.macd, ...newConfig.macd }
    };

    // Update indicators with new config
    this.rsiIndicator.updateParameters(
      this.config.rsi.period,
      this.config.rsi.overboughtLevel,
      this.config.rsi.oversoldLevel
    );
    
    this.macdIndicator.updateParameters(
      this.config.macd.fastPeriod,
      this.config.macd.slowPeriod,
      this.config.macd.signalPeriod
    );
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<AnalysisConfig> {
    return { ...this.config };
  }
}

/**
 * Factory function to create TechnicalAnalysisAgent
 */
export function createTechnicalAnalysisAgent(
  storage: StorageAdapter,
  config?: AnalysisConfig
): TechnicalAnalysisAgent {
  return new TechnicalAnalysisAgent(storage, config);
}

export default TechnicalAnalysisAgent;