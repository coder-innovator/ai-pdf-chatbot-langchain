/**
 * Technical Analysis Calculation Utilities
 * Core mathematical functions for financial technical indicators
 */

/**
 * Market data point interface
 */
export interface MarketDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
}

/**
 * Price data for calculations (simplified)
 */
export interface PriceData {
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

/**
 * Simple Moving Average calculation
 */
export function calculateSMA(prices: number[], period: number): number[] {
  if (period <= 0 || period > prices.length) {
    throw new Error(`Invalid SMA period: ${period}. Must be between 1 and ${prices.length}`);
  }

  const sma: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((acc, price) => acc + price, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Exponential Moving Average calculation
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (period <= 0 || period > prices.length) {
    throw new Error(`Invalid EMA period: ${period}`);
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA value is the SMA
  const initialSMA = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;
  ema.push(initialSMA);

  // Calculate subsequent EMA values
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }

  return ema;
}

/**
 * Relative Strength Index calculation
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (period <= 0 || period >= prices.length) {
    throw new Error(`Invalid RSI period: ${period}`);
  }

  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial averages
  let avgGain = gains.slice(0, period).reduce((acc, gain) => acc + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((acc, loss) => acc + loss, 0) / period;

  // Calculate RSI for each point
  for (let i = period; i < gains.length; i++) {
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }

    // Update running averages (Wilder's smoothing)
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
  }

  return rsi;
}

/**
 * MACD calculation (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDResult {
  if (slowPeriod >= prices.length) {
    throw new Error(`Insufficient data for MACD calculation. Need at least ${slowPeriod} data points`);
  }

  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Calculate MACD line
  const macd: number[] = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    macd.push(fastEMA[i + startIndex] - slowEMA[i]);
  }

  // Calculate Signal line (EMA of MACD)
  const signal = calculateEMA(macd, signalPeriod);

  // Calculate Histogram
  const histogram: number[] = [];
  const signalStartIndex = signalPeriod - 1;
  
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[i + signalStartIndex] - signal[i]);
  }

  return { macd, signal, histogram };
}

/**
 * Bollinger Bands calculation
 */
export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateBollingerBands(
  prices: number[], 
  period: number = 20, 
  stdDevMultiplier: number = 2
): BollingerBands {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < sma.length; i++) {
    const startIndex = i;
    const endIndex = i + period;
    const subset = prices.slice(startIndex, endIndex);
    
    // Calculate standard deviation
    const mean = sma[i];
    const variance = subset.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    upper.push(mean + (stdDevMultiplier * stdDev));
    lower.push(mean - (stdDevMultiplier * stdDev));
  }

  return {
    upper,
    middle: sma,
    lower
  };
}

/**
 * Stochastic Oscillator calculation
 */
export interface StochasticResult {
  k: number[];
  d: number[];
}

export function calculateStochastic(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  kPeriod: number = 14, 
  dPeriod: number = 3
): StochasticResult {
  if (highs.length !== lows.length || lows.length !== closes.length) {
    throw new Error('High, low, and close arrays must have the same length');
  }

  const k: number[] = [];

  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    const currentClose = closes[i];
    
    if (highestHigh === lowestLow) {
      k.push(50); // Avoid division by zero
    } else {
      k.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
    }
  }

  // Calculate %D (SMA of %K)
  const d = calculateSMA(k, dPeriod);

  return { k, d };
}

/**
 * Average True Range calculation
 */
export function calculateATR(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  period: number = 14
): number[] {
  if (highs.length !== lows.length || lows.length !== closes.length) {
    throw new Error('High, low, and close arrays must have the same length');
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);

    trueRanges.push(Math.max(tr1, tr2, tr3));
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Williams %R calculation
 */
export function calculateWilliamsR(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  period: number = 14
): number[] {
  if (highs.length !== lows.length || lows.length !== closes.length) {
    throw new Error('High, low, and close arrays must have the same length');
  }

  const williamsR: number[] = [];

  for (let i = period - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - period + 1, i + 1);
    const periodLows = lows.slice(i - period + 1, i + 1);
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    const currentClose = closes[i];
    
    if (highestHigh === lowestLow) {
      williamsR.push(-50); // Neutral value when no range
    } else {
      const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
      williamsR.push(wr);
    }
  }

  return williamsR;
}

/**
 * Calculate price volatility (standard deviation of returns)
 */
export function calculateVolatility(prices: number[], period: number = 20): number[] {
  const returns: number[] = [];
  
  // Calculate returns
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const volatility: number[] = [];

  for (let i = period - 1; i < returns.length; i++) {
    const subset = returns.slice(i - period + 1, i + 1);
    const mean = subset.reduce((acc, ret) => acc + ret, 0) / period;
    const variance = subset.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / period;
    volatility.push(Math.sqrt(variance * 252)); // Annualized volatility
  }

  return volatility;
}

/**
 * Support and Resistance level detection
 */
export interface SupportResistanceLevel {
  level: number;
  strength: number;
  type: 'support' | 'resistance';
  touches: number[];
}

export function findSupportResistanceLevels(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  lookback: number = 20,
  tolerance: number = 0.02
): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];
  const allPrices = [...highs, ...lows];
  const uniquePrices = [...new Set(allPrices)].sort((a, b) => a - b);

  for (const price of uniquePrices) {
    const touches: number[] = [];
    
    // Find touches within tolerance
    for (let i = 0; i < closes.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const close = closes[i];
      
      if (Math.abs(high - price) / price <= tolerance ||
          Math.abs(low - price) / price <= tolerance ||
          Math.abs(close - price) / price <= tolerance) {
        touches.push(i);
      }
    }

    // Consider significant if multiple touches
    if (touches.length >= 3) {
      // Determine if support or resistance
      const avgCloseAbove = touches.reduce((acc, idx) => {
        return acc + (closes[idx] > price ? 1 : 0);
      }, 0) / touches.length;

      const type = avgCloseAbove > 0.5 ? 'support' : 'resistance';
      
      levels.push({
        level: price,
        strength: touches.length,
        type,
        touches
      });
    }
  }

  return levels
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10); // Return top 10 levels
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Calculate correlation between two price series
 */
export function calculateCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length) {
    throw new Error('Series must have the same length');
  }

  const n = series1.length;
  if (n === 0) return 0;

  const mean1 = series1.reduce((acc, val) => acc + val, 0) / n;
  const mean2 = series2.reduce((acc, val) => acc + val, 0) / n;

  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;
    
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }

  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Validate market data array
 */
export function validateMarketData(data: MarketDataPoint[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  return data.every(point => 
    typeof point.open === 'number' &&
    typeof point.high === 'number' &&
    typeof point.low === 'number' &&
    typeof point.close === 'number' &&
    typeof point.volume === 'number' &&
    point.high >= point.low &&
    point.high >= point.open &&
    point.high >= point.close &&
    point.low <= point.open &&
    point.low <= point.close &&
    point.volume >= 0 &&
    point.timestamp instanceof Date
  );
}

/**
 * Convert market data to price arrays
 */
export function extractPriceArrays(data: MarketDataPoint[]): {
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
} {
  return {
    opens: data.map(d => d.open),
    highs: data.map(d => d.high),
    lows: data.map(d => d.low),
    closes: data.map(d => d.close),
    volumes: data.map(d => d.volume)
  };
}