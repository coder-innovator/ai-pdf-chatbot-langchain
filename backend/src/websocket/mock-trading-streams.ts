/**
 * Mock Trading Streams
 * Simulates real-time trading data streams using WebSocket
 * Replicates what Supabase real-time would provide
 */

import WebSocket from 'ws';
import { TradingSignal, SignalAction } from '../types/trading-signals.js';
import { TradingAlert, AlertType, AlertSeverity } from '../types/alerts.js';
import { mockTradingStorage } from '../api/trading/mock-data.js';

/**
 * WebSocket client with metadata
 */
export interface TradingClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    connectedAt: Date;
  };
}

/**
 * Stream message types
 */
export type StreamMessage = {
  type: 'price_update' | 'new_signal' | 'new_alert' | 'market_update' | 'system_status';
  data: any;
  timestamp: Date;
  source: 'mock_stream';
};

/**
 * Price update data
 */
export interface PriceUpdate {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
}

/**
 * Market update data
 */
export interface MarketUpdate {
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  indices: {
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }[];
  timestamp: Date;
  volume: number;
  volatility: number;
}

/**
 * Mock Trading Stream Class
 */
export class MockTradingStream {
  private clients: Map<string, TradingClient> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private tickers: string[] = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX'];
  private priceCache: Map<string, PriceUpdate> = new Map();

  constructor() {
    this.initializePriceCache();
  }

  /**
   * Add a new WebSocket client
   */
  addClient(ws: WebSocket, clientId: string, metadata: any = {}): void {
    console.log(`📡 New trading stream client connected: ${clientId}`);

    const client: TradingClient = {
      ws,
      id: clientId,
      subscriptions: new Set(),
      lastPing: new Date(),
      metadata: {
        ...metadata,
        connectedAt: new Date()
      }
    };

    this.clients.set(clientId, client);

    // Set up WebSocket event handlers
    ws.on('message', (message) => {
      this.handleClientMessage(clientId, message);
    });

    ws.on('close', () => {
      this.removeClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.removeClient(clientId);
    });

    // Send welcome message with current data
    this.sendWelcomeMessage(clientId);

    // Start streams if this is the first client
    if (this.clients.size === 1 && !this.isRunning) {
      this.startAllStreams();
    }
  }

  /**
   * Remove a WebSocket client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`📡 Trading stream client disconnected: ${clientId}`);
      this.clients.delete(clientId);

      // Stop streams if no clients are connected
      if (this.clients.size === 0) {
        this.stopAllStreams();
      }
    }
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(clientId: string, message: WebSocket.Data): void {
    try {
      const data = JSON.parse(message.toString());
      const client = this.clients.get(clientId);
      
      if (!client) return;

      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(clientId, data.channel);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, data.channel);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        case 'request_current_data':
          this.sendCurrentData(clientId, data.ticker);
          break;
        default:
          console.warn(`Unknown message type from client ${clientId}:`, data.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(channel);
      console.log(`📺 Client ${clientId} subscribed to ${channel}`);
      
      // Send confirmation
      this.sendToClient(clientId, {
        type: 'subscription_confirmed',
        channel,
        timestamp: new Date()
      });

      // Send current data for the channel
      if (channel.startsWith('ticker:')) {
        const ticker = channel.split(':')[1];
        this.sendCurrentData(clientId, ticker);
      }
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(channel);
      console.log(`📺 Client ${clientId} unsubscribed from ${channel}`);
      
      this.sendToClient(clientId, {
        type: 'subscription_cancelled',
        channel,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle ping messages
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = new Date();
      this.sendToClient(clientId, {
        type: 'pong',
        timestamp: new Date()
      });
    }
  }

  /**
   * Send welcome message with current data
   */
  private sendWelcomeMessage(clientId: string): void {
    const marketUpdate = this.generateMockMarketUpdate();
    
    this.sendToClient(clientId, {
      type: 'welcome',
      data: {
        availableChannels: [
          'market_updates',
          'signals',
          'alerts',
          ...this.tickers.map(ticker => `ticker:${ticker}`)
        ],
        currentMarket: marketUpdate,
        clientId
      },
      timestamp: new Date()
    });
  }

