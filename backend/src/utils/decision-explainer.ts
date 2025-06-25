/**
 * Decision Explainer Utilities
 * Provides utility functions for explaining trading decisions and reasoning
 */

import { TradingSignal, SignalAction, RiskLevel, TimeHorizon } from '../types/trading-signals.js';
import { TechnicalAnalysis } from '../agents/technical-analysis.js';
import { SentimentAnalysis } from './sentiment-calculator.js';

/**
 * Decision factor with weight and explanation
 */
export interface DecisionFactor {
  name: string;
  weight: number;
  value: number;
  explanation: string;
  confidence: number;
  category: 'TECHNICAL' | 'SENTIMENT' | 'FUNDAMENTAL' | 'RISK' | 'MARKET';
}

/**
 * Decision tree node for explaining logic flow
 */
export interface DecisionNode {
  condition: string;
  result: string;
  confidence: number;
  children?: DecisionNode[];
  factors: DecisionFactor[];
}

/**
 * Explanation template for different decision types
 */
export interface ExplanationTemplate {
  action: SignalAction;
  templates: {
    simple: string;
    detailed: string;
    technical: string;
  };
  keyPoints: string[];
  riskConsiderations: string[];
}

/**
 * Decision confidence breakdown
 */
export interface ConfidenceExplanation {
  overallConfidence: number;
  factorContributions: {
    factor: string;
    contribution: number;
    reasoning: string;
  }[];
  uncertaintyFactors: {
    factor: string;
    impact: number;
    explanation: string;
  }[];
  confidenceRange: {
    low: number;
    high: number;
  };
}

/**
 * Decision Explainer Class
 */
export class DecisionExplainer {
  private explanationTemplates: Map<SignalAction, ExplanationTemplate>;

  constructor() {
    this.explanationTemplates = new Map();
    this.initializeTemplates();
  }

  /**
   * Explain a trading decision comprehensively
   */
  explainDecision(
    signal: TradingSignal,
    technical?: TechnicalAnalysis,
    sentiment?: SentimentAnalysis
  ): {
    summary: string;
    reasoning: string[];
    decisionTree: DecisionNode;
    confidenceExplanation: ConfidenceExplanation;
    alternativeActions: { action: SignalAction; probability: number; reasoning: string }[];
  } {
    console.log(`🔍 Explaining ${signal.action} decision for ${signal.ticker}`);

    // Generate main explanation
    const summary = this.generateSummary(signal);
    const reasoning = this.generateReasoning(signal, technical, sentiment);
    
    // Build decision tree
    const decisionTree = this.buildDecisionTree(signal, technical, sentiment);
    
    // Explain confidence
    const confidenceExplanation = this.explainConfidence(signal);
    
    // Generate alternative actions
    const alternativeActions = this.generateAlternativeActions(signal);

    return {
      summary,
      reasoning,
      decisionTree,
      confidenceExplanation,
      alternativeActions
    };
  }

  /**
   * Generate simple summary explanation
   */
  generateSummary(signal: TradingSignal): string {
    const template = this.explanationTemplates.get(signal.action);
    if (!template) {
      return `${signal.action} recommendation for ${signal.ticker} with ${(signal.confidence * 100).toFixed(1)}% confidence.`;
    }

    let summary = template.templates.simple
      .replace('{ticker}', signal.ticker)
      .replace('{confidence}', (signal.confidence * 100).toFixed(1));

    // Add key reason if available
    if (signal.reasoning) {
      summary += ` ${signal.reasoning}`;
    }

    return summary;
  }

  /**
   * Generate detailed reasoning steps
   */
  generateReasoning(
    signal: TradingSignal,
    technical?: TechnicalAnalysis,
    sentiment?: SentimentAnalysis
  ): string[] {
    const reasoning: string[] = [];

    // Technical reasoning
    if (signal.technicalContributions) {
      const techReasoning = this.extractTechnicalReasoning(signal.technicalContributions);
      reasoning.push(...techReasoning);
    }

    // Sentiment reasoning
    if (signal.sentimentContributions) {
      const sentimentReasoning = this.extractSentimentReasoning(signal.sentimentContributions);
      reasoning.push(...sentimentReasoning);
    }

    // Risk reasoning
    if (signal.riskAssessment) {
      const riskReasoning = this.extractRiskReasoning(signal.riskAssessment);
      reasoning.push(...riskReasoning);
    }

    // Pattern matching reasoning
    if (signal.patternMatches && signal.patternMatches.length > 0) {
      const patternReasoning = this.extractPatternReasoning(signal.patternMatches);
      reasoning.push(...patternReasoning);
    }

    // Market context reasoning
    if (signal.marketContext) {
      const contextReasoning = this.extractMarketContextReasoning(signal.marketContext);
      reasoning.push(...contextReasoning);
    }

    return reasoning.slice(0, 8); // Limit to 8 main points
  }

