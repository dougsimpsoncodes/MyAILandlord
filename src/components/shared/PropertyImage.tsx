import React, { useState } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import log from '../../lib/log';

const SUPABASE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

interface PropertyImageProps {
  address: string;
  width?: number | '100%';
  height?: number;
  style?: object;
  borderRadius?: number;
  /** Request higher resolution image from Google API (up to 640x640) */
  apiSize?: number;
}

/**
 * Displays a Google Street View image of a property based on its address.
 * Falls back to a placeholder icon if the image fails to load.
 *
 * For full-width images, pass width="100%" and the component will
 * request an appropriately sized image from the API.
 */
export const PropertyImage: React.FC<PropertyImageProps> = ({
  address,
  width = 400,
  height = 200,
  style,
  borderRadius = 12,
  apiSize,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Reset error state when address changes
  React.useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [address]);

  // Determine the API request size (Google allows up to 640x640 for free tier)
  const requestWidth = apiSize || (width === '100%' ? Math.min(screenWidth * 2, 640) : Math.min(width as number * 2, 640));
  const requestHeight = Math.min(height * 2, 640);

  // Use Supabase Edge Function proxy to fetch Street View images
  // This avoids API key restrictions and provides better caching
  const getPropertyImageUrl = () => {
    if (!address || !SUPABASE_FUNCTIONS_URL) return null;

    const encodedAddress = encodeURIComponent(address);
    return `${SUPABASE_FUNCTIONS_URL}/get-property-image?address=${encodedAddress}&width=${Math.round(requestWidth)}&height=${requestHeight}`;
  };

  const imageUrl = getPropertyImageUrl();

  // Debug logging
  log.info('[PropertyImage] Using proxy:', {
    address,
    hasFunctionsUrl: !!SUPABASE_FUNCTIONS_URL,
    imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : null,
    isLoading,
    hasError
  });

  // Determine container and image styles
  const isFullWidth = width === '100%';
  const containerStyle = isFullWidth
    ? { width: '100%' as const, height, borderRadius, overflow: 'hidden' as const }
    : { width: width as number, height, borderRadius, overflow: 'hidden' as const };

  const imageStyle = isFullWidth
    ? { width: '100%' as const, height }
    : { width: width as number, height };

  // If no address or functions URL, show placeholder
  if (!imageUrl) {
    log.warn('[PropertyImage] No image URL - showing placeholder', { address, hasFunctionsUrl: !!SUPABASE_FUNCTIONS_URL });
    return (
      <View style={[styles.placeholder, containerStyle, style]}>
        <Ionicons name="home-outline" size={48} color="#BDC3C7" />
      </View>
    );
  }

  // If image failed to load, show placeholder
  if (hasError) {
    return (
      <View style={[styles.placeholder, containerStyle, style]}>
        <Ionicons name="image-outline" size={48} color="#BDC3C7" />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {isLoading && (
        <View style={[styles.loadingOverlay, { height }]}>
          <ActivityIndicator size="small" color="#3498DB" />
        </View>
      )}
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, imageStyle]}
        onLoad={() => {
          log.info('[PropertyImage] Image loaded successfully', { address });
          setIsLoading(false);
        }}
        onError={(error) => {
          log.error('[PropertyImage] Image failed to load', { address, error });
          setIsLoading(false);
          setHasError(true);
        }}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#F1F2F6',
  },
  placeholder: {
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

export default PropertyImage;
