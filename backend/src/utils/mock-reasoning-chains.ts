/**
 * Mock Reasoning Chains
 * Provides mock reasoning patterns and chains for trading decision explanations
 */

import { SignalAction, RiskLevel, TimeHorizon } from '../types/trading-signals.js';

/**
 * Reasoning step in a chain
 */
export interface ReasoningStep {
  step: number;
  category: 'TECHNICAL' | 'FUNDAMENTAL' | 'SENTIMENT' | 'RISK' | 'MARKET';
  condition: string;
  observation: string;
  conclusion: string;
  confidence: number;
  weight: number;
}

/**
 * Complete reasoning chain
 */
export interface ReasoningChain {
  id: string;
  name: string;
  description: string;
  action: SignalAction;
  steps: ReasoningStep[];
  overallLogic: string;
  successRate: number;
  applicableMarkets: string[];
  timeHorizon: TimeHorizon;
}

/**
 * Reasoning pattern template
 */
export interface ReasoningPattern {
  patternId: string;
  name: string;
  triggers: string[];
  logicFlow: string[];
  expectedOutcome: SignalAction;
  confidence: number;
  riskLevel: RiskLevel;
}

/**
 * Market scenario with reasoning
 */
export interface MarketScenario {
  scenarioId: string;
  name: string;
  description: string;
  marketConditions: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  reasoningChains: ReasoningChain[];
  historicalPerformance: {
    successRate: number;
    averageReturn: number;
    maxDrawdown: number;
  };
}

/**
 * Mock Reasoning Chains Provider
 */
export class MockReasoningChains {
  private reasoningChains: Map<string, ReasoningChain>;
  private reasoningPatterns: Map<string, ReasoningPattern>;
  private marketScenarios: Map<string, MarketScenario>;

  constructor() {
    this.reasoningChains = new Map();
    this.reasoningPatterns = new Map();
    this.marketScenarios = new Map();
    
    this.initializeMockData();
  }

  /**
   * Get reasoning chain by action and conditions
   */
  getReasoningChain(
    action: SignalAction, 
    marketConditions?: any,
    riskLevel?: RiskLevel
  ): ReasoningChain | null {
    const chains = Array.from(this.reasoningChains.values())
      .filter(chain => chain.action === action);

    if (chains.length === 0) return null;

    // Return most appropriate chain based on conditions
    return chains[0]; // For simplicity, return first match
  }