  /**
   * Build decision tree showing logic flow
   */
  buildDecisionTree(
    signal: TradingSignal,
    technical?: TechnicalAnalysis,
    sentiment?: SentimentAnalysis
  ): DecisionNode {
    const factors = this.extractDecisionFactors(signal);
    
    const rootNode: DecisionNode = {
      condition: `Analyzing ${signal.ticker} for trading decision`,
      result: `Recommendation: ${signal.action}`,
      confidence: signal.confidence,
      factors,
      children: []
    };

    // Technical analysis branch
    if (signal.technicalContributions) {
      const techNode = this.buildTechnicalBranch(signal.technicalContributions);
      rootNode.children?.push(techNode);
    }

    // Sentiment analysis branch
    if (signal.sentimentContributions) {
      const sentimentNode = this.buildSentimentBranch(signal.sentimentContributions);
      rootNode.children?.push(sentimentNode);
    }

    // Risk assessment branch
    if (signal.riskAssessment) {
      const riskNode = this.buildRiskBranch(signal.riskAssessment);
      rootNode.children?.push(riskNode);
    }

    return rootNode;
  }

  /**
   * Explain confidence calculation
   */
  explainConfidence(signal: TradingSignal): ConfidenceExplanation {
    const factors = signal.confidenceFactors;
    
    const factorContributions = [
      {
        factor: 'Technical Analysis',
        contribution: factors.technicalConfidence * 0.35,
        reasoning: 'Technical indicators and chart patterns analysis'
      },
      {
        factor: 'Market Sentiment',
        contribution: factors.sentimentConfidence * 0.25,
        reasoning: 'News sentiment and market psychology indicators'
      },
      {
        factor: 'Pattern Matching',
        contribution: factors.patternMatchConfidence * 0.2,
        reasoning: 'Historical pattern similarity and success rates'
      },
      {
        factor: 'Market Conditions',
        contribution: factors.marketConditionConfidence * 0.15,
        reasoning: 'Current market environment and volatility'
      },
      {
        factor: 'Volume Confirmation',
        contribution: factors.volumeConfidence * 0.05,
        reasoning: 'Trading volume supporting the signal'
      }
    ];

    const uncertaintyFactors = [
      {
        factor: 'Market Volatility',
        impact: 0.1,
        explanation: 'High volatility increases uncertainty in predictions'
      },
      {
        factor: 'Economic Events',
        impact: 0.05,
        explanation: 'Upcoming economic announcements may affect outcomes'
      },
      {
        factor: 'Liquidity Conditions',
        impact: 0.03,
        explanation: 'Market liquidity affects execution and price movements'
      }
    ];

    const confidenceRange = {
      low: Math.max(0.1, signal.confidence - 0.15),
      high: Math.min(0.95, signal.confidence + 0.1)
    };

    return {
      overallConfidence: signal.confidence,
      factorContributions,
      uncertaintyFactors,
      confidenceRange
    };
  }

  /**
   * Generate alternative actions with probabilities
   */
  generateAlternativeActions(signal: TradingSignal): { action: SignalAction; probability: number; reasoning: string }[] {
    const alternatives: { action: SignalAction; probability: number; reasoning: string }[] = [];
    
    const allActions: SignalAction[] = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'];
    const currentAction = signal.action;
    
    for (const action of allActions) {
      if (action === currentAction) continue;
      
      // Calculate probability based on confidence and action similarity
      let probability = this.calculateAlternativeProbability(signal, action);
      
      if (probability > 0.05) { // Only include alternatives with >5% probability
        alternatives.push({
          action,
          probability,
          reasoning: this.generateAlternativeReasoning(signal, action)
        });
      }
    }

    return alternatives.sort((a, b) => b.probability - a.probability).slice(0, 3);
  }

  /**
   * Extract technical reasoning
   */
  private extractTechnicalReasoning(technical: any): string[] {
    const reasoning: string[] = [];

    if (technical.movingAverages?.confidence > 0.7) {
      reasoning.push(`Moving averages show ${technical.movingAverages.signal.toLowerCase()} signal with ${(technical.movingAverages.confidence * 100).toFixed(1)}% confidence`);
    }

    if (technical.rsi?.confidence > 0.7) {
      const rsiCondition = technical.rsi.value > 70 ? 'overbought' : 
                          technical.rsi.value < 30 ? 'oversold' : 'neutral';
      reasoning.push(`RSI at ${technical.rsi.value.toFixed(1)} indicates ${rsiCondition} conditions`);
    }

    if (technical.macd?.confidence > 0.7) {
      reasoning.push(`MACD shows ${technical.macd.signal.toLowerCase()} momentum`);
    }

    if (technical.volume?.confidence > 0.6) {
      reasoning.push(`Volume analysis: ${technical.volume.details}`);
    }

    return reasoning;
  }

