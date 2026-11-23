import { describe, expect, it } from 'vitest';
import { validateBundle } from './validate-bundle';

const topic = { id: 'greetings', title: 'Làm quen', level: 'A1', sortOrder: 1 };
const dialogue = {
  id: 'meet-tom',
  topicId: 'greetings',
  title: 'Gặp Tom',
  level: 'A1',
  situationVi: 'Gặp đồng nghiệp mới.',
  speakers: { a: { name: 'Tom', roleVi: 'Đồng nghiệp' }, b: { name: 'Lan', roleVi: 'Bạn' } },
  lines: [
    { speaker: 'a', text: "Hi, I'm Tom.", meaningVi: 'Chào, mình là Tom.', blank: "I'm Tom" },
    { speaker: 'b', text: 'Nice to meet you.', meaningVi: 'Rất vui được gặp anh.' },
    { speaker: 'a', text: 'Welcome aboard!', meaningVi: 'Chào mừng!' },
    { speaker: 'b', text: 'Thanks!', meaningVi: 'Cảm ơn!' },
  ],
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
  dialogues: [dialogue],
  scenarios: [scenario],
  placement: [q],
};

describe('validateBundle', () => {
  it('bộ hợp lệ không có lỗi', () => {
    expect(validateBundle(ok)).toEqual([]);
  });

  it('báo lỗi schema kèm vị trí', () => {
    const bad = {
      ...dialogue,
      lines: [{ ...dialogue.lines[0], meaningVi: '' }, ...dialogue.lines],
    };
    const errors = validateBundle({ ...ok, dialogues: [bad] });
    expect(errors.join('\n')).toMatch(/dialogues\[0\].lines.0.meaningVi/);
  });

  it('báo blank không có trong câu', () => {
    const lines = [{ ...dialogue.lines[0], blank: 'Nope' }, ...dialogue.lines.slice(1)];
    const errors = validateBundle({ ...ok, dialogues: [{ ...dialogue, lines }] });
    expect(errors.join('\n')).toMatch(/blank "Nope"/);
  });

  it('báo trùng id hội thoại', () => {
    const errors = validateBundle({ ...ok, dialogues: [dialogue, dialogue] });
    expect(errors.join('\n')).toMatch(/trùng id.*meet-tom/);
  });

  it('báo topicId không tồn tại', () => {
    const errors = validateBundle({ ...ok, dialogues: [{ ...dialogue, topicId: 'unknown' }] });
    expect(errors.join('\n')).toMatch(/topicId "unknown"/);
  });

  it('báo trùng id kịch bản', () => {
    const errors = validateBundle({ ...ok, scenarios: [scenario, scenario] });
    expect(errors.join('\n')).toMatch(/trùng id.*meet-colleague/);
  });
});
