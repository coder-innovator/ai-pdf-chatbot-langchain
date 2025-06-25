/**
 * Threshold Monitor Utility
 * Monitors various metrics against configurable thresholds and triggers alerts
 */

import {
  TradingAlert,
  AlertType,
  AlertSeverity,
  ThresholdConfig,
  AlertCriteria
} from '../types/alerts.js';
import { TimeHorizon } from '../types/trading-signals.js';
import { MarketDataPoint } from '../utils/technical-calculations.js';

/**
 * Threshold breach event
 */
export interface ThresholdBreach {
  thresholdId: string;
  timestamp: Date;
  metric: string;
  ticker?: string;
  
  // Threshold details
  threshold: number;
  actualValue: number;
  deviation: number;
  deviationPercent: number;
  
  // Context
  direction: 'ABOVE' | 'BELOW';
  duration: number; // How long the breach has persisted (seconds)
  isFirstBreach: boolean;
  consecutiveBreaches: number;
  
  // Statistical context
  historicalContext?: {
    mean: number;
    standardDeviation: number;
    percentile: number;
    zScore: number;
  };
  
  // Severity assessment
  severity: AlertSeverity;
  confidence: number;
  
  // Additional data
  relatedData?: {
    volume?: number;
    price?: number;
    change?: number;
    marketContext?: string;
  };
}

/**
 * Monitoring state for a threshold
 */
interface ThresholdState {
  config: ThresholdConfig;
  lastValue?: number;
  lastCheck: Date;
  breachStartTime?: Date;
  consecutiveBreaches: number;
  totalBreaches: number;
  isCurrentlyBreached: boolean;
  historicalValues: number[];
  recentAlerts: Date[];
}

/**
 * Statistical threshold calculator
 */
export class StatisticalThresholds {
  /**
   * Calculate dynamic threshold based on statistical analysis
   */
  static calculateDynamicThreshold(
    values: number[],
    type: 'STANDARD_DEVIATION' | 'PERCENTILE' | 'IQR',
    sensitivity: number = 2.0
  ): { upper: number; lower: number; baseline: number } {
    if (values.length === 0) {
      throw new Error('Cannot calculate threshold with empty data');
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    switch (type) {
      case 'STANDARD_DEVIATION': {
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return {
          baseline: mean,
          upper: mean + (sensitivity * stdDev),
          lower: mean - (sensitivity * stdDev)
        };
      }

      case 'PERCENTILE': {
        const upperPercentile = Math.min(99, 50 + (sensitivity * 10));
        const lowerPercentile = Math.max(1, 50 - (sensitivity * 10));
        
        const upperIndex = Math.floor((upperPercentile / 100) * (sortedValues.length - 1));
        const lowerIndex = Math.floor((lowerPercentile / 100) * (sortedValues.length - 1));
        
        return {
          baseline: mean,
          upper: sortedValues[upperIndex],
          lower: sortedValues[lowerIndex]
        };
      }

      case 'IQR': {
        const q1Index = Math.floor(0.25 * (sortedValues.length - 1));
        const q3Index = Math.floor(0.75 * (sortedValues.length - 1));
        const q1 = sortedValues[q1Index];
        const q3 = sortedValues[q3Index];
        const iqr = q3 - q1;
        
        return {
          baseline: mean,
          upper: q3 + (sensitivity * iqr),
          lower: q1 - (sensitivity * iqr)
        };
      }

      default:
        throw new Error(`Unsupported threshold type: ${type}`);
    }
  }

  /**
   * Calculate Z-score for anomaly detection
   */
  static calculateZScore(value: number, values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
  }

  /**
   * Calculate percentile rank of a value
   */
  static calculatePercentile(value: number, values: number[]): number {
    if (values.length === 0) return 50;
    
    const sorted = [...values].sort((a, b) => a - b);
    let count = 0;
    
    for (const v of sorted) {
      if (v < value) count++;
    }
    
    return (count / sorted.length) * 100;
  }
}

/**
 * Main Threshold Monitor class
 */
export class ThresholdMonitor {
  private thresholds = new Map<string, ThresholdState>();
  private monitoringInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private checkIntervalMs: number = 60000) {} // Default 1 minute

