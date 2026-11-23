import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

/** Máy có dịch vụ nhận diện giọng nói không (không chặn, không hỏi quyền). */
export function isSpeechInputAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type SpeechInput = {
  listening: boolean;
  /** Chữ đang nghe được (tạm thời hoặc cuối cùng). */
  transcript: string;
  /** Kết quả cuối của lượt nói gần nhất; null khi chưa có. */
  final: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Chưa có quyền dùng micro. Hãy cho phép trong Cài đặt của máy.',
  'no-speech': 'Không nghe thấy gì. Hãy nói to và rõ hơn nhé.',
  'speech-timeout': 'Không nghe thấy gì. Hãy nói to và rõ hơn nhé.',
  network: 'Cần mạng để nhận diện giọng nói trên máy này.',
  'service-not-allowed': 'Máy chưa có dịch vụ nhận diện giọng nói.',
};

/** Nhận diện một câu nói tiếng Anh (FR-C nói). Chạy trên dịch vụ của máy. */
export function useSpeechInput(): SpeechInput {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [final, setFinal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heard = useRef('');

  useSpeechRecognitionEvent('start', () => setListening(true));
  // Có máy kết thúc mà không gửi kết quả cuối: lấy chữ tạm thời gần nhất.
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setFinal((f) => f ?? (heard.current || null));
  });
  useSpeechRecognitionEvent('result', (ev) => {
    const t = ev.results[0]?.transcript ?? '';
    heard.current = t;
    setTranscript(t);
    if (ev.isFinal) setFinal(t);
  });
  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'aborted') return;
    setError(ERRORS[ev.error] ?? `Không nhận diện được (${ev.error}).`);
    setListening(false);
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    setFinal(null);
    heard.current = '';
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError(ERRORS['not-allowed'] ?? '');
        return;
      }
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
    } catch (e) {
      setError(`Không bật được micro: ${String(e)}`);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // đã dừng
    }
  }, []);

  const reset = useCallback(() => {
    heard.current = '';
    setTranscript('');
    setFinal(null);
    setError(null);
  }, []);

  return { listening, transcript, final, error, start, stop, reset };
}
