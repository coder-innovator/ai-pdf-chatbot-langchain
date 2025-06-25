/**
 * Main API Router
 * Combines all API endpoints and provides the main Express router
 */

import express, { Router, Request, Response } from 'express';
import cors from 'cors';
import { signalsRouter } from './trading/signals.js';
import { analysisRouter } from './trading/analysis.js';
import { alertsRouter } from './trading/alerts.js';
import { mockTradingStorage } from './trading/mock-data.js';
import { 
  getRateLimitStatus, 
  updateRateLimit, 
  resetProviderUsage, 
  clearCache, 
  getUsageAnalytics, 
  testRateLimit 
} from './rate-limits-simple.js';

export const apiRouter = Router();

// Middleware
apiRouter.use(cors());
apiRouter.use(express.json({ limit: '10mb' }));
apiRouter.use(express.urlencoded({ extended: true }));

// Request logging middleware
apiRouter.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
apiRouter.get('/health', (req: Request, res: Response) => {
  const stats = mockTradingStorage.getStats();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      storage: 'connected',
      notifications: 'active'
    },
    storage: stats
  });
});

// API info endpoint
apiRouter.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'Trading API',
    version: '1.0.0',
    description: 'REST API for trading signals, analysis, and alerts',
    endpoints: {
      signals: '/api/trading/signals',
      analysis: '/api/trading/analyze',
      alerts: '/api/trading/alerts',
      rateLimits: '/api/rate-limits',
      health: '/api/health',
      info: '/api/info'
    },
    features: [
      'Trading signal generation',
      'Technical analysis',
      'Sentiment analysis',
      'Risk assessment',
      'Alert management',
      'Q&A system',
      'Batch operations',
      'Mock data storage',
      'API rate limiting',
      'Usage analytics'
    ],
    documentation: 'Available endpoints documented below',
    lastUpdated: new Date().toISOString()
  });
});

// Trading routes
apiRouter.use('/trading/signals', signalsRouter);
apiRouter.use('/trading/analyze', analysisRouter);
apiRouter.use('/trading/alerts', alertsRouter);

// Rate limiting routes
apiRouter.get('/rate-limits/status', getRateLimitStatus);
apiRouter.get('/rate-limits/analytics', getUsageAnalytics);
apiRouter.put('/rate-limits/:provider', updateRateLimit);
apiRouter.post('/rate-limits/:provider/reset', resetProviderUsage);
apiRouter.post('/rate-limits/cache/clear', clearCache);
apiRouter.get('/rate-limits/test/:provider/:endpoint?', testRateLimit);

// Storage management endpoints
apiRouter.get('/storage/stats', (req: Request, res: Response) => {
  try {
    const stats = mockTradingStorage.getStats();
    
    res.json({
      success: true,
      data: {
        storage: stats,
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

apiRouter.post('/storage/reset', (req: Request, res: Response) => {
  try {
    console.log('🔄 Resetting mock storage...');
    mockTradingStorage.reset();
    
    res.json({
      success: true,
      data: {
        message: 'Mock storage reset successfully',
        newStats: mockTradingStorage.getStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

apiRouter.delete('/storage/clear', (req: Request, res: Response) => {
  try {
    console.log('🧹 Clearing all mock data...');
    mockTradingStorage.clearAll();
    
    res.json({
      success: true,
      data: {
        message: 'All mock data cleared successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
apiRouter.use((error: Error, req: Request, res: Response, next: any) => {
  console.error('API Error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
apiRouter.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      health: 'GET /api/health',
      info: 'GET /api/info',
      signals: 'GET /api/trading/signals',
      analysis: 'POST /api/trading/analyze/:ticker',
      alerts: 'GET /api/trading/alerts',
      rateLimits: 'GET /api/rate-limits/status',
      storage: 'GET /api/storage/stats'
    }
  });
});

/**
 * Create Express app with trading API
 */
export function createTradingAPI(): express.Application {
  const app = express();
  
  // Global middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Mount API router
  app.use('/api', apiRouter);
  
  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Trading API Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        api: '/api',
        health: '/api/health',
        info: '/api/info'
      },
      timestamp: new Date().toISOString()
    });
  });
  
  return app;
}

/**
 * Start the trading API server
 */
export function startTradingAPI(port: number = 3001): void {
  const app = createTradingAPI();
  
  app.listen(port, () => {
    console.log(`🚀 Trading API server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`📖 API info: http://localhost:${port}/api/info`);
    console.log(`🔧 Storage stats: http://localhost:${port}/api/storage/stats`);
  });
}

// Demo endpoints for testing
apiRouter.get('/demo/quick-signal/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    
    console.log(`🎯 Demo: Quick signal for ${ticker.toUpperCase()}`);
    
    // Get latest signal from storage
    const signals = await mockTradingStorage.select('trading_signals', {
      ticker: ticker.toUpperCase(),
      limit: 1,
      orderBy: 'created_at desc'
    });
    
    const signal = signals[0];
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'No signals found for ticker',
        suggestion: `Try POST /api/trading/analyze/${ticker} to generate a new signal`
      });
    }
    
    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        action: signal.action,
        confidence: `${(signal.confidence * 100).toFixed(1)}%`,
        reasoning: signal.reasoning,
        timestamp: signal.timestamp,
        riskLevel: signal.riskAssessment?.overallRisk || 'UNKNOWN'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick signal',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

apiRouter.get('/demo/market-overview', async (req: Request, res: Response) => {
  try {
    console.log('📈 Demo: Market overview');
    
    const stats = mockTradingStorage.getStats();
    const recentSignals = await mockTradingStorage.select('trading_signals', {
      limit: 10,
      orderBy: 'created_at desc'
    });
    
    const activeAlerts = await mockTradingStorage.getActiveAlerts();
    
    // Calculate market sentiment
    const signalActions = recentSignals.map(s => s.action);
    const bullishSignals = signalActions.filter(a => a.includes('BUY')).length;
    const bearishSignals = signalActions.filter(a => a.includes('SELL')).length;
    const neutralSignals = signalActions.filter(a => a === 'HOLD').length;
    
    const marketSentiment = bullishSignals > bearishSignals ? 'BULLISH' : 
                           bearishSignals > bullishSignals ? 'BEARISH' : 'NEUTRAL';
    
    res.json({
      success: true,
      data: {
        marketSentiment,
        overview: {
          totalTickers: stats.tickersTracked,
          totalSignals: stats.totalSignals,
          activeAlerts: stats.activeAlerts,
          recentActivity: recentSignals.length
        },
        signalDistribution: {
          bullish: bullishSignals,
          bearish: bearishSignals,
          neutral: neutralSignals
        },
        topAlerts: activeAlerts.slice(0, 5),
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default apiRouter;