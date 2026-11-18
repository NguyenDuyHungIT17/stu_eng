import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  card: '#F3F4F6',
  primary: '#2563EB',
  danger: '#DC2626',
  ok: '#16A34A',
};
const dark: typeof light = {
  bg: '#0B0F19',
  text: '#F3F4F6',
  muted: '#9CA3AF',
  card: '#1F2937',
  primary: '#60A5FA',
  danger: '#F87171',
  ok: '#4ADE80',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
