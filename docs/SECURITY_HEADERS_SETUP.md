# Security Headers Configuration

Configure HTTP security headers for web platform to protect against common attacks.

## Why Security Headers?

Security headers protect against:
- **XSS (Cross-Site Scripting)**: Prevent injection of malicious scripts
- **Clickjacking**: Prevent UI redress attacks
- **MIME Sniffing**: Prevent browser from executing files as wrong type
- **MITM Attacks**: Force HTTPS connections
- **Data Leakage**: Control what information is sent to third parties

## Headers to Configure

### 1. Content Security Policy (CSP)

**Purpose**: Define allowed sources for scripts, styles, images, etc.

**Configuration**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.clerk.com https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co https://img.clerk.com;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://api.clerk.com https://clerk.*.clerk.accounts.dev;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

**Explanation**:
- `default-src 'self'`: Only load resources from same origin by default
- `script-src`: Allow scripts from Clerk and Analytics
- `style-src 'unsafe-inline'`: Allow inline styles (required for React Native Web)
- `img-src`: Allow images from Supabase storage and Clerk
- `connect-src`: Allow API calls to Supabase and Clerk
- `frame-ancestors 'none'`: Prevent clickjacking
- `base-uri 'self'`: Prevent base tag injection
- `form-action 'self'`: Only submit forms to same origin

### 2. HTTP Strict Transport Security (HSTS)

**Purpose**: Force HTTPS connections, prevent downgrade attacks

**Configuration**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Explanation**:
- `max-age=31536000`: Remember for 1 year
- `includeSubDomains`: Apply to all subdomains
- `preload`: Eligible for browser preload list

### 3. X-Frame-Options

**Purpose**: Prevent clickjacking attacks

**Configuration**:
```
X-Frame-Options: DENY
```

**Options**:
- `DENY`: Never allow framing
- `SAMEORIGIN`: Allow framing from same origin only

### 4. X-Content-Type-Options

**Purpose**: Prevent MIME sniffing

**Configuration**:
```
X-Content-Type-Options: nosniff
```

### 5. X-XSS-Protection

**Purpose**: Enable browser XSS filter (legacy but harmless)

**Configuration**:
```
X-XSS-Protection: 1; mode=block
```

### 6. Referrer-Policy

**Purpose**: Control what information is sent in Referer header

**Configuration**:
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Explanation**:
- Send full URL to same origin
- Send only origin to other HTTPS sites
- Send nothing to HTTP sites

### 7. Permissions-Policy

**Purpose**: Control which browser features can be used

**Configuration**:
```
Permissions-Policy:
  camera=(self),
  microphone=(self),
  geolocation=(self),
  payment=(),
  usb=()
```

**Explanation**:
- `camera=(self)`: Only allow camera from same origin
- `microphone=(self)`: Only allow microphone from same origin
- `geolocation=(self)`: Only allow geolocation from same origin
- `payment=()`: Disable payment API
- `usb=()`: Disable USB API

## Implementation

### For Expo Web

Create `web/headers.js`:

```javascript
module.exports = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' https://cdn.clerk.com https://www.google-analytics.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://*.supabase.co https://img.clerk.com",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://api.clerk.com https://clerk.*.clerk.accounts.dev",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()',
        },
      ],
    },
  ],
};
```

### For Netlify

Create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://cdn.clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.clerk.com; frame-ancestors 'none'"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()"
```

### For Vercel

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://cdn.clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.clerk.com; frame-ancestors 'none'"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()"
        }
      ]
    }
  ]
}
```

### For Supabase Edge Functions

Add headers to function responses:

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
});
```

## Testing Security Headers

### Online Tools

1. **Security Headers**: https://securityheaders.com
   - Enter your domain
   - Get grade A+ target
   - Shows missing/incorrect headers

2. **Mozilla Observatory**: https://observatory.mozilla.org
   - Comprehensive security scan
   - Detailed recommendations

3. **CSP Evaluator**: https://csp-evaluator.withgoogle.com
   - Test CSP policy
   - Find bypass vulnerabilities

### Manual Testing

Use browser DevTools:

```javascript
// In browser console
fetch('https://your-domain.com')
  .then(r => {
    console.log('CSP:', r.headers.get('Content-Security-Policy'));
    console.log('HSTS:', r.headers.get('Strict-Transport-Security'));
    console.log('X-Frame-Options:', r.headers.get('X-Frame-Options'));
  });
```

### Automated Testing

Add to CI/CD:

```bash
# Install testssl.sh
git clone https://github.com/drwetter/testssl.sh.git

# Test headers
./testssl.sh/testssl.sh --headers https://your-domain.com
```

## Common CSP Violations

### Issue: Inline Scripts Blocked

**Error**: `Refused to execute inline script because it violates CSP`

**Solution**: Use nonces or move scripts to external files

```html
<!-- Bad -->
<script>
  console.log('Hello');
</script>

<!-- Good -->
<script src="/scripts/hello.js"></script>
```

### Issue: Third-Party Scripts Blocked

**Error**: `Refused to load script from 'https://example.com/script.js'`

**Solution**: Add domain to `script-src`

```
script-src 'self' https://example.com
```

### Issue: Inline Styles Blocked

**Error**: `Refused to apply inline style because it violates CSP`

**Solution**: Use external stylesheets or allow `'unsafe-inline'`

```
style-src 'self' 'unsafe-inline'
```

## Security Headers Checklist

- [ ] CSP configured with strict policy
- [ ] HSTS enabled with 1-year max-age
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] X-XSS-Protection enabled
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy restricts unnecessary features
- [ ] Tested with securityheaders.com (Grade A+)
- [ ] Tested with Mozilla Observatory (90+ score)
- [ ] CSP violations logged to Sentry

## Reporting CSP Violations

Configure CSP violation reporting:

```
Content-Security-Policy:
  default-src 'self';
  report-uri https://your-domain.com/csp-violation-report
```

Create reporting endpoint:

```typescript
// Supabase Edge Function
Deno.serve(async (req) => {
  const report = await req.json();

  // Log to Sentry
  console.error('CSP Violation:', report);

  // Store in database for analysis
  await supabase
    .from('csp_violations')
    .insert({
      document_uri: report['document-uri'],
      violated_directive: report['violated-directive'],
      blocked_uri: report['blocked-uri'],
      source_file: report['source-file'],
    });

  return new Response('OK', { status: 200 });
});
```

## Production Checklist

- [ ] All security headers configured
- [ ] CSP allows only required domains
- [ ] HSTS preload submitted to browsers
- [ ] Headers tested on staging
- [ ] CSP violations monitored
- [ ] No console errors on production site
- [ ] Mobile app (React Native) not affected by web headers

## Resources

- OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
- MDN CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Security Headers Tool: https://securityheaders.com
- CSP Generator: https://report-uri.com/home/generate
