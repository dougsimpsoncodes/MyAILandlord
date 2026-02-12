import { Platform } from 'react-native';

export function buildInviteUrl(token: string): string {
  if (Platform.OS === 'web') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    return `${origin}/invite?t=${token}`;
  }

  return `myailandlord:///invite?t=${token}`;
}
