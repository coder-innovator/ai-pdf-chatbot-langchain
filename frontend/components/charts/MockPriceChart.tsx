"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Maximize2, RefreshCw } from 'lucide-react';
import { useMockMarketData } from '@/hooks/useMockMarketData';
import { MockMarketDataPoint } from '@/types/trading';

interface MockPriceChartProps {
  ticker: string;
  height?: number;
  showIndicators?: boolean;
  enableRealTime?: boolean;
  className?: string;
}

type ChartTimeframe = '1H' | '4H' | '1D' | '1W';
type ChartType = 'line' | 'candlestick' | 'area';

export function MockPriceChart({
  ticker,
  height = 400,
  showIndicators = true,
  enableRealTime = true,
  className = ''
}: MockPriceChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1D');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data, latestPrice, priceChange, isLoading, error, refetch } = useMockMarketData(ticker, {
    enableRealTime,
    updateInterval: 5000,
    maxDataPoints: 100
  });

  // Process data based on timeframe
  const processedData = useMemo(() => {
    if (!data.length) return [];
    
    // For demo, we'll use all data but could filter by timeframe
    return data.slice(-50); // Show last 50 points for performance
  }, [data, timeframe]);

  // Chart dimensions
  const chartWidth = 600;
  const chartHeight = height - 100;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  // Calculate price range
  const priceRange = useMemo(() => {
    if (!processedData.length) return { min: 0, max: 100 };
    
    const prices = processedData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    
    return {
      min: min - padding,
      max: max + padding
    };
  }, [processedData]);

  // Scale functions
  const scaleX = (index: number) => (index / (processedData.length - 1)) * plotWidth;
  const scaleY = (price: number) => 
    plotHeight - ((price - priceRange.min) / (priceRange.max - priceRange.min)) * plotHeight;

  // Generate SVG path for line chart
  const generateLinePath = () => {
    if (!processedData.length) return '';
    
    return processedData
      .map((point, index) => {
        const x = scaleX(index);
        const y = scaleY(point.price);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate area path for area chart
  const generateAreaPath = () => {
    if (!processedData.length) return '';
    
    const linePath = generateLinePath();
    const lastPoint = processedData[processedData.length - 1];
    const firstPoint = processedData[0];
    
    const lastX = scaleX(processedData.length - 1);
    const firstX = scaleX(0);
    
    return `${linePath} L ${lastX} ${plotHeight} L ${firstX} ${plotHeight} Z`;
  };

  // Calculate trend
  const trend = priceChange >= 0 ? 'UP' : 'DOWN';
  const trendColor = trend === 'UP' ? '#10b981' : '#ef4444';

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 animate-pulse" />
            <span>Loading {ticker} Chart...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-pulse">Loading market data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{ticker} Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4" style={{ height }}>
            <div className="text-red-600">{error}</div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{ticker}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                ${latestPrice.toFixed(2)}
              </span>
              <div className={`flex items-center space-x-1 ${trend === 'UP' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'UP' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} 
                  ({((priceChange / latestPrice) * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant={enableRealTime ? "default" : "secondary"}>
              {enableRealTime ? 'Live' : 'Static'}
            </Badge>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {(['1H', '4H', '1D', '1W'] as ChartTimeframe[]).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
          
          <div className="flex space-x-2">
            {(['line', 'area', 'candlestick'] as ChartType[]).map((type) => (
              <Button
                key={type}
                variant={chartType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          <svg
            width={chartWidth}
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="border rounded-lg bg-gradient-to-b from-background to-muted/10"
          >
            {/* Grid */}
            <defs>
              <pattern id={`grid-${ticker}`} width="50" height="40" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
              </pattern>
              
              {/* Gradients for area chart */}
              <linearGradient id={`gradient-${ticker}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={trendColor} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={trendColor} stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill={`url(#grid-${ticker})`} />
            
            {/* Chart area */}
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Price lines (horizontal) */}
              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = plotHeight * ratio;
                const price = priceRange.max - (priceRange.max - priceRange.min) * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1="0"
                      y1={y}
                      x2={plotWidth}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                    <text
                      x="-10"
                      y={y + 4}
                      fontSize="10"
                      fill="currentColor"
                      opacity="0.7"
                      textAnchor="end"
                    >
                      ${price.toFixed(0)}
                    </text>
                  </g>
                );
              })}
              
              {/* Chart based on type */}
              {chartType === 'area' && (
                <path
                  d={generateAreaPath()}
                  fill={`url(#gradient-${ticker})`}
                  opacity="0.6"
                />
              )}
              
              <path
                d={generateLinePath()}
                fill="none"
                stroke={trendColor}
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              
              {/* Data points */}
              {processedData.map((point, index) => {
                const x = scaleX(index);
                const y = scaleY(point.price);
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="2"
                    fill={trendColor}
                    className="opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    <title>
                      ${point.price.toFixed(2)} - {new Date(point.timestamp).toLocaleString()}
                      {point.indicators?.rsi && ` | RSI: ${point.indicators.rsi.toFixed(1)}`}
                    </title>
                  </circle>
                );
              })}
              
              {/* Latest price indicator */}
              {processedData.length > 0 && (
                <g>
                  <circle
                    cx={scaleX(processedData.length - 1)}
                    cy={scaleY(latestPrice)}
                    r="4"
                    fill={trendColor}
                    className="animate-pulse"
                  />
                  <circle
                    cx={scaleX(processedData.length - 1)}
                    cy={scaleY(latestPrice)}
                    r="8"
                    fill="none"
                    stroke={trendColor}
                    strokeWidth="2"
                    opacity="0.5"
                    className="animate-ping"
                  />
                </g>
              )}
              
              {/* Moving averages if indicators enabled */}
              {showIndicators && processedData.some(d => d.indicators?.ma20) && (
                <path
                  d={processedData
                    .filter(d => d.indicators?.ma20)
                    .map((point, index) => {
                      const x = scaleX(index);
                      const y = scaleY(point.indicators!.ma20!);
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
              )}
            </g>
            
            {/* X-axis labels */}
            <g transform={`translate(${margin.left}, ${chartHeight - margin.bottom + 15})`}>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const x = plotWidth * ratio;
                const dataIndex = Math.floor((processedData.length - 1) * ratio);
                const point = processedData[dataIndex];
                
                if (!point) return null;
                
                return (
                  <text
                    key={ratio}
                    x={x}
                    y="0"
                    fontSize="10"
                    fill="currentColor"
                    opacity="0.7"
                    textAnchor="middle"
                  >
                    {new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Chart Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">High</div>
            <div className="font-medium">
              ${Math.max(...processedData.map(d => d.price)).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Low</div>
            <div className="font-medium">
              ${Math.min(...processedData.map(d => d.price)).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Volume</div>
            <div className="font-medium">
              {((processedData[processedData.length - 1]?.volume || 0) / 1000000).toFixed(1)}M
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">RSI</div>
            <div className="font-medium">
              {processedData[processedData.length - 1]?.indicators?.rsi?.toFixed(1) || 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}