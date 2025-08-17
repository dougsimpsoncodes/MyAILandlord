export function webBoxShadow(level: 'default' | 'heavy' = 'default') {
  if (level === 'heavy') return '0px 4px 12px rgba(0,0,0,0.2)';
  return '0px 2px 8px rgba(0,0,0,0.1)';
}