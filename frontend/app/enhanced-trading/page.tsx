"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, TrendingUp, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

// Import new components
import { MockPriceChart } from '@/components/charts/MockPriceChart';
import { MockIndicatorChart } from '@/components/charts/MockIndicatorChart';
import { MockLiveTicker } from '@/components/trading/MockLiveTicker';
import { useMockMarketData } from '@/hooks/useMockMarketData';
import { useMockTradingSignals } from '@/hooks/useMockTradingSignals';

export default function EnhancedTradingPage() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  
  // Use the new hooks
  const marketData = useMockMarketData(selectedTicker, {
    enableRealTime: true,
    updateInterval: 3000
  });
  
  const tradingSignals = useMockTradingSignals(selectedTicker, {
    enableRealTime: true,
    updateInterval: 10000
  });

  const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/trading">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Enhanced Trading Platform</h1>
                <p className="text-muted-foreground">
                  Real-time charts, technical indicators, and live market data
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-green-500 text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1" />
                Live Data
              </Badge>
              <Badge variant="secondary">
                <Zap className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Ticker Selection */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Select Stock to Analyze</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                {tickers.map((ticker) => (
                  <Button
                    key={ticker}
                    variant={selectedTicker === ticker ? "default" : "outline"}
                    onClick={() => setSelectedTicker(ticker)}
                  >
                    {ticker}
                  </Button>
                ))}
              </div>
              
              {/* Current Selection Info */}
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTicker}</h3>
                    <p className="text-sm text-muted-foreground">
                      Latest: ${marketData.latestPrice.toFixed(2)} 
                      <span className={`ml-2 ${marketData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({marketData.priceChange >= 0 ? '+' : ''}{marketData.priceChange.toFixed(2)})
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Latest Signal</div>
                    {tradingSignals.latestSignal && (
                      <Badge 
                        variant="outline"
                        className={
                          tradingSignals.latestSignal.action.includes('BUY') 
                            ? 'border-green-500 text-green-600' 
                            : tradingSignals.latestSignal.action.includes('SELL')
                              ? 'border-red-500 text-red-600'
                              : 'border-yellow-500 text-yellow-600'
                        }
                      >
                        {tradingSignals.latestSignal.action}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Advanced Charts</TabsTrigger>
            <TabsTrigger value="indicators">Technical Indicators</TabsTrigger>
            <TabsTrigger value="live">Live Market</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Chart */}
              <div className="lg:col-span-2">
                <MockPriceChart 
                  ticker={selectedTicker}
                  height={400}
                  showIndicators={true}
                  enableRealTime={true}
                />
              </div>
              
              {/* Market Data Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Current Price</div>
                        <div className="text-2xl font-bold">${marketData.latestPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Change</div>
                        <div className={`text-xl font-medium ${marketData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {marketData.priceChange >= 0 ? '+' : ''}{marketData.priceChange.toFixed(2)}
                          ({((marketData.priceChange / marketData.latestPrice) * 100).toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Data Points: {marketData.data.length}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {marketData.isLoading ? 'Loading...' : marketData.error ? 'Error' : 'Live'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trading Signals */}
              <Card>
                <CardHeader>
                  <CardTitle>Trading Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tradingSignals.latestSignal ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Latest Signal</span>
                          <Badge 
                            variant="outline"
                            className={
                              tradingSignals.latestSignal.action.includes('BUY') 
                                ? 'border-green-500 text-green-600' 
                                : tradingSignals.latestSignal.action.includes('SELL')
                                  ? 'border-red-500 text-red-600'
                                  : 'border-yellow-500 text-yellow-600'
                            }
                          >
                            {tradingSignals.latestSignal.action}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className="text-lg font-semibold">
                            {(tradingSignals.latestSignal.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-muted-foreground">Reasoning</div>
                          <div className="text-sm leading-relaxed">
                            {tradingSignals.latestSignal.reasoning}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-4">
                        {tradingSignals.isLoading ? 'Loading signals...' : 'No signals available'}
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Total Signals: {tradingSignals.signals.length}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <MockPriceChart 
                ticker={selectedTicker}
                height={500}
                showIndicators={true}
                enableRealTime={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="indicators" className="space-y-6">
            <MockIndicatorChart 
              ticker={selectedTicker}
              height={400}
            />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MockLiveTicker 
                  tickers={tickers}
                  updateInterval={2000}
                  showVolume={true}
                  showMarketStatus={true}
                  height={500}
                />
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Live Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Update Interval</span>
                        <span className="text-sm font-medium">2s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tracked Tickers</span>
                        <span className="text-sm font-medium">{tickers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Data Source</span>
                        <Badge variant="outline" className="text-xs">Mock Live</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Market Data</span>
                        <Badge variant={marketData.error ? "destructive" : "default"} className="text-xs">
                          {marketData.error ? 'Error' : 'Active'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trading Signals</span>
                        <Badge variant={tradingSignals.error ? "destructive" : "default"} className="text-xs">
                          {tradingSignals.error ? 'Error' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}