  /**
   * Get reasoning pattern by triggers
   */
  getReasoningPattern(triggers: string[]): ReasoningPattern | null {
    for (const pattern of this.reasoningPatterns.values()) {
      const matchCount = triggers.filter(trigger => 
        pattern.triggers.some(t => t.toLowerCase().includes(trigger.toLowerCase()))
      ).length;
      
      if (matchCount > 0) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Get market scenario reasoning
   */
  getMarketScenarioReasoning(conditions: any): MarketScenario | null {
    for (const scenario of this.marketScenarios.values()) {
      if (this.matchesMarketConditions(scenario.marketConditions, conditions)) {
        return scenario;
      }
    }
    return null;
  }

  /**
   * Generate reasoning chain for specific signal
   */
  generateReasoningForSignal(
    action: SignalAction,
    technicalFactors: string[],
    sentimentFactors: string[],
    riskFactors: string[]
  ): ReasoningChain {
    const chain = this.getReasoningChain(action) || this.createDefaultChain(action);
    
    // Customize chain based on factors
    const customizedSteps = this.customizeSteps(
      chain.steps, 
      technicalFactors, 
      sentimentFactors, 
      riskFactors
    );

    return {
      ...chain,
      steps: customizedSteps,
      id: `custom-${Date.now()}`
    };
  }

  /**
   * Get all available patterns
   */
  getAllPatterns(): ReasoningPattern[] {
    return Array.from(this.reasoningPatterns.values());
  }

  /**
   * Get chains by success rate
   */
  getChainsBySuccessRate(minSuccessRate: number = 0.6): ReasoningChain[] {
    return Array.from(this.reasoningChains.values())
      .filter(chain => chain.successRate >= minSuccessRate)
      .sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Initialize mock reasoning data
   */
  private initializeMockData(): void {
    this.initializeBuyChains();
    this.initializeSellChains();
    this.initializeHoldChains();
    this.initializePatterns();
    this.initializeScenarios();
  }

  /**
   * Initialize buy reasoning chains
   */
  private initializeBuyChains(): void {
    // Strong Buy Chain
    const strongBuyChain: ReasoningChain = {
      id: 'strong-buy-1',
      name: 'Technical Breakout with Volume',
      description: 'Strong buy signal based on technical breakout confirmed by volume',
      action: 'STRONG_BUY',
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'Price breaks above resistance',
          observation: 'Stock price breaks above key resistance level with momentum',
          conclusion: 'Bullish breakout confirmed',
          confidence: 0.85,
          weight: 0.3
        },
        {
          step: 2,
          category: 'TECHNICAL',
          condition: 'Volume confirms breakout',
          observation: 'Trading volume is 2x average during breakout',
          conclusion: 'Volume confirms price movement validity',
          confidence: 0.9,
          weight: 0.25
        },
        {
          step: 3,
          category: 'TECHNICAL',
          condition: 'RSI shows momentum',
          observation: 'RSI moves from oversold to neutral territory',
          conclusion: 'Momentum shift from bearish to bullish',
          confidence: 0.8,
          weight: 0.2
        },
        {
          step: 4,
          category: 'SENTIMENT',
          condition: 'News sentiment positive',
          observation: 'Recent news sentiment score above 0.6',
          conclusion: 'Market sentiment supports upward movement',
          confidence: 0.75,
          weight: 0.15
        },
        {
          step: 5,
          category: 'RISK',
          condition: 'Risk manageable',
          observation: 'Stop-loss can be placed close to breakout level',
          conclusion: 'Favorable risk-reward ratio',
          confidence: 0.8,
          weight: 0.1
        }
      ],
      overallLogic: 'Multiple technical confirmations with low risk profile support strong buy',
      successRate: 0.78,
      applicableMarkets: ['TRENDING', 'VOLATILE'],
      timeHorizon: 'SHORT_TERM'
    };

    // Regular Buy Chain
    const buyChain: ReasoningChain = {
      id: 'buy-1',
      name: 'Oversold Recovery',
      description: 'Buy signal based on oversold recovery with positive indicators',
      action: 'BUY',
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'RSI oversold recovery',
          observation: 'RSI bounces from below 30 to above 35',
          conclusion: 'Oversold condition recovering',
          confidence: 0.7,
          weight: 0.35
        },
        {
          step: 2,
          category: 'TECHNICAL',
          condition: 'Support level holds',
          observation: 'Price finds support at key technical level',
          conclusion: 'Downside limited by technical support',
          confidence: 0.75,
          weight: 0.25
        },
        {
          step: 3,
          category: 'SENTIMENT',
          condition: 'Sentiment stabilizing',
          observation: 'Negative sentiment showing signs of improvement',
          conclusion: 'Market psychology shifting positive',
          confidence: 0.65,
          weight: 0.2
        },
        {
          step: 4,
          category: 'FUNDAMENTAL',
          condition: 'Valuation attractive',
          observation: 'P/E ratio below sector average',
          conclusion: 'Stock appears undervalued',
          confidence: 0.7,
          weight: 0.2
        }
      ],
      overallLogic: 'Oversold recovery with technical support suggests buying opportunity',
      successRate: 0.68,
      applicableMarkets: ['CORRECTION', 'SIDEWAYS'],
      timeHorizon: 'MEDIUM_TERM'
    };