  /**
   * Add a threshold to monitor
   */
  addThreshold(config: ThresholdConfig): void {
    const state: ThresholdState = {
      config,
      lastCheck: new Date(),
      consecutiveBreaches: 0,
      totalBreaches: 0,
      isCurrentlyBreached: false,
      historicalValues: [],
      recentAlerts: []
    };

    this.thresholds.set(config.id, state);
    console.log(`📊 Added threshold monitor: ${config.name} (${config.id})`);
  }

  /**
   * Remove a threshold monitor
   */
  removeThreshold(thresholdId: string): boolean {
    const removed = this.thresholds.delete(thresholdId);
    if (removed) {
      console.log(`❌ Removed threshold monitor: ${thresholdId}`);
    }
    return removed;
  }

  /**
   * Update threshold configuration
   */
  updateThreshold(thresholdId: string, updates: Partial<ThresholdConfig>): boolean {
    const state = this.thresholds.get(thresholdId);
    if (!state) return false;

    state.config = { ...state.config, ...updates, updatedAt: new Date() };
    console.log(`🔄 Updated threshold monitor: ${thresholdId}`);
    return true;
  }

  /**
   * Check a specific value against a threshold
   */
  checkValue(
    thresholdId: string, 
    value: number, 
    ticker?: string,
    additionalData?: any
  ): ThresholdBreach | null {
    const state = this.thresholds.get(thresholdId);
    if (!state || !state.config.isActive) return null;

    // Update historical values
    state.historicalValues.push(value);
    if (state.historicalValues.length > state.config.lookbackPeriod) {
      state.historicalValues.shift();
    }

    const config = state.config;
    const breach = this.evaluateThreshold(value, config, state, ticker, additionalData);

    if (breach) {
      this.updateBreachState(state, breach);
      console.log(`⚠️  Threshold breach detected: ${config.name} - ${breach.actualValue} vs ${breach.threshold}`);
    } else if (state.isCurrentlyBreached) {
      // Threshold no longer breached
      state.isCurrentlyBreached = false;
      state.breachStartTime = undefined;
      state.consecutiveBreaches = 0;
      console.log(`✅ Threshold breach resolved: ${config.name}`);
    }

    state.lastValue = value;
    state.lastCheck = new Date();

    return breach;
  }

  /**
   * Check multiple values in batch
   */
  checkValues(values: Array<{
    thresholdId: string;
    value: number;
    ticker?: string;
    additionalData?: any;
  }>): ThresholdBreach[] {
    const breaches: ThresholdBreach[] = [];

    for (const { thresholdId, value, ticker, additionalData } of values) {
      const breach = this.checkValue(thresholdId, value, ticker, additionalData);
      if (breach) {
        breaches.push(breach);
      }
    }

    return breaches;
  }

  /**
   * Start automated monitoring
   */
  startMonitoring(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.monitoringInterval = setInterval(() => {
      this.performScheduledChecks();
    }, this.checkIntervalMs);

    console.log(`🎯 Threshold monitoring started (interval: ${this.checkIntervalMs}ms)`);
  }

  /**
   * Stop automated monitoring
   */
  stopMonitoring(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log(`⏹️  Threshold monitoring stopped`);
  }

  /**
   * Get current status of all thresholds
   */
  getThresholdStatus(): Array<{
    id: string;
    name: string;
    isActive: boolean;
    isBreached: boolean;
    lastValue?: number;
    lastCheck: Date;
    breachCount: number;
  }> {
    return Array.from(this.thresholds.entries()).map(([id, state]) => ({
      id,
      name: state.config.name,
      isActive: state.config.isActive,
      isBreached: state.isCurrentlyBreached,
      lastValue: state.lastValue,
      lastCheck: state.lastCheck,
      breachCount: state.totalBreaches
    }));
  }

  /**
   * Get historical data for a threshold
   */
  getThresholdHistory(thresholdId: string): {
    values: number[];
    breaches: number;
    averageValue: number;
    volatility: number;
  } | null {
    const state = this.thresholds.get(thresholdId);
    if (!state) return null;

    const values = state.historicalValues;
    const average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    const variance = values.length > 0 ? 
      values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length : 0;

    return {
      values: [...values],
      breaches: state.totalBreaches,
      averageValue: average,
      volatility: Math.sqrt(variance)
    };
  }

