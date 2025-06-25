"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Volume2,
  Clock,
  Star,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { LiveTickerData } from '@/types/trading';

interface MockLiveTickerProps {
  tickers?: string[];
  updateInterval?: number;
  showVolume?: boolean;
  showMarketStatus?: boolean;
  height?: number;
  className?: string;
}

const DEFAULT_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX'];

export function MockLiveTicker({
  tickers = DEFAULT_TICKERS,
  updateInterval = 3000, // 3 seconds
  showVolume = true,
  showMarketStatus = true,
  height = 400,
  className = ''
}: MockLiveTickerProps) {
  const [tickerData, setTickerData] = useState<LiveTickerData[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(['AAPL', 'TSLA']));
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Base prices for realistic simulation
  const basePrices: { [key: string]: number } = {
    'AAPL': 150.25,
    'TSLA': 245.80,
    'NVDA': 420.15,
    'MSFT': 380.50,
    'GOOGL': 135.20,
    'AMZN': 145.75,
    'META': 320.40,
    'NFLX': 450.30,
    'AMD': 120.60,
    'CRM': 210.85
  };

  // Generate realistic ticker data
  const generateTickerData = (ticker: string, previousData?: LiveTickerData): LiveTickerData => {
    const basePrice = basePrices[ticker] || 100;
    const prevPrice = previousData?.price || basePrice;
    
    // Generate realistic price movement (±1% typical intraday movement)
    const volatility = 0.01;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const trendFactor = Math.sin(Date.now() / 200000) * 0.002; // Subtle trend
    const newPrice = prevPrice * (1 + randomChange + trendFactor);
    
    // Constrain price to reasonable range
    const constrainedPrice = Math.max(basePrice * 0.9, Math.min(basePrice * 1.15, newPrice));
    
    const change = constrainedPrice - (previousData?.price || basePrice);
    const changePercent = (change / (previousData?.price || basePrice)) * 100;
    
    // Generate volume
    const baseVolume = {
      'AAPL': 45000000,
      'TSLA': 35000000,
      'NVDA': 28000000,
      'MSFT': 25000000,
      'GOOGL': 20000000,
      'AMZN': 18000000,
      'META': 22000000,
      'NFLX': 12000000
    }[ticker] || 15000000;
    
    const volume = Math.floor(baseVolume * (0.7 + Math.random() * 0.6));
    
    // Calculate 24h high/low (simulated)
    const high24h = constrainedPrice * (1 + Math.random() * 0.03);
    const low24h = constrainedPrice * (1 - Math.random() * 0.03);
    
    // Determine trend
    let trend: LiveTickerData['trend'];
    if (Math.abs(changePercent) < 0.1) trend = 'SIDEWAYS';
    else if (changePercent > 0) trend = 'UP';
    else trend = 'DOWN';
    
    // Market status (9:30 AM - 4:00 PM ET simulation)
    const now = new Date();
    const hour = now.getHours();
    const isMarketOpen = hour >= 9 && hour < 16;
    
    return {
      ticker,
      price: parseFloat(constrainedPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume,
      high24h: parseFloat(high24h.toFixed(2)),
      low24h: parseFloat(low24h.toFixed(2)),
      timestamp: new Date().toISOString(),
      trend,
      isMarketOpen
    };
  };

  // Initialize ticker data
  useEffect(() => {
    const initialData = tickers.map(ticker => generateTickerData(ticker));
    setTickerData(initialData);
  }, [tickers]);

  // Real-time updates
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTickerData(prevData => {
        return prevData.map(ticker => {
          // Only update some tickers each interval for realism
          if (Math.random() < 0.7) {
            return generateTickerData(ticker.ticker, ticker);
          }
          return ticker;
        });
      });
      setLastUpdate(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isRunning, updateInterval]);

  const toggleWatchlist = (ticker: string) => {
    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(ticker)) {
      newWatchlist.delete(ticker);
    } else {
      newWatchlist.add(ticker);
    }
    setWatchlist(newWatchlist);
  };

  const getTrendIcon = (trend: LiveTickerData['trend']) => {
    switch (trend) {
      case 'UP':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'DOWN':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Live Market Ticker</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {showMarketStatus && (
              <Badge variant={tickerData[0]?.isMarketOpen ? "default" : "secondary"}>
                {tickerData[0]?.isMarketOpen ? 'Market Open' : 'Market Closed'}
              </Badge>
            )}
            <Badge variant="outline" className={isRunning ? 'border-green-500 text-green-600' : 'border-gray-500'}>
              <div className={`w-2 h-2 rounded-full mr-1 ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              {isRunning ? 'Live' : 'Paused'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <PauseCircle className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          <span>{watchlist.size} watched • {tickerData.length} tickers</span>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea style={{ height }}>
          <div className="space-y-2">
            {tickerData.map((ticker) => {
              const isWatched = watchlist.has(ticker.ticker);
              
              return (
                <Card 
                  key={ticker.ticker}
                  className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer
                    ${isWatched ? 'border-blue-200 bg-blue-50/30' : ''}
                    ${ticker.trend === 'UP' ? 'border-l-4 border-l-green-500' : 
                      ticker.trend === 'DOWN' ? 'border-l-4 border-l-red-500' : 
                      'border-l-4 border-l-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    {/* Ticker and Watchlist */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleWatchlist(ticker.ticker)}
                        className="hover:scale-110 transition-transform"
                      >
                        <Star className={`h-4 w-4 ${isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </button>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-lg">{ticker.ticker}</span>
                          {getTrendIcon(ticker.trend)}
                          {!ticker.isMarketOpen && (
                            <Badge variant="outline" className="text-xs">After Hours</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          H: ${ticker.high24h.toFixed(2)} • L: ${ticker.low24h.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Price and Change */}
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        ${ticker.price.toFixed(2)}
                      </div>
                      <div className={`text-sm font-medium ${getTrendColor(ticker.changePercent)}`}>
                        {ticker.change >= 0 ? '+' : ''}${ticker.change.toFixed(2)} 
                        ({ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%)
                      </div>
                    </div>

                    {/* Volume */}
                    {showVolume && (
                      <div className="text-right text-sm">
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Volume2 className="h-3 w-3" />
                          <span>Vol</span>
                        </div>
                        <div className="font-medium">{formatVolume(ticker.volume)}</div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(ticker.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}</span>
                    </div>
                  </div>

                  {/* Progress bar for price movement */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Day Range</span>
                      <span>{((ticker.price - ticker.low24h) / (ticker.high24h - ticker.low24h) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          ticker.trend === 'UP' ? 'bg-green-500' : 
                          ticker.trend === 'DOWN' ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                        style={{ 
                          width: `${Math.max(5, Math.min(95, (ticker.price - ticker.low24h) / (ticker.high24h - ticker.low24h) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {tickerData.filter(t => t.changePercent > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Gainers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {tickerData.filter(t => t.changePercent < 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Losers</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">
              {tickerData.filter(t => Math.abs(t.changePercent) < 0.1).length}
            </div>
            <div className="text-xs text-muted-foreground">Unchanged</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}