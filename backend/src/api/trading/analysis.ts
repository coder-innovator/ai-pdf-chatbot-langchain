/**
 * Trading Analysis API Endpoints
 * REST API endpoints for trading analysis and signal generation
 */

import { Router } from 'express';
import { mockTradingStorage } from './mock-data.js';
import { SignalGeneratorAgent } from '../../agents/signal-generator.js';
import { TechnicalAnalysisAgent } from '../../agents/technical-analysis.js';
import { SentimentAnalysisAgent } from '../../agents/sentiment-analysis.js';
import { RiskAnalyzer } from '../../agents/risk-analyzer.js';
import { RecommendationEngine } from '../../agents/recommendation-engine.js';
import { ExplanationGenerator } from '../../agents/explanation-generator.js';
import { TradingQAAgent } from '../../retrieval_graph/agents/trading-qa.js';
import { TimeHorizon } from '../../types/trading-signals.js';

export const analysisRouter = Router();

// Initialize analysis agents
const technicalAgent = new TechnicalAnalysisAgent(mockTradingStorage as any);
const sentimentAgent = new SentimentAnalysisAgent(mockTradingStorage as any);
const riskAnalyzer = new RiskAnalyzer(mockTradingStorage as any);
const recommendationEngine = new RecommendationEngine(mockTradingStorage as any);
const explanationGenerator = new ExplanationGenerator();
const signalGenerator = new SignalGeneratorAgent(
  technicalAgent,
  sentimentAgent,
  mockTradingStorage as any
);
const qaAgent = new TradingQAAgent(mockTradingStorage as any);

/**
 * POST /api/trading/analyze/:ticker
 * Generate new analysis and trading signal
 */
analysisRouter.post('/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { 
      analysisType = 'full',
      timeHorizon = 'MEDIUM_TERM',
      includeExplanation = true 
    } = req.body;

    console.log(`🔬 Generating analysis for ${ticker.toUpperCase()}`);
    const startTime = Date.now();

    // Generate new trading signal
    const signal = await signalGenerator.generateSignal(ticker.toUpperCase());

    let analysis: any = {
      ticker: ticker.toUpperCase(),
      signal,
      analysisType,
      timestamp: new Date(),
      processingTime: Date.now() - startTime
    };

    // Add detailed analysis based on type
    if (analysisType === 'full' || analysisType === 'technical') {
      const technicalAnalysis = await technicalAgent.analyzeStock(ticker.toUpperCase());
      analysis.technicalAnalysis = technicalAnalysis;
    }

    if (analysisType === 'full' || analysisType === 'sentiment') {
      const sentimentAnalysis = await sentimentAgent.analyzeSentiment(ticker.toUpperCase());
      analysis.sentimentAnalysis = sentimentAnalysis;
    }

    if (analysisType === 'full' || analysisType === 'risk') {
      const riskAssessment = await riskAnalyzer.analyzeSignalRisk(
        ticker.toUpperCase(),
        signal,
        analysis.technicalAnalysis,
        analysis.sentimentAnalysis
      );
      analysis.riskAssessment = riskAssessment;
    }

    if (analysisType === 'full' || analysisType === 'recommendation') {
      const recommendation = await recommendationEngine.generateRecommendation(
        ticker.toUpperCase(),
        analysis.technicalAnalysis,
        analysis.sentimentAnalysis,
        analysis.riskAssessment,
        timeHorizon as TimeHorizon
      );
      analysis.recommendation = recommendation;
    }

    // Generate explanation if requested
    if (includeExplanation) {
      const explanation = explanationGenerator.generateExplanation(signal);
      analysis.explanation = explanation;
    }

    // Store analysis in history
    await mockTradingStorage.insert('analysis_history', {
      ticker: ticker.toUpperCase(),
      analysisType,
      result: analysis,
      timestamp: new Date(),
      processingTime: Date.now() - startTime,
      version: '1.0.0'
    });

    analysis.processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Error generating analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/:ticker/technical
 * Get technical analysis only
 */
