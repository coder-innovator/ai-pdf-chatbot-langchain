"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Activity, Target } from 'lucide-react';
import { useMockMarketData } from '@/hooks/useMockMarketData';
import { MockMarketDataPoint } from '@/types/trading';

interface MockIndicatorChartProps {
  ticker: string;
  height?: number;
  className?: string;
}

type IndicatorType = 'rsi' | 'macd' | 'bollinger' | 'volume';

interface IndicatorConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  range?: [number, number];
  levels?: { value: number; label: string; color: string }[];
}

const INDICATOR_CONFIGS: Record<IndicatorType, IndicatorConfig> = {
  rsi: {
    name: 'RSI (Relative Strength Index)',
    icon: <Activity className="h-4 w-4" />,
    color: '#8b5cf6',
    range: [0, 100],
    levels: [
      { value: 70, label: 'Overbought', color: '#ef4444' },
      { value: 50, label: 'Neutral', color: '#6b7280' },
      { value: 30, label: 'Oversold', color: '#10b981' }
    ]
  },
  macd: {
    name: 'MACD (Moving Average Convergence Divergence)',
    icon: <TrendingUp className="h-4 w-4" />,
    color: '#06b6d4',
    levels: [
      { value: 0, label: 'Signal Line', color: '#6b7280' }
    ]
  },
  bollinger: {
    name: 'Bollinger Bands',
    icon: <Target className="h-4 w-4" />,
    color: '#f59e0b'
  },
  volume: {
    name: 'Volume',
    icon: <BarChart3 className="h-4 w-4" />,
    color: '#84cc16'
  }
};

