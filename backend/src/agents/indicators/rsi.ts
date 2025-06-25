/**
 * RSI (Relative Strength Index) Technical Indicator
 * Momentum oscillator measuring speed and magnitude of price changes
 */

import { 
  MarketDataPoint, 
  calculateRSI,
  extractPriceArrays,
  validateMarketData
} from '../../utils/technical-calculations.js';

/**
 * RSI signal types
 */
export type RSISignal = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'OVERSOLD' | 'OVERBOUGHT';

/**
 * RSI divergence types
 */
export type RSIDivergence = 'BULLISH' | 'BEARISH' | 'NONE';

/**
 * RSI analysis result
 */
export interface RSIAnalysis {
  currentRSI: number;
  signal: RSISignal;
  divergence: RSIDivergence;
  overboughtLevel: number;
  oversoldLevel: number;
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  momentum: 'INCREASING' | 'DECREASING' | 'STABLE';
  confidence: number;
  supportLevel: number | null;
  resistanceLevel: number | null;
}

/**
 * RSI level crossing event
 */
export interface RSILevelCrossing {
  timestamp: Date;
  rsiValue: number;
  level: number;
  direction: 'ABOVE' | 'BELOW';
  signal: RSISignal;
}

/**
 * RSI Indicator Class
 */
export class RSIIndicator {
  private data: MarketDataPoint[] = [];
  private period: number;
  private overboughtLevel: number;
  private oversoldLevel: number;
  
