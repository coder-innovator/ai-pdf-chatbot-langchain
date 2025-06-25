/**
 * Mock Real-Time Updater Service
 * Simulates database real-time updates and triggers WebSocket broadcasts
 * Replicates what Supabase real-time subscriptions would provide
 */

import { EventEmitter } from 'events';
import { TradingSignal, SignalAction } from '../types/trading-signals.js';
import { TradingAlert, AlertType, AlertSeverity } from '../types/alerts.js';
import { mockTradingStorage } from '../api/trading/mock-data.js';
import { SignalGeneratorAgent } from '../agents/signal-generator.js';
import { TechnicalAnalysisAgent } from '../agents/technical-analysis.js';
import { SentimentAnalysisAgent } from '../agents/sentiment-analysis.js';
import { AlertDetectorAgent } from '../agents/alert-detector.js';

/**
 * Real-time update event types
 */
export type UpdateEvent = 
  | 'signal_created'
  | 'signal_updated' 
  | 'signal_deleted'
  | 'alert_created'
  | 'alert_updated'
  | 'alert_resolved'
  | 'price_changed'
  | 'market_status_changed';

/**
 * Update event data
 */
export interface UpdateEventData {
  type: UpdateEvent;
  table: string;
  record: any;
  old_record?: any;
  timestamp: Date;
  source: 'mock_updater';
}

/**
 * Update configuration
 */
export interface UpdaterConfig {
  enableAutoSignals: boolean;
  enableAutoAlerts: boolean;
  enablePriceUpdates: boolean;
  signalIntervalMs: number;
  alertIntervalMs: number;
  priceIntervalMs: number;
  tickers: string[];
}

/**
 * Mock Real-Time Updater Class
 */
export class MockRealTimeUpdater extends EventEmitter {
  private config: UpdaterConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  
  // Analysis agents
  private technicalAgent: TechnicalAnalysisAgent;
  private sentimentAgent: SentimentAnalysisAgent;
  private signalGenerator: SignalGeneratorAgent;
  private alertDetector: AlertDetectorAgent;

  constructor(config: Partial<UpdaterConfig> = {}) {
    super();
    
    this.config = {
      enableAutoSignals: true,
      enableAutoAlerts: true,
      enablePriceUpdates: true,
      signalIntervalMs: 45000, // 45 seconds
      alertIntervalMs: 20000,  // 20 seconds
      priceIntervalMs: 3000,   // 3 seconds
      tickers: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX'],
      ...config
    };

    // Initialize analysis agents
    this.technicalAgent = new TechnicalAnalysisAgent(mockTradingStorage as any);
    this.sentimentAgent = new SentimentAnalysisAgent();
    this.signalGenerator = new SignalGeneratorAgent(
      this.technicalAgent,
      this.sentimentAgent,
      mockTradingStorage
    );
    this.alertDetector = new AlertDetectorAgent(mockTradingStorage as any);

    console.log('🔄 Mock Real-Time Updater initialized');
  }

  /**
   * Start all real-time update processes
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Real-time updater is already running');
      return;
    }

    console.log('🚀 Starting mock real-time updater...');
    this.isRunning = true;

    // Start automatic signal generation
    if (this.config.enableAutoSignals) {
      this.startAutoSignalGeneration();
    }

    // Start automatic alert detection
    if (this.config.enableAutoAlerts) {
      this.startAutoAlertDetection();
    }

    // Start price updates
    if (this.config.enablePriceUpdates) {
      this.startPriceUpdates();
    }

    // Start market status monitoring
    this.startMarketStatusMonitoring();

    this.emit('updater_started', { timestamp: new Date() });
    console.log('✅ Mock real-time updater started');
  }

  /**
   * Stop all real-time update processes
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Real-time updater is not running');
      return;
    }

    console.log('⏹️ Stopping mock real-time updater...');
    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`🛑 Stopped ${name} updates`);
    }
    
    this.intervals.clear();
    this.emit('updater_stopped', { timestamp: new Date() });
    console.log('✅ Mock real-time updater stopped');
  }

  /**
   * Start automatic signal generation
   */
  private startAutoSignalGeneration(): void {
    console.log(`📊 Starting auto signal generation (every ${this.config.signalIntervalMs}ms)`);
    
    const interval = setInterval(async () => {
      try {
        const ticker = this.getRandomTicker();
        console.log(`🤖 Auto-generating signal for ${ticker}...`);
        
        const signal = await this.signalGenerator.generateSignal(ticker);
        
        // Emit real-time update event
        this.emitUpdate('signal_created', 'trading_signals', signal);
        
        console.log(`✅ Auto-generated ${signal.action} signal for ${ticker} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`);
        
      } catch (error) {
        console.error('❌ Error in auto signal generation:', error);
      }
    }, this.config.signalIntervalMs);

    this.intervals.set('auto_signals', interval);
  }

