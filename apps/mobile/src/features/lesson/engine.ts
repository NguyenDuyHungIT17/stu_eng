import { Rating } from '@/lib/fsrs';
import type { Line } from '../dialogue/repository';

/**
 * Bài luyện hội thoại: logic thuần (không DB, không UI) để test dễ.
 *
 * Bài học một đoạn hội thoại:
 *   1. `scene`       — đọc tình huống, ai nói với ai.
 *   2. `listen_all`  — nghe trọn đoạn hội thoại (có thể bật nghĩa tiếng Việt).
 *   3. `fill_blank`  — lần lượt từng câu then chốt: nghe câu, chọn cụm còn thiếu.
 *   4. Nhập vai: với mỗi câu then chốt của vai người học (b), chọn câu đáp đúng
 *      (`choose_reply`) hoặc ghép câu (`build_sentence`) nếu là câu mở đầu.
 *   5. Nhập vai nói (`speak_line`, khi máy nhận diện được giọng nói): đi lại cả hội thoại,
 *      người học tự nói từng câu của mình. Không chấm vào điểm, chỉ chấm độ khớp để luyện.
 * Phiên ôn: mỗi câu đến hạn 1 bài trong ngữ cảnh hội thoại, xoay vòng các kiểu.
 * Trả lời sai: bài quay lại cuối hàng (tối đa MAX_RETRIES). Mức FSRS suy từ số lần sai.
 */

export type StepKind =
  | 'scene'
  | 'listen_all'
  | 'fill_blank'
  | 'choose_reply'
  | 'build_sentence'
  | 'speak_line';

export type Step = { kind: StepKind; line: Line | null; retry: number };

export type LessonState = {
  steps: Step[];
  index: number;
  /** Số lần sai của từng câu trong phiên. */
  mistakes: Record<string, number>;
  answered: number;
  correct: number;
};

export const MAX_RETRIES = 2;
/** Câu dài hơn thì không ghép câu (quá nhiều ô chữ). */
export const MAX_BUILD_WORDS = 12;

const initial = (steps: Step[]): LessonState => ({
  steps,
  index: 0,
  mistakes: {},
  answered: 0,
  correct: 0,
});

const isKey = (l: Line) => !!l.blank;
const wordCount = (s: string) => tokenize(s).length;

/** Bài tập nhập vai cho một câu: chọn câu đáp nếu có câu trước, không thì ghép câu. */
function roleplayKind(l: Line): StepKind {
  if ((l.lineNo ?? 0) > 0) return 'choose_reply';
  return wordCount(l.text) <= MAX_BUILD_WORDS ? 'build_sentence' : 'fill_blank';
}

/** Bài học một đoạn hội thoại (các câu theo thứ tự `lineNo`). */
export function buildDialogueLesson(
  lines: Line[],
  opts: { learner?: 'a' | 'b'; canSpeak?: boolean } = {},
): LessonState {
  const learner = opts.learner ?? 'b';
  const key = lines.filter(isKey);
  const steps: Step[] = [
    { kind: 'scene', line: null, retry: 0 },
    { kind: 'listen_all', line: null, retry: 0 },
    ...key.map((line): Step => ({ kind: 'fill_blank', line, retry: 0 })),
    ...key
      .filter((l) => l.speaker === learner)
      .map((line): Step => ({ kind: roleplayKind(line), line, retry: 0 })),
    ...(opts.canSpeak
      ? lines
          .filter((l) => l.speaker === learner)
          .map((line): Step => ({ kind: 'speak_line', line, retry: 0 }))
      : []),
  ];
  return initial(steps);
}

/** Phiên ôn câu đến hạn: xoay vòng nghe-điền / chọn câu đáp / ghép câu. */
export function buildReview(due: Line[]): LessonState {
  return initial(
    due.map((line, i): Step => {
      const options: StepKind[] = ['fill_blank'];
      if ((line.lineNo ?? 0) > 0) options.push('choose_reply');
      if (wordCount(line.text) <= MAX_BUILD_WORDS) options.push('build_sentence');
      return { kind: options[i % options.length] ?? 'fill_blank', line, retry: 0 };
    }),
  );
}

export function currentStep(s: LessonState): Step | undefined {
  return s.steps[s.index];
}

export function isDone(s: LessonState): boolean {
  return s.index >= s.steps.length;
}

/** Tiến độ 0..1. */
export function progress(s: LessonState): number {
  return s.steps.length === 0 ? 1 : Math.min(1, s.index / s.steps.length);
}

/** Bước không chấm điểm (tình huống, nghe trọn bài, luyện nói): chỉ đi tiếp. */
export function advance(s: LessonState): LessonState {
  return { ...s, index: s.index + 1 };
}

/** Ghi nhận câu trả lời cho bước hiện tại. Sai thì bài quay lại cuối hàng. */
export function answer(s: LessonState, correct: boolean): LessonState {
  const step = currentStep(s);
  if (!step?.line) return s;
  const id = step.line.id;
  let steps = s.steps;
  if (!correct && step.retry < MAX_RETRIES) {
    // Làm lại trước vòng nhập vai nói (nói là phần cuối, sau khi đã luyện đủ).
    const retry = { ...step, retry: step.retry + 1 };
    const speakAt = s.steps.findIndex((x, i) => i > s.index && x.kind === 'speak_line');
    steps =
      speakAt < 0
        ? [...s.steps, retry]
        : [...s.steps.slice(0, speakAt), retry, ...s.steps.slice(speakAt)];
  }
  return {
    steps,
    index: s.index + 1,
    mistakes: correct ? s.mistakes : { ...s.mistakes, [id]: (s.mistakes[id] ?? 0) + 1 },
    answered: s.answered + 1,
    correct: s.correct + (correct ? 1 : 0),
  };
}

/**
 * Id câu vừa xong bước cuối của nó trong phiên — lúc này mới ghi vào FSRS,
 * nên thoát giữa chừng vẫn giữ các câu đã xong.
 */
export function finishedLineAt(s: LessonState, index: number): string | null {
  const id = s.steps[index]?.line?.id;
  if (!id) return null;
  return s.steps.slice(index + 1).some((x) => x.line?.id === id) ? null : id;
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

// ---- Nghe-điền ----

/** Tách câu quanh cụm then chốt: `before` + [chỗ trống] + `after`. */
export function splitBlank(text: string, blank: string): { before: string; after: string } {
  const i = text.indexOf(blank);
  if (i < 0) return { before: text, after: '' };
  return { before: text.slice(0, i), after: text.slice(i + blank.length) };
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

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
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
