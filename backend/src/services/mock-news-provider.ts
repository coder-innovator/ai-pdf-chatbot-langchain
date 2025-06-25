/**
 * Mock News Provider Service
 * Generates realistic financial news data for sentiment analysis testing
 */

import { 
  NewsItem, 
  calculateTextSentiment, 
  calculateRelevanceScore,
  scoresToLabel 
} from '../utils/sentiment-calculator.js';

/**
 * News generation configuration
 */
export interface NewsGenerationConfig {
  daysBack: number;
  articlesPerDay: number;
  sentimentBias: 'positive' | 'negative' | 'neutral' | 'mixed';
  includeMarketEvents: boolean;
  sources: string[];
}

/**
 * Market event types
 */
export type MarketEventType = 
  | 'earnings' 
  | 'merger' 
  | 'ipo' 
  | 'dividend' 
  | 'analyst_upgrade' 
  | 'analyst_downgrade'
  | 'product_launch'
  | 'regulatory'
  | 'partnership'
  | 'lawsuit';

/**
 * News template for generation
 */
export interface NewsTemplate {
  titleTemplates: string[];
  contentTemplates: string[];
  sentimentBias: 'positive' | 'negative' | 'neutral';
  eventType?: MarketEventType;
  relevanceBoost: number;
}

/**
 * Mock News Provider Class
 */
export class MockNewsProvider {
  private newsTemplates: NewsTemplate[];
  private companyNames: { [ticker: string]: string };
  private sources: string[];
  
  constructor() {
    this.initializeTemplates();
    this.initializeCompanyNames();
    this.sources = [
      'Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance',
      'Wall Street Journal', 'Financial Times', 'Seeking Alpha', 'The Motley Fool',
      'Benzinga', 'TechCrunch', 'Forbes', 'Business Insider'
    ];
  }

  /**
   * Generate news items for a specific ticker
   */
  generateNewsForTicker(
    ticker: string, 
    config: Partial<NewsGenerationConfig> = {}
  ): NewsItem[] {
    const defaultConfig: NewsGenerationConfig = {
      daysBack: 7,
      articlesPerDay: 3,
      sentimentBias: 'mixed',
      includeMarketEvents: true,
      sources: this.sources
    };

    const finalConfig = { ...defaultConfig, ...config };
    const newsItems: NewsItem[] = [];
    const totalArticles = finalConfig.daysBack * finalConfig.articlesPerDay;

    for (let i = 0; i < totalArticles; i++) {
      const newsItem = this.generateSingleNewsItem(ticker, finalConfig, i);
      newsItems.push(newsItem);
    }

    return newsItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  /**
   * Generate news for multiple tickers
   */
  generatePortfolioNews(
    tickers: string[], 
    config: Partial<NewsGenerationConfig> = {}
  ): { [ticker: string]: NewsItem[] } {
    const portfolioNews: { [ticker: string]: NewsItem[] } = {};
    
    for (const ticker of tickers) {
      portfolioNews[ticker] = this.generateNewsForTicker(ticker, config);
    }
    
    return portfolioNews;
  }

  /**
   * Generate market-wide news
   */
  generateMarketNews(config: Partial<NewsGenerationConfig> = {}): NewsItem[] {
    const marketTickers = ['SPY', 'QQQ', 'MARKET', 'ECONOMY'];
    const allNews: NewsItem[] = [];
    
    for (const ticker of marketTickers) {
      const tickerNews = this.generateNewsForTicker(ticker, {
        ...config,
        articlesPerDay: 2
      });
      allNews.push(...tickerNews);
    }
    
    return allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  /**
   * Generate trending news (high volume, high sentiment)
   */
  generateTrendingNews(ticker: string, sentiment: 'positive' | 'negative'): NewsItem[] {
    const config: Partial<NewsGenerationConfig> = {
      daysBack: 2,
      articlesPerDay: 8,
      sentimentBias: sentiment,
      includeMarketEvents: true
    };
    
    return this.generateNewsForTicker(ticker, config);
  }

  /**
   * Generate crisis scenario news
   */
  generateCrisisNews(ticker: string): NewsItem[] {
    const crisisTemplates = this.newsTemplates.filter(t => 
      t.sentimentBias === 'negative' && 
      ['regulatory', 'lawsuit', 'analyst_downgrade'].includes(t.eventType!)
    );
    
    const newsItems: NewsItem[] = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const template = crisisTemplates[Math.floor(Math.random() * crisisTemplates.length)];
      const publishedAt = new Date(now.getTime() - (i * 2 * 60 * 60 * 1000)); // Every 2 hours
      
      const newsItem = this.createNewsFromTemplate(ticker, template, publishedAt, i);
      newsItems.push(newsItem);
    }
    
    return newsItems;
  }

  /**
   * Generate earnings season news
   */
  generateEarningsNews(ticker: string, beatExpectations: boolean): NewsItem[] {
    const earningsTemplates = this.newsTemplates.filter(t => t.eventType === 'earnings');
    const relevantTemplates = earningsTemplates.filter(t => 
      beatExpectations ? t.sentimentBias === 'positive' : t.sentimentBias === 'negative'
    );
    
    const newsItems: NewsItem[] = [];
    const now = new Date();
    
    // Pre-earnings coverage
    for (let i = 0; i < 3; i++) {
      const neutralTemplate = this.newsTemplates.find(t => 
        t.eventType === 'earnings' && t.sentimentBias === 'neutral'
      )!;
      
      const publishedAt = new Date(now.getTime() - ((i + 2) * 24 * 60 * 60 * 1000));
      newsItems.push(this.createNewsFromTemplate(ticker, neutralTemplate, publishedAt, i));
    }
    
    // Earnings announcement and reaction
    for (let i = 0; i < 5; i++) {
      const template = relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)];
      const publishedAt = new Date(now.getTime() - (i * 4 * 60 * 60 * 1000)); // Every 4 hours
      
      newsItems.push(this.createNewsFromTemplate(ticker, template, publishedAt, i + 10));
    }
    
