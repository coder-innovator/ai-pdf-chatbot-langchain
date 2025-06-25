/**
 * Sentiment Analysis Agent
 * Analyzes market sentiment from news data with mock and real data support
 */

import {
  NewsItem,
  SentimentAnalysis,
  SentimentScore,
  SentimentLabel,
  SentimentConfig,
  calculateWeightedSentiment,
  analyzeSentimentTrend,
  calculateSentimentConfidence,
  generateSentimentBreakdown,
  assessMarketImpact,
  generateSentimentSummary,
  rankNewsByImportance,
  validateNewsItem,
  DEFAULT_SENTIMENT_CONFIG
} from '../utils/sentiment-calculator.js';

import { StorageAdapter } from './technical-analysis.js';

/**
 * Sentiment analysis configuration options
 */
export interface SentimentAnalysisConfig {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  minNewsCount: number;
  includeNeutralNews: boolean;
  sourceFilters: string[];
  sentimentConfig: Partial<SentimentConfig>;
}

/**
 * Historical sentiment data point
 */
export interface SentimentHistoryPoint {
  timestamp: Date;
  sentimentScore: SentimentScore;
  newsCount: number;
  confidence: number;
}

/**
 * Sentiment comparison between periods
 */
export interface SentimentComparison {
  current: SentimentAnalysis;
  previous: SentimentAnalysis;
  change: number;
  changePercent: number;
  trend: 'Improving' | 'Declining' | 'Stable';
  significance: 'High' | 'Medium' | 'Low';
}

/**
 * Multi-ticker sentiment analysis
 */
export interface PortfolioSentiment {
  portfolio: { [ticker: string]: SentimentAnalysis };
  marketSentiment: SentimentScore;
  topPositive: string[];
  topNegative: string[];
  correlations: { [ticker: string]: number };
}

/**
 * Sentiment Analysis Agent Class
 */
export class SentimentAnalysisAgent {
  private storage: StorageAdapter;
  private config: Required<SentimentAnalysisConfig>;

  constructor(
    storage: StorageAdapter,
    config: Partial<SentimentAnalysisConfig> = {}
  ) {
    this.storage = storage;
    this.config = {
      timeRange: config.timeRange || '24h',
      minNewsCount: config.minNewsCount || 3,
      includeNeutralNews: config.includeNeutralNews ?? true,
      sourceFilters: config.sourceFilters || [],
      sentimentConfig: { ...DEFAULT_SENTIMENT_CONFIG, ...config.sentimentConfig }
    };
  }

  /**
   * Analyze sentiment for a specific ticker
   */
  async analyzeSentiment(ticker: string): Promise<SentimentAnalysis> {
    // Get news data from storage
    const newsItems = await this.getNewsData(ticker);

    if (newsItems.length < this.config.minNewsCount) {
      return this.createEmptySentimentAnalysis(ticker, 'Insufficient news data');
    }

    // Filter and validate news items
    const validNews = this.filterAndValidateNews(newsItems, ticker);
    
    if (validNews.length === 0) {
      return this.createEmptySentimentAnalysis(ticker, 'No valid news items found');
    }

    // Calculate sentiment metrics
    const sentimentScore = this.calculateAverageSentiment(validNews);
    const sentimentLabel = this.scoresToLabel(sentimentScore);
    const confidence = calculateSentimentConfidence(validNews);
    const impact = assessMarketImpact(sentimentScore, validNews.length);
    const breakdown = generateSentimentBreakdown(validNews);
    const trendDirection = analyzeSentimentTrend(validNews, this.getHoursFromTimeRange());
    const topNews = rankNewsByImportance(validNews, 5);
    const summary = generateSentimentSummary(
      ticker, 
      sentimentScore, 
      validNews.length, 
      trendDirection
    );

    return {
      ticker,
      sentimentScore,
      sentimentLabel,
      confidence,
      newsCount: validNews.length,
      timeRange: this.config.timeRange,
      impact,
      summary,
      breakdown,
      topNews,
      trendDirection
    };
  }

