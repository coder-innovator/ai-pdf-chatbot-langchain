"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, BarChart3, AlertTriangle, Lightbulb } from 'lucide-react';

interface TradingPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

interface TradingPrompt {
  id: string;
  title: string;
  prompt: string;
  category: 'strategy' | 'analysis' | 'risk' | 'education';
  icon: React.ReactNode;
  description: string;
}

const tradingPrompts: TradingPrompt[] = [
  {
    id: 'double-strategy',
    title: '$100 Doubling Strategy',
    prompt: 'I have $100 and want to double it within a week. What strategy should I use?',
    category: 'strategy',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Get AI advice for aggressive growth strategies'
  },
  {
    id: 'stock-analysis',
    title: 'Stock Analysis',
    prompt: 'Analyze Apple (AAPL) stock and tell me if I should buy, sell, or hold',
    category: 'analysis',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Technical and fundamental analysis of specific stocks'
  },
  {
    id: 'market-sentiment',
    title: 'Market Sentiment',
    prompt: 'What is the current market sentiment and which sectors are performing well?',
    category: 'analysis',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Overall market analysis and sector performance'
  },
  {
    id: 'risk-assessment',
    title: 'Risk Assessment',
    prompt: 'What are the risks of investing in Tesla (TSLA) right now?',
    category: 'risk',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Comprehensive risk analysis for investments'
  },
  {
    id: 'portfolio-diversification',
    title: 'Portfolio Diversification',
    prompt: 'Help me diversify my portfolio with $1000 across different sectors',
    category: 'strategy',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Strategic portfolio allocation advice'
  },
  {
    id: 'trading-education',
    title: 'Trading Basics',
    prompt: 'Explain the difference between day trading and swing trading',
    category: 'education',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Learn fundamental trading concepts'
  },
  {
    id: 'options-strategy',
    title: 'Options Strategy',
    prompt: 'What are some safe options strategies for beginners?',
    category: 'education',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Introduction to options trading strategies'
  },
  {
    id: 'crypto-analysis',
    title: 'Crypto vs Stocks',
    prompt: 'Should I invest in Bitcoin or traditional stocks right now?',
    category: 'analysis',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Compare cryptocurrency and traditional investments'
  }
];

const getCategoryColor = (category: TradingPrompt['category']) => {
  switch (category) {
    case 'strategy':
      return 'bg-blue-500 hover:bg-blue-600';
    case 'analysis':
      return 'bg-green-500 hover:bg-green-600';
    case 'risk':
      return 'bg-red-500 hover:bg-red-600';
    case 'education':
      return 'bg-purple-500 hover:bg-purple-600';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
};

const getCategoryBadgeColor = (category: TradingPrompt['category']) => {
  switch (category) {
    case 'strategy':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'analysis':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'risk':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'education':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function TradingPrompts({ onPromptSelect }: TradingPromptsProps) {
  const categories = ['strategy', 'analysis', 'risk', 'education'] as const;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Trading & Investment Prompts</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get started with these AI-powered trading and investment insights
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPrompts = tradingPrompts.filter(p => p.category === category);
            
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getCategoryBadgeColor(category)}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {categoryPrompts.length} prompts
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryPrompts.map((prompt) => (
                    <Card 
                      key={prompt.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                      style={{ borderLeftColor: getCategoryColor(prompt.category).split(' ')[0].replace('bg-', '#') }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(prompt.category)} text-white`}>
                            {prompt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1">{prompt.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {prompt.description}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() => onPromptSelect(prompt.prompt)}
                            >
                              Try this prompt
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick action buttons */}
        <div className="mt-6 pt-6 border-t">
          <p className="text-sm font-medium mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPromptSelect('What are the top 5 stocks to buy today?')}
            >
              Top Stocks Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPromptSelect('Analyze the current market trends')}
            >
              Market Trends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPromptSelect('What should I know before investing $500?')}
            >
              Beginner Advice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPromptSelect('Compare growth vs value investing strategies')}
            >
              Investment Strategies
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}