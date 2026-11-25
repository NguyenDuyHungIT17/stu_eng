import type { Msg } from './gateway';

/**
 * Nhà cung cấp giả (chỉ khi không phải prod và chưa có API key): trả lời cố định để
 * phát triển và thử app trước khi có khóa LLM. Không gọi mạng.
 */

const REPLIES = [
  'That sounds great! Could you tell me a little more about that?',
  'I see. And how do you feel about it so far?',
  'Interesting! What would you like to do next?',
  'Got it. Is there anything else I can help you with?',
];

export async function* mockReply(messages: Msg[]): AsyncGenerator<string> {
  const turns = messages.filter((m) => m.role === 'user').length;
  const reply = `(demo) ${REPLIES[turns % REPLIES.length]}`;
  for (const word of reply.split(/(?= )/)) {
    await new Promise((r) => setTimeout(r, 40));
    yield word;
  }
}

export function mockJson(kind: 'explain' | 'feedback', messages: Msg[]): unknown {
  if (kind === 'explain') {
    return {
      translation: '(bản demo) Câu này có nghĩa là: bạn có thể kể thêm một chút không?',
      notes: [{ phrase: 'tell me more', meaning: 'kể thêm cho tôi nghe' }],
    };
  }
  // Prompt tổng kết gửi transcript dạng "Learner: …" / "Partner: …" trong lượt user.
  const transcript = messages.find((m) => m.role === 'user')?.content ?? '';
  const userTurns = transcript
    .split('\n')
    .filter((l) => l.startsWith('Learner: '))
    .map((l) => ({ content: l.slice('Learner: '.length) }));
  return {
    summary: `(bản demo) Bạn đã nói ${userTurns.length} lượt. Hãy giữ câu ngắn, rõ ràng và hỏi lại người kia.`,
    mistakes: userTurns.length
      ? [{ original: userTurns[0]?.content ?? '', better: 'Could you…?', note: 'Ví dụ minh họa.' }]
      : [],
    usefulPhrases: ['Could you tell me more about that?', 'That sounds great!'],
  };
}