  /**
   * Quick sentiment analysis with minimal data requirements
   */
  async quickSentiment(ticker: string): Promise<Partial<SentimentAnalysis>> {
    const newsItems = await this.getNewsData(ticker, 10); // Limit to 10 items
    
    if (newsItems.length === 0) {
      return {
        ticker,
        sentimentScore: 0,
        sentimentLabel: 'Neutral',
        confidence: 0.1,
        newsCount: 0,
        summary: 'No recent news available'
      };
    }

    const validNews = this.filterAndValidateNews(newsItems, ticker);
    const sentimentScore = this.calculateAverageSentiment(validNews);
    const impact = assessMarketImpact(sentimentScore, validNews.length);

    return {
      ticker,
      sentimentScore,
      sentimentLabel: this.scoresToLabel(sentimentScore),
      confidence: Math.min(0.7, calculateSentimentConfidence(validNews)),
      newsCount: validNews.length,
      impact,
      summary: `${ticker} sentiment: ${this.scoresToLabel(sentimentScore).toLowerCase()}`
    };
  }

  /**
   * Compare sentiment between two time periods
   */
  async compareSentiment(
    ticker: string,
    currentPeriod: string = '24h',
    previousPeriod: string = '24h'
  ): Promise<SentimentComparison> {
    // Analyze current period
    const originalTimeRange = this.config.timeRange;
    this.config.timeRange = currentPeriod as any;
    const current = await this.analyzeSentiment(ticker);

    // Analyze previous period
    const previousNews = await this.getPreviousPeriodNews(ticker, previousPeriod);
    const previous = await this.analyzeSentimentFromNews(ticker, previousNews);

    // Restore original config
    this.config.timeRange = originalTimeRange;

    // Calculate changes
    const change = current.sentimentScore - previous.sentimentScore;
    const changePercent = previous.sentimentScore !== 0 
      ? (change / Math.abs(previous.sentimentScore)) * 100 
      : 0;

    // Determine trend significance
    const significance = this.calculateChangeSignificance(change, current, previous);

    return {
      current,
      previous,
      change,
      changePercent,
      trend: change > 0.1 ? 'Improving' : change < -0.1 ? 'Declining' : 'Stable',
      significance
    };
  }

  /**
   * Analyze sentiment for multiple tickers (portfolio analysis)
   */
  async analyzePortfolioSentiment(tickers: string[]): Promise<PortfolioSentiment> {
    const portfolio: { [ticker: string]: SentimentAnalysis } = {};
    
    // Analyze each ticker
    for (const ticker of tickers) {
      try {
        portfolio[ticker] = await this.analyzeSentiment(ticker);
      } catch (error) {
        console.warn(`Failed to analyze sentiment for ${ticker}:`, error);
        portfolio[ticker] = this.createEmptySentimentAnalysis(ticker, 'Analysis failed');
      }
    }

    // Calculate market sentiment
    const allSentiments = Object.values(portfolio)
      .filter(analysis => analysis.newsCount > 0)
      .map(analysis => analysis.sentimentScore);
    
    const marketSentiment = allSentiments.length > 0
      ? allSentiments.reduce((sum, score) => sum + score, 0) / allSentiments.length
      : 0;

    // Rank tickers by sentiment
    const rankedTickers = Object.entries(portfolio)
      .filter(([_, analysis]) => analysis.newsCount > 0)
      .sort((a, b) => b[1].sentimentScore - a[1].sentimentScore);

    const topPositive = rankedTickers
      .filter(([_, analysis]) => analysis.sentimentScore > 0.1)
      .slice(0, 5)
      .map(([ticker, _]) => ticker);

    const topNegative = rankedTickers
      .filter(([_, analysis]) => analysis.sentimentScore < -0.1)
      .slice(-5)
      .reverse()
      .map(([ticker, _]) => ticker);

    // Calculate correlations (simplified)
    const correlations = this.calculateSentimentCorrelations(portfolio);

    return {
      portfolio,
      marketSentiment,
      topPositive,
      topNegative,
      correlations
    };
  }

