# Security & Performance Review - December 19, 2025

## Instructions for Reviewing LLM

You are being asked to verify security and performance improvements made to the MyAILandlord React Native application. Your task is to:

1. **Read each file mentioned** in this document using your file reading capabilities
2. **Verify the security fixes are correctly implemented** - check that API keys are not exposed, sanitization is comprehensive, and caching doesn't introduce vulnerabilities
3. **Check for correctness** - ensure implementations follow best practices, don't introduce bugs, and handle edge cases
4. **Identify any issues** - look for potential runtime errors, race conditions, or incomplete implementations
5. **Verify the Edge Function** - ensure it properly validates authentication, rate limits requests, and securely handles the API key
6. **Report your findings** - summarize what you verified, any discrepancies found, and any concerns about the implementation quality

Focus especially on: the Edge Function security model, sanitization completeness (XSS, path traversal, URL injection), and whether the profile caching could cause stale data or race condition issues.

---

## Session Overview

**Objective:** Fix critical security vulnerabilities, strengthen input sanitization, centralize profile data with caching, and clean up obsolete files.

**Commit:** `3320616` on `main` branch

**Changes Summary:**
- 179 files changed
- 1,696 insertions, 53,067 deletions
- Passed gitleaks security scan

---

## Critical Security Fix: Gemini API Key Protection

### Problem Identified

A security audit found that the Gemini Vision API key was exposed in client-side code:

**File (BEFORE):** `src/services/ai/labelExtraction.ts`
```typescript
// INSECURE - API key in client bundle, extractable by anyone
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  { ... }
);
```

This is a HIGH severity issue because:
- React Native bundles are JavaScript that can be extracted from the app
- Anyone with the APK/IPA could extract the API key
- The key could be used to make unauthorized API calls, incurring costs

### Solution Implemented

Created a Supabase Edge Function to proxy Gemini API calls server-side.

**New File:** `supabase/functions/extract-asset-label/index.ts`

```typescript
serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2. Require Authorization header (JWT)
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 3. Rate limiting (20 requests/minute per user)
  const key = `label:${token.slice(0, 16)}`
  if (rateLimited(key)) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
  }

  // 4. Verify JWT with Supabase
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const userRes = await supabase.auth.getUser(token)
  if (userRes.error || !userRes.data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 5. Call Gemini with SERVER-SIDE API key (not exposed to client)
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
    { body: JSON.stringify({ contents: [...] }) }
  )

  // 6. Return processed result
  return new Response(JSON.stringify({ success: true, data: cleanedData }))
})
```

**Updated File:** `src/services/ai/labelExtraction.ts`

```typescript
// SECURE - No API key in client, calls Edge Function instead
import { supabase } from '../supabase/config';

export async function extractAssetDataFromImage(imageUri: string): Promise<LabelExtractionResult> {
  // Read image and convert to base64
  const base64Image = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Call Edge Function (API key is securely stored server-side)
  const { data, error } = await supabase.functions.invoke('extract-asset-label', {
    body: {
      imageBase64: base64Image,
      mimeType: mimeType
    }
  });

  // Handle response...
}
```

### Verification Steps

1. **Read `supabase/functions/extract-asset-label/index.ts`** and verify:
   - Authorization header is required
   - JWT is validated with Supabase auth
   - Rate limiting is implemented (20 req/min)
   - Gemini API key comes from `Deno.env.get()`, not hardcoded
   - CORS headers are properly configured

2. **Read `src/services/ai/labelExtraction.ts`** and verify:
   - No `GEMINI_API_KEY` or `EXPO_PUBLIC_GEMINI_API_KEY` references
   - No direct fetch calls to `generativelanguage.googleapis.com`
   - Uses `supabase.functions.invoke('extract-asset-label', ...)` instead

3. **Search codebase** for any remaining API key references:
   ```bash
   grep -r "GEMINI_API_KEY" src/
   grep -r "generativelanguage.googleapis.com" src/
   ```
   Both should return no results.

---

