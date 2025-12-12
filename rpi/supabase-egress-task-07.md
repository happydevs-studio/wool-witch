# Task 07: Monitoring, Alerting, and Cost Tracking

## Objective
Implement comprehensive monitoring and alerting system to track egress costs, performance metrics, and optimization effectiveness.

## Scope
- Set up Supabase egress cost monitoring
- Implement custom analytics for data transfer patterns
- Create alerting system for unusual usage spikes
- Build optimization effectiveness dashboard
- Establish cost tracking and budgeting

## Acceptance Criteria
- [ ] Real-time egress cost monitoring dashboard
- [ ] Automated alerts for cost spikes
- [ ] Performance metrics tracking for all optimizations
- [ ] Monthly cost reporting and analysis
- [ ] Predictive cost modeling for scaling

## Technical Tasks

### Supabase Monitoring Setup
- [ ] Configure Supabase project monitoring
- [ ] Set up API usage tracking
- [ ] Enable storage usage monitoring
- [ ] Configure real-time subscription monitoring
- [ ] Set up custom metric collection

### Custom Analytics Implementation
- [ ] Build data transfer monitoring system
- [ ] Track optimization effectiveness metrics
- [ ] Implement user behavior analytics
- [ ] Monitor cache hit rates and performance
- [ ] Create cost-per-user tracking

### Alerting System
- [ ] Set up cost threshold alerts
- [ ] Configure performance degradation alerts
- [ ] Implement anomaly detection for usage patterns
- [ ] Create automated response scripts
- [ ] Set up notification channels (email, Slack, etc.)

### Dashboard Development
- [ ] Build admin monitoring dashboard
- [ ] Create public performance status page
- [ ] Implement real-time metrics visualization
- [ ] Add cost forecasting charts
- [ ] Create optimization impact reports

## Implementation Details

### Cost Monitoring Service
```typescript
// src/lib/costMonitoring.ts
export class CostMonitor {
  private metrics: Map<string, number> = new Map()
  
  async trackEgress(endpoint: string, bytes: number) {
    // Track egress by endpoint
    const current = this.metrics.get(endpoint) || 0
    this.metrics.set(endpoint, current + bytes)
    
    // Send to analytics
    await this.sendToAnalytics('egress_usage', {
      endpoint,
      bytes,
      timestamp: new Date().toISOString(),
      user_id: this.getCurrentUserId()
    })
  }
  
  async checkThresholds() {
    const dailyUsage = await this.getDailyUsage()
    const monthlyBudget = await this.getMonthlyBudget()
    
    if (dailyUsage.projected_monthly > monthlyBudget * 0.8) {
      await this.triggerAlert('budget_warning', {
        current: dailyUsage.projected_monthly,
        budget: monthlyBudget,
        percentage: (dailyUsage.projected_monthly / monthlyBudget) * 100
      })
    }
  }
}
```

### Performance Metrics Collection
```typescript
// src/lib/performanceMonitor.ts
export const trackPerformanceMetric = (metric: string, value: number) => {
  // Track optimization effectiveness
  const metrics = {
    response_size_reduction: value,
    cache_hit_rate: value,
    compression_ratio: value,
    query_optimization_impact: value,
    cdn_performance: value
  }
  
  analytics.track('performance_metric', {
    metric,
    value,
    timestamp: new Date().toISOString(),
    optimization_version: getOptimizationVersion()
  })
}
```

### Supabase Usage Tracking
```typescript
// src/lib/supabaseMonitor.ts
export const monitorSupabaseUsage = () => {
  // Intercept Supabase client calls to track usage
  const originalFrom = supabase.from
  
  supabase.from = function(table: string) {
    const query = originalFrom.call(this, table)
    const originalSelect = query.select
    
    query.select = function(columns?: string) {
      const startTime = performance.now()
      const result = originalSelect.call(this, columns)
      
      // Track query performance and data transfer
      result.then((response) => {
        const endTime = performance.now()
        const responseSize = JSON.stringify(response.data).length
        
        trackQueryMetrics({
          table,
          columns: columns || '*',
          response_time: endTime - startTime,
          response_size: responseSize,
          row_count: response.data?.length || 0
        })
      })
      
      return result
    }
    
    return query
  }
}
```

