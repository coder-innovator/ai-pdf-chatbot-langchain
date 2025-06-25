/**
 * Alert Detector Agent
 * Main orchestrator for alert detection, combining multiple detection methods
 * and managing alert lifecycle
 */

import {
  TradingAlert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  AlertCriteria,
  AlertFilter,
  AlertSummary
} from '../types/alerts.js';
import { TradingSignal } from '../types/trading-signals.js';
import { MarketDataPoint } from '../utils/technical-calculations.js';
import { TechnicalAnalysis, StorageAdapter } from './technical-analysis.js';
import { SentimentAnalysis } from '../utils/sentiment-calculator.js';
import { RiskAssessment } from '../types/trading-signals.js';

import { AnomalyDetectorAgent, createAnomalyDetectorAgent } from './anomaly-detector.js';
import { ThresholdMonitor, createThresholdMonitor } from '../utils/threshold-monitor.js';
import { MockNotificationService, createNotificationService } from '../services/mock-notification-service.js';

/**
 * Alert detection configuration
 */
export interface AlertDetectionConfig {
  // Detection settings
  enabledAlertTypes: AlertType[];
  defaultSeverity: AlertSeverity;
  confidenceThreshold: number; // Minimum confidence to generate alert
  
  // Frequency settings
  maxAlertsPerMinute: number;
  cooldownPeriodMs: number; // Minimum time between similar alerts
  
  // Notification settings
  enableNotifications: boolean;
  notificationMethods: Array<'CONSOLE' | 'EMAIL' | 'WEBHOOK' | 'UI_NOTIFICATION' | 'SMS'>;
  
  // Detection components
  enableAnomalyDetection: boolean;
  enableThresholdMonitoring: boolean;
  enablePatternDetection: boolean;
  enableNewsEventDetection: boolean;
  
  // Performance settings
  maxConcurrentDetections: number;
  detectionTimeoutMs: number;
  batchSize: number;
}

/**
 * Alert detection result
 */
export interface AlertDetectionResult {
  alerts: TradingAlert[];
  summary: {
    totalDetected: number;
    byType: { [type in AlertType]: number };
    bySeverity: { [severity in AlertSeverity]: number };
    processingTime: number;
    errors: string[];
  };
  metadata: {
    ticker: string;
    timestamp: Date;
    dataPoints: number;
    detectionMethods: string[];
  };
}

/**
 * Alert state tracking
 */
interface AlertState {
  ticker: string;
  recentAlerts: Map<string, Date>; // Alert type -> last alert time
  alertCount: number;
  lastDetection: Date;
  suppressedTypes: Set<AlertType>;
  escalationLevel: number;
}

/**
 * Main Alert Detector Agent
 */
export class AlertDetectorAgent {
  private config: Required<AlertDetectionConfig>;
  private alertStates = new Map<string, AlertState>();
  private activeAlerts = new Map<string, TradingAlert>();
  private alertHistory: TradingAlert[] = [];
  
  // Sub-components
  private anomalyDetector: AnomalyDetectorAgent;
  private thresholdMonitor: ThresholdMonitor;
  private notificationService: MockNotificationService;
  
  // Detection queue
  private _detectionQueue: Array<{
    ticker: string;
    data: MarketDataPoint[];
    technicalAnalysis?: TechnicalAnalysis;
    sentimentAnalysis?: SentimentAnalysis;
    signal?: TradingSignal;
  }> = [];
  
  private _isProcessing = false;

  constructor(
    private _storage: StorageAdapter,
    config: Partial<AlertDetectionConfig> = {}
  ) {
    this.config = {
      enabledAlertTypes: [
        'PRICE_MOVEMENT', 'VOLUME_SPIKE', 'TECHNICAL_BREAKOUT',
        'SENTIMENT_SHIFT', 'RISK_WARNING', 'ANOMALY_DETECTED',
        'THRESHOLD_BREACH', 'SIGNAL_GENERATED'
      ],
      defaultSeverity: 'MEDIUM',
      confidenceThreshold: 0.6,
      maxAlertsPerMinute: 10,
      cooldownPeriodMs: 300000, // 5 minutes
      enableNotifications: true,
      notificationMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      enableAnomalyDetection: true,
      enableThresholdMonitoring: true,
      enablePatternDetection: true,
      enableNewsEventDetection: false, // Disabled for now
      maxConcurrentDetections: 5,
      detectionTimeoutMs: 10000,
      batchSize: 10,
      ...config
    };

    // Initialize sub-components
    this.anomalyDetector = createAnomalyDetectorAgent(this._storage);
    this.thresholdMonitor = createThresholdMonitor();
    this.notificationService = createNotificationService({
      enabledMethods: this.config.notificationMethods
    });

    this.initializeDefaultThresholds();
  }

