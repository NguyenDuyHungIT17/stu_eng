import { Rating } from '@/lib/fsrs';
import type { Line } from '../dialogue/repository';
import {
  accuracy,
  advance,
  answer,
  buildDialogueLesson,
  buildReview,
  buildTiles,
  currentStep,
  finishedLineAt,
  isDone,
  MAX_RETRIES,
  progress,
  ratingFor,
  sameSentence,
  splitBlank,
  tokenize,
} from './engine';

const line = (
  lineNo: number,
  speaker: 'a' | 'b',
  blank: string | null = 'key',
  text = `text key ${lineNo}`,
): Line => ({
  id: `d-l${lineNo}`,
  topicId: 't',
  text,
  ipa: null,
  meaningVi: `nghĩa ${lineNo}`,
  example: null,
  register: null,
  level: 'A1',
  sortOrder: lineNo,
  isCustom: false,
  deletedAt: null,
  dialogueId: 'd',
  lineNo,
  speaker,
  blank,
  noteVi: null,
});

const steps = (s: { steps: { kind: string; line: Line | null }[] }) =>
  s.steps.map((x) => (x.line ? `${x.kind}:${x.line.lineNo}` : x.kind));

describe('buildDialogueLesson', () => {
  it('tình huống → nghe cả bài → điền từng câu then chốt → nhập vai câu của người học', () => {
    const lines = [line(0, 'a'), line(1, 'b'), line(2, 'a', null), line(3, 'b')];
    expect(steps(buildDialogueLesson(lines))).toEqual([
      'scene',
      'listen_all',
      'fill_blank:0',
      'fill_blank:1',
      'fill_blank:3',
      'choose_reply:1',
      'choose_reply:3',
    ]);
  });

  it('người học nói câu mở đầu: ghép câu thay cho chọn câu đáp', () => {
    const lines = [line(0, 'b'), line(1, 'a')];
    expect(steps(buildDialogueLesson(lines))).toContain('build_sentence:0');
  });

  it('câu mở đầu quá dài thì nghe-điền thêm lần nữa', () => {
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen key';
    const lines = [line(0, 'b', 'key', long), line(1, 'a')];
    expect(steps(buildDialogueLesson(lines)).slice(-1)).toEqual(['fill_blank:0']);
  });
});

describe('buildReview', () => {
  it('xoay vòng các kiểu bài có thể dùng cho từng câu', () => {
    const s = buildReview([line(0, 'a'), line(1, 'b'), line(2, 'a')]);
    expect(steps(s)).toEqual(['fill_blank:0', 'choose_reply:1', 'build_sentence:2']);
  });
});

describe('answer / advance', () => {
  it('trả lời sai: bài quay lại cuối hàng, đếm lỗi', () => {
    let s = buildReview([line(0, 'a'), line(1, 'b')]);
    s = answer(s, false);
    expect(s.steps).toHaveLength(3);
    s = answer(s, true);
    expect(currentStep(s)).toMatchObject({ line: { lineNo: 0 }, retry: 1 });
    s = answer(s, true);
    expect(isDone(s)).toBe(true);
    expect(s.mistakes).toEqual({ 'd-l0': 1 });
    expect(accuracy(s)).toBeCloseTo(2 / 3);
  });

  it(`sai quá ${MAX_RETRIES} lần thì không quay lại nữa`, () => {
    let s = buildReview([line(0, 'a')]);
    for (let i = 0; i <= MAX_RETRIES; i++) s = answer(s, false);
    expect(isDone(s)).toBe(true);
  });

  it('bước tình huống/nghe chỉ đi tiếp, answer không áp dụng', () => {
    const s0 = buildDialogueLesson([line(0, 'a')]);
    expect(answer(s0, true)).toBe(s0);
    const s1 = advance(s0);
    expect(s1.answered).toBe(0);
    expect(progress(s1)).toBeCloseTo(1 / 3);
  });
});

describe('finishedLineAt', () => {
  it('chỉ trả id ở bước cuối của câu trong phiên', () => {
    const s = buildDialogueLesson([line(0, 'a'), line(1, 'b')]);
    const idx = steps(s);
    expect(finishedLineAt(s, 0)).toBeNull(); // scene
    expect(finishedLineAt(s, idx.indexOf('fill_blank:1'))).toBeNull();
    expect(finishedLineAt(s, idx.indexOf('choose_reply:1'))).toBe('d-l1');
    expect(finishedLineAt(s, idx.indexOf('fill_blank:0'))).toBe('d-l0');
  });
});

describe('tiện ích', () => {
  it('ratingFor', () => {
    expect(ratingFor(0)).toBe(Rating.Good);
    expect(ratingFor(1)).toBe(Rating.Hard);
    expect(ratingFor(2)).toBe(Rating.Again);
  });

  it('splitBlank', () => {
    expect(splitBlank("Hi! I don't think we've met.", "I don't think")).toEqual({
      before: 'Hi! ',
      after: " we've met.",
    });
    expect(splitBlank('abc', 'x')).toEqual({ before: 'abc', after: '' });
  });

  it('ghép câu: tokenize, sameSentence, buildTiles', () => {
    expect(tokenize(" Nice to  meet you, I'm Lan. ")).toEqual([
      'Nice',
      'to',
      'meet',
      'you,',
      "I'm",
      'Lan.',
    ]);
    expect(sameSentence(['I’m', 'fine'], ["I'm", 'fine!'])).toBe(true);
    expect(sameSentence(['fine', "I'm"], ["I'm", 'fine'])).toBe(false);
    const tiles = buildTiles('Nice to meet you', ['See you later'], () => 0.3, 3);
    expect(tiles).toHaveLength(6);
    expect(tiles.filter((t) => t.toLowerCase() === 'you')).toHaveLength(1);
  });
});
