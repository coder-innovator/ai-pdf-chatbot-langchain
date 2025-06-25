/**
 * News Impact Analyzer
 * Analyzes the market impact of news events with price correlation
 */

import {
  NewsItem,
  SentimentScore,
  calculateTextSentiment,
  calculateRelevanceScore,
  rankNewsByImportance
} from '../utils/sentiment-calculator.js';

import { MarketDataPoint } from '../utils/technical-calculations.js';
import { StorageAdapter } from './technical-analysis.js';

/**
 * News impact classification
 */
export type NewsImpact = 'MAJOR' | 'MODERATE' | 'MINOR' | 'NEGLIGIBLE';

/**
 * Market reaction types
 */
export type MarketReaction = 'RALLY' | 'SELLOFF' | 'VOLATILITY' | 'RANGE_BOUND' | 'NO_REACTION';

/**
 * News event analysis result
 */
export interface NewsImpactAnalysis {
  newsItem: NewsItem;
  impact: NewsImpact;
  marketReaction: MarketReaction;
  priceChange: number; // Percentage change
  volumeChange: number; // Volume vs average
  volatilityIncrease: number;
  timeToReaction: number; // Minutes
  persistance: number; // How long the effect lasted (hours)
  confidence: number;
  correlationScore: number;
}

/**
 * Aggregated news impact for a ticker
 */
export interface TickerNewsImpact {
  ticker: string;
  timeframe: string;
  totalNewsCount: number;
  impactfulNewsCount: number;
  averageImpact: NewsImpact;
  netSentimentImpact: number;
  priceCorrelation: number;
  volatilityImpact: number;
  topImpactfulNews: NewsImpactAnalysis[];
  impactBreakdown: {
    major: number;
    moderate: number;
    minor: number;
    negligible: number;
  };
}

/**
 * Event-driven analysis configuration
 */
export interface NewsImpactConfig {
  analysisWindow: number; // Hours to analyze after news
  priceDataInterval: number; // Minutes between price checks
  volumeThreshold: number; // Multiple of average volume
  volatilityThreshold: number; // Minimum volatility increase
  correlationMinimum: number; // Minimum correlation to consider
  impactDecayHours: number; // How long impact can persist
}

/**
 * Market event categories for enhanced analysis
 */
export interface MarketEvent {
  type: 'earnings' | 'guidance' | 'acquisition' | 'partnership' | 'regulatory' | 'product' | 'leadership' | 'analyst' | 'macro';
  severity: 'high' | 'medium' | 'low';
  expectedImpact: NewsImpact;
  typicalReaction: MarketReaction;
  averageDuration: number; // Hours
}

/**
 * News Impact Analyzer Class
 */
export class NewsImpactAnalyzer {
  private storage: StorageAdapter;
  private config: Required<NewsImpactConfig>;
  private marketEvents: Map<string, MarketEvent>;

  constructor(
    storage: StorageAdapter,
    config: Partial<NewsImpactConfig> = {}
  ) {
    this.storage = storage;
    this.config = {
      analysisWindow: config.analysisWindow || 24,
      priceDataInterval: config.priceDataInterval || 15,
      volumeThreshold: config.volumeThreshold || 1.5,
      volatilityThreshold: config.volatilityThreshold || 0.02,
      correlationMinimum: config.correlationMinimum || 0.3,
      impactDecayHours: config.impactDecayHours || 72,
      ...config
    };

    this.initializeMarketEvents();
  }