## Security Enhancement: Input Sanitization

### Problem Identified

The existing `sanitizeString` function was weak:

```typescript
// OLD - Only removes < and >
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
```

This didn't protect against:
- Null byte injection (can bypass filters)
- Control character injection
- Unicode direction override attacks (text spoofing)
- Incomplete HTML entity encoding

### Solution Implemented

**File:** `src/utils/helpers.ts`

**New `sanitizeString` implementation:**
```typescript
export const sanitizeString = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes (can bypass filters)
    .replace(/\0/g, '')
    // Remove control characters (except newlines and tabs for text areas)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove Unicode direction override characters (text spoofing)
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Encode HTML special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

**New `sanitizeForDisplay` function:**
```typescript
export const sanitizeForDisplay = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    // Remove HTML tags entirely for display
    .replace(/<[^>]*>/g, '');
};
```

**New `sanitizeUrl` function:**
```typescript
export const sanitizeUrl = (input: string): string => {
  if (!input) return '';

  const trimmed = input.trim();

  // Block dangerous protocols
  const lowerUrl = trimmed.toLowerCase();
  if (lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:')) {
    return '';
  }

  // Allow http, https, and relative URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return '';
    }
  }

  // Relative URLs - block path traversal
  if (trimmed.includes('..')) {
    return '';
  }

  return trimmed;
};
```

**New `sanitizePath` function:**
```typescript
export const sanitizePath = (input: string): string => {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    // Remove multiple slashes
    .replace(/\/+/g, '/')
    // Remove leading slash for storage paths
    .replace(/^\//, '');
};
```

### Integration Points

**File:** `src/utils/validation.ts`
- `sanitizeProfileData`: Changed `avatarUrl` to use `sanitizeUrl`
- `sanitizeMessageData`: Changed `attachmentUrl` to use `sanitizeUrl`

**File:** `src/services/api/client.ts`
- `uploadFile`: Uses `sanitizePath` for `fileName` and `folder`
- `getSignedUrl`: Uses `sanitizePath`, rejects empty paths
- `deleteFile`: Uses `sanitizePath`, rejects empty paths
- `updateUserProfile`: Uses `sanitizeUrl` for `avatarUrl`

### Verification Steps

1. **Read `src/utils/helpers.ts`** and verify all four sanitization functions exist with the described protections

2. **Read `src/utils/validation.ts`** and verify:
   - `sanitizeUrl` is imported
   - `avatarUrl` field uses `sanitizeUrl`
   - `attachmentUrl` field uses `sanitizeUrl`

3. **Read `src/services/api/client.ts`** and verify:
   - `sanitizePath` and `sanitizeUrl` are imported
   - File operations use `sanitizePath`
   - `updateUserProfile` uses `sanitizeUrl` for avatar

---

## Performance Enhancement: Centralized Profile Caching

### Problem Identified

Multiple components were independently fetching user profile data:
- `useProfileSync` hook
- `PendingRequestsContext`
- `UnreadMessagesContext`
- `PropertyCodeEntryScreen`
- `PropertyInviteAcceptScreen`

This caused:
- Redundant API calls (same data fetched multiple times)
- Potential race conditions
- Inconsistent profile state across components

### Solution Implemented

**New File:** `src/context/ProfileContext.tsx`

```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfileCache: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const fetchInProgressRef = useRef<boolean>(false);

  const { session, isReady } = useSupabaseAuth();

  const refreshProfile = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInProgressRef.current) return;

    // Check cache TTL
    const now = Date.now();
    if (profile && now - lastFetchRef.current < CACHE_TTL_MS) {
      return;
    }

    fetchInProgressRef.current = true;
    setIsLoading(true);

    try {
      const data = await apiClient.getUserProfile();
      setProfile(data);
      lastFetchRef.current = Date.now();
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [profile]);

  // Auto-fetch on auth ready, clear on sign-out
  useEffect(() => {
    if (isReady && session) {
      refreshProfile();
    } else if (isReady && !session) {
      clearProfile();
    }
  }, [isReady, session]);

  // ...
}