  /**
   * Get sentiment history over time
   */
  async getSentimentHistory(
    ticker: string, 
    days: number = 30
  ): Promise<SentimentHistoryPoint[]> {
    const history: SentimentHistoryPoint[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      try {
        const dayNews = await this.getNewsDataForPeriod(ticker, dayStart, dayEnd);
        const validNews = this.filterAndValidateNews(dayNews, ticker);
        
        if (validNews.length > 0) {
          const sentimentScore = this.calculateAverageSentiment(validNews);
          const confidence = calculateSentimentConfidence(validNews);

          history.push({
            timestamp: dayStart,
            sentimentScore,
            newsCount: validNews.length,
            confidence
          });
        }
      } catch (error) {
        console.warn(`Failed to get sentiment for ${ticker} on ${dayStart.toDateString()}:`, error);
      }
    }

    return history.reverse(); // Return in chronological order
  }

  /**
   * Screen tickers by sentiment criteria
   */
  async screenBySentiment(
    tickers: string[],
    criteria: {
      minSentiment?: number;
      maxSentiment?: number;
      minConfidence?: number;
      minNewsCount?: number;
      impact?: ('Bullish' | 'Bearish' | 'Neutral')[];
      trend?: ('Improving' | 'Declining' | 'Stable')[];
    }
  ): Promise<SentimentAnalysis[]> {
    const results: SentimentAnalysis[] = [];

    for (const ticker of tickers) {
      try {
        const analysis = await this.analyzeSentiment(ticker);
        
        // Apply criteria filters
        if (criteria.minSentiment !== undefined && analysis.sentimentScore < criteria.minSentiment) continue;
        if (criteria.maxSentiment !== undefined && analysis.sentimentScore > criteria.maxSentiment) continue;
        if (criteria.minConfidence !== undefined && analysis.confidence < criteria.minConfidence) continue;
        if (criteria.minNewsCount !== undefined && analysis.newsCount < criteria.minNewsCount) continue;
        if (criteria.impact && !criteria.impact.includes(analysis.impact)) continue;
        if (criteria.trend && !criteria.trend.includes(analysis.trendDirection)) continue;

        results.push(analysis);
      } catch (error) {
        console.warn(`Failed to screen ${ticker}:`, error);
      }
    }

    return results.sort((a, b) => b.sentimentScore - a.sentimentScore);
  }

  // Private helper methods

  private async getNewsData(ticker: string, limit?: number): Promise<NewsItem[]> {
    const options = {
      ticker,
      limit: limit || 100,
      timeRange: this.config.timeRange
    };

    try {
      const data = await this.storage.select('news_sentiment', options);
      return data.map(this.convertToNewsItem).filter(validateNewsItem);
    } catch (error) {
      console.warn(`Failed to fetch news data for ${ticker}:`, error);
      return [];
    }
  }

