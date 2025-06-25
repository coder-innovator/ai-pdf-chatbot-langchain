// Simple test to validate the server works
import { createTradingSystemServer } from './src/server.js';

async function testServer() {
  try {
    console.log('🧪 Testing Trading System Server...');
    
    const config = {
      port: 3002,
      wsPort: 8081,
      enableSchedulers: false,    // Disable schedulers for testing
      enableJobQueue: false,      // Disable job queue for testing
      enableRealTimeUpdater: false, // Disable real-time updater for testing
      environment: 'test'
    };

    const server = await createTradingSystemServer(config);
    
    console.log('✅ Server started successfully!');
    console.log('📊 Testing basic endpoints...');
    
    // Test basic endpoint
    const response = await fetch('http://localhost:3002/');
    const data = await response.json();
    
    console.log('✅ Root endpoint working:', data.name);
    console.log('📊 Server Status:', data.status);
    console.log('🔗 Available endpoints:', Object.keys(data.endpoints).join(', '));
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3002/api/health');
    const healthData = await healthResponse.json();
    
    console.log('✅ Health endpoint working:', healthData.status);
    
    console.log('🎉 All basic tests passed!');
    
    // Stop the server
    await server.stop();
    console.log('✅ Server stopped gracefully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testServer();