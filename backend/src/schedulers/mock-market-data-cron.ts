/**
 * Mock Market Data Scheduler
 * Simulates cron jobs that would typically run as Supabase Edge Functions
 * Handles periodic market data updates and signal generation
 */

import { mockTradingStorage } from '../api/trading/mock-data.js';
import { SignalGeneratorAgent } from '../agents/signal-generator.js';
import { TechnicalAnalysisAgent } from '../agents/technical-analysis.js';
import { SentimentAnalysisAgent } from '../agents/sentiment-analysis.js';
import { AlertDetectorAgent } from '../agents/alert-detector.js';
import { mockRealTimeUpdater } from '../services/mock-real-time-updater.js';
import { TradingSignal, SignalAction } from '../types/trading-signals.js';
import { TradingAlert } from '../types/alerts.js';

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  enableMarketDataUpdates: boolean;
  enableSignalGeneration: boolean;
  enableAlertDetection: boolean;
  enableCleanupJobs: boolean;
  
  // Intervals in milliseconds
  marketDataInterval: number;
  signalGenerationInterval: number;
  alertDetectionInterval: number;
  cleanupInterval: number;
  
  // Tickers to monitor
  tickers: string[];
  
  // Batch sizes
  maxSignalsPerBatch: number;
  maxAlertsPerBatch: number;
}

/**
 * Job execution result
 */
export interface JobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  itemsProcessed: number;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * Mock Market Data Scheduler Class
 */
export class MockMarketDataScheduler {
  private config: SchedulerConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private jobHistory: JobResult[] = [];
  
  // Analysis agents
  private technicalAgent: TechnicalAnalysisAgent;
  private sentimentAgent: SentimentAnalysisAgent;
  private signalGenerator: SignalGeneratorAgent;
  private alertDetector: AlertDetectorAgent;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      enableMarketDataUpdates: true,
      enableSignalGeneration: true,
      enableAlertDetection: true,
      enableCleanupJobs: true,
      
      // Development intervals (shorter for testing)
      marketDataInterval: 5 * 60 * 1000,    // 5 minutes
      signalGenerationInterval: 60 * 60 * 1000, // 1 hour
      alertDetectionInterval: 15 * 60 * 1000,   // 15 minutes
      cleanupInterval: 24 * 60 * 60 * 1000,     // 24 hours
      