  /**
   * Start automatic alert detection
   */
  private startAutoAlertDetection(): void {
    console.log(`🚨 Starting auto alert detection (every ${this.config.alertIntervalMs}ms)`);
    
    const interval = setInterval(async () => {
      try {
        const ticker = this.getRandomTicker();
        console.log(`🔍 Auto-detecting alerts for ${ticker}...`);
        
        // Detect various types of alerts
        const signalAlerts = await this.alertDetector.detectSignalAlerts(ticker);
        const priceAlerts = await this.alertDetector.detectPriceAlerts(ticker);
        const volumeAlerts = await this.alertDetector.detectVolumeAlerts(ticker);
        
        const allAlerts = [...signalAlerts, ...priceAlerts, ...volumeAlerts];
        
        // Process each alert
        for (const alert of allAlerts) {
          // Store alert
          await mockTradingStorage.insert('trading_alerts', alert);
          
          // Emit real-time update event
          this.emitUpdate('alert_created', 'trading_alerts', alert);
          
          console.log(`🚨 Auto-detected ${alert.type} alert for ${ticker} (severity: ${alert.severity})`);
        }
        
        if (allAlerts.length === 0) {
          console.log(`🔍 No alerts detected for ${ticker}`);
        }
        
      } catch (error) {
        console.error('❌ Error in auto alert detection:', error);
      }
    }, this.config.alertIntervalMs);

    this.intervals.set('auto_alerts', interval);
  }

  /**
   * Start price updates (simulated)
   */
  private startPriceUpdates(): void {
    console.log(`💰 Starting price updates (every ${this.config.priceIntervalMs}ms)`);
    
    const interval = setInterval(() => {
      try {
        for (const ticker of this.config.tickers) {
          const priceUpdate = this.generatePriceUpdate(ticker);
          
          // Emit price change event
          this.emitUpdate('price_changed', 'market_data', priceUpdate);
        }
        
      } catch (error) {
        console.error('❌ Error in price updates:', error);
      }
    }, this.config.priceIntervalMs);

    this.intervals.set('price_updates', interval);
  }

  /**
   * Start market status monitoring
   */
  private startMarketStatusMonitoring(): void {
    console.log('📈 Starting market status monitoring (every 60 seconds)');
    
    const interval = setInterval(() => {
      try {
        const marketStatus = this.getCurrentMarketStatus();
        
        // Emit market status update
        this.emitUpdate('market_status_changed', 'market_status', {
          status: marketStatus,
          timestamp: new Date(),
          timezone: 'America/New_York'
        });
        
      } catch (error) {
        console.error('❌ Error in market status monitoring:', error);
      }
    }, 60000); // Every minute

    this.intervals.set('market_status', interval);
  }

  /**
   * Generate a new trading signal manually
   */
  async generateSignal(ticker: string, options: {
    action?: SignalAction;
    confidence?: number;
    reasoning?: string;
  } = {}): Promise<TradingSignal> {
    console.log(`🎯 Manually generating signal for ${ticker.toUpperCase()}`);
    
    let signal: TradingSignal;
    
    if (options.action) {
      // Create custom signal with specified action
      signal = await this.createCustomSignal(ticker.toUpperCase(), options);
    } else {
      // Generate signal using the signal generator
      signal = await this.signalGenerator.generateSignal(ticker.toUpperCase());
    }
    
    // Emit real-time update event
    this.emitUpdate('signal_created', 'trading_signals', signal);
    
    console.log(`✅ Manually generated ${signal.action} signal for ${ticker} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`);
    
    return signal;
  }

