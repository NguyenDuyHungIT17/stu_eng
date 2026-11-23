import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card, OutlineButton, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import {
  getDailyMinutesGoal,
  getDailyNewLimit,
  getReminderPrefs,
  MINUTES_GOAL_CHOICES,
  NEW_LIMIT_CHOICES,
  REMINDER_HOUR_CHOICES,
  type ReminderPrefs,
  SettingKey,
  setReminderPrefs,
  setSetting,
} from '@/db/settings';
import { getStats } from '@/features/progress/stats';
import { useFocusQuery } from '@/lib/use-focus-query';
import { syncReminders } from '@/services/notifications';

/** Hồ sơ: thành tích (FR-P-03), mục tiêu ngày (FR-P-02), nhắc học (FR-P-04). */
export default function ProfileScreen() {
  const db = useDb();
  const c = useColors();
  const stats = useFocusQuery(() => getStats(db, Date.now()));
  const [newLimit, setNewLimit] = useState(() => getDailyNewLimit(db));
  const [minutes, setMinutes] = useState(() => getDailyMinutesGoal(db));
  const [reminder, setReminder] = useState(() => getReminderPrefs(db));
  const [denied, setDenied] = useState(false);

  const choose = (key: SettingKey, value: number, set: (v: number) => void) => {
    setSetting(db, key, String(value));
    set(value);
  };
  const updateReminder = (next: ReminderPrefs) => {
    setReminderPrefs(db, next);
    setReminder(next);
    void syncReminders(db, { ask: next.enabled }).then((ok) => setDenied(next.enabled && !ok));
  };

  const tiles = stats
    ? [
        { icon: '🔥', value: stats.streak.current, label: 'Ngày liên tiếp', color: c.orange },
        { icon: '⭐', value: stats.mastered, label: 'Câu đã thuộc', color: c.gold },
        { icon: '📚', value: stats.started, label: 'Câu đã học', color: c.primary },
        { icon: '⏱', value: stats.totalMinutes, label: 'Phút đã học', color: c.blue },
      ]
    : [];

  return (
    <Screen tab>
      <Title>Hồ sơ</Title>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <View key={t.label} style={[styles.tile, { borderColor: c.border }]}>
            <Text style={[styles.tileValue, { color: t.color }]}>
              {t.icon} {t.value}
            </Text>
            <Text style={{ color: c.muted, fontWeight: '600' }}>{t.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: c.text }]}>Mục tiêu mỗi ngày</Text>
      <Card>
        <Text style={[styles.label, { color: c.text }]}>Số phút học</Text>
        <Row>
          {MINUTES_GOAL_CHOICES.map((n) => (
            <OutlineButton
              key={n}
              title={`${n}′`}
              accessibilityLabel={`${n} phút mỗi ngày`}
              selected={minutes === n}
              onPress={() => choose(SettingKey.dailyMinutesGoal, n, setMinutes)}
            />
          ))}
        </Row>
        <Text style={[styles.label, { color: c.text, marginTop: 8 }]}>Câu mới</Text>
        <Row>
          {NEW_LIMIT_CHOICES.map((n) => (
            <OutlineButton
              key={n}
              title={String(n)}
              accessibilityLabel={`${n} câu mới mỗi ngày`}
              selected={newLimit === n}
              onPress={() => choose(SettingKey.dailyNewLimit, n, setNewLimit)}
            />
          ))}
        </Row>
      </Card>

      <Text style={[styles.section, { color: c.text }]}>Nhắc học</Text>
      <Card>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.text, flex: 1 }]}>Nhắc tôi học mỗi ngày</Text>
          <Switch
            accessibilityLabel="Bật nhắc học"
            value={reminder.enabled}
            onValueChange={(enabled) => updateReminder({ ...reminder, enabled })}
          />
        </View>
        {reminder.enabled ? (
          <Row>
            {REMINDER_HOUR_CHOICES.map((h) => (
              <OutlineButton
                key={h}
                title={`${h}h`}
                accessibilityLabel={`Nhắc lúc ${h} giờ`}
                selected={reminder.hour === h && reminder.minute === 0}
                onPress={() => updateReminder({ ...reminder, hour: h, minute: 0 })}
              />
            ))}
          </Row>
        ) : null}
        {denied ? (
          <Text style={{ color: c.danger }}>
            Chưa có quyền gửi thông báo. Hãy bật trong Cài đặt của máy.
          </Text>
        ) : (
          <Text style={{ color: c.muted }}>Hôm nào học xong rồi thì app sẽ không nhắc nữa.</Text>
        )}
      </Card>

      <Pressable
        accessibilityLabel="Thông tin phiên bản. Nhấn giữ để mở trang kiểm tra kỹ thuật"
        onLongPress={() => router.push('/dev/spikes')}
      >
        <Text style={{ color: c.muted, textAlign: 'center', marginTop: 12 }}>
          Phiên bản {Constants.expoConfig?.version ?? '?'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    padding: 14,
    gap: 2,
  },
  tileValue: { fontSize: 24, fontWeight: '800' },
  section: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  label: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
});
