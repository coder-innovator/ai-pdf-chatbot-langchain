/**
 * Alert and Notification Types
 * Comprehensive type definitions for trading alerts, anomalies, and notifications
 */

import { SignalAction, RiskLevel, TimeHorizon } from './trading-signals.js';

/**
 * Alert types
 */
export type AlertType = 
  | 'PRICE_MOVEMENT'
  | 'VOLUME_SPIKE' 
  | 'TECHNICAL_BREAKOUT'
  | 'SENTIMENT_SHIFT'
  | 'RISK_WARNING'
  | 'NEWS_EVENT'
  | 'PATTERN_DETECTED'
  | 'THRESHOLD_BREACH'
  | 'ANOMALY_DETECTED'
  | 'SIGNAL_GENERATED'
  | 'STOP_LOSS_HIT'
  | 'TARGET_REACHED';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Alert status
 */
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

/**
 * Alert delivery methods
 */
export type AlertDeliveryMethod = 'CONSOLE' | 'EMAIL' | 'WEBHOOK' | 'UI_NOTIFICATION' | 'SMS';

/**
 * Main trading alert interface
 */
export interface TradingAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  ticker: string;
  timestamp: Date;
  
  // Core alert data
  message: string;
  description?: string;
  confidence: number; // 0-1
  
  // Alert context
  currentPrice?: number;
  previousPrice?: number;
  priceChange?: number;
  percentChange?: number;
  volume?: number;
  
  // Technical data
  technicalIndicators?: {
    [indicator: string]: number;
  };
  
  // Trigger information
  trigger: {
    condition: string;
    threshold?: number;
    actualValue?: number;
    timeframe?: TimeHorizon;
  };
  
  // Related data
  relatedSignal?: {
    action: SignalAction;
    confidence: number;
    reasoning: string;
  };
  
  // Risk information
  riskLevel?: RiskLevel;
  riskFactors?: string[];
  
  // Metadata
  source: string; // Which detector/agent generated this
  category: string;
  tags: string[];
  
  // Alert lifecycle
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  
  // Delivery tracking
  deliveryMethods: AlertDeliveryMethod[];
  deliveredAt?: Date;
  deliveryStatus: {
    [method in AlertDeliveryMethod]?: {
      sent: boolean;
      timestamp?: Date;
      error?: string;
    };
  };
  
  // Actions and recommendations
  suggestedActions: string[];
  autoActions?: {
    stopLoss?: number;
    takeProfit?: number;
    positionAdjustment?: number;
  };
  
  // Follow-up
  followUpRequired: boolean;
  followUpAt?: Date;
  relatedAlerts?: string[]; // IDs of related alerts
}

/**
 * Alert configuration for specific criteria
 */
export interface AlertCriteria {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  
  // Target specification
  ticker?: string; // Specific ticker or undefined for all
  category: string;
  
  // Trigger conditions
  conditions: {
    priceChange?: {
      threshold: number; // Percentage
      timeframe: TimeHorizon;
      direction?: 'UP' | 'DOWN' | 'EITHER';
    };
    volumeSpike?: {
      multiplier: number; // Multiple of average volume
      timeframe: TimeHorizon;
    };
    technicalBreakout?: {
      indicator: string;
      threshold: number;
      direction: 'ABOVE' | 'BELOW' | 'CROSS';
    };
    sentimentShift?: {
      threshold: number; // Change in sentiment score
      timeframe: TimeHorizon;
    };
    riskIncrease?: {
      riskLevel: RiskLevel;
      factors?: string[];
    };
  };
  
  // Alert settings
  severity: AlertSeverity;
  deliveryMethods: AlertDeliveryMethod[];
  cooldownPeriod: number; // Minutes before same alert can trigger again
  
  // Filtering
  tradingHours?: boolean; // Only during trading hours
  minimumConfidence?: number;
  excludeWeekends?: boolean;
  
  // Actions
  autoAcknowledge?: boolean;
  autoResolve?: number; // Minutes after which to auto-resolve
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  lastTriggered?: Date;
  triggerCount: number;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  id: string;
  ticker: string;
  timestamp: Date;
  
