/**
 * Moving Averages Technical Indicators
 * Implements various moving average calculations and signals
 */

import { 
  MarketDataPoint, 
  calculateSMA, 
  calculateEMA,
  extractPriceArrays,
  validateMarketData
} from '../../utils/technical-calculations.js';

/**
 * Moving average signal types
 */
export type MovingAverageSignal = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';

/**
 * Moving average crossover result
 */
export interface MovingAverageCrossover {
  timestamp: Date;
  signal: MovingAverageSignal;
  fastMA: number;
  slowMA: number;
  price: number;
  confidence: number;
}

/**
 * Moving average analysis result
 */
export interface MovingAverageAnalysis {
  currentSMA20: number;
  currentSMA50: number;
  currentSMA200: number;
  currentEMA12: number;
  currentEMA26: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  signal: MovingAverageSignal;
  crossovers: MovingAverageCrossover[];
  support: number | null;
  resistance: number | null;
  confidence: number;
}

/**
 * Moving Averages Indicator Class
 */
export class MovingAveragesIndicator {
  private data: MarketDataPoint[] = [];
  
  constructor(historicalData?: MarketDataPoint[]) {
    if (historicalData) {
      this.updateData(historicalData);
    }
  }

  /**
   * Update the indicator with new market data
   */
  updateData(data: MarketDataPoint[]): void {
    if (!validateMarketData(data)) {
      throw new Error('Invalid market data provided');
    }
    
    this.data = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Add a single data point
   */
  addDataPoint(dataPoint: MarketDataPoint): void {
    if (!validateMarketData([dataPoint])) {
      throw new Error('Invalid data point');
    }
    
    this.data.push(dataPoint);
    this.data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate Simple Moving Average for given period
   */
  calculateSMA(period: number): number[] {
    if (this.data.length < period) {
      throw new Error(`Insufficient data for SMA${period}. Need at least ${period} data points`);
    }

    const { closes } = extractPriceArrays(this.data);
    return calculateSMA(closes, period);
  }

  /**
   * Calculate Exponential Moving Average for given period
   */
  calculateEMA(period: number): number[] {
    if (this.data.length < period) {
      throw new Error(`Insufficient data for EMA${period}. Need at least ${period} data points`);
    }

    const { closes } = extractPriceArrays(this.data);
    return calculateEMA(closes, period);
  }

  /**
   * Detect moving average crossovers
   */
  detectCrossovers(fastPeriod: number, slowPeriod: number): MovingAverageCrossover[] {
    if (this.data.length < Math.max(fastPeriod, slowPeriod) + 1) {
      return [];
    }

    const fastMA = this.calculateSMA(fastPeriod);
    const slowMA = this.calculateSMA(slowPeriod);
    const crossovers: MovingAverageCrossover[] = [];

    const startIndex = slowPeriod - 1;
    const { closes } = extractPriceArrays(this.data);

    for (let i = 1; i < fastMA.length; i++) {
      const prevFastAbove = fastMA[i - 1] > slowMA[i - 1];
      const currentFastAbove = fastMA[i] > slowMA[i];
      
      // Detect crossover
      if (prevFastAbove !== currentFastAbove) {
        const dataIndex = startIndex + i;
        const signal: MovingAverageSignal = currentFastAbove ? 'BUY' : 'SELL';
        
        // Calculate confidence based on separation
        const separation = Math.abs(fastMA[i] - slowMA[i]);
        const price = closes[dataIndex];
        const confidence = Math.min(0.9, separation / price * 100);

        crossovers.push({
          timestamp: this.data[dataIndex].timestamp,
          signal,
          fastMA: fastMA[i],
          slowMA: slowMA[i],
          price,
          confidence
        });
      }
    }

    return crossovers;
  }

  /**
   * Get current moving average values
   */
  getCurrentMAs(): {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema12: number | null;
    ema26: number | null;
  } {
    try {
      const sma20 = this.data.length >= 20 ? this.calculateSMA(20) : null;
      const sma50 = this.data.length >= 50 ? this.calculateSMA(50) : null;
      const sma200 = this.data.length >= 200 ? this.calculateSMA(200) : null;
      const ema12 = this.data.length >= 12 ? this.calculateEMA(12) : null;
      const ema26 = this.data.length >= 26 ? this.calculateEMA(26) : null;

      return {
        sma20: sma20?.[sma20.length - 1] || null,
        sma50: sma50?.[sma50.length - 1] || null,
        sma200: sma200?.[sma200.length - 1] || null,
        ema12: ema12?.[ema12.length - 1] || null,
        ema26: ema26?.[ema26.length - 1] || null
      };
    } catch {
      return {
        sma20: null,
        sma50: null,
        sma200: null,
        ema12: null,
        ema26: null
      };
    }
  }

  /**
   * Determine overall trend based on moving averages
   */
  determineTrend(): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    const mas = this.getCurrentMAs();
    const currentPrice = this.data[this.data.length - 1]?.close;

    if (!currentPrice || !mas.sma20 || !mas.sma50) {
      return 'SIDEWAYS';
    }

    // Strong uptrend: price > SMA20 > SMA50 (> SMA200 if available)
    if (currentPrice > mas.sma20 && mas.sma20 > mas.sma50) {
      if (!mas.sma200 || mas.sma50 > mas.sma200) {
        return 'UPTREND';
      }
    }

    // Strong downtrend: price < SMA20 < SMA50 (< SMA200 if available)
    if (currentPrice < mas.sma20 && mas.sma20 < mas.sma50) {
      if (!mas.sma200 || mas.sma50 < mas.sma200) {
        return 'DOWNTREND';
      }
    }

    return 'SIDEWAYS';
  }

  /**
   * Generate trading signal based on moving averages
   */
  generateSignal(): MovingAverageSignal {
    if (this.data.length < 50) {
      return 'NEUTRAL';
    }

    const trend = this.determineTrend();
    const mas = this.getCurrentMAs();
    const currentPrice = this.data[this.data.length - 1].close;
    
    // Recent crossovers
    const recentCrossovers = this.detectCrossovers(20, 50)
      .filter(cross => {
        const now = new Date();
        const crossoverTime = cross.timestamp.getTime();
        const daysDiff = (now.getTime() - crossoverTime) / (1000 * 60 * 60 * 24);
        return daysDiff <= 5; // Within last 5 days
      });

    // Strong signals
    if (trend === 'UPTREND' && mas.sma20 && currentPrice > mas.sma20 * 1.02) {
      return 'BUY';
    }
    
    if (trend === 'DOWNTREND' && mas.sma20 && currentPrice < mas.sma20 * 0.98) {
      return 'SELL';
    }

    // Recent crossover signals
    if (recentCrossovers.length > 0) {
      const latestCrossover = recentCrossovers[recentCrossovers.length - 1];
      if (latestCrossover.confidence > 0.6) {
        return latestCrossover.signal;
      }
    }

    return 'HOLD';
  }

  /**
   * Identify support and resistance levels from moving averages
   */
  identifySupportResistance(): { support: number | null; resistance: number | null } {
    const mas = this.getCurrentMAs();
    const currentPrice = this.data[this.data.length - 1]?.close;

    if (!currentPrice) {
      return { support: null, resistance: null };
    }

    const maLevels = [mas.sma20, mas.sma50, mas.sma200, mas.ema12, mas.ema26]
      .filter((ma): ma is number => ma !== null)
      .sort((a, b) => a - b);

    let support: number | null = null;
    let resistance: number | null = null;

    // Find closest MA below current price (support)
    for (let i = maLevels.length - 1; i >= 0; i--) {
      if (maLevels[i] < currentPrice) {
        support = maLevels[i];
        break;
      }
    }

    // Find closest MA above current price (resistance)
    for (const level of maLevels) {
      if (level > currentPrice) {
        resistance = level;
        break;
      }
    }

    return { support, resistance };
  }

  /**
   * Calculate confidence score for the current signal
   */
  calculateConfidence(): number {
    const trend = this.determineTrend();
    const mas = this.getCurrentMAs();
    const currentPrice = this.data[this.data.length - 1]?.close;

    if (!currentPrice || !mas.sma20 || !mas.sma50) {
      return 0.1;
    }

    let confidence = 0.5; // Base confidence

    // Trend alignment increases confidence
    if (trend === 'UPTREND') {
      confidence += 0.2;
      if (mas.sma200 && mas.sma50 > mas.sma200) {
        confidence += 0.1;
      }
    } else if (trend === 'DOWNTREND') {
      confidence += 0.2;
      if (mas.sma200 && mas.sma50 < mas.sma200) {
        confidence += 0.1;
      }
    }

    // Distance from MAs affects confidence
    const priceToSMA20Ratio = Math.abs(currentPrice - mas.sma20) / mas.sma20;
    if (priceToSMA20Ratio < 0.02) { // Very close to MA
      confidence += 0.1;
    } else if (priceToSMA20Ratio > 0.05) { // Far from MA
      confidence -= 0.1;
    }

    // Recent crossovers affect confidence
    const recentCrossovers = this.detectCrossovers(20, 50)
      .filter(cross => {
        const now = new Date();
        const daysDiff = (now.getTime() - cross.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 3;
      });

    if (recentCrossovers.length > 0) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  /**
   * Perform comprehensive moving average analysis
   */
  analyze(): MovingAverageAnalysis {
    if (this.data.length < 20) {
      throw new Error('Insufficient data for moving average analysis');
    }

    const mas = this.getCurrentMAs();
    const trend = this.determineTrend();
    const signal = this.generateSignal();
    const crossovers = this.detectCrossovers(20, 50);
    const { support, resistance } = this.identifySupportResistance();
    const confidence = this.calculateConfidence();

    return {
      currentSMA20: mas.sma20 || 0,
      currentSMA50: mas.sma50 || 0,
      currentSMA200: mas.sma200 || 0,
      currentEMA12: mas.ema12 || 0,
      currentEMA26: mas.ema26 || 0,
      trend,
      signal,
      crossovers: crossovers.slice(-5), // Last 5 crossovers
      support,
      resistance,
      confidence
    };
  }

  /**
   * Get data length
   */
  getDataLength(): number {
    return this.data.length;
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.data = [];
  }
}

/**
 * Factory function to create MovingAveragesIndicator
 */
export function createMovingAveragesIndicator(data?: MarketDataPoint[]): MovingAveragesIndicator {
  return new MovingAveragesIndicator(data);
}

/**
 * Utility function for quick MA crossover detection
 */
export function quickMACrossover(
  prices: number[], 
  fastPeriod: number, 
  slowPeriod: number
): 'BUY' | 'SELL' | 'NONE' {
  if (prices.length < Math.max(fastPeriod, slowPeriod) + 1) {
    return 'NONE';
  }

  const fastMA = calculateSMA(prices, fastPeriod);
  const slowMA = calculateSMA(prices, slowPeriod);

  if (fastMA.length < 2 || slowMA.length < 2) {
    return 'NONE';
  }

  const prevFastAbove = fastMA[fastMA.length - 2] > slowMA[slowMA.length - 2];
  const currentFastAbove = fastMA[fastMA.length - 1] > slowMA[slowMA.length - 1];

  if (!prevFastAbove && currentFastAbove) {
    return 'BUY'; // Bullish crossover
  } else if (prevFastAbove && !currentFastAbove) {
    return 'SELL'; // Bearish crossover
  }

  return 'NONE';
}

export default MovingAveragesIndicator;