## [SEVERITY: MEDIUM] Inefficient Retry Logic in `authHeaders`

**File**: `src/lib/rest.ts`
**Issue**: The `authHeaders` function uses a fixed delay for its retry logic. This is not ideal for mobile apps, as it can lead to unnecessary delays and a poor user experience.
**Impact**: This could cause the app to feel sluggish and unresponsive.
**Reproduction**: N/A
**Fix**: The retry logic should be updated to use an exponential backoff strategy. This will ensure that the app retries quickly at first, and then backs off if the token is still not available.

**Code Example**:
```typescript
// The current implementation uses a fixed delay
async function authHeaders(tokenProvider?: TokenProvider, retries = 6, delayMs = 200): Promise<HeadersInit> {
  // ...
  for (let i = 0; i < retries; i++) {
    const t = await getToken()
    if (t) return { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    await new Promise(r => setTimeout(r, delayMs))
  }
  // ...
}

// The corrected implementation should use an exponential backoff strategy
async function authHeaders(tokenProvider?: TokenProvider, retries = 6, initialDelayMs = 200): Promise<HeadersInit> {
  let delayMs = initialDelayMs
  for (let i = 0; i < retries; i++) {
    const t = await getToken()
    if (t) return { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    await new Promise(r => setTimeout(r, delayMs))
    delayMs *= 2
  }
  // ...
}
```
