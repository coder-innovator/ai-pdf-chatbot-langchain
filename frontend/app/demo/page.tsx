"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingPrompts } from '@/components/chat/TradingPrompts';
import { MockFinancialResponse } from '@/components/chat/MockFinancialResponse';
import { TrendingUp, MessageSquare, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [showResponse, setShowResponse] = useState(false);

  const handlePromptSelect = (prompt: string) => {
    setSelectedPrompt(prompt);
    setShowResponse(true);
  };

  const clearResponse = () => {
    setSelectedPrompt('');
    setShowResponse(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Trading AI Demo</h1>
              <p className="text-muted-foreground">
                Experience AI-powered trading insights and analysis
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/">
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat Interface
                </Button>
              </Link>
              <Link href="/trading">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Trading Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Demo Overview */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>AI Trading Assistant Demo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This demo showcases the AI trading assistant capabilities. Select a prompt below to see how the AI analyzes trading questions and provides intelligent recommendations.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Mock Data</Badge>
                <Badge variant="secondary">AI Analysis</Badge>
                <Badge variant="secondary">Trading Recommendations</Badge>
                <Badge variant="secondary">Risk Assessment</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompts">Trading Prompts</TabsTrigger>
            <TabsTrigger value="response" disabled={!showResponse}>
              AI Response
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="space-y-6">
            <TradingPrompts onPromptSelect={handlePromptSelect} />
            
            {selectedPrompt && (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="text-lg">Selected Question</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 p-4 bg-background rounded-lg border">
                    "{selectedPrompt}"
                  </p>
                  <div className="flex space-x-2">
                    <Button onClick={() => setShowResponse(true)}>
                      Get AI Analysis
                    </Button>
                    <Button variant="outline" onClick={clearResponse}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="response" className="space-y-6">
            {showResponse && selectedPrompt && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Your Question</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm p-4 bg-muted/30 rounded-lg">
                      "{selectedPrompt}"
                    </p>
                  </CardContent>
                </Card>

                <MockFinancialResponse 
                  message={selectedPrompt}
                  onRetry={() => setShowResponse(true)}
                  sessionId="demo-session"
                />

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setSelectedPrompt('')}>
                    Try Another Question
                  </Button>
                  <Link href="/trading">
                    <Button>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Trading Dashboard
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Features Overview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>AI Chat</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ask trading questions and get intelligent responses with reasoning and recommendations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Live Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Real-time trading signals, market data, and interactive charts with WebSocket updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Smart Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Technical analysis, risk assessment, and portfolio recommendations powered by AI.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}