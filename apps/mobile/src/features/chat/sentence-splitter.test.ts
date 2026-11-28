import { SentenceSplitter, takeCompleteSentences } from './sentence-splitter';

describe('SentenceSplitter', () => {
  it('tách câu ngay khi gặp dấu kết câu + khoảng trắng', () => {
    const s = new SentenceSplitter();
    expect(s.push('Hello')).toEqual([]);
    expect(s.push('! How')).toEqual(['Hello!']);
    expect(s.push(' are you? I am')).toEqual(['How are you?']);
    expect(s.push(' fine.')).toEqual([]);
    expect(s.flush()).toBe('I am fine.');
    expect(s.flush()).toBeNull();
  });

  it('bỏ qua các viết tắt phổ biến như Mr., Dr., e.g., i.e., p.m.', () => {
    const { sentences, rest } = takeCompleteSentences(
      'Ask Dr. Smith or Mr. Lee at 3 p.m. today! Bring items, e.g. pens, for the trip. Next',
    );
    expect(sentences).toEqual([
      'Ask Dr. Smith or Mr. Lee at 3 p.m. today!',
      'Bring items, e.g. pens, for the trip.',
    ]);
    expect(rest).toBe('Next');
  });

  it('không cắt nhầm số thập phân hay dấu ba chấm', () => {
    const s = new SentenceSplitter();
    expect(s.push('It costs $4.50 and... well, ')).toEqual([]);
    expect(s.push('buy it now! Thanks')).toEqual(['It costs $4.50 and... well, buy it now!']);
    expect(s.flush()).toBe('Thanks');
  });

  it('reset xóa sạch phần dư chưa đọc', () => {
    const s = new SentenceSplitter();
    s.push('Incomplete sentence');
    s.reset();
    expect(s.flush()).toBeNull();
  });
});
