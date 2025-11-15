# Performance Baselines & SLA Targets

## Service Level Agreements (SLAs)

### API Response Time
- **Target:** <200ms p95, <500ms p99
- **Critical Threshold:** >1000ms p95
- **Measurement:** Server-side timing from request receipt to response sent

### Screen Load Time
- **Target:** <1s initial load, <300ms navigation
- **Critical Threshold:** >3s initial load
- **Measurement:** Time to Interactive (TTI)

### Image Load Time
- **Target:** <2s progressive, <5s full quality
- **Critical Threshold:** >10s
- **Measurement:** First image pixel to complete image render

### Database Query Time
- **Target:** <100ms p95, <300ms p99
- **Critical Threshold:** >1000ms p95
- **Measurement:** Query execution time in PostgreSQL

## Current Baselines

### Baseline Measurements - 2025-01-10

**API Endpoints:**
| Endpoint | p50 | p95 | p99 | Notes |
|----------|-----|-----|-----|-------|
| GET /properties | TBD | TBD | TBD | With pagination (limit=20) |
| POST /properties | TBD | TBD | TBD | Create new property |
| GET /maintenance | TBD | TBD | TBD | With pagination (limit=20) |
| POST /maintenance | TBD | TBD | TBD | Create maintenance request |
| POST /auth/login | TBD | TBD | TBD | Clerk authentication |

**Database Queries:**
| Query | p50 | p95 | p99 | Notes |
|-------|-----|-----|-----|-------|
| Get properties by landlord | TBD | TBD | TBD | With indexes |
| Get maintenance by property | TBD | TBD | TBD | With indexes |
| RLS policy evaluation | TBD | TBD | TBD | Avg overhead per query |

**Screen Load Times:**
| Screen | First Paint | TTI | Notes |
|--------|-------------|-----|-------|
| Login Screen | TBD | TBD | Initial app load |
| Property List | TBD | TBD | With 20 properties |
| Property Details | TBD | TBD | With images |
| Maintenance List | TBD | TBD | With 20 requests |

## Performance Monitoring

### Automated Monitoring
```javascript
// Integrated in src/lib/monitoring.ts
export function trackPerformance(metricName: string, duration: number) {
  // Send to Sentry Performance
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(`${metricName}-end`);
    performance.measure(metricName, `${metricName}-start`, `${metricName}-end`);
  }

  // Log for analysis
  log.info('Performance metric', { metric: metricName, duration, unit: 'ms' });
}
```

### Real User Monitoring (RUM)

**Web Vitals Targets:**
- **LCP (Largest Contentful Paint):** <2.5s
- **FID (First Input Delay):** <100ms
- **CLS (Cumulative Layout Shift):** <0.1

**Mobile Metrics:**
- **App Start Time:** <2s cold start, <500ms warm start
- **Frame Rate:** >50 FPS (target: 60 FPS)
- **Memory Usage:** <150MB active, <50MB background

## Performance Budgets

### Bundle Size
- **Main Bundle:** <500KB gzipped
- **Async Chunks:** <100KB each
- **Images:** <200KB per image (compressed)
- **Total Initial Load:** <1MB

### Network Requests
- **Critical Path:** <10 requests for initial render
- **Subsequent Navigations:** <5 requests
- **Image Requests:** Lazy loaded, <20 concurrent

### Database Connections
- **Connection Pool Size:** 20 connections
- **Max Query Duration:** 1000ms (timeout)
- **Concurrent Queries:** <100

## Performance Testing

### Load Testing Scenarios

**Scenario 1: Normal Load**
- Concurrent users: 100
- Duration: 10 minutes
- Pattern: Mixed read/write (80/20)

**Scenario 2: Peak Load**
- Concurrent users: 500
- Duration: 5 minutes
- Pattern: Heavy read (95/5)

**Scenario 3: Stress Test**
- Concurrent users: 1000
- Duration: 2 minutes
- Pattern: Find breaking point

### Load Testing Script
```javascript
// scripts/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
  },
};

export default function () {
  // Test GET /properties
  const response = http.get('https://api.myailandlord.app/properties', {
    headers: { 'Authorization': `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

## Performance Optimization Checklist

### Database Optimizations
- [x] Pagination implemented (limit=20)
- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] RLS helper function to reduce sub-selects
- [ ] Query result caching (Redis)
- [ ] Connection pooling optimized
- [ ] Slow query logging enabled

### Application Optimizations
- [ ] Code splitting by route
- [ ] Lazy loading for images
- [ ] Lazy loading for components
- [ ] React.memo for expensive components
- [ ] useMemo for expensive calculations
- [ ] useCallback for event handlers
- [ ] Virtual scrolling for long lists

### Network Optimizations
- [ ] CDN for static assets
- [ ] CDN for user-uploaded images
- [ ] Gzip/Brotli compression
- [ ] HTTP/2 server push
- [ ] Resource prefetching
- [ ] Service worker caching (web)

### Image Optimizations
- [ ] Image compression (80% quality JPEG)
- [ ] WebP format with JPEG fallback
- [ ] Responsive images (srcset)
- [ ] Progressive JPEG loading
- [ ] Lazy loading below fold
- [ ] Thumbnail generation

## Performance Regression Detection

### Automated Checks in CI
```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.myailandlord.app
          uploadArtifacts: true
          temporaryPublicStorage: true
          budgetPath: ./lighthouse-budget.json
```

### Budget Configuration
```json
// lighthouse-budget.json
{
  "path": "/*",
  "timings": [
    {
      "metric": "first-contentful-paint",
      "budget": 2000
    },
    {
      "metric": "interactive",
      "budget": 3500
    }
  ],
  "resourceSizes": [
    {
      "resourceType": "script",
      "budget": 500
    },
    {
      "resourceType": "image",
      "budget": 200
    }
  ]
}
```

## Performance Alerts

### Sentry Performance Alerts
- **Slow API Response:** >500ms p95 for >5 minutes
- **High Error Rate:** >1% for >5 minutes
- **Memory Leak:** Memory usage increasing >10% per hour
- **Bundle Size:** Main bundle >500KB

### Custom Alerts
```typescript
// src/lib/monitoring.ts
export function alertSlowQuery(queryName: string, duration: number) {
  if (duration > 1000) {
    captureMessage(`Slow query: ${queryName} took ${duration}ms`, {
      level: 'warning',
      tags: { type: 'performance', query: queryName },
      extra: { duration, threshold: 1000 },
    });
  }
}
```

## Performance Dashboard

### Key Metrics to Display
1. **Response Time Trends:** p50, p95, p99 over time
2. **Error Rate:** Percentage of failed requests
3. **Throughput:** Requests per second
4. **Database Performance:** Query time distribution
5. **User Experience:** Screen load times, navigation speed

### Tools
- **Sentry Performance:** Real-time performance monitoring
- **Supabase Dashboard:** Database query performance
- **Custom Dashboard:** Grafana or similar for aggregated metrics

## Baseline Update Schedule

### Monthly
- Review all performance metrics
- Update baselines if significant changes
- Document performance improvements/regressions

### Quarterly
- Comprehensive performance audit
- Load testing with updated scenarios
- Update SLA targets if needed

### Annually
- Full performance review
- Budget reassessment
- Technology stack evaluation

---

**Last Updated:** 2025-01-10
**Next Review:** 2025-02-10
**Baseline Status:** Initial targets set, measurements pending
