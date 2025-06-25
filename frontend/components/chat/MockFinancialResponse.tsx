"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  Clock, 
  TrendingUp, 
  Target, 
  ExternalLink,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { TradingAnswer } from '@/types/trading';
import { MockRecommendationDisplay } from '../trading/MockRecommendationDisplay';
import { mockTradingQA } from '@/lib/mockTradingQA';

interface MockFinancialResponseProps {
  message: string;
  onRetry?: () => void;
  sessionId?: string;
}

export function MockFinancialResponse({ 
  message, 
  onRetry,
  sessionId 
}: MockFinancialResponseProps) {
  const [response, setResponse] = useState<TradingAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateResponse();
  }, [message]);

  const generateResponse = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mockTradingQA.answerQuestion(message, sessionId);
      setResponse(result);
    } catch (err) {
      setError('Failed to generate response. Please try again.');
      console.error('Error generating trading response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerTypeColor = (type: TradingAnswer['answerType']) => {
    switch (type) {
      case 'STRATEGY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ANALYSIS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'RISK_ASSESSMENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EDUCATION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MARKET_INSIGHT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatAnswerType = (type: TradingAnswer['answerType']) => {
    return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
            <CardTitle className="text-lg">AI is analyzing your question...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-red-600 text-sm">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry || generateResponse}
              className="mx-auto"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return null;
  }

  return (
    <div className="space-y-4 w-full">
      {/* Main Response */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">AI Trading Analysis</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={getAnswerTypeColor(response.answerType)}>
                {formatAnswerType(response.answerType)}
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {(response.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* AI Response */}
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-sm leading-relaxed">
              {response.answer}
            </div>
          </div>

          {/* Related Tickers */}
          {response.relatedTickers && response.relatedTickers.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>Related Stocks</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {response.relatedTickers.map((ticker) => (
                  <Badge 
                    key={ticker} 
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                  >
                    {ticker}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {response.suggestedActions && response.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center space-x-1">
                <Target className="h-4 w-4" />
                <span>Suggested Actions</span>
              </h4>
              <div className="space-y-1">
                {response.suggestedActions.slice(0, 4).map((action, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Time & Sources */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Processed in {response.processingTime}ms</span>
              </div>
              {response.sources && response.sources.length > 0 && (
                <div className="flex items-center space-x-1">
                  <span>Sources:</span>
                  <span>{response.sources.slice(0, 2).join(', ')}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-auto p-1">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation Display */}
      {response.recommendation && (
        <MockRecommendationDisplay 
          recommendation={response.recommendation}
          ticker={response.relatedTickers?.[0]}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={generateResponse}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Regenerate
        </Button>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-3 w-3 mr-1" />
          View Charts
        </Button>
        <Button variant="outline" size="sm">
          <Target className="h-3 w-3 mr-1" />
          Set Alerts
        </Button>
      </div>
    </div>
  );
}