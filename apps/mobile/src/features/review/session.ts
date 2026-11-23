import type { Rating } from '@/lib/fsrs';
import type { ExerciseType, Phrase } from './repository';

/**
 * Phiên học/ôn: logic thuần (không DB, không UI) để test dễ. Xem TK §6.1, FR-V-03, FR-V-04a.
 * - Thẻ đến hạn trước, cụm mới sau.
 * - Cụm mới gặp lần đầu: lật thẻ (để làm quen). Thẻ ôn: xoay vòng 3 kiểu bài tập.
 * - Chấm "Quên": đưa thẻ về cuối hàng đợi một lần nữa trong phiên (tối đa MAX_REPEATS lần).
 */

export type SessionItem = {
  phrase: Phrase;
  isNew: boolean;
  exercise: ExerciseType;
  /** Số lần đã quay lại trong phiên vì chấm "Quên". */
  repeats: number;
};

export type SessionState = {
  queue: SessionItem[];
  done: number;
  /** Số lượt theo từng mức chấm, cho màn kết thúc phiên. */
  ratings: Record<Rating, number>;
  newLearned: number;
};

export const MAX_REPEATS = 2;
const REVIEW_EXERCISES: ExerciseType[] = ['choose_meaning', 'listen_choose', 'flip'];

export function buildSession(
  due: Phrase[],
  fresh: Phrase[],
  opts: { canListen: boolean; minChoices?: number; poolSize: number },
): SessionState {
  const allowed = REVIEW_EXERCISES.filter((e) => {
    if (e === 'listen_choose' && !opts.canListen) return false;
    // Trắc nghiệm cần ít nhất 1 đáp án nhiễu.
    if (e !== 'flip' && opts.poolSize < (opts.minChoices ?? 2)) return false;
    return true;
  });
  const queue: SessionItem[] = [
    ...due.map((phrase, i) => ({
      phrase,
      isNew: false,
      exercise: allowed[i % allowed.length] ?? 'flip',
      repeats: 0,
    })),
    ...fresh.map((phrase) => ({ phrase, isNew: true, exercise: 'flip' as const, repeats: 0 })),
  ];
  return { queue, done: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0 }, newLearned: 0 };
}

export function currentItem(s: SessionState): SessionItem | undefined {
  return s.queue[0];
}

export function isFinished(s: SessionState): boolean {
  return s.queue.length === 0;
}

/** Áp dụng kết quả chấm cho thẻ hiện tại, trả trạng thái mới. */
export function applyRating(s: SessionState, rating: Rating): SessionState {
  const [head, ...rest] = s.queue;
  if (!head) return s;
  const queue =
    rating === 1 && head.repeats < MAX_REPEATS
      ? [...rest, { ...head, isNew: false, exercise: 'flip' as const, repeats: head.repeats + 1 }]
      : rest;
  return {
    queue,
    done: s.done + 1,
    ratings: { ...s.ratings, [rating]: s.ratings[rating] + 1 },
    newLearned: s.newLearned + (head.isNew ? 1 : 0),
  };
}

/** Mức chấm mặc định cho bài trắc nghiệm: đúng → Được, sai → Quên (người học được sửa). */
export function defaultRatingForChoice(correct: boolean): Rating {
  return correct ? 3 : 1;
}
