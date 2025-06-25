"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Activity,
  RefreshCw,
  Eye,
  Star
} from 'lucide-react';
import { MarketData } from '@/types/trading';

interface MockMarketOverviewProps {
  data: MarketData[];
  onTickerClick?: (ticker: string) => void;
  showWatchlist?: boolean;
}

export function MockMarketOverview({ 
  data, 
  onTickerClick, 
  showWatchlist = false 
}: MockMarketOverviewProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1D' | '1W' | '1M' | '3M'>('1D');
  const [sortBy, setSortBy] = useState<'ticker' | 'price' | 'change' | 'volume'>('change');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(['AAPL', 'TSLA']));

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  };

  const sortedData = [...data].sort((a, b) => {
    let valueA: number;
    let valueB: number;

    switch (sortBy) {
      case 'ticker':
        return sortDirection === 'asc' 
          ? a.ticker.localeCompare(b.ticker)
          : b.ticker.localeCompare(a.ticker);
      case 'price':
        valueA = a.currentPrice;
        valueB = b.currentPrice;
        break;
      case 'change':
        valueA = a.changePercent;
        valueB = b.changePercent;
        break;
      case 'volume':
        valueA = a.volume;
        valueB = b.volume;
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
  });

  const toggleWatchlist = (ticker: string) => {
    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(ticker)) {
      newWatchlist.delete(ticker);
    } else {
      newWatchlist.add(ticker);
    }
    setWatchlist(newWatchlist);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Calculate market sentiment
  const gainers = data.filter(item => item.changePercent > 0).length;
  const losers = data.filter(item => item.changePercent < 0).length;
  const unchanged = data.filter(item => item.changePercent === 0).length;
  const marketSentiment = gainers > losers ? 'Bullish' : losers > gainers ? 'Bearish' : 'Neutral';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Market Overview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={marketSentiment === 'Bullish' ? 'default' : 
                      marketSentiment === 'Bearish' ? 'destructive' : 'secondary'}
            >
              {marketSentiment}
            </Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{gainers}</div>
            <div className="text-sm text-muted-foreground">Gainers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{losers}</div>
            <div className="text-sm text-muted-foreground">Losers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{unchanged}</div>
            <div className="text-sm text-muted-foreground">Unchanged</div>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex space-x-2 mt-4">
          {(['1D', '1W', '1M', '3M'] as const).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No market data available</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 px-4 py-2 border-b font-medium text-sm text-muted-foreground">
              <button 
                className="text-left hover:text-foreground flex items-center space-x-1"
                onClick={() => handleSort('ticker')}
              >
                <span>Symbol</span>
                {sortBy === 'ticker' && (
                  <TrendingUp className={`h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <button 
                className="text-right hover:text-foreground flex items-center justify-end space-x-1"
                onClick={() => handleSort('price')}
              >
                <span>Price</span>
                {sortBy === 'price' && (
                  <TrendingUp className={`h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <button 
                className="text-right hover:text-foreground flex items-center justify-end space-x-1"
                onClick={() => handleSort('change')}
              >
                <span>Change</span>
                {sortBy === 'change' && (
                  <TrendingUp className={`h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <div className="text-right">% Change</div>
              <button 
                className="text-right hover:text-foreground flex items-center justify-end space-x-1"
                onClick={() => handleSort('volume')}
              >
                <span>Volume</span>
                {sortBy === 'volume' && (
                  <TrendingUp className={`h-3 w-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                )}
              </button>
              <div className="text-right">Market Cap</div>
            </div>

            {/* Table Body */}
            <ScrollArea className="h-[300px] w-full">
              <div className="space-y-1">
                {sortedData.map((item) => {
                  const isPositive = item.changePercent >= 0;
                  const isWatched = watchlist.has(item.ticker);
                  
                  return (
                    <div
                      key={item.ticker}
                      className={`grid grid-cols-6 gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer
                        ${isWatched ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' : ''}`}
                      onClick={() => onTickerClick?.(item.ticker)}
                    >
                      {/* Symbol */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(item.ticker);
                          }}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star className={`h-4 w-4 ${isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </button>
                        <span className="font-semibold">{item.ticker}</span>
                      </div>

                      {/* Price */}
                      <div className="text-right font-medium">
                        ${item.currentPrice.toFixed(2)}
                      </div>

                      {/* Change */}
                      <div className={`text-right font-medium flex items-center justify-end space-x-1 
                        ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{isPositive ? '+' : ''}{item.change.toFixed(2)}</span>
                      </div>

                      {/* Percentage Change */}
                      <div className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </div>

                      {/* Volume */}
                      <div className="text-right text-sm text-muted-foreground">
                        {formatVolume(item.volume)}
                      </div>

                      {/* Market Cap */}
                      <div className="text-right text-sm text-muted-foreground">
                        {formatMarketCap(item.marketCap)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3" />
                  <span>{data.length} stocks</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{watchlist.size} watched</span>
                </div>
              </div>
              <div>
                Updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}