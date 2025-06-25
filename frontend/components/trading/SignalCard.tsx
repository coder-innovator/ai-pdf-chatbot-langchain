"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { TrendingUp, TrendingDown, Minus, Target, Shield, Clock, ExternalLink } from 'lucide-react';
import { TradingSignal } from '@/types/trading';

interface SignalCardProps {
  signals: TradingSignal[];
  onSignalClick?: (signal: TradingSignal) => void;
}

export function SignalCard({ signals, onSignalClick }: SignalCardProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY':
      case 'STRONG_BUY':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'SELL':
      case 'STRONG_SELL':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'STRONG_BUY':
        return 'bg-green-600 hover:bg-green-700';
      case 'BUY':
        return 'bg-green-500 hover:bg-green-600';
      case 'STRONG_SELL':
        return 'bg-red-600 hover:bg-red-700';
      case 'SELL':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-yellow-500 hover:bg-yellow-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'MEDIUM':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'HIGH':
        return 'text-red-600 border-red-200 bg-red-50';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  if (signals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Trading Signals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No trading signals available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Trading Signals</span>
          </CardTitle>
          <Badge variant="outline">{signals.length} signals</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-4">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSignalClick?.(signal)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(signal.action)}
                      <span className="font-semibold text-lg">{signal.ticker}</span>
                    </div>
                    <Badge className={getActionColor(signal.action)} variant="default">
                      {signal.action}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${signal.price.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatConfidence(signal.confidence)} confidence
                    </div>
                  </div>
                </div>

                {/* Signal Details */}
                <div className="space-y-2 mb-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {signal.reasoning}
                  </p>
                  
                  {/* Risk and Targets */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span className="text-muted-foreground">Risk:</span>
                        <Badge variant="outline" className={getRiskColor(signal.riskLevel)}>
                          {signal.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatTime(signal.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price Targets */}
                  {(signal.priceTarget || signal.stopLoss) && (
                    <div className="flex items-center space-x-4 text-sm">
                      {signal.priceTarget && (
                        <div className="flex items-center space-x-1">
                          <Target className="h-3 w-3 text-green-600" />
                          <span className="text-muted-foreground">Target:</span>
                          <span className="font-medium text-green-600">
                            ${signal.priceTarget.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {signal.stopLoss && (
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3 text-red-600" />
                          <span className="text-muted-foreground">Stop:</span>
                          <span className="font-medium text-red-600">
                            ${signal.stopLoss.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>Source: {signal.source}</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSignalClick?.(signal);
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}