  constructor(
    period: number = 14,
    overboughtLevel: number = 70,
    oversoldLevel: number = 30,
    historicalData?: MarketDataPoint[]
  ) {
    this.period = period;
    this.overboughtLevel = overboughtLevel;
    this.oversoldLevel = oversoldLevel;
    
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
   * Calculate RSI values
   */
  calculateRSI(): number[] {
    if (this.data.length < this.period + 1) {
      throw new Error(`Insufficient data for RSI calculation. Need at least ${this.period + 1} data points`);
    }

    const { closes } = extractPriceArrays(this.data);
    return calculateRSI(closes, this.period);
  }

  /**
   * Get current RSI value
   */
  getCurrentRSI(): number | null {
    try {
      const rsiValues = this.calculateRSI();
      return rsiValues[rsiValues.length - 1] || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate RSI-based trading signal
   */
  generateSignal(): RSISignal {
    const currentRSI = this.getCurrentRSI();
    
    if (currentRSI === null) {
      return 'NEUTRAL';
    }

    // Extreme levels
    if (currentRSI >= this.overboughtLevel) {
      return currentRSI >= 80 ? 'OVERBOUGHT' : 'SELL';
    }
    
    if (currentRSI <= this.oversoldLevel) {
      return currentRSI <= 20 ? 'OVERSOLD' : 'BUY';
    }

    // Momentum analysis
    try {
      const rsiValues = this.calculateRSI();
      if (rsiValues.length >= 3) {
        const recentRSI = rsiValues.slice(-3);
        const isIncreasing = recentRSI[2] > recentRSI[1] && recentRSI[1] > recentRSI[0];
        const isDecreasing = recentRSI[2] < recentRSI[1] && recentRSI[1] < recentRSI[0];

        // Momentum crossing 50 line
        if (currentRSI > 50 && isIncreasing) {
          return 'BUY';
        }
        if (currentRSI < 50 && isDecreasing) {
          return 'SELL';
        }
      }
    } catch {
      // Continue to default
    }

    return 'HOLD';
  }

  /**
   * Detect RSI divergence with price
   */
  detectDivergence(): RSIDivergence {
    try {
      const rsiValues = this.calculateRSI();
      const { closes } = extractPriceArrays(this.data);
      
      if (rsiValues.length < 10 || closes.length < this.period + 10) {
        return 'NONE';
      }

      // Look at recent data for divergence patterns
      const recentPeriod = 10;
      const recentRSI = rsiValues.slice(-recentPeriod);
      const recentPrices = closes.slice(-(recentPeriod + this.period)).slice(-recentPeriod);

      // Find peaks and troughs
      const rsiPeaks = this.findPeaks(recentRSI);
      const pricePeaks = this.findPeaks(recentPrices);
      const rsiTroughs = this.findTroughs(recentRSI);
      const priceTroughs = this.findTroughs(recentPrices);

      // Bearish divergence: price makes higher highs, RSI makes lower highs
      if (rsiPeaks.length >= 2 && pricePeaks.length >= 2) {
        const latestPricePeak = pricePeaks[pricePeaks.length - 1];
        const prevPricePeak = pricePeaks[pricePeaks.length - 2];
        const latestRSIPeak = rsiPeaks[rsiPeaks.length - 1];
        const prevRSIPeak = rsiPeaks[rsiPeaks.length - 2];

        if (recentPrices[latestPricePeak] > recentPrices[prevPricePeak] &&
            recentRSI[latestRSIPeak] < recentRSI[prevRSIPeak]) {
          return 'BEARISH';
        }
      }

      // Bullish divergence: price makes lower lows, RSI makes higher lows
      if (rsiTroughs.length >= 2 && priceTroughs.length >= 2) {
        const latestPriceTrough = priceTroughs[priceTroughs.length - 1];
        const prevPriceTrough = priceTroughs[priceTroughs.length - 2];
        const latestRSITrough = rsiTroughs[rsiTroughs.length - 1];
        const prevRSITrough = rsiTroughs[rsiTroughs.length - 2];

        if (recentPrices[latestPriceTrough] < recentPrices[prevPriceTrough] &&
            recentRSI[latestRSITrough] > recentRSI[prevRSITrough]) {
          return 'BULLISH';
        }
      }

      return 'NONE';
    } catch {
      return 'NONE';
    }
  }

  /**
   * Determine trend strength based on RSI
   */
  determineTrendStrength(): 'STRONG' | 'MODERATE' | 'WEAK' {
    const currentRSI = this.getCurrentRSI();
    
    if (currentRSI === null) {
      return 'WEAK';
    }

    // Strong trends
    if (currentRSI >= 70 || currentRSI <= 30) {
      return 'STRONG';
    }

    // Moderate trends
    if (currentRSI >= 60 || currentRSI <= 40) {
      return 'MODERATE';
    }

    return 'WEAK';
  }

  /**
   * Analyze RSI momentum direction
   */
  analyzeMomentum(): 'INCREASING' | 'DECREASING' | 'STABLE' {
    try {
      const rsiValues = this.calculateRSI();
      
      if (rsiValues.length < 3) {
        return 'STABLE';
      }

      const recent = rsiValues.slice(-3);
      const trend = recent[2] - recent[0];
      
      if (trend > 2) return 'INCREASING';
      if (trend < -2) return 'DECREASING';
      
      return 'STABLE';
    } catch {
      return 'STABLE';
    }
  }

  /**
   * Detect RSI level crossings
   */
  detectLevelCrossings(): RSILevelCrossing[] {
    try {
      const rsiValues = this.calculateRSI();
      const crossings: RSILevelCrossing[] = [];
      
      if (rsiValues.length < 2) {
        return crossings;
      }

      const levels = [this.oversoldLevel, 50, this.overboughtLevel];
      const startIndex = this.period;

      for (let i = 1; i < rsiValues.length; i++) {
        const prevRSI = rsiValues[i - 1];
        const currentRSI = rsiValues[i];
        
        for (const level of levels) {
          // Crossing above
          if (prevRSI <= level && currentRSI > level) {
            const signal = this.getLevelCrossingSignal(level, 'ABOVE');
            crossings.push({
              timestamp: this.data[startIndex + i].timestamp,
              rsiValue: currentRSI,
              level,
              direction: 'ABOVE',
              signal
            });
          }
          
          // Crossing below
          if (prevRSI >= level && currentRSI < level) {
            const signal = this.getLevelCrossingSignal(level, 'BELOW');
            crossings.push({
              timestamp: this.data[startIndex + i].timestamp,
              rsiValue: currentRSI,
              level,
              direction: 'BELOW',
              signal
            });
          }
        }
      }

      return crossings;
    } catch {
      return [];
    }
  }

  /**
   * Calculate confidence score for RSI signal
   */
  calculateConfidence(): number {
    const currentRSI = this.getCurrentRSI();
    
    if (currentRSI === null) {
      return 0.1;
    }

    let confidence = 0.5; // Base confidence

    // Extreme levels increase confidence
    if (currentRSI >= 80 || currentRSI <= 20) {
      confidence += 0.3;
    } else if (currentRSI >= 70 || currentRSI <= 30) {
      confidence += 0.2;
    }

    // Divergence affects confidence
    const divergence = this.detectDivergence();
    if (divergence !== 'NONE') {
      confidence += 0.2;
    }

    // Trend strength affects confidence
    const trendStrength = this.determineTrendStrength();
    if (trendStrength === 'STRONG') {
      confidence += 0.1;
    }

    // Momentum consistency
    const momentum = this.analyzeMomentum();
    if (momentum !== 'STABLE') {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  /**
   * Identify RSI support and resistance levels
   */
  identifySupportResistance(): { support: number | null; resistance: number | null } {
    const currentRSI = this.getCurrentRSI();
    
    if (currentRSI === null) {
      return { support: null, resistance: null };
    }

    // Dynamic support/resistance based on current RSI
    let support: number | null = null;
    let resistance: number | null = null;

    if (currentRSI > 50) {
      support = 50;
      resistance = this.overboughtLevel;
    } else {
      support = this.oversoldLevel;
      resistance = 50;
    }

    // Adjust based on recent RSI behavior
    try {
      const rsiValues = this.calculateRSI();
      const recentRSI = rsiValues.slice(-10);
      
      if (recentRSI.length >= 5) {
        const avgRSI = recentRSI.reduce((sum, val) => sum + val, 0) / recentRSI.length;
        
        // If RSI has been consistently high/low, adjust levels
        if (avgRSI > 60) {
          support = Math.max(support || 0, 50);
          resistance = Math.max(resistance || 0, 75);
        } else if (avgRSI < 40) {
          support = Math.min(support || 100, 25);
          resistance = Math.min(resistance || 100, 50);
        }
      }
    } catch {
      // Use default levels
    }

    return { support, resistance };
  }

  /**
   * Perform comprehensive RSI analysis
   */
  analyze(): RSIAnalysis {
    if (this.data.length < this.period + 1) {
      throw new Error(`Insufficient data for RSI analysis. Need at least ${this.period + 1} data points`);
    }

    const currentRSI = this.getCurrentRSI()!;
    const signal = this.generateSignal();
    const divergence = this.detectDivergence();
    const trendStrength = this.determineTrendStrength();
    const momentum = this.analyzeMomentum();
    const confidence = this.calculateConfidence();
    const { support, resistance } = this.identifySupportResistance();

    return {
      currentRSI,
      signal,
      divergence,
      overboughtLevel: this.overboughtLevel,
      oversoldLevel: this.oversoldLevel,
      trendStrength,
      momentum,
      confidence,
      supportLevel: support,
      resistanceLevel: resistance
    };
  }

  // Private helper methods

  private findPeaks(data: number[]): number[] {
    const peaks: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  private findTroughs(data: number[]): number[] {
    const troughs: number[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        troughs.push(i);
      }
    }
    
    return troughs;
  }

  private getLevelCrossingSignal(level: number, direction: 'ABOVE' | 'BELOW'): RSISignal {
    if (level === this.oversoldLevel) {
      return direction === 'ABOVE' ? 'BUY' : 'OVERSOLD';
    }
    
    if (level === this.overboughtLevel) {
      return direction === 'BELOW' ? 'SELL' : 'OVERBOUGHT';
    }
    
    if (level === 50) {
      return direction === 'ABOVE' ? 'BUY' : 'SELL';
    }
    
    return 'NEUTRAL';
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

  /**
   * Update RSI parameters
   */
  updateParameters(period?: number, overboughtLevel?: number, oversoldLevel?: number): void {
    if (period !== undefined) this.period = period;
    if (overboughtLevel !== undefined) this.overboughtLevel = overboughtLevel;
    if (oversoldLevel !== undefined) this.oversoldLevel = oversoldLevel;
  }
}

/**
 * Factory function to create RSIIndicator
 */
export function createRSIIndicator(
  period?: number,
  overboughtLevel?: number,
  oversoldLevel?: number,
  data?: MarketDataPoint[]
): RSIIndicator {
  return new RSIIndicator(period, overboughtLevel, oversoldLevel, data);
}

/**
 * Quick RSI signal utility
 */
export function quickRSISignal(prices: number[], period: number = 14): RSISignal {
  if (prices.length < period + 1) {
    return 'NEUTRAL';
  }

  const rsiValues = calculateRSI(prices, period);
  const currentRSI = rsiValues[rsiValues.length - 1];

  if (currentRSI >= 70) return 'SELL';
  if (currentRSI <= 30) return 'BUY';
  
  return 'HOLD';
}

export default RSIIndicator;