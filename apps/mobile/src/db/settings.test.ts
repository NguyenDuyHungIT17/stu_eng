import {
  DEFAULT_DAILY_MINUTES_GOAL,
  DEFAULT_DAILY_NEW_LIMIT,
  DEFAULT_LEVEL,
  DEFAULT_REMINDER,
  getDailyMinutesGoal,
  getDailyNewLimit,
  getLevel,
  getReminderPrefs,
  getSetting,
  getTtsPrefs,
  hasPrivacyAck,
  SettingKey,
  setPrivacyAck,
  setReminderPrefs,
  setSetting,
} from './settings';
import { createTestDb } from './test-db';

describe('settings', () => {
  it('get/set, ghi đè giá trị cũ', () => {
    const db = createTestDb();
    expect(getSetting(db, SettingKey.level)).toBeNull();
    setSetting(db, SettingKey.level, 'A2');
    setSetting(db, SettingKey.level, 'B1');
    expect(getSetting(db, SettingKey.level)).toBe('B1');
  });

  it('giá trị thiếu hoặc hỏng thì dùng mặc định', () => {
    const db = createTestDb();
    expect(getLevel(db)).toBe(DEFAULT_LEVEL);
    expect(getDailyNewLimit(db)).toBe(DEFAULT_DAILY_NEW_LIMIT);
    expect(getDailyMinutesGoal(db)).toBe(DEFAULT_DAILY_MINUTES_GOAL);
    expect(getTtsPrefs(db)).toEqual({ voice: null, rate: undefined });
    setSetting(db, SettingKey.level, 'C9');
    setSetting(db, SettingKey.dailyNewLimit, '-3');
    setSetting(db, SettingKey.ttsRate, 'abc');
    expect(getLevel(db)).toBe(DEFAULT_LEVEL);
    expect(getDailyNewLimit(db)).toBe(DEFAULT_DAILY_NEW_LIMIT);
    expect(getTtsPrefs(db).rate).toBeUndefined();
  });

  it('đọc đúng giá trị hợp lệ', () => {
    const db = createTestDb();
    setSetting(db, SettingKey.level, 'A1');
    setSetting(db, SettingKey.dailyNewLimit, '5');
    setSetting(db, SettingKey.dailyMinutesGoal, '20');
    setSetting(db, SettingKey.ttsVoice, 'en-us-x-sfg');
    setSetting(db, SettingKey.ttsRate, '0.75');
    expect(getLevel(db)).toBe('A1');
    expect(getDailyNewLimit(db)).toBe(5);
    expect(getDailyMinutesGoal(db)).toBe(20);
    expect(getTtsPrefs(db)).toEqual({ voice: 'en-us-x-sfg', rate: 0.75 });
  });

  it('nhắc học: mặc định, lưu/đọc lại, giờ hỏng thì dùng mặc định', () => {
    const db = createTestDb();
    expect(getReminderPrefs(db)).toEqual(DEFAULT_REMINDER);
    setReminderPrefs(db, { enabled: false, hour: 7, minute: 5 });
    expect(getReminderPrefs(db)).toEqual({ enabled: false, hour: 7, minute: 5 });
    setSetting(db, SettingKey.reminderTime, '25:00');
    expect(getReminderPrefs(db)).toMatchObject({ hour: 20, minute: 0 });
  });

  it('quyền riêng tư chat: mặc định chưa xác nhận, lưu xong thì true', () => {
    const db = createTestDb();
    expect(hasPrivacyAck(db)).toBe(false);
    setPrivacyAck(db);
    expect(hasPrivacyAck(db)).toBe(true);
  });
});
