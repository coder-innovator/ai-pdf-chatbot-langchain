"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { ChartDataPoint } from '@/types/trading';

interface MockStockChartProps {
  ticker: string;
  height?: number;
}

interface ChartPoint {
  x: number;
  y: number;
  price: number;
  timestamp: string;
}

export function MockStockChart({ ticker, height = 300 }: MockStockChartProps) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateChartData();
  }, [ticker]);

  const generateChartData = () => {
    setIsLoading(true);
    
    // Generate mock price data for the last 30 days
    const data: ChartPoint[] = [];
    const basePrice = getBasePriceForTicker(ticker);
    const chartWidth = 400;
    const chartHeight = height - 60; // Account for padding
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      // Generate realistic price movement
      const volatility = 0.03; // 3% daily volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = i === 0 
        ? basePrice 
        : data[i - 1].price * (1 + randomChange);
      
      data.push({
        x: (i / 29) * chartWidth,
        y: chartHeight - ((price - basePrice * 0.9) / (basePrice * 0.2)) * chartHeight,
        price: price,
        timestamp: date.toISOString()
      });
    }
    
    setChartData(data);
    setCurrentPrice(data[data.length - 1]?.price || basePrice);
    setPriceChange(data.length > 1 ? data[data.length - 1].price - data[data.length - 2].price : 0);
    setIsLoading(false);
  };

  const getBasePriceForTicker = (ticker: string): number => {
    const basePrices: { [key: string]: number } = {
      'AAPL': 150,
      'TSLA': 245,
      'NVDA': 420,
      'MSFT': 380,
      'GOOGL': 135,
      'AMZN': 145,
      'META': 320
    };
    return basePrices[ticker] || 100;
  };

  const createSVGPath = (points: ChartPoint[]): string => {
    if (points.length === 0) return '';
    
    const path = points.reduce((acc, point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${acc}${command}${point.x},${point.y}`;
    }, '');
    
    return path;
  };

  const createAreaPath = (points: ChartPoint[]): string => {
    if (points.length === 0) return '';
    
    const path = createSVGPath(points);
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    
    return `${path}L${lastPoint.x},${height - 60}L${firstPoint.x},${height - 60}Z`;
  };

  const isPositive = priceChange >= 0;
  const changePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>{ticker} Chart</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {/* Price Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{ticker}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">
              ${currentPrice.toFixed(2)}
            </span>
            <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
        <Badge variant={isPositive ? "default" : "destructive"} className="ml-2">
          {isPositive ? 'UP' : 'DOWN'}
        </Badge>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg 
          width="100%" 
          height={height}
          viewBox={`0 0 400 ${height}`}
          className="border rounded-lg bg-gradient-to-b from-background to-muted/20"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
            <linearGradient id={`gradient-${ticker}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Area under curve */}
          <path
            d={createAreaPath(chartData)}
            fill={`url(#gradient-${ticker})`}
            opacity="0.6"
          />
          
          {/* Price line */}
          <path
            d={createSVGPath(chartData)}
            fill="none"
            stroke={isPositive ? "#10b981" : "#ef4444"}
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          
          {/* Data points */}
          {chartData.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={isPositive ? "#10b981" : "#ef4444"}
              className="opacity-60 hover:opacity-100 cursor-pointer"
            >
              <title>
                ${point.price.toFixed(2)} - {new Date(point.timestamp).toLocaleDateString()}
              </title>
            </circle>
          ))}
          
          {/* Current price indicator */}
          {chartData.length > 0 && (
            <g>
              <circle
                cx={chartData[chartData.length - 1].x}
                cy={chartData[chartData.length - 1].y}
                r="4"
                fill={isPositive ? "#10b981" : "#ef4444"}
                className="animate-pulse"
              />
              <circle
                cx={chartData[chartData.length - 1].x}
                cy={chartData[chartData.length - 1].y}
                r="8"
                fill="none"
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth="2"
                opacity="0.5"
                className="animate-ping"
              />
            </g>
          )}
        </svg>
        
        {/* Price labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground py-2">
          <span>${(currentPrice * 1.1).toFixed(0)}</span>
          <span>${currentPrice.toFixed(0)}</span>
          <span>${(currentPrice * 0.9).toFixed(0)}</span>
        </div>
        
        {/* Time labels */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>30d ago</span>
          <span>15d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Chart info */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">High</div>
          <div className="font-medium">
            ${Math.max(...chartData.map(d => d.price)).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Low</div>
          <div className="font-medium">
            ${Math.min(...chartData.map(d => d.price)).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Volume</div>
          <div className="font-medium">
            {(Math.random() * 50 + 10).toFixed(1)}M
          </div>
        </div>
      </div>
    </div>
  );
}