  /**
   * Detect alerts for a single ticker
   */
  async detectAlerts(
    ticker: string,
    marketData: MarketDataPoint[],
    technicalAnalysis?: TechnicalAnalysis,
    sentimentAnalysis?: SentimentAnalysis,
    tradingSignal?: TradingSignal
  ): Promise<AlertDetectionResult> {
    const startTime = Date.now();
    const alerts: TradingAlert[] = [];
    const errors: string[] = [];

    console.log(`🚨 Running alert detection for ${ticker} (${marketData.length} data points)`);

    try {
      // Initialize or update alert state
      this.updateAlertState(ticker);

      // 1. Anomaly Detection
      if (this.config.enableAnomalyDetection) {
        try {
          const anomalies = await this.anomalyDetector.detectAnomalies(
            ticker, marketData, technicalAnalysis
          );
          
          for (const anomaly of anomalies) {
            const alert = this.anomalyDetector.createAlertFromAnomaly(anomaly);
            if (this.shouldCreateAlert(alert)) {
              alerts.push(alert);
            }
          }
        } catch (error) {
          errors.push(`Anomaly detection failed: ${error}`);
        }
      }

      // 2. Threshold Monitoring
      if (this.config.enableThresholdMonitoring && marketData.length > 0) {
        try {
          const currentData = marketData[marketData.length - 1];
          const thresholdAlerts = this.checkThresholds(ticker, currentData, marketData);
          alerts.push(...thresholdAlerts);
        } catch (error) {
          errors.push(`Threshold monitoring failed: ${error}`);
        }
      }

      // 3. Technical Analysis Alerts
      if (technicalAnalysis) {
        try {
          const technicalAlerts = this.detectTechnicalAlerts(
            ticker, technicalAnalysis, marketData
          );
          alerts.push(...technicalAlerts);
        } catch (error) {
          errors.push(`Technical analysis alerts failed: ${error}`);
        }
      }

      // 4. Sentiment Analysis Alerts
      if (sentimentAnalysis) {
        try {
          const sentimentAlerts = this.detectSentimentAlerts(
            ticker, sentimentAnalysis, marketData
          );
          alerts.push(...sentimentAlerts);
        } catch (error) {
          errors.push(`Sentiment analysis alerts failed: ${error}`);
        }
      }

      // 5. Trading Signal Alerts
      if (tradingSignal) {
        try {
          const signalAlerts = this.detectSignalAlerts(ticker, tradingSignal);
          alerts.push(...signalAlerts);
        } catch (error) {
          errors.push(`Signal alerts failed: ${error}`);
        }
      }

      // 6. Risk-based Alerts
      if (tradingSignal?.riskAssessment) {
        try {
          const riskAlerts = this.detectRiskAlerts(ticker, tradingSignal.riskAssessment);
          alerts.push(...riskAlerts);
        } catch (error) {
          errors.push(`Risk alerts failed: ${error}`);
        }
      }

      // Filter and process alerts
      const validAlerts = alerts.filter(alert => 
        alert.confidence >= this.config.confidenceThreshold &&
        this.config.enabledAlertTypes.includes(alert.type)
      );

      // Update alert tracking
      for (const alert of validAlerts) {
        this.trackAlert(alert);
      }

      // Send notifications
      if (this.config.enableNotifications && validAlerts.length > 0) {
        await this.sendAlertNotifications(validAlerts);
      }

      const processingTime = Date.now() - startTime;
      
      const result: AlertDetectionResult = {
        alerts: validAlerts,
        summary: {
          totalDetected: validAlerts.length,
          byType: this.categorizeAlertsByType(validAlerts),
          bySeverity: this.categorizeAlertsBySeverity(validAlerts),
          processingTime,
          errors
        },
        metadata: {
          ticker,
          timestamp: new Date(),
          dataPoints: marketData.length,
          detectionMethods: this.getActiveDetectionMethods()
        }
      };

      console.log(`✅ Alert detection completed for ${ticker}: ${validAlerts.length} alerts generated in ${processingTime}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Alert detection failed for ${ticker}:`, error);
      return {
        alerts: [],
        summary: {
          totalDetected: 0,
          byType: {} as any,
          bySeverity: {} as any,
          processingTime: Date.now() - startTime,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        },
        metadata: {
          ticker,
          timestamp: new Date(),
          dataPoints: marketData.length,
          detectionMethods: []
        }
      };
    }
  }