  /**
   * Send current data for a specific ticker
   */
  private sendCurrentData(clientId: string, ticker?: string): void {
    if (ticker) {
      const priceData = this.priceCache.get(ticker.toUpperCase());
      if (priceData) {
        this.sendToClient(clientId, {
          type: 'current_price',
          data: priceData,
          timestamp: new Date()
        });
      }
    } else {
      // Send all current prices
      const allPrices = Array.from(this.priceCache.values());
      this.sendToClient(clientId, {
        type: 'current_prices',
        data: allPrices,
        timestamp: new Date()
      });
    }
  }

  /**
   * Start all real-time streams
   */
  startAllStreams(): void {
    if (this.isRunning) return;
    
    console.log('🚀 Starting mock trading streams...');
    this.isRunning = true;

    // Start price updates (every 5 seconds)
    this.updateIntervals.set('prices', setInterval(() => {
      this.startPriceUpdates();
    }, 5000));

    // Start signal updates (every 30 seconds)
    this.updateIntervals.set('signals', setInterval(() => {
      this.generateRandomSignal();
    }, 30000));

    // Start alert updates (every 15 seconds)
    this.updateIntervals.set('alerts', setInterval(() => {
      this.generateRandomAlert();
    }, 15000));

    // Start market updates (every 60 seconds)
    this.updateIntervals.set('market', setInterval(() => {
      this.sendMarketUpdate();
    }, 60000));

    // Start heartbeat (every 30 seconds)
    this.updateIntervals.set('heartbeat', setInterval(() => {
      this.sendHeartbeat();
    }, 30000));

    console.log('✅ All trading streams started');
  }

  /**
   * Stop all real-time streams
   */
  stopAllStreams(): void {
    if (!this.isRunning) return;
    
    console.log('⏹️ Stopping mock trading streams...');
    this.isRunning = false;

    // Clear all intervals
    for (const [name, interval] of this.updateIntervals) {
      clearInterval(interval);
      console.log(`🛑 Stopped ${name} stream`);
    }
    
    this.updateIntervals.clear();
    console.log('✅ All trading streams stopped');
  }

  /**
   * Simulate real-time price updates
   */
  startPriceUpdates(): void {
    for (const ticker of this.tickers) {
      const mockUpdate = this.generateMockPriceUpdate(ticker);
      this.priceCache.set(ticker, mockUpdate);
      this.broadcast('price_update', mockUpdate, `ticker:${ticker}`);
    }
  }

  /**
   * Generate mock price update
   */
  generateMockPriceUpdate(ticker?: string): PriceUpdate {
    const targetTicker = ticker || this.tickers[Math.floor(Math.random() * this.tickers.length)];
    const currentPrice = this.priceCache.get(targetTicker)?.price || (100 + Math.random() * 400);
    
    // Generate realistic price movement (±2%)
    const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
    const newPrice = currentPrice * (1 + changePercent / 100);
    const change = newPrice - currentPrice;
    
    const update: PriceUpdate = {
      ticker: targetTicker,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 10000000), // 0-10M volume
      timestamp: new Date(),
      bid: Math.round((newPrice - 0.01) * 100) / 100,
      ask: Math.round((newPrice + 0.01) * 100) / 100,
      high24h: Math.round((newPrice * 1.05) * 100) / 100,
      low24h: Math.round((newPrice * 0.95) * 100) / 100
    };

