import {
  DEFAULT_DAILY_MINUTES_GOAL,
  DEFAULT_DAILY_NEW_LIMIT,
  DEFAULT_LEVEL,
  getDailyMinutesGoal,
  getDailyNewLimit,
  getLevel,
  getSetting,
  getTtsPrefs,
  SettingKey,
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
});
