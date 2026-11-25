import { getScenario } from '@app/content';
import { describe, expect, it } from 'vitest';
import { buildChatPrompt, buildExplainMessages, buildFeedbackMessages } from './prompts';

const scenario = getScenario('restaurant-order');
if (!scenario) throw new Error('thiếu kịch bản mẫu');

describe('prompts', () => {
  it('prompt hội thoại có vai, bối cảnh, trình độ và quy tắc đọc thành tiếng', () => {
    const p = buildChatPrompt(scenario, 'A1');
    expect(p).toContain(scenario.aiRole);
    expect(p).toContain(scenario.setting);
    expect(p).toMatch(/A1/);
    expect(p).toMatch(/No markdown/);
  });

  it('giải thích: yêu cầu JSON, kèm ngữ cảnh', () => {
    const [sys, user] = buildExplainMessages('B1', 'Fancy a cuppa?', [
      { role: 'user', content: 'Hi' },
    ]);
    expect(sys?.content).toMatch(/"translation"/);
    expect(user?.content).toMatch(/Learner: Hi[\s\S]*Sentence: Fancy a cuppa\?/);
  });

  it('tổng kết: chỉ chấm lượt của người học, có transcript', () => {
    const [sys, user] = buildFeedbackMessages(scenario, 'A2', [
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'I want coffee' },
    ]);
    expect(sys?.content).toMatch(/ONLY the learner lines/);
    expect(user?.content).toBe('Partner: Hello\nLearner: I want coffee');
  });
});
