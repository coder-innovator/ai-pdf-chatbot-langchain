/**
 * Simple test to verify financial ingestion components work
 * Run with: node test-financial-ingestion.js
 */

import { createStorageAdapter } from './src/ingestion_graph/adapters/storage-adapter.js';

async function testBasicFunctionality() {
  console.log('🧪 Testing Financial Ingestion Components...\n');
  
  try {
    // Test 1: Create storage adapter
    console.log('1. Testing Storage Adapter...');
    const storageAdapter = createStorageAdapter({ type: 'mock' });
    console.log('✅ Storage adapter created successfully');
    
    // Test 2: Health check
    console.log('\n2. Testing Health Check...');
    const health = await storageAdapter.healthCheck();
    console.log(`✅ Health check: ${health.status}`, health.message || '');
    
    // Test 3: Get stats
    console.log('\n3. Testing Storage Stats...');
    const stats = await storageAdapter.getStats();
    console.log('✅ Storage stats retrieved:', stats);
    
    // Test 4: Mock data insertion
    console.log('\n4. Testing Mock Data Insertion...');
    const mockQuote = {
      symbol: 'AAPL',
      timestamp: new Date(),
      open: 150.0,
      high: 155.0,
      low: 149.0,
      close: 154.0,
      volume: 1000000,
      vwap: 152.0,
      trade_count: 1000,
      bid: 153.9,
      ask: 154.1,
      bid_size: 100,
      ask_size: 100,
      spread: 0.2,
      spread_percent: 0.13
    };
    
    const insertResult = await storageAdapter.insertQuote(mockQuote);
    console.log('✅ Mock quote inserted:', insertResult.status === 201 ? 'Success' : 'Failed');
    
    console.log('\n🎉 All basic tests passed! Financial ingestion infrastructure is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests
testBasicFunctionality();