  // Anomaly details
  anomalyType: 'STATISTICAL' | 'PATTERN' | 'BEHAVIORAL' | 'VOLUME' | 'PRICE' | 'CORRELATION';
  severity: AlertSeverity;
  confidence: number;
  
  // Statistical measures
  zScore?: number;
  pValue?: number;
  deviationFromNorm: number;
  
  // Description
  description: string;
  explanation: string;
  
  // Data points
  expectedValue?: number;
  actualValue: number;
  threshold: number;
  
  // Context
  historicalContext: {
    averageValue: number;
    standardDeviation: number;
    sampleSize: number;
    lookbackPeriod: number;
  };
  
  // Impact assessment
  impact: {
    riskLevel: RiskLevel;
    potentialConsequences: string[];
    recommendedActions: string[];
  };
  
  // Related data
  affectedMetrics: string[];
  correlatedAnomalies?: string[]; // IDs of related anomalies
  
  // Resolution
  requiresInvestigation: boolean;
  investigationNotes?: string;
  resolvedAt?: Date;
}

/**
 * Threshold monitoring configuration
 */
export interface ThresholdConfig {
  id: string;
  name: string;
  description: string;
  
  // Target
  ticker?: string;
  metric: string; // What to monitor (price, volume, rsi, etc.)
  
  // Threshold definition
  threshold: {
    value: number;
    type: 'ABSOLUTE' | 'PERCENTAGE' | 'STANDARD_DEVIATION' | 'PERCENTILE';
    direction: 'ABOVE' | 'BELOW' | 'OUTSIDE_RANGE';
    upperBound?: number;
    lowerBound?: number;
  };
  
  // Monitoring settings
  checkInterval: number; // Minutes
  timeframe: TimeHorizon;
  lookbackPeriod: number; // Data points to consider
  
  // Alert settings
  alertType: AlertType;
  severity: AlertSeverity;
  deliveryMethods: AlertDeliveryMethod[];
  
  // Conditions
  minimumDuration?: number; // Minutes threshold must be breached
  confirmationRequired?: boolean;
  
  // State
  isActive: boolean;
  lastChecked?: Date;
  lastTriggered?: Date;
  currentValue?: number;
  breachCount: number;
  
  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Alert aggregation and summary
 */
export interface AlertSummary {
  timeframe: {
    start: Date;
    end: Date;
  };
  
  // Counts by type
  totalAlerts: number;
  alertsByType: { [type in AlertType]: number };
  alertsBySeverity: { [severity in AlertSeverity]: number };
  alertsByStatus: { [status in AlertStatus]: number };
  
  // Top contributors
  topTickers: Array<{
    ticker: string;
    alertCount: number;
    lastAlert: Date;
  }>;
  
  topAlertTypes: Array<{
    type: AlertType;
    count: number;
    averageSeverity: AlertSeverity;
  }>;
  
  // Performance metrics
  averageResponseTime?: number; // Time to acknowledge
  averageResolutionTime?: number; // Time to resolve
  falsePositiveRate?: number;
  
  // Trends
  alertTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendPercentage: number;
  
  // Critical information
  criticalUnresolved: number;
  oldestUnresolved?: Date;
  recentAnomalies: number;
}

/**
 * Alert filter and search criteria
 */
export interface AlertFilter {
  // Time range
  startDate?: Date;
  endDate?: Date;
  
  // Basic filters
  types?: AlertType[];
  severities?: AlertSeverity[];
  statuses?: AlertStatus[];
  tickers?: string[];
  
  // Advanced filters
  minimumConfidence?: number;
  sources?: string[];
  categories?: string[];
  tags?: string[];
  
  // Search
  searchText?: string;
  
  // Sorting
  sortBy?: 'timestamp' | 'severity' | 'confidence' | 'ticker';
  sortOrder?: 'ASC' | 'DESC';
  
  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * Alert subscription for real-time updates
 */
export interface AlertSubscription {
  id: string;
  userId: string;
  
  // Subscription criteria
  filter: AlertFilter;
  deliveryMethods: AlertDeliveryMethod[];
  
