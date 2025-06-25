import { 
  Quote, 
  Bar, 
  Ticker, 
  NewsArticle,
  TradingSignal,
  MarketSentiment,
  EconomicIndicator,
  CryptoQuote,
  MarketMover,
  SectorPerformance 
} from '../../types/index.js';

/**
 * Mock data generation configuration
 */
export interface MockDataConfig {
  volatility: 'low' | 'medium' | 'high';
  marketTrend: 'bull' | 'bear' | 'sideways';
  dataSize: 'small' | 'medium' | 'large';
  realism: 'basic' | 'advanced' | 'ultra';
  sectors: string[];
  cryptos: string[];
  timeZone: string;
}

/**
 * Market scenario for generating coherent data
 */
interface MarketScenario {
  name: string;
  description: string;
  marketTrend: 'bull' | 'bear' | 'sideways';
  volatility: number; // 0-1
  sectorRotation: { [sector: string]: number }; // -1 to 1
  newsEvents: Array<{
    type: 'earnings' | 'economic' | 'geopolitical' | 'sector';
    impact: 'positive' | 'negative' | 'neutral';
    magnitude: number; // 0-1
  }>;
}

/**
 * Advanced mock data generator with realistic market behavior
 * Generates coherent, time-series data for development and testing
 */
export class MockDataGenerator {
  private config: MockDataConfig;
  private currentScenario: MarketScenario;
  private baseDate: Date;
  private priceHistory: Map<string, number[]> = new Map();
  private marketState: {
    sentiment: number; // -1 to 1
    vix: number;
    volume: number;
    lastUpdate: Date;
  };

  constructor(config: Partial<MockDataConfig> = {}) {
    this.config = {
      volatility: config.volatility || 'medium',
      marketTrend: config.marketTrend || 'bull',
      dataSize: config.dataSize || 'medium',
      realism: config.realism || 'advanced',
      sectors: config.sectors || [
        'Technology', 'Healthcare', 'Financial Services',
        'Consumer Cyclical', 'Industrials', 'Energy'
      ],
      cryptos: config.cryptos || ['BTC', 'ETH', 'ADA', 'DOT', 'SOL'],
      timeZone: config.timeZone || 'America/New_York',
    };

    this.baseDate = new Date();
    this.currentScenario = this.generateMarketScenario();
    this.marketState = {
      sentiment: 0.1,
      vix: 20,
      volume: 1,
      lastUpdate: new Date(),
    };
  }

  /**
   * Generate realistic stock quote
   */
  generateQuote(symbol: string, basePrice?: number): Quote {
    const price = basePrice || this.getBasePriceForSymbol(symbol);
    const variation = this.calculatePriceVariation(symbol);
    const currentPrice = price * (1 + variation);
    
    const volume = this.generateVolume(symbol);
    const spread = this.calculateSpread(currentPrice);
    
    return {
      symbol,
      timestamp: new Date(),
      open: currentPrice * (1 + this.randomVariation(0.01)),
      high: currentPrice * (1 + Math.abs(this.randomVariation(0.02))),
      low: currentPrice * (1 - Math.abs(this.randomVariation(0.02))),
      close: currentPrice,
      volume,
      vwap: currentPrice * (1 + this.randomVariation(0.005)),
      trade_count: Math.floor(volume / 100) + Math.floor(Math.random() * 1000),
      bid: currentPrice - spread / 2,
      ask: currentPrice + spread / 2,
      bid_size: Math.floor(Math.random() * 1000) + 100,
      ask_size: Math.floor(Math.random() * 1000) + 100,
      spread,
      spread_percent: (spread / currentPrice) * 100,
    };
  }

