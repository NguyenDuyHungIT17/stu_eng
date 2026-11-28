/**
 * Tách câu theo luồng token để đẩy sang hàng đợi TTS sớm (S3b-04, TK §6.2).
 * Cắt tại `.`, `?`, `!` (có thể kèm dấu ngoặc/ngoặc kép đóng) theo sau là khoảng trắng,
 * đồng thời bỏ qua các viết tắt phổ biến như `Mr.`, `Dr.`, `e.g.`, `i.e.`, chữ viết tắt 1 chữ cái.
 */

const ABBREVIATIONS =
  /(?:^|[\s("'])(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|a\.m|p\.m|U\.S|U\.K|[A-Za-z])\.$/i;

/** Tách toàn bộ các câu đã kết thúc khỏi `buffer`; trả về danh sách câu và phần dư chưa xong. */
export function takeCompleteSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (ch !== '.' && ch !== '?' && ch !== '!') continue;

    // Bỏ qua dấu chấm thuộc chuỗi `...` hoặc trước ký tự liền kề không phải kết câu.
    if (ch === '.' && (buffer[i + 1] === '.' || buffer[i - 1] === '.')) continue;

    let end = i + 1;
    while (
      end < buffer.length &&
      (buffer[end] === '"' || buffer[end] === "'" || buffer[end] === ')')
    ) {
      end++;
    }

    const next = buffer[end];
    if (next === undefined || !/\s/.test(next)) continue;

    if (ch === '.') {
      const candidate = buffer.slice(start, i + 1);
      if (ABBREVIATIONS.test(candidate)) continue;
    }

    const sentence = buffer.slice(start, end).trim();
    if (sentence.length > 0) sentences.push(sentence);

    let nextStart = end;
    while (nextStart < buffer.length && /\s/.test(buffer[nextStart] ?? '')) nextStart++;
    start = nextStart;
    i = nextStart - 1;
  }

  return { sentences, rest: buffer.slice(start) };
}

export class SentenceSplitter {
  private buffer = '';

  push(chunk: string): string[] {
    if (!chunk) return [];
    this.buffer += chunk;
    const { sentences, rest } = takeCompleteSentences(this.buffer);
    this.buffer = rest;
    return sentences;
  }

  flush(): string | null {
    const tail = this.buffer.trim();
    this.buffer = '';
    return tail.length > 0 ? tail : null;
  }

  reset(): void {
    this.buffer = '';
  }
}