  /**
   * Analyze the impact of a specific news item
   */
  async analyzeNewsImpact(
    newsItem: NewsItem,
    ticker: string
  ): Promise<NewsImpactAnalysis> {
    // Get market data around the news publication time
    const marketData = await this.getMarketDataAroundNews(ticker, newsItem.publishedAt);
    
    if (marketData.length < 2) {
      return this.createMinimalImpactAnalysis(newsItem, 'Insufficient market data');
    }

    // Calculate price and volume changes
    const priceChange = this.calculatePriceImpact(marketData, newsItem.publishedAt);
    const volumeChange = this.calculateVolumeImpact(marketData, newsItem.publishedAt);
    const volatilityIncrease = this.calculateVolatilityImpact(marketData, newsItem.publishedAt);

    // Analyze timing and persistence
    const timeToReaction = this.calculateTimeToReaction(marketData, newsItem.publishedAt);
    const persistance = this.calculateImpactPersistence(marketData, newsItem.publishedAt);

    // Calculate correlation between news sentiment and price movement
    const correlationScore = this.calculateNewsMarketCorrelation(
      newsItem,
      priceChange,
      volumeChange,
      volatilityIncrease
    );

    // Classify impact level
    const impact = this.classifyNewsImpact(
      newsItem,
      Math.abs(priceChange),
      volumeChange,
      volatilityIncrease,
      correlationScore
    );

    // Determine market reaction type
    const marketReaction = this.classifyMarketReaction(
      priceChange,
      volumeChange,
      volatilityIncrease
    );

    // Calculate confidence in analysis
    const confidence = this.calculateAnalysisConfidence(
      marketData.length,
      correlationScore,
      newsItem,
      Math.abs(priceChange)
    );

    return {
      newsItem,
      impact,
      marketReaction,
      priceChange,
      volumeChange,
      volatilityIncrease,
      timeToReaction,
      persistance,
      confidence,
      correlationScore
    };
  }

