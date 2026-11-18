import { describe, expect, it } from 'vitest';
import { validateBundle } from './validate-bundle';

const topic = { id: 'greetings', title: 'Làm quen', level: 'A1', sortOrder: 1 };
const phrase = {
  id: 'nice-to-meet-you',
  topicId: 'greetings',
  text: 'Nice to meet you.',
  meaningVi: 'Rất vui được gặp bạn',
  level: 'A1',
};
const scenario = {
  id: 'meet-colleague',
  title: 'Làm quen đồng nghiệp',
  level: 'A1',
  aiRole: 'a new colleague',
  userRole: 'an employee',
  goalVi: 'Giới thiệu bản thân',
  setting: 'First day at an office.',
  keywords: ['name'],
  opener: 'Hi, are you new here?',
};
const q = {
  id: 'q-a1-1',
  level: 'A1',
  kind: 'read_choose',
  prompt: 'Hello',
  questionVi: '?',
  options: ['a', 'b', 'c', 'd'],
  answerIndex: 0,
};

const ok = {
  contentVersion: { contentVersion: 1 },
  topics: [topic],
  phrases: [phrase],
  scenarios: [scenario],
  placement: [q],
};

describe('validateBundle', () => {
  it('bộ hợp lệ không có lỗi', () => {
    expect(validateBundle(ok)).toEqual([]);
  });

  it('báo lỗi schema kèm vị trí', () => {
    const errors = validateBundle({ ...ok, phrases: [{ ...phrase, meaningVi: '' }] });
    expect(errors.join('\n')).toMatch(/phrases\[0\].*meaningVi/);
  });

  it('báo trùng id cụm từ', () => {
    const errors = validateBundle({ ...ok, phrases: [phrase, phrase] });
    expect(errors.join('\n')).toMatch(/trùng id.*nice-to-meet-you/);
  });

  it('báo topicId không tồn tại', () => {
    const errors = validateBundle({ ...ok, phrases: [{ ...phrase, topicId: 'unknown' }] });
    expect(errors.join('\n')).toMatch(/topicId "unknown"/);
  });

  it('báo trùng id kịch bản', () => {
    const errors = validateBundle({ ...ok, scenarios: [scenario, scenario] });
    expect(errors.join('\n')).toMatch(/trùng id.*meet-colleague/);
  });
});