  /**
   * Generate historical bar data
   */
  generateHistoricalBars(
    symbol: string,
    startDate: Date,
    endDate: Date,
    timeframe: Bar['timeframe'] = '1day'
  ): Bar[] {
    const bars: Bar[] = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    let currentPrice = basePrice;
    
    const interval = this.getIntervalMilliseconds(timeframe);
    let currentTime = new Date(startDate);
    
    while (currentTime <= endDate) {
      // Skip weekends for daily data
      if (timeframe === '1day' && this.isWeekend(currentTime)) {
        currentTime = new Date(currentTime.getTime() + interval);
        continue;
      }

      const dailyReturn = this.generateDailyReturn(symbol);
      currentPrice *= (1 + dailyReturn);
      
      const open = currentPrice * (1 + this.randomVariation(0.01));
      const close = currentPrice * (1 + this.randomVariation(0.01));
      const high = Math.max(open, close) * (1 + Math.abs(this.randomVariation(0.03)));
      const low = Math.min(open, close) * (1 - Math.abs(this.randomVariation(0.03)));
      
      bars.push({
        symbol,
        timestamp: new Date(currentTime),
        timeframe,
        open,
        high,
        low,
        close,
        volume: this.generateVolume(symbol, timeframe),
        trade_count: Math.floor(Math.random() * 10000) + 1000,
        vwap: (open + high + low + close) / 4,
      });
      
      currentTime = new Date(currentTime.getTime() + interval);
    }
    
    return bars;
  }

  /**
   * Generate realistic company/ticker data
   */
  generateTickers(count: number): Ticker[] {
    const tickers: Ticker[] = [];
    const exchanges = ['NYSE', 'NASDAQ', 'AMEX'];
    
    for (let i = 0; i < count; i++) {
      const symbol = this.generateSymbol();
      const sector = this.config.sectors[Math.floor(Math.random() * this.config.sectors.length)];
      
      tickers.push({
        symbol,
        name: this.generateCompanyName(symbol, sector),
        exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
        sector,
        industry: this.generateIndustry(sector),
        market_cap: this.generateMarketCap(),
        shares_outstanding: Math.floor(Math.random() * 10000000000) + 1000000000,
        country: 'US',
        currency: 'USD',
        is_active: Math.random() > 0.05, // 95% active
        last_updated: new Date(),
      });
    }
    
    return tickers;
  }

  /**
   * Generate realistic news articles
   */
  generateNewsArticles(symbols: string[], count: number = 10): NewsArticle[] {
    const articles: NewsArticle[] = [];
    const newsTypes = ['earnings', 'merger', 'product', 'regulatory', 'analyst', 'economic'];
    const sources = ['Reuters', 'Bloomberg', 'MarketWatch', 'Yahoo Finance', 'CNBC'];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const newsType = newsTypes[Math.floor(Math.random() * newsTypes.length)];
      const sentiment = this.generateSentiment();
      
      const article: NewsArticle = {
        title: this.generateNewsTitle(symbol, newsType, sentiment),
        summary: this.generateNewsSummary(symbol, newsType, sentiment),
        url: `https://example.com/news/${Date.now()}-${i}`,
        time_published: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Last 7 days
        authors: [this.generateAuthorName()],
        source: sources[Math.floor(Math.random() * sources.length)],
        category_within_source: 'Markets',
        source_domain: 'example.com',
        topics: [
          { topic: newsType.charAt(0).toUpperCase() + newsType.slice(1), relevance_score: '0.9' }
        ],
        overall_sentiment_score: sentiment.score,
        overall_sentiment_label: sentiment.label,
        ticker_sentiment: [{
          ticker: symbol,
          relevance_score: '0.95',
          ticker_sentiment_score: sentiment.score.toString(),
          ticker_sentiment_label: sentiment.label
        }],
      };
      
      articles.push(article);
    }
    
