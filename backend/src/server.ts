/**
 * Main Trading System Server
 * Integrates all components: API, WebSocket, Schedulers, and Job Queue
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { apiRouter } from './api/index.js';
import { chatRouter, setChatWebSocketServer } from './api/chat.js';
import { createTradingWebSocketServer } from './websocket/index.js';
import { mockMarketDataScheduler } from './schedulers/mock-market-data-cron.js';
import { analysisScheduler } from './schedulers/analysis-scheduler.js';
import { tradingJobQueue } from './services/mock-job-queue.js';
import { mockRealTimeUpdater } from './services/mock-real-time-updater.js';

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  wsPort?: number;
  enableCors: boolean;
  enableSchedulers: boolean;
  enableJobQueue: boolean;
  enableWebSocket: boolean;
  enableRealTimeUpdater: boolean;
  corsOrigin?: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * Trading System Server Class
 */
export class TradingSystemServer {
  private app: express.Application;
  private httpServer: any;
  private wsServer: any;
  private config: ServerConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 3001,
      wsPort: 8080,
      enableCors: true,
      enableSchedulers: true,
      enableJobQueue: true,
      enableWebSocket: true,
      enableRealTimeUpdater: true,
      corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
      environment: (process.env.NODE_ENV as any) || 'development',
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.httpServer = createServer(this.app);