  /**
   * Create a new alert manually
   */
  async createAlert(ticker: string, options: {
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: any;
  }): Promise<TradingAlert> {
    console.log(`🚨 Manually creating alert for ${ticker.toUpperCase()}`);
    
    const alert: TradingAlert = {
      id: `manual-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker: ticker.toUpperCase(),
      type: options.type,
      severity: options.severity,
      message: options.message,
      timestamp: new Date(),
      confidence: 0.9,
      status: 'ACTIVE',
      trigger: {
        condition: options.message,
        threshold: 0,
        actualValue: 0
      },
      source: 'manual_creation',
      category: 'manual_alert',
      tags: ['manual'],
      deliveryMethods: ['CONSOLE'],
      deliveryStatus: {},
      suggestedActions: ['Monitor position', 'Review strategy'],
      followUpRequired: true
    };

    // Store alert
    await mockTradingStorage.insert('trading_alerts', alert);
    
    // Emit real-time update event
    this.emitUpdate('alert_created', 'trading_alerts', alert);
    
    console.log(`✅ Manually created ${alert.type} alert for ${ticker} (severity: ${alert.severity})`);
    
    return alert;
  }

  /**
   * Update an existing signal
   */
  async updateSignal(signalId: string, updates: Partial<TradingSignal>): Promise<void> {
    console.log(`✏️ Updating signal ${signalId}`);
    
    // Get old record first
    const signals = await mockTradingStorage.select('trading_signals', { limit: 100 });
    const oldRecord = signals.find(s => s.id === signalId);
    
    // Update signal
    const updatedSignal = await mockTradingStorage.update('trading_signals', signalId, updates);
    
    // Emit real-time update event
    this.emitUpdate('signal_updated', 'trading_signals', updatedSignal, oldRecord);
    
    console.log(`✅ Updated signal ${signalId}`);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string = 'MANUAL_RESOLUTION'): Promise<void> {
    console.log(`✅ Resolving alert ${alertId}`);
    
    // Get old record first
    const alerts = await mockTradingStorage.select('trading_alerts', { limit: 100 });
    const oldRecord = alerts.find(a => a.id === alertId);
    
    // Update alert status
    const updatedAlert = await mockTradingStorage.update('trading_alerts', alertId, {
      status: 'RESOLVED',
      resolved_at: new Date(),
      resolution
    });
    
    // Emit real-time update event
    this.emitUpdate('alert_resolved', 'trading_alerts', updatedAlert, oldRecord);
    
    console.log(`✅ Resolved alert ${alertId}`);
  }

  /**
   * Trigger alerts for specific conditions
   */
  async triggerAlertsForTicker(ticker: string): Promise<TradingAlert[]> {
    console.log(`🔍 Triggering alert detection for ${ticker.toUpperCase()}`);
    
    const alerts: TradingAlert[] = [];
    
    // Run various alert detections
    const allAlerts = await this.alertDetector.detectAlerts(ticker.toUpperCase(), [], {
      priceThreshold: 0.05,
      volumeThreshold: 2.0,
      timeWindow: 300000
    });
    
    alerts.push(...allAlerts);
    
    // Process and emit each alert
    for (const alert of alerts) {
      await mockTradingStorage.insert('trading_alerts', alert);
      this.emitUpdate('alert_created', 'trading_alerts', alert);
    }
    
    console.log(`✅ Triggered ${alerts.length} alerts for ${ticker}`);
    
    return alerts;
  }

  /**
   * Emit a real-time update event
   */
  private emitUpdate(type: UpdateEvent, table: string, record: any, oldRecord?: any): void {
    const updateData: UpdateEventData = {
      type,
      table,
      record,
      old_record: oldRecord,
      timestamp: new Date(),
      source: 'mock_updater'
    };

    // Emit to internal listeners
    this.emit('update', updateData);
    this.emit(type, updateData);
    
    // Log the update
    console.log(`📡 Real-time update: ${type} in ${table} (${record.id || 'unknown id'})`);
  }

  /**
   * Create custom signal with specified parameters
   */
  private async createCustomSignal(
    ticker: string, 
    options: {
      action?: SignalAction;
      confidence?: number;
      reasoning?: string;
    }
  ): Promise<TradingSignal> {
    const signal: TradingSignal = {
      id: `custom-signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker,
      timestamp: new Date(),
      action: options.action || 'HOLD',
      strength: 'MODERATE',
      confidence: options.confidence || (0.7 + Math.random() * 0.2),
      currentPrice: 100 + Math.random() * 400,
      reasoning: options.reasoning || `Custom signal generated for ${ticker}`,
      technicalContributions: {
        movingAverages: {
          signal: (options.action === 'HOLD' ? 'NEUTRAL' : options.action || 'NEUTRAL') as any,
          weight: 0.3,
          confidence: 0.7 + Math.random() * 0.2,
          details: 'Custom signal technical analysis'
        },
        rsi: {
          value: 30 + Math.random() * 40,
          signal: (options.action === 'HOLD' ? 'NEUTRAL' : options.action || 'NEUTRAL') as any,
          weight: 0.25,
          confidence: 0.7 + Math.random() * 0.2,
          details: 'Custom RSI analysis'
        },
        macd: {
          signal: (options.action === 'HOLD' ? 'NEUTRAL' : options.action || 'NEUTRAL') as any,
          weight: 0.2,
          confidence: 0.7 + Math.random() * 0.2,
          details: 'Custom MACD analysis'
        },
        volume: {
          signal: 'NEUTRAL' as any,
          weight: 0.25,
          confidence: 0.8,
          details: 'Volume analysis'
        },
        support_resistance: {
          nearSupport: false,
          nearResistance: false,
          details: 'Support/resistance analysis'
        }
      },
      sentimentContributions: {
        newsImpact: {
          signal: 'NEUTRAL' as any,
          weight: 0.3,
          confidence: 0.7,
          newsCount: 5,
          sentimentScore: (Math.random() - 0.5) * 2,
          details: 'Custom sentiment analysis'
        },
        marketSentiment: {
          signal: 'NEUTRAL' as any,
          weight: 0.4,
          confidence: 0.7,
          details: 'Market sentiment analysis'
        }
      },
      riskAssessment: {
        overallRisk: 'MEDIUM',
        riskScore: 50,
        warnings: ['Custom signal risk'],
        recommendations: ['Monitor closely'],
        factors: {
          volatilityRisk: 30,
          liquidityRisk: 20,
          concentrationRisk: 25,
          marketRisk: 40,
          sentimentRisk: 15,
          technicalRisk: 20
        }
      },
      marketContext: {
        condition: 'BULLISH',
        trend: 'UP',
        volatility: 'MEDIUM',
        volume: 'HIGH',
        sector: 'Technology',
        marketCap: 'LARGE',
        correlation: { market: 0.8, sector: 0.9, peers: 0.7 }
      },
      confidenceFactors: {
        technicalConfidence: 0.7,
        sentimentConfidence: 0.7,
        patternMatchConfidence: 0.7,
        marketConditionConfidence: 0.7,
        volumeConfidence: 0.8,
        historicalAccuracy: 0.7
      },
      timeHorizon: 'SHORT_TERM',
      keyFactors: ['Custom signal generation'],
      source: 'custom_generation' as any,
      patternMatches: [],
      priceTargets: {
        timeHorizon: 'SHORT_TERM',
        targets: { conservative: 105, moderate: 110, aggressive: 115 },
        probability: { upside: 0.6, downside: 0.4 },
        keyLevels: { support: [95, 90], resistance: [110, 115] }
      },
      warnings: [],
      alerts: [],
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date()
    };

    // Store the signal
    await mockTradingStorage.insert('trading_signals', signal);
    
    return signal;
  }