  // Settings
  isActive: boolean;
  realTimeUpdates: boolean;
  digestFrequency?: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  
  // Delivery preferences
  quietHours?: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
  
  // Metadata
  createdAt: Date;
  lastDelivery?: Date;
  deliveryCount: number;
}

/**
 * Alert performance metrics
 */
export interface AlertMetrics {
  period: {
    start: Date;
    end: Date;
  };
  
  // Volume metrics
  totalAlerts: number;
  alertsPerDay: number;
  peakAlertTime?: Date;
  
  // Quality metrics
  accuracy?: number; // For alerts that can be verified
  falsePositiveRate: number;
  missedOpportunities?: number;
  
  // Response metrics
  averageAcknowledgmentTime: number;
  averageResolutionTime: number;
  unacknowledgedAlerts: number;
  
  // System performance
  detectionLatency: number; // Time from trigger to alert
  deliverySuccess: number; // Percentage of successful deliveries
  systemUptime: number;
  
  // User engagement
  userResponseRate: number;
  mostActiveUsers: Array<{
    userId: string;
    alertCount: number;
    responseRate: number;
  }>;
}

/**
 * Alert export utilities
 */
export type AlertExportFormat = 'JSON' | 'CSV' | 'PDF' | 'EXCEL';

export interface AlertExportRequest {
  filter: AlertFilter;
  format: AlertExportFormat;
  includeMetadata: boolean;
  includeCharts?: boolean;
  filename?: string;
}

/**
 * Alert type guards and utilities
 */
export function isTradingAlert(obj: any): obj is TradingAlert {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.ticker === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 && obj.confidence <= 1
  );
}

export function isValidAlertType(type: string): type is AlertType {
  return [
    'PRICE_MOVEMENT', 'VOLUME_SPIKE', 'TECHNICAL_BREAKOUT', 'SENTIMENT_SHIFT',
    'RISK_WARNING', 'NEWS_EVENT', 'PATTERN_DETECTED', 'THRESHOLD_BREACH',
    'ANOMALY_DETECTED', 'SIGNAL_GENERATED', 'STOP_LOSS_HIT', 'TARGET_REACHED'
  ].includes(type);
}

export function isValidAlertSeverity(severity: string): severity is AlertSeverity {
  return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity);
}

/**
 * Alert utilities
 */
export const AlertUtils = {
  /**
   * Calculate alert priority score
   */
  calculatePriority(alert: TradingAlert): number {
    const severityScores = {
      'LOW': 1,
      'MEDIUM': 2, 
      'HIGH': 3,
      'CRITICAL': 4
    };
    
    return severityScores[alert.severity] * alert.confidence;
  },

  /**
   * Check if alert is time-sensitive
   */
  isTimeSensitive(alert: TradingAlert): boolean {
    const timeSensitiveTypes: AlertType[] = [
      'STOP_LOSS_HIT', 'TARGET_REACHED', 'RISK_WARNING', 'ANOMALY_DETECTED'
    ];
    return timeSensitiveTypes.includes(alert.type) || alert.severity === 'CRITICAL';
  },

  /**
   * Format alert message for display
   */
  formatMessage(alert: TradingAlert): string {
    const emoji = alert.severity === 'CRITICAL' ? '🚨' : 
                  alert.severity === 'HIGH' ? '⚠️' : 
                  alert.severity === 'MEDIUM' ? '📊' : 'ℹ️';
    
    return `${emoji} ${alert.message}`;
  },

  /**
   * Get alert age in minutes
   */
  getAlertAge(alert: TradingAlert): number {
    return Math.floor((Date.now() - alert.timestamp.getTime()) / (1000 * 60));
  },

  /**
   * Check if alert should be escalated
   */
  shouldEscalate(alert: TradingAlert, ageThresholdMinutes: number = 30): boolean {
    return alert.status === 'ACTIVE' && 
           alert.severity === 'CRITICAL' && 
           this.getAlertAge(alert) > ageThresholdMinutes;
  }
};

export default {
  AlertUtils,
  isTradingAlert,
  isValidAlertType,
  isValidAlertSeverity
};