    console.log('🏗️ Trading System Server initialized');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: this.config.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} - ${req.method} ${req.path} from ${req.ip}`);
      next();
    });

    // Security headers
    this.app.use((req, res, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Trading System Server',
        version: '1.0.0',
        status: 'running',
        environment: this.config.environment,
        components: {
          api: 'active',
          webSocket: this.config.enableWebSocket ? 'active' : 'disabled',
          schedulers: this.config.enableSchedulers ? 'active' : 'disabled',
          jobQueue: this.config.enableJobQueue ? 'active' : 'disabled',
          realTimeUpdater: this.config.enableRealTimeUpdater ? 'active' : 'disabled'
        },
        endpoints: {
          api: '/api',
          chat: '/api/chat',
          health: '/api/health',
          websocket: `ws://localhost:${this.config.wsPort}/ws/trading`
        },
        timestamp: new Date().toISOString()
      });
    });

    // Mount API routes
    this.app.use('/api', apiRouter);
    this.app.use('/api/chat', chatRouter);

    // System status endpoint
    this.app.get('/status', (req, res) => {
      const status = this.getSystemStatus();
      res.json(status);
    });

    // System control endpoints (for development)
    if (this.config.environment === 'development') {
      this.setupDevelopmentEndpoints();
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: {
          root: 'GET /',
          api: 'GET /api',
          chat: 'POST /api/chat/ask',
          health: 'GET /api/health',
          status: 'GET /status'
        }
      });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Server error:', error);
      
      res.status(500).json({
        error: 'Internal server error',
        message: this.config.environment === 'development' ? error.message : 'An error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup development-only endpoints
   */
  private setupDevelopmentEndpoints(): void {
    // Manual scheduler triggers
    this.app.post('/dev/trigger-scheduler/:type', async (req, res) => {
      try {
        const { type } = req.params;
        
        switch (type) {
          case 'market-data':
            await mockMarketDataScheduler.triggerJob('market_data_update');
            break;
          case 'signal-generation':
            await mockMarketDataScheduler.triggerJob('signal_generation');
            break;
          case 'alert-detection':
            await mockMarketDataScheduler.triggerJob('alert_detection');
            break;
          case 'technical-analysis':
            await analysisScheduler.triggerAnalysis('technical_analysis');
            break;
          case 'sentiment-analysis':
            await analysisScheduler.triggerAnalysis('sentiment_analysis');
            break;
          default:
            return res.status(400).json({ error: 'Unknown scheduler type' });
        }
        
        res.json({ success: true, message: `${type} triggered successfully` });
      } catch (error) {
        res.status(500).json({ error: 'Failed to trigger scheduler', details: error });
      }
    });

    // Job queue management
    this.app.get('/dev/jobs', (req, res) => {
      const stats = tradingJobQueue.getStats();
      const recentJobs = tradingJobQueue.getJobs().slice(-10);
      
      res.json({
        stats,
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
          duration: job.duration
        }))
      });
    });

    this.app.post('/dev/jobs/:type', async (req, res) => {
      try {
        const { type } = req.params;
        const { data, priority = 'normal' } = req.body;
        
        const jobId = await tradingJobQueue.add(type as any, data || {}, { priority });
        
        res.json({
          success: true,
          jobId,
          message: `${type} job added to queue`
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to add job', details: error });
      }
    });

    // Real-time updater controls
    this.app.post('/dev/updater/:action', (req, res) => {
      try {
        const { action } = req.params;
        
        switch (action) {
          case 'start':
            mockRealTimeUpdater.start();
            break;
          case 'stop':
            mockRealTimeUpdater.stop();
            break;
          case 'pause':
            mockRealTimeUpdater.pause();
            break;
          case 'resume':
            mockRealTimeUpdater.resume();
            break;
          default:
            return res.status(400).json({ error: 'Unknown action' });
        }
        
        res.json({ success: true, message: `Real-time updater ${action}ed` });
      } catch (error) {
        res.status(500).json({ error: `Failed to ${action} updater`, details: error });
      }
    });

    console.log('🛠️ Development endpoints configured');
  }

  /**
   * Start the server and all components
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Trading System Server...');

      // Start HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.listen(this.config.port, () => {
          console.log(`🌐 HTTP Server running on port ${this.config.port}`);
          resolve();
        });
      });

      // Start WebSocket server
      if (this.config.enableWebSocket) {
        this.wsServer = createTradingWebSocketServer(
          { port: this.config.wsPort },
          this.httpServer
        );
        
        // Connect chat API to WebSocket server
        setChatWebSocketServer(this.wsServer);
        console.log(`📡 WebSocket Server running on port ${this.config.wsPort}`);
      }

      // Start real-time updater
      if (this.config.enableRealTimeUpdater) {
        mockRealTimeUpdater.start();
        console.log('⚡ Real-time updater started');
      }

      // Start job queue
      if (this.config.enableJobQueue) {
        tradingJobQueue.start();
        console.log('🔄 Job queue started');
      }

      // Start schedulers
      if (this.config.enableSchedulers) {
        mockMarketDataScheduler.startScheduler();
        analysisScheduler.start();
        console.log('⏰ Schedulers started');
      }

      this.isRunning = true;

      console.log('✅ Trading System Server fully started!');
      console.log(`📊 System Dashboard: http://localhost:${this.config.port}/status`);
      console.log(`🔗 API Base URL: http://localhost:${this.config.port}/api`);
      
      if (this.config.enableWebSocket) {
        console.log(`📡 WebSocket URL: ws://localhost:${this.config.wsPort}/ws/trading`);
      }

      // Log system overview
      this.logSystemOverview();

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server and all components
   */
  async stop(): Promise<void> {
    console.log('⏹️ Stopping Trading System Server...');

    try {
      // Stop schedulers
      if (this.config.enableSchedulers) {
        mockMarketDataScheduler.stopScheduler();
        analysisScheduler.stop();
        console.log('⏰ Schedulers stopped');
      }

      // Stop job queue
      if (this.config.enableJobQueue) {
        tradingJobQueue.stop();
        console.log('🔄 Job queue stopped');
      }

      // Stop real-time updater
      if (this.config.enableRealTimeUpdater) {
        mockRealTimeUpdater.stop();
        console.log('⚡ Real-time updater stopped');
      }

      // Stop WebSocket server
      if (this.wsServer) {
        this.wsServer.stop();
        console.log('📡 WebSocket server stopped');
      }

      // Stop HTTP server
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          console.log('🌐 HTTP server stopped');
          resolve();
        });
      });

      this.isRunning = false;
      console.log('✅ Trading System Server stopped');

    } catch (error) {
      console.error('❌ Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): any {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      server: {
        isRunning: this.isRunning,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        environment: this.config.environment,
        nodeVersion: process.version,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
        }
      },
      components: {
        httpServer: {
          status: this.isRunning ? 'running' : 'stopped',
          port: this.config.port
        },
        webSocketServer: this.wsServer ? {
          status: 'running',
          port: this.config.wsPort,
          ...this.wsServer.getStats()
        } : { status: 'disabled' },
        realTimeUpdater: {
          ...mockRealTimeUpdater.getStats()
        },
        marketDataScheduler: {
          ...mockMarketDataScheduler.getSchedulerStats()
        },
        analysisScheduler: {
          ...analysisScheduler.getStats()
        },
        jobQueue: {
          ...tradingJobQueue.getStats()
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log system overview
   */
  private logSystemOverview(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRADING SYSTEM OVERVIEW');
    console.log('='.repeat(60));
    console.log(`🌐 HTTP Server: http://localhost:${this.config.port}`);
    console.log(`📡 WebSocket: ws://localhost:${this.config.wsPort}/ws/trading`);
    console.log(`⚡ Real-time Updates: ${this.config.enableRealTimeUpdater ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⏰ Schedulers: ${this.config.enableSchedulers ? 'RUNNING' : 'DISABLED'}`);
    console.log(`🔄 Job Queue: ${this.config.enableJobQueue ? 'ACTIVE' : 'DISABLED'}`);
    console.log('='.repeat(60));
    console.log('📋 KEY ENDPOINTS:');
    console.log(`   • API Health: GET /api/health`);
    console.log(`   • Trading Signals: GET /api/trading/signals/:ticker`);
    console.log(`   • Generate Analysis: POST /api/trading/analyze/:ticker`);
    console.log(`   • Chat Q&A: POST /api/chat/ask`);
    console.log(`   • System Status: GET /status`);
    
    if (this.config.environment === 'development') {
      console.log('🛠️ DEVELOPMENT ENDPOINTS:');
      console.log(`   • Trigger Jobs: POST /dev/trigger-scheduler/:type`);
      console.log(`   • Job Queue: GET /dev/jobs`);
      console.log(`   • Updater Control: POST /dev/updater/:action`);
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Graceful shutdown handler
   */
  setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
}

/**
 * Create and start the trading system server
 */
export async function createTradingSystemServer(config?: Partial<ServerConfig>): Promise<TradingSystemServer> {
  const server = new TradingSystemServer(config);
  server.setupGracefulShutdown();
  await server.start();
  return server;
}

/**
 * Main entry point
 */
export default async function main(): Promise<void> {
  try {
    console.log('🏁 Starting Trading System...');
    
    const config: Partial<ServerConfig> = {
      port: parseInt(process.env.PORT || '3001'),
      wsPort: parseInt(process.env.WS_PORT || '8080'),
      environment: (process.env.NODE_ENV as any) || 'development',
      corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000'
    };

    await createTradingSystemServer(config);
    
  } catch (error) {
    console.error('❌ Failed to start Trading System:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}