  private async getNewsDataForPeriod(
    ticker: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<NewsItem[]> {
    try {
      const data = await this.storage.select('news_sentiment', {
        ticker,
        where: {
          publishedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      return data.map(this.convertToNewsItem).filter(validateNewsItem);
    } catch (error) {
      console.warn(`Failed to fetch news data for ${ticker} between ${startDate} and ${endDate}:`, error);
      return [];
    }
  }

  private async getPreviousPeriodNews(ticker: string, period: string): Promise<NewsItem[]> {
    const hours = this.getHoursFromTimeRange(period);
    const now = new Date();
    const endTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    return this.getNewsDataForPeriod(ticker, startTime, endTime);
  }

  private async analyzeSentimentFromNews(ticker: string, newsItems: NewsItem[]): Promise<SentimentAnalysis> {
    if (newsItems.length === 0) {
      return this.createEmptySentimentAnalysis(ticker, 'No news data');
    }

    const validNews = this.filterAndValidateNews(newsItems, ticker);
    const sentimentScore = this.calculateAverageSentiment(validNews);
    const confidence = calculateSentimentConfidence(validNews);
    const impact = assessMarketImpact(sentimentScore, validNews.length);
    const breakdown = generateSentimentBreakdown(validNews);
    const trendDirection = analyzeSentimentTrend(validNews);
    const topNews = rankNewsByImportance(validNews, 5);

    return {
      ticker,
      sentimentScore,
      sentimentLabel: this.scoresToLabel(sentimentScore),
      confidence,
      newsCount: validNews.length,
      timeRange: this.config.timeRange,
      impact,
      summary: generateSentimentSummary(ticker, sentimentScore, validNews.length, trendDirection),
      breakdown,
      topNews,
      trendDirection
    };
  }

  private filterAndValidateNews(newsItems: NewsItem[], ticker: string): NewsItem[] {
    return newsItems.filter(item => {
      // Validate item structure
      if (!validateNewsItem(item)) return false;

      // Filter by ticker relevance
      if (!item.symbols.includes(ticker)) return false;

      // Filter by source if specified
      if (this.config.sourceFilters.length > 0 && 
          !this.config.sourceFilters.includes(item.source)) {
        return false;
      }

      // Filter by time range
      const hoursAgo = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo > this.getHoursFromTimeRange()) return false;

      // Filter neutral news if configured
      if (!this.config.includeNeutralNews && 
          Math.abs(item.sentimentScore || 0) < 0.1) {
        return false;
      }

      return true;
    });
  }

  private calculateAverageSentiment(newsItems: NewsItem[]): SentimentScore {
    return calculateWeightedSentiment(newsItems, this.config.sentimentConfig);
  }

  private scoresToLabel(score: SentimentScore): SentimentLabel {
    if (score >= 0.6) return 'Very Positive';
    if (score >= 0.2) return 'Positive';
    if (score <= -0.6) return 'Very Negative';
    if (score <= -0.2) return 'Negative';
    return 'Neutral';
  }

  private getHoursFromTimeRange(timeRange?: string): number {
    const range = timeRange || this.config.timeRange;
    switch (range) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }

  private convertToNewsItem(data: any): NewsItem {
    // Convert storage data to NewsItem format
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

  private createEmptySentimentAnalysis(ticker: string, reason: string): SentimentAnalysis {
    return {
      ticker,
      sentimentScore: 0,
      sentimentLabel: 'Neutral',
      confidence: 0.1,
      newsCount: 0,
      timeRange: this.config.timeRange,
      impact: 'Neutral',
      summary: reason,
      breakdown: { positive: 0, negative: 0, neutral: 0 },
      topNews: [],
      trendDirection: 'Stable'
    };
  }

  private calculateChangeSignificance(
    change: number,
    current: SentimentAnalysis,
    previous: SentimentAnalysis
  ): 'High' | 'Medium' | 'Low' {
    const absChange = Math.abs(change);
    const confidenceBoost = Math.min(current.confidence, previous.confidence);
    const newsVolumeBoost = Math.min(current.newsCount, previous.newsCount) / 10;

    const significanceScore = absChange + (confidenceBoost * 0.3) + (newsVolumeBoost * 0.1);

    if (significanceScore > 0.5) return 'High';
    if (significanceScore > 0.2) return 'Medium';
    return 'Low';
  }

  private calculateSentimentCorrelations(
    portfolio: { [ticker: string]: SentimentAnalysis }
  ): { [ticker: string]: number } {
    const correlations: { [ticker: string]: number } = {};
    const tickers = Object.keys(portfolio);
    
    // Simple correlation calculation based on sentiment scores
    const scores = tickers.map(ticker => portfolio[ticker].sentimentScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const score = scores[i];
      
      // Correlation with market average (simplified)
      correlations[ticker] = avgScore !== 0 ? score / avgScore : 0;
    }

    return correlations;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SentimentAnalysisConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      sentimentConfig: { ...this.config.sentimentConfig, ...newConfig.sentimentConfig }
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<SentimentAnalysisConfig> {
    return { ...this.config };
  }
}

/**
 * Factory function to create SentimentAnalysisAgent
 */
export function createSentimentAnalysisAgent(
  storage: StorageAdapter,
  config?: Partial<SentimentAnalysisConfig>
): SentimentAnalysisAgent {
  return new SentimentAnalysisAgent(storage, config);
}

export default SentimentAnalysisAgent;