    this.reasoningChains.set(strongBuyChain.id, strongBuyChain);
    this.reasoningChains.set(buyChain.id, buyChain);
  }

  /**
   * Initialize sell reasoning chains
   */
  private initializeSellChains(): void {
    // Strong Sell Chain
    const strongSellChain: ReasoningChain = {
      id: 'strong-sell-1',
      name: 'Technical Breakdown with Negative Catalysts',
      description: 'Strong sell signal due to technical breakdown and negative events',
      action: 'STRONG_SELL',
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'Support level breakdown',
          observation: 'Price breaks below major support with high volume',
          conclusion: 'Bearish breakdown confirmed',
          confidence: 0.9,
          weight: 0.3
        },
        {
          step: 2,
          category: 'FUNDAMENTAL',
          condition: 'Negative earnings surprise',
          observation: 'Company misses earnings by significant margin',
          conclusion: 'Fundamental deterioration evident',
          confidence: 0.85,
          weight: 0.25
        },
        {
          step: 3,
          category: 'SENTIMENT',
          condition: 'Negative news flow',
          observation: 'Multiple negative news stories impact sentiment',
          conclusion: 'Market sentiment turning bearish',
          confidence: 0.8,
          weight: 0.2
        },
        {
          step: 4,
          category: 'TECHNICAL',
          condition: 'RSI shows weakness',
          observation: 'RSI falls below 40 with negative divergence',
          conclusion: 'Momentum clearly bearish',
          confidence: 0.75,
          weight: 0.15
        },
        {
          step: 5,
          category: 'RISK',
          condition: 'High downside risk',
          observation: 'Next support level significantly lower',
          conclusion: 'Limited downside protection',
          confidence: 0.8,
          weight: 0.1
        }
      ],
      overallLogic: 'Multiple bearish signals with fundamental weakness warrant strong sell',
      successRate: 0.72,
      applicableMarkets: ['DECLINING', 'VOLATILE'],
      timeHorizon: 'SHORT_TERM'
    };

    // Regular Sell Chain
    const sellChain: ReasoningChain = {
      id: 'sell-1',
      name: 'Overbought with Weakening Momentum',
      description: 'Sell signal based on overbought conditions and momentum loss',
      action: 'SELL',
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'RSI overbought',
          observation: 'RSI above 70 for extended period',
          conclusion: 'Stock appears overbought',
          confidence: 0.75,
          weight: 0.3
        },
        {
          step: 2,
          category: 'TECHNICAL',
          condition: 'Momentum divergence',
          observation: 'Price makes new highs but indicators show divergence',
          conclusion: 'Momentum weakening despite price strength',
          confidence: 0.7,
          weight: 0.25
        },
        {
          step: 3,
          category: 'MARKET',
          condition: 'Market topping signs',
          observation: 'Broader market showing signs of exhaustion',
          conclusion: 'Market environment less supportive',
          confidence: 0.65,
          weight: 0.2
        },
        {
          step: 4,
          category: 'RISK',
          condition: 'Risk-reward unfavorable',
          observation: 'Limited upside with significant downside risk',
          conclusion: 'Risk-reward ratio no longer attractive',
          confidence: 0.7,
          weight: 0.25
        }
      ],
      overallLogic: 'Overbought conditions with weakening momentum suggest taking profits',
      successRate: 0.65,
      applicableMarkets: ['TOPPING', 'VOLATILE'],
      timeHorizon: 'SHORT_TERM'
    };

    this.reasoningChains.set(strongSellChain.id, strongSellChain);
    this.reasoningChains.set(sellChain.id, sellChain);
  }

  /**
   * Initialize hold reasoning chains
   */
  private initializeHoldChains(): void {
    const holdChain: ReasoningChain = {
      id: 'hold-1',
      name: 'Consolidation with Mixed Signals',
      description: 'Hold recommendation due to mixed signals and consolidation',
      action: 'HOLD',
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'Range-bound trading',
          observation: 'Price trading between support and resistance',
          conclusion: 'No clear directional bias',
          confidence: 0.8,
          weight: 0.3
        },
        {
          step: 2,
          category: 'TECHNICAL',
          condition: 'Mixed indicators',
          observation: 'Some indicators bullish, others bearish',
          conclusion: 'Technical signals are conflicting',
          confidence: 0.7,
          weight: 0.25
        },
        {
          step: 3,
          category: 'SENTIMENT',
          condition: 'Neutral sentiment',
          observation: 'News sentiment neither clearly positive nor negative',
          conclusion: 'Market waiting for catalyst',
          confidence: 0.6,
          weight: 0.2
        },
        {
          step: 4,
          category: 'MARKET',
          condition: 'Market uncertainty',
          observation: 'Broader market showing mixed signals',
          conclusion: 'Wait for clearer market direction',
          confidence: 0.65,
          weight: 0.25
        }
      ],
      overallLogic: 'Mixed signals suggest waiting for clearer direction',
      successRate: 0.60,
      applicableMarkets: ['SIDEWAYS', 'UNCERTAIN'],
      timeHorizon: 'MEDIUM_TERM'
    };

    this.reasoningChains.set(holdChain.id, holdChain);
  }

  /**
   * Initialize reasoning patterns
   */
  private initializePatterns(): void {
    const patterns: ReasoningPattern[] = [
      {
        patternId: 'momentum-breakout',
        name: 'Momentum Breakout Pattern',
        triggers: ['breakout', 'volume', 'momentum', 'resistance'],
        logicFlow: [
          'Price breaks above resistance',
          'Volume confirms breakout',
          'Momentum indicators align',
          'Risk-reward favorable'
        ],
        expectedOutcome: 'STRONG_BUY',
        confidence: 0.8,
        riskLevel: 'MEDIUM'
      },
      {
        patternId: 'oversold-bounce',
        name: 'Oversold Bounce Pattern',
        triggers: ['oversold', 'rsi', 'support', 'bounce'],
        logicFlow: [
          'RSI indicates oversold condition',
          'Price finds support at key level',
          'Bounce begins with volume',
          'Risk limited by support'
        ],
        expectedOutcome: 'BUY',
        confidence: 0.7,
        riskLevel: 'MEDIUM'
      },
      {
        patternId: 'distribution-top',
        name: 'Distribution Top Pattern',
        triggers: ['distribution', 'volume', 'overbought', 'divergence'],
        logicFlow: [
          'Price makes new highs on declining volume',
          'RSI shows bearish divergence',
          'Distribution pattern forms',
          'Momentum weakening'
        ],
        expectedOutcome: 'SELL',
        confidence: 0.75,
        riskLevel: 'HIGH'
      }
    ];

    patterns.forEach(pattern => {
      this.reasoningPatterns.set(pattern.patternId, pattern);
    });
  }

  /**
   * Initialize market scenarios
   */
  private initializeScenarios(): void {
    const bullMarket: MarketScenario = {
      scenarioId: 'bull-market',
      name: 'Bull Market Scenario',
      description: 'Strong uptrending market with positive sentiment',
      marketConditions: {
        volatility: 'MEDIUM',
        trend: 'BULLISH',
        volume: 'HIGH'
      },
      reasoningChains: [
        this.reasoningChains.get('strong-buy-1')!,
        this.reasoningChains.get('buy-1')!
      ],
      historicalPerformance: {
        successRate: 0.82,
        averageReturn: 0.15,
        maxDrawdown: -0.08
      }
    };

    const bearMarket: MarketScenario = {
      scenarioId: 'bear-market',
      name: 'Bear Market Scenario',
      description: 'Declining market with negative sentiment',
      marketConditions: {
        volatility: 'HIGH',
        trend: 'BEARISH',
        volume: 'MEDIUM'
      },
      reasoningChains: [
        this.reasoningChains.get('strong-sell-1')!,
        this.reasoningChains.get('sell-1')!
      ],
      historicalPerformance: {
        successRate: 0.75,
        averageReturn: -0.12,
        maxDrawdown: -0.25
      }
    };

    this.marketScenarios.set(bullMarket.scenarioId, bullMarket);
    this.marketScenarios.set(bearMarket.scenarioId, bearMarket);
  }

  /**
   * Check if market conditions match scenario
   */
  private matchesMarketConditions(scenarioConditions: any, currentConditions: any): boolean {
    if (!currentConditions) return false;
    
    return (
      (!scenarioConditions.volatility || scenarioConditions.volatility === currentConditions.volatility) &&
      (!scenarioConditions.trend || scenarioConditions.trend === currentConditions.trend) &&
      (!scenarioConditions.volume || scenarioConditions.volume === currentConditions.volume)
    );
  }

  /**
   * Customize reasoning steps based on factors
   */
  private customizeSteps(
    baseSteps: ReasoningStep[],
    technicalFactors: string[],
    sentimentFactors: string[],
    riskFactors: string[]
  ): ReasoningStep[] {
    return baseSteps.map(step => {
      let customizedStep = { ...step };
      
      // Adjust confidence based on relevant factors
      if (step.category === 'TECHNICAL' && technicalFactors.length > 0) {
        customizedStep.confidence = Math.min(0.95, step.confidence + 0.1);
      }
      
      if (step.category === 'SENTIMENT' && sentimentFactors.length > 0) {
        customizedStep.confidence = Math.min(0.95, step.confidence + 0.05);
      }
      
      if (step.category === 'RISK' && riskFactors.length > 0) {
        customizedStep.confidence = Math.max(0.1, step.confidence - 0.1);
      }
      
      return customizedStep;
    });
  }

  /**
   * Create default reasoning chain for action
   */
  private createDefaultChain(action: SignalAction): ReasoningChain {
    return {
      id: `default-${action.toLowerCase()}`,
      name: `Default ${action} Chain`,
      description: `Default reasoning chain for ${action} action`,
      action,
      steps: [
        {
          step: 1,
          category: 'TECHNICAL',
          condition: 'Technical analysis',
          observation: `Technical indicators suggest ${action}`,
          conclusion: `Technical analysis supports ${action}`,
          confidence: 0.6,
          weight: 0.5
        },
        {
          step: 2,
          category: 'RISK',
          condition: 'Risk assessment',
          observation: 'Risk factors considered',
          conclusion: 'Risk level acceptable for recommendation',
          confidence: 0.6,
          weight: 0.5
        }
      ],
      overallLogic: `Standard reasoning for ${action} recommendation`,
      successRate: 0.6,
      applicableMarkets: ['ALL'],
      timeHorizon: 'MEDIUM_TERM'
    };
  }
}

