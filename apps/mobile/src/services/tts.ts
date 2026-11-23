import * as Speech from 'expo-speech';

/**
 * Đọc tiếng Anh bằng giọng TTS của máy (offline nếu máy có giọng tải sẵn). FR-V-02.
 * Giọng và tốc độ do người dùng chọn được truyền vào; mặc định en-US, tốc độ 0.9.
 */

export type TtsOptions = { voice?: string | null; rate?: number };
export type EnglishVoice = { id: string; name: string; language: string; quality: string };

export const DEFAULT_RATE = 0.9;
export const RATES = [0.6, 0.75, 0.9, 1.0] as const;

/** Đọc `text`; dừng câu đang đọc trước đó. `onDone` gọi khi đọc xong, dừng hoặc lỗi. */
export function speak(text: string, opts: TtsOptions = {}, onDone?: () => void): void {
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    voice: opts.voice ?? undefined,
    rate: opts.rate ?? DEFAULT_RATE,
    onDone,
    onStopped: onDone,
    onError: () => onDone?.(),
  });
}

export function stop(): void {
  void Speech.stop();
}

/** Các giọng tiếng Anh có trên máy, giọng chất lượng cao lên trước. Lỗi thì trả mảng rỗng. */
export async function listEnglishVoices(): Promise<EnglishVoice[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices
      .filter((v) => v.language.toLowerCase().startsWith('en'))
      .map((v) => ({ id: v.identifier, name: v.name, language: v.language, quality: v.quality }))
      .sort((a, b) =>
        a.quality === b.quality ? a.id.localeCompare(b.id) : a.quality === 'Enhanced' ? -1 : 1,
      );
  } catch {
    return [];
  }
}

/** Máy có giọng tiếng Anh không; quá `timeoutMs` thì coi như không (không chặn giao diện). */
export async function hasEnglishVoice(timeoutMs: number): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([listEnglishVoices().then((v) => v.length > 0), timeout]);
}
