import { describe, expect, it } from 'vitest';
import { PhraseContent, PlacementQuestion, ScenarioContent, TopicContent } from './index';

describe('content schemas', () => {
  it('Topic yêu cầu id dạng kebab-case', () => {
    expect(
      TopicContent.safeParse({ id: 'at-restaurant', title: 'Nhà hàng', level: 'A2', sortOrder: 1 })
        .success,
    ).toBe(true);
    expect(
      TopicContent.safeParse({ id: 'At Restaurant', title: 'x', level: 'A2', sortOrder: 1 })
        .success,
    ).toBe(false);
  });

  it('Phrase bắt buộc nghĩa tiếng Việt', () => {
    const p = {
      id: 'p1',
      topicId: 't1',
      text: 'Could I get the bill?',
      meaningVi: 'Cho tôi xin hoá đơn',
      level: 'A2',
    };
    expect(PhraseContent.safeParse(p).success).toBe(true);
    expect(PhraseContent.safeParse({ ...p, meaningVi: '' }).success).toBe(false);
  });

  it('Scenario cần câu mở đầu và ít nhất 1 từ khoá', () => {
    const s = {
      id: 'restaurant-order',
      title: 'Gọi món',
      level: 'A2',
      aiRole: 'a waiter',
      userRole: 'a customer',
      goalVi: 'Gọi món và thanh toán',
      setting: 'A small cafe in London.',
      keywords: ['menu'],
      opener: 'Hi! Table for one?',
    };
    expect(ScenarioContent.safeParse(s).success).toBe(true);
    expect(ScenarioContent.safeParse({ ...s, keywords: [] }).success).toBe(false);
  });

  it('PlacementQuestion: answerIndex phải nằm trong options', () => {
    const q = {
      id: 'q1',
      level: 'A1',
      kind: 'read_choose',
      prompt: 'Nice to meet you.',
      questionVi: 'Nghĩa là gì?',
      options: ['a', 'b', 'c', 'd'],
      answerIndex: 1,
    };
    expect(PlacementQuestion.safeParse(q).success).toBe(true);
    expect(PlacementQuestion.safeParse({ ...q, answerIndex: 4 }).success).toBe(false);
  });
});
