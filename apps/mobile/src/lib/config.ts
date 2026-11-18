const DEFAULT_DEV_API = 'http://10.0.2.2:8787'; // emulator Android trỏ về máy dev

export function resolveApiBaseUrl(value: string | undefined): string {
  if (!value) return DEFAULT_DEV_API;
  try {
    new URL(value);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_BASE_URL không hợp lệ: "${value}"`);
  }
  return value.replace(/\/+$/, '');
}

/** URL gốc của backend. Đặt bằng biến môi trường EXPO_PUBLIC_API_BASE_URL lúc build. */
export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
