/**
 * Mock Data Generator for Technical Analysis
 * Generates realistic financial market data for testing and development
 */

import { MarketDataPoint } from '../utils/technical-calculations.js';

/**
 * Market simulation parameters
 */
export interface MarketSimulationParams {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialPrice: number;
  volatility: number; // Daily volatility (0.01 = 1%)
  trend: number; // Annual trend (-0.5 to 0.5)
  intervals: 'daily' | 'hourly' | 'minute';
}

/**
 * Price pattern types for simulation
 */
export type PricePattern = 
  | 'trending_up' 
  | 'trending_down' 
  | 'sideways' 
  | 'volatile' 
  | 'breakout' 
  | 'reversal' 
  | 'gap_up' 
  | 'gap_down';

/**
 * Technical pattern configuration
 */
export interface TechnicalPatternConfig {
  pattern: PricePattern;
  duration: number; // Number of periods
  intensity: number; // 0.1 to 1.0
}

/**
 * Market regime types
 */
export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'volatile';

/**
 * Mock Data Generator Class
 */
export class MockDataGenerator {
  private random: () => number;
  
  constructor(seed?: number) {
    // Simple seeded random number generator for reproducible results
    if (seed !== undefined) {
      let currentSeed = seed;
      this.random = () => {
        currentSeed = (currentSeed * 9301 + 49297) % 233280;
        return currentSeed / 233280;
      };
    } else {
      this.random = Math.random;
    }
  }

  /**
   * Generate realistic market data based on parameters
   */
  generateMarketData(params: MarketSimulationParams): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    const { symbol, startDate, endDate, initialPrice, volatility, trend, intervals } = params;
    
    // Calculate time step based on interval
    const timeStep = this.getTimeStep(intervals);
    const totalPeriods = Math.floor((endDate.getTime() - startDate.getTime()) / timeStep);
    
    let currentPrice = initialPrice;
    let currentDate = new Date(startDate);
    
    // Generate base price series
    for (let i = 0; i < totalPeriods; i++) {
      const dataPoint = this.generateSingleDataPoint(
        symbol,
        new Date(currentDate),
        currentPrice,
        volatility,
        trend,
        intervals
      );
      
      data.push(dataPoint);
      currentPrice = dataPoint.close;
      currentDate = new Date(currentDate.getTime() + timeStep);
    }
    
