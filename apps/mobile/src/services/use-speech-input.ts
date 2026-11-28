import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import { isSttAvailable, mapSttError, type StartSttResult, startStt, stopStt } from './stt';

export const isSpeechInputAvailable = isSttAvailable;

export type SpeechInput = {
  listening: boolean;
  /** Chữ đang nghe được (tạm thời hoặc cuối cùng). */
  transcript: string;
  /** Kết quả cuối của lượt nói gần nhất; null khi chưa có. */
  final: string | null;
  error: string | null;
  /** True nếu lỗi do chưa có quyền micro hoặc máy không hỗ trợ dịch vụ STT. */
  denied: boolean;
  start: () => Promise<StartSttResult>;
  stop: () => void;
  reset: () => void;
};

/** Nhận diện một câu nói tiếng Anh trên thiết bị (S3b-01). */
export function useSpeechInput(): SpeechInput {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [final, setFinal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
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
    const mapped = mapSttError(ev.error);
    setError(mapped.message);
    setDenied(mapped.fallbackToTyping);
    setListening(false);
  });

  const start = useCallback(async (): Promise<StartSttResult> => {
    setError(null);
    setDenied(false);
    setTranscript('');
    setFinal(null);
    heard.current = '';
    const res = await startStt('en-US');
    if (!res.ok) {
      setError(res.message);
      setDenied(res.denied);
    }
    return res;
  }, []);

  const stop = useCallback(() => {
    stopStt();
  }, []);

  const reset = useCallback(() => {
    heard.current = '';
    setTranscript('');
    setFinal(null);
    setError(null);
    setDenied(false);
  }, []);

  return { listening, transcript, final, error, denied, start, stop, reset };
}
