/**
 * Trading Signals API Endpoints
 * REST API endpoints for trading signal management
 */

import { Router } from 'express';
import { mockTradingStorage } from './mock-data.js';
import { TradingSignal, SignalAction, TimeHorizon } from '../../types/trading-signals.js';
import { SignalGeneratorAgent } from '../../agents/signal-generator.js';
import { TechnicalAnalysisAgent } from '../../agents/technical-analysis.js';
import { SentimentAnalysisAgent } from '../../agents/sentiment-analysis.js';

export const signalsRouter = Router();

// Initialize agents for signal generation
const technicalAgent = new TechnicalAnalysisAgent(mockTradingStorage as any);
const sentimentAgent = new SentimentAnalysisAgent(mockTradingStorage as any);
const signalGenerator = new SignalGeneratorAgent(
  technicalAgent,
  sentimentAgent,
  mockTradingStorage as any
);

/**
 * GET /api/trading/signals/:ticker
 * Get trading signals for a specific ticker
 */
signalsRouter.get('/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { 
      limit = 10, 
      offset = 0, 
      timeframe = '7d',
      action 
    } = req.query;

    console.log(`📊 Fetching signals for ${ticker.toUpperCase()}`);

    // Calculate date range based on timeframe
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Use mock storage to fetch signals
    const signals = await mockTradingStorage.select('trading_signals', {
      ticker: ticker.toUpperCase(),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: 'created_at desc',
      startDate
    });

    // Filter by action if specified
    let filteredSignals = signals;
    if (action && typeof action === 'string') {
      filteredSignals = signals.filter(signal => 
        signal.action === action.toUpperCase()
      );
    }

    // Calculate summary statistics
    const totalSignals = filteredSignals.length;
    const averageConfidence = totalSignals > 0 
      ? filteredSignals.reduce((sum, s) => sum + s.confidence, 0) / totalSignals 
      : 0;
    
    const actionCounts = filteredSignals.reduce((counts, signal) => {
      counts[signal.action] = (counts[signal.action] || 0) + 1;
      return counts;
    }, {} as Record<SignalAction, number>);

    const latestSignal = filteredSignals[0] || null;

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        signals: filteredSignals,
        summary: {
          totalSignals,
          averageConfidence: Math.round(averageConfidence * 100) / 100,
          actionCounts,
          latestSignal,
          timeframe,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading signals',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/signals/:ticker/latest
 * Get the latest signal for a ticker
 */
signalsRouter.get('/:ticker/latest', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;

    console.log(`🎯 Fetching latest signal for ${ticker.toUpperCase()}`);

    const signals = await mockTradingStorage.select('trading_signals', {
      ticker: ticker.toUpperCase(),
      limit: 1,
      orderBy: 'created_at desc'
    });

    const latestSignal = signals[0] || null;

    if (!latestSignal) {
      return res.status(404).json({
        success: false,
        error: 'No signals found for ticker',
        ticker: ticker.toUpperCase()
      });
    }

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        signal: latestSignal,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching latest signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/signals/:ticker/history
 * Get signal history with performance metrics
 */
signalsRouter.get('/:ticker/history', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { 
      limit = 50, 
      action,
      timeHorizon,
      minConfidence 
    } = req.query;

    console.log(`📈 Fetching signal history for ${ticker.toUpperCase()}`);

    const signals = await mockTradingStorage.select('trading_signals', {
      ticker: ticker.toUpperCase(),
      limit: parseInt(limit as string),
      orderBy: 'created_at desc'
    });

    // Apply filters
    let filteredSignals = signals;
    
    if (action) {
      filteredSignals = filteredSignals.filter(s => s.action === action);
    }
    
    if (timeHorizon) {
      filteredSignals = filteredSignals.filter(s => s.timeHorizon === timeHorizon);
    }
    
    if (minConfidence) {
      const minConf = parseFloat(minConfidence as string);
      filteredSignals = filteredSignals.filter(s => s.confidence >= minConf);
    }

    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(filteredSignals);

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        signals: filteredSignals,
        performance: performanceMetrics,
        filters: {
          action,
          timeHorizon,
          minConfidence
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching signal history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signal history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/signals/:ticker
 * Create a new trading signal (manual or triggered)
 */
signalsRouter.post('/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const signalData = req.body;

    console.log(`💾 Creating new signal for ${ticker.toUpperCase()}`);

    // Validate required fields
    if (!signalData.action || !signalData.confidence) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action and confidence'
      });
    }

    // Create signal object
    const signal: TradingSignal = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker: ticker.toUpperCase(),
      timestamp: new Date(),
      action: signalData.action,
      strength: signalData.strength || 'MODERATE',
      confidence: signalData.confidence,
      currentPrice: signalData.currentPrice || 0,
      targetPrice: signalData.targetPrice,
      stopLoss: signalData.stopLoss,
      reasoning: signalData.reasoning || 'Manual signal creation',
      timeHorizon: signalData.timeHorizon || 'MEDIUM_TERM',
      keyFactors: signalData.keyFactors || [],
      technicalContributions: signalData.technicalContributions || {},
      sentimentContributions: signalData.sentimentContributions || {},
      riskAssessment: signalData.riskAssessment || {
        overallRisk: 'MEDIUM',
        riskScore: 50,
        warnings: [],
        recommendations: [],
        factors: {
          volatilityRisk: 30,
          liquidityRisk: 20,
          concentrationRisk: 25,
          marketRisk: 40,
          sentimentRisk: 15,
          technicalRisk: 20
        }
      },
      marketContext: signalData.marketContext || {},
      confidenceFactors: signalData.confidenceFactors || {
        technicalConfidence: 0.5,
        sentimentConfidence: 0.5,
        patternMatchConfidence: 0.5,
        marketConditionConfidence: 0.5,
        volumeConfidence: 0.5,
        historicalAccuracy: 0.5
      },
      source: 'manual_api' as any,
      patternMatches: [],
      priceTargets: {
        timeHorizon: signalData.timeHorizon || 'MEDIUM_TERM',
        targets: { conservative: 0, moderate: 0, aggressive: 0 },
        probability: { upside: 0.5, downside: 0.5 },
        keyLevels: { support: [], resistance: [] }
      },
      warnings: [],
      version: '1.0',
      updateFrequency: 'MANUAL',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date()
    };

    // Insert into mock storage
    const createdSignal = await mockTradingStorage.insert('trading_signals', signal);

    res.status(201).json({
      success: true,
      data: {
        signal: createdSignal,
        message: 'Signal created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/trading/signals/:ticker/:signalId
 * Update an existing signal
 */
signalsRouter.put('/:ticker/:signalId', async (req: any, res: any) => {
  try {
    const { ticker, signalId } = req.params;
    const updateData = req.body;

    console.log(`✏️ Updating signal ${signalId} for ${ticker.toUpperCase()}`);

    // For mock implementation, just return updated data
    const updatedSignal = await mockTradingStorage.update('trading_signals', signalId, {
      ...updateData,
      updated_at: new Date()
    });

    res.json({
      success: true,
      data: {
        signal: updatedSignal,
        message: 'Signal updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/trading/signals/:ticker/:signalId
 * Delete a signal
 */
signalsRouter.delete('/:ticker/:signalId', async (req: any, res: any) => {
  try {
    const { ticker, signalId } = req.params;

    console.log(`🗑️ Deleting signal ${signalId} for ${ticker.toUpperCase()}`);

    const success = await mockTradingStorage.delete('trading_signals', signalId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Signal not found'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Signal deleted successfully',
        signalId
      }
    });

  } catch (error) {
    console.error('Error deleting signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/signals
 * Get signals across all tickers with filtering
 */
signalsRouter.get('/', async (req: any, res: any) => {
  try {
    const { 
      limit = 50, 
      offset = 0,
      action,
      minConfidence,
      timeframe = '7d'
    } = req.query;

    console.log('📊 Fetching signals across all tickers');

    // Calculate date range
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeframe) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const signals = await mockTradingStorage.select('trading_signals', {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: 'created_at desc',
      startDate
    });

    // Apply filters
    let filteredSignals = signals;
    
    if (action) {
      filteredSignals = filteredSignals.filter(s => s.action === action);
    }
    
    if (minConfidence) {
      const minConf = parseFloat(minConfidence as string);
      filteredSignals = filteredSignals.filter(s => s.confidence >= minConf);
    }

    // Group by ticker for summary
    const signalsByTicker = filteredSignals.reduce((groups, signal) => {
      const ticker = signal.ticker;
      if (!groups[ticker]) {
        groups[ticker] = [];
      }
      groups[ticker].push(signal);
      return groups;
    }, {} as Record<string, TradingSignal[]>);

    res.json({
      success: true,
      data: {
        signals: filteredSignals,
        signalsByTicker,
        summary: {
          totalSignals: filteredSignals.length,
          uniqueTickers: Object.keys(signalsByTicker).length,
          timeframe,
          filters: { action, minConfidence }
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching all signals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signals',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Calculate performance metrics for signals
 */
function calculatePerformanceMetrics(signals: TradingSignal[]): any {
  if (signals.length === 0) {
    return {
      totalSignals: 0,
      averageConfidence: 0,
      actionDistribution: {},
      riskDistribution: {},
      timeHorizonDistribution: {}
    };
  }

  const totalSignals = signals.length;
  const averageConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / totalSignals;

  // Action distribution
  const actionDistribution = signals.reduce((dist, signal) => {
    dist[signal.action] = (dist[signal.action] || 0) + 1;
    return dist;
  }, {} as Record<SignalAction, number>);

  // Risk distribution
  const riskDistribution = signals.reduce((dist, signal) => {
    const risk = signal.riskAssessment?.overallRisk || 'UNKNOWN';
    dist[risk] = (dist[risk] || 0) + 1;
    return dist;
  }, {} as Record<string, number>);

  // Time horizon distribution
  const timeHorizonDistribution = signals.reduce((dist, signal) => {
    const horizon = signal.timeHorizon || 'UNKNOWN';
    dist[horizon] = (dist[horizon] || 0) + 1;
    return dist;
  }, {} as Record<TimeHorizon | 'UNKNOWN', number>);

  // Confidence ranges
  const highConfidence = signals.filter(s => s.confidence >= 0.8).length;
  const mediumConfidence = signals.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length;
  const lowConfidence = signals.filter(s => s.confidence < 0.6).length;

  return {
    totalSignals,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    actionDistribution,
    riskDistribution,
    timeHorizonDistribution,
    confidenceRanges: {
      high: highConfidence,
      medium: mediumConfidence,
      low: lowConfidence
    }
  };
}

export default signalsRouter;