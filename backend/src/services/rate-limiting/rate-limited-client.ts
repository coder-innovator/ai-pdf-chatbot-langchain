/**
 * Rate-Limited API Client Wrapper
 * Automatically enforces rate limits for all API providers
 */

import { rateLimiter, RateLimitResult } from './rate-limiter.js';

export interface APICallOptions {
  provider: string;
  endpoint?: string;
  priority?: 'high' | 'medium' | 'low';
  maxRetries?: number;
  fallbackToCache?: boolean;
  fallbackData?: any;
}

export interface APICallResult<T = any> {
  success: boolean;
  data?: T;
  fromCache?: boolean;
  rateLimitInfo: RateLimitResult;
  error?: string;
  retriesUsed?: number;
}

/**
 * Wrapper that enforces rate limits on any API call
 */
export class RateLimitedAPIClient {
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();
  private retryQueue: Map<string, { resolve: Function; reject: Function; attempts: number }[]> = new Map();

  /**
   * Make a rate-limited API call with automatic retries and fallbacks
   */
  async makeAPICall<T = any>(
    apiCall: () => Promise<T>,
    options: APICallOptions
  ): Promise<APICallResult<T>> {
    const {
      provider,
      endpoint,
      priority = 'medium',
      maxRetries = 3,
      fallbackToCache = true,
      fallbackData
    } = options;

    let retriesUsed = 0;
    let lastError: string | undefined;

    // Try up to maxRetries times
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check rate limit
        const rateLimitResult = await rateLimiter.checkRateLimit(provider, endpoint);

        if (!rateLimitResult.allowed) {
          console.warn(`⚠️ Rate limit hit for ${provider}:`, rateLimitResult.reason);

          // If we have wait time and retries left, wait and retry
          if (rateLimitResult.waitTime && attempt < maxRetries) {
            console.log(`⏳ Waiting ${rateLimitResult.waitTime}ms before retry...`);
            await this.sleep(rateLimitResult.waitTime);
            retriesUsed++;
            continue;
          }

          // No more retries or no wait time - try fallbacks
          return this.handleFallback(provider, endpoint, rateLimitResult, fallbackToCache, fallbackData);
        }

        // Rate limit check passed - make the API call
        console.log(`🚀 Making API call to ${provider}${endpoint ? `/${endpoint}` : ''}`);
        const startTime = Date.now();
        
        const data = await apiCall();
        
        const duration = Date.now() - startTime;
        console.log(`✅ API call completed in ${duration}ms`);

        // Cache the result for fallback use
        if (fallbackToCache) {
          this.cacheResult(provider, endpoint, data);
        }

        return {
          success: true,
          data,
          rateLimitInfo: rateLimitResult,
          retriesUsed
        };

      } catch (error) {
        retriesUsed++;
        lastError = error instanceof Error ? error.message : String(error);
        
        console.error(`❌ API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError);

        // If it's a rate limit error from the provider, respect it
        if (lastError.includes('rate limit') || lastError.includes('429')) {
          console.log(`⏳ Provider rate limit detected, waiting 1 minute...`);
          await this.sleep(60000); // Wait 1 minute
        } else if (attempt < maxRetries) {
          // Exponential backoff for other errors
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`⏳ Retrying in ${backoffTime}ms...`);
          await this.sleep(backoffTime);
        }
      }
    }

    // All retries exhausted - try fallbacks
    console.error(`💥 All retries exhausted for ${provider}. Last error: ${lastError}`);
    
    const mockRateLimitResult: RateLimitResult = {
      allowed: false,
      reason: `All retries exhausted. Last error: ${lastError}`,
      usage: {
        provider,
        period: 'minute',
        count: 0,
        resetTime: new Date(),
        remainingCalls: 0,
        estimatedCost: 0
      }
    };

    return this.handleFallback(provider, endpoint, mockRateLimitResult, fallbackToCache, fallbackData);
  }

  /**
   * Handle fallback strategies when rate limits are hit or API calls fail
   */
  private handleFallback<T>(
    provider: string,
    endpoint: string | undefined,
    rateLimitResult: RateLimitResult,
    fallbackToCache: boolean,
    fallbackData?: T
  ): APICallResult<T> {
    
    // Try cache first
    if (fallbackToCache) {
      const cached = this.getCachedResult(provider, endpoint);
      if (cached) {
        console.log(`📦 Using cached data for ${provider}${endpoint ? `/${endpoint}` : ''}`);
        return {
          success: true,
          data: cached,
          fromCache: true,
          rateLimitInfo: rateLimitResult
        };
      }
    }

    // Try provided fallback data
    if (fallbackData !== undefined) {
      console.log(`🔄 Using fallback data for ${provider}${endpoint ? `/${endpoint}` : ''}`);
      return {
        success: true,
        data: fallbackData,
        fromCache: false,
        rateLimitInfo: rateLimitResult
      };
    }

    // No fallback available
    return {
      success: false,
      rateLimitInfo: rateLimitResult,
      error: rateLimitResult.reason || 'Rate limit exceeded and no fallback available'
    };
  }

  /**
   * Cache API result for fallback use
   */
  private cacheResult(provider: string, endpoint: string | undefined, data: any, ttlMinutes: number = 5) {
    const key = `${provider}:${endpoint || 'default'}`;
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });

    console.log(`💾 Cached result for ${key} (TTL: ${ttlMinutes}m)`);
  }

  /**
   * Get cached result if not expired
   */
  private getCachedResult(provider: string, endpoint: string | undefined): any | null {
    const key = `${provider}:${endpoint || 'default'}`;
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = new Date();
    const ageMs = now.getTime() - cached.timestamp.getTime();

    if (ageMs > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Sleep utility for waiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      entries: [] as Array<{ key: string; age: number; size: string }>
    };

    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      const ageMs = now.getTime() - value.timestamp.getTime();
      const size = JSON.stringify(value.data).length;
      
      stats.entries.push({
        key,
        age: Math.round(ageMs / 1000), // seconds
        size: `${Math.round(size / 1024)}KB`
      });
    }

    return stats;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ API cache cleared');
  }
}

// Singleton instance
export const rateLimitedClient = new RateLimitedAPIClient();