    return newsItems;
  }

  // Private helper methods

  private generateSingleNewsItem(
    ticker: string, 
    config: NewsGenerationConfig, 
    index: number
  ): NewsItem {
    // Calculate publication time
    const hoursBack = Math.floor(index / config.articlesPerDay) * 24 + 
                     (index % config.articlesPerDay) * (24 / config.articlesPerDay) +
                     Math.random() * (24 / config.articlesPerDay);
    
    const publishedAt = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    
    // Select template based on sentiment bias
    const availableTemplates = this.getTemplatesBySentimentBias(config.sentimentBias);
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    
    return this.createNewsFromTemplate(ticker, template, publishedAt, index);
  }

  private createNewsFromTemplate(
    ticker: string, 
    template: NewsTemplate, 
    publishedAt: Date, 
    index: number
  ): NewsItem {
    const companyName = this.companyNames[ticker] || ticker;
    const source = this.sources[Math.floor(Math.random() * this.sources.length)];
    
    // Generate title
    const titleTemplate = template.titleTemplates[
      Math.floor(Math.random() * template.titleTemplates.length)
    ];
    const title = this.fillTemplate(titleTemplate, ticker, companyName);
    
    // Generate content
    const contentTemplate = template.contentTemplates[
      Math.floor(Math.random() * template.contentTemplates.length)
    ];
    const content = this.fillTemplate(contentTemplate, ticker, companyName);
    
    // Calculate sentiment
    const sentimentScore = calculateTextSentiment(`${title} ${content}`);
    const sentimentLabel = scoresToLabel(sentimentScore);
    
    // Create news item
    const newsItem: NewsItem = {
      id: `news_${ticker}_${index}_${Date.now()}`,
      title,
      content,
      summary: content.substring(0, 200) + '...',
      source,
      url: `https://${source.toLowerCase().replace(/\s+/g, '')}.com/article/${index}`,
      publishedAt,
      symbols: [ticker],
      sentimentScore,
      sentimentLabel,
      relevanceScore: 0.7 + (template.relevanceBoost * 0.3) + (Math.random() * 0.2),
      impact: this.calculateImpact(sentimentScore, template.relevanceBoost),
      category: template.eventType || 'general',
      author: this.generateAuthorName()
    };
    
    // Update relevance score properly
    newsItem.relevanceScore = calculateRelevanceScore(newsItem, ticker);
    
    return newsItem;
  }

  private fillTemplate(template: string, ticker: string, companyName: string): string {
    const variations = {
      '{COMPANY}': [companyName, ticker, `${companyName} (${ticker})`],
      '{TICKER}': [ticker],
      '{PRICE}': [this.generatePrice()],
      '{PERCENTAGE}': [this.generatePercentage()],
      '{QUARTER}': ['Q1', 'Q2', 'Q3', 'Q4'],
      '{YEAR}': ['2024', '2023'],
      '{ANALYST}': ['Morgan Stanley', 'Goldman Sachs', 'JP Morgan', 'Bank of America', 'Wells Fargo'],
      '{AMOUNT}': [this.generateAmount()],
      '{PRODUCT}': ['new product', 'innovative solution', 'breakthrough technology'],
      '{METRIC}': ['revenue', 'earnings', 'market share', 'user growth', 'profitability']
    };
    
    let filled = template;
    for (const [placeholder, options] of Object.entries(variations)) {
      const randomOption = options[Math.floor(Math.random() * options.length)];
      filled = filled.replace(new RegExp(placeholder, 'g'), randomOption);
    }
    
    return filled;
  }

  private getTemplatesBySentimentBias(bias: string): NewsTemplate[] {
    switch (bias) {
      case 'positive':
        return this.newsTemplates.filter(t => t.sentimentBias === 'positive');
      case 'negative':
        return this.newsTemplates.filter(t => t.sentimentBias === 'negative');
      case 'neutral':
        return this.newsTemplates.filter(t => t.sentimentBias === 'neutral');
      case 'mixed':
      default:
        return this.newsTemplates;
    }
  }

  private calculateImpact(sentimentScore: number, relevanceBoost: number): 'High' | 'Medium' | 'Low' {
    const impactScore = Math.abs(sentimentScore) + relevanceBoost;
    if (impactScore > 0.7) return 'High';
    if (impactScore > 0.4) return 'Medium';
    return 'Low';
  }

  private generatePrice(): string {
    return `$${(50 + Math.random() * 200).toFixed(2)}`;
  }

  private generatePercentage(): string {
    const value = (Math.random() * 10 - 5).toFixed(1);
    return `${value >= 0 ? '+' : ''}${value}%`;
  }

  private generateAmount(): string {
    const billions = (Math.random() * 50 + 1).toFixed(1);
    return `$${billions}B`;
  }

  private generateAuthorName(): string {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Lisa', 'Robert', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private initializeCompanyNames(): void {
    this.companyNames = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.',
      'NVDA': 'NVIDIA Corporation',
      'ORCL': 'Oracle Corporation',
      'CRM': 'Salesforce.com Inc.',
      'SPY': 'SPDR S&P 500 ETF',
      'QQQ': 'Invesco QQQ Trust',
      'MARKET': 'Market',
      'ECONOMY': 'Economy'
    };
  }

  private initializeTemplates(): void {
    this.newsTemplates = [
      // Positive earnings templates
      {
        titleTemplates: [
          '{COMPANY} Reports Strong {QUARTER} Earnings, Beats Expectations',
          '{TICKER} Surges After Impressive {QUARTER} Results',
          '{COMPANY} Posts Record {QUARTER} Revenue of {AMOUNT}'
        ],
        contentTemplates: [
          '{COMPANY} announced strong {QUARTER} earnings today, beating analyst expectations. Revenue increased significantly driven by strong demand. The company raised its full-year guidance.',
          '{COMPANY} delivered outstanding {QUARTER} results with {METRIC} growing substantially. Management expressed optimism about future prospects and market opportunities.',
          'Impressive {QUARTER} performance from {COMPANY} with revenue of {AMOUNT} exceeding forecasts. The company continues to execute on its strategic initiatives.'
        ],
        sentimentBias: 'positive',
        eventType: 'earnings',
        relevanceBoost: 0.9
      },
      
      // Negative earnings templates
      {
        titleTemplates: [
          '{COMPANY} Misses {QUARTER} Expectations, Stock Falls',
          '{TICKER} Disappoints with Weak {QUARTER} Results',
          '{COMPANY} Reports Declining {QUARTER} Revenue'
        ],
        contentTemplates: [
          '{COMPANY} reported disappointing {QUARTER} results that missed analyst expectations. Revenue declined and the company lowered its guidance for the year.',
          'Weak {QUARTER} performance from {COMPANY} with {METRIC} falling short of projections. Management cited challenging market conditions.',
          '{COMPANY} struggled in {QUARTER} with revenue dropping and margin pressure affecting profitability. Investors are concerned about the outlook.'
        ],
        sentimentBias: 'negative',
        eventType: 'earnings',
        relevanceBoost: 0.9
      },
      
      // Analyst upgrades
      {
        titleTemplates: [
          '{ANALYST} Upgrades {TICKER} with Bullish Outlook',
          '{COMPANY} Gets Price Target Increase from {ANALYST}',
          'Analysts Turn Bullish on {TICKER} Following Strong Performance'
        ],
        contentTemplates: [
          '{ANALYST} upgraded {COMPANY} today, citing strong fundamentals and positive market trends. The price target was raised to {PRICE}.',
          'Following recent developments, {ANALYST} raised their rating on {TICKER} with increased confidence in the company\'s strategy.',
          'Analysts are optimistic about {COMPANY}\'s prospects, with {ANALYST} leading the charge with an upgrade and higher price target.'
        ],
        sentimentBias: 'positive',
        eventType: 'analyst_upgrade',
        relevanceBoost: 0.7
      },
      
      // Product launches
      {
        titleTemplates: [
          '{COMPANY} Unveils Revolutionary {PRODUCT}',
          '{TICKER} Stock Rises on {PRODUCT} Launch',
          '{COMPANY} Introduces Game-Changing {PRODUCT}'
        ],
        contentTemplates: [
          '{COMPANY} today announced the launch of their latest {PRODUCT}, featuring innovative technology that could disrupt the market.',
          'The new {PRODUCT} from {COMPANY} has generated significant excitement in the industry with its advanced features and capabilities.',
          '{COMPANY}\'s {PRODUCT} launch represents a major milestone in their product roadmap and positions them well for future growth.'
        ],
        sentimentBias: 'positive',
        eventType: 'product_launch',
        relevanceBoost: 0.6
      },
      
      // Regulatory issues
      {
        titleTemplates: [
          '{COMPANY} Faces Regulatory Scrutiny Over Practices',
          'Regulators Investigate {TICKER} Business Model',
          '{COMPANY} Under Investigation by Authorities'
        ],
        contentTemplates: [
          'Regulatory authorities have launched an investigation into {COMPANY}\'s business practices, raising concerns among investors.',
          '{COMPANY} is facing increased regulatory scrutiny that could impact their operations and growth prospects.',
          'The investigation into {COMPANY} by regulators has created uncertainty about the company\'s future regulatory environment.'
        ],
        sentimentBias: 'negative',
        eventType: 'regulatory',
        relevanceBoost: 0.8
      },
      
      // Partnership news
      {
        titleTemplates: [
          '{COMPANY} Announces Strategic Partnership',
          '{TICKER} Teams Up for Major Collaboration',
          '{COMPANY} Enters Strategic Alliance'
        ],
        contentTemplates: [
          '{COMPANY} announced a strategic partnership today that is expected to accelerate growth and expand market reach.',
          'The new collaboration between {COMPANY} and partners will create synergies and unlock new opportunities.',
          '{COMPANY}\'s strategic alliance represents a significant step forward in their expansion strategy.'
        ],
        sentimentBias: 'positive',
        eventType: 'partnership',
        relevanceBoost: 0.5
      },
      
      // General market news
      {
        titleTemplates: [
          '{COMPANY} Stock Moves on Market Volatility',
          '{TICKER} Reacts to Sector Trends',
          'Market Conditions Impact {COMPANY} Trading'
        ],
        contentTemplates: [
          '{COMPANY} shares moved in line with broader market trends as investors assessed current market conditions.',
          'Trading in {TICKER} reflected sector-wide movements amid ongoing market volatility and economic uncertainty.',
          '{COMPANY} stock performance today was influenced by general market sentiment and sector dynamics.'
        ],
        sentimentBias: 'neutral',
        relevanceBoost: 0.3
      }
    ];
  }
}