analysisRouter.get('/:ticker/technical', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { timeframe = '1d' } = req.query;

    console.log(`📈 Generating technical analysis for ${ticker.toUpperCase()}`);

    const technicalAnalysis = await technicalAgent.analyzeStock(ticker.toUpperCase());

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        technicalAnalysis,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating technical analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate technical analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/:ticker/sentiment
 * Get sentiment analysis only
 */
analysisRouter.get('/:ticker/sentiment', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;

    console.log(`😊 Generating sentiment analysis for ${ticker.toUpperCase()}`);

    const sentimentAnalysis = await sentimentAgent.analyzeSentiment(ticker.toUpperCase());

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        sentimentAnalysis,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sentiment analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/:ticker/risk
 * Get risk analysis for current or specified signal
 */
analysisRouter.get('/:ticker/risk', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { signalId } = req.query;

    console.log(`⚠️ Generating risk analysis for ${ticker.toUpperCase()}`);

    // Get signal to analyze
    let signal;
    if (signalId) {
      const signals = await mockTradingStorage.select('trading_signals', {
        ticker: ticker.toUpperCase(),
        limit: 100
      });
      signal = signals.find(s => s.id === signalId);
    } else {
      // Get latest signal
      const signals = await mockTradingStorage.select('trading_signals', {
        ticker: ticker.toUpperCase(),
        limit: 1,
        orderBy: 'created_at desc'
      });
      signal = signals[0];
    }

    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'No signal found for risk analysis'
      });
    }

    // Get supporting analysis
    const technicalAnalysis = await technicalAgent.analyzeStock(ticker.toUpperCase());
    const sentimentAnalysis = await sentimentAgent.analyzeSentiment(ticker.toUpperCase());

    const riskAssessment = await riskAnalyzer.analyzeSignalRisk(
      ticker.toUpperCase(),
      signal,
      technicalAnalysis,
      sentimentAnalysis
    );

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        signal,
        riskAssessment,
        supportingAnalysis: {
          technical: technicalAnalysis,
          sentiment: sentimentAnalysis
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating risk analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/analyze/:ticker/recommendation
 * Generate investment recommendation
 */
analysisRouter.post('/:ticker/recommendation', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { 
      timeHorizon = 'MEDIUM_TERM',
      riskTolerance = 'MEDIUM',
      portfolioSize 
    } = req.body;

    console.log(`💡 Generating recommendation for ${ticker.toUpperCase()}`);

    // Get current analysis
    const technicalAnalysis = await technicalAgent.analyzeStock(ticker.toUpperCase());
    const sentimentAnalysis = await sentimentAgent.analyzeSentiment(ticker.toUpperCase());
    const riskAssessment = await riskAnalyzer.analyzeSignalRisk(
      ticker.toUpperCase(),
      { ticker: ticker.toUpperCase() }, // Partial signal for risk analysis
      technicalAnalysis,
      sentimentAnalysis
    );

    const recommendation = await recommendationEngine.generateRecommendation(
      ticker.toUpperCase(),
      technicalAnalysis,
      sentimentAnalysis,
      riskAssessment,
      timeHorizon as TimeHorizon
    );

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        recommendation,
        parameters: {
          timeHorizon,
          riskTolerance,
          portfolioSize
        },
        supportingAnalysis: {
          technical: technicalAnalysis,
          sentiment: sentimentAnalysis,
          risk: riskAssessment
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/:ticker/explanation
 * Get explanation for latest signal
 */
analysisRouter.get('/:ticker/explanation', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { signalId, complexity = 'INTERMEDIATE' } = req.query;

    console.log(`📝 Generating explanation for ${ticker.toUpperCase()}`);

    // Get signal to explain
    let signal;
    if (signalId) {
      const signals = await mockTradingStorage.select('trading_signals', {
        ticker: ticker.toUpperCase(),
        limit: 100
      });
      signal = signals.find(s => s.id === signalId);
    } else {
      // Get latest signal
      const signals = await mockTradingStorage.select('trading_signals', {
        ticker: ticker.toUpperCase(),
        limit: 1,
        orderBy: 'created_at desc'
      });
      signal = signals[0];
    }

    if (!signal) {
      return res.status(404).json({
        success: false,
        error: 'No signal found for explanation'
      });
    }

    // Generate explanation with custom complexity
    const customConfig = {
      targetAudience: complexity as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    };
    
    const customExplanationGenerator = new ExplanationGenerator(customConfig);
    const explanation = customExplanationGenerator.generateExplanation(signal);

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        signal,
        explanation,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate explanation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/analyze/question
 * Ask a trading question using Q&A agent
 */
analysisRouter.post('/question', async (req: any, res: any) => {
  try {
    const { question, sessionId, userId } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    console.log(`❓ Processing trading question: "${question.substring(0, 100)}..."`);

    const answer = await qaAgent.answerQuestion(question, sessionId, userId);

    res.json({
      success: true,
      data: {
        question,
        answer,
        sessionId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/history/:ticker
 * Get analysis history for ticker
 */
analysisRouter.get('/history/:ticker', async (req: any, res: any) => {
  try {
    const { ticker } = req.params;
    const { limit = 10, analysisType } = req.query;

    console.log(`📚 Fetching analysis history for ${ticker.toUpperCase()}`);

    const history = await mockTradingStorage.getAnalysisHistory(
      ticker.toUpperCase(),
      parseInt(limit as string)
    );

    let filteredHistory = history;
    if (analysisType) {
      filteredHistory = history.filter(h => h.analysisType === analysisType);
    }

    res.json({
      success: true,
      data: {
        ticker: ticker.toUpperCase(),
        history: filteredHistory,
        summary: {
          totalAnalyses: filteredHistory.length,
          analysisTypes: [...new Set(filteredHistory.map(h => h.analysisType))],
          averageProcessingTime: filteredHistory.length > 0 
            ? filteredHistory.reduce((sum, h) => sum + h.processingTime, 0) / filteredHistory.length 
            : 0
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/trading/analyze/batch
 * Analyze multiple tickers at once
 */
analysisRouter.post('/batch', async (req: any, res: any) => {
  try {
    const { 
      tickers = [], 
      analysisType = 'signals_only',
      timeHorizon = 'MEDIUM_TERM' 
    } = req.body;

    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tickers array is required'
      });
    }

    if (tickers.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 tickers allowed per batch'
      });
    }

    console.log(`🔬 Batch analysis for ${tickers.length} tickers`);
    const startTime = Date.now();

    const results = [];
    const errors = [];

    for (const ticker of tickers) {
      try {
        let analysis: any = {
          ticker: ticker.toUpperCase(),
          timestamp: new Date()
        };

        if (analysisType === 'signals_only' || analysisType === 'full') {
          const signal = await signalGenerator.generateSignal(ticker.toUpperCase());
          analysis.signal = signal;
        }

        if (analysisType === 'full') {
          const technicalAnalysis = await technicalAgent.analyzeStock(ticker.toUpperCase());
          const sentimentAnalysis = await sentimentAgent.analyzeSentiment(ticker.toUpperCase());
          
          analysis.technicalAnalysis = technicalAnalysis;
          analysis.sentimentAnalysis = sentimentAnalysis;
        }

        results.push(analysis);

      } catch (error) {
        errors.push({
          ticker: ticker.toUpperCase(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          totalTickers: tickers.length,
          successful: results.length,
          failed: errors.length,
          analysisType,
          timeHorizon,
          processingTime
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in batch analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/trading/analyze/compare
 * Compare analysis between multiple tickers
 */
analysisRouter.get('/compare', async (req: any, res: any) => {
  try {
    const { tickers, metric = 'signals' } = req.query;

    if (!tickers || typeof tickers !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Tickers parameter is required (comma-separated)'
      });
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());

    if (tickerList.length < 2 || tickerList.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Between 2 and 5 tickers required for comparison'
      });
    }

    console.log(`⚖️ Comparing ${tickerList.length} tickers: ${tickerList.join(', ')}`);

    const comparisons = [];
    
    for (const ticker of tickerList) {
      const latestSignal = await mockTradingStorage.getLatestSignals(ticker, 1);
      const technicalAnalysis = await technicalAgent.analyzeStock(ticker);
      
      comparisons.push({
        ticker,
        latestSignal: latestSignal[0] || null,
        technicalAnalysis,
        lastUpdated: new Date()
      });
    }

    // Generate comparison insights
    const insights = generateComparisonInsights(comparisons, metric as string);

    res.json({
      success: true,
      data: {
        comparisons,
        insights,
        metric,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in ticker comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare tickers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate comparison insights
 */
function generateComparisonInsights(comparisons: any[], metric: string): any {
  const insights = {
    strongest: null,
    weakest: null,
    averageConfidence: 0,
    actionDistribution: {} as Record<string, number>,
    riskDistribution: {} as Record<string, number>
  };

  const validComparisons = comparisons.filter(c => c.latestSignal);
  
  if (validComparisons.length === 0) {
    return insights;
  }

  // Find strongest and weakest signals
  let strongest = validComparisons[0];
  let weakest = validComparisons[0];

  let totalConfidence = 0;

  for (const comparison of validComparisons) {
    const signal = comparison.latestSignal;
    totalConfidence += signal.confidence;

    if (signal.confidence > strongest.latestSignal.confidence) {
      strongest = comparison;
    }
    
    if (signal.confidence < weakest.latestSignal.confidence) {
      weakest = comparison;
    }

    // Update distributions
    const action = signal.action;
    insights.actionDistribution[action] = (insights.actionDistribution[action] || 0) + 1;

    const risk = signal.riskAssessment?.overallRisk || 'UNKNOWN';
    insights.riskDistribution[risk] = (insights.riskDistribution[risk] || 0) + 1;
  }

  insights.strongest = strongest;
  insights.weakest = weakest;
  insights.averageConfidence = totalConfidence / validComparisons.length;

  return insights;
}

export default analysisRouter;