    return update;
  }

  /**
   * Generate random trading signal
   */
  private async generateRandomSignal(): Promise<void> {
    const ticker = this.tickers[Math.floor(Math.random() * this.tickers.length)];
    const actions: SignalAction[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const signal: TradingSignal = {
      id: `stream-signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker,
      timestamp: new Date(),
      action,
      strength: 'MODERATE',
      confidence: 0.6 + Math.random() * 0.3,
      currentPrice: this.priceCache.get(ticker)?.price || 100,
      reasoning: `Real-time analysis suggests ${action.toLowerCase()} opportunity for ${ticker}`,
      technicalContributions: {
        movingAverages: {
          signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
          weight: 0.3,
          confidence: 0.7 + Math.random() * 0.2,
          details: 'Moving average crossover detected'
        },
        rsi: {
          value: 30 + Math.random() * 40,
          signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
          weight: 0.25,
          confidence: 0.6 + Math.random() * 0.3,
          details: 'RSI momentum shift'
        },
        macd: {
          signal: (action.includes('BUY') ? 'BUY' : action.includes('SELL') ? 'SELL' : 'NEUTRAL') as any,
          weight: 0.2,
          confidence: 0.65 + Math.random() * 0.25,
          details: 'MACD histogram change'
        },
        volume: {
          signal: 'NEUTRAL' as any,
          weight: 0.25,
          confidence: 0.8,
          details: 'Volume supports movement'
        },
        support_resistance: {
          nearSupport: false,
          nearResistance: false,
          details: 'Support/resistance analysis'
        }
      },
      sentimentContributions: {
        newsImpact: {
          signal: ['BULLISH', 'BEARISH', 'NEUTRAL'][Math.floor(Math.random() * 3)] as any,
          weight: 0.3,
          confidence: 0.7,
          newsCount: Math.floor(Math.random() * 20) + 1,
          sentimentScore: (Math.random() - 0.5) * 2,
          details: 'Recent news sentiment analysis'
        },
        marketSentiment: {
          signal: ['BULLISH', 'BEARISH', 'NEUTRAL'][Math.floor(Math.random() * 3)] as any,
          weight: 0.4,
          confidence: 0.6,
          details: 'Overall market sentiment'
        }
      },
      riskAssessment: {
        overallRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        riskScore: Math.floor(Math.random() * 100),
        factors: {
          volatilityRisk: Math.random() * 100,
          liquidityRisk: Math.random() * 100,
          concentrationRisk: Math.random() * 100,
          marketRisk: Math.random() * 100,
          sentimentRisk: Math.random() * 100,
          technicalRisk: Math.random() * 100
        },
        warnings: ['Market volatility'],
        recommendations: ['Monitor closely']
      },
      marketContext: {
        condition: ['BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE', 'UNCERTAIN'][Math.floor(Math.random() * 5)] as any,
        trend: ['UP', 'DOWN', 'SIDEWAYS'][Math.floor(Math.random() * 3)] as any,
        volatility: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        volume: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as any,
        sector: 'Technology',
        marketCap: ['SMALL', 'MID', 'LARGE', 'MEGA'][Math.floor(Math.random() * 4)] as any,
        correlation: {
          market: Math.random(),
          sector: Math.random(),
          peers: Math.random()
        }
      },
      confidenceFactors: {
        technicalConfidence: 0.7,
        sentimentConfidence: 0.6,
        patternMatchConfidence: 0.65,
        marketConditionConfidence: 0.7,
        volumeConfidence: 0.8,
        historicalAccuracy: 0.75
      },
      timeHorizon: 'SHORT_TERM',
      keyFactors: [`Real-time signal for ${ticker}`]
    };

    // Store signal
    await mockTradingStorage.insert('trading_signals', signal);

    // Broadcast to clients
    this.emitNewSignal(signal);
  }

  /**
   * Generate random alert
   */
  private async generateRandomAlert(): Promise<void> {
    const ticker = this.tickers[Math.floor(Math.random() * this.tickers.length)];
    const alertTypes: AlertType[] = ['PRICE_MOVEMENT', 'VOLUME_SPIKE', 'TECHNICAL_BREAKOUT', 'NEWS_EVENT'];
    const severities: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
    
    const alert: TradingAlert = {
      id: `stream-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticker,
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: `Real-time alert: ${ticker} showing unusual activity`,
      timestamp: new Date(),
      confidence: 0.7 + Math.random() * 0.3,
      currentPrice: this.priceCache.get(ticker)?.price || 100,
      volume: Math.floor(Math.random() * 1000000),
      trigger: {
        condition: 'Price movement detected',
        threshold: 5.0,
        actualValue: 7.2
      },
      source: 'real_time_stream',
      category: 'market_movement',
      tags: ['real-time', 'automated'],
      status: 'ACTIVE',
      deliveryMethods: ['CONSOLE'],
      deliveryStatus: {
        CONSOLE: { sent: true, timestamp: new Date() }
      },
      suggestedActions: ['Monitor position', 'Review strategy'],
      followUpRequired: true
    };

    // Store alert
    await mockTradingStorage.insert('trading_alerts', alert);

    // Broadcast to clients
    this.emitNewAlert(alert);
  }

  /**
   * Emit new trading signal to subscribed clients
   */
  async emitNewSignal(signal: TradingSignal): Promise<void> {
    console.log(`📊 Broadcasting new signal: ${signal.ticker} ${signal.action}`);
    this.broadcast('new_signal', signal, 'signals');
    this.broadcast('new_signal', signal, `ticker:${signal.ticker}`);
  }

  /**
   * Emit new alert to subscribed clients
   */
  async emitNewAlert(alert: TradingAlert): Promise<void> {
    console.log(`🚨 Broadcasting new alert: ${alert.ticker} ${alert.type}`);
    this.broadcast('new_alert', alert, 'alerts');
    this.broadcast('new_alert', alert, `ticker:${alert.ticker}`);
  }

  /**
   * Send market update
   */
  private sendMarketUpdate(): void {
    const marketUpdate = this.generateMockMarketUpdate();
    this.broadcast('market_update', marketUpdate, 'market_updates');
  }

  /**
   * Generate mock market update
   */
  private generateMockMarketUpdate(): MarketUpdate {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine market status based on time (simplified)
    let marketStatus: MarketUpdate['marketStatus'] = 'CLOSED';
    if (hour >= 9 && hour < 16) {
      marketStatus = 'OPEN';
    } else if (hour >= 4 && hour < 9) {
      marketStatus = 'PRE_MARKET';
    } else if (hour >= 16 && hour < 20) {
      marketStatus = 'AFTER_HOURS';
    }

    return {
      marketStatus,
      indices: [
        {
          name: 'S&P 500',
          value: 4200 + (Math.random() - 0.5) * 100,
          change: (Math.random() - 0.5) * 50,
          changePercent: (Math.random() - 0.5) * 2
        },
        {
          name: 'NASDAQ',
          value: 13000 + (Math.random() - 0.5) * 500,
          change: (Math.random() - 0.5) * 100,
          changePercent: (Math.random() - 0.5) * 3
        },
        {
          name: 'DOW',
          value: 34000 + (Math.random() - 0.5) * 1000,
          change: (Math.random() - 0.5) * 200,
          changePercent: (Math.random() - 0.5) * 1.5
        }
      ],
      timestamp: now,
      volume: Math.floor(Math.random() * 1000000000), // 0-1B volume
      volatility: Math.random() * 30 // 0-30 VIX
    };
  }

  /**
   * Send heartbeat to maintain connections
   */
  private sendHeartbeat(): void {
    this.broadcast('system_status', {
      status: 'healthy',
      connectedClients: this.clients.size,
      uptime: process.uptime(),
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message to all subscribed clients
   */
  broadcast(type: StreamMessage['type'], data: any, channel?: string): void {
    const message: StreamMessage = {
      type,
      data,
      timestamp: new Date(),
      source: 'mock_stream'
    };

    let targetClients = Array.from(this.clients.values());

    // Filter by channel subscription if specified
    if (channel) {
      targetClients = targetClients.filter(client => 
        client.subscriptions.has(channel) || client.subscriptions.has('*')
      );
    }

    const messageStr = JSON.stringify(message);

    for (const client of targetClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error(`Error sending message to client ${client.id}:`, error);
          this.removeClient(client.id);
        }
      }
    }

    if (targetClients.length > 0) {
      console.log(`📡 Broadcasted ${type} to ${targetClients.length} clients${channel ? ` (channel: ${channel})` : ''}`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Initialize price cache with starting values
   */
  private initializePriceCache(): void {
    for (const ticker of this.tickers) {
      const startingPrice = 100 + Math.random() * 400; // $100-$500
      this.priceCache.set(ticker, {
        ticker,
        price: Math.round(startingPrice * 100) / 100,
        change: 0,
        changePercent: 0,
        volume: Math.floor(Math.random() * 5000000),
        timestamp: new Date(),
        bid: Math.round((startingPrice - 0.01) * 100) / 100,
        ask: Math.round((startingPrice + 0.01) * 100) / 100,
        high24h: Math.round((startingPrice * 1.03) * 100) / 100,
        low24h: Math.round((startingPrice * 0.97) * 100) / 100
      });
    }
  }

  /**
   * Get current stream statistics
   */
  getStreamStats(): {
    isRunning: boolean;
    connectedClients: number;
    totalSubscriptions: number;
    activeIntervals: number;
    uptime: number;
    priceCache: number;
  } {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      totalSubscriptions,
      activeIntervals: this.updateIntervals.size,
      uptime: process.uptime(),
      priceCache: this.priceCache.size
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
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      connectedAt: client.metadata.connectedAt,
      lastPing: client.lastPing
    }));
  }

  /**
   * Force trigger a signal for testing
   */
  async triggerTestSignal(ticker: string, action: SignalAction): Promise<void> {
    const signal: TradingSignal = {
      id: `test-signal-${Date.now()}`,
      ticker: ticker.toUpperCase(),
      timestamp: new Date(),
      action,
      strength: 'STRONG',
      confidence: 0.9,
      currentPrice: this.priceCache.get(ticker.toUpperCase())?.price || 100,
      reasoning: `Test signal triggered manually for ${ticker}`,
      technicalContributions: {
        movingAverages: { signal: 'NEUTRAL', weight: 0.3, confidence: 0.9, details: 'Test signal' },
        rsi: { value: 50, signal: 'NEUTRAL', weight: 0.2, confidence: 0.9, details: 'Test signal' },
        macd: { signal: 'NEUTRAL', weight: 0.25, confidence: 0.9, details: 'Test signal' },
        volume: { signal: 'NEUTRAL', weight: 0.25, confidence: 0.9, details: 'Test signal' },
        support_resistance: { nearSupport: false, nearResistance: false, details: 'Test signal' }
      },
      sentimentContributions: {
        newsImpact: { signal: 'NEUTRAL', weight: 0.4, confidence: 0.9, newsCount: 1, sentimentScore: 0.5, details: 'Test signal' },
        marketSentiment: { signal: 'NEUTRAL', weight: 0.6, confidence: 0.9, details: 'Test signal' }
      },
      riskAssessment: {
        overallRisk: 'LOW',
        riskScore: 20,
        factors: {
          volatilityRisk: 10,
          liquidityRisk: 15,
          concentrationRisk: 20,
          marketRisk: 25,
          sentimentRisk: 15,
          technicalRisk: 20
        },
        warnings: [],
        recommendations: ['Test signal']
      },
      marketContext: {
        condition: 'BULLISH',
        trend: 'UP',
        volatility: 'LOW',
        volume: 'HIGH',
        sector: 'Technology',
        marketCap: 'LARGE',
        correlation: { market: 0.8, sector: 0.9, peers: 0.7 }
      },
      confidenceFactors: {
        technicalConfidence: 0.9,
        sentimentConfidence: 0.9,
        patternMatchConfidence: 0.9,
        marketConditionConfidence: 0.9,
        volumeConfidence: 0.9,
        historicalAccuracy: 0.9
      },
      timeHorizon: 'SHORT_TERM',
      keyFactors: ['Manual test trigger'],
      source: 'test_trigger' as any,
      patternMatches: [],
      priceTargets: {
        timeHorizon: 'SHORT_TERM',
        targets: { conservative: 105, moderate: 110, aggressive: 115 },
        probability: { upside: 0.6, downside: 0.4 },
        keyLevels: { support: [95, 90], resistance: [110, 115] }
      },
      warnings: [],
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastUpdated: new Date()
    };

    await mockTradingStorage.insert('trading_signals', signal);
    await this.emitNewSignal(signal);
  }
}

export default MockTradingStream;