import { getScenario } from '@app/content';
import {
  ChatRequest,
  ExplainRequest,
  ExplainResponse,
  FeedbackRequest,
  FeedbackResponse,
  type QuotaResponse,
} from '@app/shared';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { nextVnMidnightIso, vnDayKey } from '../day';
import type { AppEnv } from '../env';
import { completeJson, streamChat } from '../llm/gateway';
import { apiError, limits, quotaKeys, rateLimit, refund, requireDeviceId } from '../middleware';
import { buildChatPrompt, buildExplainMessages, buildFeedbackMessages } from '../prompts';
import { peek } from '../quota/counter';

/** Gửi tối đa 12 lượt gần nhất cho LLM (TK §6.2). */
const MAX_TURNS = 12;

const invalid = { error: 'invalid_request' } as const;
const validate = <T extends Parameters<typeof zValidator>[1]>(schema: T) =>
  zValidator('json', schema, (r, c) => (r.success ? undefined : c.json(invalid, 400)));

export const chat = new Hono<AppEnv>()

  /** Stream câu trả lời của AI (SSE `data: {"t": "..."}`, kết thúc bằng `event: done`). */
  .post('/chat', requireDeviceId, validate(ChatRequest), rateLimit('chat'), async (c) => {
    const req = c.req.valid('json');
    const scenario = getScenario(req.scenarioId);
    if (!scenario) return apiError(c, 'unknown_scenario', 400);
    const messages = [
      { role: 'system' as const, content: buildChatPrompt(scenario, req.level) },
      ...req.messages.slice(-MAX_TURNS),
    ];
    return streamSSE(c, async (stream) => {
      let sent = false;
      try {
        for await (const t of streamChat(c.env, messages)) {
          sent = true;
          await stream.writeSSE({ data: JSON.stringify({ t }) });
        }
        await stream.writeSSE({ event: 'done', data: '' });
      } catch (e) {
        console.error('[POST /chat] upstream', e instanceof Error ? e.message : 'error');
        if (!sent) await refund(c);
        await stream.writeSSE({ event: 'error', data: 'upstream_failed' });
      }
    });
  })

  /** Giải thích tiếng Việt một câu của AI (FR-A-05). */
  .post(
    '/chat/explain',
    requireDeviceId,
    validate(ExplainRequest),
    rateLimit('assist'),
    async (c) => {
      const req = c.req.valid('json');
      try {
        const out = await completeJson(
          c.env,
          buildExplainMessages(req.level, req.sentence, req.context),
          ExplainResponse,
          { kind: 'explain' },
        );
        return c.json(out);
      } catch (e) {
        console.error('[POST /chat/explain] upstream', e instanceof Error ? e.message : 'error');
        await refund(c);
        return apiError(c, 'upstream_failed', 502);
      }
    },
  )

  /** Tổng kết cuối buổi (FR-A-04). */
  .post(
    '/chat/feedback',
    requireDeviceId,
    validate(FeedbackRequest),
    rateLimit('assist'),
    async (c) => {
      const req = c.req.valid('json');
      const scenario = getScenario(req.scenarioId);
      if (!scenario) return apiError(c, 'unknown_scenario', 400);
      try {
        const out = await completeJson(
          c.env,
          buildFeedbackMessages(scenario, req.level, req.messages),
          FeedbackResponse,
          { kind: 'feedback' },
        );
        return c.json(out);
      } catch (e) {
        console.error('[POST /chat/feedback] upstream', e instanceof Error ? e.message : 'error');
        await refund(c);
        return apiError(c, 'upstream_failed', 502);
      }
    },
  )

  /** Số lượt đã dùng hôm nay (FR-A-07). Không trừ lượt. */
  .get('/quota', requireDeviceId, async (c) => {
    const now = new Date();
    const day = vnDayKey(now);
    const id = c.get('deviceId');
    const lim = limits(c.env);
    const body: QuotaResponse = {
      chat: { used: await peek(c.env.DB, quotaKeys('chat', id, '', day).device), limit: lim.chat },
      assist: {
        used: await peek(c.env.DB, quotaKeys('assist', id, '', day).device),
        limit: lim.assist,
      },
      resetsAt: nextVnMidnightIso(now),
    };
    return c.json(body);
  });
