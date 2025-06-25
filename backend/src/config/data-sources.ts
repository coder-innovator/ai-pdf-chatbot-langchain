import { YahooFinanceService } from '../services/market-data/yahoo-finance.js';
import { FreeDataAggregator } from '../services/market-data/free-data-aggregator.js';
import { MockDataGenerator } from '../services/market-data/mock-data-generator.js';
import { DataNormalizer } from '../services/market-data/data-normalizer.js';

/**
 * Data source configuration types
 */
export interface DataSourceConfig {
  // Provider settings
  provider: 'yahoo' | 'aggregator' | 'mock';
  fallbackToMock: boolean;
  
  // API settings
  apiKeys: {
    alphaVantage?: string;
    iexCloud?: string;
    finnhub?: string;
    twelveData?: string;
    polygon?: string;
  };
  
  // Rate limiting
  rateLimits: {
    yahoo: number; // requests per minute
    alphaVantage: number;
    iexCloud: number;
    finnhub: number;
    twelveData: number;
  };
  
  // Quality and reliability
  dataQuality: {
    enableValidation: boolean;
    strictMode: boolean;
    maxPriceVariation: number; // percentage
    enableCorrections: boolean;
    allowNegativePrices: boolean;
  };
  
  // Caching
  cache: {
    enabled: boolean;
    quoteTtl: number; // seconds
    historicalTtl: number; // seconds
    newsTtl: number; // seconds
    maxCacheSize: number; // MB
  };
  
  // Mock data settings
  mockData: {
    volatility: 'low' | 'medium' | 'high';
    marketTrend: 'bull' | 'bear' | 'sideways';
    dataSize: 'small' | 'medium' | 'large';
    realism: 'basic' | 'advanced' | 'ultra';
  };
  
  // Regional settings
  regional: {
    timezone: string;
    currency: string;
    exchanges: string[];
    marketHours: {
      [exchange: string]: {
        open: string; // HH:mm
        close: string; // HH:mm
        timezone: string;
      };
    };
  };
  
  // Features
  features: {
    realTimeData: boolean;
    historicalData: boolean;
    newsData: boolean;
    cryptoData: boolean;
    optionsData: boolean;
    economicData: boolean;
    sentimentAnalysis: boolean;
  };
}

/**
 * Environment-specific configurations
 */