    return data;
  }

  /**
   * Generate data with specific technical patterns
   */
  generatePatternedData(
    baseParams: MarketSimulationParams,
    patterns: TechnicalPatternConfig[]
  ): MarketDataPoint[] {
    let data = this.generateMarketData(baseParams);
    
    // Apply each pattern
    for (const patternConfig of patterns) {
      data = this.applyPattern(data, patternConfig);
    }
    
    return data;
  }

  /**
   * Generate data for specific market regime
   */
  generateRegimeData(
    baseParams: MarketSimulationParams,
    regime: MarketRegime
  ): MarketDataPoint[] {
    const modifiedParams = { ...baseParams };
    
    // Adjust parameters based on regime
    switch (regime) {
      case 'bull':
        modifiedParams.trend = Math.abs(modifiedParams.trend) * 2;
        modifiedParams.volatility *= 0.8;
        break;
      case 'bear':
        modifiedParams.trend = -Math.abs(modifiedParams.trend) * 2;
        modifiedParams.volatility *= 1.2;
        break;
      case 'sideways':
        modifiedParams.trend *= 0.1;
        modifiedParams.volatility *= 0.6;
        break;
      case 'volatile':
        modifiedParams.volatility *= 2.5;
        break;
    }
    
    return this.generateMarketData(modifiedParams);
  }

  /**
   * Generate sample data for popular stocks
   */
  generateSampleStockData(
    symbol: 'AAPL' | 'GOOGL' | 'MSFT' | 'TSLA' | 'SPY',
    days: number = 252
  ): MarketDataPoint[] {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const stockParams: { [key: string]: Partial<MarketSimulationParams> } = {
      AAPL: { initialPrice: 150, volatility: 0.025, trend: 0.12 },
      GOOGL: { initialPrice: 2800, volatility: 0.028, trend: 0.08 },
      MSFT: { initialPrice: 300, volatility: 0.022, trend: 0.15 },
      TSLA: { initialPrice: 800, volatility: 0.045, trend: 0.20 },
      SPY: { initialPrice: 420, volatility: 0.018, trend: 0.10 }
    };
    
    const params: MarketSimulationParams = {
      symbol,
      startDate,
      endDate,
      intervals: 'daily',
      ...stockParams[symbol]
    } as MarketSimulationParams;
    
    return this.generateMarketData(params);
  }

  /**
   * Generate crypto-like data with higher volatility
   */
  generateCryptoData(
    symbol: string = 'BTC',
    days: number = 365,
    basePrice: number = 45000
  ): MarketDataPoint[] {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const params: MarketSimulationParams = {
      symbol,
      startDate,
      endDate,
      initialPrice: basePrice,
      volatility: 0.06, // 6% daily volatility
      trend: 0.80, // High growth potential
      intervals: 'daily'
    };
    
    return this.generateMarketData(params);
  }

  /**
   * Generate data with RSI testing patterns
   */
  generateRSITestData(symbol: string = 'TEST', periods: number = 100): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    const startDate = new Date();
    let currentPrice = 100;
    
    for (let i = 0; i < periods; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      // Create alternating up/down periods to test RSI
      let priceChange = 0;
      if (i < 20) {
        // Initial uptrend
        priceChange = this.random() * 2 + 0.5;
      } else if (i < 40) {
        // Downtrend
        priceChange = -(this.random() * 2 + 0.5);
      } else if (i < 60) {
        // Sideways with volatility
        priceChange = (this.random() - 0.5) * 2;
      } else {
        // Mixed trend
        priceChange = (this.random() - 0.5) * 3;
      }
      
      const open = currentPrice;
      const change = open * (priceChange / 100);
      const close = open + change;
      const high = Math.max(open, close) + (this.random() * Math.abs(change));
      const low = Math.min(open, close) - (this.random() * Math.abs(change));
      const volume = Math.floor(this.random() * 1000000 + 100000);
      
      data.push({
        symbol,
        timestamp: date,
        open,
        high: Math.max(high, Math.max(open, close)),
        low: Math.min(low, Math.min(open, close)),
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  /**
   * Generate data with MACD crossover patterns
   */
  generateMACDTestData(symbol: string = 'MACD_TEST', periods: number = 100): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    const startDate = new Date();
    let currentPrice = 100;
    
    for (let i = 0; i < periods; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      // Create trend changes to generate MACD signals
      let trendFactor = 1;
      if (i < 30) {
        trendFactor = 1.02; // Uptrend
      } else if (i < 50) {
        trendFactor = 0.99; // Downtrend
      } else if (i < 80) {
        trendFactor = 1.01; // Mild uptrend
      } else {
        trendFactor = 0.985; // Bearish
      }
      
      const volatilityFactor = 0.02;
      const randomChange = (this.random() - 0.5) * volatilityFactor;
      
      const open = currentPrice;
      const close = open * (trendFactor + randomChange);
      const high = Math.max(open, close) * (1 + this.random() * 0.01);
      const low = Math.min(open, close) * (1 - this.random() * 0.01);
      const volume = Math.floor(this.random() * 1500000 + 500000);
      
      data.push({
        symbol,
        timestamp: date,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  /**
   * Generate data with moving average crossovers
   */
  generateMATestData(symbol: string = 'MA_TEST', periods: number = 200): MarketDataPoint[] {
    const data: MarketDataPoint[] = [];
    const startDate = new Date();
    let currentPrice = 100;
    
    for (let i = 0; i < periods; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      // Create cyclical trends for MA crossovers
      const cyclePosition = (i % 60) / 60; // 60-day cycles
      const trendStrength = Math.sin(cyclePosition * Math.PI * 2) * 0.01 + 0.001;
      
      const open = currentPrice;
      const volatility = 0.015;
      const randomChange = (this.random() - 0.5) * volatility;
      const close = open * (1 + trendStrength + randomChange);
      
      const range = Math.abs(close - open) * (0.5 + this.random());
      const high = Math.max(open, close) + range * this.random();
      const low = Math.min(open, close) - range * this.random();
      const volume = Math.floor(this.random() * 2000000 + 1000000);
      
      data.push({
        symbol,
        timestamp: date,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return data;
  }

  /**
   * Generate multiple stocks for portfolio analysis
   */
  generatePortfolioData(symbols: string[], days: number = 252): { [symbol: string]: MarketDataPoint[] } {
    const portfolio: { [symbol: string]: MarketDataPoint[] } = {};
    
    symbols.forEach(symbol => {
      const basePrice = 50 + this.random() * 150; // Random base price between 50-200
      const volatility = 0.015 + this.random() * 0.025; // 1.5% to 4% volatility
      const trend = (this.random() - 0.5) * 0.3; // -15% to +15% annual trend
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const params: MarketSimulationParams = {
        symbol,
        startDate,
        endDate,
        initialPrice: basePrice,
        volatility,
        trend,
        intervals: 'daily'
      };
      
      portfolio[symbol] = this.generateMarketData(params);
    });
    
    return portfolio;
  }

  // Private helper methods

  private generateSingleDataPoint(
    symbol: string,
    timestamp: Date,
    previousClose: number,
    volatility: number,
    annualTrend: number,
    intervals: 'daily' | 'hourly' | 'minute'
  ): MarketDataPoint {
    // Calculate time-adjusted trend
    const periodsPerYear = this.getPeriodsPerYear(intervals);
    const periodTrend = annualTrend / periodsPerYear;
    
    // Generate price movement using geometric Brownian motion
    const dt = 1 / periodsPerYear;
    const drift = periodTrend - (volatility * volatility) / 2;
    const randomShock = this.normalRandom() * volatility * Math.sqrt(dt);
    
    const priceMultiplier = Math.exp(drift * dt + randomShock);
    const open = previousClose;
    const close = open * priceMultiplier;
    
    // Generate high and low based on intraday volatility
    const intradayVolatility = volatility * 0.7;
    const highFactor = 1 + Math.abs(this.normalRandom()) * intradayVolatility;
    const lowFactor = 1 - Math.abs(this.normalRandom()) * intradayVolatility;
    
    const high = Math.max(open, close) * highFactor;
    const low = Math.min(open, close) * lowFactor;
    
    // Generate realistic volume
    const baseVolume = 1000000;
    const volumeVariability = 0.5;
    const volume = Math.floor(baseVolume * (1 + (this.random() - 0.5) * volumeVariability));
    
    return {
      symbol,
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.max(volume, 10000) // Minimum volume
    };
  }

  private applyPattern(data: MarketDataPoint[], pattern: TechnicalPatternConfig): MarketDataPoint[] {
    const { pattern: patternType, duration, intensity } = pattern;
    const modifiedData = [...data];
    
    // Apply pattern to last 'duration' periods
    const startIndex = Math.max(0, data.length - duration);
    
    for (let i = startIndex; i < data.length; i++) {
      const progress = (i - startIndex) / duration;
      let modifier = 1;
      
      switch (patternType) {
        case 'trending_up':
          modifier = 1 + (progress * intensity * 0.1);
          break;
        case 'trending_down':
          modifier = 1 - (progress * intensity * 0.1);
          break;
        case 'breakout':
          if (progress > 0.7) {
            modifier = 1 + (intensity * 0.15);
          }
          break;
        case 'reversal':
          modifier = 1 + Math.sin(progress * Math.PI) * intensity * 0.1;
          break;
        case 'volatile':
          modifier = 1 + (this.random() - 0.5) * intensity * 0.2;
          break;
        case 'gap_up':
          if (i === startIndex) {
            modifier = 1 + (intensity * 0.05);
          }
          break;
        case 'gap_down':
          if (i === startIndex) {
            modifier = 1 - (intensity * 0.05);
          }
          break;
      }
      
      // Apply modifier to all prices
      modifiedData[i] = {
        ...modifiedData[i],
        open: modifiedData[i].open * modifier,
        high: modifiedData[i].high * modifier,
        low: modifiedData[i].low * modifier,
        close: modifiedData[i].close * modifier
      };
    }
    
    return modifiedData;
  }

  private getTimeStep(intervals: 'daily' | 'hourly' | 'minute'): number {
    switch (intervals) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 1 day in milliseconds
      case 'hourly':
        return 60 * 60 * 1000; // 1 hour in milliseconds
      case 'minute':
        return 60 * 1000; // 1 minute in milliseconds
    }
  }

  private getPeriodsPerYear(intervals: 'daily' | 'hourly' | 'minute'): number {
    switch (intervals) {
      case 'daily':
        return 252; // Trading days per year
      case 'hourly':
        return 252 * 6.5; // Trading hours per year
      case 'minute':
        return 252 * 6.5 * 60; // Trading minutes per year
    }
  }

  private normalRandom(): number {
    // Box-Muller transformation for normal distribution
    const u1 = this.random();
    const u2 = this.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Factory function to create MockDataGenerator
 */
export function createMockDataGenerator(seed?: number): MockDataGenerator {
  return new MockDataGenerator(seed);
}

/**
 * Quick generation functions for common use cases
 */
export const QuickMockData = {
  /**
   * Generate simple daily data for testing
   */
  daily(symbol: string, days: number = 100, basePrice: number = 100): MarketDataPoint[] {
    const generator = new MockDataGenerator();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return generator.generateMarketData({
      symbol,
      startDate,
      endDate,
      initialPrice: basePrice,
      volatility: 0.02,
      trend: 0.1,
      intervals: 'daily'
    });
  },

  /**
   * Generate trending data
   */
  trending(symbol: string, days: number = 100, direction: 'up' | 'down' = 'up'): MarketDataPoint[] {
    const generator = new MockDataGenerator();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return generator.generateMarketData({
      symbol,
      startDate,
      endDate,
      initialPrice: 100,
      volatility: 0.025,
      trend: direction === 'up' ? 0.3 : -0.3,
      intervals: 'daily'
    });
  },

  /**
   * Generate volatile data
   */
  volatile(symbol: string, days: number = 100): MarketDataPoint[] {
    const generator = new MockDataGenerator();
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return generator.generateMarketData({
      symbol,
      startDate,
      endDate,
      initialPrice: 100,
      volatility: 0.06,
      trend: 0,
      intervals: 'daily'
    });
  }
};

export default MockDataGenerator;