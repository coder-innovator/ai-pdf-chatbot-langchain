/**
 * Centralized Rate Limiting Service
 * Manages API call limits for all data providers with sophisticated tracking
 */

export interface RateLimitConfig {
  provider: string;
  limits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
    perMonth?: number;
  };
  cost?: number; // Cost per call (for budget tracking)
  priority: 'high' | 'medium' | 'low';
}

export interface UsageStats {
  provider: string;
  period: 'second' | 'minute' | 'hour' | 'day' | 'month';
  count: number;
  resetTime: Date;
  remainingCalls: number;
  estimatedCost: number;
}

export interface RateLimitResult {
  allowed: boolean;
  waitTime?: number; // milliseconds to wait before retry
  reason?: string;
  usage: UsageStats;
}

/**
 * Rate limiter with multiple time windows and cost tracking
 */
export class RateLimiter {
  private usage: Map<string, Map<string, { count: number; resetTime: Date }>> = new Map();
  private config: Map<string, RateLimitConfig> = new Map();
  private totalCosts: Map<string, number> = new Map(); // Daily costs per provider

  constructor() {
    this.initializeDefaultConfigs();
    this.startCleanupTimer();
  }

  /**
   * Initialize default rate limit configurations for known providers
   */
  private initializeDefaultConfigs() {
    // Alpha Vantage (Free Tier)
    this.setRateLimit('alphavantage', {
      provider: 'alphavantage',
      limits: {
        perMinute: 5,
        perDay: 500
      },
      cost: 0, // Free tier
      priority: 'medium'
    });

    // Finnhub (Free Tier)
    this.setRateLimit('finnhub', {
      provider: 'finnhub',
      limits: {
        perSecond: 1,
        perMinute: 60,
        perDay: 1000
      },
      cost: 0, // Free tier
      priority: 'high'
    });

    // IEX Cloud (Free Tier)
    this.setRateLimit('iexcloud', {
      provider: 'iexcloud',
      limits: {
        perSecond: 10,
        perMinute: 100,
        perMonth: 500000 // Messages per month
      },
      cost: 0, // Free tier
      priority: 'high'
    });

    // Yahoo Finance (Unofficial - be conservative)
    this.setRateLimit('yahoo', {
      provider: 'yahoo',
      limits: {
        perSecond: 2,
        perMinute: 10,
        perHour: 100
      },
      cost: 0,
      priority: 'low'
    });

    // Polygon (Premium)
    this.setRateLimit('polygon', {
      provider: 'polygon',
      limits: {
        perSecond: 5,
        perMinute: 100,
        perDay: 10000
      },
      cost: 0.003, // $0.003 per call
      priority: 'high'
    });

    // Alpaca (Trading API)
    this.setRateLimit('alpaca', {
      provider: 'alpaca',
      limits: {
        perSecond: 5,
        perMinute: 200,
        perDay: 10000
      },
      cost: 0,
      priority: 'high'
    });
  }

  /**
   * Set or update rate limit configuration for a provider
   */
  setRateLimit(provider: string, config: RateLimitConfig) {
    this.config.set(provider, config);
    console.log(`📊 Rate limit configured for ${provider}:`, config.limits);
  }

  /**
   * Check if an API call is allowed and track usage
   */
  async checkRateLimit(provider: string, endpoint?: string): Promise<RateLimitResult> {
    const config = this.config.get(provider);
    if (!config) {
      return {
        allowed: false,
        reason: `No rate limit configuration found for provider: ${provider}`,
        usage: this.getDefaultUsageStats(provider)
      };
    }

    const key = endpoint ? `${provider}:${endpoint}` : provider;
    const now = new Date();

    // Check all time windows
    for (const [period, limit] of Object.entries(config.limits)) {
      if (!limit) continue;

      const usage = this.getUsage(key, period as keyof RateLimitConfig['limits']);
      
      if (usage.count >= limit) {
        const waitTime = usage.resetTime.getTime() - now.getTime();
        
        console.warn(`⚠️ Rate limit exceeded for ${provider} (${period}): ${usage.count}/${limit}`);
        
        return {
          allowed: false,
          waitTime: Math.max(0, waitTime),
          reason: `Rate limit exceeded for ${period}: ${usage.count}/${limit}`,
          usage: {
            provider,
            period: period as any,
            count: usage.count,
            resetTime: usage.resetTime,
            remainingCalls: Math.max(0, limit - usage.count),
            estimatedCost: this.totalCosts.get(provider) || 0
          }
        };
      }
    }

    // All checks passed - increment usage
    this.incrementUsage(key, config);
    
    // Track costs
    if (config.cost && config.cost > 0) {
      const currentCost = this.totalCosts.get(provider) || 0;
      this.totalCosts.set(provider, currentCost + config.cost);
    }

    const primaryPeriod = this.getPrimaryPeriod(config);
    const usage = this.getUsage(key, primaryPeriod);

    console.log(`✅ API call allowed for ${provider} (${usage.count}/${config.limits[primaryPeriod] || 'unlimited'})`);

    return {
      allowed: true,
      usage: {
        provider,
        period: primaryPeriod,
        count: usage.count,
        resetTime: usage.resetTime,
        remainingCalls: Math.max(0, (config.limits[primaryPeriod] || 0) - usage.count),
        estimatedCost: this.totalCosts.get(provider) || 0
      }
    };
  }

