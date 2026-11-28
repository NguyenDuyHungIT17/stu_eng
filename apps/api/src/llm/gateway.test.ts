import { ExplainResponse } from '@app/shared';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env';
import { completeJson, extractJson, type Msg, streamChat } from './gateway';
import { parseOpenAiStream } from './openai-stream';
import { getProviders, MOCK } from './providers';

const enc = new TextEncoder();
const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(ctrl) {
      for (const c of chunks) ctrl.enqueue(enc.encode(c));
      ctrl.close();
    },
  });
const delta = (t: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;

const PROVIDERS = JSON.stringify([
  { name: 'a', baseUrl: 'https://a.test/v1', model: 'm1', keyVar: 'KEY_A' },
  { name: 'b', baseUrl: 'https://b.test/v1', model: 'm2', keyVar: 'KEY_B', supportsJsonMode: true },
]);
const env = (extra: Record<string, string> = {}) =>
  ({
    APP_ENV: 'test',
    LLM_PROVIDERS: PROVIDERS,
    KEY_A: 'ka',
    KEY_B: 'kb',
    ...extra,
  }) as unknown as Env;
const msgs: Msg[] = [{ role: 'user', content: 'Hi' }];

async function collect(gen: AsyncGenerator<string>) {
  const out: string[] = [];
  for await (const t of gen) out.push(t);
  return out;
}

describe('parseOpenAiStream', () => {
  it('ghép token, chịu chunk bị cắt giữa chừng, dừng ở [DONE]', async () => {
    const body = `${delta('Hel')}${delta('lo')}data: {"choices":[{"delta":{}}]}\n\ndata: [DONE]\n\n${delta('X')}`;
    const parts = [body.slice(0, 17), body.slice(17, 40), body.slice(40)];
    expect(await collect(parseOpenAiStream(streamOf(...parts)))).toEqual(['Hel', 'lo']);
  });

  it('bỏ qua dòng không phải JSON', async () => {
    expect(
      await collect(parseOpenAiStream(streamOf(': keep-alive\n\ndata: oops\n\n', delta('ok')))),
    ).toEqual(['ok']);
  });
});

describe('getProviders', () => {
  it('theo thứ tự cấu hình, bỏ nhà cung cấp thiếu key', () => {
    expect(getProviders(env({ KEY_A: '' })).map((p) => p.name)).toEqual(['b']);
    expect(getProviders(env())[1]).toMatchObject({ apiKey: 'kb', supportsJsonMode: true });
  });

  it('không có key: dev dùng mock, prod thì không có ai', () => {
    expect(getProviders(env({ KEY_A: '', KEY_B: '' }))).toEqual([MOCK]);
    expect(getProviders(env({ KEY_A: '', KEY_B: '', APP_ENV: 'prod' }))).toEqual([]);
    expect(getProviders({ APP_ENV: 'dev', LLM_PROVIDERS: 'not json' } as unknown as Env)).toEqual([
      MOCK,
    ]);
  });
});

describe('streamChat', () => {
  it('nhà cung cấp đầu lỗi trước token đầu → chuyển sang nhà cung cấp sau', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValueOnce(new Response(streamOf(delta('Hi'), delta('!'), 'data: [DONE]\n\n')));
    expect(await collect(streamChat(env(), msgs, fetchFn))).toEqual(['Hi', '!']);
    expect(fetchFn.mock.calls.map((c) => String(c[0]))).toEqual([
      'https://a.test/v1/chat/completions',
      'https://b.test/v1/chat/completions',
    ]);
    const body = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ model: 'm1', stream: true, messages: msgs });
  });

  it('đã gửi token rồi mới lỗi → không chuyển, ném lỗi', async () => {
    let pulls = 0;
    const broken = new ReadableStream<Uint8Array>({
      pull(ctrl) {
        if (pulls++ === 0) ctrl.enqueue(enc.encode(delta('Hi')));
        else ctrl.error(new Error('cut'));
      },
    });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(broken));
    const out: string[] = [];
    await expect(async () => {
      for await (const t of streamChat(env(), msgs, fetchFn)) out.push(t);
    }).rejects.toThrow();
    expect(out).toEqual(['Hi']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('tất cả lỗi → ném lỗi', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('x', { status: 500 }));
    await expect(collect(streamChat(env(), msgs, fetchFn))).rejects.toThrow(/b:500/);
  });

  it('mock trả lời không gọi mạng', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const out = await collect(streamChat(env({ KEY_A: '', KEY_B: '' }), msgs, fetchFn));
    expect(out.join('')).toMatch(/^\(demo\) /);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('stream kết thúc rỗng (0 token) → chuyển sang nhà cung cấp sau', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(streamOf('data: [DONE]\n\n')))
      .mockResolvedValueOnce(new Response(streamOf(delta('OK'), 'data: [DONE]\n\n')));
    expect(await collect(streamChat(env(), msgs, fetchFn))).toEqual(['OK']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('completeJson', () => {
  const reply = (content: string) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }));
  const good = { translation: 'Xin chào', notes: [] };

  it('bóc JSON trong ```json```, kiểm tra bằng Zod', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply(`\`\`\`json\n${JSON.stringify(good)}\n\`\`\``));
    await expect(
      completeJson(env(), msgs, ExplainResponse, { kind: 'explain', fetchFn }),
    ).resolves.toEqual(good);
  });

  it('JSON sai → thử lại 1 lần cùng nhà cung cấp; bật json mode nếu hỗ trợ', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply('not json'))
      .mockResolvedValueOnce(reply(JSON.stringify(good)));
    await expect(
      completeJson(env({ KEY_A: '' }), msgs, ExplainResponse, { kind: 'explain', fetchFn }),
    ).resolves.toEqual(good);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const body = JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body));
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('HTTP lỗi → chuyển nhà cung cấp; sai schema cả 2 lần → chuyển tiếp', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('x', { status: 429 }))
      .mockResolvedValueOnce(reply('{"wrong": 1}'))
      .mockResolvedValueOnce(reply('{"wrong": 2}'));
    await expect(
      completeJson(env(), msgs, ExplainResponse, { kind: 'explain', fetchFn }),
    ).rejects.toThrow(/b:bad_json/);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('extractJson lấy đoạn {…} giữa chữ thừa', () => {
    expect(extractJson('Here you go: {"a": 1} thanks')).toEqual({ a: 1 });
  });
});
