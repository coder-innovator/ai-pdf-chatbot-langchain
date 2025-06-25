/**
 * Analysis Scheduler
 * Handles scheduled trading analysis jobs including technical analysis,
 * risk assessment, and portfolio optimization
 */

import { mockTradingStorage } from '../api/trading/mock-data.js';
import { TechnicalAnalysisAgent } from '../agents/technical-analysis.js';
import { SentimentAnalysisAgent } from '../agents/sentiment-analysis.js';
import { RiskAnalyzer } from '../agents/risk-analyzer.js';
import { RecommendationEngine } from '../agents/recommendation-engine.js';
import { ExplanationGenerator } from '../agents/explanation-generator.js';
import { mockRealTimeUpdater } from '../services/mock-real-time-updater.js';
import { TimeHorizon, TradingSignal } from '../types/trading-signals.js';

/**
 * Analysis job types
 */
export type AnalysisJobType = 
  | 'technical_analysis'
  | 'sentiment_analysis'
  | 'risk_assessment'
  | 'portfolio_optimization'
  | 'signal_validation'
  | 'performance_review'
  | 'market_correlation'
  | 'explanation_generation';

/**
 * Analysis scheduler configuration
 */
export interface AnalysisSchedulerConfig {
  enableTechnicalAnalysis: boolean;
  enableSentimentAnalysis: boolean;
  enableRiskAssessment: boolean;
  enablePortfolioOptimization: boolean;
  enableSignalValidation: boolean;
  enablePerformanceReview: boolean;
  
  // Intervals in milliseconds
  technicalAnalysisInterval: number;
  sentimentAnalysisInterval: number;
  riskAssessmentInterval: number;
  portfolioOptimizationInterval: number;
  signalValidationInterval: number;
  performanceReviewInterval: number;
  
  // Analysis parameters
  tickers: string[];
  lookbackDays: number;
  maxAnalysisPerBatch: number;
  minConfidenceThreshold: number;
  
  // Market hours
  respectMarketHours: boolean;
  marketOpenHour: number;  // 9 AM ET
  marketCloseHour: number; // 4 PM ET
}

/**
 * Analysis job result
 */
export interface AnalysisJobResult {
  jobId: string;
  jobType: AnalysisJobType;
  ticker?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  itemsProcessed: number;
  errors: string[];
  results: any;
  metadata?: Record<string, any>;
}

/**
 * Portfolio metrics
 */
export interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  averageConfidence: number;
  riskScore: number;
  diversificationScore: number;
  signalDistribution: Record<string, number>;
  topPerformers: { ticker: string; return: number }[];
  underperformers: { ticker: string; return: number }[];
}

/**
 * Analysis Scheduler Class
 */
export class AnalysisScheduler {
  private config: AnalysisSchedulerConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private jobHistory: AnalysisJobResult[] = [];
  
  // Analysis agents
  private technicalAgent: TechnicalAnalysisAgent;
  private sentimentAgent: SentimentAnalysisAgent;
  private riskAnalyzer: RiskAnalyzer;
  private recommendationEngine: RecommendationEngine;
  private explanationGenerator: ExplanationGenerator;

  constructor(config: Partial<AnalysisSchedulerConfig> = {}) {
    this.config = {
      enableTechnicalAnalysis: true,
      enableSentimentAnalysis: true,
      enableRiskAssessment: true,
      enablePortfolioOptimization: true,
      enableSignalValidation: true,
      enablePerformanceReview: true,
      
      // Analysis intervals
      technicalAnalysisInterval: 30 * 60 * 1000,    // 30 minutes
      sentimentAnalysisInterval: 15 * 60 * 1000,    // 15 minutes
      riskAssessmentInterval: 60 * 60 * 1000,       // 1 hour
      portfolioOptimizationInterval: 4 * 60 * 60 * 1000, // 4 hours
      signalValidationInterval: 45 * 60 * 1000,     // 45 minutes
      performanceReviewInterval: 24 * 60 * 60 * 1000, // Daily
      
      tickers: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX', 'NVDA', 'CRM', 'ORCL'],
      lookbackDays: 30,
      maxAnalysisPerBatch: 3,
      minConfidenceThreshold: 0.6,
      
      respectMarketHours: false, // Run 24/7 in development
      marketOpenHour: 9,
      marketCloseHour: 16,
      
      ...config
    };

    // Initialize analysis agents
    this.technicalAgent = new TechnicalAnalysisAgent(mockTradingStorage);
    this.sentimentAgent = new SentimentAnalysisAgent();
    this.riskAnalyzer = new RiskAnalyzer();
    this.recommendationEngine = new RecommendationEngine();
    this.explanationGenerator = new ExplanationGenerator();

    console.log('📊 Analysis Scheduler initialized');
  }

