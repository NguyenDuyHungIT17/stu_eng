import { PASS_SCORE, scoreSpeech, speechTokens } from './speech-score';

describe('speechTokens', () => {
  it('bỏ dấu câu, chữ hoa, mở viết tắt, đổi số thành chữ', () => {
    expect(speechTokens("Hi! I'm Lan, it's 5 o'clock.")).toEqual([
      'hi',
      'i',
      'am',
      'lan',
      'it',
      'is',
      'five',
      'oclock',
    ]);
    expect(speechTokens("I don't think we've met")).toEqual([
      'i',
      'do',
      'not',
      'think',
      'we',
      'have',
      'met',
    ]);
  });
});

describe('scoreSpeech', () => {
  it('nói đúng hết (khác dấu câu, viết tắt) → 100%', () => {
    const r = scoreSpeech("Hi Tom, nice to meet you. I'm Lan.", 'hi tom nice to meet you I am Lan');
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
    expect(r.words.every((w) => w.ok)).toBe(true);
  });

  it('thiếu từ: đánh dấu từ thiếu, điểm theo tỉ lệ', () => {
    const r = scoreSpeech('Could I get the bill, please?', 'could I get bill');
    expect(r.words.map((w) => w.ok)).toEqual([true, true, true, false, true, false]);
    expect(r.score).toBeCloseTo(4 / 6);
    expect(r.passed).toBe(4 / 6 >= PASS_SCORE);
  });

  it('sai thứ tự không được tính hết', () => {
    const r = scoreSpeech('nice to meet you', 'you meet to nice');
    expect(r.score).toBeLessThan(0.5);
  });

  it('nói thừa từ không bị trừ', () => {
    expect(scoreSpeech('See you around', 'okay see you around then').score).toBe(1);
  });

  it('không nghe được gì → 0', () => {
    expect(scoreSpeech('Thanks a lot', '')).toMatchObject({ score: 0, passed: false });
  });
});