  /**
   * Extract sentiment reasoning
   */
  private extractSentimentReasoning(sentiment: any): string[] {
    const reasoning: string[] = [];

    if (sentiment.newsImpact?.confidence > 0.6) {
      const sentimentLabel = sentiment.newsImpact.sentimentScore > 0.5 ? 'positive' : 
                            sentiment.newsImpact.sentimentScore < -0.5 ? 'negative' : 'neutral';
      reasoning.push(`News sentiment is ${sentimentLabel} (score: ${sentiment.newsImpact.sentimentScore.toFixed(2)})`);
    }

    if (sentiment.marketSentiment?.confidence > 0.6) {
      reasoning.push(`Market sentiment supports the recommended action`);
    }

    if (sentiment.analystRatings?.confidence > 0.5) {
      reasoning.push(`Analyst consensus: ${sentiment.analystRatings.averageRating}`);
    }

    return reasoning;
  }

  /**
   * Extract risk reasoning
   */
  private extractRiskReasoning(risk: any): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Overall risk level: ${risk.overallRisk} (score: ${risk.riskScore}/100)`);

    if (risk.warnings && risk.warnings.length > 0) {
      reasoning.push(`Key risks: ${risk.warnings.slice(0, 2).join(', ')}`);
    }

    if (risk.recommendations && risk.recommendations.length > 0) {
      reasoning.push(`Risk management: ${risk.recommendations.slice(0, 2).join(', ')}`);
    }

    return reasoning;
  }

  /**
   * Extract pattern reasoning
   */
  private extractPatternReasoning(patterns: any[]): string[] {
    const reasoning: string[] = [];

    const bestPattern = patterns.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    reasoning.push(`Pattern match: ${bestPattern.patternName} (${(bestPattern.confidence * 100).toFixed(1)}% similarity)`);
    reasoning.push(`Historical success rate: ${(bestPattern.successRate * 100).toFixed(1)}%`);

    if (bestPattern.averageReturn > 0) {
      reasoning.push(`Expected return based on pattern: ${(bestPattern.averageReturn * 100).toFixed(1)}%`);
    }

    return reasoning;
  }

  /**
   * Extract market context reasoning
   */
  private extractMarketContextReasoning(context: any): string[] {
    const reasoning: string[] = [];

    if (context.volatility) {
      reasoning.push(`Market volatility: ${context.volatility}`);
    }

    if (context.trend) {
      reasoning.push(`Market trend: ${context.trend}`);
    }

    if (context.volume) {
      reasoning.push(`Trading volume: ${context.volume}`);
    }

    return reasoning;
  }

  /**
   * Extract decision factors
   */
  private extractDecisionFactors(signal: TradingSignal): DecisionFactor[] {
    const factors: DecisionFactor[] = [];

    // Technical factors
    if (signal.technicalContributions) {
      factors.push({
        name: 'Technical Analysis',
        weight: 0.35,
        value: signal.confidenceFactors.technicalConfidence,
        explanation: 'Combined technical indicators analysis',
        confidence: signal.confidenceFactors.technicalConfidence,
        category: 'TECHNICAL'
      });
    }

    // Sentiment factors
    if (signal.sentimentContributions) {
      factors.push({
        name: 'Market Sentiment',
        weight: 0.25,
        value: signal.confidenceFactors.sentimentConfidence,
        explanation: 'News and market sentiment analysis',
        confidence: signal.confidenceFactors.sentimentConfidence,
        category: 'SENTIMENT'
      });
    }

    // Risk factors
    if (signal.riskAssessment) {
      const riskValue = signal.riskAssessment.overallRisk === 'LOW' ? 0.8 :
                       signal.riskAssessment.overallRisk === 'MEDIUM' ? 0.6 :
                       signal.riskAssessment.overallRisk === 'HIGH' ? 0.4 : 0.2;
      
      factors.push({
        name: 'Risk Assessment',
        weight: 0.2,
        value: riskValue,
        explanation: `Risk level: ${signal.riskAssessment.overallRisk}`,
        confidence: 0.9,
        category: 'RISK'
      });
    }

    return factors;
  }

  /**
   * Build technical analysis branch
   */
  private buildTechnicalBranch(technical: any): DecisionNode {
    const factors: DecisionFactor[] = [];

    if (technical.movingAverages) {
      factors.push({
        name: 'Moving Averages',
        weight: 0.3,
        value: technical.movingAverages.confidence,
        explanation: technical.movingAverages.details,
        confidence: technical.movingAverages.confidence,
        category: 'TECHNICAL'
      });
    }

    if (technical.rsi) {
      factors.push({
        name: 'RSI',
        weight: 0.25,
        value: technical.rsi.confidence,
        explanation: `RSI at ${technical.rsi.value.toFixed(1)}`,
        confidence: technical.rsi.confidence,
        category: 'TECHNICAL'
      });
    }

    if (technical.macd) {
      factors.push({
        name: 'MACD',
        weight: 0.25,
        value: technical.macd.confidence,
        explanation: technical.macd.details,
        confidence: technical.macd.confidence,
        category: 'TECHNICAL'
      });
    }

    return {
      condition: 'Technical indicators analysis',
      result: `Technical analysis ${technical.movingAverages?.signal || 'NEUTRAL'}`,
      confidence: factors.reduce((sum, f) => sum + f.value * f.weight, 0),
      factors
    };
  }

  /**
   * Build sentiment analysis branch
   */
  private buildSentimentBranch(sentiment: any): DecisionNode {
    const factors: DecisionFactor[] = [];

    if (sentiment.newsImpact) {
      factors.push({
        name: 'News Sentiment',
        weight: 0.4,
        value: Math.abs(sentiment.newsImpact.sentimentScore),
        explanation: `Sentiment score: ${sentiment.newsImpact.sentimentScore.toFixed(2)}`,
        confidence: sentiment.newsImpact.confidence,
        category: 'SENTIMENT'
      });
    }

    if (sentiment.marketSentiment) {
      factors.push({
        name: 'Market Sentiment',
        weight: 0.35,
        value: sentiment.marketSentiment.confidence,
        explanation: 'Overall market sentiment analysis',
        confidence: sentiment.marketSentiment.confidence,
        category: 'SENTIMENT'
      });
    }

    return {
      condition: 'Market sentiment analysis',
      result: `Sentiment: ${sentiment.newsImpact?.sentimentScore > 0 ? 'POSITIVE' : 'NEGATIVE'}`,
      confidence: factors.reduce((sum, f) => sum + f.value * f.weight, 0),
      factors
    };
  }

  /**
   * Build risk assessment branch
   */
  private buildRiskBranch(risk: any): DecisionNode {
    const factors: DecisionFactor[] = [
      {
        name: 'Overall Risk',
        weight: 1.0,
        value: risk.riskScore / 100,
        explanation: `Risk level: ${risk.overallRisk}`,
        confidence: 0.9,
        category: 'RISK'
      }
    ];

    return {
      condition: 'Risk assessment analysis',
      result: `Risk level: ${risk.overallRisk}`,
      confidence: risk.riskScore / 100,
      factors
    };
  }

  /**
   * Calculate probability for alternative action
   */
  private calculateAlternativeProbability(signal: TradingSignal, action: SignalAction): number {
    const currentAction = signal.action;
    const confidence = signal.confidence;
    
    // Base probability inversely related to current confidence
    let baseProbability = (1 - confidence) * 0.5;
    
    // Adjust based on action similarity
    const actionOrder = ['STRONG_SELL', 'SELL', 'HOLD', 'BUY', 'STRONG_BUY'];
    const currentIndex = actionOrder.indexOf(currentAction);
    const altIndex = actionOrder.indexOf(action);
    const distance = Math.abs(currentIndex - altIndex);
    
    // Closer actions have higher probability
    const distanceMultiplier = Math.max(0.1, 1 - (distance * 0.3));
    
    return baseProbability * distanceMultiplier;
  }

  /**
   * Generate reasoning for alternative action
   */
  private generateAlternativeReasoning(signal: TradingSignal, action: SignalAction): string {
    const confidence = signal.confidence;
    
    if (action === 'HOLD') {
      return `Given ${(confidence * 100).toFixed(1)}% confidence, holding might be prudent to wait for stronger signals`;
    }
    
    if (confidence < 0.7) {
      return `Low confidence suggests ${action.toLowerCase()} could be considered with additional confirmation`;
    }
    
    return `Alternative scenario where ${action.toLowerCase()} might be appropriate based on different risk tolerance`;
  }

  /**
   * Initialize explanation templates
   */
  private initializeTemplates(): void {
    this.explanationTemplates.set('STRONG_BUY', {
      action: 'STRONG_BUY',
      templates: {
        simple: 'Strong buy recommendation for {ticker} with {confidence}% confidence.',
        detailed: 'Technical and fundamental analysis strongly supports buying {ticker} with {confidence}% confidence.',
        technical: 'Multiple technical indicators align for a strong buy signal on {ticker}.'
      },
      keyPoints: ['Strong technical breakout', 'Positive sentiment', 'Low risk profile'],
      riskConsiderations: ['Monitor for reversal signals', 'Consider position sizing']
    });

    this.explanationTemplates.set('BUY', {
      action: 'BUY',
      templates: {
        simple: 'Buy recommendation for {ticker} with {confidence}% confidence.',
        detailed: 'Analysis indicates {ticker} is a good buying opportunity with {confidence}% confidence.',
        technical: 'Technical indicators support a buy signal for {ticker}.'
      },
      keyPoints: ['Favorable technical setup', 'Positive momentum', 'Reasonable risk'],
      riskConsiderations: ['Watch support levels', 'Implement stop-loss']
    });

    this.explanationTemplates.set('HOLD', {
      action: 'HOLD',
      templates: {
        simple: 'Hold recommendation for {ticker} with {confidence}% confidence.',
        detailed: 'Current analysis suggests holding {ticker} is appropriate with {confidence}% confidence.',
        technical: 'Mixed signals suggest holding {ticker} for now.'
      },
      keyPoints: ['Unclear direction', 'Wait for confirmation', 'Preserve capital'],
      riskConsiderations: ['Monitor for breakout', 'Be ready to act']
    });

    this.explanationTemplates.set('SELL', {
      action: 'SELL',
      templates: {
        simple: 'Sell recommendation for {ticker} with {confidence}% confidence.',
        detailed: 'Analysis indicates selling {ticker} is advisable with {confidence}% confidence.',
        technical: 'Technical indicators support a sell signal for {ticker}.'
      },
      keyPoints: ['Bearish signals', 'Negative momentum', 'Risk management'],
      riskConsiderations: ['Consider partial position', 'Watch for reversal']
    });

    this.explanationTemplates.set('STRONG_SELL', {
      action: 'STRONG_SELL',
      templates: {
        simple: 'Strong sell recommendation for {ticker} with {confidence}% confidence.',
        detailed: 'Strong bearish signals suggest selling {ticker} with {confidence}% confidence.',
        technical: 'Multiple bearish indicators align for a strong sell signal on {ticker}.'
      },
      keyPoints: ['Strong bearish breakdown', 'Negative sentiment', 'High downside risk'],
      riskConsiderations: ['Act quickly', 'Consider hedging', 'Avoid catching falling knife']
    });
  }
}

/**
 * Factory function to create decision explainer
 */
export function createDecisionExplainer(): DecisionExplainer {
  return new DecisionExplainer();
}

/**
 * Utility functions for decision explanation
 */
export const DecisionExplainerUtils = {
  /**
   * Format confidence as percentage with description
   */
  formatConfidence: (confidence: number): string => {
    const percentage = (confidence * 100).toFixed(1);
    const description = confidence >= 0.8 ? 'High' :
                       confidence >= 0.6 ? 'Moderate' :
                       confidence >= 0.4 ? 'Low' : 'Very Low';
    return `${percentage}% (${description})`;
  },

  /**
   * Get risk level color/emoji
   */
  formatRiskLevel: (risk: RiskLevel): string => {
    const riskMap = {
      'VERY_LOW': '🟢 Very Low',
      'LOW': '🟢 Low', 
      'MEDIUM': '🟡 Medium',
      'HIGH': '🟠 High',
      'VERY_HIGH': '🔴 Very High'
    };
    return riskMap[risk] || risk;
  },

  /**
   * Format action with emoji
   */
  formatAction: (action: SignalAction): string => {
    const actionMap = {
      'STRONG_BUY': '🚀 Strong Buy',
      'BUY': '📈 Buy',
      'HOLD': '⏸️ Hold',
      'SELL': '📉 Sell',
      'STRONG_SELL': '💥 Strong Sell',
      'WATCH': '👀 Watch'
    };
    return actionMap[action] || action;
  },

  /**
   * Generate quick explanation
   */
  quickExplain: (signal: TradingSignal): string => {
    const action = DecisionExplainerUtils.formatAction(signal.action);
    const confidence = DecisionExplainerUtils.formatConfidence(signal.confidence);
    const risk = signal.riskAssessment ? 
      DecisionExplainerUtils.formatRiskLevel(signal.riskAssessment.overallRisk) : 'Unknown';
    
    return `${action} ${signal.ticker} - Confidence: ${confidence}, Risk: ${risk}`;
  }
};

export default DecisionExplainer;