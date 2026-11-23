import { useColorScheme } from 'react-native';

/**
 * Giao diện kiểu ứng dụng nhắn tin: nền xám rất nhạt, thẻ trắng đổ bóng nhẹ, màu chàm
 * (indigo) làm chủ đạo, san hô làm điểm nhấn. Không dùng nút "khối" hay chữ in hoa.
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

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Bóng đổ nhẹ cho thẻ. */
export const cardShadow = (c: Colors) => ({
  shadowColor: c.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
});
