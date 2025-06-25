"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Shield, 
  Clock, 
  DollarSign,
  BarChart3
} from 'lucide-react';
import { TradingRecommendation } from '@/types/trading';

interface MockRecommendationDisplayProps {
  recommendation: TradingRecommendation;
  ticker?: string;
  currentPrice?: number;
}

export function MockRecommendationDisplay({ 
  recommendation, 
  ticker = 'STOCK',
  currentPrice
}: MockRecommendationDisplayProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'SELL':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'WATCH':
        return <BarChart3 className="h-4 w-4 text-blue-600" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'bg-green-600 hover:bg-green-700 border-green-600';
      case 'SELL':
        return 'bg-red-600 hover:bg-red-700 border-red-600';
      case 'WATCH':
        return 'bg-blue-600 hover:bg-blue-700 border-blue-600';
      default:
        return 'bg-yellow-600 hover:bg-yellow-700 border-yellow-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimeHorizonColor = (timeHorizon: string) => {
    switch (timeHorizon) {
      case 'SHORT_TERM':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM_TERM':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'LONG_TERM':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeHorizon = (timeHorizon: string) => {
    return timeHorizon.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="w-full border-l-4" style={{ borderLeftColor: getActionColor(recommendation.action).split(' ')[0].replace('bg-', '') }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            {getActionIcon(recommendation.action)}
            <span>AI Recommendation</span>
            {ticker && <Badge variant="outline">{ticker}</Badge>}
          </CardTitle>
          <Badge className={`${getActionColor(recommendation.action)} text-white`}>
            {recommendation.action}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Recommendation */}
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm leading-relaxed">
            {recommendation.reasoning}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-background rounded-lg border">
            <div className="text-lg font-bold text-foreground">
              {(recommendation.confidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>

          <div className="text-center p-3 bg-background rounded-lg border">
            <Badge variant="outline" className={getRiskColor(recommendation.riskLevel)}>
              {recommendation.riskLevel}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Risk Level</div>
          </div>

          <div className="text-center p-3 bg-background rounded-lg border">
            <Badge variant="outline" className={getTimeHorizonColor(recommendation.timeHorizon)}>
              {formatTimeHorizon(recommendation.timeHorizon)}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">Time Horizon</div>
          </div>

          {recommendation.allocation && (
            <div className="text-center p-3 bg-background rounded-lg border">
              <div className="text-lg font-bold text-foreground">
                {recommendation.allocation}%
              </div>
              <div className="text-xs text-muted-foreground">Allocation</div>
            </div>
          )}
        </div>

        {/* Price Targets */}
        {(recommendation.priceTarget || recommendation.stopLoss) && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center space-x-1">
              <Target className="h-4 w-4" />
              <span>Price Targets</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {currentPrice && (
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Current</span>
                  </div>
                  <span className="font-bold">${currentPrice.toFixed(2)}</span>
                </div>
              )}
              
              {recommendation.priceTarget && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Target</span>
                  </div>
                  <span className="font-bold text-green-800">${recommendation.priceTarget.toFixed(2)}</span>
                </div>
              )}
              
              {recommendation.stopLoss && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Stop Loss</span>
                  </div>
                  <span className="font-bold text-red-800">${recommendation.stopLoss.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            View Chart
          </Button>
          <Button variant="outline" size="sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            More Analysis
          </Button>
          {recommendation.action === 'BUY' && (
            <Button size="sm" className={getActionColor(recommendation.action)}>
              <DollarSign className="h-3 w-3 mr-1" />
              Execute Trade
            </Button>
          )}
          {recommendation.action === 'WATCH' && (
            <Button variant="outline" size="sm">
              <Clock className="h-3 w-3 mr-1" />
              Add to Watchlist
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded">
          <strong>Disclaimer:</strong> This is AI-generated advice for educational purposes. 
          Always conduct your own research and consider consulting with a financial advisor before making investment decisions.
        </div>
      </CardContent>
    </Card>
  );
}