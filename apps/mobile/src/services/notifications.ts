import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getReminderPrefs } from '@/db/settings';
import type { Db } from '@/db/types';
import { getStreak } from '@/features/progress/streak';
import { reminderTimes } from './reminder-times';

/**
 * Nhắc học hằng ngày (FR-P-04, S2-12). Lên lịch sẵn 7 thông báo một lần (không cần mạng,
 * không cần server). Gọi lại `syncReminders` mỗi khi mở app, học xong, hoặc đổi cài đặt:
 * hôm nay học rồi thì bỏ lời nhắc hôm nay.
 */

const CHANNEL = 'daily-reminder';

const MESSAGES = [
  'Dành 5 phút luyện vài câu tiếng Anh nhé! 🗣️',
  'Chuỗi ngày học đang chờ bạn. Vào học một bài ngắn thôi! 🔥',
  'Hôm nay bạn đã nói tiếng Anh chưa? Ôn vài câu nào! 📚',
];

let handlerSet = false;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Nhắc học hằng ngày',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Xin quyền thông báo (Android 13+ hỏi người dùng). Trả về đã được phép chưa. */
export async function requestPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Hủy lịch cũ và lên lịch lại theo cài đặt. Lỗi (không có quyền…) thì bỏ qua lặng lẽ. */
export async function syncReminders(db: Db, opts: { ask?: boolean } = {}): Promise<boolean> {
  try {
    if (!handlerSet) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const prefs = getReminderPrefs(db);
    if (!prefs.enabled) return true;
    const granted = opts.ask
      ? await requestPermission()
      : (await Notifications.getPermissionsAsync()).granted;
    if (!granted) return false;
    await ensureChannel();
    const now = Date.now();
    const times = reminderTimes(now, { ...prefs, todayDone: getStreak(db, now).todayDone });
    for (const [i, date] of times.entries()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Đến giờ học rồi!', body: MESSAGES[i % MESSAGES.length] ?? '' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: CHANNEL,
        },
      });
    }
    return true;
  } catch {
    return false;
  }
}
