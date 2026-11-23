/**
 * Chấm câu nói của người học (kết quả nhận diện giọng nói) so với câu mẫu.
 * So khớp theo từ (dãy con chung dài nhất), bỏ qua hoa/thường, dấu câu và dạng viết tắt
 * ("I'm" = "I am"), nên không phạt lỗi chính tả do máy nhận diện.
 */

export const PASS_SCORE = 0.7;

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bi'm\b/g, 'i am'],
  [/\blet's\b/g, 'let us'],
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'d\b/g, ' would'],
  [/\b(it|that|what|there|here|he|she|who|where|how)'s\b/g, '$1 is'],
];

const NUMBERS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '15': 'fifteen',
  '20': 'twenty',
  '30': 'thirty',
};

/** Chuẩn hoá một đoạn thành danh sách từ để so khớp. */
export function speechTokens(s: string): string[] {
  let t = s.toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/'/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NUMBERS[w] ?? w);
}

export type ScoredWord = { word: string; ok: boolean };
export type SpeechScore = { score: number; passed: boolean; words: ScoredWord[] };

/** Chấm `heard` so với `target`. `words` là các từ của câu mẫu, đánh dấu từ đã nói đúng. */
export function scoreSpeech(target: string, heard: string): SpeechScore {
  const original = target.trim().split(/\s+/).filter(Boolean);
  // Mỗi từ gốc có thể thành nhiều từ chuẩn hoá ("I'm" → "i", "am").
  const groups = original.map((w) => speechTokens(w));
  const t = groups.flat();
  const h = speechTokens(heard);
  if (t.length === 0) return { score: 0, passed: false, words: [] };

  // Bảng LCS (mảng phẳng): L(i, j) = độ dài dãy con chung của t[i..] và h[j..].
  const w = h.length + 1;
  const dp = new Int32Array((t.length + 1) * w);
  const L = (i: number, j: number) => dp[i * w + j] ?? 0;
  for (let i = t.length - 1; i >= 0; i--)
    for (let j = h.length - 1; j >= 0; j--)
      dp[i * w + j] = t[i] === h[j] ? L(i + 1, j + 1) + 1 : Math.max(L(i + 1, j), L(i, j + 1));

  const matched = new Set<number>();
  for (let i = 0, j = 0; i < t.length && j < h.length; ) {
    if (t[i] === h[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (L(i + 1, j) >= L(i, j + 1)) i++;
    else j++;
  }

  let k = 0;
  const words = original.map((word, gi) => {
    const n = groups[gi]?.length ?? 0;
    let ok = n > 0;
    for (let x = 0; x < n; x++) if (!matched.has(k + x)) ok = false;
    k += n;
    return { word, ok: n === 0 ? true : ok };
  });
  const score = matched.size / t.length;
  return { score, passed: score >= PASS_SCORE, words };
}
