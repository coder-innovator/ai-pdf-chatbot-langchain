/**
 * Sentiment Calculation Utilities
 * Provides sentiment analysis calculations for news and social media data
 */

/**
 * Sentiment score range: -1 (very negative) to +1 (very positive)
 */
export type SentimentScore = number;

/**
 * Sentiment label classifications
 */
export type SentimentLabel = 'Very Negative' | 'Negative' | 'Neutral' | 'Positive' | 'Very Positive';

/**
 * News item with sentiment data
 */
export interface NewsItem {
  id: string;
  title: string;
  content?: string;
  summary?: string;
  source: string;
  url?: string;
  publishedAt: Date;
  symbols: string[];
  sentimentScore?: SentimentScore;
  sentimentLabel?: SentimentLabel;
  relevanceScore?: number;
  impact?: 'High' | 'Medium' | 'Low';
  category?: string;
  author?: string;
}

/**
 * Aggregated sentiment analysis result
 */
export interface SentimentAnalysis {
  ticker: string;
  sentimentScore: SentimentScore;
  sentimentLabel: SentimentLabel;
  confidence: number;
  newsCount: number;
  timeRange: string;
  impact: 'Bullish' | 'Bearish' | 'Neutral';
  summary: string;
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topNews: NewsItem[];
  trendDirection: 'Improving' | 'Declining' | 'Stable';
}

/**
 * Sentiment calculation configuration
 */
export interface SentimentConfig {
  weightByRelevance: boolean;
  weightByRecency: boolean;
  weightBySource: boolean;
  minimumRelevanceScore: number;
  maxArticleAge: number; // hours
  sourceWeights: { [source: string]: number };
}

/**
 * Sentiment word dictionaries for basic analysis
 */
const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'outstanding', 'positive', 'bullish', 'up', 'gain', 'profit',
  'rise', 'increase', 'growth', 'boom', 'surge', 'rally', 'strong', 'robust', 'solid',
  'optimistic', 'confident', 'beat', 'exceed', 'outperform', 'success', 'breakthrough',
  'upgrade', 'buy', 'recommend', 'favorable', 'bright', 'promising', 'recover', 'rebound'
];

const NEGATIVE_WORDS = [
  'bad', 'poor', 'terrible', 'awful', 'negative', 'bearish', 'down', 'loss', 'decline',
  'fall', 'drop', 'decrease', 'crash', 'plunge', 'tumble', 'weak', 'fragile', 'volatile',
  'pessimistic', 'concern', 'worried', 'miss', 'disappoint', 'underperform', 'failure',
  'downgrade', 'sell', 'avoid', 'unfavorable', 'dark', 'risky', 'struggle', 'suffer'
];

const NEUTRAL_WORDS = [
  'stable', 'unchanged', 'flat', 'steady', 'maintain', 'hold', 'neutral', 'mixed',
  'moderate', 'average', 'normal', 'regular', 'standard', 'typical', 'usual'
];

/**
 * Financial keywords that increase relevance
 */
const FINANCIAL_KEYWORDS = [
  'earnings', 'revenue', 'profit', 'eps', 'guidance', 'forecast', 'dividend', 'buyback',
  'merger', 'acquisition', 'ipo', 'split', 'analyst', 'rating', 'target', 'valuation',
  'sales', 'growth', 'margin', 'debt', 'cash', 'balance sheet', 'income statement'
];

/**
 * Calculate sentiment score from text using basic NLP
 */
export function calculateTextSentiment(text: string): SentimentScore {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (words.length === 0) {
    return 0;
  }

  let positiveCount = 0;
  let negativeCount = 0;
  let totalWords = words.length;

  // Count sentiment words
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) {
      positiveCount++;
    } else if (NEGATIVE_WORDS.includes(word)) {
      negativeCount++;
    }
  }

  // Calculate raw sentiment
  const sentimentWords = positiveCount + negativeCount;
  if (sentimentWords === 0) {
    return 0; // Neutral if no sentiment words found
  }

  const rawSentiment = (positiveCount - negativeCount) / sentimentWords;
  
  // Apply smoothing based on total word count
  const confidenceFactor = Math.min(1, sentimentWords / (totalWords * 0.1));
  
  return rawSentiment * confidenceFactor;
}

/**
 * Convert sentiment score to label
 */
export function scoresToLabel(score: SentimentScore): SentimentLabel {
  if (score >= 0.6) return 'Very Positive';
  if (score >= 0.2) return 'Positive';
  if (score <= -0.6) return 'Very Negative';
  if (score <= -0.2) return 'Negative';
  return 'Neutral';
}

/**
 * Calculate relevance score for a news item
 */
