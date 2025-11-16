## [SEVERITY: CRITICAL] Edge Function Does Not Validate JWT

**File**: `supabase/functions/analyze-maintenance-request/index.ts`
**Issue**: The edge function does not validate the JWT. It only checks that the `Authorization` header is present and that it starts with "Bearer ". It then passes the token to the Supabase client, but it doesn't actually validate the token's signature or claims.
**Impact**: This means that anyone with a validly formatted but otherwise invalid JWT could call this function.
**Reproduction**: N/A
**Fix**: The edge function should be modified to validate the JWT. This can be done by using a library like `jsonwebtoken` to verify the token's signature and claims.

**Code Example**:
```typescript
// The current implementation does not validate the JWT
const authHeader = req.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// The corrected implementation should validate the JWT
import { verify } from 'https://deno.land/x/djwt@v2.2.2/mod.ts'

const authHeader = req.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const token = authHeader.replace('Bearer ', '')

try {
  const publicKey = Deno.env.get('CLERK_JWT_PUBLIC_KEY')!
  const decoded = await verify(token, publicKey, 'RS256')
} catch (error) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
```
