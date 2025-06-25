"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { 
  AlertTriangle, 
  Bell, 
  TrendingUp, 
  Volume2, 
  BarChart3, 
  Newspaper,
  X,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import { TradingAlert } from '@/types/trading';

interface AlertsPanelProps {
  alerts: TradingAlert[];
  onAlertDismiss?: (alertId: string) => void;
  onAlertClick?: (alert: TradingAlert) => void;
}

export function AlertsPanel({ alerts, onAlertDismiss, onAlertClick }: AlertsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'high' | 'critical'>('all');

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'PRICE_MOVEMENT':
        return <TrendingUp className="h-4 w-4" />;
      case 'VOLUME_SPIKE':
        return <Volume2 className="h-4 w-4" />;
      case 'TECHNICAL_INDICATOR':
        return <BarChart3 className="h-4 w-4" />;
      case 'NEWS_IMPACT':
        return <Newspaper className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'MEDIUM':
        return <Bell className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'HIGH':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const getAlertBorderColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-l-red-500';
      case 'HIGH':
        return 'border-l-orange-500';
      case 'MEDIUM':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    switch (filter) {
      case 'active':
        return alert.isActive;
      case 'high':
        return alert.severity === 'HIGH' || alert.severity === 'CRITICAL';
      case 'critical':
        return alert.severity === 'CRITICAL';
      default:
        return true;
    }
  });

  const activeAlerts = alerts.filter(alert => alert.isActive);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'CRITICAL');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Alerts</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-red-600">
              {criticalAlerts.length} critical
            </Badge>
            <Badge variant="secondary">
              {activeAlerts.length} active
            </Badge>
          </div>
        </div>
        
        {/* Filter buttons */}
        <div className="flex space-x-2 mt-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={filter === 'high' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('high')}
          >
            High Priority
          </Button>
          <Button
            variant={filter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critical
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No alerts match your filter</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 border-l-4 ${getAlertBorderColor(alert.severity)} 
                    hover:shadow-md transition-shadow cursor-pointer
                    ${!alert.isActive ? 'opacity-60' : ''}`}
                  onClick={() => onAlertClick?.(alert)}
                >
                  {/* Alert Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type)}
                      <span className="font-semibold">{alert.ticker}</span>
                      <Badge className={getSeverityColor(alert.severity)} variant="default">
                        {alert.severity}
                      </Badge>
                      {!alert.isActive && (
                        <Badge variant="outline" className="text-gray-500">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.isActive && onAlertDismiss && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAlertDismiss(alert.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {getSeverityIcon(alert.severity)}
                    </div>
                  </div>

                  {/* Alert Message */}
                  <div className="mb-3">
                    <p className="text-sm leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  {/* Alert Type and Time */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {getAlertIcon(alert.type)}
                        <span>{alert.type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>
                    {!alert.isActive && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Resolved</span>
                      </div>
                    )}
                  </div>

                  {/* Alert Actions */}
                  {alert.isActive && (
                    <div className="flex justify-end space-x-2 mt-3 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAlertClick?.(alert);
                        }}
                      >
                        View Details
                      </Button>
                      {onAlertDismiss && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAlertDismiss(alert.id);
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-red-600">{criticalAlerts.length}</div>
              <div className="text-muted-foreground">Critical</div>
            </div>
            <div>
              <div className="font-semibold text-orange-600">
                {alerts.filter(a => a.severity === 'HIGH').length}
              </div>
              <div className="text-muted-foreground">High</div>
            </div>
            <div>
              <div className="font-semibold">{activeAlerts.length}</div>
              <div className="text-muted-foreground">Active</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}