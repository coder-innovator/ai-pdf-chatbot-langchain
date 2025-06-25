/**
 * MACD (Moving Average Convergence Divergence) Technical Indicator
 * Trend-following momentum indicator showing relationship between two moving averages
 */

import { 
  MarketDataPoint, 
  calculateMACD,
  MACDResult,
  extractPriceArrays,
  validateMarketData
} from '../../utils/technical-calculations.js';

/**
 * MACD signal types
 */
export type MACDSignal = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'BULLISH' | 'BEARISH';

/**
 * MACD crossover types
 */
export type MACDCrossover = 'BULLISH_CROSSOVER' | 'BEARISH_CROSSOVER' | 'ZERO_CROSS_ABOVE' | 'ZERO_CROSS_BELOW';

/**
 * MACD divergence types
 */
export type MACDDivergence = 'BULLISH' | 'BEARISH' | 'NONE';

/**
 * MACD crossover event
 */
export interface MACDCrossoverEvent {
  timestamp: Date;
  type: MACDCrossover;
  macdValue: number;
  signalValue: number;
  histogramValue: number;
  confidence: number;
}

/**
 * MACD analysis result
 */
export interface MACDAnalysis {
  currentMACD: number;
  currentSignal: number;
  currentHistogram: number;
  signal: MACDSignal;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  divergence: MACDDivergence;
  momentum: 'INCREASING' | 'DECREASING' | 'STABLE';
  crossovers: MACDCrossoverEvent[];
  confidence: number;
  zeroCrossings: number;
}

/**
 * MACD Indicator Class
 */
export class MACDIndicator {
  private data: MarketDataPoint[] = [];
  private fastPeriod: number;
  private slowPeriod: number;
  private signalPeriod: number;
  