export const DATA_SOURCE_CONFIGS = {
  development: {
    provider: 'mock' as const,
    fallbackToMock: true,
    
    apiKeys: {
      alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
      iexCloud: process.env.IEX_CLOUD_API_KEY,
      finnhub: process.env.FINNHUB_API_KEY,
      twelveData: process.env.TWELVE_DATA_API_KEY,
      polygon: process.env.POLYGON_API_KEY,
    },
    
    rateLimits: {
      yahoo: 2000,
      alphaVantage: 5,
      iexCloud: 100,
      finnhub: 60,
      twelveData: 8,
    },
    
    dataQuality: {
      enableValidation: true,
      strictMode: false,
      maxPriceVariation: 0.5, // 50%
      enableCorrections: true,
      allowNegativePrices: false,
    },
    
    cache: {
      enabled: true,
      quoteTtl: 30, // 30 seconds
      historicalTtl: 3600, // 1 hour
      newsTtl: 300, // 5 minutes
      maxCacheSize: 100, // 100 MB
    },
    
    mockData: {
      volatility: 'medium' as const,
      marketTrend: 'bull' as const,
      dataSize: 'medium' as const,
      realism: 'advanced' as const,
    },
    
    regional: {
      timezone: 'America/New_York',
      currency: 'USD',
      exchanges: ['NYSE', 'NASDAQ', 'AMEX'],
      marketHours: {
        NYSE: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        NASDAQ: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        CRYPTO: { open: '00:00', close: '23:59', timezone: 'UTC' },
      },
    },
    
    features: {
      realTimeData: false,
      historicalData: true,
      newsData: true,
      cryptoData: false,
      optionsData: false,
      economicData: false,
      sentimentAnalysis: true,
    },
  },
  
  staging: {
    provider: 'aggregator' as const,
    fallbackToMock: true,
    
    apiKeys: {
      alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
      iexCloud: process.env.IEX_CLOUD_API_KEY,
      finnhub: process.env.FINNHUB_API_KEY,
      twelveData: process.env.TWELVE_DATA_API_KEY,
      polygon: process.env.POLYGON_API_KEY,
    },
    
    rateLimits: {
      yahoo: 2000,
      alphaVantage: 5,
      iexCloud: 100,
      finnhub: 60,
      twelveData: 8,
    },
    
    dataQuality: {
      enableValidation: true,
      strictMode: false,
      maxPriceVariation: 0.3, // 30%
      enableCorrections: true,
      allowNegativePrices: false,
    },
    
    cache: {
      enabled: true,
      quoteTtl: 15, // 15 seconds
      historicalTtl: 1800, // 30 minutes
      newsTtl: 180, // 3 minutes
      maxCacheSize: 500, // 500 MB
    },
    
    mockData: {
      volatility: 'low' as const,
      marketTrend: 'sideways' as const,
      dataSize: 'large' as const,
      realism: 'ultra' as const,
    },
    
    regional: {
      timezone: 'America/New_York',
      currency: 'USD',
      exchanges: ['NYSE', 'NASDAQ', 'AMEX', 'BATS', 'IEX'],
      marketHours: {
        NYSE: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        NASDAQ: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        CRYPTO: { open: '00:00', close: '23:59', timezone: 'UTC' },
      },
    },
    
    features: {
      realTimeData: true,
      historicalData: true,
      newsData: true,
      cryptoData: true,
      optionsData: false,
      economicData: true,
      sentimentAnalysis: true,
    },
  },
  
  production: {
    provider: 'aggregator' as const,
    fallbackToMock: false,
    
    apiKeys: {
      alphaVantage: process.env.ALPHA_VANTAGE_API_KEY,
      iexCloud: process.env.IEX_CLOUD_API_KEY,
      finnhub: process.env.FINNHUB_API_KEY,
      twelveData: process.env.TWELVE_DATA_API_KEY,
      polygon: process.env.POLYGON_API_KEY,
    },
    
    rateLimits: {
      yahoo: 2000,
      alphaVantage: 500, // Premium tier
      iexCloud: 1000, // Premium tier
      finnhub: 300, // Premium tier
      twelveData: 800, // Premium tier
    },
    
    dataQuality: {
      enableValidation: true,
      strictMode: true,
      maxPriceVariation: 0.2, // 20%
      enableCorrections: true,
      allowNegativePrices: false,
    },
    
    cache: {
      enabled: true,
      quoteTtl: 5, // 5 seconds
      historicalTtl: 900, // 15 minutes
      newsTtl: 60, // 1 minute
      maxCacheSize: 2000, // 2 GB
    },
    
    mockData: {
      volatility: 'medium' as const,
      marketTrend: 'bull' as const,
      dataSize: 'large' as const,
      realism: 'ultra' as const,
    },
    
    regional: {
      timezone: 'America/New_York',
      currency: 'USD',
      exchanges: ['NYSE', 'NASDAQ', 'AMEX', 'BATS', 'IEX'],
      marketHours: {
        NYSE: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        NASDAQ: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        LSE: { open: '08:00', close: '16:30', timezone: 'Europe/London' },
        TSE: { open: '09:00', close: '15:00', timezone: 'Asia/Tokyo' },
        CRYPTO: { open: '00:00', close: '23:59', timezone: 'UTC' },
      },
    },
    
    features: {
      realTimeData: true,
      historicalData: true,
      newsData: true,
      cryptoData: true,
      optionsData: true,
      economicData: true,
      sentimentAnalysis: true,
    },
  },
} satisfies Record<string, DataSourceConfig>;

/**
 * Get configuration for current environment
 */
export function getDataSourceConfig(): DataSourceConfig {
  const env = process.env.NODE_ENV || 'development';
  const config = DATA_SOURCE_CONFIGS[env as keyof typeof DATA_SOURCE_CONFIGS];
  
  if (!config) {
    console.warn(`Unknown environment: ${env}, falling back to development config`);
    return DATA_SOURCE_CONFIGS.development;
  }
  
  return config;
}

/**
 * Data service factory
 */
export class DataServiceFactory {
  private config: DataSourceConfig;
  private yahooService?: YahooFinanceService;
  private aggregatorService?: FreeDataAggregator;
  private mockGenerator?: MockDataGenerator;
  private normalizer?: DataNormalizer;

  constructor(config?: DataSourceConfig) {
    this.config = config || getDataSourceConfig();
  }

  /**
   * Get the primary data service based on configuration
   */
  getPrimaryDataService(): YahooFinanceService | FreeDataAggregator | MockDataGenerator {
    switch (this.config.provider) {
      case 'yahoo':
        return this.getYahooService();
      case 'aggregator':
        return this.getAggregatorService();
      case 'mock':
        return this.getMockGenerator();
      default:
        console.warn(`Unknown provider: ${this.config.provider}, falling back to mock`);
        return this.getMockGenerator();
    }
  }

  /**
   * Get Yahoo Finance service
   */
  getYahooService(): YahooFinanceService {
    if (!this.yahooService) {
      this.yahooService = new YahooFinanceService({
        mockFallback: this.config.fallbackToMock,
        rateLimitDelay: Math.floor(60000 / this.config.rateLimits.yahoo), // Convert to delay in ms
      });
    }
    return this.yahooService;
  }

  /**
   * Get aggregator service
   */
  getAggregatorService(): FreeDataAggregator {
    if (!this.aggregatorService) {
      this.aggregatorService = new FreeDataAggregator();
    }
    return this.aggregatorService;
  }

