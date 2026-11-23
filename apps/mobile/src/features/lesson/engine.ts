import { Rating } from '@/lib/fsrs';
import type { Phrase } from '../review/repository';

/**
 * Bài học / phiên ôn kiểu từng bước: logic thuần (không DB, không UI) để test dễ.
 * - Bài học mới: mỗi cụm có 1 bước giới thiệu + 1 bài chọn nghĩa ngay sau, cuối bài thêm
 *   một vòng luyện trộn (ghép câu hoặc nghe chọn).
 * - Phiên ôn: mỗi thẻ đến hạn 1 bài, xoay vòng các kiểu.
 * - Trả lời sai: bài đó quay lại cuối hàng (tối đa MAX_RETRIES lần mỗi cụm).
 * - Mức chấm FSRS tự suy ra từ số lần sai, người học không phải tự chấm.
 */

export type StepKind =
  | 'intro'
  | 'choose_meaning'
  | 'choose_text'
  | 'listen_choose'
  | 'build_sentence';

export type Step = { kind: StepKind; phrase: Phrase; retry: number };

export type LessonState = {
  steps: Step[];
  index: number;
  /** Số lần sai của từng cụm trong phiên. */
  mistakes: Record<string, number>;
  answered: number;
  correct: number;
};

export const MAX_RETRIES = 2;

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

const initial = (steps: Step[]): LessonState => ({
  steps,
  index: 0,
  mistakes: {},
  answered: 0,
  correct: 0,
});

/** Bài học cụm mới. `canListen`: máy có giọng tiếng Anh. */
export function buildLesson(
  phrases: Phrase[],
  opts: { canListen: boolean; rng?: () => number },
): LessonState {
  const rng = opts.rng ?? Math.random;
  const steps: Step[] = [];
  for (const phrase of phrases) {
    steps.push({ kind: 'intro', phrase, retry: 0 });
    if (phrases.length > 1) steps.push({ kind: 'choose_meaning', phrase, retry: 0 });
  }
  const finale = shuffled(phrases, rng).map((phrase, i): Step => {
    const kind: StepKind = opts.canListen && i % 2 === 1 ? 'listen_choose' : 'build_sentence';
    return { kind, phrase, retry: 0 };
  });
  return initial([...steps, ...finale]);
}

const REVIEW_KINDS: StepKind[] = [
  'build_sentence',
  'choose_meaning',
  'listen_choose',
  'choose_text',
];

/** Phiên ôn thẻ đến hạn. Trắc nghiệm cần ít nhất 2 cụm trong kho để có đáp án nhiễu. */
export function buildReview(
  due: Phrase[],
  opts: { canListen: boolean; poolSize: number },
): LessonState {
  const kinds = REVIEW_KINDS.filter((k) => {
    if (k === 'listen_choose' && !opts.canListen) return false;
    if (k !== 'build_sentence' && opts.poolSize < 2) return false;
    return true;
  });
  return initial(
    due.map((phrase, i) => ({
      kind: kinds[i % kinds.length] ?? 'build_sentence',
      phrase,
      retry: 0,
    })),
  );
}

export function currentStep(s: LessonState): Step | undefined {
  return s.steps[s.index];
}

export function isDone(s: LessonState): boolean {
  return s.index >= s.steps.length;
}

/** Tiến độ 0..1 cho thanh trên cùng. */
export function progress(s: LessonState): number {
  return s.steps.length === 0 ? 1 : Math.min(1, s.index / s.steps.length);
}

/** Bước giới thiệu: chỉ đi tiếp. */
export function advance(s: LessonState): LessonState {
  return { ...s, index: s.index + 1 };
}

/** Ghi nhận câu trả lời cho bước hiện tại. Sai thì bài quay lại cuối hàng. */
export function answer(s: LessonState, correct: boolean): LessonState {
  const step = currentStep(s);
  if (!step) return s;
  const id = step.phrase.id;
  const steps =
    !correct && step.retry < MAX_RETRIES
      ? [...s.steps, { ...step, retry: step.retry + 1 }]
      : s.steps;
  return {
    steps,
    index: s.index + 1,
    mistakes: correct ? s.mistakes : { ...s.mistakes, [id]: (s.mistakes[id] ?? 0) + 1 },
    answered: s.answered + 1,
    correct: s.correct + (correct ? 1 : 0),
  };
}

/**
 * Cụm vừa xong hết các bước trong phiên (không còn bước nào phía sau) — lúc này mới
 * ghi kết quả vào DB, nên thoát giữa chừng vẫn giữ được các cụm đã xong.
 */
export function finishedPhraseAt(s: LessonState, index: number): string | null {
  const step = s.steps[index];
  if (!step) return null;
  const later = s.steps.slice(index + 1).some((x) => x.phrase.id === step.phrase.id);
  return later ? null : step.phrase.id;
}

/** Mức chấm từ số lần sai: 0 → Được, 1 → Khó, ≥2 → Quên. */
export function ratingFor(mistakes: number): Rating {
  if (mistakes === 0) return Rating.Good;
  if (mistakes === 1) return Rating.Hard;
  return Rating.Again;
}

export function accuracy(s: LessonState): number {
  return s.answered === 0 ? 1 : s.correct / s.answered;
}

// ---- Ghép câu ----

/** Tách câu thành các ô chữ (giữ dấu câu dính với từ). */
export function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** So sánh câu ghép với đáp án: bỏ qua hoa/thường, dấu câu và kiểu dấu nháy. */
export function sameSentence(a: string[], b: string[]): boolean {
  const norm = (w: string[]) =>
    w
      .join(' ')
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[.,!?;:"“”—–-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return norm(a) === norm(b);
}

/** Ô chữ cho bài ghép câu: chữ của câu + vài chữ nhiễu không có trong câu, đã trộn. */
export function buildTiles(
  text: string,
  distractorTexts: string[],
  rng: () => number = Math.random,
  extra = 3,
): string[] {
  const words = tokenize(text);
  const own = new Set(words.map((w) => w.toLowerCase()));
  const pool = shuffled(
    [...new Set(distractorTexts.flatMap(tokenize))].filter((w) => !own.has(w.toLowerCase())),
    rng,
  );
  return shuffled([...words, ...pool.slice(0, extra)], rng);
}
