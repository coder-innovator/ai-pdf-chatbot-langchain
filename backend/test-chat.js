/**
 * Test the AI Chatbot functionality directly
 */

import { TradingQAAgent } from './src/retrieval_graph/agents/trading-qa.js';
import { mockTradingStorage } from './src/api/trading/mock-data.js';

async function testChatbot() {
  console.log('🤖 Testing AI Chatbot functionality...\n');
  
  // Initialize the Q&A agent
  const qaAgent = new TradingQAAgent(mockTradingStorage);
  
  // Test questions about your $100 doubling strategy
  const questions = [
    "I have $100 and want to double it within a week. What strategy should I use?",
    "What is the current trading signal for AAPL?",
    "Should I buy or sell Tesla stock?",
    "What are the risks of investing in NVDA?",
    "Compare Apple and Microsoft stocks for me"
  ];
  
  for (const question of questions) {
    console.log(`❓ Question: "${question}"`);
    
    try {
      const answer = await qaAgent.answerQuestion(question, 'test-session');
      
      console.log(`🎯 Answer: ${answer.answer}`);
      console.log(`📊 Confidence: ${(answer.confidence * 100).toFixed(1)}%`);
      console.log(`🧠 Answer Type: ${answer.answerType}`);
      
      if (answer.relatedTickers && answer.relatedTickers.length > 0) {
        console.log(`📈 Related Tickers: ${answer.relatedTickers.join(', ')}`);
      }
      
      if (answer.suggestedActions && answer.suggestedActions.length > 0) {
        console.log(`✅ Suggested Actions: ${answer.suggestedActions.slice(0, 2).join(', ')}`);
      }
      
      console.log(`⏱️ Processing Time: ${answer.processingTime}ms`);
      console.log('─'.repeat(80));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log('─'.repeat(80));
    }
  }
  
  console.log('\n✅ Chatbot test completed!');
}

// Run the test
testChatbot().catch(console.error);