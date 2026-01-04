// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

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
      return new Response(JSON.stringify({ error: 'Missing address or pano parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct Google Street View URL
    const location = panoId ? `pano=${panoId}` : `location=${encodeURIComponent(address!)}`;
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&${location}&key=${GOOGLE_MAPS_API_KEY}&fov=90&pitch=0&return_error_code=true`;

    console.log(`Fetching Street View: ${streetViewUrl.replace(GOOGLE_MAPS_API_KEY, 'REDACTED')}`);

    // Fetch from Google
    const response = await fetch(streetViewUrl);

    if (!response.ok) {
      console.error(`Google API error: ${response.status}`);
      return new Response(JSON.stringify({
        error: 'Failed to fetch Street View image',
        status: response.status
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('Content-Type');

    // If Google returns HTML instead of an image, it's an error
    if (contentType && contentType.includes('text/html')) {
      console.error('Google returned HTML instead of image - likely key restriction issue');
      return new Response(JSON.stringify({
        error: 'Invalid API response - key restriction issue',
        contentType
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