## Monitoring Dashboard

### Admin Dashboard Component
```typescript
// src/components/admin/MonitoringDashboard.tsx
export const MonitoringDashboard = () => {
  const costMetrics = useCostMetrics()
  const performanceMetrics = usePerformanceMetrics()
  const optimizationMetrics = useOptimizationMetrics()
  
  return (
    <div className="monitoring-dashboard">
      <CostSummaryCard metrics={costMetrics} />
      <PerformanceChart data={performanceMetrics} />
      <OptimizationEffectiveness data={optimizationMetrics} />
      <AlertsPanel />
      <UsageForecast />
    </div>
  )
}
```

### Cost Tracking Components
```typescript
// src/components/admin/CostSummaryCard.tsx
export const CostSummaryCard = ({ metrics }: { metrics: CostMetrics }) => {
  return (
    <div className="cost-summary">
      <div>Current Month: ${metrics.currentMonth.toFixed(2)}</div>
      <div>Projected: ${metrics.projected.toFixed(2)}</div>
      <div>Budget: ${metrics.budget.toFixed(2)}</div>
      <div>Savings from Optimizations: ${metrics.savings.toFixed(2)}</div>
      <div>Trend: {metrics.trend > 0 ? '↗️' : '↘️'} {metrics.trendPercent}%</div>
    </div>
  )
}
```

## Alerting System

### Alert Configuration
```typescript
// src/lib/alerting.ts
export const alertConfig = {
  cost_threshold: {
    warning: 0.8,  // 80% of budget
    critical: 0.95, // 95% of budget
    emergency: 1.1  // 110% of budget
  },
  performance_degradation: {
    response_time_increase: 50, // 50% slower than baseline
    cache_hit_rate_drop: 0.7,  // Below 70%
    error_rate_spike: 0.05     // Above 5%
  },
  usage_anomaly: {
    traffic_spike: 3.0,        // 300% above normal
    egress_spike: 2.5,         // 250% above normal
    query_volume_spike: 4.0    // 400% above normal
  }
}

export const triggerAlert = async (type: string, data: any) => {
  const alert = {
    type,
    severity: calculateSeverity(type, data),
    data,
    timestamp: new Date().toISOString(),
    id: generateAlertId()
  }
  
  await sendAlert(alert)
}
```

### Notification Channels
```typescript
// src/lib/notifications.ts
export const sendAlert = async (alert: Alert) => {
  // Email notifications
  if (alert.severity >= AlertSeverity.WARNING) {
    await sendEmailAlert(alert)
  }
  
  // Slack notifications for critical alerts
  if (alert.severity >= AlertSeverity.CRITICAL) {
    await sendSlackAlert(alert)
  }
  
  // SMS for emergency alerts
  if (alert.severity === AlertSeverity.EMERGENCY) {
    await sendSMSAlert(alert)
  }
  
  // Store in database for dashboard
  await storeAlert(alert)
}
```

## Analytics and Reporting

### Monthly Cost Report
```typescript
// src/lib/reporting.ts
export const generateMonthlyCostReport = async (month: string) => {
  const data = await getCostData(month)
  
  return {
    summary: {
      total_cost: data.totalCost,
      egress_cost: data.egressCost,
      storage_cost: data.storageCost,
      compute_cost: data.computeCost,
      optimization_savings: data.savings
    },
    breakdown: {
      by_service: data.serviceBreakdown,
      by_endpoint: data.endpointBreakdown,
      by_optimization: data.optimizationImpact
    },
    trends: {
      month_over_month: data.momChange,
      year_over_year: data.yoyChange,
      forecast: data.forecast
    },
    recommendations: generateCostRecommendations(data)
  }
}
```

