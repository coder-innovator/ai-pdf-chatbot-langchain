import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Mock trading responses for different types of questions
const getMockResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('trading') || lowerMessage.includes('trade')) {
    return `Based on current market analysis, here are some trading insights:

📊 **Market Overview:**
- SPY showing bullish momentum with strong volume
- Tech sector leading with AAPL, MSFT showing positive signals
- VIX remains at moderate levels indicating manageable volatility

🎯 **Trading Recommendations:**
- **Long positions:** Consider tech stocks with strong fundamentals
- **Risk management:** Use stop-losses at 5-8% below entry
- **Position sizing:** Risk no more than 2% per trade

⚠️ **Risk Warning:** All trading involves risk. This is educational content only and not financial advice.`;
  }
  
  if (lowerMessage.includes('market') || lowerMessage.includes('stock')) {
    return `📈 **Current Market Sentiment Analysis:**

**Overall Market:** Cautiously optimistic
- S&P 500: Trending upward with moderate volume
- NASDAQ: Tech rally continues with AI/ML stocks leading
- Russell 2000: Small caps showing mixed signals

**Key Levels to Watch:**
- SPY: Support at $480, Resistance at $495
- QQQ: Support at $420, Resistance at $435

**Economic Indicators:**
- Fed policy remains accommodative
- Inflation trending downward
- Employment data showing stability

*Last updated: Real-time market data*`;
  }
  
  if (lowerMessage.includes('analysis') || lowerMessage.includes('technical')) {
    return `🔍 **Technical Analysis Summary:**

**Trend Analysis:**
- Primary trend: Bullish across major indices
- Moving averages: 20-day above 50-day (golden cross pattern)
- RSI: Currently at 58 (neutral territory)

**Volume Analysis:**
- Above-average volume on recent green days
- Institutional buying detected in large-cap stocks

**Chart Patterns:**
- SPY forming ascending triangle pattern
- Breakout likely above $495 resistance

**Indicators:**
- MACD: Bullish crossover confirmed
- Bollinger Bands: Price testing upper band
- Support levels holding strong

*Analysis based on multiple timeframes and technical indicators*`;
  }
  
  if (lowerMessage.includes('recommendation') || lowerMessage.includes('advice')) {
    return `💡 **Trading Recommendations & Strategy:**

**Today's Focus:**
1. **AAPL** - Strong momentum, target $195
2. **MSFT** - Cloud growth story intact, target $420
3. **NVDA** - AI theme continues, watch $750 level

**Strategy Guidelines:**
- Enter positions on pullbacks to support levels
- Use trailing stops to protect profits
- Diversify across sectors to manage risk

**Risk Management:**
- Position size: 2-3% of portfolio per trade
- Stop loss: 6-8% below entry point
- Take profits: Scale out at 15-20% gains

**Market Timing:**
- Best entry: First hour and last hour of trading
- Avoid: Low volume lunch hours (12-2 PM EST)

⚠️ **Disclaimer:** This is educational content. Always do your own research and consider your risk tolerance.`;
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('target')) {
    return `🎯 **Price Targets & Analysis:**

**Key Price Levels:**
- **SPY:** Current $487, Target $495-500
- **QQQ:** Current $425, Target $435-440  
- **IWM:** Current $205, Target $210-215

**Individual Stocks:**
- **AAPL:** $190 → Target $195-200
- **MSFT:** $415 → Target $420-425
- **GOOGL:** $145 → Target $150-155
- **TSLA:** $240 → Target $250-260

**Timeframe:** 2-4 weeks
**Probability:** 70-75% based on technical analysis

**Key Catalysts:**
- Earnings season approaching
- Fed meeting outcomes
- Economic data releases

*Targets based on technical analysis and market momentum*`;
  }
  
  // Default response for general questions
  return `👋 **AI Trading Assistant Ready!**

I can help you with:
- 📊 Market analysis and insights
- 🎯 Trading recommendations 
- 📈 Technical analysis
- 💡 Investment strategies
- ⚠️ Risk management

**Popular Commands:**
- "What's the market sentiment?"
- "Give me trading recommendations"
- "Analyze AAPL stock"
- "What are your price targets?"

**Features:**
✅ Real-time market data analysis
✅ Technical indicator insights  
✅ Risk management guidance
✅ Educational trading content

*How can I assist with your trading questions today?*`;
};

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return new NextResponse(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Generate mock response
    const response = getMockResponse(message);
    
    // Simulate streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the response in chunks to simulate streaming
        const words = response.split(' ');
        let currentIndex = 0;
        
        const sendChunk = () => {
          if (currentIndex < words.length) {
            const chunk = words.slice(0, currentIndex + 1).join(' ');
            const sseData = {
              event: 'messages/partial',
              data: [{
                type: 'ai',
                content: chunk
              }]
            };
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`)
            );
            
            currentIndex++;
            setTimeout(sendChunk, 50); // 50ms delay between words
          } else {
            // Send final complete message
            const finalData = {
              event: 'messages/complete',
              data: [{
                type: 'ai',
                content: response
              }]
            };
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`)
            );
            controller.close();
          }
        };
        
        sendChunk();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Simple chat error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}