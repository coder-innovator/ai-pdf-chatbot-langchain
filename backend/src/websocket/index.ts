/**
 * WebSocket Server for Real-Time Trading Data
 * Provides WebSocket connections for real-time trading signals, alerts, and price updates
 */

import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { MockTradingStream } from './mock-trading-streams.js';
import { mockRealTimeUpdater, UpdateEventData } from '../services/mock-real-time-updater.js';

/**
 * WebSocket connection with trading stream capabilities
 */
export interface TradingWebSocketConnection {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  isAlive: boolean;
  metadata: {
    userAgent?: string;
    origin?: string;
    connectedAt: Date;
    lastPing: Date;
  };
}

/**
 * WebSocket server configuration
 */
export interface WebSocketConfig {
  port?: number;
  path?: string;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  enableRealTimeUpdater?: boolean;
  maxConnections?: number;
}

/**
 * Trading WebSocket Server
 */
export class TradingWebSocketServer {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, TradingWebSocketConnection> = new Map();
  private tradingStream: MockTradingStream;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<WebSocketConfig>;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      port: 8080,
      path: '/ws/trading',
      enableHeartbeat: true,
      heartbeatInterval: 30000, // 30 seconds
      enableRealTimeUpdater: true,
      maxConnections: 1000,
      ...config
    };

    this.tradingStream = new MockTradingStream();
    this.setupRealTimeUpdaterIntegration();
  }

  /**
   * Start the WebSocket server
   */
  start(server?: Server): void {
    console.log('🚀 Starting Trading WebSocket Server...');

    const options: any = {
      path: this.config.path
    };

    if (server) {
      options.server = server;
      console.log(`📡 WebSocket server will use existing HTTP server on path ${this.config.path}`);
    } else {
      options.port = this.config.port;
      console.log(`📡 WebSocket server starting on port ${this.config.port} with path ${this.config.path}`);
    }

    this.wss = new WebSocketServer(options);

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });

    // Start heartbeat if enabled
    if (this.config.enableHeartbeat) {
      this.startHeartbeat();
    }

    // Start real-time updater if enabled
    if (this.config.enableRealTimeUpdater) {
      mockRealTimeUpdater.start();
    }

    console.log('✅ Trading WebSocket Server started successfully');
    console.log(`🔗 WebSocket endpoint: ws://localhost:${this.config.port}${this.config.path}`);
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    console.log('⏹️ Stopping Trading WebSocket Server...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Stop real-time updater
    if (this.config.enableRealTimeUpdater) {
      mockRealTimeUpdater.stop();
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log('✅ Trading WebSocket Server stopped');
      });
      this.wss = null;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleNewConnection(ws: WebSocket, request: any): void {
    // Check connection limit
    if (this.connections.size >= this.config.maxConnections) {
      console.log('❌ Connection limit reached, rejecting new connection');
      ws.close(1013, 'Server overloaded');
      return;
    }

    const connectionId = uuidv4();
    const userAgent = request.headers['user-agent'];
    const origin = request.headers.origin;

    console.log(`📱 New WebSocket connection: ${connectionId} from ${origin || 'unknown'}`);

    const connection: TradingWebSocketConnection = {
      id: connectionId,
      ws,
      subscriptions: new Set(),
      isAlive: true,
      metadata: {
        userAgent,
        origin,
        connectedAt: new Date(),
        lastPing: new Date()
      }
    };

    this.connections.set(connectionId, connection);

    // Add connection to trading stream
    this.tradingStream.addClient(ws, connectionId, {
      userAgent,
      origin
    });

    // Set up WebSocket event handlers
    ws.on('message', (message) => {
      this.handleMessage(connectionId, message);
    });

    ws.on('pong', () => {
      this.handlePong(connectionId);
    });

    ws.on('close', (code, reason) => {
      this.handleConnectionClose(connectionId, code, reason);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for connection ${connectionId}:`, error);
      this.handleConnectionClose(connectionId, 1011, Buffer.from('Connection error'));
    });

    // Send welcome message
    this.sendToConnection(connectionId, {
      type: 'welcome',
      data: {
        connectionId,
        serverTime: new Date().toISOString(),
        availableChannels: [
          'market_updates',
          'signals',
          'alerts',
          'ticker:AAPL',
          'ticker:GOOGL',
          'ticker:MSFT',
          'ticker:AMZN',
          'ticker:TSLA',
          'ticker:META',
          'ticker:NFLX'
        ]
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: string, message: WebSocket.Data): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(connectionId, data.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(connectionId, data.channel);
          break;
        case 'ping':
          this.handlePing(connectionId);
          break;
        case 'request_data':
          this.handleDataRequest(connectionId, data);
          break;
        case 'trigger_signal':
          this.handleTriggerSignal(connectionId, data);
          break;
        case 'create_alert':
          this.handleCreateAlert(connectionId, data);
          break;
        default:
          console.warn(`⚠️ Unknown message type from ${connectionId}:`, data.type);
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${connectionId}:`, error);
      this.sendError(connectionId, 'Invalid message format');
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscribe(connectionId: string, channel: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.add(channel);
    console.log(`📺 Connection ${connectionId} subscribed to ${channel}`);

    this.sendToConnection(connectionId, {
      type: 'subscription_confirmed',
      data: { channel }
    });
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(connectionId: string, channel: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.delete(channel);
    console.log(`📺 Connection ${connectionId} unsubscribed from ${channel}`);

    this.sendToConnection(connectionId, {
      type: 'subscription_cancelled',
      data: { channel }
    });
  }

  /**
   * Handle ping messages
   */
  private handlePing(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.metadata.lastPing = new Date();
    this.sendToConnection(connectionId, {
      type: 'pong',
      data: { timestamp: new Date().toISOString() }
    });
  }

  /**
   * Handle pong responses
   */
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.metadata.lastPing = new Date();
    }
  }

  /**
   * Handle data requests
   */
  private handleDataRequest(connectionId: string, data: any): void {
    console.log(`📊 Data request from ${connectionId}:`, data.request);
    
    // Handle different types of data requests
    switch (data.request) {
      case 'current_prices':
        this.sendCurrentPrices(connectionId, data.tickers);
        break;
      case 'latest_signals':
        this.sendLatestSignals(connectionId, data.ticker, data.limit);
        break;
      case 'active_alerts':
        this.sendActiveAlerts(connectionId, data.ticker);
        break;
      case 'market_status':
        this.sendMarketStatus(connectionId);
        break;
      default:
        this.sendError(connectionId, `Unknown data request: ${data.request}`);
    }
  }

  /**
   * Handle manual signal trigger requests
   */
  private async handleTriggerSignal(connectionId: string, data: any): Promise<void> {
    try {
      console.log(`🎯 Manual signal trigger request from ${connectionId}:`, data);
      
      const signal = await mockRealTimeUpdater.generateSignal(data.ticker, {
        action: data.action,
        confidence: data.confidence,
        reasoning: data.reasoning || 'Manually triggered via WebSocket'
      });

      this.sendToConnection(connectionId, {
        type: 'signal_triggered',
        data: { signal, success: true }
      });

    } catch (error) {
      console.error(`❌ Error triggering signal:`, error);
      this.sendError(connectionId, 'Failed to trigger signal');
    }
  }

  /**
   * Handle manual alert creation requests
   */
  private async handleCreateAlert(connectionId: string, data: any): Promise<void> {
    try {
      console.log(`🚨 Manual alert creation request from ${connectionId}:`, data);
      
      const alert = await mockRealTimeUpdater.createAlert(data.ticker, {
        type: data.type,
        severity: data.severity,
        message: data.message,
        metadata: data.metadata
      });

      this.sendToConnection(connectionId, {
        type: 'alert_created',
        data: { alert, success: true }
      });

    } catch (error) {
      console.error(`❌ Error creating alert:`, error);
      this.sendError(connectionId, 'Failed to create alert');
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(connectionId: string, code?: number, reason?: Buffer): void {
    console.log(`📱 WebSocket connection closed: ${connectionId} (code: ${code})`);
    
    // Remove from trading stream
    this.tradingStream.removeClient(connectionId);
    
    // Remove from connections
    this.connections.delete(connectionId);
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
          connectionId
        }));
      } catch (error) {
        console.error(`❌ Error sending message to ${connectionId}:`, error);
        this.handleConnectionClose(connectionId, 1011, Buffer.from('Send error'));
      }
    }
  }

  /**
   * Send error message to connection
   */
  private sendError(connectionId: string, errorMessage: string): void {
    this.sendToConnection(connectionId, {
      type: 'error',
      data: { error: errorMessage }
    });
  }

  /**
   * Broadcast message to all subscribed connections
   */
  broadcast(message: any, channel?: string): void {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    let targetConnections = Array.from(this.connections.values());

    // Filter by channel subscription if specified
    if (channel) {
      targetConnections = targetConnections.filter(conn => 
        conn.subscriptions.has(channel) || conn.subscriptions.has('*')
      );
    }

    for (const connection of targetConnections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(messageStr);
        } catch (error) {
          console.error(`❌ Error broadcasting to ${connection.id}:`, error);
          this.handleConnectionClose(connection.id, 1011, Buffer.from('Broadcast error'));
        }
      }
    }

    if (targetConnections.length > 0) {
      console.log(`📡 Broadcasted message to ${targetConnections.length} connections${channel ? ` (channel: ${channel})` : ''}`);
    }
  }

  /**
   * Setup integration with real-time updater
   */
  private setupRealTimeUpdaterIntegration(): void {
    // Listen for real-time updates and broadcast them via WebSocket
    mockRealTimeUpdater.on('update', (updateData: UpdateEventData) => {
      this.handleRealTimeUpdate(updateData);
    });

    console.log('🔗 Real-time updater integration setup complete');
  }

  /**
   * Handle real-time updates from the updater service
   */
  private handleRealTimeUpdate(updateData: UpdateEventData): void {
    const message = {
      type: 'real_time_update',
      data: updateData
    };

    // Broadcast to different channels based on update type
    switch (updateData.type) {
      case 'signal_created':
      case 'signal_updated':
        this.broadcast(message, 'signals');
        if (updateData.record.ticker) {
          this.broadcast(message, `ticker:${updateData.record.ticker}`);
        }
        break;
      
      case 'alert_created':
      case 'alert_updated':
      case 'alert_resolved':
        this.broadcast(message, 'alerts');
        if (updateData.record.ticker) {
          this.broadcast(message, `ticker:${updateData.record.ticker}`);
        }
        break;
      
      case 'price_changed':
        this.broadcast(message, 'market_updates');
        if (updateData.record.ticker) {
          this.broadcast(message, `ticker:${updateData.record.ticker}`);
        }
        break;
      
      case 'market_status_changed':
        this.broadcast(message, 'market_updates');
        break;
      
      default:
        this.broadcast(message);
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    console.log(`💓 Starting WebSocket heartbeat (every ${this.config.heartbeatInterval}ms)`);
    
    this.heartbeatInterval = setInterval(() => {
      for (const [connectionId, connection] of this.connections) {
        if (!connection.isAlive) {
          console.log(`💀 Terminating inactive connection: ${connectionId}`);
          connection.ws.terminate();
          this.connections.delete(connectionId);
        } else {
          connection.isAlive = false;
          if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.ping();
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Send current prices to connection
   */
  private async sendCurrentPrices(connectionId: string, tickers?: string[]): Promise<void> {
    // Mock current prices
    const prices = (tickers || ['AAPL', 'GOOGL', 'MSFT']).map(ticker => ({
      ticker,
      price: 100 + Math.random() * 400,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      timestamp: new Date()
    }));

    this.sendToConnection(connectionId, {
      type: 'current_prices',
      data: { prices }
    });
  }

  /**
   * Send latest signals to connection
   */
  private async sendLatestSignals(connectionId: string, ticker?: string, limit: number = 5): Promise<void> {
    try {
      const signals = await mockRealTimeUpdater.generateSignal(ticker || 'AAPL');
      
      this.sendToConnection(connectionId, {
        type: 'latest_signals',
        data: { signals: [signals], ticker, limit }
      });
    } catch (error) {
      this.sendError(connectionId, 'Failed to fetch latest signals');
    }
  }

  /**
   * Send active alerts to connection
   */
  private async sendActiveAlerts(connectionId: string, ticker?: string): Promise<void> {
    try {
      // Mock active alerts
      const alerts = ticker 
        ? await mockRealTimeUpdater.triggerAlertsForTicker(ticker)
        : [];

      this.sendToConnection(connectionId, {
        type: 'active_alerts',
        data: { alerts, ticker }
      });
    } catch (error) {
      this.sendError(connectionId, 'Failed to fetch active alerts');
    }
  }

  /**
   * Send market status to connection
   */
  private sendMarketStatus(connectionId: string): void {
    const now = new Date();
    const hour = now.getHours();
    
    let status = 'CLOSED';
    if (hour >= 9 && hour < 16) status = 'OPEN';
    else if (hour >= 4 && hour < 9) status = 'PRE_MARKET';
    else if (hour >= 16 && hour < 20) status = 'AFTER_HOURS';

    this.sendToConnection(connectionId, {
      type: 'market_status',
      data: {
        status,
        timestamp: now.toISOString(),
        nextOpen: '9:30 AM ET',
        nextClose: '4:00 PM ET'
      }
    });
  }

  /**
   * Get server statistics
   */
  getStats(): {
    activeConnections: number;
    totalSubscriptions: number;
    isRunning: boolean;
    uptime: number;
    tradingStreamStats: any;
    updaterStats: any;
  } {
    let totalSubscriptions = 0;
    for (const connection of this.connections.values()) {
      totalSubscriptions += connection.subscriptions.size;
    }

    return {
      activeConnections: this.connections.size,
      totalSubscriptions,
      isRunning: this.wss !== null,
      uptime: process.uptime(),
      tradingStreamStats: this.tradingStream.getStreamStats(),
      updaterStats: mockRealTimeUpdater.getStats()
    };
  }

  /**
   * Get connected clients info
   */
  getClientsInfo(): Array<{
    id: string;
    subscriptions: string[];
    connectedAt: Date;
    lastPing: Date;
    isAlive: boolean;
  }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      subscriptions: Array.from(conn.subscriptions),
      connectedAt: conn.metadata.connectedAt,
      lastPing: conn.metadata.lastPing,
      isAlive: conn.isAlive
    }));
  }
}

/**
 * Create and start WebSocket server
 */
export function createTradingWebSocketServer(config?: WebSocketConfig, httpServer?: Server): TradingWebSocketServer {
  const wsServer = new TradingWebSocketServer(config);
  wsServer.start(httpServer);
  return wsServer;
}

/**
 * Default export
 */
export default TradingWebSocketServer;