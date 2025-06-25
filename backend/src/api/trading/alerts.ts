/**
 * Trading Alerts API Endpoints
 * REST API endpoints for trading alert management and notifications
 */

import { Router } from 'express';
import { mockTradingStorage } from './mock-data.js';
import { TradingAlert, AlertType, AlertSeverity, AlertStatus } from '../../types/alerts.js';
import { AlertDetectorAgent } from '../../agents/alert-detector.js';
import { AnomalyDetectorAgent } from '../../agents/anomaly-detector.js';
import { MockNotificationService } from '../../services/mock-notification-service.js';

export const alertsRouter = Router();

// Initialize alert services
const alertDetector = new AlertDetectorAgent(mockTradingStorage as any);
const anomalyDetector = new AnomalyDetectorAgent(mockTradingStorage as any);
const notificationService = new MockNotificationService();

/**
 * GET /api/trading/alerts
 * Get all alerts with filtering options
 */
alertsRouter.get('/', async (req: any, res: any) => {
  try {
    const { 
      status = 'ACTIVE',
      severity,
      type,
      ticker,
      limit = 50,
      offset = 0,
      timeframe = '24h'
    } = req.query;

    console.log('🚨 Fetching trading alerts');

    // Calculate date range based on timeframe
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const alerts = await mockTradingStorage.select('trading_alerts', {
      ticker: ticker as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      orderBy: 'created_at desc',
      startDate
    });

    // Apply filters
    let filteredAlerts = alerts;

    if (status && status !== 'ALL') {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }

    // Calculate summary statistics
    const summary = {
      totalAlerts: filteredAlerts.length,
      activeAlerts: filteredAlerts.filter(a => a.status === 'ACTIVE').length,
      severityBreakdown: filteredAlerts.reduce((breakdown, alert) => {
        breakdown[alert.severity] = (breakdown[alert.severity] || 0) + 1;
        return breakdown;
      }, {} as Record<AlertSeverity, number>),
      typeBreakdown: filteredAlerts.reduce((breakdown, alert) => {
        breakdown[alert.type] = (breakdown[alert.type] || 0) + 1;
        return breakdown;
      }, {} as Record<AlertType, number>),
      averageConfidence: filteredAlerts.length > 0 
        ? filteredAlerts.reduce((sum, a) => sum + a.confidence, 0) / filteredAlerts.length 
        : 0
    };

    res.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        summary,
        filters: {
          status,
          severity,
          type,
          ticker,
          timeframe
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/alerts/:ticker
 * Get alerts for specific ticker
 */
alertsRouter.get('/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { limit = 20, status = 'ALL' } = req.query;

    console.log(`🚨 Fetching alerts for ${ticker.toUpperCase()}`);

    const alerts = await mockTradingStorage.getAlertsByTicker(ticker.toUpperCase());

    // Apply status filter
    let filteredAlerts = alerts;
    if (status !== 'ALL') {
      filteredAlerts = alerts.filter(alert => alert.status === status);
    }

    // Apply limit
    filteredAlerts = filteredAlerts.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        alerts: filteredAlerts,
        summary: {
          totalAlerts: filteredAlerts.length,
          activeAlerts: filteredAlerts.filter(a => a.status === 'ACTIVE').length,
          recentAlert: filteredAlerts[0] || null
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching ticker alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticker alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts
 * Create a new alert
 */
alertsRouter.post('/', async (req: any, res: any) => {
  try {
    const alertData = req.body;

    console.log('🚨 Creating new alert');

    // Validate required fields
    if (!alertData.ticker || !alertData.type || !alertData.message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticker, type, and message'
      });
    }

    // Create alert object
    const alert: TradingAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker: alertData.ticker.toUpperCase(),
      type: alertData.type,
      severity: alertData.severity || 'MEDIUM',
      message: alertData.message,
      timestamp: new Date(),
      confidence: alertData.confidence || 0.8,
      status: 'ACTIVE',
      trigger: {
        condition: alertData.message || 'Manual alert creation',
        threshold: 0,
        actualValue: 0
      },
      source: 'manual_api',
      category: 'user_created',
      tags: ['manual', 'api'],
      deliveryMethods: ['CONSOLE'],
      deliveryStatus: {},
      suggestedActions: alertData.suggestedActions || ['Review alert conditions'],
      followUpRequired: true,
      // Remove non-existent properties
      // conditions: alertData.conditions,
      // actions: alertData.actions
    };

    // Insert into storage
    const createdAlert = await mockTradingStorage.insert('trading_alerts', alert);

    // Send notification
    await notificationService.sendAlert(createdAlert);

    res.status(201).json({
      success: true,
      data: {
        alert: createdAlert,
        message: 'Alert created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/trading/alerts/:alertId
 * Update alert status or properties
 */
alertsRouter.put('/:alertId', async (req: any, res: any) => {
  try {
    const { alertId } = req.params;
    const updateData = req.body;

    console.log(`✏️ Updating alert ${alertId}`);

    // For mock implementation, return updated data
    const updatedAlert = await mockTradingStorage.update('trading_alerts', alertId, {
      ...updateData,
      updated_at: new Date()
    });

    res.json({
      success: true,
      data: {
        alert: updatedAlert,
        message: 'Alert updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
alertsRouter.post('/:alertId/acknowledge', async (req: any, res: any) => {
  try {
    const { alertId } = req.params;
    const { userId, notes } = req.body;

    console.log(`✅ Acknowledging alert ${alertId}`);

    const updatedAlert = await mockTradingStorage.update('trading_alerts', alertId, {
      status: 'ACKNOWLEDGED',
      acknowledged_by: userId,
      acknowledged_at: new Date(),
      acknowledgment_notes: notes
    });

    res.json({
      success: true,
      data: {
        alert: updatedAlert,
        message: 'Alert acknowledged successfully'
      }
    });

  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts/:alertId/resolve
 * Resolve an alert
 */
alertsRouter.post('/:alertId/resolve', async (req: any, res: any) => {
  try {
    const { alertId } = req.params;
    const { userId, resolution, notes } = req.body;

    console.log(`✅ Resolving alert ${alertId}`);

    const updatedAlert = await mockTradingStorage.update('trading_alerts', alertId, {
      status: 'RESOLVED',
      resolved_by: userId,
      resolved_at: new Date(),
      resolution: resolution || 'MANUAL_RESOLUTION',
      resolution_notes: notes
    });

    res.json({
      success: true,
      data: {
        alert: updatedAlert,
        message: 'Alert resolved successfully'
      }
    });

  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/trading/alerts/:alertId
 * Delete an alert
 */
alertsRouter.delete('/:alertId', async (req: any, res: any) => {
  try {
    const { alertId } = req.params;

    console.log(`🗑️ Deleting alert ${alertId}`);

    const success = await mockTradingStorage.delete('trading_alerts', alertId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Alert deleted successfully',
        alertId
      }
    });

  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts/detect/:ticker
 * Run alert detection for specific ticker
 */
alertsRouter.post('/detect/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { detectionType = 'all' } = req.body;

    console.log(`🔍 Running alert detection for ${ticker.toUpperCase()}`);

    let detectedAlerts: TradingAlert[] = [];

    // Run different types of detection
    // Get market data for detection
    const marketDataResult = await mockTradingStorage.select('market_data', {
      ticker: ticker.toUpperCase(),
      limit: 100,
      orderBy: 'timestamp'
    });
    const marketData = Array.isArray((marketDataResult as any).data) ? (marketDataResult as any).data : 
                     Array.isArray(marketDataResult) ? marketDataResult : [];

    if (detectionType === 'all' || detectionType === 'signals' || detectionType === 'price' || detectionType === 'volume') {
      const alertResult = await alertDetector.detectAlerts(ticker.toUpperCase(), marketData);
      detectedAlerts.push(...alertResult.alerts);
    }

    if (detectionType === 'all' || detectionType === 'anomaly') {
      const anomalies = await anomalyDetector.detectAnomalies(ticker.toUpperCase(), marketData);
      // Convert anomalies to alerts
      for (const anomaly of anomalies) {
        const alert = anomalyDetector.createAlertFromAnomaly(anomaly);
        detectedAlerts.push(alert);
      }
    }

    // Store and send notifications for new alerts
    const storedAlerts = [];
    for (const alert of detectedAlerts) {
      const stored = await mockTradingStorage.insert('trading_alerts', alert);
      await notificationService.sendAlert(stored);
      storedAlerts.push(stored);
    }

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        detectedAlerts: storedAlerts,
        summary: {
          totalDetected: storedAlerts.length,
          detectionType,
          severityBreakdown: storedAlerts.reduce((breakdown, alert) => {
            breakdown[alert.severity] = (breakdown[alert.severity] || 0) + 1;
            return breakdown;
          }, {} as Record<AlertSeverity, number>)
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error detecting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts/detect/batch
 * Run alert detection for multiple tickers
 */
alertsRouter.post('/detect/batch', async (req: any, res: any) => {
  try {
    const { tickers = [], detectionType = 'all' } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tickers array is required'
      });
    }

    if (tickers.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 tickers allowed per batch'
      });
    }

    console.log(`🔍 Running batch alert detection for ${tickers.length} tickers`);

    const results = [];
    const errors = [];
    let totalDetected = 0;

    for (const ticker of tickers) {
      try {
        let detectedAlerts: TradingAlert[] = [];

        // Get market data for detection
        const marketDataResult = await mockTradingStorage.select('market_data', {
          ticker: ticker.toUpperCase(),
          limit: 100,
          orderBy: 'timestamp'
        });
        const marketData = Array.isArray((marketDataResult as any).data) ? (marketDataResult as any).data : 
                     Array.isArray(marketDataResult) ? marketDataResult : [];

        // Run detection for this ticker
        if (detectionType === 'all' || detectionType === 'signals') {
          const alertResult = await alertDetector.detectAlerts(ticker.toUpperCase(), marketData);
          detectedAlerts.push(...alertResult.alerts);
        }

        if (detectionType === 'all' || detectionType === 'anomaly') {
          const anomalies = await anomalyDetector.detectAnomalies(ticker.toUpperCase(), marketData);
          // Convert anomalies to alerts
          for (const anomaly of anomalies) {
            const alert = anomalyDetector.createAlertFromAnomaly(anomaly);
            detectedAlerts.push(alert);
          }
        }

        // Store alerts
        const storedAlerts = [];
        for (const alert of detectedAlerts) {
          const stored = await mockTradingStorage.insert('trading_alerts', alert);
          storedAlerts.push(stored);
        }

        totalDetected += storedAlerts.length;

        results.push({
          ticker: ticker.toUpperCase(),
          alertsDetected: storedAlerts.length,
          alerts: storedAlerts
        });

      } catch (error) {
        errors.push({
          ticker: ticker.toUpperCase(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalTickers: tickers.length,
          successful: results.length,
          failed: errors.length,
          totalAlertsDetected: totalDetected,
          detectionType
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in batch alert detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch alert detection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/alerts/statistics
 * Get alert statistics and metrics
 */
alertsRouter.get('/statistics', async (req: any, res: any) => {
  try {
    const { timeframe = '24h' } = req.query;

    console.log('📊 Fetching alert statistics');

    // Calculate date range
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const alerts = await mockTradingStorage.select('trading_alerts', {
      startDate,
      orderBy: 'created_at desc'
    });

    // Calculate statistics
    const stats = {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'ACTIVE').length,
      resolvedAlerts: alerts.filter(a => a.status === 'RESOLVED').length,
      acknowledgedAlerts: alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
      
      severityBreakdown: alerts.reduce((breakdown, alert) => {
        breakdown[alert.severity] = (breakdown[alert.severity] || 0) + 1;
        return breakdown;
      }, {} as Record<AlertSeverity, number>),
      
      typeBreakdown: alerts.reduce((breakdown, alert) => {
        breakdown[alert.type] = (breakdown[alert.type] || 0) + 1;
        return breakdown;
      }, {} as Record<AlertType, number>),
      
      tickerBreakdown: alerts.reduce((breakdown, alert) => {
        breakdown[alert.ticker] = (breakdown[alert.ticker] || 0) + 1;
        return breakdown;
      }, {} as Record<string, number>),
      
      averageConfidence: alerts.length > 0 
        ? alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length 
        : 0,
      
      hourlyDistribution: getHourlyDistribution(alerts),
      
      responseMetrics: {
        averageResponseTime: 300, // Mock data - 5 minutes
        alertsResolvedWithin1Hour: Math.floor(alerts.length * 0.8),
        alertsResolvedWithin24Hours: Math.floor(alerts.length * 0.95)
      }
    };

    res.json({
      success: true,
      data: {
        statistics: stats,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/alerts/test
 * Test alert notification system
 */
alertsRouter.post('/test', async (req: any, res: any) => {
  try {
    const { severity = 'LOW', ticker = 'TEST' } = req.body;

    console.log('🧪 Testing alert notification system');

    // Create test alert
    const testAlert: TradingAlert = {
      id: `test-alert-${Date.now()}`,
      ticker: ticker.toUpperCase(),
      type: 'SIGNAL_GENERATED',
      severity: severity as AlertSeverity,
      message: 'This is a test alert to verify the notification system is working',
      timestamp: new Date(),
      confidence: 1.0,
      status: 'ACTIVE',
      trigger: {
        condition: 'Test alert trigger',
        threshold: 0,
        actualValue: 0
      },
      source: 'api_test',
      category: 'test',
      tags: ['test'],
      deliveryMethods: ['CONSOLE'],
      deliveryStatus: {},
      suggestedActions: ['Verify notification system'],
      followUpRequired: false
    };

    // Send test notification
    await notificationService.sendAlert(testAlert);

    res.json({
      success: true,
      data: {
        alert: testAlert,
        message: 'Test alert sent successfully'
      }
    });

  } catch (error) {
    console.error('Error sending test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to calculate hourly distribution of alerts
 */
function getHourlyDistribution(alerts: TradingAlert[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  
  for (let hour = 0; hour < 24; hour++) {
    distribution[hour] = 0;
  }
  
  alerts.forEach(alert => {
    const hour = alert.timestamp.getHours();
    distribution[hour]++;
  });
  
  return distribution;
}

export default alertsRouter;