/**
 * Simplified Production Server
 * Basic server with rate limiting API endpoints only
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Simple API router
import { getRateLimitStatus, getUsageAnalytics, testRateLimit } from './api/rate-limits-simple.js';

/**
 * Create Express app
 */
function createApp() {
  const app = express();
  
  // Get current directory for serving static files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files
  app.use('/public', express.static(join(__dirname, 'public')));

  // Request logging
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path}`);
    next();
  });

  // Root endpoint - redirect to dashboard
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });
  
  // Dashboard route
  app.get('/dashboard', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
  });
  
  // API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'AI PDF Chatbot Backend',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      features: ['Rate Limiting API', 'Interactive Dashboard', 'Basic Health Check'],
      endpoints: {
        dashboard: '/dashboard',
        health: '/api/health',
        rateLimits: '/api/rate-limits/status',
        analytics: '/api/rate-limits/analytics',
        test: '/api/rate-limits/test/:provider/:endpoint'
      }
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
  });

  // Rate limiting endpoints
  app.get('/api/rate-limits/status', getRateLimitStatus);
  app.get('/api/rate-limits/analytics', getUsageAnalytics);
  app.get('/api/rate-limits/test/:provider/:endpoint?', testRateLimit);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: {
        root: 'GET /',
        health: 'GET /api/health',
        rateLimits: 'GET /api/rate-limits/status'
      }
    });
  });

  return app;
}

/**
 * Start server
 */
async function startServer() {
  const app = createApp();
  const port = parseInt(process.env.PORT || '3001');
  
  const server = createServer(app);
  
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`🚀 Production server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
      console.log(`🔧 Rate limits: http://localhost:${port}/api/rate-limits/status`);
      resolve();
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}