    return articles.sort((a, b) => 
      new Date(b.time_published).getTime() - new Date(a.time_published).getTime()
    );
  }

  /**
   * Generate trading signals
   */
  generateTradingSignals(symbols: string[], count: number = 5): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    for (let i = 0; i < count; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const quote = this.generateQuote(symbol);
      const action = this.generateSignalAction();
      const confidence = this.generateConfidence(action);
      
      signals.push({
        symbol,
        action,
        confidence,
        price: quote.close,
        timestamp: new Date(Date.now() - Math.random() * 3600000), // Last hour
        reasoning: this.generateSignalReasoning(action, symbol),
        indicators: {
          rsi: Math.random() * 100,
          ma_short: quote.close * (1 + this.randomVariation(0.02)),
          ma_long: quote.close * (1 + this.randomVariation(0.05)),
        },
        sentiment: {
          score: this.randomVariation(1),
          news_count: Math.floor(Math.random() * 20) + 1,
          articles: [],
        },
      });
    }
    
    return signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate market sentiment data
   */
  generateMarketSentiment(): MarketSentiment {
    const fearGreedIndex = Math.floor(Math.random() * 100);
    let sentiment: MarketSentiment['overall_sentiment'];
    
    if (fearGreedIndex < 25) sentiment = 'extreme_fear';
    else if (fearGreedIndex < 45) sentiment = 'fear';
    else if (fearGreedIndex < 55) sentiment = 'neutral';
    else if (fearGreedIndex < 75) sentiment = 'greed';
    else sentiment = 'extreme_greed';
    
    return {
      date: new Date(),
      fear_greed_index: fearGreedIndex,
      vix: 15 + Math.random() * 30, // VIX typically 15-45
      put_call_ratio: 0.5 + Math.random() * 1, // 0.5-1.5 typical range
      margin_debt: Math.floor(Math.random() * 500000000000) + 500000000000,
      insider_trading_ratio: Math.random() * 0.1,
      safe_haven_demand: Math.random() * 100,
      stock_price_momentum: -50 + Math.random() * 100,
      market_volatility: 10 + Math.random() * 40,
      overall_sentiment: sentiment,
    };
  }

  /**
   * Generate cryptocurrency quotes
   */
  generateCryptoQuotes(count: number = 5): CryptoQuote[] {
    const cryptos = [
      { symbol: 'BTC-USD', name: 'Bitcoin', price: 45000 },
      { symbol: 'ETH-USD', name: 'Ethereum', price: 3000 },
      { symbol: 'ADA-USD', name: 'Cardano', price: 1.2 },
      { symbol: 'DOT-USD', name: 'Polkadot', price: 25 },
      { symbol: 'SOL-USD', name: 'Solana', price: 120 },
    ];
    
    return cryptos.slice(0, count).map(crypto => {
      const variation = this.randomVariation(0.05); // 5% max variation
      const price = crypto.price * (1 + variation);
      
      return {
        symbol: crypto.symbol,
        base_currency: crypto.symbol.split('-')[0],
        quote_currency: 'USD',
        price,
        volume_24h: Math.floor(Math.random() * 1000000000) + 100000000,
        market_cap: price * (Math.floor(Math.random() * 100000000) + 10000000),
        circulating_supply: Math.floor(Math.random() * 1000000000) + 100000000,
        total_supply: Math.floor(Math.random() * 1000000000) + 100000000,
        max_supply: Math.random() > 0.5 ? Math.floor(Math.random() * 1000000000) + 1000000000 : null,
        change_24h: this.randomVariation(0.1) * 100,
        change_7d: this.randomVariation(0.2) * 100,
        change_30d: this.randomVariation(0.3) * 100,
        ath: price * (1 + Math.random() * 2), // ATH is higher
        ath_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        atl: price * (0.1 + Math.random() * 0.4), // ATL is much lower
        atl_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        timestamp: new Date(),
      };
    });
  }

  /**
   * Generate market movers
   */
  generateMarketMovers(): { gainers: MarketMover[]; losers: MarketMover[] } {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
    const gainers: MarketMover[] = [];
    const losers: MarketMover[] = [];
    
    symbols.forEach(symbol => {
      const quote = this.generateQuote(symbol);
      const change = this.randomVariation(0.15); // ±15% max
      const changePercent = change * 100;
      
      const mover: MarketMover = {
        symbol,
        name: this.getCompanyNameForSymbol(symbol),
        price: quote.close,
        change: quote.close * change,
        change_percent: changePercent,
        volume: quote.volume,
        avg_volume: quote.volume * (0.8 + Math.random() * 0.4),
        volume_ratio: 0.8 + Math.random() * 0.4,
        market_cap: Math.floor(Math.random() * 2000000000000) + 100000000000,
        reason: this.generateMoverReason(changePercent > 0),
        category: Math.abs(changePercent) > 5 ? 
          (changePercent > 0 ? 'gainer' : 'loser') : 'active',
      };
      
      if (changePercent > 2) {
        gainers.push(mover);
      } else if (changePercent < -2) {
        losers.push(mover);
      }
    });
    
    return {
      gainers: gainers.sort((a, b) => b.change_percent - a.change_percent).slice(0, 5),
      losers: losers.sort((a, b) => a.change_percent - b.change_percent).slice(0, 5),
    };
  }

  /**
   * Generate sector performance
   */
  generateSectorPerformance(): SectorPerformance[] {
    return this.config.sectors.map(sector => {
      const performance = this.currentScenario.sectorRotation[sector] || this.randomVariation(0.1);
      
      return {
        sector,
        current_return: performance * 100,
        one_day_return: this.randomVariation(0.03) * 100,
        one_week_return: this.randomVariation(0.05) * 100,
        one_month_return: this.randomVariation(0.1) * 100,
        three_month_return: this.randomVariation(0.15) * 100,
        ytd_return: this.randomVariation(0.2) * 100,
        one_year_return: this.randomVariation(0.25) * 100,
        market_cap: Math.floor(Math.random() * 5000000000000) + 1000000000000,
        pe_ratio: 15 + Math.random() * 20,
        dividend_yield: Math.random() * 5,
        top_performers: ['STOCK1', 'STOCK2', 'STOCK3'],
        worst_performers: ['STOCK4', 'STOCK5', 'STOCK6'],
      };
    });
  }

  // Private helper methods
  private generateMarketScenario(): MarketScenario {
    const scenarios: MarketScenario[] = [
      {
        name: 'Bull Market Rally',
        description: 'Strong economic growth driving markets higher',
        marketTrend: 'bull',
        volatility: 0.3,
        sectorRotation: { 'Technology': 0.15, 'Energy': -0.05, 'Healthcare': 0.08 },
        newsEvents: [
          { type: 'economic', impact: 'positive', magnitude: 0.8 },
          { type: 'earnings', impact: 'positive', magnitude: 0.6 }
        ]
      },
      {
        name: 'Market Correction',
        description: 'Profit-taking and uncertainty causing selloff',
        marketTrend: 'bear',
        volatility: 0.7,
        sectorRotation: { 'Technology': -0.12, 'Energy': 0.05, 'Healthcare': -0.03 },
        newsEvents: [
          { type: 'economic', impact: 'negative', magnitude: 0.7 },
          { type: 'geopolitical', impact: 'negative', magnitude: 0.5 }
        ]
      },
      {
        name: 'Sideways Trading',
        description: 'Mixed signals keeping markets range-bound',
        marketTrend: 'sideways',
        volatility: 0.4,
        sectorRotation: { 'Technology': 0.02, 'Energy': -0.01, 'Healthcare': 0.01 },
        newsEvents: [
          { type: 'earnings', impact: 'neutral', magnitude: 0.3 }
        ]
      }
    ];
    
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  private calculatePriceVariation(symbol: string): number {
    const trendFactor = this.currentScenario.marketTrend === 'bull' ? 0.002 : 
                       this.currentScenario.marketTrend === 'bear' ? -0.002 : 0;
    const volatilityFactor = this.getVolatilityMultiplier();
    const randomFactor = this.randomVariation(0.01 * volatilityFactor);
    
    return trendFactor + randomFactor;
  }

  private getVolatilityMultiplier(): number {
    switch (this.config.volatility) {
      case 'low': return 0.5;
      case 'high': return 2.0;
      default: return 1.0;
    }
  }

  private randomVariation(magnitude: number): number {
    return (Math.random() - 0.5) * 2 * magnitude;
  }

  private getBasePriceForSymbol(symbol: string): number {
    const basePrices: { [key: string]: number } = {
      'AAPL': 180, 'GOOGL': 140, 'MSFT': 350, 'AMZN': 150,
      'TSLA': 250, 'META': 300, 'NVDA': 800, 'NFLX': 400,
    };
    return basePrices[symbol] || (50 + Math.random() * 200);
  }

  private generateVolume(symbol: string, timeframe: Bar['timeframe'] = '1day'): number {
    const baseVolume = this.getBaseVolumeForSymbol(symbol);
    const timeframeFactor = timeframe === '1day' ? 1 : 
                           timeframe === '1hour' ? 0.04 : 0.1;
    const variation = 0.5 + Math.random(); // 0.5x to 1.5x variation
    
    return Math.floor(baseVolume * timeframeFactor * variation);
  }

  private getBaseVolumeForSymbol(symbol: string): number {
    const baseVolumes: { [key: string]: number } = {
      'AAPL': 80000000, 'GOOGL': 25000000, 'MSFT': 40000000, 'AMZN': 35000000,
      'TSLA': 100000000, 'META': 30000000, 'NVDA': 50000000, 'NFLX': 15000000,
    };
    return baseVolumes[symbol] || (1000000 + Math.random() * 10000000);
  }

  private calculateSpread(price: number): number {
    return price * (0.0001 + Math.random() * 0.0005); // 0.01% to 0.05% spread
  }

  private generateDailyReturn(symbol: string): number {
    const marketReturn = this.currentScenario.marketTrend === 'bull' ? 0.001 :
                        this.currentScenario.marketTrend === 'bear' ? -0.001 : 0;
    const volatility = this.currentScenario.volatility * 0.02;
    
    return marketReturn + this.randomVariation(volatility);
  }

  private getIntervalMilliseconds(timeframe: Bar['timeframe']): number {
    const intervals = {
      '1min': 60 * 1000,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '30min': 30 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '4hour': 4 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000,
      '1month': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[timeframe] || intervals['1day'];
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private generateSymbol(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const length = 3 + Math.floor(Math.random() * 2); // 3-4 characters
    let symbol = '';
    
    for (let i = 0; i < length; i++) {
      symbol += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    return symbol;
  }

  private generateCompanyName(symbol: string, sector: string): string {
    const prefixes = ['Advanced', 'Global', 'International', 'United', 'First', 'Next'];
    const suffixes = ['Corp', 'Inc', 'LLC', 'Technologies', 'Solutions', 'Systems'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${symbol} ${suffix}`;
  }

  private generateIndustry(sector: string): string {
    const industries: { [key: string]: string[] } = {
      'Technology': ['Software', 'Hardware', 'Semiconductors', 'Cloud Computing'],
      'Healthcare': ['Pharmaceuticals', 'Medical Devices', 'Biotechnology', 'Healthcare Services'],
      'Financial Services': ['Banks', 'Insurance', 'Investment Management', 'Real Estate'],
      'Energy': ['Oil & Gas', 'Renewable Energy', 'Utilities', 'Coal'],
      'Consumer Cyclical': ['Retail', 'Automotive', 'Media', 'Hotels & Restaurants'],
      'Industrials': ['Manufacturing', 'Aerospace', 'Construction', 'Transportation'],
    };
    
    const sectorIndustries = industries[sector] || ['General'];
    return sectorIndustries[Math.floor(Math.random() * sectorIndustries.length)];
  }

  private generateMarketCap(): number {
    // Generate market cap between 100M and 3T
    const minCap = 100000000; // 100M
    const maxCap = 3000000000000; // 3T
    
    return Math.floor(Math.random() * (maxCap - minCap)) + minCap;
  }

  private generateSentiment(): { score: number; label: NewsArticle['overall_sentiment_label'] } {
    const score = this.randomVariation(0.8);
    let label: NewsArticle['overall_sentiment_label'];
    
    if (score < -0.4) label = 'Bearish';
    else if (score < -0.1) label = 'Somewhat-Bearish';
    else if (score < 0.1) label = 'Neutral';
    else if (score < 0.4) label = 'Somewhat-Bullish';
    else label = 'Bullish';
    
    return { score, label };
  }

  private generateNewsTitle(symbol: string, type: string, sentiment: any): string {
    const titles: { [key: string]: string[] } = {
      earnings: [
        `${symbol} Reports ${sentiment.score > 0 ? 'Strong' : 'Disappointing'} Q4 Earnings`,
        `${symbol} ${sentiment.score > 0 ? 'Beats' : 'Misses'} Revenue Expectations`,
      ],
      merger: [
        `${symbol} Announces ${sentiment.score > 0 ? 'Strategic' : 'Challenging'} Acquisition`,
        `Merger Talks ${sentiment.score > 0 ? 'Progress' : 'Stall'} for ${symbol}`,
      ],
      analyst: [
        `Analysts ${sentiment.score > 0 ? 'Upgrade' : 'Downgrade'} ${symbol} Price Target`,
        `${symbol} Receives ${sentiment.score > 0 ? 'Buy' : 'Sell'} Rating from Major Bank`,
      ],
    };
    
    const typeTemplates = titles[type] || [`${symbol} Makes Headlines`];
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
  }

  private generateNewsSummary(symbol: string, type: string, sentiment: any): string {
    return `${symbol} stock ${sentiment.score > 0 ? 'rises' : 'falls'} on ${type} news. ` +
           `Analysts remain ${sentiment.score > 0 ? 'optimistic' : 'cautious'} about the company's outlook.`;
  }

  private generateAuthorName(): string {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private generateSignalAction(): TradingSignal['action'] {
    const actions: TradingSignal['action'][] = ['BUY', 'SELL', 'HOLD'];
    const weights = [0.4, 0.3, 0.3]; // Slightly favor BUY signals
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < actions.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return actions[i];
      }
    }
    
    return 'HOLD';
  }

  private generateConfidence(action: TradingSignal['action']): number {
    // Higher confidence for HOLD signals, moderate for others
    const baseConfidence = action === 'HOLD' ? 0.7 : 0.6;
    return Math.min(1, baseConfidence + Math.random() * 0.3);
  }

  private generateSignalReasoning(action: TradingSignal['action'], symbol: string): string {
    const reasonings: { [key: string]: string[] } = {
      BUY: [
        `Strong technical indicators suggest upward momentum for ${symbol}`,
        `Positive earnings outlook and favorable market conditions`,
        `Support level holds strong with increasing volume`,
      ],
      SELL: [
        `Technical indicators show overbought conditions for ${symbol}`,
        `Resistance level reached with declining volume`,
        `Market sentiment turning negative amid economic concerns`,
      ],
      HOLD: [
        `Mixed signals suggest waiting for clearer direction`,
        `Current price levels appear fairly valued`,
        `Awaiting key earnings announcement before taking position`,
      ],
    };
    
    const options = reasonings[action] || [`Neutral outlook for ${symbol}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateMoverReason(isPositive: boolean): string {
    const reasons = isPositive ? [
      'Strong earnings report',
      'Analyst upgrade',
      'Product launch announcement',
      'Strategic partnership',
    ] : [
      'Disappointing earnings',
      'Analyst downgrade',
      'Regulatory concerns',
      'Market selloff',
    ];
    
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private getCompanyNameForSymbol(symbol: string): string {
    const names: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla, Inc.',
      'META': 'Meta Platforms, Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix, Inc.',
    };
    
    return names[symbol] || `${symbol} Corporation`;
  }
}