  /**
   * Create alert from threshold breach
   */
  createAlertFromBreach(breach: ThresholdBreach): TradingAlert {
    const state = this.thresholds.get(breach.thresholdId);
    if (!state) {
      throw new Error(`Threshold state not found: ${breach.thresholdId}`);
    }

    const config = state.config;
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: alertId,
      type: config.alertType,
      severity: breach.severity,
      ticker: breach.ticker || 'UNKNOWN',
      timestamp: breach.timestamp,
      
      message: this.generateBreachMessage(breach, config),
      description: this.generateBreachDescription(breach, config),
      confidence: breach.confidence,
      
      currentPrice: breach.relatedData?.price,
      percentChange: breach.relatedData?.change,
      volume: breach.relatedData?.volume,
      
      trigger: {
        condition: `${config.metric} ${breach.direction.toLowerCase()} threshold`,
        threshold: breach.threshold,
        actualValue: breach.actualValue,
        timeframe: config.timeframe
      },
      
      source: 'ThresholdMonitor',
      category: 'threshold_breach',
      tags: [config.metric, breach.direction.toLowerCase()],
      
      status: 'ACTIVE',
      deliveryMethods: config.deliveryMethods,
      deliveryStatus: {},
      
      suggestedActions: this.generateSuggestedActions(breach, config),
      followUpRequired: breach.severity === 'CRITICAL' || breach.severity === 'HIGH'
    };
  }

  // Private helper methods

  private evaluateThreshold(
    value: number,
    config: ThresholdConfig,
    state: ThresholdState,
    ticker?: string,
    additionalData?: any
  ): ThresholdBreach | null {
    const threshold = config.threshold;
    let isBreached = false;
    let direction: 'ABOVE' | 'BELOW' = 'ABOVE';
    let thresholdValue = threshold.value;

    // Calculate dynamic threshold if needed
    if (threshold.type === 'STANDARD_DEVIATION' || threshold.type === 'PERCENTILE') {
      if (state.historicalValues.length < 10) {
        return null; // Need enough historical data
      }

      const dynamicThresholds = StatisticalThresholds.calculateDynamicThreshold(
        state.historicalValues,
        threshold.type,
        threshold.value // Use as sensitivity multiplier
      );

      if (threshold.direction === 'ABOVE') {
        thresholdValue = dynamicThresholds.upper;
        isBreached = value > thresholdValue;
        direction = 'ABOVE';
      } else if (threshold.direction === 'BELOW') {
        thresholdValue = dynamicThresholds.lower;
        isBreached = value < thresholdValue;
        direction = 'BELOW';
      } else { // OUTSIDE_RANGE
        isBreached = value > dynamicThresholds.upper || value < dynamicThresholds.lower;
        direction = value > dynamicThresholds.upper ? 'ABOVE' : 'BELOW';
        thresholdValue = direction === 'ABOVE' ? dynamicThresholds.upper : dynamicThresholds.lower;
      }
    } else {
      // Static threshold evaluation
      switch (threshold.direction) {
        case 'ABOVE':
          isBreached = value > thresholdValue;
          direction = 'ABOVE';
          break;
        case 'BELOW':
          isBreached = value < thresholdValue;
          direction = 'BELOW';
          break;
        case 'OUTSIDE_RANGE':
          if (threshold.upperBound && threshold.lowerBound) {
            isBreached = value > threshold.upperBound || value < threshold.lowerBound;
            direction = value > threshold.upperBound ? 'ABOVE' : 'BELOW';
            thresholdValue = direction === 'ABOVE' ? threshold.upperBound : threshold.lowerBound;
          }
          break;
      }
    }

    if (!isBreached) return null;

    // Check minimum duration if specified
    if (config.minimumDuration && state.breachStartTime) {
      const breachDuration = (Date.now() - state.breachStartTime.getTime()) / 1000;
      if (breachDuration < config.minimumDuration * 60) {
        return null; // Breach hasn't persisted long enough
      }
    }

    // Calculate deviation
    const deviation = Math.abs(value - thresholdValue);
    const deviationPercent = (deviation / Math.abs(thresholdValue)) * 100;

    // Calculate severity
    const severity = this.calculateBreachSeverity(deviation, deviationPercent, config);

    // Calculate confidence based on historical context
    const confidence = this.calculateBreachConfidence(value, state.historicalValues, threshold);

    // Create historical context
    const historicalContext = state.historicalValues.length > 0 ? {
      mean: state.historicalValues.reduce((sum, v) => sum + v, 0) / state.historicalValues.length,
      standardDeviation: Math.sqrt(
        state.historicalValues.reduce((sum, v) => sum + Math.pow(v - 
          (state.historicalValues.reduce((s, vv) => s + vv, 0) / state.historicalValues.length), 2), 0
        ) / state.historicalValues.length
      ),
      percentile: StatisticalThresholds.calculatePercentile(value, state.historicalValues),
      zScore: StatisticalThresholds.calculateZScore(value, state.historicalValues)
    } : undefined;

    const breach: ThresholdBreach = {
      thresholdId: config.id,
      timestamp: new Date(),
      metric: config.metric,
      ticker,
      
      threshold: thresholdValue,
      actualValue: value,
      deviation,
      deviationPercent,
      
      direction,
      duration: state.breachStartTime ? 
        (Date.now() - state.breachStartTime.getTime()) / 1000 : 0,
      isFirstBreach: !state.isCurrentlyBreached,
      consecutiveBreaches: state.consecutiveBreaches + 1,
      
      historicalContext,
      severity,
      confidence,
      
      relatedData: additionalData
    };

    return breach;
  }

  private updateBreachState(state: ThresholdState, breach: ThresholdBreach): void {
    if (!state.isCurrentlyBreached) {
      state.breachStartTime = new Date();
      state.isCurrentlyBreached = true;
    }
    
    state.consecutiveBreaches++;
    state.totalBreaches++;
    state.config.lastTriggered = new Date();
    state.config.breachCount++;
  }

  private calculateBreachSeverity(
    deviation: number,
    deviationPercent: number,
    config: ThresholdConfig
  ): AlertSeverity {
    // Base severity from config
    let severity = config.severity;

    // Escalate based on deviation magnitude
    if (deviationPercent > 50) {
      severity = 'CRITICAL';
    } else if (deviationPercent > 25) {
      severity = severity === 'LOW' ? 'MEDIUM' : 'HIGH';
    } else if (deviationPercent > 10) {
      severity = severity === 'LOW' ? 'MEDIUM' : severity;
    }

    return severity;
  }

  private calculateBreachConfidence(
    value: number,
    historicalValues: number[],
    threshold: any
  ): number {
    if (historicalValues.length < 5) return 0.5; // Low confidence with little data

    const zScore = Math.abs(StatisticalThresholds.calculateZScore(value, historicalValues));
    
    // Higher Z-score = higher confidence in anomaly
    if (zScore > 3) return 0.95;
    if (zScore > 2) return 0.85;
    if (zScore > 1.5) return 0.75;
    if (zScore > 1) return 0.65;
    return 0.5;
  }

  private generateBreachMessage(breach: ThresholdBreach, config: ThresholdConfig): string {
    const direction = breach.direction.toLowerCase();
    const metric = config.metric.toUpperCase();
    const deviation = breach.deviationPercent.toFixed(1);
    
    return `${metric} ${direction} threshold: ${breach.actualValue.toFixed(2)} vs ${breach.threshold.toFixed(2)} (${deviation}% deviation)`;
  }

  private generateBreachDescription(breach: ThresholdBreach, config: ThresholdConfig): string {
    let description = `Threshold "${config.name}" has been breached. `;
    description += `The ${config.metric} value of ${breach.actualValue.toFixed(2)} is `;
    description += `${breach.direction.toLowerCase()} the threshold of ${breach.threshold.toFixed(2)}.`;
    
    if (breach.historicalContext) {
      description += ` This represents a ${breach.historicalContext.zScore.toFixed(2)} standard deviation `;
      description += `from the historical mean of ${breach.historicalContext.mean.toFixed(2)}.`;
    }
    
    if (breach.consecutiveBreaches > 1) {
      description += ` This is the ${breach.consecutiveBreaches} consecutive breach.`;
    }
    
    return description;
  }

  private generateSuggestedActions(breach: ThresholdBreach, config: ThresholdConfig): string[] {
    const actions: string[] = [];
    
    if (breach.severity === 'CRITICAL') {
      actions.push('Immediate investigation required');
      actions.push('Consider position adjustment');
    }
    
    if (breach.consecutiveBreaches > 3) {
      actions.push('Review threshold configuration');
      actions.push('Analyze underlying trend');
    }
    
    if (breach.historicalContext && Math.abs(breach.historicalContext.zScore) > 2) {
      actions.push('Statistical anomaly detected - verify data accuracy');
    }
    
    actions.push(`Monitor ${config.metric} closely`);
    
    return actions;
  }

  private performScheduledChecks(): void {
    // In a real implementation, this would fetch current data and check all thresholds
    console.log(`🔍 Performing scheduled threshold checks (${this.thresholds.size} thresholds)`);
    
    // This is where you would integrate with data sources to get current values
    // and call checkValue() for each active threshold
  }
}