  constructor(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    historicalData?: MarketDataPoint[]
  ) {
    this.fastPeriod = fastPeriod;
    this.slowPeriod = slowPeriod;
    this.signalPeriod = signalPeriod;
    
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
   * Calculate MACD values
   */
  calculateMACD(): MACDResult {
    if (this.data.length < this.slowPeriod + this.signalPeriod) {
      throw new Error(`Insufficient data for MACD calculation. Need at least ${this.slowPeriod + this.signalPeriod} data points`);
    }

    const { closes } = extractPriceArrays(this.data);
    return calculateMACD(closes, this.fastPeriod, this.slowPeriod, this.signalPeriod);
  }

  /**
   * Get current MACD values
   */
  getCurrentValues(): { macd: number; signal: number; histogram: number } | null {
    try {
      const macdResult = this.calculateMACD();
      const macdLength = macdResult.macd.length;
      const signalLength = macdResult.signal.length;
      const histogramLength = macdResult.histogram.length;
      
      if (macdLength === 0 || signalLength === 0 || histogramLength === 0) {
        return null;
      }

      return {
        macd: macdResult.macd[macdLength - 1],
        signal: macdResult.signal[signalLength - 1],
        histogram: macdResult.histogram[histogramLength - 1]
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate MACD-based trading signal
   */
  generateSignal(): MACDSignal {
    const current = this.getCurrentValues();
    
    if (!current) {
      return 'NEUTRAL';
    }

    const { macd, signal, histogram } = current;

    // Strong signals from histogram
    if (histogram > 0 && macd > signal) {
      // Check for increasing momentum
      const momentum = this.analyzeMomentum();
      if (momentum === 'INCREASING') {
        return macd > 0 ? 'BULLISH' : 'BUY';
      }
      return 'BUY';
    }

    if (histogram < 0 && macd < signal) {
      // Check for decreasing momentum
      const momentum = this.analyzeMomentum();
      if (momentum === 'DECREASING') {
        return macd < 0 ? 'BEARISH' : 'SELL';
      }
      return 'SELL';
    }

    // Zero line analysis
    if (macd > 0 && signal > 0) {
      return 'BULLISH';
    }
    
    if (macd < 0 && signal < 0) {
      return 'BEARISH';
    }

    return 'HOLD';
  }

  /**
   * Detect MACD crossovers
   */
  detectCrossovers(): MACDCrossoverEvent[] {
    try {
      const macdResult = this.calculateMACD();
      const crossovers: MACDCrossoverEvent[] = [];
      
      if (macdResult.macd.length < 2 || macdResult.signal.length < 2) {
        return crossovers;
      }

      // Calculate starting index for data alignment
      const startIndex = this.slowPeriod + this.signalPeriod - 2;

      // MACD line and Signal line crossovers
      for (let i = 1; i < macdResult.signal.length; i++) {
        const prevMACD = macdResult.macd[i - 1 + (macdResult.macd.length - macdResult.signal.length)];
        const currentMACD = macdResult.macd[i + (macdResult.macd.length - macdResult.signal.length)];
        const prevSignal = macdResult.signal[i - 1];
        const currentSignal = macdResult.signal[i];
        const currentHistogram = macdResult.histogram[i];

        // Bullish crossover: MACD crosses above Signal
        if (prevMACD <= prevSignal && currentMACD > currentSignal) {
          const confidence = this.calculateCrossoverConfidence(currentMACD, currentSignal, 'BULLISH');
          crossovers.push({
            timestamp: this.data[startIndex + i].timestamp,
            type: 'BULLISH_CROSSOVER',
            macdValue: currentMACD,
            signalValue: currentSignal,
            histogramValue: currentHistogram,
            confidence
          });
        }

        // Bearish crossover: MACD crosses below Signal
        if (prevMACD >= prevSignal && currentMACD < currentSignal) {
          const confidence = this.calculateCrossoverConfidence(currentMACD, currentSignal, 'BEARISH');
          crossovers.push({
            timestamp: this.data[startIndex + i].timestamp,
            type: 'BEARISH_CROSSOVER',
            macdValue: currentMACD,
            signalValue: currentSignal,
            histogramValue: currentHistogram,
            confidence
          });
        }
      }

      // Zero line crossovers
      for (let i = 1; i < macdResult.macd.length; i++) {
        const prevMACD = macdResult.macd[i - 1];
        const currentMACD = macdResult.macd[i];

        // Zero cross above
        if (prevMACD <= 0 && currentMACD > 0) {
          const signalIndex = Math.min(i - (macdResult.macd.length - macdResult.signal.length), macdResult.signal.length - 1);
          const currentSignal = signalIndex >= 0 ? macdResult.signal[signalIndex] : 0;
          const histogramIndex = Math.min(i - (macdResult.macd.length - macdResult.histogram.length), macdResult.histogram.length - 1);
          const currentHistogram = histogramIndex >= 0 ? macdResult.histogram[histogramIndex] : 0;
          
          crossovers.push({
            timestamp: this.data[this.slowPeriod - 1 + i].timestamp,
            type: 'ZERO_CROSS_ABOVE',
            macdValue: currentMACD,
            signalValue: currentSignal,
            histogramValue: currentHistogram,
            confidence: 0.7
          });
        }

        // Zero cross below
        if (prevMACD >= 0 && currentMACD < 0) {
          const signalIndex = Math.min(i - (macdResult.macd.length - macdResult.signal.length), macdResult.signal.length - 1);
          const currentSignal = signalIndex >= 0 ? macdResult.signal[signalIndex] : 0;
          const histogramIndex = Math.min(i - (macdResult.macd.length - macdResult.histogram.length), macdResult.histogram.length - 1);
          const currentHistogram = histogramIndex >= 0 ? macdResult.histogram[histogramIndex] : 0;
          
          crossovers.push({
            timestamp: this.data[this.slowPeriod - 1 + i].timestamp,
            type: 'ZERO_CROSS_BELOW',
            macdValue: currentMACD,
            signalValue: currentSignal,
            histogramValue: currentHistogram,
            confidence: 0.7
          });
        }
      }

      return crossovers.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Detect MACD divergence with price
   */
  detectDivergence(): MACDDivergence {
    try {
      const macdResult = this.calculateMACD();
      const { closes } = extractPriceArrays(this.data);
      
      if (macdResult.macd.length < 10 || closes.length < this.slowPeriod + 10) {
        return 'NONE';
      }

      // Analyze recent period for divergence
      const recentPeriod = 15;
      const recentMACD = macdResult.macd.slice(-recentPeriod);
      const recentPrices = closes.slice(-(recentPeriod + this.slowPeriod)).slice(-recentPeriod);

      // Find peaks and troughs
      const macdPeaks = this.findPeaks(recentMACD);
      const pricePeaks = this.findPeaks(recentPrices);
      const macdTroughs = this.findTroughs(recentMACD);
      const priceTroughs = this.findTroughs(recentPrices);

      // Bearish divergence: price makes higher highs, MACD makes lower highs
      if (macdPeaks.length >= 2 && pricePeaks.length >= 2) {
        const latestPricePeak = pricePeaks[pricePeaks.length - 1];
        const prevPricePeak = pricePeaks[pricePeaks.length - 2];
        const latestMACDPeak = macdPeaks[macdPeaks.length - 1];
        const prevMACDPeak = macdPeaks[macdPeaks.length - 2];

        if (recentPrices[latestPricePeak] > recentPrices[prevPricePeak] &&
            recentMACD[latestMACDPeak] < recentMACD[prevMACDPeak]) {
          return 'BEARISH';
        }
      }

      // Bullish divergence: price makes lower lows, MACD makes higher lows
      if (macdTroughs.length >= 2 && priceTroughs.length >= 2) {
        const latestPriceTrough = priceTroughs[priceTroughs.length - 1];
        const prevPriceTrough = priceTroughs[priceTroughs.length - 2];
        const latestMACDTrough = macdTroughs[macdTroughs.length - 1];
        const prevMACDTrough = macdTroughs[macdTroughs.length - 2];

        if (recentPrices[latestPriceTrough] < recentPrices[prevPriceTrough] &&
            recentMACD[latestMACDTrough] > recentMACD[prevMACDTrough]) {
          return 'BULLISH';
        }
      }

      return 'NONE';
    } catch {
      return 'NONE';
    }
  }

  /**
   * Determine overall trend based on MACD
   */
  determineTrend(): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const current = this.getCurrentValues();
    
    if (!current) {
      return 'NEUTRAL';
    }

    const { macd, signal } = current;

    // Strong trends
    if (macd > 0 && signal > 0 && macd > signal) {
      return 'BULLISH';
    }
    
    if (macd < 0 && signal < 0 && macd < signal) {
      return 'BEARISH';
    }

    // Weak trends
    if (macd > signal) {
      return 'BULLISH';
    }
    
    if (macd < signal) {
      return 'BEARISH';
    }

    return 'NEUTRAL';
  }

  /**
   * Analyze MACD momentum
   */
  analyzeMomentum(): 'INCREASING' | 'DECREASING' | 'STABLE' {
    try {
      const macdResult = this.calculateMACD();
      
      if (macdResult.histogram.length < 3) {
        return 'STABLE';
      }

      const recentHistogram = macdResult.histogram.slice(-3);
      
      // Check histogram trend (momentum indicator)
      if (recentHistogram[2] > recentHistogram[1] && recentHistogram[1] > recentHistogram[0]) {
        return 'INCREASING';
      }
      
      if (recentHistogram[2] < recentHistogram[1] && recentHistogram[1] < recentHistogram[0]) {
        return 'DECREASING';
      }

      // Check MACD line momentum
      if (macdResult.macd.length >= 3) {
        const recentMACD = macdResult.macd.slice(-3);
        const macdTrend = recentMACD[2] - recentMACD[0];
        
        if (Math.abs(macdTrend) > 0.001) {
          return macdTrend > 0 ? 'INCREASING' : 'DECREASING';
        }
      }

      return 'STABLE';
    } catch {
      return 'STABLE';
    }
  }

  /**
   * Count zero line crossings in recent period
   */
  countZeroCrossings(periods: number = 20): number {
    try {
      const macdResult = this.calculateMACD();
      
      if (macdResult.macd.length < periods) {
        return 0;
      }

      const recentMACD = macdResult.macd.slice(-periods);
      let crossings = 0;

      for (let i = 1; i < recentMACD.length; i++) {
        if ((recentMACD[i - 1] <= 0 && recentMACD[i] > 0) ||
            (recentMACD[i - 1] >= 0 && recentMACD[i] < 0)) {
          crossings++;
        }
      }

      return crossings;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate confidence score for MACD signal
   */
  calculateConfidence(): number {
    const current = this.getCurrentValues();
    
    if (!current) {
      return 0.1;
    }

    let confidence = 0.5; // Base confidence

    const { macd, signal, histogram } = current;

    // Histogram strength affects confidence
    const histogramStrength = Math.abs(histogram);
    if (histogramStrength > 0.01) {
      confidence += 0.2;
    }

    // MACD-Signal separation affects confidence
    const separation = Math.abs(macd - signal);
    if (separation > 0.01) {
      confidence += 0.1;
    }

    // Zero line position affects confidence
    if ((macd > 0 && signal > 0) || (macd < 0 && signal < 0)) {
      confidence += 0.1;
    }

    // Divergence affects confidence
    const divergence = this.detectDivergence();
    if (divergence !== 'NONE') {
      confidence += 0.1;
    }

    // Momentum consistency
    const momentum = this.analyzeMomentum();
    if (momentum !== 'STABLE') {
      confidence += 0.1;
    }

    // Recent crossovers affect confidence
    const recentCrossovers = this.detectCrossovers()
      .filter(cross => {
        const now = new Date();
        const daysDiff = (now.getTime() - cross.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 5;
      });

    if (recentCrossovers.length > 0) {
      confidence += 0.1;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  /**
   * Perform comprehensive MACD analysis
   */
  analyze(): MACDAnalysis {
    if (this.data.length < this.slowPeriod + this.signalPeriod) {
      throw new Error(`Insufficient data for MACD analysis. Need at least ${this.slowPeriod + this.signalPeriod} data points`);
    }

    const current = this.getCurrentValues()!;
    const signal = this.generateSignal();
    const trend = this.determineTrend();
    const divergence = this.detectDivergence();
    const momentum = this.analyzeMomentum();
    const crossovers = this.detectCrossovers().slice(-5); // Last 5 crossovers
    const confidence = this.calculateConfidence();
    const zeroCrossings = this.countZeroCrossings();

    return {
      currentMACD: current.macd,
      currentSignal: current.signal,
      currentHistogram: current.histogram,
      signal,
      trend,
      divergence,
      momentum,
      crossovers,
      confidence,
      zeroCrossings
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

  private calculateCrossoverConfidence(macd: number, signal: number, type: 'BULLISH' | 'BEARISH'): number {
    const separation = Math.abs(macd - signal);
    const baseConfidence = 0.6;
    
    // Larger separation = higher confidence
    const separationBonus = Math.min(0.3, separation * 100);
    
    // Zero line position affects confidence
    let positionBonus = 0;
    if (type === 'BULLISH' && macd > 0) {
      positionBonus = 0.1;
    } else if (type === 'BEARISH' && macd < 0) {
      positionBonus = 0.1;
    }

    return Math.min(0.9, baseConfidence + separationBonus + positionBonus);
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
   * Update MACD parameters
   */
  updateParameters(fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): void {
    if (fastPeriod !== undefined) this.fastPeriod = fastPeriod;
    if (slowPeriod !== undefined) this.slowPeriod = slowPeriod;
    if (signalPeriod !== undefined) this.signalPeriod = signalPeriod;
  }
}

/**
 * Factory function to create MACDIndicator
 */
export function createMACDIndicator(
  fastPeriod?: number,
  slowPeriod?: number,
  signalPeriod?: number,
  data?: MarketDataPoint[]
): MACDIndicator {
  return new MACDIndicator(fastPeriod, slowPeriod, signalPeriod, data);
}

/**
 * Quick MACD signal utility
 */
export function quickMACDSignal(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDSignal {
  if (prices.length < slowPeriod + signalPeriod) {
    return 'NEUTRAL';
  }

  const macdResult = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
  
  if (macdResult.macd.length === 0 || macdResult.signal.length === 0) {
    return 'NEUTRAL';
  }

  const currentMACD = macdResult.macd[macdResult.macd.length - 1];
  const currentSignal = macdResult.signal[macdResult.signal.length - 1];

  if (currentMACD > currentSignal) {
    return currentMACD > 0 ? 'BULLISH' : 'BUY';
  } else if (currentMACD < currentSignal) {
    return currentMACD < 0 ? 'BEARISH' : 'SELL';
  }

  return 'HOLD';
}

export default MACDIndicator;