export const useProfile = () => useContext(ProfileContext);
```

### Provider Hierarchy

**File:** `App.tsx`

```
SafeAreaProvider
  └── SupabaseAuthProvider
        └── RoleProvider
              └── ProfileProvider  ← NEW (added here)
                    └── UnreadMessagesProvider
                          └── PendingRequestsProvider
                                └── AppNavigator
```

### Components Updated to Use ProfileContext

| File | Change |
|------|--------|
| `src/hooks/useProfileSync.ts` | Uses `useProfile()` instead of `apiClient.getUserProfile()` |
| `src/context/PendingRequestsContext.tsx` | Uses `useProfile()` for profile data |
| `src/context/UnreadMessagesContext.tsx` | Uses `useProfile()` for profile data |
| `src/screens/tenant/PropertyCodeEntryScreen.tsx` | Uses `useProfile()` for profile checks |
| `src/screens/tenant/PropertyInviteAcceptScreen.tsx` | Uses `useProfile()` for profile checks |

### Verification Steps

1. **Read `src/context/ProfileContext.tsx`** and verify:
   - 5-minute TTL cache
   - `fetchInProgressRef` prevents concurrent fetches
   - `refreshProfile()` respects cache TTL
   - `clearProfile()` for sign-out cleanup
   - Auto-fetch on auth ready

2. **Read `App.tsx`** and verify `ProfileProvider` is in the provider hierarchy

3. **Search for direct API calls** that should now use cache:
   ```bash
   grep -r "apiClient.getUserProfile()" src/
   ```
   Should only appear in:
   - `src/services/api/client.ts` (the API method definition)
   - `src/services/api/mockClient.ts` (mock implementation)
   - `src/context/ProfileContext.tsx` (centralized fetch)

---

## Security Cleanup: Removed Test/Debug Code

### ReportIssueScreen.tsx

**Removed:**
- Test property injection code that created fake "Test Property" when no properties loaded
- All `console.log` statements
- `(globalThis as any).LAST_HANDLE_SUBMIT` debug assignment

### PropertyInfoScreen.tsx

**Removed:**
- Hardcoded WiFi credentials ("HomeNetwork_5G", "SecurePass123!")
- Hardcoded emergency contact info
- Hardcoded gate/garage codes

**Changed:**
- Now uses actual data passed via route params
- Shows "Not provided" when data is missing

### Verification Steps

1. **Read `src/screens/tenant/ReportIssueScreen.tsx`** and verify:
   - No "Test Property" string
   - No `console.log` statements
   - No `globalThis` references

2. **Read `src/screens/tenant/PropertyInfoScreen.tsx`** and verify:
   - No hardcoded credentials or phone numbers
   - Data comes from `route.params`

---

## File Cleanup Summary

### Files Deleted (Selection)

**Root HTML files (7):**
- `PropertyBasicsScreen_Preview.html`
- `PropertyFlow_All8Pages_Preview.html`
- `design-mockups.html`
- `test-checklist.html`
- `test-invite-link.html`
- `test-plan.html`
- `web-design-mockups.html`

**Root MD files (20):**
- `BUILD_ISSUE_REPORT.md`, `BUILD_SYSTEM_LESSONS.md`, `CODEX_HANDOFF.md`
- `DEBUGGING_METHODOLOGY.md`, `DOCUMENTATION_INDEX.md`
- `E2E_TESTING_COMPLETE_GUIDE.md`, `EAS_BUILD_FIXES.md`
- `EDGE_FUNCTION_PRODUCTION_CONFIG.md`, `ENHANCED_EXECUTION_GUIDE.md`
- `LARGE_SCREEN_DESIGN_GUIDE.md`, `LIVE_TESTING_PLAN.md`
- `MIGRATION_VERIFICATION_REPORT.md`, `PRE_MERGE_CHECKLIST.md`
- `RLS_TEST_GUIDE.md`, `ROLLBACK_PLAN.md`, `SCREEN_CONTAINER_UPDATES.md`
- `SEED_DATA_GUIDE.md`, `TESTING_CHECKLIST.md`, `TROUBLESHOOTING_PROFILE_SYNC.md`
- `debug-add-asset.md`

**Directories deleted:**
- `docs/archive/` (22 files)
- `testing_gaps/` (7 files)
- `coverage/` (generated test coverage)
- `mockups/` (design mockups)
- `design_prototype/` (UI prototypes)
- `playwright-report/` (generated test reports)

### Files Retained

Essential documentation in root and `docs/`:
- README.md, SECURITY.md, API_DOCUMENTATION.md
- CONTRIBUTING.md, DEVELOPMENT.md, PROJECT_STRUCTURE.md
- SETUP_GUIDE.md, SUPABASE_SETUP_GUIDE.md, TECH_STACK.md

---

## Potential Issues to Verify

1. **Race condition in ProfileContext**: The `fetchInProgressRef` is used to prevent concurrent fetches, but verify this pattern is correctly implemented with useRef (synchronous) rather than useState (async).

2. **Cache invalidation**: Profile changes made outside the app won't reflect for up to 5 minutes. Verify this is acceptable for the use case (role/name/avatar rarely change).

3. **sanitizeString HTML encoding**: The function encodes `&` to `&amp;`. In React Native Text components this is fine, but if content is ever used in WebView contexts, double-encoding could occur.

4. **Edge Function error handling**: Verify the client-side code properly handles Edge Function errors and falls back gracefully.

5. **Rate limiter memory**: The Edge Function rate limiter uses an in-memory Map. In serverless, this resets on cold starts. Verify this is acceptable behavior.

---

## Testing Recommendations

1. **Test label extraction**: Take a photo of an appliance label and verify extraction works through the Edge Function

2. **Test sanitization**: Create a maintenance request with `<script>alert('xss')</script>` in the description - should be encoded

3. **Test profile caching**: Monitor network requests - `getUserProfile` should only be called once on app start, not on every screen

4. **Test rate limiting**: Make 21 rapid label extraction requests - the 21st should return 429

5. **Test auth requirement**: Try calling the Edge Function without a valid JWT - should return 401

---

## Files Modified Summary

| File | Change Type |
|------|-------------|
| `supabase/functions/extract-asset-label/index.ts` | **NEW** - Edge Function |
| `src/services/ai/labelExtraction.ts` | Security: Use Edge Function |
| `src/context/ProfileContext.tsx` | **NEW** - Centralized caching |
| `src/utils/helpers.ts` | Security: Comprehensive sanitization |
| `src/utils/validation.ts` | Security: URL sanitization |
| `src/services/api/client.ts` | Security: Path/URL sanitization |
| `src/screens/tenant/ReportIssueScreen.tsx` | Security: Removed test code |
| `src/screens/tenant/PropertyInfoScreen.tsx` | Security: Removed hardcoded data |
| `src/screens/tenant/HomeScreen.tsx` | Feature: Pass property data |
| `src/navigation/MainStack.tsx` | Feature: Expanded route params |
| `App.tsx` | Feature: Added ProfileProvider |
| `src/hooks/useProfileSync.ts` | Refactor: Use ProfileContext |
| `src/context/PendingRequestsContext.tsx` | Refactor: Use ProfileContext |
| `src/context/UnreadMessagesContext.tsx` | Refactor: Use ProfileContext |
| `src/screens/tenant/PropertyCodeEntryScreen.tsx` | Refactor: Use ProfileContext |
| `src/screens/tenant/PropertyInviteAcceptScreen.tsx` | Refactor: Use ProfileContext |

---

## Deployment Notes

- Edge Function `extract-asset-label` deployed to Supabase (ACTIVE, version 1)
- `GEMINI_API_KEY` already configured in Supabase secrets
- No database migrations required
- No environment variable changes required for client

---

*Document generated: December 19, 2025*
*Commit: 3320616*
*Branch: main*
