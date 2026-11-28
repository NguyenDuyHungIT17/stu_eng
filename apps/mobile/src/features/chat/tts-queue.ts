/**
 * Hàng đợi đọc từng câu bằng TTS khi AI đang stream (S3b-05, TK §6.2).
 * Dùng bộ đếm `gen` để bỏ qua callback `onDone`/`onStopped` cũ sau khi gọi `stop()`.
 */

export type TtsQueueDeps = {
  speak: (text: string, onDone: () => void) => void;
  stop: () => void;
  onActiveChange?: (active: boolean) => void;
};

export type TtsQueue = {
  enqueue: (sentence: string) => void;
  stop: () => void;
  isActive: () => boolean;
  pendingCount: () => number;
};

export function createTtsQueue(deps: TtsQueueDeps): TtsQueue {
  const queue: string[] = [];
  let speaking = false;
  let gen = 0;

  const setSpeaking = (next: boolean) => {
    if (speaking === next) return;
    speaking = next;
    deps.onActiveChange?.(next);
  };

  const playNext = (expectedGen: number) => {
    if (expectedGen !== gen) return;
    const next = queue.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    deps.speak(next, () => {
      if (expectedGen !== gen) return;
      playNext(expectedGen);
    });
  };

  return {
    enqueue(sentence: string) {
      const clean = sentence.trim();
      if (!clean) return;
      queue.push(clean);
      if (!speaking) playNext(gen);
    },
    stop() {
      gen++;
      queue.length = 0;
      setSpeaking(false);
      deps.stop();
    },
    isActive: () => speaking,
    pendingCount: () => queue.length,
  };
}
