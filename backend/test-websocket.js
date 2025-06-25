/**
 * Test WebSocket Real-Time Trading Data
 */

import WebSocket from 'ws';

async function testWebSocket() {
  console.log('🔌 Testing WebSocket Trading Stream...\n');
  
  // Connect to your WebSocket server
  const ws = new WebSocket('ws://localhost:8080/ws/trading');
  
  ws.on('open', () => {
    console.log('✅ Connected to Trading WebSocket Server');
    console.log('📡 Server URL: ws://localhost:8080/ws/trading\n');
    
    // Subscribe to different channels
    const subscriptions = [
      { type: 'subscribe', channel: 'signals' },
      { type: 'subscribe', channel: 'alerts' },  
      { type: 'subscribe', channel: 'ticker:AAPL' },
      { type: 'subscribe', channel: 'ticker:TSLA' },
      { type: 'subscribe', channel: 'market_updates' }
    ];
    
    subscriptions.forEach(sub => {
      console.log(`📺 Subscribing to: ${sub.channel}`);
      ws.send(JSON.stringify(sub));
    });
    
    // Request current data
    setTimeout(() => {
      console.log('\n📊 Requesting current market data...');
      ws.send(JSON.stringify({
        type: 'request_data',
        request: 'current_prices',
        tickers: ['AAPL', 'TSLA', 'NVDA']
      }));
      
      ws.send(JSON.stringify({
        type: 'request_data', 
        request: 'latest_signals',
        ticker: 'AAPL',
        limit: 3
      }));
      
      ws.send(JSON.stringify({
        type: 'request_data',
        request: 'market_status'
      }));
    }, 1000);
    
    // Trigger a manual signal for testing
    setTimeout(() => {
      console.log('\n🎯 Triggering manual trading signal...');
      ws.send(JSON.stringify({
        type: 'trigger_signal',
        ticker: 'AAPL',
        action: 'BUY',
        confidence: 0.85,
        reasoning: 'WebSocket test signal for $100 doubling strategy'
      }));
    }, 3000);
    
    // Create a manual alert
    setTimeout(() => {
      console.log('\n🚨 Creating manual alert...');
      ws.send(JSON.stringify({
        type: 'create_alert',
        ticker: 'TSLA', 
        type: 'PRICE_MOVEMENT',
        severity: 'HIGH',
        message: 'TSLA showing strong breakout pattern - potential for quick gains'
      }));
    }, 5000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'welcome':
          console.log('🎉 Welcome message received');
          console.log('📋 Available channels:', message.data.availableChannels);
          break;
          
        case 'subscription_confirmed':
          console.log(`✅ Subscribed to: ${message.data.channel}`);
          break;
          
        case 'current_prices':
          console.log('\n💰 Current Prices:');
          message.data.prices.forEach(price => {
            const changeIcon = price.change >= 0 ? '📈' : '📉';
            console.log(`  ${changeIcon} ${price.ticker}: $${price.price.toFixed(2)} (${price.changePercent.toFixed(2)}%)`);
          });
          break;
          
        case 'latest_signals':
          console.log('\n📊 Latest Trading Signals:');
          if (message.data.signals && message.data.signals.length > 0) {
            message.data.signals.forEach(signal => {
              const actionIcon = signal.action.includes('BUY') ? '🟢' : signal.action.includes('SELL') ? '🔴' : '🟡';
              console.log(`  ${actionIcon} ${signal.ticker}: ${signal.action} (${(signal.confidence * 100).toFixed(1)}%)`);
              console.log(`     ${signal.reasoning}`);
            });
          }
          break;
          
        case 'market_status':
          console.log('\n🏛️ Market Status:');
          console.log(`  Status: ${message.data.status}`);
          console.log(`  Time: ${message.data.timestamp}`);
          break;
          
        case 'signal_triggered':
          console.log('\n🎯 Signal Successfully Triggered:');
          const signal = message.data.signal;
          console.log(`  📈 ${signal.ticker}: ${signal.action} signal generated`);
          console.log(`  🎯 Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
          console.log(`  📝 Reasoning: ${signal.reasoning}`);
          break;
          
        case 'alert_created':
          console.log('\n🚨 Alert Successfully Created:');
          const alert = message.data.alert;
          console.log(`  ⚡ ${alert.ticker}: ${alert.type} (${alert.severity})`);
          console.log(`  📋 Message: ${alert.message}`);
          break;
          
        case 'real_time_update':
          const update = message.data;
          if (update.type === 'signal_created') {
            console.log(`\n🔥 REAL-TIME: New ${update.record.ticker} signal: ${update.record.action}`);
          } else if (update.type === 'alert_created') {
            console.log(`\n⚡ REAL-TIME: New ${update.record.ticker} alert: ${update.record.type}`);
          } else if (update.type === 'price_changed') {
            console.log(`\n💹 REAL-TIME: ${update.record.ticker} price update`);
          }
          break;
          
        case 'error':
          console.log(`❌ Error: ${message.data.error}`);
          break;
          
        default:
          console.log(`📨 Received: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('\n🔌 WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
  
  // Keep connection alive for testing
  setTimeout(() => {
    console.log('\n⏰ Test completed - closing connection...');
    ws.close();
  }, 15000);
}

// Run the test
testWebSocket().catch(console.error);