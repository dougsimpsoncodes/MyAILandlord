import { Platform } from 'react-native';

export function buildInviteUrl(token: string, propertyId?: string): string {
  const tokenParam = `t=${encodeURIComponent(token)}`;
  const propertyParam = propertyId ? `&property=${encodeURIComponent(propertyId)}` : '';

  if (Platform.OS === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    return `${origin}/invite?${tokenParam}${propertyParam}`;
  }

  return `myailandlord:///invite?${tokenParam}${propertyParam}`;
}
