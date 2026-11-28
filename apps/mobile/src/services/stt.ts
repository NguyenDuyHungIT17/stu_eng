import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * Dịch vụ nhận diện giọng nói trên thiết bị (S3b-01, TK §6.2).
 * Gom toàn bộ kiểm tra khả dụng, xin quyền micro và ánh xạ lỗi để dùng chung cho
 * màn luyện nói bài học và màn hội thoại AI.
 */

export type SttErrorResult = { message: string; fallbackToTyping: boolean };

const STT_ERRORS: Record<string, SttErrorResult> = {
  'not-allowed': {
    message: 'Chưa có quyền dùng micro. Hãy cho phép trong Cài đặt của máy.',
    fallbackToTyping: true,
  },
  'service-not-allowed': {
    message: 'Máy chưa có dịch vụ nhận diện giọng nói.',
    fallbackToTyping: true,
  },
  'no-speech': {
    message: 'Không nghe thấy gì. Hãy nói to và rõ hơn nhé.',
    fallbackToTyping: false,
  },
  'speech-timeout': {
    message: 'Không nghe thấy gì. Hãy nói to và rõ hơn nhé.',
    fallbackToTyping: false,
  },
  network: {
    message: 'Cần mạng để nhận diện giọng nói trên máy này.',
    fallbackToTyping: false,
  },
  'audio-capture': {
    message: 'Không mở được micro. Kiểm tra ứng dụng khác có đang dùng micro không.',
    fallbackToTyping: true,
  },
};

export function mapSttError(code: string): SttErrorResult {
  return (
    STT_ERRORS[code] ?? {
      message: `Không nhận diện được (${code}).`,
      fallbackToTyping: false,
    }
  );
}

/** Máy có dịch vụ nhận diện giọng nói không (không chặn, không hỏi quyền). */
export function isSttAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type MicPermission = { granted: boolean; canAskAgain: boolean };

export async function getMicPermission(): Promise<MicPermission> {
  try {
    const p = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    return { granted: Boolean(p.granted), canAskAgain: p.canAskAgain !== false };
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

export async function requestMicPermission(): Promise<MicPermission> {
  try {
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return { granted: Boolean(p.granted), canAskAgain: p.canAskAgain !== false };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

export type StartSttResult = { ok: true } | { ok: false; denied: boolean; message: string };

/** Xin quyền (nếu chưa có) và bắt đầu nghe một câu tiếng Anh. */
export async function startStt(lang = 'en-US'): Promise<StartSttResult> {
  try {
    const perm = await requestMicPermission();
    if (!perm.granted) {
      return {
        ok: false,
        denied: true,
        message: STT_ERRORS['not-allowed']?.message ?? 'Chưa có quyền dùng micro.',
      };
    }
    ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, denied: false, message: `Không bật được micro: ${String(e)}` };
  }
}

export function stopStt(): void {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch {
    // đã dừng
  }
}

export function abortStt(): void {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // đã hủy
  }
}
