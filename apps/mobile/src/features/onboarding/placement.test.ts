import type { PlacementQuestion } from '@app/shared';
import { answerPlacement, BLOCK_SIZE, PLACEMENT_TOTAL, startPlacement } from './placement';

const makeQuestions = (): PlacementQuestion[] =>
  (['A1', 'A2', 'B1', 'B2'] as const).flatMap((level) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: `${level}-${i}`,
      level,
      kind: i % 2 === 0 ? ('read_choose' as const) : ('listen_choose' as const),
      prompt: `${level} prompt ${i}`,
      questionVi: '?',
      options: ['a', 'b', 'c', 'd'],
      answerIndex: 0,
    })),
  );

describe('placement adaptive quiz', () => {
  it('đúng 3/3 nâng bậc, sai ≥2/3 hạ bậc, đúng 2/3 giữ nguyên', () => {
    const qs = makeQuestions();
    let s = startPlacement('A2', qs);
    expect(s.current?.level).toBe('A2');

    // Cụm 1: đúng 3/3 → tăng lên B1
    for (let i = 0; i < BLOCK_SIZE; i++) s = answerPlacement(s, 0, qs);
    expect(s.level).toBe('B1');
    expect(s.current?.level).toBe('B1');

    // Cụm 2: đúng 2/3 → giữ nguyên B1
    s = answerPlacement(s, 0, qs);
    s = answerPlacement(s, 0, qs);
    s = answerPlacement(s, 1, qs);
    expect(s.level).toBe('B1');

    // Cụm 3: sai 2/3 → hạ xuống A2
    s = answerPlacement(s, 0, qs);
    s = answerPlacement(s, 1, qs);
    s = answerPlacement(s, 2, qs);
    expect(s.level).toBe('A2');
  });

  it('giới hạn ở A1..B2 và kết thúc đủ 12 câu không trùng id', () => {
    const qs = makeQuestions();
    let s = startPlacement('B2', qs);
    for (let i = 0; i < PLACEMENT_TOTAL; i++) {
      s = answerPlacement(s, 0, qs);
    }
    expect(s.done).toBe(true);
    expect(s.level).toBe('B2');
    expect(s.totalAsked).toBe(PLACEMENT_TOTAL);
    expect(new Set(s.askedIds).size).toBe(PLACEMENT_TOTAL);

    let low = startPlacement('A1', qs);
    for (let i = 0; i < PLACEMENT_TOTAL; i++) {
      low = answerPlacement(low, 3, qs);
    }
    expect(low.done).toBe(true);
    expect(low.level).toBe('A1');
  });
});
