import { createContext, createElement, type ReactNode, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeMode } from '@/db/settings';

/**
 * Giao diện kiểu ứng dụng nhắn tin: nền xám rất nhạt, thẻ trắng đổ bóng nhẹ, màu chàm
 * (indigo) làm chủ đạo, san hô làm điểm nhấn. Hỗ trợ chuyển Sáng / Tối / Theo máy (S4-07, S4-10).
 */
const light = {
  bg: '#F4F5F9',
  surface: '#FFFFFF',
  text: '#1E2230',
  muted: '#6B7183',
  border: '#E3E6EE',
  primary: '#4B4FD6',
  primarySoft: '#ECEDFC',
  accent: '#F2705E',
  accentSoft: '#FDEDEA',
  ok: '#14975A',
  okSoft: '#E2F5EA',
  danger: '#D9474B',
  dangerSoft: '#FCEBEB',
  gold: '#E09A0B',
  /** Bong bóng của người kia (bên trái) và của bạn (bên phải). */
  bubbleOther: '#FFFFFF',
  bubbleMe: '#4B4FD6',
  onPrimary: '#FFFFFF',
  shadow: '#1E2230',
};
const dark: typeof light = {
  bg: '#12141C',
  surface: '#1C1F2B',
  text: '#ECEEF5',
  muted: '#9AA0B4',
  border: '#2C3042',
  primary: '#8487F2',
  primarySoft: '#262A4A',
  accent: '#F58C7C',
  accentSoft: '#3A2522',
  ok: '#4CC98A',
  okSoft: '#183428',
  danger: '#F07174',
  dangerSoft: '#3A1F22',
  gold: '#F2B43C',
  bubbleOther: '#232737',
  bubbleMe: '#5A5EE0',
  onPrimary: '#FFFFFF',
  shadow: '#000000',
};

export type Colors = typeof light;

type ThemeCtx = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
};

const ThemePreferenceContext = createContext<ThemeCtx | null>(null);

export function ThemePreferenceProvider({
  initialMode,
  onChangeMode,
  children,
}: {
  initialMode: ThemeMode;
  onChangeMode?: (mode: ThemeMode) => void;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const resolved: 'light' | 'dark' =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    onChangeMode?.(next);
  };

  return createElement(
    ThemePreferenceContext.Provider,
    { value: { mode, resolved, setMode } },
    children,
  );
}

export function useThemePreference(): {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
} {
  const ctx = useContext(ThemePreferenceContext);
  const system = useColorScheme();
  if (ctx) return ctx;
  return {
    mode: 'system',
    resolved: system === 'dark' ? 'dark' : 'light',
    setMode: () => undefined,
  };
}

export function useColors(): Colors {
  const { resolved } = useThemePreference();
  return resolved === 'dark' ? dark : light;
}

/** Bóng đổ nhẹ cho thẻ. */
export const cardShadow = (c: Colors) => ({
  shadowColor: c.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
});
