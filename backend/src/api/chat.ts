/**
 * Chat API with Real-Time Integration
 * Provides chat endpoints that integrate with WebSocket for real-time updates
 */

import { Router } from 'express';
import { TradingQAAgent } from '../retrieval_graph/agents/trading-qa.js';
import { mockTradingStorage } from './trading/mock-data.js';
import { mockRealTimeUpdater } from '../services/mock-real-time-updater.js';
import { TradingWebSocketServer } from '../websocket/index.js';
// import { rateLimitedYahooFinance } from '../services/market-data/rate-limited-yahoo-finance.js';
// import { rateLimiter } from '../services/rate-limiting/rate-limiter.js';

export const chatRouter = Router();

// Initialize Q&A agent
const qaAgent = new TradingQAAgent(mockTradingStorage as any);

// WebSocket server reference (will be set when server starts)
let wsServer: TradingWebSocketServer | null = null;

/**
 * Set WebSocket server reference for real-time updates
 */
export function setChatWebSocketServer(server: TradingWebSocketServer): void {
  wsServer = server;
  console.log('🔗 Chat API connected to WebSocket server');
}

/**
 * POST /api/chat/ask
 * Ask a trading question with real-time response
 */
chatRouter.post('/ask', async (req: any, res: any) => {
  try {
    const { 
      question, 
      sessionId, 
      userId,
      enableRealTimeUpdates = false 
    } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    console.log(`💬 Chat question: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`);

    const startTime = Date.now();

    // Get answer from Q&A agent
    const answer = await qaAgent.answerQuestion(question, sessionId, userId);

    const processingTime = Date.now() - startTime;

    // If real-time updates are enabled and we have a WebSocket server
    if (enableRealTimeUpdates && wsServer) {
      // Broadcast the Q&A interaction to subscribed clients
      wsServer.broadcast({
        type: 'chat_interaction',
        data: {
          question,
          answer: answer.answer,
          confidence: answer.confidence,
          processingTime,
          relatedTickers: answer.relatedTickers,
          sessionId,
          userId
        }
      }, 'chat');
    }

    // If the answer involves specific tickers, fetch real price data and generate signals
    if (answer.relatedTickers && answer.relatedTickers.length > 0) {
      for (const ticker of answer.relatedTickers.slice(0, 2)) { // Limit to 2 tickers
        try {
          // Generate new signal for mentioned ticker
          const signal = await mockRealTimeUpdater.generateSignal(ticker, {
            reasoning: `Generated based on chat question about ${ticker}`
          });

          // Broadcast signal update if WebSocket is available
          if (wsServer) {
            wsServer.broadcast({
              type: 'signal_from_chat',
              data: {
                signal,
                questionContext: question,
                sessionId
              }
            }, `ticker:${ticker}`);
          }

        } catch (error) {
          console.warn(`Failed to generate signal for ${ticker} from chat:`, error);
        }
      }
    }

    res.json({
      success: true,
      data: {
        question,
        answer,
        processingTime,
        sessionId,
        realTimeUpdatesEnabled: enableRealTimeUpdates,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing chat question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/stream
 * Start a streaming chat session with real-time updates
 */
chatRouter.post('/stream', async (req: any, res: any) => {
  try {
    const { sessionId, userId, question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required for streaming session'
      });
    }

    console.log(`📡 Starting streaming chat session: ${sessionId}`);

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({
      type: 'connection_established',
      sessionId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Process the question
    const answer = await qaAgent.answerQuestion(question, sessionId, userId);

    // Send the answer
    res.write(`data: ${JSON.stringify({
      type: 'answer',
      data: answer,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // If tickers are mentioned, start real-time monitoring
    if (answer.relatedTickers && answer.relatedTickers.length > 0) {
      res.write(`data: ${JSON.stringify({
        type: 'monitoring_started',
        data: {
          tickers: answer.relatedTickers,
          message: `Now monitoring real-time updates for: ${answer.relatedTickers.join(', ')}`
        },
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Set up real-time monitoring for mentioned tickers
      const monitoringInterval = setInterval(async () => {
        try {
          for (const ticker of answer.relatedTickers!) {
            // Check for new signals
            const latestSignals = await mockTradingStorage.getLatestSignals(ticker, 1);
            const latestSignal = latestSignals[0];

            if (latestSignal && isRecentSignal(latestSignal.timestamp)) {
              res.write(`data: ${JSON.stringify({
                type: 'new_signal',
                data: {
                  ticker,
                  signal: latestSignal,
                  context: 'Related to your question'
                },
                timestamp: new Date().toISOString()
              })}\n\n`);
            }

            // Check for new alerts
            const alerts = await mockTradingStorage.getAlertsByTicker(ticker);
            const recentAlert = alerts.find(alert => isRecentSignal(alert.timestamp));

            if (recentAlert) {
              res.write(`data: ${JSON.stringify({
                type: 'new_alert',
                data: {
                  ticker,
                  alert: recentAlert,
                  context: 'Related to your question'
                },
                timestamp: new Date().toISOString()
              })}\n\n`);
            }
          }
        } catch (error) {
          console.error('Error in streaming monitoring:', error);
        }
      }, 10000); // Check every 10 seconds

      // Clean up after 5 minutes
      setTimeout(() => {
        clearInterval(monitoringInterval);
        res.write(`data: ${JSON.stringify({
          type: 'monitoring_ended',
          data: {
            message: 'Real-time monitoring session ended',
            duration: '5 minutes'
          },
          timestamp: new Date().toISOString()
        })}\n\n`);
        res.end();
      }, 300000); // 5 minutes

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(monitoringInterval);
        console.log(`📡 Streaming session ended: ${sessionId}`);
      });
    } else {
      // No tickers to monitor, end the stream
      setTimeout(() => {
        res.write(`data: ${JSON.stringify({
          type: 'session_complete',
          data: {
            message: 'Chat session completed'
          },
          timestamp: new Date().toISOString()
        })}\n\n`);
        res.end();
      }, 1000);
    }

  } catch (error) {
    console.error('Error in streaming chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start streaming session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/sessions/:sessionId
 * Get chat session history
 */
chatRouter.get('/sessions/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    console.log(`📚 Fetching chat session: ${sessionId}`);

    // Get session from Q&A agent
    const session = qaAgent.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    res.json({
      success: true,
      data: {
        session,
        summary: {
          totalQuestions: session.questions.length,
          averageConfidence: session.questions.length > 0 
            ? session.questions.reduce((sum, q) => sum + q.confidence, 0) / session.questions.length 
            : 0,
          focusTickers: session.context.focusTickers,
          duration: Date.now() - session.startTime.getTime()
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/trigger-action
 * Trigger trading actions from chat (with real-time updates)
 */
chatRouter.post('/trigger-action', async (req: any, res: any) => {
  try {
    const { 
      action, 
      ticker, 
      sessionId, 
      reasoning = 'Triggered from chat interface' 
    } = req.body;

    if (!action || !ticker) {
      return res.status(400).json({
        success: false,
        error: 'Action and ticker are required'
      });
    }

    console.log(`🎯 Triggering ${action} for ${ticker} from chat`);

    let result: any = {};

    switch (action.toLowerCase()) {
      case 'generate_signal':
        const signal = await mockRealTimeUpdater.generateSignal(ticker, { reasoning });
        result = { signal };
        
        // Broadcast via WebSocket
        if (wsServer) {
          wsServer.broadcast({
            type: 'action_triggered',
            data: {
              action: 'signal_generated',
              ticker,
              signal,
              triggeredBy: 'chat',
              sessionId
            }
          }, `ticker:${ticker}`);
        }
        break;

      case 'create_alert':
        const alert = await mockRealTimeUpdater.createAlert(ticker, {
          type: 'SIGNAL_GENERATED',
          severity: 'MEDIUM',
          message: `Alert created from chat for ${ticker}: ${reasoning}`
        });
        result = { alert };
        
        // Broadcast via WebSocket
        if (wsServer) {
          wsServer.broadcast({
            type: 'action_triggered',
            data: {
              action: 'alert_created',
              ticker,
              alert,
              triggeredBy: 'chat',
              sessionId
            }
          }, `ticker:${ticker}`);
        }
        break;

      case 'detect_alerts':
        const detectedAlerts = await mockRealTimeUpdater.triggerAlertsForTicker(ticker);
        result = { alerts: detectedAlerts };
        
        // Broadcast via WebSocket
        if (wsServer) {
          wsServer.broadcast({
            type: 'action_triggered',
            data: {
              action: 'alerts_detected',
              ticker,
              alerts: detectedAlerts,
              triggeredBy: 'chat',
              sessionId
            }
          }, `ticker:${ticker}`);
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
          supportedActions: ['generate_signal', 'create_alert', 'detect_alerts']
        });
    }

    res.json({
      success: true,
      data: {
        action,
        ticker,
        result,
        reasoning,
        sessionId,
        triggeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error triggering chat action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger action',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/stats
 * Get chat system statistics
 */
chatRouter.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching chat system stats');

    const qaStats = qaAgent.getQAStats();
    const wsStats = wsServer ? wsServer.getStats() : null;
    const updaterStats = mockRealTimeUpdater.getStats();

    res.json({
      success: true,
      data: {
        qaSystem: qaStats,
        webSocket: wsStats,
        realTimeUpdater: updaterStats,
        integration: {
          wsServerConnected: wsServer !== null,
          realTimeEnabled: updaterStats.isRunning,
          totalSystemUptime: process.uptime()
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/broadcast
 * Broadcast a message to WebSocket clients (admin feature)
 */
chatRouter.post('/broadcast', async (req: any, res: any) => {
  try {
    const { message, channel, type = 'admin_message' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!wsServer) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket server not available'
      });
    }

    console.log(`📢 Broadcasting admin message to ${channel || 'all channels'}`);

    wsServer.broadcast({
      type,
      data: {
        message,
        source: 'admin',
        timestamp: new Date().toISOString()
      }
    }, channel);

    res.json({
      success: true,
      data: {
        message: 'Broadcast sent successfully',
        channel: channel || 'all',
        type,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * WebSocket integration endpoints
 */

/**
 * GET /api/chat/ws/status
 * Get WebSocket server status
 */
chatRouter.get('/ws/status', (req: any, res: any) => {
  try {
    if (!wsServer) {
      return res.json({
        success: true,
        data: {
          status: 'disconnected',
          message: 'WebSocket server not initialized'
        }
      });
    }

    const stats = wsServer.getStats();
    const clients = wsServer.getClientsInfo();

    res.json({
      success: true,
      data: {
        status: 'connected',
        stats,
        clients: clients.slice(0, 10), // Limit to 10 for privacy
        totalClients: clients.length
      }
    });

  } catch (error) {
    console.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/ws/test
 * Test WebSocket broadcast functionality
 */
chatRouter.post('/ws/test', (req: any, res: any) => {
  try {
    if (!wsServer) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket server not available'
      });
    }

    const testMessage = {
      type: 'test_broadcast',
      data: {
        message: 'This is a test broadcast from the chat API',
        timestamp: new Date().toISOString(),
        testId: `test-${Date.now()}`
      }
    };

    wsServer.broadcast(testMessage);

    res.json({
      success: true,
      data: {
        message: 'Test broadcast sent',
        testMessage,
        activeConnections: wsServer.getStats().activeConnections
      }
    });

  } catch (error) {
    console.error('Error testing WebSocket broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test WebSocket broadcast',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to check if a signal/alert is recent (within last 2 minutes)
 */
function isRecentSignal(timestamp: Date): boolean {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return timestamp > twoMinutesAgo;
}

/**
 * POST /api/chat/get-market-data
 * Demonstrate rate limiting by fetching market data for multiple tickers
 * (Temporarily disabled for production build)
 */
/* chatRouter.post('/get-market-data', async (req: any, res: any) => {
  try {
    const { 
      tickers = ['AAPL', 'MSFT', 'GOOGL'], 
      forceApiCall = false 
    } = req.body;

    console.log(`📊 Fetching market data for ${tickers.length} tickers with rate limiting...`);

    const startTime = Date.now();
    const results = [];

    // Check rate limit status before starting
    const initialStatus = rateLimiter.getUsageReport();
    
    for (const ticker of tickers.slice(0, 10)) { // Limit to 10 tickers max
      try {
        const priceData = await rateLimitedYahooFinance.getStockPrice(ticker);
        results.push({
          ticker,
          success: true,
          data: priceData,
          rateLimitInfo: priceData.rateLimitInfo
        });
        
        console.log(`✅ ${ticker}: $${priceData.price.toFixed(2)} (${priceData.source})`);
        
      } catch (error) {
        results.push({
          ticker,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.error(`❌ ${ticker}: Failed to fetch data`);
      }
    }

    const finalStatus = rateLimiter.getUsageReport();
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalTickers: tickers.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          processingTime,
          averageTimePerTicker: Math.round(processingTime / tickers.length)
        },
        rateLimiting: {
          initialStatus: initialStatus.map(s => ({
            provider: s.provider,
            usage: s.usage.count,
            remaining: s.usage.remainingCalls,
            resetTime: s.usage.resetTime
          })),
          finalStatus: finalStatus.map(s => ({
            provider: s.provider,
            usage: s.usage.count,
            remaining: s.usage.remainingCalls,
            resetTime: s.usage.resetTime
          }))
        },
        cacheStats: rateLimitedYahooFinance.getUsageStats(),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

}); */

export default chatRouter;