      tickers: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'CRM', 'ORCL'],
      
      maxSignalsPerBatch: 5,
      maxAlertsPerBatch: 10,
      
      ...config
    };

    // Initialize analysis agents
    this.technicalAgent = new TechnicalAnalysisAgent(mockTradingStorage);
    this.sentimentAgent = new SentimentAnalysisAgent();
    this.signalGenerator = new SignalGeneratorAgent(
      this.technicalAgent,
      this.sentimentAgent,
      mockTradingStorage
    );
    this.alertDetector = new AlertDetectorAgent(mockTradingStorage);

    console.log('⏰ Mock Market Data Scheduler initialized');
  }

  /**
   * Start all scheduled jobs
   */
  startScheduler(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting Mock Market Data Scheduler...');
    this.isRunning = true;

    // Start market data updates
    if (this.config.enableMarketDataUpdates) {
      this.scheduleMarketDataUpdates();
    }

    // Start signal generation
    if (this.config.enableSignalGeneration) {
      this.scheduleSignalGeneration();
    }

    // Start alert detection
    if (this.config.enableAlertDetection) {
      this.scheduleAlertDetection();
    }

    // Start cleanup jobs
    if (this.config.enableCleanupJobs) {
      this.scheduleCleanupJobs();
    }

    // Schedule periodic statistics reporting
    this.scheduleStatsReporting();

    console.log('✅ All scheduled jobs started');
    this.logJobStart('scheduler_startup', { activeJobs: this.intervals.size });
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduler(): void {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('⏹️ Stopping Mock Market Data Scheduler...');
    this.isRunning = false;

    // Clear all intervals
    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`🛑 Stopped ${jobName} job`);
    }
    
    this.intervals.clear();
    
    console.log('✅ All scheduled jobs stopped');
    this.logJobStart('scheduler_shutdown', { stoppedJobs: this.intervals.size });
  }

  /**
   * Schedule market data updates (every 5 minutes in development)
   */
  private scheduleMarketDataUpdates(): void {
    console.log(`📊 Scheduling market data updates every ${this.config.marketDataInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      await this.executeJob('market_data_update', async () => {
        return await this.updateMarketData();
      });
    }, this.config.marketDataInterval);

    this.intervals.set('market_data_updates', interval);

    // Run initial update
    setTimeout(() => {
      this.executeJob('market_data_initial', async () => {
        return await this.updateMarketData();
      });
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Schedule signal generation (every hour)
   */
  private scheduleSignalGeneration(): void {
    console.log(`🔄 Scheduling signal generation every ${this.config.signalGenerationInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      await this.executeJob('signal_generation', async () => {
        return await this.generateSignals();
      });
    }, this.config.signalGenerationInterval);

    this.intervals.set('signal_generation', interval);

    // Run initial signal generation
    setTimeout(() => {
      this.executeJob('signal_generation_initial', async () => {
        return await this.generateSignals();
      });
    }, 10000); // Wait 10 seconds after startup
  }

  /**
   * Schedule alert detection (every 15 minutes)
   */
  private scheduleAlertDetection(): void {
    console.log(`🚨 Scheduling alert detection every ${this.config.alertDetectionInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      await this.executeJob('alert_detection', async () => {
        return await this.detectAlerts();
      });
    }, this.config.alertDetectionInterval);

    this.intervals.set('alert_detection', interval);

    // Run initial alert detection
    setTimeout(() => {
      this.executeJob('alert_detection_initial', async () => {
        return await this.detectAlerts();
      });
    }, 15000); // Wait 15 seconds after startup
  }

  /**
   * Schedule cleanup jobs (daily)
   */
  private scheduleCleanupJobs(): void {
    console.log(`🧹 Scheduling cleanup jobs every ${this.config.cleanupInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      await this.executeJob('cleanup', async () => {
        return await this.runCleanupJobs();
      });
    }, this.config.cleanupInterval);

    this.intervals.set('cleanup_jobs', interval);
  }

  /**
   * Schedule statistics reporting (every 30 minutes)
   */
  private scheduleStatsReporting(): void {
    console.log('📈 Scheduling statistics reporting every 30 minutes');
    
    const interval = setInterval(async () => {
      await this.executeJob('stats_reporting', async () => {
        return await this.generateSystemStats();
      });
    }, 30 * 60 * 1000); // 30 minutes

    this.intervals.set('stats_reporting', interval);
  }

  /**
   * Update market data for all tickers
   */
  async updateMarketData(): Promise<JobResult> {
    console.log('📊 Running market data update job...');
    
    let itemsProcessed = 0;
    const errors: string[] = [];

    try {
      for (const ticker of this.config.tickers) {
        try {
          // Generate mock price update
          const priceUpdate = this.generateMockPriceUpdate(ticker);
          
          // Store price update (in real implementation, this would update a prices table)
          await mockTradingStorage.insert('price_updates', {
            ticker,
            ...priceUpdate,
            timestamp: new Date()
          });

          // Trigger real-time price update
          mockRealTimeUpdater.emit('price_changed', {
            type: 'price_changed',
            table: 'price_updates',
            record: priceUpdate,
            timestamp: new Date(),
            source: 'mock_updater'
          });

          itemsProcessed++;
          
        } catch (error) {
          const errorMsg = `Failed to update ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Market data update completed: ${itemsProcessed} tickers processed`);
      
      return {
        jobName: 'market_data_update',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: errors.length === 0,
        itemsProcessed,
        errors,
        metadata: {
          tickersProcessed: this.config.tickers.slice(0, itemsProcessed),
          totalTickers: this.config.tickers.length
        }
      };

    } catch (error) {
      console.error('❌ Market data update job failed:', error);
      throw error;
    }
  }

  /**
   * Generate new trading signals
   */
  async generateSignals(): Promise<JobResult> {
    console.log('🔄 Running signal generation job...');
    
    let itemsProcessed = 0;
    const errors: string[] = [];
    const generatedSignals: TradingSignal[] = [];

    try {
      // Select random tickers for signal generation (simulate realistic load)
      const selectedTickers = this.selectRandomTickers(this.config.maxSignalsPerBatch);
      
      for (const ticker of selectedTickers) {
        try {
          console.log(`🎯 Generating signal for ${ticker}...`);
          
          const signal = await this.signalGenerator.generateSignal(ticker);
          generatedSignals.push(signal);
          
          // The signal is automatically stored by the generator and broadcast via real-time updater
          itemsProcessed++;
          
          console.log(`✅ Generated ${signal.action} signal for ${ticker} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`);
          
        } catch (error) {
          const errorMsg = `Failed to generate signal for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Signal generation completed: ${itemsProcessed} signals generated`);
      
      return {
        jobName: 'signal_generation',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: errors.length === 0,
        itemsProcessed,
        errors,
        metadata: {
          generatedSignals: generatedSignals.map(s => ({
            ticker: s.ticker,
            action: s.action,
            confidence: s.confidence
          })),
          selectedTickers
        }
      };

    } catch (error) {
      console.error('❌ Signal generation job failed:', error);
      throw error;
    }
  }

  /**
   * Detect alerts across all tickers
   */
  async detectAlerts(): Promise<JobResult> {
    console.log('🚨 Running alert detection job...');
    
    let itemsProcessed = 0;
    const errors: string[] = [];
    const detectedAlerts: TradingAlert[] = [];

    try {
      // Select random tickers for alert detection
      const selectedTickers = this.selectRandomTickers(Math.min(this.config.maxAlertsPerBatch, this.config.tickers.length));
      
      for (const ticker of selectedTickers) {
        try {
          console.log(`🔍 Detecting alerts for ${ticker}...`);
          
          // Run different types of alert detection
          const signalAlerts = await this.alertDetector.detectSignalAlerts(ticker);
          const priceAlerts = await this.alertDetector.detectPriceAlerts(ticker);
          const volumeAlerts = await this.alertDetector.detectVolumeAlerts(ticker);
          
          const allAlerts = [...signalAlerts, ...priceAlerts, ...volumeAlerts];
          
          // Store and broadcast alerts
          for (const alert of allAlerts) {
            await mockTradingStorage.insert('trading_alerts', alert);
            detectedAlerts.push(alert);
          }
          
          itemsProcessed++;
          
          if (allAlerts.length > 0) {
            console.log(`🚨 Detected ${allAlerts.length} alerts for ${ticker}`);
          }
          
        } catch (error) {
          const errorMsg = `Failed to detect alerts for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`✅ Alert detection completed: ${detectedAlerts.length} alerts detected for ${itemsProcessed} tickers`);
      
      return {
        jobName: 'alert_detection',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: errors.length === 0,
        itemsProcessed,
        errors,
        metadata: {
          detectedAlerts: detectedAlerts.map(a => ({
            ticker: a.ticker,
            type: a.type,
            severity: a.severity
          })),
          selectedTickers,
          totalAlertsDetected: detectedAlerts.length
        }
      };

    } catch (error) {
      console.error('❌ Alert detection job failed:', error);
      throw error;
    }
  }

  /**
   * Run cleanup jobs
   */
  async runCleanupJobs(): Promise<JobResult> {
    console.log('🧹 Running cleanup jobs...');
    
    let itemsProcessed = 0;
    const errors: string[] = [];

    try {
      // Clean up old job history (keep last 100 jobs)
      if (this.jobHistory.length > 100) {
        const removed = this.jobHistory.splice(0, this.jobHistory.length - 100);
        itemsProcessed += removed.length;
        console.log(`🗑️ Cleaned up ${removed.length} old job records`);
      }

      // In a real implementation, this would clean up old data:
      // - Old price data beyond retention period
      // - Resolved alerts older than X days
      // - Expired signals
      // - Log files
      
      // Simulate cleanup work
      const cleanupTasks = [
        'price_data_cleanup',
        'resolved_alerts_cleanup',
        'expired_signals_cleanup',
        'log_rotation'
      ];

      for (const task of cleanupTasks) {
        try {
          // Simulate cleanup work
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log(`✅ Completed ${task}`);
          itemsProcessed++;
        } catch (error) {
          errors.push(`Failed ${task}: ${error}`);
        }
      }

      console.log(`✅ Cleanup jobs completed: ${itemsProcessed} tasks processed`);
      
      return {
        jobName: 'cleanup',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: errors.length === 0,
        itemsProcessed,
        errors,
        metadata: {
          cleanupTasks,
          jobHistorySize: this.jobHistory.length
        }
      };

    } catch (error) {
      console.error('❌ Cleanup job failed:', error);
      throw error;
    }
  }

  /**
   * Generate system statistics
   */
  async generateSystemStats(): Promise<JobResult> {
    console.log('📈 Generating system statistics...');
    
    try {
      const stats = mockTradingStorage.getStats();
      const updaterStats = mockRealTimeUpdater.getStats();
      
      const systemStats = {
        timestamp: new Date(),
        storage: stats,
        updater: updaterStats,
        scheduler: {
          isRunning: this.isRunning,
          activeJobs: this.intervals.size,
          jobHistorySize: this.jobHistory.length,
          config: this.config
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        }
      };

      console.log('📊 System Statistics:', {
        signals: stats.totalSignals,
        alerts: stats.totalAlerts,
        activeJobs: this.intervals.size,
        uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
      });
      
      return {
        jobName: 'stats_reporting',
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: true,
        itemsProcessed: 1,
        errors: [],
        metadata: systemStats
      };

    } catch (error) {
      console.error('❌ Stats generation failed:', error);
      throw error;
    }
  }

  /**
   * Execute a job with error handling and logging
   */
  private async executeJob(jobName: string, jobFunction: () => Promise<JobResult>): Promise<void> {
    const startTime = new Date();
    
    try {
      console.log(`⏰ Starting job: ${jobName}`);
      
      const result = await jobFunction();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Update result with timing
      result.startTime = startTime;
      result.endTime = endTime;
      result.duration = duration;
      
      // Log job completion
      this.logJobCompletion(result);
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const failedResult: JobResult = {
        jobName,
        startTime,
        endTime,
        duration,
        success: false,
        itemsProcessed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      
      this.logJobCompletion(failedResult);
      console.error(`❌ Job ${jobName} failed:`, error);
    }
  }

  /**
   * Log job start
   */
  private logJobStart(jobName: string, metadata?: Record<string, any>): void {
    const startTime = new Date();
    console.log(`⏰ [${startTime.toISOString()}] Starting job: ${jobName}`, metadata || '');
  }

  /**
   * Log job completion and store in history
   */
  private logJobCompletion(result: JobResult): void {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration;
    
    console.log(
      `${status} [${result.endTime.toISOString()}] Job ${result.jobName} completed in ${duration}ms ` +
      `(processed: ${result.itemsProcessed}, errors: ${result.errors.length})`
    );
    
    // Store in job history
    this.jobHistory.push(result);
    
    // Keep only last 100 job results
    if (this.jobHistory.length > 100) {
      this.jobHistory.shift();
    }
  }

  /**
   * Generate mock price update
   */
  private generateMockPriceUpdate(ticker: string): any {
    const basePrice = 100 + Math.random() * 400;
    const change = (Math.random() - 0.5) * 10; // ±$5
    const changePercent = (change / basePrice) * 100;

    return {
      ticker,
      price: Math.round((basePrice + change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 10000000),
      bid: Math.round((basePrice + change - 0.01) * 100) / 100,
      ask: Math.round((basePrice + change + 0.01) * 100) / 100,
      high: Math.round((basePrice + change + Math.random() * 5) * 100) / 100,
      low: Math.round((basePrice + change - Math.random() * 5) * 100) / 100
    };
  }

  /**
   * Select random tickers for processing
   */
  private selectRandomTickers(count: number): string[] {
    const shuffled = [...this.config.tickers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.config.tickers.length));
  }

  /**
   * Get scheduler statistics
   */
  getSchedulerStats(): {
    isRunning: boolean;
    activeJobs: number;
    config: SchedulerConfig;
    jobHistory: JobResult[];
    recentJobs: JobResult[];
    systemUptime: number;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.intervals.size,
      config: this.config,
      jobHistory: this.jobHistory,
      recentJobs: this.jobHistory.slice(-10), // Last 10 jobs
      systemUptime: process.uptime()
    };
  }

  /**
   * Get job history
   */
  getJobHistory(limit: number = 50): JobResult[] {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    console.log('⚙️ Updating scheduler configuration');
    
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stopScheduler();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.startScheduler();
    }
    
    console.log('✅ Scheduler configuration updated');
  }

  /**
   * Trigger a specific job manually
   */
  async triggerJob(jobName: string): Promise<JobResult> {
    console.log(`🎯 Manually triggering job: ${jobName}`);
    
    switch (jobName) {
      case 'market_data_update':
        return await this.updateMarketData();
      case 'signal_generation':
        return await this.generateSignals();
      case 'alert_detection':
        return await this.detectAlerts();
      case 'cleanup':
        return await this.runCleanupJobs();
      case 'stats_reporting':
        return await this.generateSystemStats();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

/**
 * Singleton instance
 */
export const mockMarketDataScheduler = new MockMarketDataScheduler();

/**
 * Factory function
 */
export function createMockMarketDataScheduler(config?: Partial<SchedulerConfig>): MockMarketDataScheduler {
  return new MockMarketDataScheduler(config);
}

export default MockMarketDataScheduler;