  /**
   * Generate mock price update
   */
  private generatePriceUpdate(ticker: string): any {
    const basePrice = 100 + Math.random() * 400;
    const change = (Math.random() - 0.5) * 10; // ±$5
    const changePercent = (change / basePrice) * 100;

    return {
      ticker,
      price: Math.round((basePrice + change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 10000000),
      timestamp: new Date(),
      bid: Math.round((basePrice + change - 0.01) * 100) / 100,
      ask: Math.round((basePrice + change + 0.01) * 100) / 100
    };
  }

  /**
   * Get current market status based on time
   */
  private getCurrentMarketStatus(): string {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Weekend
    if (day === 0 || day === 6) {
      return 'CLOSED';
    }

    // Weekday hours (Eastern Time approximation)
    if (hour >= 9 && hour < 16) {
      return 'OPEN';
    } else if (hour >= 4 && hour < 9) {
      return 'PRE_MARKET';
    } else if (hour >= 16 && hour < 20) {
      return 'AFTER_HOURS';
    } else {
      return 'CLOSED';
    }
  }

  /**
   * Get random ticker from configured list
   */
  private getRandomTicker(): string {
    return this.config.tickers[Math.floor(Math.random() * this.config.tickers.length)];
  }

  /**
   * Get updater statistics
   */
  getStats(): {
    isRunning: boolean;
    activeIntervals: number;
    config: UpdaterConfig;
    uptime: number;
    eventsEmitted: number;
  } {
    return {
      isRunning: this.isRunning,
      activeIntervals: this.intervals.size,
      config: this.config,
      uptime: process.uptime(),
      eventsEmitted: this.listenerCount('update')
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<UpdaterConfig>): void {
    console.log('⚙️ Updating real-time updater configuration');
    
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.start();
    }
    
    console.log('✅ Configuration updated');
  }

  /**
   * Pause updates temporarily
   */
  pause(): void {
    if (this.isRunning) {
      console.log('⏸️ Pausing real-time updater...');
      this.stop();
      this.emit('updater_paused', { timestamp: new Date() });
    }
  }

  /**
   * Resume updates
   */
  resume(): void {
    if (!this.isRunning) {
      console.log('▶️ Resuming real-time updater...');
      this.start();
      this.emit('updater_resumed', { timestamp: new Date() });
    }
  }
}

/**
 * Singleton instance for global use
 */
export const mockRealTimeUpdater = new MockRealTimeUpdater();

/**
 * Factory function for creating new instances
 */
export function createMockRealTimeUpdater(config?: Partial<UpdaterConfig>): MockRealTimeUpdater {
  return new MockRealTimeUpdater(config);
}

export default MockRealTimeUpdater;