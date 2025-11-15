/**
 * Security Headers Configuration for Web Platform
 *
 * Protects against XSS, clickjacking, MIME sniffing, and other attacks
 * Apply these headers to all web routes
 */

module.exports = {
  headers: [
    {
      source: '/(.*)',
      headers: [
        // Content Security Policy - Define allowed sources
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' https://cdn.clerk.com https://www.google-analytics.com 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://*.supabase.co https://img.clerk.com blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://api.clerk.com https://clerk.*.clerk.accounts.dev wss://*.supabase.co",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
          ].join('; '),
        },

        // HTTP Strict Transport Security - Force HTTPS
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },

        // Prevent clickjacking
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },

        // Prevent MIME sniffing
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },

        // Enable browser XSS protection
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },

        // Control referrer information
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },

        // Restrict browser features
        {
          key: 'Permissions-Policy',
          value: [
            'camera=(self)',
            'microphone=(self)',
            'geolocation=(self)',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()',
          ].join(', '),
        },

        // Prevent browser from caching sensitive data
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },

        // Remove server information disclosure
        {
          key: 'X-Powered-By',
          value: '',
        },
      ],
    },

    // Static assets can be cached aggressively
    {
      source: '/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },

    // Service worker should not be cached
    {
      source: '/service-worker.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
        },
      ],
    },
  ],
};
