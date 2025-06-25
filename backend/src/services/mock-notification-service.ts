/**
 * Mock Notification Service
 * Handles alert delivery through various channels (console logs for development)
 */

import {
  TradingAlert,
  AlertDeliveryMethod,
  AlertSeverity,
  AlertSubscription,
  AlertUtils
} from '../types/alerts.js';

/**
 * Notification delivery configuration
 */
export interface NotificationConfig {
  enabledMethods: AlertDeliveryMethod[];
  retryAttempts: number;
  retryDelayMs: number;
  batchSize: number;
  rateLimitPerMinute: number;
  quietHours?: {
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
}

/**
 * Delivery result tracking
 */
export interface DeliveryResult {
  method: AlertDeliveryMethod;
  success: boolean;
  timestamp: Date;
  error?: string;
  metadata?: {
    messageId?: string;
    recipientCount?: number;
    deliveryTime?: number;
  };
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  alertType: string;
  severity: AlertSeverity;
  
  templates: {
    [method in AlertDeliveryMethod]?: {
      subject?: string;
      body: string;
      format: 'TEXT' | 'HTML' | 'MARKDOWN';
    };
  };
  
  variables: string[]; // Available template variables
}

/**
 * Mock Notification Service Implementation
 */
export class MockNotificationService {
  private config: Required<NotificationConfig>;
  private deliveryQueue: Array<{ alert: TradingAlert; methods: AlertDeliveryMethod[] }> = [];
  private rateLimitCounter = new Map<AlertDeliveryMethod, number>();
  private templates = new Map<string, NotificationTemplate>();
  private subscribers = new Map<string, AlertSubscription[]>();

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      enabledMethods: ['CONSOLE', 'UI_NOTIFICATION'],
      retryAttempts: 3,
      retryDelayMs: 1000,
      batchSize: 10,
      rateLimitPerMinute: 100,
      quietHours: {
        start: '22:00',
        end: '06:00',
        timezone: 'UTC'
      },
      ...config
    };

