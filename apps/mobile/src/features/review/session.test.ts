import type { Phrase } from './repository';
import {
  applyRating,
  buildSession,
  currentItem,
  defaultRatingForChoice,
  isFinished,
  MAX_REPEATS,
} from './session';

const p = (id: string): Phrase => ({
  id,
  topicId: 't',
  text: id,
  ipa: null,
  meaningVi: `nghĩa ${id}`,
  example: null,
  register: null,
  level: 'A1',
  sortOrder: 0,
  isCustom: false,
  deletedAt: null,
});

describe('buildSession', () => {
  it('thẻ đến hạn trước, cụm mới sau; cụm mới luôn là lật thẻ', () => {
    const s = buildSession([p('d1'), p('d2'), p('d3')], [p('n1')], {
      canListen: true,
      poolSize: 10,
    });
    expect(s.queue.map((i) => [i.phrase.id, i.exercise, i.isNew])).toEqual([
      ['d1', 'choose_meaning', false],
      ['d2', 'listen_choose', false],
      ['d3', 'flip', false],
      ['n1', 'flip', true],
    ]);
  });

  it('không có giọng TTS thì không dùng bài nghe', () => {
    const s = buildSession([p('d1'), p('d2')], [], { canListen: false, poolSize: 10 });
    expect(s.queue.map((i) => i.exercise)).toEqual(['choose_meaning', 'flip']);
  });

  it('quá ít cụm để làm trắc nghiệm thì chỉ lật thẻ', () => {
    const s = buildSession([p('d1'), p('d2')], [], { canListen: true, poolSize: 1 });
    expect(s.queue.map((i) => i.exercise)).toEqual(['flip', 'flip']);
  });
});

describe('applyRating', () => {
  it('đếm kết quả và số cụm mới; hết hàng đợi là kết thúc', () => {
    let s = buildSession([p('d1')], [p('n1')], { canListen: true, poolSize: 10 });
    s = applyRating(s, 3);
    s = applyRating(s, 4);
    expect(isFinished(s)).toBe(true);
    expect(s.done).toBe(2);
    expect(s.newLearned).toBe(1);
    expect(s.ratings).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1 });
  });

  it('chấm Quên: thẻ quay lại cuối hàng (lật thẻ), tối đa MAX_REPEATS lần', () => {
    let s = buildSession([p('a'), p('b')], [], { canListen: true, poolSize: 10 });
    s = applyRating(s, 1);
    expect(s.queue.map((i) => [i.phrase.id, i.exercise, i.repeats])).toEqual([
      ['b', 'listen_choose', 0],
      ['a', 'flip', 1],
    ]);
    s = applyRating(s, 3); // b
    for (let i = 0; i < MAX_REPEATS; i++) s = applyRating(s, 1);
    expect(isFinished(s)).toBe(true);
    expect(currentItem(s)).toBeUndefined();
    expect(s.ratings[1]).toBe(1 + MAX_REPEATS);
  });

  it('cụm mới chấm Quên chỉ tính là mới một lần', () => {
    let s = buildSession([], [p('n')], { canListen: true, poolSize: 10 });
    s = applyRating(s, 1);
    s = applyRating(s, 3);
    expect(s.newLearned).toBe(1);
  });
});

it('defaultRatingForChoice: đúng → Được, sai → Quên', () => {
  expect(defaultRatingForChoice(true)).toBe(3);
  expect(defaultRatingForChoice(false)).toBe(1);
});