  /**
   * Start all analysis schedulers
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Analysis scheduler is already running');
      return;
    }

    console.log('🚀 Starting Analysis Scheduler...');
    this.isRunning = true;

    // Schedule technical analysis
    if (this.config.enableTechnicalAnalysis) {
      this.scheduleTechnicalAnalysis();
    }

    // Schedule sentiment analysis
    if (this.config.enableSentimentAnalysis) {
      this.scheduleSentimentAnalysis();
    }

    // Schedule risk assessment
    if (this.config.enableRiskAssessment) {
      this.scheduleRiskAssessment();
    }

    // Schedule portfolio optimization
    if (this.config.enablePortfolioOptimization) {
      this.schedulePortfolioOptimization();
    }

    // Schedule signal validation
    if (this.config.enableSignalValidation) {
      this.scheduleSignalValidation();
    }

    // Schedule performance review
    if (this.config.enablePerformanceReview) {
      this.schedulePerformanceReview();
    }

    console.log(`✅ Analysis Scheduler started with ${this.intervals.size} active jobs`);
  }

  /**
   * Stop all analysis schedulers
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Analysis scheduler is not running');
      return;
    }

    console.log('⏹️ Stopping Analysis Scheduler...');
    this.isRunning = false;

    // Clear all intervals
    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`🛑 Stopped ${jobName} analysis job`);
    }
    
    this.intervals.clear();
    console.log('✅ Analysis Scheduler stopped');
  }

  /**
   * Schedule technical analysis
   */
  private scheduleTechnicalAnalysis(): void {
    console.log(`📈 Scheduling technical analysis every ${this.config.technicalAnalysisInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      if (this.shouldRunJob()) {
        await this.runTechnicalAnalysis();
      }
    }, this.config.technicalAnalysisInterval);

    this.intervals.set('technical_analysis', interval);

    // Run initial analysis
    setTimeout(() => {
      this.runTechnicalAnalysis();
    }, 5000);
  }

  /**
   * Schedule sentiment analysis
   */
  private scheduleSentimentAnalysis(): void {
    console.log(`😊 Scheduling sentiment analysis every ${this.config.sentimentAnalysisInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      if (this.shouldRunJob()) {
        await this.runSentimentAnalysis();
      }
    }, this.config.sentimentAnalysisInterval);

    this.intervals.set('sentiment_analysis', interval);

    // Run initial analysis
    setTimeout(() => {
      this.runSentimentAnalysis();
    }, 10000);
  }

  /**
   * Schedule risk assessment
   */
  private scheduleRiskAssessment(): void {
    console.log(`⚠️ Scheduling risk assessment every ${this.config.riskAssessmentInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      if (this.shouldRunJob()) {
        await this.runRiskAssessment();
      }
    }, this.config.riskAssessmentInterval);

    this.intervals.set('risk_assessment', interval);

    // Run initial assessment
    setTimeout(() => {
      this.runRiskAssessment();
    }, 15000);
  }

  /**
   * Schedule portfolio optimization
   */
  private schedulePortfolioOptimization(): void {
    console.log(`💼 Scheduling portfolio optimization every ${this.config.portfolioOptimizationInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      if (this.shouldRunJob()) {
        await this.runPortfolioOptimization();
      }
    }, this.config.portfolioOptimizationInterval);

    this.intervals.set('portfolio_optimization', interval);
  }

