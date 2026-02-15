// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type PlaceSuggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PlacesAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

type PlacesDetailsResponse = {
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
};

type GeocodeResponse = {
  status: string;
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  }>;
  error_message?: string;
};

const getAddressComponent = (
  components:
    | Array<{ longText?: string; shortText?: string; types?: string[] }>
    | Array<{ long_name?: string; short_name?: string; types?: string[] }>
    | undefined,
  type: string
) => {
  if (!components) return undefined;
  return components.find((component) => (component.types || []).includes(type));
};

const fromGoogleComponents = (
  components:
    | Array<{ longText?: string; shortText?: string; types?: string[] }>
    | Array<{ long_name?: string; short_name?: string; types?: string[] }>
) => {
  const streetNumber =
    getAddressComponent(components, 'street_number')?.longText ||
    getAddressComponent(components, 'street_number')?.long_name ||
    '';
  const route = getAddressComponent(components, 'route')?.longText || getAddressComponent(components, 'route')?.long_name || '';

  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim();

  const city =
    getAddressComponent(components, 'locality')?.longText ||
    getAddressComponent(components, 'locality')?.long_name ||
    getAddressComponent(components, 'postal_town')?.longText ||
    getAddressComponent(components, 'postal_town')?.long_name ||
    getAddressComponent(components, 'administrative_area_level_2')?.longText ||
    getAddressComponent(components, 'administrative_area_level_2')?.long_name ||
    '';

  const state =
    getAddressComponent(components, 'administrative_area_level_1')?.shortText ||
    getAddressComponent(components, 'administrative_area_level_1')?.short_name ||
    '';

  const postalCode =
    getAddressComponent(components, 'postal_code')?.longText ||
    getAddressComponent(components, 'postal_code')?.long_name ||
    '';

  const country =
    getAddressComponent(components, 'country')?.shortText ||
    getAddressComponent(components, 'country')?.short_name ||
    'US';

  return { line1, city, state, postalCode, country };
};

const resolvePlace = async (
  placeId: string,
  primaryText: string,
  secondaryText: string
): Promise<PlaceSuggestion | null> => {
  const detailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

  const detailsResp = await fetch(detailsUrl, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': 'addressComponents',
    },
  });

  if (!detailsResp.ok) {
    return null;
  }

  const detailsPayload = (await detailsResp.json()) as PlacesDetailsResponse;
  const parts = fromGoogleComponents(detailsPayload.addressComponents || []);

  return {
    id: placeId,
    primaryText,
    secondaryText: secondaryText || [parts.city, parts.state, parts.postalCode].filter(Boolean).join(', '),
    line1: parts.line1 || primaryText,
    city: parts.city,
    state: parts.state,
    postalCode: parts.postalCode,
    country: parts.country,
  };
};

const fetchPlacesSuggestions = async (query: string): Promise<PlaceSuggestion[]> => {
  const autocompleteResp = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text',
    },
    body: JSON.stringify({
      input: query,
      languageCode: 'en',
      regionCode: 'US',
      includedRegionCodes: ['US'],
    }),
  });

  if (!autocompleteResp.ok) {
    const failure = await autocompleteResp.text();
    throw new Error(`Places autocomplete failed: ${failure}`);
  }

  const autocompletePayload = (await autocompleteResp.json()) as PlacesAutocompleteResponse;

  const rawSuggestions = (autocompletePayload.suggestions || [])
    .map((item) => item.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> => !!prediction)
    .slice(0, 5);

  if (rawSuggestions.length === 0) {
    return [];
  }

  const resolved = await Promise.all(
    rawSuggestions.map((prediction) => {
      const placeId = prediction.placeId || '';
      const primaryText =
        prediction.structuredFormat?.mainText?.text || prediction.text?.text || 'Unknown address';
      const secondaryText = prediction.structuredFormat?.secondaryText?.text || '';
      if (!placeId) return Promise.resolve<PlaceSuggestion | null>(null);
      return resolvePlace(placeId, primaryText, secondaryText);
    })
  );

  return resolved.filter((item): item is PlaceSuggestion => !!item);
};

const fetchGeocodeSuggestions = async (query: string): Promise<PlaceSuggestion[]> => {
  const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  geocodeUrl.searchParams.set('address', query);
  geocodeUrl.searchParams.set('components', 'country:US');
  geocodeUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY!);

  const geocodeResp = await fetch(geocodeUrl.toString());
  if (!geocodeResp.ok) {
    throw new Error(`Geocoding failed HTTP ${geocodeResp.status}`);
  }

  const payload = (await geocodeResp.json()) as GeocodeResponse;
  if (payload.status === 'ZERO_RESULTS') return [];
  if (payload.status !== 'OK') {
    throw new Error(payload.error_message || `Geocoding status ${payload.status}`);
  }

  return (payload.results || []).slice(0, 5).map((result, index) => {
    const parts = fromGoogleComponents(result.address_components || []);
    const line1 = parts.line1 || (result.formatted_address || '').split(',')[0].trim();
    const primaryText = line1 || result.formatted_address || 'Unknown address';
    const secondaryText = [parts.city, parts.state, parts.postalCode].filter(Boolean).join(', ');

    return {
      id: result.place_id || `geocode-${index}`,
      primaryText,
      secondaryText,
      line1: line1 || primaryText,
      city: parts.city,
      state: parts.state,
      postalCode: parts.postalCode,
      country: parts.country,
    };
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reqUrl = new URL(req.url);
    const query = reqUrl.searchParams.get('q')?.trim() || '';

    if (query.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let suggestions: PlaceSuggestion[] = [];
    let placesError = '';

    try {
      suggestions = await fetchPlacesSuggestions(query);
    } catch (error) {
      placesError = error instanceof Error ? error.message : 'Places autocomplete failed';
    }

    if (suggestions.length === 0) {
      suggestions = await fetchGeocodeSuggestions(query);
    }

    return new Response(
      JSON.stringify({
        suggestions,
        ...(placesError ? { debug_fallback: 'geocode', places_error: placesError } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