    this.initializeDefaultTemplates();
    this.startRateLimitReset();
  }

  /**
   * Send a single alert through specified delivery methods
   */
  async sendAlert(alert: TradingAlert): Promise<DeliveryResult[]> {
    console.log(`\n🔔 Processing alert: ${alert.id}`);
    
    const results: DeliveryResult[] = [];
    const methods = alert.deliveryMethods.filter(method => 
      this.config.enabledMethods.includes(method)
    );

    // Check quiet hours
    if (this.isQuietHours() && alert.severity !== 'CRITICAL') {
      console.log(`⏰ Quiet hours active, deferring non-critical alert`);
      this.queueAlert(alert, methods);
      return results;
    }

    // Process each delivery method
    for (const method of methods) {
      try {
        const result = await this.deliverViaMethod(alert, method);
        results.push(result);
        
        // Update alert delivery status
        alert.deliveryStatus[method] = {
          sent: result.success,
          timestamp: result.timestamp,
          error: result.error
        };
      } catch (error) {
        console.error(`❌ Failed to deliver alert via ${method}:`, error);
        results.push({
          method,
          success: false,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Mark as delivered if any method succeeded
    if (results.some(r => r.success)) {
      alert.deliveredAt = new Date();
    }

    return results;
  }

  /**
   * Send multiple alerts in batch
   */
  async sendBatchAlerts(alerts: TradingAlert[]): Promise<Map<string, DeliveryResult[]>> {
    console.log(`\n📦 Processing batch of ${alerts.length} alerts`);
    
    const results = new Map<string, DeliveryResult[]>();
    const batches = this.chunkArray(alerts, this.config.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (alert) => {
        const deliveryResults = await this.sendAlert(alert);
        results.set(alert.id, deliveryResults);
        return { alertId: alert.id, results: deliveryResults };
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches to respect rate limits
      if (batches.length > 1) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Subscribe to alerts matching criteria
   */
  subscribeToAlerts(subscription: AlertSubscription): void {
    const userSubscriptions = this.subscribers.get(subscription.userId) || [];
    userSubscriptions.push(subscription);
    this.subscribers.set(subscription.userId, userSubscriptions);
    
    console.log(`✅ User ${subscription.userId} subscribed to alerts`);
  }

  /**
   * Unsubscribe from alerts
   */
  unsubscribeFromAlerts(userId: string, subscriptionId: string): void {
    const userSubscriptions = this.subscribers.get(userId) || [];
    const filtered = userSubscriptions.filter(sub => sub.id !== subscriptionId);
    this.subscribers.set(userId, filtered);
    
    console.log(`❌ Unsubscribed ${userId} from alerts (${subscriptionId})`);
  }

  /**
   * Send digest summary
   */
  async sendDigest(userId: string, alerts: TradingAlert[]): Promise<void> {
    console.log(`\n📋 Sending alert digest to ${userId}`);
    console.log(`Summary: ${alerts.length} alerts in the last period`);
    
    const summary = this.generateDigestSummary(alerts);
    console.log(summary);
    
    // In a real implementation, this would format and send an actual digest
  }

  // Private helper methods

  private async deliverViaMethod(alert: TradingAlert, method: AlertDeliveryMethod): Promise<DeliveryResult> {
    // Check rate limit
    if (!this.checkRateLimit(method)) {
      return {
        method,
        success: false,
        timestamp: new Date(),
        error: 'Rate limit exceeded'
      };
    }

    const startTime = Date.now();
    
    try {
      switch (method) {
        case 'CONSOLE':
          await this.deliverToConsole(alert);
          break;
        case 'UI_NOTIFICATION':
          await this.deliverToUI(alert);
          break;
        case 'EMAIL':
          await this.deliverToEmail(alert);
          break;
        case 'WEBHOOK':
          await this.deliverToWebhook(alert);
          break;
        case 'SMS':
          await this.deliverToSMS(alert);
          break;
        default:
          throw new Error(`Unsupported delivery method: ${method}`);
      }

      const deliveryTime = Date.now() - startTime;
      
      return {
        method,
        success: true,
        timestamp: new Date(),
        metadata: {
          deliveryTime,
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      };
    } catch (error) {
      return {
        method,
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async deliverToConsole(alert: TradingAlert): Promise<void> {
    const emoji = this.getSeverityEmoji(alert.severity);
    const formattedMessage = AlertUtils.formatMessage(alert);
    
    console.log(`\n${emoji} ============ TRADING ALERT ============`);
    console.log(`🎯 Type: ${alert.type}`);
    console.log(`📈 Ticker: ${alert.ticker}`);
    console.log(`⚡ Severity: ${alert.severity}`);
    console.log(`💬 Message: ${alert.message}`);
    if (alert.description) {
      console.log(`📝 Description: ${alert.description}`);
    }
    console.log(`🎲 Confidence: ${(alert.confidence * 100).toFixed(1)}%`);
    if (alert.currentPrice) {
      console.log(`💰 Current Price: $${alert.currentPrice.toFixed(2)}`);
    }
    if (alert.percentChange) {
      const changeEmoji = alert.percentChange > 0 ? '📈' : '📉';
      console.log(`${changeEmoji} Change: ${alert.percentChange.toFixed(2)}%`);
    }
    if (alert.suggestedActions.length > 0) {
      console.log(`🎯 Suggested Actions:`);
      alert.suggestedActions.forEach(action => console.log(`   • ${action}`));
    }
    console.log(`⏰ Time: ${alert.timestamp.toISOString()}`);
    console.log(`🔍 Source: ${alert.source}`);
    console.log(`=====================================\n`);
  }

  private async deliverToUI(alert: TradingAlert): Promise<void> {
    // Simulate UI notification
    console.log(`🖥️  [UI NOTIFICATION] ${AlertUtils.formatMessage(alert)}`);
    console.log(`    └─ Displaying in notification panel for 10 seconds`);
    
    // In a real implementation, this would trigger a UI toast/notification
    await this.delay(50); // Simulate UI rendering time
  }

  private async deliverToEmail(alert: TradingAlert): Promise<void> {
    // Simulate email delivery
    console.log(`📧 [EMAIL] Sending to trading@example.com`);
    console.log(`    └─ Subject: ${alert.type} Alert for ${alert.ticker}`);
    console.log(`    └─ Body: ${alert.message}`);
    
    await this.delay(200); // Simulate email send time
  }

  private async deliverToWebhook(alert: TradingAlert): Promise<void> {
    // Simulate webhook delivery
    console.log(`🔗 [WEBHOOK] POST to https://api.example.com/alerts`);
    console.log(`    └─ Payload: ${JSON.stringify({
      id: alert.id,
      type: alert.type,
      ticker: alert.ticker,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp
    }, null, 2).substring(0, 200)}...`);
    
    await this.delay(300); // Simulate HTTP request time
  }

  private async deliverToSMS(alert: TradingAlert): Promise<void> {
    // Simulate SMS delivery
    const shortMessage = `${alert.type}: ${alert.ticker} - ${alert.message.substring(0, 100)}`;
    console.log(`📱 [SMS] Sending to +1234567890`);
    console.log(`    └─ Message: ${shortMessage}`);
    
    await this.delay(500); // Simulate SMS gateway time
  }

  private checkRateLimit(method: AlertDeliveryMethod): boolean {
    const currentCount = this.rateLimitCounter.get(method) || 0;
    if (currentCount >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    this.rateLimitCounter.set(method, currentCount + 1);
    return true;
  }

  private startRateLimitReset(): void {
    setInterval(() => {
      this.rateLimitCounter.clear();
    }, 60000); // Reset every minute
  }

  private isQuietHours(): boolean {
    if (!this.config.quietHours) return false;
    
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    
    // Simple check - in production would handle timezone conversion properly
    return currentTime >= this.config.quietHours.start || 
           currentTime <= this.config.quietHours.end;
  }

  private queueAlert(alert: TradingAlert, methods: AlertDeliveryMethod[]): void {
    this.deliveryQueue.push({ alert, methods });
    console.log(`📥 Alert queued for later delivery (${this.deliveryQueue.length} in queue)`);
  }

  private generateDigestSummary(alerts: TradingAlert[]): string {
    const summary = {
      total: alerts.length,
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topTickers: this.getTopTickers(alerts, 5)
    };

    return `
📊 Alert Digest Summary:
• Total Alerts: ${summary.total}
• By Severity: ${Object.entries(summary.bySeverity).map(([k, v]) => `${k}: ${v}`).join(', ')}
• Top Types: ${Object.entries(summary.byType).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
• Most Active Tickers: ${summary.topTickers.join(', ')}
    `;
  }

  private getTopTickers(alerts: TradingAlert[], limit: number): string[] {
    const tickerCounts = alerts.reduce((acc, alert) => {
      acc[alert.ticker] = (acc[alert.ticker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tickerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([ticker]) => ticker);
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '📊';
      case 'LOW': return 'ℹ️';
      default: return '📢';
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private initializeDefaultTemplates(): void {
    // Initialize with some default templates
    const defaultTemplate: NotificationTemplate = {
      id: 'default',
      name: 'Default Alert Template',
      alertType: '*',
      severity: 'MEDIUM',
      templates: {
        CONSOLE: {
          body: '{{type}} alert for {{ticker}}: {{message}}',
          format: 'TEXT'
        },
        EMAIL: {
          subject: '{{type}} Alert - {{ticker}}',
          body: 'Alert Details:\n\nTicker: {{ticker}}\nType: {{type}}\nSeverity: {{severity}}\nMessage: {{message}}\nConfidence: {{confidence}}%\n\nGenerated at: {{timestamp}}',
          format: 'TEXT'
        }
      },
      variables: ['type', 'ticker', 'message', 'severity', 'confidence', 'timestamp']
    };

    this.templates.set('default', defaultTemplate);
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(): {
    totalSent: number;
    successRate: number;
    rateLimitHits: number;
    queueSize: number;
  } {
    return {
      totalSent: 0, // Would track in real implementation
      successRate: 0.95, // Mock success rate
      rateLimitHits: 0,
      queueSize: this.deliveryQueue.length
    };
  }

  /**
   * Process queued alerts (e.g., after quiet hours)
   */
  async processQueue(): Promise<void> {
    if (this.deliveryQueue.length === 0) return;

    console.log(`🔄 Processing ${this.deliveryQueue.length} queued alerts`);
    
    const queuedAlerts = [...this.deliveryQueue];
    this.deliveryQueue = [];

    for (const { alert, methods } of queuedAlerts) {
      alert.deliveryMethods = methods;
      await this.sendAlert(alert);
    }
  }
}

/**
 * Factory function to create notification service
 */
export function createNotificationService(config?: Partial<NotificationConfig>): MockNotificationService {
  return new MockNotificationService(config);
}

export default MockNotificationService;