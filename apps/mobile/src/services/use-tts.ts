import { useEffect, useMemo } from 'react';
import { useDb } from '@/db/client';
import { getTtsPrefs } from '@/db/settings';
import { speak, stop } from './tts';

/** Hàm đọc tiếng Anh theo giọng/tốc độ người dùng đã chọn; tự dừng khi rời màn hình. */
export function useTts() {
  const db = useDb();
  const prefs = useMemo(() => getTtsPrefs(db), [db]);
  useEffect(() => () => stop(), []);
  return useMemo(
    () => ({
      speak: (text: string, opts?: { slow?: boolean }, onDone?: () => void) =>
        speak(text, { voice: prefs.voice, rate: opts?.slow ? 0.6 : prefs.rate }, onDone),
      stop,
    }),
    [prefs],
  );
}
