// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Modern home placeholder image URL from Unsplash (free to use, hotlink allowed)
// This shows a nice modern white home instead of a generic placeholder
const PLACEHOLDER_IMAGE_URL = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=640&h=400&fit=crop&q=80';

// Fetch and return the placeholder image
async function getPlaceholderImage(): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  try {
    const response = await fetch(PLACEHOLDER_IMAGE_URL);
    if (response.ok) {
      return {
        bytes: await response.arrayBuffer(),
        contentType: response.headers.get('Content-Type') || 'image/jpeg',
      };
    }
  } catch (e) {
    console.error('Failed to fetch placeholder:', e);
  }

  // Fallback SVG if Unsplash is unavailable
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <rect fill="#E8EAED" width="640" height="400"/>
    <g fill="#9AA0A6" transform="translate(270, 150)">
      <path d="M50 10L10 40V90H40V60H60V90H90V40L50 10Z"/>
    </g>
  </svg>`;
  return {
    bytes: new TextEncoder().encode(svg),
    contentType: 'image/svg+xml',
  };
}

// This function allows public access - no authentication required
// Rate limiting is handled by the API key quota on Google's side
serve(async (req) => {
  // CORS headers - allow all origins for public image serving
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const address = url.searchParams.get('address');
    const panoId = url.searchParams.get('pano');
    const width = parseInt(url.searchParams.get('width') || '640');
    const height = parseInt(url.searchParams.get('height') || '400');

    if (!address && !panoId) {
      console.warn('Missing address or pano parameter - returning placeholder');
      const placeholder = await getPlaceholderImage();
      return new Response(placeholder.bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': placeholder.contentType,
          'Cache-Control': 'no-cache',
          'X-Street-View-Status': 'missing-params',
        },
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key not configured - returning placeholder');
      const placeholder = await getPlaceholderImage();
      return new Response(placeholder.bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': placeholder.contentType,
          'Cache-Control': 'no-cache',
          'X-Street-View-Status': 'config-error',
        },
      });
    }

    // Construct Google Street View URL
    const location = panoId ? `pano=${panoId}` : `location=${encodeURIComponent(address!)}`;
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&${location}&key=${GOOGLE_MAPS_API_KEY}&fov=90&pitch=0&return_error_code=true`;

    console.log(`Fetching Street View: ${streetViewUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED')}`);

    // Fetch from Google
    const response = await fetch(streetViewUrl);

    if (!response.ok) {
      console.error(`Google API error: ${response.status} - returning placeholder image`);
      // Return placeholder image instead of JSON error
      // This prevents OpaqueResponseBlocking in browsers
      const placeholder = await getPlaceholderImage();
      return new Response(placeholder.bytes, {
        status: 200, // Return 200 so browser treats it as success
        headers: {
          ...corsHeaders,
          'Content-Type': placeholder.contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'X-Street-View-Status': 'unavailable', // Header indicates no real image
        },
      });
    }

    const contentType = response.headers.get('Content-Type');

    // If Google returns HTML instead of an image, it's an error (key restriction)
    if (contentType && contentType.includes('text/html')) {
      console.error('Google returned HTML instead of image - likely key restriction issue - returning placeholder');
      const placeholder = await getPlaceholderImage();
      return new Response(placeholder.bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': placeholder.contentType,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour (might be temporary issue)
          'X-Street-View-Status': 'error',
        },
      });
    }

    // Stream the image bytes to client
    const imageBytes = await response.arrayBuffer();

    return new Response(imageBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800', // 7 days
      },
    });
  } catch (error) {
    console.error('Error in get-property-image function:', error);
    // Return placeholder on any error to prevent browser blocking
    const placeholder = await getPlaceholderImage();
    return new Response(placeholder.bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': placeholder.contentType,
        'Cache-Control': 'public, max-age=300', // Short cache for errors
        'X-Street-View-Status': 'error',
      },
    });
  }
});