/**
 * Reasoning chain utilities
 */
export const ReasoningChainUtils = {
  /**
   * Calculate weighted confidence from steps
   */
  calculateWeightedConfidence: (steps: ReasoningStep[]): number => {
    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
    const weightedSum = steps.reduce((sum, step) => sum + (step.confidence * step.weight), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  },

  /**
   * Get strongest reasoning factors
   */
  getStrongestFactors: (steps: ReasoningStep[], limit: number = 3): ReasoningStep[] => {
    return [...steps]
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, limit);
  },

  /**
   * Format reasoning chain for display
   */
  formatChain: (chain: ReasoningChain): string => {
    let formatted = `${chain.name} (${(chain.successRate * 100).toFixed(1)}% success rate)\n`;
    formatted += `${chain.description}\n\n`;
    
    chain.steps.forEach((step, index) => {
      formatted += `${index + 1}. ${step.condition}\n`;
      formatted += `   → ${step.observation}\n`;
      formatted += `   → ${step.conclusion}\n`;
      formatted += `   Confidence: ${(step.confidence * 100).toFixed(1)}%\n\n`;
    });
    
    formatted += `Overall Logic: ${chain.overallLogic}`;
    return formatted;
  },

  /**
   * Get reasoning by category
   */
  getReasoningByCategory: (steps: ReasoningStep[], category: ReasoningStep['category']): ReasoningStep[] => {
    return steps.filter(step => step.category === category);
  },

  /**
   * Validate reasoning chain consistency
   */
  validateChain: (chain: ReasoningChain): {
    isValid: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];
    
    if (chain.steps.length === 0) {
      issues.push('Chain has no reasoning steps');
    }
    
    const totalWeight = chain.steps.reduce((sum, step) => sum + step.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      issues.push(`Step weights don't sum to 1.0 (current: ${totalWeight.toFixed(2)})`);
    }
    
    if (chain.successRate < 0 || chain.successRate > 1) {
      issues.push('Success rate must be between 0 and 1');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

/**
 * Factory function to create mock reasoning chains
 */
export function createMockReasoningChains(): MockReasoningChains {
  return new MockReasoningChains();
}

/**
 * Common reasoning templates
 */
export const CommonReasoningTemplates = {
  technicalBreakout: {
    name: 'Technical Breakout',
    steps: ['Price breaks resistance', 'Volume confirms', 'Momentum aligns'],
    confidence: 0.8
  },
  
  fundamentalValue: {
    name: 'Fundamental Value',
    steps: ['Valuation attractive', 'Earnings growing', 'Balance sheet strong'],
    confidence: 0.75
  },
  
  sentimentReversal: {
    name: 'Sentiment Reversal',
    steps: ['Negative sentiment extreme', 'Positive catalysts emerge', 'Sentiment shifts'],
    confidence: 0.7
  },
  
  riskManagement: {
    name: 'Risk Management',
    steps: ['Identify risk factors', 'Assess impact', 'Implement mitigation'],
    confidence: 0.85
  }
};

export default MockReasoningChains;