/**
 * Factory function to create MockNewsProvider
 */
export function createMockNewsProvider(): MockNewsProvider {
  return new MockNewsProvider();
}

/**
 * Quick news generation utilities
 */
export const QuickNews = {
  /**
   * Generate simple positive news
   */
  positive(ticker: string, count: number = 5): NewsItem[] {
    const provider = new MockNewsProvider();
    return provider.generateNewsForTicker(ticker, {
      daysBack: Math.ceil(count / 3),
      articlesPerDay: 3,
      sentimentBias: 'positive'
    }).slice(0, count);
  },

  /**
   * Generate simple negative news
   */
  negative(ticker: string, count: number = 5): NewsItem[] {
    const provider = new MockNewsProvider();
    return provider.generateNewsForTicker(ticker, {
      daysBack: Math.ceil(count / 3),
      articlesPerDay: 3,
      sentimentBias: 'negative'
    }).slice(0, count);
  },

  /**
   * Generate mixed sentiment news
   */
  mixed(ticker: string, count: number = 10): NewsItem[] {
    const provider = new MockNewsProvider();
    return provider.generateNewsForTicker(ticker, {
      daysBack: Math.ceil(count / 3),
      articlesPerDay: 3,
      sentimentBias: 'mixed'
    }).slice(0, count);
  },

  /**
   * Generate earnings-focused news
   */
  earnings(ticker: string, positive: boolean = true): NewsItem[] {
    const provider = new MockNewsProvider();
    return provider.generateEarningsNews(ticker, positive);
  }
};

export default MockNewsProvider;