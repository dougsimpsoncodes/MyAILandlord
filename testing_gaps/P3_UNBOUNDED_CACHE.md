## [SEVERITY: MEDIUM] Unbounded Cache in `SupabaseStorageService`

**File**: `src/services/supabase/storage.ts`
**Issue**: The `signedUrlCache` in the `SupabaseStorageService` is unbounded. This could lead to a memory leak if the application requests a large number of signed URLs.
**Impact**: This could cause the application to crash or become unresponsive over time.
**Reproduction**: N/A
**Fix**: The cache should be bounded to a reasonable size. A simple way to do this is to clear the cache periodically or to use a more sophisticated caching library that supports a max size.

**Code Example**:
```typescript
// The current implementation has an unbounded cache
export class SupabaseStorageService {
  private signedUrlCache = new Map<string, { url: string; expires: number }>();
  // ...
}

// The corrected implementation should use a bounded cache
// For example, you could clear the cache every 1000 entries
export class SupabaseStorageService {
  private signedUrlCache = new Map<string, { url: string; expires: number }>();

  private cleanupCache() {
    if (this.signedUrlCache.size > 1000) {
      // Simple strategy: clear half the cache
      const keys = Array.from(this.signedUrlCache.keys()).slice(0, 500);
      for (const key of keys) {
        this.signedUrlCache.delete(key);
      }
    }
  }

  async getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
    this.cleanupCache();
    // ...
  }
}
```