  /**
   * Schedule signal validation
   */
  private scheduleSignalValidation(): void {
    console.log(`✅ Scheduling signal validation every ${this.config.signalValidationInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      if (this.shouldRunJob()) {
        await this.runSignalValidation();
      }
    }, this.config.signalValidationInterval);

    this.intervals.set('signal_validation', interval);
  }

  /**
   * Schedule performance review
   */
  private schedulePerformanceReview(): void {
    console.log(`📊 Scheduling performance review every ${this.config.performanceReviewInterval / 1000}s`);
    
    const interval = setInterval(async () => {
      await this.runPerformanceReview();
    }, this.config.performanceReviewInterval);

    this.intervals.set('performance_review', interval);
  }

  /**
   * Run technical analysis job
   */
  private async runTechnicalAnalysis(): Promise<void> {
    const jobId = `tech-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('📈 Running scheduled technical analysis...');
      
      const selectedTickers = this.selectRandomTickers(this.config.maxAnalysisPerBatch);
      const results: any[] = [];
      const errors: string[] = [];

      for (const ticker of selectedTickers) {
        try {
          const analysis = await this.technicalAgent.analyzeStock(ticker);
          results.push({ ticker, analysis });
          
          // Store analysis result
          await mockTradingStorage.insert('analysis_history', {
            ticker,
            analysisType: 'TECHNICAL',
            result: analysis,
            timestamp: new Date(),
            processingTime: 1000,
            version: '1.0.0'
          });

          console.log(`✅ Technical analysis completed for ${ticker}`);
          
        } catch (error) {
          const errorMsg = `Technical analysis failed for ${ticker}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'technical_analysis',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: errors.length === 0,
        itemsProcessed: results.length,
        errors,
        results,
        metadata: { selectedTickers }
      });

    } catch (error) {
      console.error('❌ Technical analysis job failed:', error);
    }
  }

  /**
   * Run sentiment analysis job
   */
  private async runSentimentAnalysis(): Promise<void> {
    const jobId = `sentiment-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('😊 Running scheduled sentiment analysis...');
      
      const selectedTickers = this.selectRandomTickers(this.config.maxAnalysisPerBatch);
      const results: any[] = [];
      const errors: string[] = [];

      for (const ticker of selectedTickers) {
        try {
          const analysis = await this.sentimentAgent.analyzeSentiment(ticker);
          results.push({ ticker, analysis });
          
          // Store analysis result
          await mockTradingStorage.insert('analysis_history', {
            ticker,
            analysisType: 'SENTIMENT',
            result: analysis,
            timestamp: new Date(),
            processingTime: 800,
            version: '1.0.0'
          });

          console.log(`✅ Sentiment analysis completed for ${ticker}`);
          
        } catch (error) {
          const errorMsg = `Sentiment analysis failed for ${ticker}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'sentiment_analysis',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: errors.length === 0,
        itemsProcessed: results.length,
        errors,
        results,
        metadata: { selectedTickers }
      });

    } catch (error) {
      console.error('❌ Sentiment analysis job failed:', error);
    }
  }

  /**
   * Run risk assessment job
   */
  private async runRiskAssessment(): Promise<void> {
    const jobId = `risk-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('⚠️ Running scheduled risk assessment...');
      
      // Get recent signals for risk assessment
      const recentSignals = await mockTradingStorage.select('trading_signals', {
        limit: 20,
        orderBy: 'created_at desc'
      });

      const results: any[] = [];
      const errors: string[] = [];

      for (const signal of recentSignals.slice(0, this.config.maxAnalysisPerBatch)) {
        try {
          const technicalAnalysis = await this.technicalAgent.analyzeStock(signal.ticker);
          const sentimentAnalysis = await this.sentimentAgent.analyzeSentiment(signal.ticker);
          
          const riskAssessment = await this.riskAnalyzer.analyzeSignalRisk(
            signal.ticker,
            signal,
            technicalAnalysis,
            sentimentAnalysis
          );

          results.push({ 
            ticker: signal.ticker, 
            signalId: signal.id,
            riskAssessment 
          });

          console.log(`✅ Risk assessment completed for ${signal.ticker} signal`);
          
        } catch (error) {
          const errorMsg = `Risk assessment failed for ${signal.ticker}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'risk_assessment',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: errors.length === 0,
        itemsProcessed: results.length,
        errors,
        results,
        metadata: { signalsAssessed: recentSignals.length }
      });

    } catch (error) {
      console.error('❌ Risk assessment job failed:', error);
    }
  }

  /**
   * Run portfolio optimization job
   */
  private async runPortfolioOptimization(): Promise<void> {
    const jobId = `portfolio-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('💼 Running scheduled portfolio optimization...');
      
      // Get all current signals
      const allSignals = await mockTradingStorage.select('trading_signals', {
        limit: 100,
        orderBy: 'created_at desc'
      });

      // Group signals by ticker
      const signalsByTicker = allSignals.reduce((acc, signal) => {
        if (!acc[signal.ticker]) {
          acc[signal.ticker] = [];
        }
        acc[signal.ticker].push(signal);
        return acc;
      }, {} as Record<string, TradingSignal[]>);

      // Calculate portfolio metrics
      const portfolioMetrics = this.calculatePortfolioMetrics(signalsByTicker);
      
      // Generate optimization recommendations
      const optimizationRecommendations = this.generateOptimizationRecommendations(portfolioMetrics);

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'portfolio_optimization',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: true,
        itemsProcessed: Object.keys(signalsByTicker).length,
        errors: [],
        results: {
          portfolioMetrics,
          optimizationRecommendations
        },
        metadata: { 
          totalSignals: allSignals.length,
          uniqueTickers: Object.keys(signalsByTicker).length
        }
      });

      console.log('✅ Portfolio optimization completed');

    } catch (error) {
      console.error('❌ Portfolio optimization job failed:', error);
    }
  }

  /**
   * Run signal validation job
   */
  private async runSignalValidation(): Promise<void> {
    const jobId = `validation-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('✅ Running scheduled signal validation...');
      
      // Get recent signals for validation
      const recentSignals = await mockTradingStorage.select('trading_signals', {
        limit: 10,
        orderBy: 'created_at desc'
      });

      const results: any[] = [];
      const errors: string[] = [];

      for (const signal of recentSignals) {
        try {
          // Validate signal consistency
          const validation = this.validateSignal(signal);
          
          // Generate explanation for validation
          const explanation = this.explanationGenerator.generateExplanation(signal);
          
          results.push({
            ticker: signal.ticker,
            signalId: signal.id,
            validation,
            explanationGenerated: true
          });

          console.log(`✅ Signal validation completed for ${signal.ticker}`);
          
        } catch (error) {
          const errorMsg = `Signal validation failed for ${signal.ticker}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'signal_validation',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: errors.length === 0,
        itemsProcessed: results.length,
        errors,
        results,
        metadata: { signalsValidated: recentSignals.length }
      });

    } catch (error) {
      console.error('❌ Signal validation job failed:', error);
    }
  }

  /**
   * Run performance review job
   */
  private async runPerformanceReview(): Promise<void> {
    const jobId = `performance-${Date.now()}`;
    const startTime = new Date();

    try {
      console.log('📊 Running scheduled performance review...');
      
      // Get historical signals for performance analysis
      const historicalSignals = await mockTradingStorage.select('trading_signals', {
        limit: 100,
        orderBy: 'created_at desc'
      });

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(historicalSignals);
      
      // Generate performance report
      const performanceReport = this.generatePerformanceReport(performanceMetrics);

      const endTime = new Date();
      
      this.logAnalysisJob({
        jobId,
        jobType: 'performance_review',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        success: true,
        itemsProcessed: historicalSignals.length,
        errors: [],
        results: {
          performanceMetrics,
          performanceReport
        },
        metadata: { 
          reviewPeriod: `${this.config.lookbackDays} days`,
          signalsReviewed: historicalSignals.length
        }
      });

      console.log('✅ Performance review completed');

    } catch (error) {
      console.error('❌ Performance review job failed:', error);
    }
  }

  /**
   * Check if job should run based on market hours
   */
  private shouldRunJob(): boolean {
    if (!this.config.respectMarketHours) {
      return true;
    }

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Don't run on weekends
    if (day === 0 || day === 6) {
      return false;
    }

    // Only run during market hours
    return hour >= this.config.marketOpenHour && hour < this.config.marketCloseHour;
  }

  /**
   * Select random tickers for analysis
   */
  private selectRandomTickers(count: number): string[] {
    const shuffled = [...this.config.tickers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, this.config.tickers.length));
  }

