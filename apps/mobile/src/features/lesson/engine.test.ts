import { Rating } from '@/lib/fsrs';
import type { Phrase } from '../review/repository';
import {
  accuracy,
  advance,
  answer,
  buildLesson,
  buildReview,
  buildTiles,
  currentStep,
  finishedPhraseAt,
  isDone,
  MAX_RETRIES,
  progress,
  ratingFor,
  sameSentence,
  tokenize,
} from './engine';

const p = (id: string, text = `text ${id}`): Phrase => ({
  id,
  topicId: 't',
  text,
  ipa: null,
  meaningVi: `nghĩa ${id}`,
  example: null,
  register: null,
  level: 'A1',
  sortOrder: 0,
  isCustom: false,
  deletedAt: null,
});

const rng = () => 0.42;

describe('buildLesson', () => {
  it('mỗi cụm: giới thiệu rồi chọn nghĩa; cuối bài một vòng luyện trộn', () => {
    const s = buildLesson([p('a'), p('b')], { canListen: false, rng });
    expect(s.steps.slice(0, 4).map((x) => `${x.kind}:${x.phrase.id}`)).toEqual([
      'intro:a',
      'choose_meaning:a',
      'intro:b',
      'choose_meaning:b',
    ]);
    expect(s.steps.slice(4).map((x) => x.kind)).toEqual(['build_sentence', 'build_sentence']);
    expect(new Set(s.steps.slice(4).map((x) => x.phrase.id))).toEqual(new Set(['a', 'b']));
  });

  it('có giọng đọc thì vòng cuối xen bài nghe', () => {
    const s = buildLesson([p('a'), p('b')], { canListen: true, rng });
    expect(s.steps.slice(4).map((x) => x.kind)).toEqual(['build_sentence', 'listen_choose']);
  });

  it('chỉ một cụm thì không có trắc nghiệm (thiếu đáp án nhiễu)', () => {
    const s = buildLesson([p('a')], { canListen: false, rng });
    expect(s.steps.map((x) => x.kind)).toEqual(['intro', 'build_sentence']);
  });
});

describe('buildReview', () => {
  it('xoay vòng kiểu bài, bỏ bài nghe khi không có giọng', () => {
    const s = buildReview([p('a'), p('b'), p('c'), p('d')], { canListen: false, poolSize: 10 });
    expect(s.steps.map((x) => x.kind)).toEqual([
      'build_sentence',
      'choose_meaning',
      'choose_text',
      'build_sentence',
    ]);
  });

  it('kho quá nhỏ thì chỉ ghép câu', () => {
    const s = buildReview([p('a')], { canListen: true, poolSize: 1 });
    expect(s.steps.map((x) => x.kind)).toEqual(['build_sentence']);
  });
});

describe('answer / advance', () => {
  it('trả lời sai: bài quay lại cuối hàng, đếm lỗi', () => {
    let s = buildReview([p('a'), p('b')], { canListen: false, poolSize: 10 });
    s = answer(s, false);
    expect(s.steps).toHaveLength(3);
    expect(currentStep(s)?.phrase.id).toBe('b');
    s = answer(s, true);
    expect(currentStep(s)).toMatchObject({ phrase: { id: 'a' }, retry: 1 });
    s = answer(s, true);
    expect(isDone(s)).toBe(true);
    expect(s.mistakes).toEqual({ a: 1 });
    expect(accuracy(s)).toBeCloseTo(2 / 3);
  });

  it(`sai quá ${MAX_RETRIES} lần thì không quay lại nữa`, () => {
    let s = buildReview([p('a')], { canListen: false, poolSize: 1 });
    for (let i = 0; i <= MAX_RETRIES; i++) s = answer(s, false);
    expect(isDone(s)).toBe(true);
    expect(s.mistakes.a).toBe(MAX_RETRIES + 1);
  });

  it('bước giới thiệu chỉ đi tiếp, không tính điểm', () => {
    let s = buildLesson([p('a')], { canListen: false, rng });
    s = advance(s);
    expect(s.answered).toBe(0);
    expect(progress(s)).toBe(0.5);
  });

  it('answer khi đã xong không đổi gì', () => {
    const s = buildReview([], { canListen: false, poolSize: 0 });
    expect(answer(s, true)).toBe(s);
    expect(progress(s)).toBe(1);
  });
});

describe('finishedPhraseAt', () => {
  it('chỉ trả id khi đó là bước cuối của cụm trong phiên', () => {
    const s = buildLesson([p('a'), p('b')], { canListen: false, rng });
    expect(finishedPhraseAt(s, 0)).toBeNull();
    const lastA = s.steps.map((x) => x.phrase.id).lastIndexOf('a');
    expect(finishedPhraseAt(s, lastA)).toBe('a');
    expect(finishedPhraseAt(s, 99)).toBeNull();
  });
});

describe('ratingFor', () => {
  it('suy mức chấm từ số lần sai', () => {
    expect(ratingFor(0)).toBe(Rating.Good);
    expect(ratingFor(1)).toBe(Rating.Hard);
    expect(ratingFor(3)).toBe(Rating.Again);
  });
});

describe('ghép câu', () => {
  it('tokenize giữ dấu câu dính với từ', () => {
    expect(tokenize("  Nice to meet you,  I'm Lan. ")).toEqual([
      'Nice',
      'to',
      'meet',
      'you,',
      "I'm",
      'Lan.',
    ]);
  });

  it('sameSentence bỏ qua hoa/thường, dấu câu, kiểu nháy', () => {
    expect(sameSentence(['nice', 'to', 'meet', 'you'], tokenize('Nice to meet you.'))).toBe(true);
    expect(sameSentence(['I’m', 'fine'], ["I'm", 'fine!'])).toBe(true);
    expect(sameSentence(['to', 'nice', 'meet', 'you'], tokenize('Nice to meet you.'))).toBe(false);
  });

  it('buildTiles: đủ chữ của câu + chữ nhiễu không trùng', () => {
    const tiles = buildTiles('Nice to meet you', ['See you later', 'Good morning'], rng, 3);
    expect(tiles).toHaveLength(7);
    for (const w of ['Nice', 'to', 'meet', 'you']) expect(tiles).toContain(w);
    expect(tiles.filter((t) => t.toLowerCase() === 'you')).toHaveLength(1);
  });
});
