/**
 * Anomaly Detector Agent
 * Advanced statistical and pattern-based anomaly detection for trading data
 */

import {
  AnomalyDetection,
  TradingAlert,
  AlertType,
  AlertSeverity
} from '../types/alerts.js';
import { RiskLevel, TimeHorizon } from '../types/trading-signals.js';
import { MarketDataPoint } from '../utils/technical-calculations.js';
import { TechnicalAnalysis, StorageAdapter } from './technical-analysis.js';
import { StatisticalThresholds } from '../utils/threshold-monitor.js';

/**
 * Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  // Detection parameters
  lookbackPeriod: number; // Days of historical data to analyze
  minimumDataPoints: number; // Minimum data points required
  sensitivityLevel: number; // 1-10, higher = more sensitive
  
  // Statistical thresholds
  zScoreThreshold: number; // Z-score threshold for statistical anomalies
  percentileThreshold: number; // Percentile threshold (95, 99, etc.)
  movingWindowSize: number; // Size of moving window for trend analysis
  
  // Detection types
  enabledDetectionTypes: Array<
    'STATISTICAL' | 'PATTERN' | 'BEHAVIORAL' | 'VOLUME' | 'PRICE' | 'CORRELATION'
  >;
  
  // Alert settings
  minimumSeverity: AlertSeverity;
  autoCreateAlerts: boolean;
  
  // Performance settings
  maxConcurrentAnalyses: number;
  analysisTimeout: number; // Milliseconds
}

/**
 * Statistical anomaly detection methods
 */
export interface StatisticalAnomalyResult {
  type: 'STATISTICAL';
  method: 'Z_SCORE' | 'MODIFIED_Z_SCORE' | 'IQR' | 'ISOLATION_FOREST' | 'LOCAL_OUTLIER_FACTOR';
  score: number;
  threshold: number;
  isAnomaly: boolean;
  confidence: number;
  explanation: string;
}

/**
 * Pattern-based anomaly detection
 */
export interface PatternAnomalyResult {
  type: 'PATTERN';
  pattern: string;
  similarity: number;
  expectedBehavior: string;
  actualBehavior: string;
  deviation: number;
  isAnomaly: boolean;
  confidence: number;
  explanation: string;
}

/**
 * Volume anomaly detection
 */
export interface VolumeAnomalyResult {
  type: 'VOLUME';
  currentVolume: number;
  expectedVolume: number;
  volumeRatio: number;
  isSpike: boolean;
  isDrop: boolean;
  confidence: number;
  explanation: string;
}

/**
 * Price behavior anomaly detection
 */
export interface PriceAnomalyResult {
  type: 'PRICE';
  priceMovement: number;
  expectedRange: { lower: number; upper: number };
  volatilityAdjusted: boolean;
  gapDetected: boolean;
  confidence: number;
  explanation: string;
}

/**
 * Correlation anomaly detection
 */
export interface CorrelationAnomalyResult {
  type: 'CORRELATION';
  asset1: string;
  asset2: string;
  currentCorrelation: number;
  historicalCorrelation: number;
  correlationBreakdown: boolean;
  confidence: number;
  explanation: string;
}

/**
 * Combined anomaly detection result
 */
export type AnomalyResult = 
  | StatisticalAnomalyResult 
  | PatternAnomalyResult 
  | VolumeAnomalyResult 
  | PriceAnomalyResult 
  | CorrelationAnomalyResult;

/**
 * Real-time anomaly monitoring state
 */
interface AnomalyMonitoringState {
  ticker: string;
  lastAnalysis: Date;
  recentAnomalies: AnomalyDetection[];
  historicalBaseline: {
    mean: number;
    standardDeviation: number;
    percentiles: { [percentile: number]: number };
    correlations: { [asset: string]: number };
  };
  adaptiveThresholds: {
    priceVolatility: number;
    volumeThreshold: number;
    correlationThreshold: number;
  };
}

/**
 * Main Anomaly Detector Agent
 */