  /**
   * Get usage statistics for a provider
   */
  getUsage(key: string, period: keyof RateLimitConfig['limits']) {
    if (!this.usage.has(key)) {
      this.usage.set(key, new Map());
    }

    const keyUsage = this.usage.get(key)!;
    const now = new Date();
    let resetTime: Date;

    switch (period) {
      case 'perSecond':
        resetTime = new Date(now.getTime() + 1000);
        break;
      case 'perMinute':
        resetTime = new Date(now.getTime() + 60000);
        break;
      case 'perHour':
        resetTime = new Date(now.getTime() + 3600000);
        break;
      case 'perDay':
        resetTime = new Date(now);
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
        break;
      case 'perMonth':
        resetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        resetTime = new Date(now.getTime() + 60000); // Default to 1 minute
    }

    const existing = keyUsage.get(period);
    if (!existing || existing.resetTime <= now) {
      // Reset the counter
      keyUsage.set(period, { count: 0, resetTime });
      return { count: 0, resetTime };
    }

    return existing;
  }

  /**
   * Increment usage count for a provider
   */
  private incrementUsage(key: string, config: RateLimitConfig) {
    for (const period of Object.keys(config.limits) as Array<keyof RateLimitConfig['limits']>) {
      if (config.limits[period]) {
        const usage = this.getUsage(key, period);
        usage.count++;
      }
    }
  }

  /**
   * Get the primary period for usage reporting
   */
  private getPrimaryPeriod(config: RateLimitConfig): keyof RateLimitConfig['limits'] {
    if (config.limits.perMinute) return 'perMinute';
    if (config.limits.perHour) return 'perHour';
    if (config.limits.perDay) return 'perDay';
    if (config.limits.perSecond) return 'perSecond';
    if (config.limits.perMonth) return 'perMonth';
    return 'perMinute';
  }

  /**
   * Get default usage stats for unknown providers
   */
  private getDefaultUsageStats(provider: string): UsageStats {
    return {
      provider,
      period: 'minute',
      count: 0,
      resetTime: new Date(),
      remainingCalls: 0,
      estimatedCost: 0
    };
  }

  /**
   * Get comprehensive usage report
   */
  getUsageReport(): { provider: string; usage: UsageStats; config: RateLimitConfig }[] {
    const report: { provider: string; usage: UsageStats; config: RateLimitConfig }[] = [];

    for (const [provider, config] of this.config.entries()) {
      const primaryPeriod = this.getPrimaryPeriod(config);
      const usage = this.getUsage(provider, primaryPeriod);
      
      report.push({
        provider,
        config,
        usage: {
          provider,
          period: primaryPeriod,
          count: usage.count,
          resetTime: usage.resetTime,
          remainingCalls: Math.max(0, (config.limits[primaryPeriod] || 0) - usage.count),
          estimatedCost: this.totalCosts.get(provider) || 0
        }
      });
    }

    return report;
  }

  /**
   * Get total estimated costs
   */
  getTotalCosts(): { daily: number; monthly: number; providers: Map<string, number> } {
    const daily = Array.from(this.totalCosts.values()).reduce((sum, cost) => sum + cost, 0);
    
    return {
      daily,
      monthly: daily * 30, // Rough estimate
      providers: new Map(this.totalCosts)
    };
  }

  /**
   * Reset usage for a specific provider (useful for testing)
   */
  resetUsage(provider: string) {
    this.usage.delete(provider);
    this.totalCosts.delete(provider);
    console.log(`🔄 Usage reset for ${provider}`);
  }

  /**
   * Start cleanup timer to remove expired usage records
   */
  private startCleanupTimer() {
    setInterval(() => {
      const now = new Date();
      for (const [key, keyUsage] of this.usage.entries()) {
        for (const [period, usage] of keyUsage.entries()) {
          if (usage.resetTime <= now) {
            keyUsage.delete(period);
          }
        }
        if (keyUsage.size === 0) {
          this.usage.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();