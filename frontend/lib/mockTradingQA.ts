/**
 * Mock Trading Q&A Service
 * Simulates AI trading advice responses
 */

import { TradingAnswer, TradingRecommendation } from '@/types/trading';

interface MockTradingQAOptions {
  apiUrl?: string;
  timeout?: number;
}

class MockTradingQAService {
  private apiUrl: string;
  private timeout: number;

  constructor(options: MockTradingQAOptions = {}) {
    this.apiUrl = options.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = options.timeout || 5000;
  }

  /**
   * Answer a trading-related question with AI-generated insights
   */
  async answerQuestion(message: string, sessionId?: string): Promise<TradingAnswer> {
    const startTime = Date.now();

    try {
      // Try to use real backend first
      const response = await this.tryBackendAPI(message, sessionId);
      if (response) {
        return response;
      }
    } catch (error) {
      console.log('Backend unavailable, using mock responses');
    }

    // Generate mock response based on message content
    return this.generateMockResponse(message, startTime);
  }

  /**
   * Try to get response from real backend
   */
  private async tryBackendAPI(message: string, sessionId?: string): Promise<TradingAnswer | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiUrl}/api/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: sessionId || 'mock-session'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return this.transformBackendResponse(data);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform backend response to TradingAnswer format
   */
  private transformBackendResponse(data: any): TradingAnswer {
    return {
      answer: data.answer || data.message || 'No response available',
      confidence: data.confidence || 0.8,
      answerType: this.determineAnswerType(data.answer || ''),
      recommendation: data.recommendation,
      relatedTickers: data.relatedTickers || [],
      suggestedActions: data.suggestedActions || [],
      processingTime: data.processingTime || 1000,
      sources: data.sources || ['AI Analysis']
    };
  }

  /**
   * Generate mock response for demonstration
   */
  private generateMockResponse(message: string, startTime: number): TradingAnswer {
    const lowerMessage = message.toLowerCase();
    let answerType: TradingAnswer['answerType'] = 'MARKET_INSIGHT';
    let answer = '';
    let recommendation: TradingRecommendation | undefined;
    let relatedTickers: string[] = [];
    let suggestedActions: string[] = [];

    // Analyze message content and generate appropriate response
    if (lowerMessage.includes('$100') && lowerMessage.includes('double')) {
      answerType = 'STRATEGY';
      answer = `To potentially double $100 in a week, you'd need extremely high-risk, high-reward strategies. Here are some options:

**Day Trading Approach:**
- Focus on volatile stocks like TSLA, NVDA, or AAPL
- Use technical analysis for entry/exit points
- Risk: 50-70% of capital per trade

**Options Strategy:**
- Buy call options on trending stocks
- Target strikes 5-10% out of the money
- Expiration within 1-2 weeks

**Penny Stock Momentum:**
- Look for stocks under $5 with high volume
- Monitor for breakout patterns
- Set strict stop losses at 15-20%

⚠️ **Important**: These strategies carry extreme risk. You could lose your entire $100. Consider paper trading first.`;

      recommendation = {
        action: 'BUY',
        confidence: 0.65,
        reasoning: 'High-risk momentum strategy with potential for quick gains',
        riskLevel: 'HIGH',
        priceTarget: 200, // Doubling target
        stopLoss: 80,
        timeHorizon: 'SHORT_TERM',
        allocation: 25 // Risk only 25% per position
      };

      relatedTickers = ['TSLA', 'NVDA', 'AAPL', 'AMD'];
      suggestedActions = [
        'Start with paper trading',
        'Learn technical analysis',
        'Set strict stop losses',
        'Monitor market volatility'
      ];
    }

    else if (lowerMessage.includes('aapl') || lowerMessage.includes('apple')) {
      answerType = 'ANALYSIS';
      answer = `**Apple (AAPL) Analysis:**

**Current Outlook: BULLISH**
- Strong fundamentals with services revenue growth
- iPhone 15 cycle showing solid demand
- AI integration opportunities with future iOS updates
- Services segment margin expansion

**Technical Analysis:**
- Trading above 50-day moving average
- RSI at 58 (neutral territory)
- Support level: $145, Resistance: $155

**Catalysts:**
- Q4 earnings report (positive guidance expected)
- Holiday season iPhone sales
- Vision Pro commercial launch
- AI service announcements

**Recommendation: BUY** with price target of $165`;

      recommendation = {
        action: 'BUY',
        confidence: 0.82,
        reasoning: 'Strong fundamentals, positive technical setup, and upcoming catalysts',
        riskLevel: 'MEDIUM',
        priceTarget: 165,
        stopLoss: 145,
        timeHorizon: 'MEDIUM_TERM',
        allocation: 15
      };

      relatedTickers = ['AAPL', 'MSFT', 'GOOGL'];
    }

    else if (lowerMessage.includes('tesla') || lowerMessage.includes('tsla')) {
      answerType = 'RISK_ASSESSMENT';
      answer = `**Tesla (TSLA) Risk Assessment:**

**High Risk Factors:**
- Extreme volatility (30-40% monthly swings)
- Elon Musk's social media influence
- Competition from traditional automakers
- Regulatory challenges in autonomous driving

**Medium Risk Factors:**
- Delivery target dependencies
- Supply chain disruptions
- Interest rate sensitivity
- Valuation premium vs traditional auto

**Mitigating Factors:**
- Market leader in EVs
- Supercharger network advantage
- Energy storage growth
- AI/robotics potential

**Risk Level: HIGH** - Only suitable for risk-tolerant investors`;

      recommendation = {
        action: 'WATCH',
        confidence: 0.58,
        reasoning: 'High volatility and uncertainty require careful timing',
        riskLevel: 'HIGH',
        timeHorizon: 'LONG_TERM'
      };

      relatedTickers = ['TSLA', 'RIVN', 'LCID', 'NIO'];
    }

    else if (lowerMessage.includes('diversif') || lowerMessage.includes('portfolio')) {
      answerType = 'STRATEGY';
      answer = `**Portfolio Diversification Strategy:**

**Core Holdings (60%):**
- S&P 500 ETF (SPY): 30%
- Technology (QQQ): 15%
- International (VTI): 15%

**Growth Sectors (25%):**
- Individual tech stocks: 10%
- Healthcare/Biotech: 8%
- Clean energy: 7%

**Defensive Assets (15%):**
- Bonds/Treasury ETFs: 10%
- Dividend stocks: 5%

This allocation balances growth potential with risk management across different sectors and asset classes.`;

      recommendation = {
        action: 'BUY',
        confidence: 0.88,
        reasoning: 'Balanced diversification reduces risk while maintaining growth potential',
        riskLevel: 'MEDIUM',
        timeHorizon: 'LONG_TERM',
        allocation: 100
      };

      relatedTickers = ['SPY', 'QQQ', 'VTI', 'IVV'];
    }

    else {
      // Default market insight response
      answer = `Based on current market conditions, here's my analysis:

**Market Sentiment:** Cautiously optimistic
**Key Trends:** AI technology adoption, interest rate stability concerns
**Recommended Sectors:** Technology, healthcare, renewable energy
**Risk Factors:** Geopolitical tensions, inflation concerns

**General Advice:**
- Maintain diversified portfolio
- Focus on quality companies with strong fundamentals
- Keep cash reserves for opportunities
- Consider dollar-cost averaging for volatile markets`;

      relatedTickers = ['SPY', 'QQQ', 'IWM'];
      suggestedActions = [
        'Review portfolio allocation',
        'Research individual stock fundamentals',
        'Monitor economic indicators',
        'Set price alerts for watchlist stocks'
      ];
    }

    const processingTime = Date.now() - startTime;

    return {
      answer,
      confidence: 0.85,
      answerType,
      recommendation,
      relatedTickers,
      suggestedActions,
      processingTime,
      sources: ['AI Market Analysis', 'Technical Indicators', 'Fundamental Data']
    };
  }

  /**
   * Determine answer type based on content
   */
  private determineAnswerType(answer: string): TradingAnswer['answerType'] {
    const lower = answer.toLowerCase();
    
    if (lower.includes('strategy') || lower.includes('approach') || lower.includes('plan')) {
      return 'STRATEGY';
    }
    if (lower.includes('analysis') || lower.includes('technical') || lower.includes('fundamental')) {
      return 'ANALYSIS';
    }
    if (lower.includes('risk') || lower.includes('danger') || lower.includes('caution')) {
      return 'RISK_ASSESSMENT';
    }
    if (lower.includes('learn') || lower.includes('explain') || lower.includes('difference')) {
      return 'EDUCATION';
    }
    
    return 'MARKET_INSIGHT';
  }
}

// Export singleton instance
export const mockTradingQA = new MockTradingQAService();
export default mockTradingQA;