/**
 * Factory function to create threshold monitor
 */
export function createThresholdMonitor(checkIntervalMs?: number): ThresholdMonitor {
  return new ThresholdMonitor(checkIntervalMs);
}

/**
 * Utility functions for common threshold configurations
 */
export const ThresholdUtils = {
  /**
   * Create price movement threshold
   */
  createPriceThreshold(
    ticker: string,
    percentChange: number,
    timeframe: TimeHorizon = 'SHORT_TERM',
    severity: AlertSeverity = 'MEDIUM'
  ): ThresholdConfig {
    return {
      id: `price-${ticker}-${Date.now()}`,
      name: `Price Movement Alert - ${ticker}`,
      description: `Alert when ${ticker} price changes by ${percentChange}%`,
      ticker,
      metric: 'price_change_percent',
      threshold: {
        value: percentChange,
        type: 'PERCENTAGE',
        direction: 'OUTSIDE_RANGE',
        upperBound: percentChange,
        lowerBound: -percentChange
      },
      checkInterval: 5,
      timeframe,
      lookbackPeriod: 100,
      alertType: 'PRICE_MOVEMENT',
      severity,
      deliveryMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      isActive: true,
      breachCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  /**
   * Create volume spike threshold
   */
  createVolumeThreshold(
    ticker: string,
    volumeMultiplier: number,
    severity: AlertSeverity = 'MEDIUM'
  ): ThresholdConfig {
    return {
      id: `volume-${ticker}-${Date.now()}`,
      name: `Volume Spike Alert - ${ticker}`,
      description: `Alert when ${ticker} volume exceeds ${volumeMultiplier}x average`,
      ticker,
      metric: 'volume_ratio',
      threshold: {
        value: volumeMultiplier,
        type: 'ABSOLUTE',
        direction: 'ABOVE'
      },
      checkInterval: 5,
      timeframe: 'SHORT_TERM',
      lookbackPeriod: 50,
      alertType: 'VOLUME_SPIKE',
      severity,
      deliveryMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      isActive: true,
      breachCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  /**
   * Create RSI threshold
   */
  createRSIThreshold(
    ticker: string,
    overbought: number = 70,
    oversold: number = 30,
    severity: AlertSeverity = 'MEDIUM'
  ): ThresholdConfig {
    return {
      id: `rsi-${ticker}-${Date.now()}`,
      name: `RSI Alert - ${ticker}`,
      description: `Alert when ${ticker} RSI is overbought (>${overbought}) or oversold (<${oversold})`,
      ticker,
      metric: 'rsi',
      threshold: {
        value: 50, // Midpoint
        type: 'ABSOLUTE',
        direction: 'OUTSIDE_RANGE',
        upperBound: overbought,
        lowerBound: oversold
      },
      checkInterval: 15,
      timeframe: 'SHORT_TERM',
      lookbackPeriod: 30,
      alertType: 'TECHNICAL_BREAKOUT',
      severity,
      deliveryMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      isActive: true,
      breachCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
};

export default {
  ThresholdMonitor,
  StatisticalThresholds,
  ThresholdUtils,
  createThresholdMonitor
};