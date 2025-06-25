"use client";

import React, { useState, useEffect } from 'react';
import { TradingSignal, MarketData, TradingAlert } from '@/types/trading';
import { loadMockTradingData, connectToTradingStream } from '@/lib/mockTradingData';
import { MockMarketOverview } from './MockMarketOverview';
import { SignalCard } from './SignalCard';
import { AlertsPanel } from './AlertsPanel';
import { MockStockChart } from './MockStockChart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw, TrendingUp, AlertTriangle, BarChart3, DollarSign } from 'lucide-react';

export function TradingDashboard() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Load initial data
  useEffect(() => {
    loadTradingData();
  }, []);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    const ws = connectToTradingStream((data) => {
      handleRealTimeUpdate(data);
    });
    
    if (ws) {
      setWsConnection(ws);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const loadTradingData = async () => {
    setIsLoading(true);
    try {
      const data = await loadMockTradingData();
      setSignals(data.signals);
      setMarketData(data.marketData);
      setAlerts(data.alerts);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading trading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealTimeUpdate = (data: any) => {
    console.log('Real-time update received:', data);
    
    switch (data.type) {
      case 'real_time_update':
        if (data.data.type === 'signal_created') {
          setSignals(prev => [data.data.record, ...prev.slice(0, 9)]); // Keep last 10
        } else if (data.data.type === 'alert_created') {
          setAlerts(prev => [data.data.record, ...prev]);
        }
        setLastUpdate(new Date());
        break;
      
      case 'current_prices':
        // Update market data with new prices
        if (data.data.prices) {
          setMarketData(prev => 
            prev.map(market => {
              const priceUpdate = data.data.prices.find((p: any) => p.ticker === market.ticker);
              if (priceUpdate) {
                return {
                  ...market,
                  currentPrice: priceUpdate.price,
                  change: priceUpdate.change,
                  changePercent: priceUpdate.changePercent,
                  timestamp: new Date().toISOString()
                };
              }
              return market;
            })
          );
        }
        break;
    }
  };

  const refreshData = () => {
    loadTradingData();
  };

  // Calculate dashboard stats
  const totalSignals = signals.length;
  const activeAlerts = alerts.filter(alert => alert.isActive).length;
  const avgConfidence = signals.length > 0 
    ? (signals.reduce((sum, signal) => sum + signal.confidence, 0) / signals.length) * 100 
    : 0;
  const bullishSignals = signals.filter(s => s.action.includes('BUY')).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading trading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time trading signals, market data, and alerts
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignals}</div>
            <p className="text-xs text-muted-foreground">
              {bullishSignals} bullish signals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Monitoring {marketData.length} tickers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Signal reliability
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Status</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OPEN</div>
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Live
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview - spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <MockMarketOverview data={marketData} />
        </div>

        {/* Alerts Panel */}
        <div>
          <AlertsPanel alerts={alerts} />
        </div>
      </div>

      {/* Trading Signals and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Signals */}
        <div>
          <SignalCard signals={signals} />
        </div>

        {/* Stock Chart */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stock Chart</CardTitle>
                <div className="flex space-x-2">
                  {['AAPL', 'TSLA', 'NVDA', 'MSFT'].map((ticker) => (
                    <Button
                      key={ticker}
                      variant={selectedTicker === ticker ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTicker(ticker)}
                    >
                      {ticker}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MockStockChart ticker={selectedTicker} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${wsConnection?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>
            {wsConnection?.readyState === WebSocket.OPEN ? 'Connected to live data' : 'Using mock data'}
          </span>
        </div>
      </div>
    </div>
  );
}