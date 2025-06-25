"use client";

import React from 'react';
import { TradingDashboard } from '@/components/trading/TradingDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function TradingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Chat
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Trading Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time trading signals and market analysis
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/enhanced-trading">
                <Button variant="default">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Enhanced Platform
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">
                  Chat Interface
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Dashboard */}
      <div className="container mx-auto">
        <TradingDashboard />
      </div>
    </div>
  );
}