import { useColorScheme } from 'react-native';

/**
 * Bảng màu tươi, thân thiện: nền trắng, nút "khối" có viền dưới đậm, màu xanh ngọc làm chủ đạo.
 * `xxxDark` là màu viền dưới (tạo cảm giác nút nổi). `xxxBg` là nền nhạt cho thông báo đúng/sai.
 */
const light = {
  bg: '#FFFFFF',
  text: '#3C3C3C',
  muted: '#8A8F98',
  card: '#FFFFFF',
  border: '#E3E5E8',
  borderDark: '#CED2D6',
  primary: '#14A38B',
  primaryDark: '#0E7C69',
  blue: '#2F8FE0',
  blueDark: '#1F6DB0',
  ok: '#3BAA3B',
  okDark: '#2B862B',
  okBg: '#DDF5D4',
  danger: '#E5484D',
  dangerDark: '#B9363A',
  dangerBg: '#FFE1E1',
  gold: '#F6B400',
  goldDark: '#C99300',
  orange: '#FF8A1F',
  locked: '#E3E5E8',
  lockedDark: '#C4C8CD',
  selectedBg: '#DDF0FC',
};
const dark: typeof light = {
  bg: '#131F24',
  text: '#EEF1F3',
  muted: '#93A0A8',
  card: '#1B2A31',
  border: '#2F3F47',
  borderDark: '#22313A',
  primary: '#2BC4A8',
  primaryDark: '#1C8F7A',
  blue: '#4BA9F0',
  blueDark: '#2F7DBA',
  ok: '#58C458',
  okDark: '#3F9A3F',
  okBg: '#1E3A24',
  danger: '#F06A6E',
  dangerDark: '#C04E52',
  dangerBg: '#3F2224',
  gold: '#FFC93C',
  goldDark: '#C99A20',
  orange: '#FF9F45',
  locked: '#37464F',
  lockedDark: '#26343C',
  selectedBg: '#1D3A4F',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Màu cho từng chặng trên lộ trình (xoay vòng). */
export const UNIT_COLORS: { main: keyof Colors; dark: keyof Colors }[] = [
  { main: 'primary', dark: 'primaryDark' },
  { main: 'blue', dark: 'blueDark' },
  { main: 'orange', dark: 'goldDark' },
  { main: 'ok', dark: 'okDark' },
];