  /**
   * Validate signal consistency
   */
  private validateSignal(signal: TradingSignal): any {
    const validation = {
      isValid: true,
      issues: [] as string[],
      confidence: signal.confidence,
      consistency: 0
    };

    // Check confidence thresholds
    if (signal.confidence < this.config.minConfidenceThreshold) {
      validation.issues.push(`Low confidence: ${signal.confidence}`);
    }

    // Check signal consistency
    const technicalSignal = signal.technicalContributions?.movingAverages?.signal;
    if (technicalSignal && technicalSignal !== signal.action && signal.action !== 'HOLD') {
      validation.issues.push('Technical signal mismatch');
    }

    // Calculate overall consistency
    validation.consistency = Math.max(0, 1 - (validation.issues.length * 0.2));
    validation.isValid = validation.issues.length === 0;

    return validation;
  }

  /**
   * Calculate portfolio metrics
   */
  private calculatePortfolioMetrics(signalsByTicker: Record<string, TradingSignal[]>): PortfolioMetrics {
    const tickers = Object.keys(signalsByTicker);
    let totalValue = 0;
    let totalReturn = 0;
    let totalConfidence = 0;
    let signalCount = 0;

    const signalDistribution: Record<string, number> = {};
    const performances: { ticker: string; return: number }[] = [];

    for (const ticker of tickers) {
      const signals = signalsByTicker[ticker];
      const latestSignal = signals[0];

      if (latestSignal) {
        totalValue += latestSignal.currentPrice || 100;
        totalConfidence += latestSignal.confidence;
        signalCount++;

        // Mock return calculation
        const mockReturn = (Math.random() - 0.5) * 0.2; // ±10%
        totalReturn += mockReturn;
        performances.push({ ticker, return: mockReturn });

        // Count signal distribution
        signalDistribution[latestSignal.action] = (signalDistribution[latestSignal.action] || 0) + 1;
      }
    }

    const averageReturn = totalReturn / tickers.length;
    const averageConfidence = totalConfidence / signalCount;

    performances.sort((a, b) => b.return - a.return);

    return {
      totalValue,
      totalReturn,
      totalReturnPercent: averageReturn * 100,
      averageConfidence,
      riskScore: Math.random() * 100, // Mock risk score
      diversificationScore: Math.min(100, tickers.length * 10), // Mock diversification
      signalDistribution,
      topPerformers: performances.slice(0, 3),
      underperformers: performances.slice(-3)
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(metrics: PortfolioMetrics): any {
    const recommendations = [];

    if (metrics.averageConfidence < 0.7) {
      recommendations.push('Consider reviewing low-confidence signals');
    }

    if (metrics.diversificationScore < 50) {
      recommendations.push('Increase portfolio diversification');
    }

    if (metrics.riskScore > 70) {
      recommendations.push('Consider reducing portfolio risk');
    }

    return {
      recommendations,
      optimizationScore: Math.random() * 100,
      suggestedActions: recommendations.length
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(signals: TradingSignal[]): any {
    const byAction = signals.reduce((acc, signal) => {
      if (!acc[signal.action]) {
        acc[signal.action] = [];
      }
      acc[signal.action].push(signal);
      return acc;
    }, {} as Record<string, TradingSignal[]>);

    const metrics = {
      totalSignals: signals.length,
      averageConfidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length,
      actionBreakdown: Object.keys(byAction).reduce((acc, action) => {
        acc[action] = byAction[action].length;
        return acc;
      }, {} as Record<string, number>),
      confidenceDistribution: {
        high: signals.filter(s => s.confidence >= 0.8).length,
        medium: signals.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length,
        low: signals.filter(s => s.confidence < 0.6).length
      }
    };

    return metrics;
  }

  /**
   * Generate performance report
   */
  private generatePerformanceReport(metrics: any): any {
    return {
      summary: `Analyzed ${metrics.totalSignals} signals with average confidence of ${(metrics.averageConfidence * 100).toFixed(1)}%`,
      recommendations: [
        'Monitor low-confidence signals',
        'Review signal distribution',
        'Optimize signal generation parameters'
      ],
      reportGenerated: new Date()
    };
  }

  /**
   * Log analysis job result
   */
  private logAnalysisJob(result: AnalysisJobResult): void {
    const status = result.success ? '✅' : '❌';
    
    console.log(
      `${status} Analysis job ${result.jobType} completed in ${result.duration}ms ` +
      `(processed: ${result.itemsProcessed}, errors: ${result.errors.length})`
    );

    // Store in job history
    this.jobHistory.push(result);

    // Keep only last 50 job results
    if (this.jobHistory.length > 50) {
      this.jobHistory.shift();
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    isRunning: boolean;
    activeJobs: number;
    config: AnalysisSchedulerConfig;
    jobHistory: AnalysisJobResult[];
    recentJobs: AnalysisJobResult[];
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.intervals.size,
      config: this.config,
      jobHistory: this.jobHistory,
      recentJobs: this.jobHistory.slice(-10)
    };
  }

  /**
   * Trigger specific analysis job manually
   */
  async triggerAnalysis(jobType: AnalysisJobType, ticker?: string): Promise<AnalysisJobResult> {
    console.log(`🎯 Manually triggering ${jobType} analysis${ticker ? ` for ${ticker}` : ''}`);
    
    switch (jobType) {
      case 'technical_analysis':
        await this.runTechnicalAnalysis();
        break;
      case 'sentiment_analysis':
        await this.runSentimentAnalysis();
        break;
      case 'risk_assessment':
        await this.runRiskAssessment();
        break;
      case 'portfolio_optimization':
        await this.runPortfolioOptimization();
        break;
      case 'signal_validation':
        await this.runSignalValidation();
        break;
      case 'performance_review':
        await this.runPerformanceReview();
        break;
      default:
        throw new Error(`Unknown analysis job type: ${jobType}`);
    }

    return this.jobHistory[this.jobHistory.length - 1];
  }
}

/**
 * Singleton instance
 */
export const analysisScheduler = new AnalysisScheduler();

/**
 * Factory function
 */
export function createAnalysisScheduler(config?: Partial<AnalysisSchedulerConfig>): AnalysisScheduler {
  return new AnalysisScheduler(config);
}

export default AnalysisScheduler;