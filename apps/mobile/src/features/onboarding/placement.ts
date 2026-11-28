import { LEVELS, type Level, type PlacementQuestion } from '@app/shared';

/**
 * Thuật toán xếp trình độ thích ứng (FR-P-01a, TK §6.4):
 * - Người học chọn mức tự đánh giá ban đầu (A1–B2).
 * - Làm 12 câu (4 cụm × 3 câu):
 *   + Đúng 3/3 → tăng 1 bậc (tối đa B2).
 *   + Đúng 0–1/3 → hạ 1 bậc (tối thiểu A1).
 *   + Đúng 2/3 → giữ nguyên bậc.
 */

export const PLACEMENT_TOTAL = 12;
export const BLOCK_SIZE = 3;

export const SELF_ASSESS_LEVELS: { level: Level; title: string; desc: string }[] = [
  { level: 'A1', title: 'Mới bắt đầu (A1)', desc: 'Mới biết vài từ chào hỏi, câu ngắn đơn giản' },
  { level: 'A2', title: 'Cơ bản (A2)', desc: 'Nói được tình huống quen thuộc: gọi món, hỏi đường' },
  {
    level: 'B1',
    title: 'Trung cấp (B1)',
    desc: 'Trao đổi được công việc, đời sống nhưng còn ngập ngừng',
  },
  { level: 'B2', title: 'Khá (B2)', desc: 'Giao tiếp khá trôi chảy, muốn tự nhiên và sắc nét hơn' },
];

export type PlacementState = {
  level: Level;
  askedIds: string[];
  totalAsked: number;
  totalCorrect: number;
  blockAsked: number;
  blockCorrect: number;
  current: PlacementQuestion | null;
  done: boolean;
};

function stepLevel(level: Level, delta: -1 | 1): Level {
  const idx = LEVELS.indexOf(level);
  const next = Math.max(0, Math.min(LEVELS.length - 1, idx + delta));
  return LEVELS[next] ?? level;
}

/** Chọn 1 câu chưa hỏi ở `target`, hoặc bậc gần nhất nếu đã hết. */
export function pickQuestion(
  questions: PlacementQuestion[],
  target: Level,
  askedIds: string[],
): PlacementQuestion | null {
  const used = new Set(askedIds);
  const targetIdx = LEVELS.indexOf(target);
  const orderedLevels = [...LEVELS].sort(
    (a, b) => Math.abs(LEVELS.indexOf(a) - targetIdx) - Math.abs(LEVELS.indexOf(b) - targetIdx),
  );
  for (const lv of orderedLevels) {
    const found = questions.find((q) => q.level === lv && !used.has(q.id));
    if (found) return found;
  }
  return null;
}

export function startPlacement(startLevel: Level, questions: PlacementQuestion[]): PlacementState {
  const first = pickQuestion(questions, startLevel, []);
  return {
    level: startLevel,
    askedIds: first ? [first.id] : [],
    totalAsked: 0,
    totalCorrect: 0,
    blockAsked: 0,
    blockCorrect: 0,
    current: first,
    done: first === null,
  };
}

export function answerPlacement(
  state: PlacementState,
  optionIndex: number,
  questions: PlacementQuestion[],
): PlacementState {
  if (state.done || !state.current) return state;
  const correct = optionIndex === state.current.answerIndex;
  const totalAsked = state.totalAsked + 1;
  const totalCorrect = state.totalCorrect + (correct ? 1 : 0);
  let blockAsked = state.blockAsked + 1;
  let blockCorrect = state.blockCorrect + (correct ? 1 : 0);
  let level = state.level;

  if (blockAsked >= BLOCK_SIZE) {
    if (blockCorrect === BLOCK_SIZE) level = stepLevel(level, 1);
    else if (blockCorrect <= 1) level = stepLevel(level, -1);
    blockAsked = 0;
    blockCorrect = 0;
  }

  if (totalAsked >= PLACEMENT_TOTAL) {
    return {
      ...state,
      level,
      totalAsked,
      totalCorrect,
      blockAsked,
      blockCorrect,
      current: null,
      done: true,
    };
  }

  const next = pickQuestion(questions, level, state.askedIds);
  return {
    level,
    askedIds: next ? [...state.askedIds, next.id] : state.askedIds,
    totalAsked,
    totalCorrect,
    blockAsked,
    blockCorrect,
    current: next,
    done: next === null,
  };
}