export class AnomalyDetectorAgent {
  private config: Required<AnomalyDetectionConfig>;
  private monitoringStates = new Map<string, AnomalyMonitoringState>();
  private detectionQueue: Array<{ ticker: string; data: MarketDataPoint[] }> = [];
  private isProcessing = false;

  constructor(
    private storage: StorageAdapter,
    config: Partial<AnomalyDetectionConfig> = {}
  ) {
    this.config = {
      lookbackPeriod: 252, // 1 year
      minimumDataPoints: 30,
      sensitivityLevel: 5,
      zScoreThreshold: 2.5,
      percentileThreshold: 95,
      movingWindowSize: 20,
      enabledDetectionTypes: ['STATISTICAL', 'VOLUME', 'PRICE'],
      minimumSeverity: 'MEDIUM',
      autoCreateAlerts: true,
      maxConcurrentAnalyses: 5,
      analysisTimeout: 10000,
      ...config
    };
  }

  /**
   * Detect anomalies in market data
   */
  async detectAnomalies(
    ticker: string,
    marketData: MarketDataPoint[],
    technicalAnalysis?: TechnicalAnalysis
  ): Promise<AnomalyDetection[]> {
    if (marketData.length < this.config.minimumDataPoints) {
      console.warn(`Insufficient data for anomaly detection: ${ticker} (${marketData.length} points)`);
      return [];
    }

    console.log(`🔍 Analyzing ${ticker} for anomalies (${marketData.length} data points)`);

    const anomalies: AnomalyDetection[] = [];

    try {
      // Run different types of anomaly detection
      for (const detectionType of this.config.enabledDetectionTypes) {
        const results = await this.runDetectionMethod(
          detectionType,
          ticker,
          marketData,
          technicalAnalysis
        );
        anomalies.push(...results);
      }

      // Update monitoring state
      this.updateMonitoringState(ticker, marketData, anomalies);

      // Filter by minimum severity
      const filteredAnomalies = anomalies.filter(anomaly => 
        this.getSeverityScore(anomaly.severity) >= this.getSeverityScore(this.config.minimumSeverity)
      );

      console.log(`📊 Found ${filteredAnomalies.length} anomalies for ${ticker}`);
      return filteredAnomalies;

    } catch (error) {
      console.error(`Error detecting anomalies for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Detect real-time anomalies for streaming data
   */
  async detectRealTimeAnomalies(
    ticker: string,
    newDataPoint: MarketDataPoint,
    recentHistory: MarketDataPoint[]
  ): Promise<AnomalyDetection[]> {
    const allData = [...recentHistory, newDataPoint].slice(-this.config.lookbackPeriod);
    
    // Focus on rapid detection methods for real-time
    const rapidDetectionTypes: Array<'STATISTICAL' | 'VOLUME' | 'PRICE'> = ['STATISTICAL', 'VOLUME', 'PRICE'];
    const anomalies: AnomalyDetection[] = [];

    for (const detectionType of rapidDetectionTypes) {
      if (!this.config.enabledDetectionTypes.includes(detectionType)) continue;

      try {
        const results = await this.runDetectionMethod(detectionType, ticker, allData);
        
        // Filter to only recent anomalies (within last few data points)
        const recentAnomalies = results.filter(anomaly => {
          const timeDiff = Date.now() - anomaly.timestamp.getTime();
          return timeDiff < 300000; // Last 5 minutes
        });

        anomalies.push(...recentAnomalies);
      } catch (error) {
        console.error(`Real-time anomaly detection failed for ${ticker}:`, error);
      }
    }

    return anomalies;
  }

  /**
   * Detect anomalies across multiple assets (correlation analysis)
   */
  async detectPortfolioAnomalies(
    portfolioData: { [ticker: string]: MarketDataPoint[] }
  ): Promise<AnomalyDetection[]> {
    const tickers = Object.keys(portfolioData);
    const anomalies: AnomalyDetection[] = [];

    console.log(`🔍 Analyzing portfolio anomalies across ${tickers.length} assets`);

    // Correlation breakdown detection
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        const ticker1 = tickers[i];
        const ticker2 = tickers[j];
        
        try {
          const correlationAnomaly = await this.detectCorrelationAnomalies(
            ticker1,
            ticker2,
            portfolioData[ticker1],
            portfolioData[ticker2]
          );
          
          if (correlationAnomaly) {
            anomalies.push(correlationAnomaly);
          }
        } catch (error) {
          console.error(`Correlation analysis failed for ${ticker1}-${ticker2}:`, error);
        }
      }
    }

    return anomalies;
  }

  /**
   * Generate alert from anomaly detection
   */
  createAlertFromAnomaly(anomaly: AnomalyDetection): TradingAlert {
    const alertId = `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: alertId,
      type: 'ANOMALY_DETECTED',
      severity: anomaly.severity,
      ticker: anomaly.ticker,
      timestamp: anomaly.timestamp,
      
      message: `${anomaly.anomalyType} anomaly detected: ${anomaly.description}`,
      description: anomaly.explanation,
      confidence: anomaly.confidence,
      
      currentPrice: anomaly.actualValue,
      
      trigger: {
        condition: `${anomaly.anomalyType} anomaly threshold exceeded`,
        threshold: anomaly.threshold,
        actualValue: anomaly.actualValue
      },
      
      riskLevel: anomaly.impact.riskLevel,
      riskFactors: anomaly.impact.potentialConsequences,
      
      source: 'AnomalyDetectorAgent',
      category: 'anomaly_detection',
      tags: [anomaly.anomalyType.toLowerCase(), 'statistical'],
      
      status: 'ACTIVE',
      deliveryMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      deliveryStatus: {},
      
      suggestedActions: anomaly.impact.recommendedActions,
      followUpRequired: anomaly.requiresInvestigation
    };
  }

  // Private detection methods

  private async runDetectionMethod(
    detectionType: string,
    ticker: string,
    marketData: MarketDataPoint[],
    technicalAnalysis?: TechnicalAnalysis
  ): Promise<AnomalyDetection[]> {
    const timeout = new Promise<AnomalyDetection[]>((_, reject) => 
      setTimeout(() => reject(new Error('Detection timeout')), this.config.analysisTimeout)
    );

    const detection = this.performDetection(detectionType, ticker, marketData, technicalAnalysis);

    return Promise.race([detection, timeout]);
  }

  private async performDetection(
    detectionType: string,
    ticker: string,
    marketData: MarketDataPoint[],
    technicalAnalysis?: TechnicalAnalysis
  ): Promise<AnomalyDetection[]> {
    switch (detectionType) {
      case 'STATISTICAL':
        return this.detectStatisticalAnomalies(ticker, marketData);
      case 'VOLUME':
        return this.detectVolumeAnomalies(ticker, marketData);
      case 'PRICE':
        return this.detectPriceAnomalies(ticker, marketData);
      case 'PATTERN':
        return this.detectPatternAnomalies(ticker, marketData, technicalAnalysis);
      case 'BEHAVIORAL':
        return this.detectBehavioralAnomalies(ticker, marketData);
      case 'CORRELATION':
        return []; // Handled separately in portfolio analysis
      default:
        return [];
    }
  }

  private async detectStatisticalAnomalies(
    ticker: string,
    marketData: MarketDataPoint[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const prices = marketData.map(d => d.close);
    const volumes = marketData.map(d => d.volume);

    // Z-score analysis on price returns
    const returns = this.calculateReturns(prices);
    const priceAnomalies = this.detectZScoreAnomalies(
      returns,
      'price_returns',
      ticker,
      marketData
    );
    anomalies.push(...priceAnomalies);

    // Z-score analysis on volume
    const volumeAnomalies = this.detectZScoreAnomalies(
      volumes,
      'volume',
      ticker,
      marketData
    );
    anomalies.push(...volumeAnomalies);

    // IQR outlier detection
    const iqrAnomalies = this.detectIQRAnomalies(prices, ticker, marketData);
    anomalies.push(...iqrAnomalies);

    return anomalies;
  }

  private detectZScoreAnomalies(
    values: number[],
    metric: string,
    ticker: string,
    marketData: MarketDataPoint[]
  ): AnomalyDetection[] {
    if (values.length < 10) return [];

    const anomalies: AnomalyDetection[] = [];
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return [];

    // Check recent values for anomalies
    const recentCount = Math.min(10, values.length);
    for (let i = values.length - recentCount; i < values.length; i++) {
      const value = values[i];
      const zScore = Math.abs((value - mean) / stdDev);

      if (zScore > this.config.zScoreThreshold) {
        const severity = this.calculateStatisticalSeverity(zScore);
        const confidence = Math.min(0.95, zScore / 5); // Higher Z-score = higher confidence

        const anomaly: AnomalyDetection = {
          id: `stat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ticker,
          timestamp: marketData[i]?.timestamp || new Date(),
          
          anomalyType: 'STATISTICAL',
          severity,
          confidence,
          
          zScore,
          deviationFromNorm: zScore,
          
          description: `${metric} Z-score anomaly`,
          explanation: `${metric} value ${value.toFixed(4)} deviates ${zScore.toFixed(2)} standard deviations from the mean`,
          
          expectedValue: mean,
          actualValue: value,
          threshold: this.config.zScoreThreshold,
          
          historicalContext: {
            averageValue: mean,
            standardDeviation: stdDev,
            sampleSize: values.length,
            lookbackPeriod: values.length
          },
          
          impact: {
            riskLevel: this.mapSeverityToRisk(severity),
            potentialConsequences: [
              `Unusual ${metric} behavior detected`,
              'Potential market inefficiency',
              'Data quality concern'
            ],
            recommendedActions: [
              'Verify data accuracy',
              'Monitor for continuation',
              'Consider position adjustment'
            ]
          },
          
          affectedMetrics: [metric],
          requiresInvestigation: severity === 'HIGH' || severity === 'CRITICAL'
        };

        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  private detectIQRAnomalies(
    values: number[],
    ticker: string,
    marketData: MarketDataPoint[]
  ): AnomalyDetection[] {
    if (values.length < 10) return [];

    const anomalies: AnomalyDetection[] = [];
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(0.25 * (sorted.length - 1));
    const q3Index = Math.floor(0.75 * (sorted.length - 1));
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Check recent values
    const recentCount = Math.min(5, values.length);
    for (let i = values.length - recentCount; i < values.length; i++) {
      const value = values[i];
      
      if (value < lowerBound || value > upperBound) {
        const deviation = value < lowerBound ? 
          Math.abs(value - lowerBound) : Math.abs(value - upperBound);
        const deviationPercent = (deviation / iqr) * 100;
        
        const severity = deviationPercent > 200 ? 'HIGH' : 
                        deviationPercent > 100 ? 'MEDIUM' : 'LOW';

        const anomaly: AnomalyDetection = {
          id: `iqr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ticker,
          timestamp: marketData[i]?.timestamp || new Date(),
          
          anomalyType: 'STATISTICAL',
          severity,
          confidence: Math.min(0.9, deviationPercent / 200),
          
          deviationFromNorm: deviationPercent,
          
          description: 'IQR outlier detected',
          explanation: `Value ${value.toFixed(4)} is outside the IQR bounds [${lowerBound.toFixed(4)}, ${upperBound.toFixed(4)}]`,
          
          expectedValue: (q1 + q3) / 2,
          actualValue: value,
          threshold: value < lowerBound ? lowerBound : upperBound,
          
          historicalContext: {
            averageValue: (q1 + q3) / 2,
            standardDeviation: iqr / 1.35, // Approximate relationship
            sampleSize: values.length,
            lookbackPeriod: values.length
          },
          
          impact: {
            riskLevel: this.mapSeverityToRisk(severity),
            potentialConsequences: ['Statistical outlier detected'],
            recommendedActions: ['Investigate data quality', 'Monitor for patterns']
          },
          
          affectedMetrics: ['price'],
          requiresInvestigation: severity === 'HIGH'
        };

        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  private async detectVolumeAnomalies(
    ticker: string,
    marketData: MarketDataPoint[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    const volumes = marketData.map(d => d.volume);
    
    if (volumes.length < 20) return anomalies;

    const recentVolume = volumes[volumes.length - 1];
    const historicalVolumes = volumes.slice(0, -1);
    const avgVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
    const volumeRatio = recentVolume / avgVolume;

    // Detect volume spikes
    if (volumeRatio > 3.0) { // 3x average volume
      const severity = volumeRatio > 10 ? 'CRITICAL' :
                      volumeRatio > 5 ? 'HIGH' : 'MEDIUM';

      const anomaly: AnomalyDetection = {
        id: `vol-spike-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticker,
        timestamp: marketData[marketData.length - 1].timestamp,
        
        anomalyType: 'VOLUME',
        severity,
        confidence: Math.min(0.95, volumeRatio / 10),
        
        deviationFromNorm: (volumeRatio - 1) * 100,
        
        description: 'Volume spike detected',
        explanation: `Trading volume ${recentVolume.toLocaleString()} is ${volumeRatio.toFixed(1)}x the average volume`,
        
        expectedValue: avgVolume,
        actualValue: recentVolume,
        threshold: avgVolume * 3,
        
        historicalContext: {
          averageValue: avgVolume,
          standardDeviation: this.calculateStandardDeviation(historicalVolumes),
          sampleSize: historicalVolumes.length,
          lookbackPeriod: historicalVolumes.length
        },
        
        impact: {
          riskLevel: this.mapSeverityToRisk(severity),
          potentialConsequences: [
            'Unusual trading activity',
            'Potential news event',
            'Institutional trading detected'
          ],
          recommendedActions: [
            'Check for news catalysts',
            'Monitor price action',
            'Consider increased volatility'
          ]
        },
        
        affectedMetrics: ['volume'],
        requiresInvestigation: true
      };

      anomalies.push(anomaly);
    }

    // Detect volume drops
    if (volumeRatio < 0.2) { // Less than 20% of average
      const anomaly: AnomalyDetection = {
        id: `vol-drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticker,
        timestamp: marketData[marketData.length - 1].timestamp,
        
        anomalyType: 'VOLUME',
        severity: 'LOW',
        confidence: 0.7,
        
        deviationFromNorm: (1 - volumeRatio) * 100,
        
        description: 'Volume drop detected',
        explanation: `Trading volume ${recentVolume.toLocaleString()} is unusually low (${(volumeRatio * 100).toFixed(1)}% of average)`,
        
        expectedValue: avgVolume,
        actualValue: recentVolume,
        threshold: avgVolume * 0.2,
        
        historicalContext: {
          averageValue: avgVolume,
          standardDeviation: this.calculateStandardDeviation(historicalVolumes),
          sampleSize: historicalVolumes.length,
          lookbackPeriod: historicalVolumes.length
        },
        
        impact: {
          riskLevel: 'LOW',
          potentialConsequences: [
            'Low liquidity',
            'Reduced market interest',
            'Holiday or special event'
          ],
          recommendedActions: [
            'Check market hours',
            'Be cautious with large orders',
            'Monitor for liquidity issues'
          ]
        },
        
        affectedMetrics: ['volume'],
        requiresInvestigation: false
      };

      anomalies.push(anomaly);
    }

    return anomalies;
  }

  private async detectPriceAnomalies(
    ticker: string,
    marketData: MarketDataPoint[]
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];
    
    if (marketData.length < 2) return anomalies;

    const current = marketData[marketData.length - 1];
    const previous = marketData[marketData.length - 2];
    const priceChange = (current.close - previous.close) / previous.close;

    // Calculate recent volatility
    const recentPrices = marketData.slice(-20).map(d => d.close);
    const returns = this.calculateReturns(recentPrices);
    const volatility = this.calculateStandardDeviation(returns);

    // Detect price gaps
    const gapThreshold = volatility * 3; // 3 standard deviations
    if (Math.abs(priceChange) > gapThreshold) {
      const severity = Math.abs(priceChange) > volatility * 5 ? 'HIGH' : 'MEDIUM';

      const anomaly: AnomalyDetection = {
        id: `price-gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticker,
        timestamp: current.timestamp,
        
        anomalyType: 'PRICE',
        severity,
        confidence: Math.min(0.95, Math.abs(priceChange) / (volatility * 5)),
        
        deviationFromNorm: Math.abs(priceChange / volatility),
        
        description: 'Price gap detected',
        explanation: `Price moved ${(priceChange * 100).toFixed(2)}% which exceeds ${(gapThreshold * 100).toFixed(2)}% threshold`,
        
        expectedValue: previous.close,
        actualValue: current.close,
        threshold: gapThreshold,
        
        historicalContext: {
          averageValue: recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length,
          standardDeviation: volatility,
          sampleSize: recentPrices.length,
          lookbackPeriod: 20
        },
        
        impact: {
          riskLevel: this.mapSeverityToRisk(severity),
          potentialConsequences: [
            'Significant price movement',
            'Potential market inefficiency',
            'News event or earnings surprise'
          ],
          recommendedActions: [
            'Check for news events',
            'Verify data accuracy',
            'Consider volatility adjustment'
          ]
        },
        
        affectedMetrics: ['price'],
        requiresInvestigation: true
      };

      anomalies.push(anomaly);
    }

    return anomalies;
  }

  private async detectPatternAnomalies(
    ticker: string,
    marketData: MarketDataPoint[],
    technicalAnalysis?: TechnicalAnalysis
  ): Promise<AnomalyDetection[]> {
    // Placeholder for pattern-based anomaly detection
    // This would implement complex pattern recognition algorithms
    return [];
  }

  private async detectBehavioralAnomalies(
    ticker: string,
    marketData: MarketDataPoint[]
  ): Promise<AnomalyDetection[]> {
    // Placeholder for behavioral anomaly detection
    // This would analyze trading patterns, order flow, etc.
    return [];
  }

  private async detectCorrelationAnomalies(
    ticker1: string,
    ticker2: string,
    data1: MarketDataPoint[],
    data2: MarketDataPoint[]
  ): Promise<AnomalyDetection | null> {
    if (data1.length < 30 || data2.length < 30) return null;

    const returns1 = this.calculateReturns(data1.map(d => d.close));
    const returns2 = this.calculateReturns(data2.map(d => d.close));
    
    const minLength = Math.min(returns1.length, returns2.length);
    const alignedReturns1 = returns1.slice(-minLength);
    const alignedReturns2 = returns2.slice(-minLength);

    // Calculate recent and historical correlations
    const recentCorr = this.calculateCorrelation(
      alignedReturns1.slice(-10),
      alignedReturns2.slice(-10)
    );
    const historicalCorr = this.calculateCorrelation(
      alignedReturns1.slice(0, -10),
      alignedReturns2.slice(0, -10)
    );

    const correlationChange = Math.abs(recentCorr - historicalCorr);
    
    if (correlationChange > 0.3) { // Significant correlation breakdown
      const severity = correlationChange > 0.6 ? 'HIGH' : 'MEDIUM';

      return {
        id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticker: `${ticker1}-${ticker2}`,
        timestamp: new Date(),
        
        anomalyType: 'CORRELATION',
        severity,
        confidence: Math.min(0.9, correlationChange / 0.6),
        
        deviationFromNorm: correlationChange,
        
        description: 'Correlation breakdown detected',
        explanation: `Correlation between ${ticker1} and ${ticker2} changed from ${historicalCorr.toFixed(2)} to ${recentCorr.toFixed(2)}`,
        
        expectedValue: historicalCorr,
        actualValue: recentCorr,
        threshold: 0.3,
        
        historicalContext: {
          averageValue: historicalCorr,
          standardDeviation: 0.1, // Estimated
          sampleSize: alignedReturns1.length,
          lookbackPeriod: alignedReturns1.length
        },
        
        impact: {
          riskLevel: this.mapSeverityToRisk(severity),
          potentialConsequences: [
            'Portfolio diversification breakdown',
            'Sector rotation event',
            'Systematic risk change'
          ],
          recommendedActions: [
            'Review portfolio allocation',
            'Monitor sector trends',
            'Consider rebalancing'
          ]
        },
        
        affectedMetrics: ['correlation'],
        requiresInvestigation: true
      };
    }

    return null;
  }

  // Helper methods

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length === 0) return 0;

    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

    let numerator = 0;
    let sumSquares1 = 0;
    let sumSquares2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sumSquares1 += diff1 * diff1;
      sumSquares2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sumSquares1 * sumSquares2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateStatisticalSeverity(zScore: number): AlertSeverity {
    if (zScore > 4) return 'CRITICAL';
    if (zScore > 3) return 'HIGH';
    if (zScore > 2.5) return 'MEDIUM';
    return 'LOW';
  }

  private mapSeverityToRisk(severity: AlertSeverity): RiskLevel {
    switch (severity) {
      case 'CRITICAL': return 'VERY_HIGH';
      case 'HIGH': return 'HIGH';
      case 'MEDIUM': return 'MEDIUM';
      case 'LOW': return 'LOW';
      default: return 'MEDIUM';
    }
  }

  private getSeverityScore(severity: AlertSeverity): number {
    switch (severity) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 2;
    }
  }

  private updateMonitoringState(
    ticker: string,
    marketData: MarketDataPoint[],
    anomalies: AnomalyDetection[]
  ): void {
    const state = this.monitoringStates.get(ticker) || {
      ticker,
      lastAnalysis: new Date(),
      recentAnomalies: [],
      historicalBaseline: {
        mean: 0,
        standardDeviation: 0,
        percentiles: {},
        correlations: {}
      },
      adaptiveThresholds: {
        priceVolatility: 0.02,
        volumeThreshold: 2.0,
        correlationThreshold: 0.3
      }
    };

    state.lastAnalysis = new Date();
    state.recentAnomalies = [...anomalies, ...state.recentAnomalies].slice(0, 50); // Keep last 50

    // Update baseline statistics
    const prices = marketData.map(d => d.close);
    if (prices.length > 0) {
      state.historicalBaseline.mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      state.historicalBaseline.standardDeviation = this.calculateStandardDeviation(prices);
    }

    this.monitoringStates.set(ticker, state);
  }

  /**
   * Get anomaly summary for a ticker
   */
  getAnomalySummary(ticker: string): {
    totalAnomalies: number;
    recentAnomalies: number;
    severityDistribution: { [severity in AlertSeverity]: number };
    typeDistribution: { [type: string]: number };
  } | null {
    const state = this.monitoringStates.get(ticker);
    if (!state) return null;

    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
    const recentAnomalies = state.recentAnomalies.filter(a => 
      a.timestamp.getTime() > recentCutoff
    );

    const severityDistribution = state.recentAnomalies.reduce((dist, anomaly) => {
      dist[anomaly.severity] = (dist[anomaly.severity] || 0) + 1;
      return dist;
    }, {} as { [severity in AlertSeverity]: number });

    const typeDistribution = state.recentAnomalies.reduce((dist, anomaly) => {
      dist[anomaly.anomalyType] = (dist[anomaly.anomalyType] || 0) + 1;
      return dist;
    }, {} as { [type: string]: number });

    return {
      totalAnomalies: state.recentAnomalies.length,
      recentAnomalies: recentAnomalies.length,
      severityDistribution,
      typeDistribution
    };
  }
}

/**
 * Factory function to create anomaly detector
 */
export function createAnomalyDetectorAgent(
  storage: StorageAdapter,
  config?: Partial<AnomalyDetectionConfig>
): AnomalyDetectorAgent {
  return new AnomalyDetectorAgent(storage, config);
}

export default AnomalyDetectorAgent;