  /**
   * Analyze impact of multiple news items for a ticker
   */
  async analyzeTickerNewsImpact(
    ticker: string,
    timeframe: string = '7d'
  ): Promise<TickerNewsImpact> {
    // Get news items for the timeframe
    const newsItems = await this.getNewsForTimeframe(ticker, timeframe);
    
    if (newsItems.length === 0) {
      return this.createEmptyTickerImpact(ticker, timeframe);
    }

    // Analyze each news item
    const analyses: NewsImpactAnalysis[] = [];
    for (const newsItem of newsItems) {
      try {
        const analysis = await this.analyzeNewsImpact(newsItem, ticker);
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze news impact for ${newsItem.id}:`, error);
      }
    }

    // Aggregate results
    const impactfulNews = analyses.filter(a => a.impact !== 'NEGLIGIBLE');
    const topImpactfulNews = this.rankAnalysesByImpact(analyses).slice(0, 5);

    // Calculate aggregated metrics
    const netSentimentImpact = this.calculateNetSentimentImpact(analyses);
    const priceCorrelation = this.calculateAveragePriceCorrelation(analyses);
    const volatilityImpact = this.calculateAverageVolatilityImpact(analyses);
    const averageImpact = this.calculateAverageImpact(analyses);

    // Create impact breakdown
    const impactBreakdown = this.createImpactBreakdown(analyses);

    return {
      ticker,
      timeframe,
      totalNewsCount: newsItems.length,
      impactfulNewsCount: impactfulNews.length,
      averageImpact,
      netSentimentImpact,
      priceCorrelation,
      volatilityImpact,
      topImpactfulNews,
      impactBreakdown
    };
  }

  /**
   * Find news events that preceded significant price movements
   */
  async findNewsDrivers(
    ticker: string,
    startDate: Date,
    endDate: Date,
    minPriceChange: number = 0.05 // 5% minimum
  ): Promise<Array<{
    priceMove: {
      timestamp: Date;
      change: number;
      volume: number;
    };
    relatedNews: NewsImpactAnalysis[];
    confidence: number;
  }>> {
    // Get market data for the period
    const marketData = await this.getMarketDataForPeriod(ticker, startDate, endDate);
    
    // Identify significant price movements
    const significantMoves = this.identifySignificantPriceMoves(marketData, minPriceChange);
    
    const results = [];

    for (const move of significantMoves) {
      // Look for news in the 24 hours before the move
      const newsWindow = new Date(move.timestamp.getTime() - (24 * 60 * 60 * 1000));
      const relatedNews = await this.getNewsInWindow(ticker, newsWindow, move.timestamp);
      
      // Analyze each related news item
      const newsAnalyses: NewsImpactAnalysis[] = [];
      for (const newsItem of relatedNews) {
        const analysis = await this.analyzeNewsImpact(newsItem, ticker);
        if (analysis.correlationScore > this.config.correlationMinimum) {
          newsAnalyses.push(analysis);
        }
      }

      if (newsAnalyses.length > 0) {
        // Calculate confidence that news drove the price move
        const confidence = this.calculateNewsDriverConfidence(move, newsAnalyses);
        
        results.push({
          priceMove: move,
          relatedNews: newsAnalyses,
          confidence
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze sentiment vs price correlation over time
   */
  async analyzeSentimentPriceCorrelation(
    ticker: string,
    days: number = 30
  ): Promise<{
    correlation: number;
    dataPoints: Array<{
      date: Date;
      sentiment: number;
      priceChange: number;
      newsCount: number;
    }>;
    significance: 'High' | 'Medium' | 'Low';
    trend: 'Strengthening' | 'Weakening' | 'Stable';
  }> {
    const dataPoints = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      try {
        // Get news sentiment for the day
        const dayNews = await this.getNewsInWindow(ticker, dayStart, dayEnd);
        const avgSentiment = dayNews.length > 0 
          ? dayNews.reduce((sum, news) => sum + (news.sentimentScore || 0), 0) / dayNews.length
          : 0;

        // Get price change for the day
        const dayMarketData = await this.getMarketDataForPeriod(ticker, dayStart, dayEnd);
        const priceChange = dayMarketData.length > 1
          ? (dayMarketData[dayMarketData.length - 1].close - dayMarketData[0].open) / dayMarketData[0].open
          : 0;

        dataPoints.push({
          date: dayStart,
          sentiment: avgSentiment,
          priceChange,
          newsCount: dayNews.length
        });
      } catch (error) {
        console.warn(`Failed to analyze correlation for ${date.toDateString()}:`, error);
      }
    }

    // Calculate correlation
    const correlation = this.calculateCorrelation(
      dataPoints.map(d => d.sentiment),
      dataPoints.map(d => d.priceChange)
    );

    // Determine significance and trend
    const significance = Math.abs(correlation) > 0.5 ? 'High' : 
                       Math.abs(correlation) > 0.3 ? 'Medium' : 'Low';

    // Calculate trend by comparing first half vs second half
    const midPoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midPoint);
    const secondHalf = dataPoints.slice(midPoint);

    const firstCorrelation = this.calculateCorrelation(
      firstHalf.map(d => d.sentiment),
      firstHalf.map(d => d.priceChange)
    );
    const secondCorrelation = this.calculateCorrelation(
      secondHalf.map(d => d.sentiment),
      secondHalf.map(d => d.priceChange)
    );

    const trend = Math.abs(secondCorrelation) > Math.abs(firstCorrelation) + 0.1 ? 'Strengthening' :
                 Math.abs(secondCorrelation) < Math.abs(firstCorrelation) - 0.1 ? 'Weakening' : 'Stable';

    return {
      correlation,
      dataPoints: dataPoints.reverse(), // Return in chronological order
      significance,
      trend
    };
  }

  // Private helper methods

  private async getMarketDataAroundNews(
    ticker: string,
    newsTime: Date,
    hoursAround: number = 6
  ): Promise<MarketDataPoint[]> {
    const startTime = new Date(newsTime.getTime() - (hoursAround * 60 * 60 * 1000));
    const endTime = new Date(newsTime.getTime() + (hoursAround * 60 * 60 * 1000));

    return this.getMarketDataForPeriod(ticker, startTime, endTime);
  }

  private async getMarketDataForPeriod(
    ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<MarketDataPoint[]> {
    try {
      return await this.storage.select('market_data', {
        ticker,
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: 'timestamp'
      });
    } catch (error) {
      console.warn(`Failed to fetch market data for ${ticker}:`, error);
      return [];
    }
  }

  private async getNewsForTimeframe(ticker: string, timeframe: string): Promise<NewsItem[]> {
    const hours = this.getHoursFromTimeframe(timeframe);
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    try {
      const data = await this.storage.select('news_sentiment', {
        ticker,
        where: {
          publishedAt: {
            gte: startTime
          }
        },
        orderBy: 'publishedAt'
      });

      return data.map(this.convertToNewsItem);
    } catch (error) {
      console.warn(`Failed to fetch news for ${ticker}:`, error);
      return [];
    }
  }

  private async getNewsInWindow(
    ticker: string,
    startTime: Date,
    endTime: Date
  ): Promise<NewsItem[]> {
    try {
      const data = await this.storage.select('news_sentiment', {
        ticker,
        where: {
          publishedAt: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: 'publishedAt'
      });

      return data.map(this.convertToNewsItem);
    } catch (error) {
      console.warn(`Failed to fetch news in window for ${ticker}:`, error);
      return [];
    }
  }

  private calculatePriceImpact(data: MarketDataPoint[], newsTime: Date): number {
    const newsIndex = this.findClosestDataPoint(data, newsTime);
    if (newsIndex === -1 || newsIndex >= data.length - 1) return 0;

    const beforePrice = data[newsIndex].close;
    const afterIndex = Math.min(newsIndex + 4, data.length - 1); // Look ahead 4 periods
    const afterPrice = data[afterIndex].close;

    return ((afterPrice - beforePrice) / beforePrice) * 100;
  }

  private calculateVolumeImpact(data: MarketDataPoint[], newsTime: Date): number {
    const newsIndex = this.findClosestDataPoint(data, newsTime);
    if (newsIndex === -1 || newsIndex >= data.length - 1) return 0;

    // Calculate average volume before the news (last 10 periods)
    const lookbackPeriods = Math.min(10, newsIndex);
    const historicalVolumes = data.slice(newsIndex - lookbackPeriods, newsIndex)
      .map(d => d.volume);
    
    const avgVolume = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;

    // Compare with volume after news
    const afterIndex = Math.min(newsIndex + 1, data.length - 1);
    const afterVolume = data[afterIndex].volume;

    return avgVolume > 0 ? afterVolume / avgVolume : 1;
  }

  private calculateVolatilityImpact(data: MarketDataPoint[], newsTime: Date): number {
    const newsIndex = this.findClosestDataPoint(data, newsTime);
    if (newsIndex === -1 || newsIndex >= data.length - 3) return 0;

    // Calculate volatility before and after news
    const beforeVolatility = this.calculatePeriodVolatility(
      data.slice(Math.max(0, newsIndex - 5), newsIndex)
    );
    
    const afterVolatility = this.calculatePeriodVolatility(
      data.slice(newsIndex, newsIndex + 5)
    );

    return afterVolatility - beforeVolatility;
  }

  private calculateTimeToReaction(data: MarketDataPoint[], newsTime: Date): number {
    const newsIndex = this.findClosestDataPoint(data, newsTime);
    if (newsIndex === -1) return 0;

    // Find first significant price movement after news
    const basePrice = data[newsIndex].close;
    
    for (let i = newsIndex + 1; i < data.length; i++) {
      const priceChange = Math.abs((data[i].close - basePrice) / basePrice);
      if (priceChange > 0.01) { // 1% threshold
        return (data[i].timestamp.getTime() - newsTime.getTime()) / (1000 * 60); // Minutes
      }
    }

    return 0; // No significant reaction found
  }

  private calculateImpactPersistence(data: MarketDataPoint[], newsTime: Date): number {
    const newsIndex = this.findClosestDataPoint(data, newsTime);
    if (newsIndex === -1) return 0;

    const basePrice = data[newsIndex].close;
    let significantMoveStart = -1;

    // Find start of significant movement
    for (let i = newsIndex + 1; i < data.length; i++) {
      const priceChange = Math.abs((data[i].close - basePrice) / basePrice);
      if (priceChange > 0.01) {
        significantMoveStart = i;
        break;
      }
    }

    if (significantMoveStart === -1) return 0;

    // Find when the movement stabilizes
    const movePrice = data[significantMoveStart].close;
    for (let i = significantMoveStart + 1; i < data.length; i++) {
      const priceChange = Math.abs((data[i].close - movePrice) / movePrice);
      if (priceChange < 0.005) { // 0.5% stabilization threshold
        return (data[i].timestamp.getTime() - newsTime.getTime()) / (1000 * 60 * 60); // Hours
      }
    }

    return this.config.impactDecayHours; // Max persistence
  }

  private calculateNewsMarketCorrelation(
    newsItem: NewsItem,
    priceChange: number,
    volumeChange: number,
    volatilityIncrease: number
  ): number {
    const sentiment = newsItem.sentimentScore || 0;
    const relevance = newsItem.relevanceScore || 0.5;

    // Correlation factors
    let correlation = 0;

    // Sentiment-price alignment
    if ((sentiment > 0 && priceChange > 0) || (sentiment < 0 && priceChange < 0)) {
      correlation += Math.min(Math.abs(sentiment), Math.abs(priceChange / 10)) * 0.4;
    }

    // Volume reaction (any news should increase volume)
    if (volumeChange > this.config.volumeThreshold) {
      correlation += Math.min(0.3, (volumeChange - 1) * 0.1);
    }

    // Volatility increase
    if (volatilityIncrease > this.config.volatilityThreshold) {
      correlation += Math.min(0.2, volatilityIncrease * 5);
    }

    // Relevance boost
    correlation *= relevance;

    return Math.min(1, correlation);
  }

  private classifyNewsImpact(
    newsItem: NewsItem,
    absPriceChange: number,
    volumeChange: number,
    volatilityIncrease: number,
    correlationScore: number
  ): NewsImpact {
    // Get expected impact from event type
    const eventImpact = this.getEventExpectedImpact(newsItem);
    
    // Calculate impact score
    let impactScore = 0;
    
    // Price movement component
    if (absPriceChange > 0.1) impactScore += 0.4; // 10%+
    else if (absPriceChange > 0.05) impactScore += 0.3; // 5%+
    else if (absPriceChange > 0.02) impactScore += 0.2; // 2%+
    
    // Volume component
    if (volumeChange > 3) impactScore += 0.3;
    else if (volumeChange > 2) impactScore += 0.2;
    else if (volumeChange > 1.5) impactScore += 0.1;
    
    // Volatility component
    if (volatilityIncrease > 0.1) impactScore += 0.2;
    else if (volatilityIncrease > 0.05) impactScore += 0.1;
    
    // Correlation boost
    impactScore *= (0.5 + correlationScore * 0.5);
    
    // Event type adjustment
    switch (eventImpact) {
      case 'MAJOR': impactScore *= 1.2; break;
      case 'MODERATE': impactScore *= 1.0; break;
      case 'MINOR': impactScore *= 0.8; break;
      case 'NEGLIGIBLE': impactScore *= 0.6; break;
    }

    // Classify based on final score
    if (impactScore >= 0.7) return 'MAJOR';
    if (impactScore >= 0.4) return 'MODERATE';
    if (impactScore >= 0.2) return 'MINOR';
    return 'NEGLIGIBLE';
  }

  private classifyMarketReaction(
    priceChange: number,
    volumeChange: number,
    volatilityIncrease: number
  ): MarketReaction {
    const absPriceChange = Math.abs(priceChange);

    if (absPriceChange > 0.05 && volumeChange > 2) {
      return priceChange > 0 ? 'RALLY' : 'SELLOFF';
    }
    
    if (volatilityIncrease > 0.05 && volumeChange > 1.5) {
      return 'VOLATILITY';
    }
    
    if (absPriceChange > 0.01 && absPriceChange < 0.03) {
      return 'RANGE_BOUND';
    }
    
    return 'NO_REACTION';
  }

  // Additional helper methods...

  private findClosestDataPoint(data: MarketDataPoint[], targetTime: Date): number {
    let closest = -1;
    let minDiff = Infinity;

    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i].timestamp.getTime() - targetTime.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }

    return closest;
  }

  private calculatePeriodVolatility(data: MarketDataPoint[]): number {
    if (data.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getHoursFromTimeframe(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }

  private convertToNewsItem(data: any): NewsItem {
    return {
      id: data.id || `news_${Date.now()}_${Math.random()}`,
      title: data.title || '',
      content: data.content,
      summary: data.summary,
      source: data.source || 'Unknown',
      url: data.url,
      publishedAt: new Date(data.publishedAt || Date.now()),
      symbols: Array.isArray(data.symbols) ? data.symbols : [data.ticker || 'UNKNOWN'],
      sentimentScore: data.sentimentScore || 0,
      sentimentLabel: data.sentimentLabel || 'Neutral',
      relevanceScore: data.relevanceScore || 0.5,
      impact: data.impact || 'Low',
      category: data.category,
      author: data.author
    };
  }

  private createMinimalImpactAnalysis(newsItem: NewsItem, reason: string): NewsImpactAnalysis {
    return {
      newsItem,
      impact: 'NEGLIGIBLE',
      marketReaction: 'NO_REACTION',
      priceChange: 0,
      volumeChange: 1,
      volatilityIncrease: 0,
      timeToReaction: 0,
      persistance: 0,
      confidence: 0.1,
      correlationScore: 0
    };
  }

  private createEmptyTickerImpact(ticker: string, timeframe: string): TickerNewsImpact {
    return {
      ticker,
      timeframe,
      totalNewsCount: 0,
      impactfulNewsCount: 0,
      averageImpact: 'NEGLIGIBLE',
      netSentimentImpact: 0,
      priceCorrelation: 0,
      volatilityImpact: 0,
      topImpactfulNews: [],
      impactBreakdown: {
        major: 0,
        moderate: 0,
        minor: 0,
        negligible: 0
      }
    };
  }

  private initializeMarketEvents(): void {
    this.marketEvents = new Map([
      ['earnings', { type: 'earnings', severity: 'high', expectedImpact: 'MAJOR', typicalReaction: 'RALLY', averageDuration: 24 }],
      ['guidance', { type: 'guidance', severity: 'high', expectedImpact: 'MAJOR', typicalReaction: 'VOLATILITY', averageDuration: 12 }],
      ['acquisition', { type: 'acquisition', severity: 'high', expectedImpact: 'MAJOR', typicalReaction: 'RALLY', averageDuration: 48 }],
      ['analyst_upgrade', { type: 'analyst', severity: 'medium', expectedImpact: 'MODERATE', typicalReaction: 'RALLY', averageDuration: 6 }],
      ['regulatory', { type: 'regulatory', severity: 'high', expectedImpact: 'MAJOR', typicalReaction: 'SELLOFF', averageDuration: 72 }],
      ['product_launch', { type: 'product', severity: 'medium', expectedImpact: 'MODERATE', typicalReaction: 'RALLY', averageDuration: 12 }]
    ]);
  }

  private getEventExpectedImpact(newsItem: NewsItem): NewsImpact {
    const category = newsItem.category || 'general';
    const event = this.marketEvents.get(category);
    return event?.expectedImpact || 'MINOR';
  }

  // Additional utility methods for aggregation...
  
  private rankAnalysesByImpact(analyses: NewsImpactAnalysis[]): NewsImpactAnalysis[] {
    const impactOrder = { 'MAJOR': 4, 'MODERATE': 3, 'MINOR': 2, 'NEGLIGIBLE': 1 };
    
    return analyses.sort((a, b) => {
      const aScore = impactOrder[a.impact] + a.correlationScore + Math.abs(a.priceChange) / 10;
      const bScore = impactOrder[b.impact] + b.correlationScore + Math.abs(b.priceChange) / 10;
      return bScore - aScore;
    });
  }

  private calculateNetSentimentImpact(analyses: NewsImpactAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    return analyses.reduce((sum, analysis) => {
      const sentiment = analysis.newsItem.sentimentScore || 0;
      const weight = analysis.correlationScore;
      return sum + (sentiment * weight);
    }, 0) / analyses.length;
  }

  private calculateAveragePriceCorrelation(analyses: NewsImpactAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    return analyses.reduce((sum, analysis) => sum + analysis.correlationScore, 0) / analyses.length;
  }

  private calculateAverageVolatilityImpact(analyses: NewsImpactAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    return analyses.reduce((sum, analysis) => sum + analysis.volatilityIncrease, 0) / analyses.length;
  }

  private calculateAverageImpact(analyses: NewsImpactAnalysis[]): NewsImpact {
    if (analyses.length === 0) return 'NEGLIGIBLE';
    
    const impactScores = { 'NEGLIGIBLE': 1, 'MINOR': 2, 'MODERATE': 3, 'MAJOR': 4 };
    const scoreToImpact = ['NEGLIGIBLE', 'NEGLIGIBLE', 'MINOR', 'MODERATE', 'MAJOR'];
    
    const avgScore = analyses.reduce((sum, analysis) => 
      sum + impactScores[analysis.impact], 0) / analyses.length;
    
    return scoreToImpact[Math.round(avgScore)] as NewsImpact;
  }

  private createImpactBreakdown(analyses: NewsImpactAnalysis[]) {
    const breakdown = { major: 0, moderate: 0, minor: 0, negligible: 0 };
    
    for (const analysis of analyses) {
      switch (analysis.impact) {
        case 'MAJOR': breakdown.major++; break;
        case 'MODERATE': breakdown.moderate++; break;
        case 'MINOR': breakdown.minor++; break;
        case 'NEGLIGIBLE': breakdown.negligible++; break;
      }
    }
    
    const total = analyses.length;
    if (total > 0) {
      breakdown.major /= total;
      breakdown.moderate /= total;
      breakdown.minor /= total;
      breakdown.negligible /= total;
    }
    
    return breakdown;
  }

  private identifySignificantPriceMoves(
    data: MarketDataPoint[], 
    minChange: number
  ): Array<{ timestamp: Date; change: number; volume: number }> {
    const moves = [];
    
    for (let i = 1; i < data.length; i++) {
      const priceChange = (data[i].close - data[i - 1].close) / data[i - 1].close;
      
      if (Math.abs(priceChange) >= minChange) {
        moves.push({
          timestamp: data[i].timestamp,
          change: priceChange * 100,
          volume: data[i].volume
        });
      }
    }
    
    return moves;
  }

  private calculateNewsDriverConfidence(
    move: { timestamp: Date; change: number; volume: number },
    newsAnalyses: NewsImpactAnalysis[]
  ): number {
    if (newsAnalyses.length === 0) return 0;
    
    let confidence = 0;
    
    // Time proximity to move
    const avgTimeToMove = newsAnalyses.reduce((sum, analysis) => {
      const timeDiff = Math.abs(move.timestamp.getTime() - analysis.newsItem.publishedAt.getTime());
      return sum + timeDiff;
    }, 0) / newsAnalyses.length;
    
    const timeProximityScore = Math.max(0, 1 - (avgTimeToMove / (24 * 60 * 60 * 1000))); // Within 24 hours
    confidence += timeProximityScore * 0.3;
    
    // Sentiment-direction alignment
    const avgSentiment = newsAnalyses.reduce((sum, analysis) => 
      sum + (analysis.newsItem.sentimentScore || 0), 0) / newsAnalyses.length;
    
    if ((avgSentiment > 0 && move.change > 0) || (avgSentiment < 0 && move.change < 0)) {
      confidence += 0.3;
    }
    
    // Average correlation score
    const avgCorrelation = newsAnalyses.reduce((sum, analysis) => 
      sum + analysis.correlationScore, 0) / newsAnalyses.length;
    confidence += avgCorrelation * 0.4;
    
    return Math.min(1, confidence);
  }

  private calculateAnalysisConfidence(
    dataPoints: number,
    correlationScore: number,
    newsItem: NewsItem,
    absPriceChange: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Data quality
    if (dataPoints > 10) confidence += 0.2;
    else if (dataPoints > 5) confidence += 0.1;
    
    // Correlation strength
    confidence += correlationScore * 0.3;
    
    // News relevance
    const relevance = newsItem.relevanceScore || 0.5;
    confidence += relevance * 0.2;
    
    // Price movement magnitude
    if (absPriceChange > 0.05) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }
}

/**
 * Factory function to create NewsImpactAnalyzer
 */
export function createNewsImpactAnalyzer(
  storage: StorageAdapter,
  config?: Partial<NewsImpactConfig>
): NewsImpactAnalyzer {
  return new NewsImpactAnalyzer(storage, config);
}

export default NewsImpactAnalyzer;