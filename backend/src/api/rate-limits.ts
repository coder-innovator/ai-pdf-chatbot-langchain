/**
 * Rate Limiting API Endpoints
 * Provides monitoring and management endpoints for rate limiting system
 */

import { Request, Response } from 'express';
import { rateLimiter } from '../services/rate-limiting/rate-limiter.js';
import { rateLimitedClient } from '../services/rate-limiting/rate-limited-client.js';

/**
 * Get comprehensive rate limiting status and usage report
 */
export async function getRateLimitStatus(req: Request, res: Response) {
  try {
    const usageReport = rateLimiter.getUsageReport();
    const cacheStats = rateLimitedClient.getCacheStats();
    const totalCosts = rateLimiter.getTotalCosts();

    const report = {
      timestamp: new Date(),
      summary: {
        totalProviders: usageReport.length,
        dailyCost: totalCosts.daily,
        estimatedMonthlyCost: totalCosts.monthly,
        cacheEntries: cacheStats.totalEntries
      },
      providers: usageReport.map(item => ({
        provider: item.provider,
        status: item.usage.remainingCalls > 0 ? 'healthy' : 'limited',
        usage: {
          current: item.usage.count,
          limit: item.config.limits[item.usage.period],
          remaining: item.usage.remainingCalls,
          resetTime: item.usage.resetTime,
          utilizationPercent: item.config.limits[item.usage.period] 
            ? Math.round((item.usage.count / item.config.limits[item.usage.period]!) * 100)
            : 0
        },
        cost: {
          perCall: item.config.cost || 0,
          totalToday: item.usage.estimatedCost,
          estimatedMonthly: (item.usage.estimatedCost || 0) * 30
        },
        priority: item.config.priority,
        limits: item.config.limits
      })),
      cache: {
        totalEntries: cacheStats.totalEntries,
        entries: cacheStats.entries.map(entry => ({
          key: entry.key,
          ageSeconds: entry.age,
          size: entry.size
        }))
      },
      alerts: generateAlerts(usageReport)
    };

    res.json(report);
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({ 
      error: 'Failed to get rate limit status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update rate limit configuration for a provider
 */
export async function updateRateLimit(req: Request, res: Response) {
  try {
    const { provider } = req.params;
    const config = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider parameter is required' });
    }

    // Validate configuration
    if (!config.limits || typeof config.limits !== 'object') {
      return res.status(400).json({ error: 'Valid limits configuration is required' });
    }

    rateLimiter.setRateLimit(provider, {
      provider,
      limits: config.limits,
      cost: config.cost || 0,
      priority: config.priority || 'medium'
    });

    console.log(`📝 Rate limit updated for ${provider}:`, config);

    res.json({ 
      success: true, 
      message: `Rate limit configuration updated for ${provider}`,
      config: {
        provider,
        ...config
      }
    });
  } catch (error) {
    console.error('Error updating rate limit:', error);
    res.status(500).json({ 
      error: 'Failed to update rate limit',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Reset usage statistics for a provider
 */
export async function resetProviderUsage(req: Request, res: Response) {
  try {
    const { provider } = req.params;

    if (!provider) {
      return res.status(400).json({ error: 'Provider parameter is required' });
    }

    rateLimiter.resetUsage(provider);

    console.log(`🔄 Usage reset for ${provider}`);

    res.json({ 
      success: true, 
      message: `Usage statistics reset for ${provider}` 
    });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ 
      error: 'Failed to reset usage',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Clear API cache
 */
export async function clearCache(req: Request, res: Response) {
  try {
    rateLimitedClient.clearCache();

    console.log('🗑️ API cache cleared via admin request');

    res.json({ 
      success: true, 
      message: 'API cache cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get detailed usage analytics
 */
export async function getUsageAnalytics(req: Request, res: Response) {
  try {
    const usageReport = rateLimiter.getUsageReport();
    const totalCosts = rateLimiter.getTotalCosts();

    // Calculate analytics
    const analytics = {
      timestamp: new Date(),
      totalRequests: usageReport.reduce((sum, item) => sum + item.usage.count, 0),
      totalCost: totalCosts.daily,
      averageUtilization: calculateAverageUtilization(usageReport),
      mostUsedProvider: getMostUsedProvider(usageReport),
      costBreakdown: Array.from(totalCosts.providers.entries()).map(([provider, cost]) => ({
        provider,
        cost,
        percentage: totalCosts.daily > 0 ? Math.round((cost / totalCosts.daily) * 100) : 0
      })),
      utilizationByProvider: usageReport.map(item => ({
        provider: item.provider,
        utilization: item.config.limits[item.usage.period] 
          ? Math.round((item.usage.count / item.config.limits[item.usage.period]!) * 100)
          : 0,
        remaining: item.usage.remainingCalls,
        priority: item.config.priority
      }))
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get usage analytics',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Test rate limiting for a specific provider
 */
export async function testRateLimit(req: Request, res: Response) {
  try {
    const { provider, endpoint } = req.params;

    if (!provider) {
      return res.status(400).json({ error: 'Provider parameter is required' });
    }

    const result = await rateLimiter.checkRateLimit(provider, endpoint);

    res.json({
      provider,
      endpoint: endpoint || 'default',
      result: {
        allowed: result.allowed,
        waitTime: result.waitTime,
        reason: result.reason,
        usage: result.usage
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error testing rate limit:', error);
    res.status(500).json({ 
      error: 'Failed to test rate limit',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate alerts based on usage patterns
 */
function generateAlerts(usageReport: any[]): Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> {
  const alerts: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

  for (const item of usageReport) {
    const utilization = item.config.limits[item.usage.period] 
      ? (item.usage.count / item.config.limits[item.usage.period]) * 100
      : 0;

    if (utilization >= 90) {
      alerts.push({
        type: 'rate_limit_critical',
        message: `${item.provider} is at ${Math.round(utilization)}% of rate limit`,
        severity: 'high'
      });
    } else if (utilization >= 75) {
      alerts.push({
        type: 'rate_limit_warning',
        message: `${item.provider} is at ${Math.round(utilization)}% of rate limit`,
        severity: 'medium'
      });
    }

    if (item.usage.estimatedCost > 10) { // More than $10/day
      alerts.push({
        type: 'cost_warning',
        message: `${item.provider} daily cost is $${item.usage.estimatedCost.toFixed(2)}`,
        severity: 'medium'
      });
    }
  }

  return alerts;
}

/**
 * Calculate average utilization across all providers
 */
function calculateAverageUtilization(usageReport: any[]): number {
  if (usageReport.length === 0) return 0;

  const totalUtilization = usageReport.reduce((sum, item) => {
    const utilization = item.config.limits[item.usage.period] 
      ? (item.usage.count / item.config.limits[item.usage.period]) * 100
      : 0;
    return sum + utilization;
  }, 0);

  return Math.round(totalUtilization / usageReport.length);
}

/**
 * Find the most used provider
 */
function getMostUsedProvider(usageReport: any[]): { provider: string; count: number } | null {
  if (usageReport.length === 0) return null;

  const mostUsed = usageReport.reduce((max, item) => 
    item.usage.count > max.usage.count ? item : max
  );

  return {
    provider: mostUsed.provider,
    count: mostUsed.usage.count
  };
}