### Performance Analytics
```typescript
// src/lib/performanceAnalytics.ts
export const analyzeOptimizationEffectiveness = async () => {
  const baseline = await getBaselineMetrics()
  const current = await getCurrentMetrics()
  
  return {
    query_optimization: {
      response_size_reduction: calculateReduction(baseline.avgResponseSize, current.avgResponseSize),
      response_time_improvement: calculateImprovement(baseline.avgResponseTime, current.avgResponseTime)
    },
    caching: {
      hit_rate: current.cacheHitRate,
      response_time_improvement: current.cachedResponseTime / baseline.avgResponseTime
    },
    cdn_migration: {
      image_load_improvement: calculateImprovement(baseline.imageLoadTime, current.imageLoadTime),
      egress_cost_reduction: calculateReduction(baseline.imageEgressCost, current.imageEgressCost)
    },
    overall: {
      total_cost_reduction: calculateReduction(baseline.totalCost, current.totalCost),
      performance_improvement: calculateOverallPerformance(baseline, current)
    }
  }
}
```

## Database Schema for Monitoring

### Metrics Tables
```sql
-- supabase/migrations/add_monitoring_tables.sql
CREATE TABLE woolwitch.cost_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  egress_bytes bigint NOT NULL DEFAULT 0,
  egress_cost decimal(10,4) NOT NULL DEFAULT 0,
  storage_cost decimal(10,4) NOT NULL DEFAULT 0,
  compute_cost decimal(10,4) NOT NULL DEFAULT 0,
  total_cost decimal(10,4) NOT NULL DEFAULT 0,
  optimization_version text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE woolwitch.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  metric_name text NOT NULL,
  metric_value decimal(10,4) NOT NULL,
  timestamp timestamptz DEFAULT now(),
  user_agent text,
  optimization_version text
);

CREATE TABLE woolwitch.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL,
  data jsonb NOT NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

## Monitoring Infrastructure

### Environment Variables
```bash
# .env.local additions for monitoring
VITE_ANALYTICS_API_KEY=your_analytics_key
VITE_MONITORING_ENABLED=true
VITE_ALERT_EMAIL=admin@woolwitch.com
VITE_SLACK_WEBHOOK_URL=your_slack_webhook
VITE_COST_BUDGET_MONTHLY=100
```

### Monitoring Service Worker
```typescript
// src/lib/monitoringWorker.ts
// Background service worker to collect and send metrics
self.addEventListener('fetch', (event) => {
  // Track all network requests for analytics
  if (event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request).then(response => {
        trackNetworkMetrics(event.request, response)
        return response
      })
    )
  }
})
```

## Implementation Timeline

### Week 1: Basic Monitoring
- [ ] Set up Supabase usage tracking
- [ ] Implement basic cost monitoring
- [ ] Create simple dashboard

### Week 2: Advanced Analytics
- [ ] Build comprehensive dashboard
- [ ] Implement performance tracking
- [ ] Set up alerting system

### Week 3: Reporting and Optimization
- [ ] Create automated reports
- [ ] Implement cost forecasting
- [ ] Fine-tune alerting thresholds

## Timeline
**Duration**: 2-3 weeks  
**Priority**: MEDIUM  
**Dependencies**: All previous optimization tasks  
**Next Task**: Final review and documentation

## Success Metrics
- **Monitoring Coverage**: 100% of egress costs tracked
- **Alert Accuracy**: <5% false positive rate
- **Dashboard Usability**: Real-time updates within 30 seconds
- **Cost Visibility**: Complete cost attribution by optimization

## Tools and Services
- Supabase Dashboard API
- Custom analytics service
- Email/SMS notification services
- Grafana/DataDog for advanced visualization
- Custom React dashboard components

## Notes
- Start with basic monitoring and gradually add sophistication
- Focus on actionable alerts rather than noise
- Ensure monitoring doesn't add significant overhead
- Plan for scaling monitoring as the application grows