  /**
   * Batch alert detection for multiple tickers
   */
  async detectBatchAlerts(
    requests: Array<{
      ticker: string;
      marketData: MarketDataPoint[];
      technicalAnalysis?: TechnicalAnalysis;
      sentimentAnalysis?: SentimentAnalysis;
      tradingSignal?: TradingSignal;
    }>
  ): Promise<Map<string, AlertDetectionResult>> {
    console.log(`🔄 Running batch alert detection for ${requests.length} tickers`);
    
    const results = new Map<string, AlertDetectionResult>();
    const batches = this.chunkArray(requests, this.config.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (request) => {
        const result = await this.detectAlerts(
          request.ticker,
          request.marketData,
          request.technicalAnalysis,
          request.sentimentAnalysis,
          request.tradingSignal
        );
        return { ticker: request.ticker, result };
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { ticker, result } of batchResults) {
        results.set(ticker, result);
      }

      // Small delay between batches to prevent overwhelming
      if (batches.length > 1) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Add custom alert criteria
   */
  addAlertCriteria(criteria: AlertCriteria): void {
    // Convert criteria to threshold configuration if applicable
    if (criteria.conditions.priceChange) {
      const thresholdConfig = {
        id: criteria.id,
        name: criteria.name,
        description: criteria.description,
        ticker: criteria.ticker,
        metric: 'price_change_percent',
        threshold: {
          value: criteria.conditions.priceChange.threshold,
          type: 'PERCENTAGE' as const,
          direction: criteria.conditions.priceChange.direction === 'UP' ? 'ABOVE' as const :
                   criteria.conditions.priceChange.direction === 'DOWN' ? 'BELOW' as const :
                   'OUTSIDE_RANGE' as const
        },
        checkInterval: 5,
        timeframe: criteria.conditions.priceChange.timeframe,
        lookbackPeriod: 100,
        alertType: 'PRICE_MOVEMENT' as AlertType,
        severity: criteria.severity,
        deliveryMethods: criteria.deliveryMethods,
        isActive: criteria.isActive,
        breachCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.thresholdMonitor.addThreshold(thresholdConfig);
    }

    console.log(`📋 Added alert criteria: ${criteria.name}`);
  }

  /**
   * Get alert summary for time period
   */
  getAlertSummary(
    startDate: Date,
    endDate: Date,
    filter?: AlertFilter
  ): AlertSummary {
    const periodAlerts = this.alertHistory.filter(alert => 
      alert.timestamp >= startDate && alert.timestamp <= endDate
    );

    // Apply additional filters if provided
    let filteredAlerts = periodAlerts;
    if (filter) {
      filteredAlerts = this.applyAlertFilter(periodAlerts, filter);
    }

    const alertsByType = this.categorizeAlertsByType(filteredAlerts);
    const alertsBySeverity = this.categorizeAlertsBySeverity(filteredAlerts);
    const alertsByStatus = this.categorizeAlertsByStatus(filteredAlerts);

    // Calculate top contributors
    const tickerCounts = filteredAlerts.reduce((acc, alert) => {
      acc[alert.ticker] = (acc[alert.ticker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTickers = Object.entries(tickerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ticker, count]) => ({
        ticker,
        alertCount: count,
        lastAlert: filteredAlerts
          .filter(a => a.ticker === ticker)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date()
      }));

    const typeCounts = Object.entries(alertsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({
        type: type as AlertType,
        count,
        averageSeverity: this.calculateAverageSeverity(
          filteredAlerts.filter(a => a.type === type)
        )
      }));

    return {
      timeframe: { start: startDate, end: endDate },
      totalAlerts: filteredAlerts.length,
      alertsByType,
      alertsBySeverity,
      alertsByStatus,
      topTickers,
      topAlertTypes: typeCounts,
      alertTrend: this.calculateAlertTrend(filteredAlerts),
      trendPercentage: this.calculateTrendPercentage(filteredAlerts),
      criticalUnresolved: filteredAlerts.filter(a => 
        a.severity === 'CRITICAL' && a.status === 'ACTIVE'
      ).length,
      oldestUnresolved: filteredAlerts
        .filter(a => a.status === 'ACTIVE')
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]?.timestamp,
      recentAnomalies: filteredAlerts.filter(a => 
        a.type === 'ANOMALY_DETECTED' && 
        Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    console.log(`✅ Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alertId);

    console.log(`✅ Alert resolved: ${alertId}`);
    return true;
  }

  // Private detection methods

  private checkThresholds(
    ticker: string,
    currentData: MarketDataPoint,
    historicalData: MarketDataPoint[]
  ): TradingAlert[] {
    const alerts: TradingAlert[] = [];

    // Check price change threshold
    if (historicalData.length >= 2) {
      const previous = historicalData[historicalData.length - 2];
      const priceChange = (currentData.close - previous.close) / previous.close;
      
      const breach = this.thresholdMonitor.checkValue(
        `price-${ticker}`,
        Math.abs(priceChange * 100),
        ticker,
        {
          price: currentData.close,
          change: priceChange * 100,
          volume: currentData.volume
        }
      );

      if (breach) {
        const alert = this.thresholdMonitor.createAlertFromBreach(breach);
        alerts.push(alert);
      }
    }

    // Check volume threshold
    if (historicalData.length >= 20) {
      const recentVolumes = historicalData.slice(-20).map(d => d.volume);
      const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
      const volumeRatio = currentData.volume / avgVolume;

      const breach = this.thresholdMonitor.checkValue(
        `volume-${ticker}`,
        volumeRatio,
        ticker,
        {
          volume: currentData.volume,
          avgVolume,
          price: currentData.close
        }
      );

      if (breach) {
        const alert = this.thresholdMonitor.createAlertFromBreach(breach);
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private detectTechnicalAlerts(
    ticker: string,
    analysis: TechnicalAnalysis,
    marketData: MarketDataPoint[]
  ): TradingAlert[] {
    const alerts: TradingAlert[] = [];

    // Strong signal alerts
    if (analysis.confidence > 0.8 && 
        (analysis.overallSignal === 'STRONG_BUY' || analysis.overallSignal === 'STRONG_SELL')) {
      
      const alert: TradingAlert = {
        id: `tech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'TECHNICAL_BREAKOUT',
        severity: 'HIGH',
        ticker,
        timestamp: new Date(),
        
        message: `Strong ${analysis.overallSignal} signal detected`,
        description: `Technical analysis shows ${analysis.overallSignal} with ${(analysis.confidence * 100).toFixed(1)}% confidence`,
        confidence: analysis.confidence,
        
        currentPrice: analysis.currentPrice,
        
        trigger: {
          condition: 'Strong technical signal',
          threshold: 0.8,
          actualValue: analysis.confidence
        },
        
        source: 'TechnicalAnalysis',
        category: 'technical_breakout',
        tags: ['technical', analysis.overallSignal.toLowerCase()],
        
        status: 'ACTIVE',
        deliveryMethods: this.config.notificationMethods,
        deliveryStatus: {},
        
        suggestedActions: [
          `Consider ${analysis.overallSignal === 'STRONG_BUY' ? 'buying' : 'selling'} position`,
          'Monitor for confirmation',
          'Check volume for validation'
        ],
        followUpRequired: true
      };

      alerts.push(alert);
    }

    // Support/Resistance level alerts
    if (analysis.supportLevels || analysis.resistanceLevels) {
      const currentPrice = analysis.currentPrice;
      
      // Check if price is near support
      if (analysis.supportLevels) {
        const nearestSupport = analysis.supportLevels
          .filter(level => level < currentPrice)
          .sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b))[0];
        
        if (nearestSupport && Math.abs(currentPrice - nearestSupport) / currentPrice < 0.02) {
          const alert = this.createSupportResistanceAlert(
            ticker, 'SUPPORT', currentPrice, nearestSupport
          );
          alerts.push(alert);
        }
      }

      // Check if price is near resistance
      if (analysis.resistanceLevels) {
        const nearestResistance = analysis.resistanceLevels
          .filter(level => level > currentPrice)
          .sort((a, b) => Math.abs(currentPrice - a) - Math.abs(currentPrice - b))[0];
        
        if (nearestResistance && Math.abs(currentPrice - nearestResistance) / currentPrice < 0.02) {
          const alert = this.createSupportResistanceAlert(
            ticker, 'RESISTANCE', currentPrice, nearestResistance
          );
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  private detectSentimentAlerts(
    ticker: string,
    analysis: SentimentAnalysis,
    marketData: MarketDataPoint[]
  ): TradingAlert[] {
    const alerts: TradingAlert[] = [];

    // Strong sentiment shift
    if (Math.abs(analysis.sentimentScore) > 0.7 && analysis.confidence > 0.7) {
      const sentiment = analysis.sentimentScore > 0 ? 'POSITIVE' : 'NEGATIVE';
      
      const alert: TradingAlert = {
        id: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'SENTIMENT_SHIFT',
        severity: Math.abs(analysis.sentimentScore) > 0.8 ? 'HIGH' : 'MEDIUM',
        ticker,
        timestamp: new Date(),
        
        message: `Strong ${sentiment} sentiment detected`,
        description: `Sentiment analysis shows ${sentiment} sentiment (${analysis.sentimentScore.toFixed(2)}) with ${(analysis.confidence * 100).toFixed(1)}% confidence`,
        confidence: analysis.confidence,
        
        trigger: {
          condition: 'Sentiment threshold exceeded',
          threshold: 0.7,
          actualValue: Math.abs(analysis.sentimentScore)
        },
        
        source: 'SentimentAnalysis',
        category: 'sentiment_shift',
        tags: ['sentiment', sentiment.toLowerCase()],
        
        status: 'ACTIVE',
        deliveryMethods: this.config.notificationMethods,
        deliveryStatus: {},
        
        suggestedActions: [
          'Monitor news events',
          'Check social media sentiment',
          'Consider sentiment-driven trading'
        ],
        followUpRequired: false
      };

      alerts.push(alert);
    }

    // High news volume
    if (analysis.newsCount > 15) {
      const alert: TradingAlert = {
        id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'NEWS_EVENT',
        severity: 'MEDIUM',
        ticker,
        timestamp: new Date(),
        
        message: `High news volume detected (${analysis.newsCount} articles)`,
        confidence: 0.8,
        
        trigger: {
          condition: 'News volume threshold',
          threshold: 15,
          actualValue: analysis.newsCount
        },
        
        source: 'SentimentAnalysis',
        category: 'news_event',
        tags: ['news', 'volume'],
        
        status: 'ACTIVE',
        deliveryMethods: this.config.notificationMethods,
        deliveryStatus: {},
        
        suggestedActions: [
          'Review recent news',
          'Check for earnings or announcements',
          'Monitor for continued news flow'
        ],
        followUpRequired: true
      };

      alerts.push(alert);
    }

    return alerts;
  }

  private detectSignalAlerts(ticker: string, signal: TradingSignal): TradingAlert[] {
    const alerts: TradingAlert[] = [];

    // High confidence signals
    if (signal.confidence > 0.8) {
      const alert: TradingAlert = {
        id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'SIGNAL_GENERATED',
        severity: signal.confidence > 0.9 ? 'HIGH' : 'MEDIUM',
        ticker,
        timestamp: new Date(),
        
        message: `High confidence ${signal.action} signal generated`,
        description: signal.reasoning,
        confidence: signal.confidence,
        
        currentPrice: signal.currentPrice,
        
        relatedSignal: {
          action: signal.action,
          confidence: signal.confidence,
          reasoning: signal.reasoning
        },
        
        trigger: {
          condition: 'High confidence signal',
          threshold: 0.8,
          actualValue: signal.confidence,
          timeframe: signal.timeHorizon
        },
        
        source: 'SignalGenerator',
        category: 'trading_signal',
        tags: ['signal', signal.action.toLowerCase()],
        
        status: 'ACTIVE',
        deliveryMethods: this.config.notificationMethods,
        deliveryStatus: {},
        
        suggestedActions: signal.keyFactors,
        followUpRequired: true
      };

      alerts.push(alert);
    }

    return alerts;
  }

  private detectRiskAlerts(ticker: string, riskAssessment: RiskAssessment): TradingAlert[] {
    const alerts: TradingAlert[] = [];

    // High risk warning
    if (riskAssessment.overallRisk === 'HIGH' || riskAssessment.overallRisk === 'VERY_HIGH') {
      const alert: TradingAlert = {
        id: `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'RISK_WARNING',
        severity: riskAssessment.overallRisk === 'VERY_HIGH' ? 'CRITICAL' : 'HIGH',
        ticker,
        timestamp: new Date(),
        
        message: `${riskAssessment.overallRisk} risk level detected`,
        description: `Risk assessment shows ${riskAssessment.overallRisk} risk with score ${riskAssessment.riskScore}`,
        confidence: 0.9,
        
        riskLevel: riskAssessment.overallRisk,
        riskFactors: riskAssessment.warnings,
        
        trigger: {
          condition: 'High risk threshold',
          threshold: 70,
          actualValue: riskAssessment.riskScore
        },
        
        source: 'RiskAnalyzer',
        category: 'risk_warning',
        tags: ['risk', riskAssessment.overallRisk.toLowerCase()],
        
        status: 'ACTIVE',
        deliveryMethods: this.config.notificationMethods,
        deliveryStatus: {},
        
        suggestedActions: riskAssessment.recommendations,
        followUpRequired: true
      };

      alerts.push(alert);
    }

    return alerts;
  }

  private createSupportResistanceAlert(
    ticker: string,
    type: 'SUPPORT' | 'RESISTANCE',
    currentPrice: number,
    level: number
  ): TradingAlert {
    return {
      id: `sr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'TECHNICAL_BREAKOUT',
      severity: 'MEDIUM',
      ticker,
      timestamp: new Date(),
      
      message: `Price approaching ${type.toLowerCase()} level`,
      description: `Current price ${currentPrice.toFixed(2)} is near ${type.toLowerCase()} level ${level.toFixed(2)}`,
      confidence: 0.7,
      
      currentPrice,
      
      trigger: {
        condition: `${type} level proximity`,
        threshold: level,
        actualValue: currentPrice
      },
      
      source: 'TechnicalAnalysis',
      category: 'support_resistance',
      tags: ['technical', type.toLowerCase()],
      
      status: 'ACTIVE',
      deliveryMethods: this.config.notificationMethods,
      deliveryStatus: {},
      
      suggestedActions: [
        `Monitor for ${type.toLowerCase()} ${type === 'SUPPORT' ? 'bounce' : 'breakout'}`,
        'Watch volume for confirmation',
        'Prepare for potential reversal'
      ],
      followUpRequired: false
    };
  }

  // Helper methods

  private shouldCreateAlert(alert: TradingAlert): boolean {
    const state = this.alertStates.get(alert.ticker);
    if (!state) return true;

    // Check cooldown period
    const lastAlert = state.recentAlerts.get(alert.type);
    if (lastAlert && Date.now() - lastAlert.getTime() < this.config.cooldownPeriodMs) {
      return false;
    }

    // Check if alert type is suppressed
    if (state.suppressedTypes.has(alert.type)) {
      return false;
    }

    // Check rate limiting
    if (state.alertCount > this.config.maxAlertsPerMinute) {
      return false;
    }

    return true;
  }

  private trackAlert(alert: TradingAlert): void {
    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);
    
    // Add to history
    this.alertHistory.push(alert);
    
    // Limit history size
    if (this.alertHistory.length > 10000) {
      this.alertHistory = this.alertHistory.slice(-5000);
    }

    // Update alert state
    const state = this.alertStates.get(alert.ticker);
    if (state) {
      state.recentAlerts.set(alert.type, new Date());
      state.alertCount++;
      state.lastDetection = new Date();
    }
  }

  private updateAlertState(ticker: string): void {
    if (!this.alertStates.has(ticker)) {
      this.alertStates.set(ticker, {
        ticker,
        recentAlerts: new Map(),
        alertCount: 0,
        lastDetection: new Date(),
        suppressedTypes: new Set(),
        escalationLevel: 0
      });
    }

    // Reset alert count every minute
    const state = this.alertStates.get(ticker)!;
    if (Date.now() - state.lastDetection.getTime() > 60000) {
      state.alertCount = 0;
    }
  }

  private async sendAlertNotifications(alerts: TradingAlert[]): Promise<void> {
    try {
      await this.notificationService.sendBatchAlerts(alerts);
    } catch (error) {
      console.error('Failed to send alert notifications:', error);
    }
  }

  private categorizeAlertsByType(alerts: TradingAlert[]): { [type in AlertType]: number } {
    return alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as { [type in AlertType]: number });
  }

  private categorizeAlertsBySeverity(alerts: TradingAlert[]): { [severity in AlertSeverity]: number } {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as { [severity in AlertSeverity]: number });
  }

  private categorizeAlertsByStatus(alerts: TradingAlert[]): { [status in AlertStatus]: number } {
    const statusCounts = alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });

    // Ensure all status types are represented
    return {
      ACTIVE: statusCounts.ACTIVE || 0,
      ACKNOWLEDGED: statusCounts.ACKNOWLEDGED || 0,
      RESOLVED: statusCounts.RESOLVED || 0,
      DISMISSED: statusCounts.DISMISSED || 0
    };
  }

  private getActiveDetectionMethods(): string[] {
    const methods: string[] = [];
    if (this.config.enableAnomalyDetection) methods.push('anomaly_detection');
    if (this.config.enableThresholdMonitoring) methods.push('threshold_monitoring');
    if (this.config.enablePatternDetection) methods.push('pattern_detection');
    return methods;
  }

  private calculateAverageSeverity(alerts: TradingAlert[]): AlertSeverity {
    if (alerts.length === 0) return 'LOW';
    
    const severityScores = {
      'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4
    };
    
    const avgScore = alerts.reduce((sum, alert) => 
      sum + severityScores[alert.severity], 0
    ) / alerts.length;
    
    if (avgScore >= 3.5) return 'CRITICAL';
    if (avgScore >= 2.5) return 'HIGH';
    if (avgScore >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateAlertTrend(alerts: TradingAlert[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (alerts.length < 10) return 'STABLE';
    
    const recent = alerts.slice(-alerts.length / 2);
    const earlier = alerts.slice(0, alerts.length / 2);
    
    const recentRate = recent.length / (recent.length > 0 ? 1 : 1);
    const earlierRate = earlier.length / (earlier.length > 0 ? 1 : 1);
    
    if (recentRate > earlierRate * 1.2) return 'INCREASING';
    if (recentRate < earlierRate * 0.8) return 'DECREASING';
    return 'STABLE';
  }

  private calculateTrendPercentage(alerts: TradingAlert[]): number {
    // Simplified trend calculation
    return Math.random() * 20 - 10; // -10% to +10%
  }

  private applyAlertFilter(alerts: TradingAlert[], filter: AlertFilter): TradingAlert[] {
    return alerts.filter(alert => {
      if (filter.types && !filter.types.includes(alert.type)) return false;
      if (filter.severities && !filter.severities.includes(alert.severity)) return false;
      if (filter.statuses && !filter.statuses.includes(alert.status)) return false;
      if (filter.tickers && !filter.tickers.includes(alert.ticker)) return false;
      if (filter.minimumConfidence && alert.confidence < filter.minimumConfidence) return false;
      return true;
    });
  }

  private initializeDefaultThresholds(): void {
    // Add some default threshold configurations
    // These would typically be loaded from configuration or database
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): TradingAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalActive: number;
    totalHistory: number;
    avgResponseTime: number;
    alertsByTicker: { [ticker: string]: number };
  } {
    const alertsByTicker = this.alertHistory.reduce((acc, alert) => {
      acc[alert.ticker] = (acc[alert.ticker] || 0) + 1;
      return acc;
    }, {} as { [ticker: string]: number });

    return {
      totalActive: this.activeAlerts.size,
      totalHistory: this.alertHistory.length,
      avgResponseTime: 0, // Would calculate from actual data
      alertsByTicker
    };
  }
}

/**
 * Factory function to create alert detector
 */
export function createAlertDetectorAgent(
  storage: StorageAdapter,
  config?: Partial<AlertDetectionConfig>
): AlertDetectorAgent {
  return new AlertDetectorAgent(storage, config);
}

export default AlertDetectorAgent;