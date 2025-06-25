/**
 * Mock Data Provider for Trading API
 * Provides mock storage implementation for trading endpoints
 */

import { TradingSignal, SignalAction, RiskLevel, TimeHorizon } from '../../types/trading-signals.js';
import { TradingAlert, AlertType, AlertSeverity } from '../../types/alerts.js';

/**
 * Mock storage query options
 */
export interface QueryOptions {
  ticker?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  where?: Record<string, any>;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Mock storage implementation
 */
export class MockTradingStorage {
  private signals: Map<string, TradingSignal[]> = new Map();
  private alerts: TradingAlert[] = [];
  private analysisHistory: Map<string, any[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Select trading signals with query options
   */
  async select(table: string, options: QueryOptions = {}): Promise<any[]> {
    console.log(`📊 Mock storage query: ${table}`, options);

    switch (table) {
      case 'trading_signals':
        return this.selectSignals(options);
      case 'trading_alerts':
        return this.selectAlerts(options);
      case 'analysis_history':
        return this.selectAnalysisHistory(options);
      default:
        console.warn(`Unknown table: ${table}`);
        return [];
    }
  }

  /**
   * Insert new record
   */
  async insert(table: string, data: any): Promise<any> {
    console.log(`💾 Mock storage insert: ${table}`, data);

    switch (table) {
      case 'trading_signals':
        return this.insertSignal(data);
      case 'trading_alerts':
        return this.insertAlert(data);
      case 'analysis_history':
        return this.insertAnalysis(data);
      default:
        console.warn(`Unknown table: ${table}`);
        return null;
    }
  }

  /**
   * Update existing record
   */
  async update(table: string, id: string, data: any): Promise<any> {
    console.log(`✏️ Mock storage update: ${table}`, id, data);
    
    // For mock implementation, just return the updated data
    return { ...data, id, updated_at: new Date() };
  }

  /**
   * Delete record
   */
  async delete(table: string, id: string): Promise<boolean> {
    console.log(`🗑️ Mock storage delete: ${table}`, id);
    
    switch (table) {
      case 'trading_signals':
        return this.deleteSignal(id);
      case 'trading_alerts':
        return this.deleteAlert(id);
      default:
        return false;
    }
  }

  /**
   * Vector search simulation
   */
  async vectorSearch(embedding: number[], limit: number = 5): Promise<any[]> {
    console.log(`🔍 Mock vector search with limit: ${limit}`);
    
    // Return mock search results
    const mockResults = [];
    for (let i = 0; i < Math.min(limit, 3); i++) {
      mockResults.push({
        id: `result-${i + 1}`,
        content: `Mock vector search result ${i + 1}`,
        similarity: 0.9 - (i * 0.1),
        metadata: {
          source: 'mock',
          type: 'trading_signal',
          timestamp: new Date()
        }
      });
    }
    
    return mockResults;
  }

  /**
   * Get latest signals for ticker
   */
  async getLatestSignals(ticker: string, limit: number = 5): Promise<TradingSignal[]> {
    const tickerSignals = this.signals.get(ticker.toUpperCase()) || [];
    return tickerSignals
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<TradingAlert[]> {
    return this.alerts.filter(alert => alert.status === 'ACTIVE');
  }

  /**
   * Get alerts by ticker
   */
  async getAlertsByTicker(ticker: string): Promise<TradingAlert[]> {
    return this.alerts.filter(alert => alert.ticker === ticker.toUpperCase());
  }

  /**
   * Get analysis history for ticker
   */
  async getAnalysisHistory(ticker: string, limit: number = 10): Promise<any[]> {
    const history = this.analysisHistory.get(ticker.toUpperCase()) || [];
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Select signals with options
   */
  private selectSignals(options: QueryOptions): TradingSignal[] {
    let results: TradingSignal[] = [];

    if (options.ticker) {
      results = this.signals.get(options.ticker.toUpperCase()) || [];
    } else {
      // Get all signals
      for (const tickerSignals of this.signals.values()) {
        results.push(...tickerSignals);
      }
    }

    // Apply date filtering
    if (options.startDate || options.endDate) {
      results = results.filter(signal => {
        const signalDate = signal.timestamp;
        if (options.startDate && signalDate < options.startDate) return false;
        if (options.endDate && signalDate > options.endDate) return false;
        return true;
      });
    }

    // Apply ordering
    if (options.orderBy) {
      if (options.orderBy.includes('desc')) {
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      } else {
        results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
    }

    // Apply limit and offset
    const start = options.offset || 0;
    const end = start + (options.limit || results.length);
    
    return results.slice(start, end);
  }

  /**
   * Select alerts with options
   */
  private selectAlerts(options: QueryOptions): TradingAlert[] {
    let results = [...this.alerts];

    if (options.ticker) {
      results = results.filter(alert => alert.ticker === options.ticker!.toUpperCase());
    }

    // Apply date filtering
    if (options.startDate || options.endDate) {
      results = results.filter(alert => {
        const alertDate = alert.timestamp;
        if (options.startDate && alertDate < options.startDate) return false;
        if (options.endDate && alertDate > options.endDate) return false;
        return true;
      });
    }

    // Apply ordering and limit
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const start = options.offset || 0;
    const end = start + (options.limit || results.length);
    
    return results.slice(start, end);
  }

  /**
   * Select analysis history
   */
  private selectAnalysisHistory(options: QueryOptions): any[] {
    let results: any[] = [];

    if (options.ticker) {
      results = this.analysisHistory.get(options.ticker.toUpperCase()) || [];
    } else {
      for (const history of this.analysisHistory.values()) {
        results.push(...history);
      }
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const start = options.offset || 0;
    const end = start + (options.limit || results.length);
    
    return results.slice(start, end);
  }

  /**
   * Insert trading signal
   */
  private insertSignal(signal: TradingSignal): TradingSignal {
    const ticker = signal.ticker.toUpperCase();
    const tickerSignals = this.signals.get(ticker) || [];
    
    // Add timestamp if not present
    if (!signal.timestamp) {
      signal.timestamp = new Date();
    }
    
    tickerSignals.push(signal);
    this.signals.set(ticker, tickerSignals);
    
    // Keep only last 50 signals per ticker
    if (tickerSignals.length > 50) {
      tickerSignals.splice(0, tickerSignals.length - 50);
    }
    
    return signal;
  }

  /**
   * Insert trading alert
   */
  private insertAlert(alert: TradingAlert): TradingAlert {
    if (!alert.timestamp) {
      alert.timestamp = new Date();
    }
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }
    
    return alert;
  }

  /**
   * Insert analysis record
   */
  private insertAnalysis(analysis: any): any {
    const ticker = analysis.ticker?.toUpperCase() || 'GENERAL';
    const history = this.analysisHistory.get(ticker) || [];
    
    if (!analysis.timestamp) {
      analysis.timestamp = new Date();
    }
    
    history.push(analysis);
    this.analysisHistory.set(ticker, history);
    
    // Keep only last 30 analysis per ticker
    if (history.length > 30) {
      history.splice(0, history.length - 30);
    }
    
    return analysis;
  }

  /**
   * Delete signal
   */
  private deleteSignal(id: string): boolean {
    for (const [ticker, signals] of this.signals.entries()) {
      const index = signals.findIndex(s => s.id === id);
      if (index !== -1) {
        signals.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Delete alert
   */
  private deleteAlert(id: string): boolean {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Initialize mock data
   */
  private initializeMockData(): void {
    console.log('🔄 Initializing mock trading data...');
    
    const tickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX'];
    const actions: SignalAction[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    
    // Generate mock signals
    for (const ticker of tickers) {
      const signals: TradingSignal[] = [];
      
      for (let i = 0; i < 10; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const confidence = 0.5 + Math.random() * 0.4; // 50-90%
        const currentPrice = 100 + Math.random() * 400; // $100-$500
        
        const signal: TradingSignal = {
          id: `signal-${ticker}-${Date.now()}-${i}`,
          ticker,
          timestamp: new Date(Date.now() - i * 3600000), // i hours ago
          action,
          strength: confidence > 0.8 ? 'VERY_STRONG' : 
                   confidence > 0.7 ? 'STRONG' : 
                   confidence > 0.6 ? 'MODERATE' : 'WEAK',
          confidence,
          currentPrice,
          targetPrice: currentPrice * (1 + (Math.random() - 0.5) * 0.3), // ±15%
          stopLoss: currentPrice * (0.9 - Math.random() * 0.1), // 10-20% below
          reasoning: `Mock analysis for ${ticker} suggests ${action.toLowerCase()} based on technical indicators`,
          
          technicalContributions: {
            movingAverages: {
              signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
              weight: 0.3,
              confidence: 0.6 + Math.random() * 0.3,
              details: `Moving averages ${action.includes('BUY') ? 'bullish' : 'bearish'} alignment`
            },
            rsi: {
              value: 30 + Math.random() * 40, // 30-70
              signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
              weight: 0.25,
              confidence: 0.5 + Math.random() * 0.4,
              details: 'RSI momentum analysis'
            },
            macd: {
              signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
              weight: 0.2,
              confidence: 0.6 + Math.random() * 0.3,
              details: 'MACD histogram analysis'
            },
            volume: {
              signal: 'NEUTRAL' as any,
              weight: 0.25,
              confidence: 0.7 + Math.random() * 0.2,
              details: 'Volume supports price movement'
            },
            support_resistance: {
              nearSupport: Math.random() > 0.5,
              nearResistance: Math.random() > 0.5,
              details: 'Support/resistance level analysis'
            }
          },
          
          sentimentContributions: {
            newsImpact: {
              signal: 'NEUTRAL' as any,
              weight: 0.4,
              confidence: 0.6 + Math.random() * 0.3,
              newsCount: Math.floor(Math.random() * 10) + 1,
              sentimentScore: (Math.random() - 0.5) * 2, // -1 to 1
              details: 'News sentiment analysis'
            },
            marketSentiment: {
              signal: 'NEUTRAL' as any,
              weight: 0.6,
              confidence: 0.5 + Math.random() * 0.4,
              details: 'Overall market sentiment'
            }
          },
          
          riskAssessment: {
            overallRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as RiskLevel,
            riskScore: Math.floor(Math.random() * 100),
            warnings: ['Market volatility', 'Earnings uncertainty'],
            recommendations: ['Monitor closely', 'Consider position sizing'],
            factors: {
              volatilityRisk: Math.floor(Math.random() * 50),
              liquidityRisk: Math.floor(Math.random() * 30),
              concentrationRisk: Math.floor(Math.random() * 40),
              marketRisk: Math.floor(Math.random() * 60),
              sentimentRisk: Math.floor(Math.random() * 35),
              technicalRisk: Math.floor(Math.random() * 45)
            }
          },
          
          marketContext: {
            condition: 'BULLISH',
            trend: ['UP', 'DOWN', 'SIDEWAYS'][Math.floor(Math.random() * 3)] as any,
            volatility: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
            volume: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
            sector: 'Technology',
            marketCap: 'LARGE',
            correlation: { market: 0.8, sector: 0.9, peers: 0.7 }
          },
          
          confidenceFactors: {
            technicalConfidence: 0.6 + Math.random() * 0.3,
            sentimentConfidence: 0.5 + Math.random() * 0.4,
            patternMatchConfidence: 0.6 + Math.random() * 0.3,
            marketConditionConfidence: 0.5 + Math.random() * 0.4,
            volumeConfidence: 0.7 + Math.random() * 0.2,
            historicalAccuracy: 0.6 + Math.random() * 0.3
          },
          
          timeHorizon: ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'][Math.floor(Math.random() * 3)] as TimeHorizon,
          keyFactors: [`Technical breakout for ${ticker}`, 'Volume confirmation'],
          patternMatches: [{
            patternName: 'Bullish Flag',
            confidence: 0.7 + Math.random() * 0.2,
            successRate: 0.6 + Math.random() * 0.3,
            averageReturn: 0.05 + Math.random() * 0.1,
            timeToTarget: 10 + Math.random() * 20,
            description: 'Classic bullish continuation pattern',
            historicalOutcome: 'BULLISH',
            similarity: 0.7 + Math.random() * 0.2
          }],
          source: 'mock_generation' as any,
          priceTargets: {
            timeHorizon: 'MEDIUM_TERM',
            targets: { conservative: 105, moderate: 110, aggressive: 115 },
            probability: { upside: 0.6, downside: 0.4 },
            keyLevels: { support: [95, 90], resistance: [110, 115] }
          },
          warnings: [],
          version: '1.0',
          updateFrequency: 'REAL_TIME',
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastUpdated: new Date()
        };
        
        signals.push(signal);
      }
      
      this.signals.set(ticker, signals);
    }
    
    // Generate mock alerts
    for (let i = 0; i < 20; i++) {
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const alertTypes: AlertType[] = ['SIGNAL_GENERATED', 'THRESHOLD_BREACH', 'PRICE_MOVEMENT', 'RISK_WARNING'];
      const severities: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      
      const alert: TradingAlert = {
        id: `alert-${Date.now()}-${i}`,
        ticker,
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: `Mock alert for ${ticker}: ${alertTypes[0]} detected`,
        timestamp: new Date(Date.now() - i * 1800000), // i * 30 minutes ago
        confidence: 0.6 + Math.random() * 0.3,
        status: Math.random() > 0.3 ? 'ACTIVE' : 'RESOLVED',
        trigger: {
          condition: 'Mock alert condition',
          threshold: 0,
          actualValue: 0
        },
        source: 'mock_data',
        category: 'mock',
        tags: ['mock', 'test'],
        deliveryMethods: ['CONSOLE'],
        deliveryStatus: {},
        suggestedActions: ['Review position'],
        followUpRequired: false
      };
      
      this.alerts.push(alert);
    }
    
    // Generate mock analysis history
    for (const ticker of tickers) {
      const history: any[] = [];
      
      for (let i = 0; i < 5; i++) {
        history.push({
          id: `analysis-${ticker}-${Date.now()}-${i}`,
          ticker,
          timestamp: new Date(Date.now() - i * 86400000), // i days ago
          analysisType: 'FULL_ANALYSIS',
          result: {
            recommendation: actions[Math.floor(Math.random() * actions.length)],
            confidence: 0.5 + Math.random() * 0.4,
            technicalScore: Math.random() * 100,
            sentimentScore: (Math.random() - 0.5) * 2,
            riskScore: Math.random() * 100
          },
          processingTime: 1000 + Math.random() * 2000, // 1-3 seconds
          version: '1.0.0'
        });
      }
      
      this.analysisHistory.set(ticker, history);
    }
    
    console.log(`✅ Mock data initialized: ${this.signals.size} tickers, ${this.alerts.length} alerts`);
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    totalSignals: number;
    totalAlerts: number;
    totalAnalyses: number;
    tickersTracked: number;
    activeAlerts: number;
  } {
    let totalSignals = 0;
    let totalAnalyses = 0;
    
    for (const signals of this.signals.values()) {
      totalSignals += signals.length;
    }
    
    for (const analyses of this.analysisHistory.values()) {
      totalAnalyses += analyses.length;
    }
    
    return {
      totalSignals,
      totalAlerts: this.alerts.length,
      totalAnalyses,
      tickersTracked: this.signals.size,
      activeAlerts: this.alerts.filter(a => a.status === 'ACTIVE').length
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.signals.clear();
    this.alerts.length = 0;
    this.analysisHistory.clear();
    console.log('🧹 All mock data cleared');
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.clearAll();
    this.initializeMockData();
    console.log('🔄 Mock data reset to initial state');
  }
}

/**
 * Singleton instance for use across the application
 */
export const mockTradingStorage = new MockTradingStorage();

/**
 * Factory function for creating new mock storage instances
 */
export function createMockTradingStorage(): MockTradingStorage {
  return new MockTradingStorage();
}

export default MockTradingStorage;