export function calculateRelevanceScore(newsItem: NewsItem, ticker: string): number {
  let relevanceScore = 0;
  const text = `${newsItem.title} ${newsItem.content || newsItem.summary || ''}`.toLowerCase();
  
  // Direct ticker mentions
  const tickerMentions = (text.match(new RegExp(ticker.toLowerCase(), 'g')) || []).length;
  relevanceScore += tickerMentions * 0.3;
  
  // Financial keywords
  let financialKeywordCount = 0;
  for (const keyword of FINANCIAL_KEYWORDS) {
    if (text.includes(keyword)) {
      financialKeywordCount++;
    }
  }
  relevanceScore += financialKeywordCount * 0.1;
  
  // Source reliability (placeholder - could be expanded)
  const reliableSources = ['reuters', 'bloomberg', 'wsj', 'cnbc', 'marketwatch'];
  if (reliableSources.some(source => newsItem.source.toLowerCase().includes(source))) {
    relevanceScore += 0.2;
  }
  
  // Recency boost
  const hoursAgo = (Date.now() - newsItem.publishedAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) {
    relevanceScore += 0.2 * (1 - hoursAgo / 24);
  }
  
  return Math.min(1, relevanceScore);
}

/**
 * Calculate weighted average sentiment
 */
export function calculateWeightedSentiment(
  newsItems: NewsItem[],
  config: Partial<SentimentConfig> = {}
): SentimentScore {
  const defaultConfig: SentimentConfig = {
    weightByRelevance: true,
    weightByRecency: true,
    weightBySource: false,
    minimumRelevanceScore: 0.1,
    maxArticleAge: 168, // 7 days
    sourceWeights: {}
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  if (newsItems.length === 0) {
    return 0;
  }
  
  let totalWeightedSentiment = 0;
  let totalWeight = 0;
  
  for (const item of newsItems) {
    // Skip old articles
    const hoursAgo = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo > finalConfig.maxArticleAge) {
      continue;
    }
    
    // Skip low relevance articles
    const relevance = item.relevanceScore || 0.5;
    if (relevance < finalConfig.minimumRelevanceScore) {
      continue;
    }
    
    let weight = 1;
    
    // Apply relevance weighting
    if (finalConfig.weightByRelevance && item.relevanceScore) {
      weight *= item.relevanceScore;
    }
    
    // Apply recency weighting
    if (finalConfig.weightByRecency) {
      const recencyWeight = Math.max(0.1, 1 - (hoursAgo / finalConfig.maxArticleAge));
      weight *= recencyWeight;
    }
    
    // Apply source weighting
    if (finalConfig.weightBySource && finalConfig.sourceWeights[item.source]) {
      weight *= finalConfig.sourceWeights[item.source];
    }
    
    const sentiment = item.sentimentScore || 0;
    totalWeightedSentiment += sentiment * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalWeightedSentiment / totalWeight : 0;
}

/**
 * Analyze sentiment trend over time
 */
export function analyzeSentimentTrend(
  newsItems: NewsItem[],
  hoursBack: number = 24
): 'Improving' | 'Declining' | 'Stable' {
  if (newsItems.length < 4) {
    return 'Stable';
  }
  
  const now = Date.now();
  const cutoffTime = now - (hoursBack * 60 * 60 * 1000);
  
  // Sort by time and filter recent items
  const recentItems = newsItems
    .filter(item => item.publishedAt.getTime() >= cutoffTime)
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  
  if (recentItems.length < 4) {
    return 'Stable';
  }
  
  // Split into two halves
  const midPoint = Math.floor(recentItems.length / 2);
  const firstHalf = recentItems.slice(0, midPoint);
  const secondHalf = recentItems.slice(midPoint);
  
  const firstHalfSentiment = calculateWeightedSentiment(firstHalf);
  const secondHalfSentiment = calculateWeightedSentiment(secondHalf);
  
  const difference = secondHalfSentiment - firstHalfSentiment;
  
  if (difference > 0.1) return 'Improving';
  if (difference < -0.1) return 'Declining';
  return 'Stable';
}

/**
 * Calculate sentiment confidence based on data quality
 */
export function calculateSentimentConfidence(newsItems: NewsItem[]): number {
  if (newsItems.length === 0) {
    return 0;
  }
  
  let confidence = 0.5; // Base confidence
  
  // More articles = higher confidence
  const articleCountFactor = Math.min(0.3, newsItems.length * 0.02);
  confidence += articleCountFactor;
  
  // Recent articles boost confidence
  const recentCount = newsItems.filter(item => {
    const hoursAgo = (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60);
    return hoursAgo <= 24;
  }).length;
  
  const recencyFactor = Math.min(0.2, recentCount * 0.05);
  confidence += recencyFactor;
  
  // High relevance articles boost confidence
  const highRelevanceCount = newsItems.filter(item => 
    (item.relevanceScore || 0) > 0.7
  ).length;
  
  const relevanceFactor = Math.min(0.2, highRelevanceCount * 0.1);
  confidence += relevanceFactor;
  
  // Consistency in sentiment direction
  const sentiments = newsItems.map(item => item.sentimentScore || 0);
  const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
  const consistency = sentiments.filter(s => 
    Math.sign(s) === Math.sign(avgSentiment)
  ).length / sentiments.length;
  
  confidence += consistency * 0.1;
  
  return Math.min(0.95, confidence);
}

/**
 * Generate sentiment breakdown
 */
export function generateSentimentBreakdown(newsItems: NewsItem[]): {
  positive: number;
  negative: number;
  neutral: number;
} {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  
  for (const item of newsItems) {
    const score = item.sentimentScore || 0;
    if (score > 0.1) {
      positive++;
    } else if (score < -0.1) {
      negative++;
    } else {
      neutral++;
    }
  }
  
  const total = positive + negative + neutral;
  
  return {
    positive: total > 0 ? positive / total : 0,
    negative: total > 0 ? negative / total : 0,
    neutral: total > 0 ? neutral / total : 0
  };
}

/**
 * Assess market impact from sentiment
 */
export function assessMarketImpact(sentimentScore: SentimentScore, newsCount: number): 'Bullish' | 'Bearish' | 'Neutral' {
  // Consider both sentiment and volume of news
  const impactThreshold = Math.min(0.3, 0.1 + (newsCount * 0.02));
  
  if (sentimentScore > impactThreshold) {
    return 'Bullish';
  } else if (sentimentScore < -impactThreshold) {
    return 'Bearish';
  }
  
  return 'Neutral';
}

/**
 * Generate sentiment summary text
 */
export function generateSentimentSummary(
  ticker: string,
  sentimentScore: SentimentScore,
  newsCount: number,
  trendDirection: 'Improving' | 'Declining' | 'Stable'
): string {
  const label = scoresToLabel(sentimentScore);
  const impact = assessMarketImpact(sentimentScore, newsCount);
  
  let summary = `${ticker} sentiment is ${label.toLowerCase()}`;
  
  if (newsCount > 0) {
    summary += ` based on ${newsCount} news item${newsCount === 1 ? '' : 's'}`;
  }
  
  summary += `. Overall market impact appears ${impact.toLowerCase()}`;
  
  if (trendDirection !== 'Stable') {
    summary += ` with sentiment ${trendDirection.toLowerCase()}`;
  }
  
  summary += '.';
  
  // Add specific insights
  if (Math.abs(sentimentScore) > 0.6) {
    summary += ` Strong ${sentimentScore > 0 ? 'positive' : 'negative'} sentiment detected.`;
  }
  
  return summary;
}

/**
 * Filter and rank news by importance
 */
export function rankNewsByImportance(newsItems: NewsItem[], limit: number = 5): NewsItem[] {
  return newsItems
    .filter(item => (item.relevanceScore || 0) > 0.1)
    .sort((a, b) => {
      // Sort by relevance, recency, and sentiment strength
      const aScore = (a.relevanceScore || 0) * 0.5 + 
                    Math.abs(a.sentimentScore || 0) * 0.3 +
                    (1 - (Date.now() - a.publishedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 0.2;
      
      const bScore = (b.relevanceScore || 0) * 0.5 + 
                    Math.abs(b.sentimentScore || 0) * 0.3 +
                    (1 - (Date.now() - b.publishedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 0.2;
      
      return bScore - aScore;
    })
    .slice(0, limit);
}

/**
 * Validate news item data
 */
export function validateNewsItem(item: any): item is NewsItem {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.source === 'string' &&
    item.publishedAt instanceof Date &&
    Array.isArray(item.symbols)
  );
}

/**
 * Default sentiment configuration
 */
export const DEFAULT_SENTIMENT_CONFIG: SentimentConfig = {
  weightByRelevance: true,
  weightByRecency: true,
  weightBySource: true,
  minimumRelevanceScore: 0.1,
  maxArticleAge: 168, // 7 days
  sourceWeights: {
    'Reuters': 1.2,
    'Bloomberg': 1.2,
    'Wall Street Journal': 1.1,
    'CNBC': 1.0,
    'MarketWatch': 1.0,
    'Yahoo Finance': 0.9,
    'Seeking Alpha': 0.8,
    'Twitter': 0.6,
    'Reddit': 0.5
  }
};

export default {
  calculateTextSentiment,
  scoresToLabel,
  calculateRelevanceScore,
  calculateWeightedSentiment,
  analyzeSentimentTrend,
  calculateSentimentConfidence,
  generateSentimentBreakdown,
  assessMarketImpact,
  generateSentimentSummary,
  rankNewsByImportance,
  validateNewsItem,
  DEFAULT_SENTIMENT_CONFIG
};