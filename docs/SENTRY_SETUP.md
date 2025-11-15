# Sentry Monitoring Setup

Complete guide for configuring Sentry error tracking and performance monitoring.

## Prerequisites

1. Create Sentry account at https://sentry.io
2. Create new project for "React Native"
3. Get your DSN from Project Settings → Client Keys (DSN)

## Installation

Already installed in package.json:
```bash
npm install --save @sentry/react-native
```

## Configuration

### 1. Environment Variables

Add to `.env`:
```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/7654321
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production  # or staging, development
EXPO_PUBLIC_SENTRY_RELEASE=1.0.0  # Sync with app.json version
```

### 2. Initialize Sentry

Already configured in `App.tsx` with Expo integration.

### 3. Source Maps (for readable stack traces)

Configure in `app.json`:
```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-org-slug",
            "project": "your-project-slug",
            "authToken": "your-auth-token"
          }
        }
      ]
    }
  }
}
```

Get auth token from: Sentry → Settings → Account → API → Auth Tokens

### 4. Release Tracking

EAS Build automatically tracks releases when configured:

```bash
# In eas.json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "your-project-slug",
        "SENTRY_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

## Alert Configuration

### 1. Error Rate Alerts

Navigate to: Sentry → Alerts → Create Alert Rule

**High Error Rate Alert:**
- When: `Event count > 100`
- In: `1 hour`
- Environment: `production`
- Action: Email + Slack

**Critical Error Alert:**
- When: `Event count > 10`
- In: `5 minutes`
- Level: `error` or `fatal`
- Action: PagerDuty + Slack

### 2. Performance Alerts

**Slow Transactions:**
- When: `p95(transaction.duration) > 3000ms`
- In: `10 minutes`
- Transaction: `navigation` or `api.call`
- Action: Email

**High Failure Rate:**
- When: `Failure rate > 5%`
- In: `10 minutes`
- Action: Email + Slack

### 3. User Impact Alerts

**Affected Users:**
- When: `Number of users > 50`
- With: Any error
- In: `1 hour`
- Action: Email

## User Context

Sentry automatically captures:
- Clerk User ID
- Email (hashed)
- User role (landlord/tenant)
- Session ID

Configure in `src/lib/sentry.ts`:
```typescript
import * as Sentry from '@sentry/react-native';
import { useUser } from '@clerk/clerk-expo';

export function useSentryUser() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
}
```

## Custom Error Grouping

Prevent noise from similar errors:

```typescript
// In Sentry init
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Group all "Network request failed" errors together
    if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
      event.fingerprint = ['network-error'];
    }

    // Group all RLS violations together
    if (event.exception?.values?.[0]?.value?.includes('RLS')) {
      event.fingerprint = ['rls-violation'];
    }

    return event;
  },
});
```

## Performance Monitoring

### Transaction Tracking

Already enabled via `@sentry/react-native` integration:
- Screen navigation timing
- API request duration
- Component render time

### Custom Transactions

Track important operations:

```typescript
import * as Sentry from '@sentry/react-native';

async function createMaintenanceRequest(data) {
  const transaction = Sentry.startTransaction({
    op: 'maintenance.create',
    name: 'Create Maintenance Request',
  });

  try {
    const result = await api.createMaintenanceRequest(data);
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

### Performance Targets

Configure sampling rates in Sentry init:

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2, // 20% of transactions in production
  profilesSampleRate: 0.1, // 10% profiling in production
});
```

## Filtering Sensitive Data

Already handled by `src/lib/log.ts` sanitization, but add extra layer:

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Remove sensitive query params
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/, 'token=REDACTED');
    }

    // Remove breadcrumbs with sensitive data
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data?.password) {
          breadcrumb.data.password = '[REDACTED]';
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
```

## Testing Sentry Integration

### 1. Test Error Capture

```typescript
import * as Sentry from '@sentry/react-native';

// Trigger test error
Sentry.captureException(new Error('Sentry test error'));
```

### 2. Test Performance

```typescript
const transaction = Sentry.startTransaction({
  op: 'test',
  name: 'Sentry Performance Test',
});
setTimeout(() => transaction.finish(), 1000);
```

### 3. Verify in Sentry Dashboard

- Navigate to: Issues → All Issues
- Confirm test error appears
- Navigate to: Performance → Transactions
- Confirm test transaction appears

## Production Checklist

- [ ] DSN configured in `.env`
- [ ] Environment set to `production`
- [ ] Release version matches `app.json`
- [ ] Source maps uploaded via EAS Build
- [ ] Alert rules configured (error rate, performance, user impact)
- [ ] User context tracking enabled
- [ ] Sensitive data filtering enabled
- [ ] Performance sampling configured (20%)
- [ ] Test error sent and confirmed in dashboard

## Monitoring Metrics

Track these KPIs in Sentry dashboard:

### Error Metrics
- **Error Count**: < 100 per day in production
- **Affected Users**: < 1% of daily active users
- **Error Rate**: < 0.1% of all events

### Performance Metrics
- **Transaction Duration (p95)**: < 3000ms
- **Transaction Failure Rate**: < 5%
- **Slow Queries**: < 10 per hour

### User Experience
- **Crashes**: 0 per day
- **ANR (Application Not Responding)**: < 5 per day
- **Memory Issues**: 0 per day

## Common Issues

### Source Maps Not Uploading
**Solution**: Ensure `SENTRY_AUTH_TOKEN` is set in EAS secrets:
```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value your-token --scope project
```

### High Event Volume
**Solution**: Increase `sampleRate` and `tracesSampleRate` to filter events:
```typescript
Sentry.init({
  sampleRate: 0.5, // Sample 50% of errors
  tracesSampleRate: 0.1, // Sample 10% of performance
});
```

### Duplicate Errors
**Solution**: Use custom fingerprinting to group similar errors (see Custom Error Grouping above)

## Resources

- Sentry React Native Docs: https://docs.sentry.io/platforms/react-native/
- Expo Integration: https://docs.expo.dev/guides/using-sentry/
- Performance Monitoring: https://docs.sentry.io/product/performance/
- Release Health: https://docs.sentry.io/product/releases/health/