  /**
   * Get mock data generator
   */
  getMockGenerator(): MockDataGenerator {
    if (!this.mockGenerator) {
      this.mockGenerator = new MockDataGenerator(this.config.mockData);
    }
    return this.mockGenerator;
  }

  /**
   * Get data normalizer
   */
  getDataNormalizer(): DataNormalizer {
    if (!this.normalizer) {
      this.normalizer = new DataNormalizer({
        timezone: this.config.regional.timezone,
        currency: this.config.regional.currency,
        validation: this.config.dataQuality,
        precision: {
          price: 4,
          volume: 0,
          percentage: 2,
        },
      });
    }
    return this.normalizer;
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    primary: { service: string; healthy: boolean; latency?: number };
    fallback: { available: boolean; service: string };
    features: { [key: string]: boolean };
  }> {
    const start = Date.now();
    let primaryHealthy = false;
    let latency: number | undefined;

    try {
      const service = this.getPrimaryDataService();
      
      if (service instanceof YahooFinanceService) {
        await service.getStockPrice('AAPL');
        primaryHealthy = true;
        latency = Date.now() - start;
      } else if (service instanceof FreeDataAggregator) {
        const health = await service.getSourcesHealth();
        primaryHealthy = Object.values(health).some(h => h.healthy);
        latency = Date.now() - start;
      } else {
        // Mock service is always healthy
        primaryHealthy = true;
        latency = Date.now() - start;
      }
    } catch (error) {
      console.warn('Primary service health check failed:', error);
    }

    return {
      primary: {
        service: this.config.provider,
        healthy: primaryHealthy,
        latency,
      },
      fallback: {
        available: this.config.fallbackToMock,
        service: 'mock',
      },
      features: this.config.features,
    };
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): {
    provider: string;
    environment: string;
    features: string[];
    rateLimits: { [key: string]: number };
    caching: boolean;
  } {
    const enabledFeatures = Object.entries(this.config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);

    return {
      provider: this.config.provider,
      environment: process.env.NODE_ENV || 'development',
      features: enabledFeatures,
      rateLimits: this.config.rateLimits,
      caching: this.config.cache.enabled,
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Reset services to pick up new config
    this.yahooService = undefined;
    this.aggregatorService = undefined;
    this.mockGenerator = undefined;
    this.normalizer = undefined;
  }

  /**
   * Test all configured data sources
   */
  async testAllSources(): Promise<{
    [source: string]: {
      available: boolean;
      latency?: number;
      error?: string;
      sampleData?: any;
    };
  }> {
    const results: { [source: string]: any } = {};

    // Test Yahoo Finance
    try {
      const start = Date.now();
      const yahoo = this.getYahooService();
      const quote = await yahoo.getStockPrice('AAPL');
      results.yahoo = {
        available: true,
        latency: Date.now() - start,
        sampleData: { symbol: quote.symbol, price: quote.close },
      };
    } catch (error) {
      results.yahoo = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test Aggregator
    if (this.config.provider === 'aggregator') {
      try {
        const start = Date.now();
        const aggregator = this.getAggregatorService();
        const health = await aggregator.getSourcesHealth();
        results.aggregator = {
          available: Object.values(health).some(h => h.healthy),
          latency: Date.now() - start,
          sampleData: health,
        };
      } catch (error) {
        results.aggregator = {
          available: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Test Mock Generator
    try {
      const start = Date.now();
      const mock = this.getMockGenerator();
      const quote = mock.generateQuote('AAPL');
      results.mock = {
        available: true,
        latency: Date.now() - start,
        sampleData: { symbol: quote.symbol, price: quote.close },
      };
    } catch (error) {
      results.mock = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return results;
  }
}

/**
 * Global data service factory instance
 */
let globalDataServiceFactory: DataServiceFactory | null = null;

/**
 * Get or create global data service factory
 */
export function getDataServiceFactory(config?: DataSourceConfig): DataServiceFactory {
  if (!globalDataServiceFactory) {
    globalDataServiceFactory = new DataServiceFactory(config);
  }
  return globalDataServiceFactory;
}

/**
 * Reset global factory (useful for testing)
 */
export function resetDataServiceFactory(): void {
  globalDataServiceFactory = null;
}

/**
 * Environment detection utilities
 */
export const ENV_UTILS = {
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isStaging: () => process.env.NODE_ENV === 'staging',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test',
  
  hasApiKey: (provider: keyof DataSourceConfig['apiKeys']) => {
    const config = getDataSourceConfig();
    return Boolean(config.apiKeys[provider]);
  },
  
  getEnabledProviders: () => {
    const config = getDataSourceConfig();
    const providers: string[] = [];
    
    if (config.provider === 'yahoo' || config.provider === 'aggregator') {
      providers.push('yahoo');
    }
    
    Object.entries(config.apiKeys).forEach(([provider, key]) => {
      if (key) providers.push(provider);
    });
    
    if (config.fallbackToMock) {
      providers.push('mock');
    }
    
    return providers;
  },
};

/**
 * Default export: data service factory
 */
export default DataServiceFactory;