export function MockIndicatorChart({
  ticker,
  height = 300,
  className = ''
}: MockIndicatorChartProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('rsi');
  
  const { data, isLoading, error } = useMockMarketData(ticker, {
    enableRealTime: true,
    updateInterval: 5000
  });

  // Filter data with indicators
  const dataWithIndicators = useMemo(() => {
    return data.filter(point => point.indicators);
  }, [data]);

  // Chart dimensions
  const chartWidth = 500;
  const chartHeight = height - 60;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  // Scale functions for current indicator
  const getValueRange = (indicator: IndicatorType) => {
    if (!dataWithIndicators.length) return { min: 0, max: 100 };

    const config = INDICATOR_CONFIGS[indicator];
    if (config.range) return { min: config.range[0], max: config.range[1] };

    let values: number[] = [];
    
    switch (indicator) {
      case 'macd':
        values = dataWithIndicators
          .map(d => d.indicators?.macd)
          .filter(v => v !== undefined) as number[];
        break;
      case 'volume':
        values = dataWithIndicators.map(d => d.volume);
        break;
      case 'bollinger':
        const bollingerValues = dataWithIndicators
          .flatMap(d => d.indicators?.bollinger ? [
            d.indicators.bollinger.upper,
            d.indicators.bollinger.middle,
            d.indicators.bollinger.lower
          ] : [])
          .filter(v => v !== undefined) as number[];
        values = bollingerValues;
        break;
      default:
        values = [0, 100];
    }

    if (values.length === 0) return { min: 0, max: 100 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;

    return {
      min: min - padding,
      max: max + padding
    };
  };

  const valueRange = getValueRange(selectedIndicator);
  const scaleX = (index: number) => (index / Math.max(dataWithIndicators.length - 1, 1)) * plotWidth;
  const scaleY = (value: number) => 
    plotHeight - ((value - valueRange.min) / (valueRange.max - valueRange.min)) * plotHeight;

  // Generate indicator-specific paths
  const generateIndicatorPath = (indicator: IndicatorType) => {
    if (!dataWithIndicators.length) return '';

    let values: (number | undefined)[] = [];
    
    switch (indicator) {
      case 'rsi':
        values = dataWithIndicators.map(d => d.indicators?.rsi);
        break;
      case 'macd':
        values = dataWithIndicators.map(d => d.indicators?.macd);
        break;
      case 'volume':
        values = dataWithIndicators.map(d => d.volume);
        break;
      default:
        return '';
    }

    return values
      .map((value, index) => {
        if (value === undefined) return '';
        const x = scaleX(index);
        const y = scaleY(value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Get current indicator value and signal
  const getCurrentIndicatorInfo = () => {
    if (!dataWithIndicators.length) return null;
    
    const latest = dataWithIndicators[dataWithIndicators.length - 1];
    const indicators = latest.indicators;
    
    if (!indicators) return null;

    switch (selectedIndicator) {
      case 'rsi':
        const rsi = indicators.rsi;
        if (!rsi) return null;
        return {
          value: rsi.toFixed(1),
          signal: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
          signalColor: rsi > 70 ? 'text-red-600' : rsi < 30 ? 'text-green-600' : 'text-gray-600'
        };
      
      case 'macd':
        const macd = indicators.macd;
        if (!macd) return null;
        return {
          value: macd.toFixed(3),
          signal: macd > 0 ? 'BULLISH' : 'BEARISH',
          signalColor: macd > 0 ? 'text-green-600' : 'text-red-600'
        };
      
      case 'volume':
        const volume = latest.volume;
        const avgVolume = dataWithIndicators
          .slice(-20)
          .reduce((sum, d) => sum + d.volume, 0) / Math.min(20, dataWithIndicators.length);
        const volumeRatio = volume / avgVolume;
        return {
          value: (volume / 1000000).toFixed(1) + 'M',
          signal: volumeRatio > 1.5 ? 'HIGH VOLUME' : volumeRatio < 0.5 ? 'LOW VOLUME' : 'NORMAL',
          signalColor: volumeRatio > 1.5 ? 'text-orange-600' : 'text-gray-600'
        };
      
      default:
        return null;
    }
  };

  const currentInfo = getCurrentIndicatorInfo();
  const config = INDICATOR_CONFIGS[selectedIndicator];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 animate-pulse" />
            <span>Loading Indicators...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-pulse">Loading technical indicators...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Technical Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {config.icon}
            <span>Technical Indicators - {ticker}</span>
          </CardTitle>
          
          {currentInfo && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-bold">{currentInfo.value}</div>
                <div className={`text-sm ${currentInfo.signalColor}`}>
                  {currentInfo.signal}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedIndicator} onValueChange={(value) => setSelectedIndicator(value as IndicatorType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rsi">RSI</TabsTrigger>
            <TabsTrigger value="macd">MACD</TabsTrigger>
            <TabsTrigger value="bollinger">Bollinger</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>

          <TabsContent value="rsi" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                RSI measures the speed and magnitude of price changes. Values above 70 indicate overbought conditions, below 30 indicate oversold.
              </div>
              {renderChart('rsi')}
            </div>
          </TabsContent>

          <TabsContent value="macd" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                MACD shows the relationship between two moving averages. Positive values suggest upward momentum.
              </div>
              {renderChart('macd')}
            </div>
          </TabsContent>

          <TabsContent value="bollinger" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Bollinger Bands show volatility and potential support/resistance levels.
              </div>
              {renderBollingerChart()}
            </div>
          </TabsContent>

          <TabsContent value="volume" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Volume indicates the strength of price movements. High volume confirms trends.
              </div>
              {renderVolumeChart()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  function renderChart(indicator: IndicatorType) {
    const config = INDICATOR_CONFIGS[indicator];
    
    return (
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="border rounded-lg bg-gradient-to-b from-background to-muted/10"
        >
          {/* Chart area */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Horizontal reference lines */}
            {config.levels?.map((level) => {
              const y = scaleY(level.value);
              return (
                <g key={level.value}>
                  <line
                    x1="0"
                    y1={y}
                    x2={plotWidth}
                    y2={y}
                    stroke={level.color}
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  <text
                    x={plotWidth + 5}
                    y={y + 4}
                    fontSize="10"
                    fill={level.color}
                    className="font-medium"
                  >
                    {level.label}
                  </text>
                </g>
              );
            })}
            
            {/* Indicator line */}
            <path
              d={generateIndicatorPath(indicator)}
              fill="none"
              stroke={config.color}
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Data points */}
            {dataWithIndicators.map((point, index) => {
              let value: number | undefined;
              
              switch (indicator) {
                case 'rsi':
                  value = point.indicators?.rsi;
                  break;
                case 'macd':
                  value = point.indicators?.macd;
                  break;
              }
              
              if (value === undefined) return null;
              
              const x = scaleX(index);
              const y = scaleY(value);
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={config.color}
                  className="opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <title>
                    {config.name}: {value.toFixed(2)} - {new Date(point.timestamp).toLocaleString()}
                  </title>
                </circle>
              );
            })}
          </g>
        </svg>
      </div>
    );
  }

  function renderBollingerChart() {
    if (!dataWithIndicators.length) return <div>No data available</div>;

    return (
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="border rounded-lg bg-gradient-to-b from-background to-muted/10"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Bollinger bands */}
            {['upper', 'middle', 'lower'].map((band, bandIndex) => {
              const path = dataWithIndicators
                .map((point, index) => {
                  const value = point.indicators?.bollinger?.[band as keyof typeof point.indicators.bollinger];
                  if (value === undefined) return '';
                  const x = scaleX(index);
                  const y = scaleY(value);
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .filter(Boolean)
                .join(' ');

              const colors = ['#ef4444', '#6b7280', '#10b981'];
              const opacity = [0.6, 1, 0.6];

              return (
                <path
                  key={band}
                  d={path}
                  fill="none"
                  stroke={colors[bandIndex]}
                  strokeWidth={band === 'middle' ? 2 : 1}
                  strokeDasharray={band === 'middle' ? 'none' : '3,3'}
                  opacity={opacity[bandIndex]}
                />
              );
            })}

            {/* Price line for comparison */}
            <path
              d={dataWithIndicators
                .map((point, index) => {
                  const x = scaleX(index);
                  const y = scaleY(point.price);
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>
    );
  }

  function renderVolumeChart() {
    if (!dataWithIndicators.length) return <div>No data available</div>;

    const maxVolume = Math.max(...dataWithIndicators.map(d => d.volume));
    const scaleVolumeY = (volume: number) => plotHeight - (volume / maxVolume) * plotHeight;

    return (
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="border rounded-lg bg-gradient-to-b from-background to-muted/10"
        >
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Volume bars */}
            {dataWithIndicators.map((point, index) => {
              const x = scaleX(index);
              const barWidth = plotWidth / dataWithIndicators.length * 0.8;
              const barHeight = plotHeight - scaleVolumeY(point.volume);
              
              return (
                <rect
                  key={index}
                  x={x - barWidth / 2}
                  y={scaleVolumeY(point.volume)}
                  width={barWidth}
                  height={barHeight}
                  fill="#84cc16"
                  opacity="0.7"
                  className="hover:opacity-100"
                >
                  <title>
                    Volume: {(point.volume / 1000000).toFixed(1)}M - {new Date(point.timestamp).toLocaleString()}
                  </title>
                </rect>
              );
            })}
          </g>
        </svg>
      </div>
    );
  }
}