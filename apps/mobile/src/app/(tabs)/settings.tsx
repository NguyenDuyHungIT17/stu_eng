import { LEVELS, type Level } from '@app/shared';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Screen, Title } from '@/components/screen';
import { useColors, useThemePreference } from '@/components/theme';
import { Card, OutlineButton, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { resetAllData } from '@/db/reset';
import {
  getDailyMinutesGoal,
  getDailyNewLimit,
  getLearningGoal,
  getLevel,
  getReminderPrefs,
  getTtsPrefs,
  LEARNING_GOALS,
  type LearningGoal,
  MINUTES_GOAL_CHOICES,
  NEW_LIMIT_CHOICES,
  REMINDER_HOUR_CHOICES,
  type ReminderPrefs,
  SettingKey,
  setReminderPrefs,
  setSetting,
  THEME_MODES,
  type ThemeMode,
} from '@/db/settings';
import { getStats } from '@/features/progress/stats';
import { useFocusQuery } from '@/lib/use-focus-query';
import { cancelAllReminders, syncReminders } from '@/services/notifications';
import {
  DEFAULT_RATE,
  type EnglishVoice,
  listEnglishVoices,
  RATES,
  speak,
  stop,
} from '@/services/tts';

/**
 * Hồ sơ & Cài đặt đầy đủ (FR-P-02..04, FR-U-01, FR-U-05):
 * thống kê, trình độ, mục tiêu, giọng/tốc độ đọc, sáng/tối, nhắc học, xóa toàn bộ dữ liệu.
 */
export default function ProfileScreen() {
  const db = useDb();
  const c = useColors();
  const theme = useThemePreference();
  const stats = useFocusQuery(() => getStats(db, Date.now()));

  const [level, setLevel] = useState<Level>(() => getLevel(db));
  const [goal, setGoal] = useState<LearningGoal>(() => getLearningGoal(db));
  const [newLimit, setNewLimit] = useState(() => getDailyNewLimit(db));
  const [minutes, setMinutes] = useState(() => getDailyMinutesGoal(db));
  const [reminder, setReminder] = useState(() => getReminderPrefs(db));
  const [ttsPrefs, setTtsPrefs] = useState(() => getTtsPrefs(db));
  const [voices, setVoices] = useState<EnglishVoice[]>([]);
  const [showVoices, setShowVoices] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void listEnglishVoices().then(setVoices);
    return () => stop();
  }, []);

  const chooseInt = (key: SettingKey, value: number, set: (v: number) => void) => {
    setSetting(db, key, String(value));
    set(value);
  };

  const chooseLevel = (next: Level) => {
    setSetting(db, SettingKey.level, next);
    setLevel(next);
  };

  const chooseGoal = (next: LearningGoal) => {
    setSetting(db, SettingKey.learningGoal, next);
    setGoal(next);
  };

  const chooseRate = (rate: number) => {
    setSetting(db, SettingKey.ttsRate, String(rate));
    setTtsPrefs((p) => ({ ...p, rate }));
    speak('How are you doing today?', { voice: ttsPrefs.voice, rate });
  };

  const chooseVoice = (voiceId: string | null) => {
    if (voiceId) setSetting(db, SettingKey.ttsVoice, voiceId);
    else setSetting(db, SettingKey.ttsVoice, '');
    setTtsPrefs((p) => ({ ...p, voice: voiceId }));
    speak('Nice to meet you!', { voice: voiceId, rate: ttsPrefs.rate });
  };

  const updateReminder = (next: ReminderPrefs) => {
    setReminderPrefs(db, next);
    setReminder(next);
    void syncReminders(db, { ask: next.enabled }).then((ok) => setDenied(next.enabled && !ok));
  };

  const confirmReset = () => {
    Alert.alert(
      'Xóa toàn bộ dữ liệu học?',
      'Mọi tiến độ ôn tập, ghi chú, chuỗi ngày học và lịch sử trò chuyện AI trên máy sẽ bị xóa vĩnh viễn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa sạch',
          style: 'destructive',
          onPress: () => {
            void cancelAllReminders();
            resetAllData(db);
            theme.setMode('system');
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const tiles = stats
    ? [
        { icon: '🔥', value: stats.streak.current, label: 'Ngày liên tiếp', color: c.accent },
        { icon: '⭐', value: stats.mastered, label: 'Câu đã thuộc', color: c.gold },
        { icon: '📚', value: stats.started, label: 'Câu đã học', color: c.primary },
        { icon: '⏱', value: stats.totalMinutes, label: 'Phút đã học', color: c.primary },
      ]
    : [];

  const activeRate = ttsPrefs.rate ?? DEFAULT_RATE;
  const activeVoiceName = voices.find((v) => v.id === ttsPrefs.voice)?.name ?? 'Mặc định của máy';

  return (
    <Screen tab>
      <Title>Hồ sơ</Title>
      {stats ? (
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
      ) : (
        <Card>
          <Text style={{ color: c.muted }}>Đang tải thống kê học tập…</Text>
        </Card>
      )}

      <Text style={[styles.section, { color: c.text }]}>Trình độ & mục tiêu</Text>
      <Card>
        <Text style={[styles.label, { color: c.text }]}>Trình độ của bạn</Text>
        <Row>
          {LEVELS.map((lv) => (
            <OutlineButton
              key={lv}
              title={lv}
              selected={level === lv}
              onPress={() => chooseLevel(lv)}
            />
          ))}
        </Row>
        <OutlineButton
          title="🎯 Làm lại bài xếp trình độ"
          onPress={() => router.push({ pathname: '/onboarding', params: { step: 'placement' } })}
        />
        <Text style={[styles.label, { color: c.text, marginTop: 6 }]}>Mục tiêu chính</Text>
        <Row>
          {LEARNING_GOALS.map((g) => (
            <OutlineButton
              key={g.id}
              title={g.label}
              selected={goal === g.id}
              onPress={() => chooseGoal(g.id)}
            />
          ))}
        </Row>
      </Card>

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
              onPress={() => chooseInt(SettingKey.dailyMinutesGoal, n, setMinutes)}
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
              onPress={() => chooseInt(SettingKey.dailyNewLimit, n, setNewLimit)}
            />
          ))}
        </Row>
      </Card>

      <Text style={[styles.section, { color: c.text }]}>Giọng đọc & giao diện</Text>
      <Card>
        <Text style={[styles.label, { color: c.text }]}>Tốc độ đọc tiếng Anh</Text>
        <Row>
          {RATES.map((r) => (
            <OutlineButton
              key={r}
              title={`${r}×`}
              selected={Math.abs(activeRate - r) < 0.01}
              onPress={() => chooseRate(r)}
            />
          ))}
        </Row>
        <Text style={[styles.label, { color: c.text, marginTop: 6 }]}>
          Giọng đọc: {activeVoiceName}
        </Text>
        <Row>
          <OutlineButton
            title={showVoices ? 'Ẩn danh sách giọng' : `Chọn giọng (${voices.length})`}
            onPress={() => setShowVoices((v) => !v)}
          />
          <OutlineButton
            title="🔊 Nghe thử"
            onPress={() =>
              speak('Hello! Nice to meet you.', { voice: ttsPrefs.voice, rate: ttsPrefs.rate })
            }
          />
        </Row>
        {showVoices ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <OutlineButton
              title="Mặc định của máy"
              selected={!ttsPrefs.voice}
              onPress={() => chooseVoice(null)}
            />
            {voices.slice(0, 8).map((v) => (
              <OutlineButton
                key={v.id}
                title={`${v.name} (${v.language})`}
                selected={ttsPrefs.voice === v.id}
                onPress={() => chooseVoice(v.id)}
              />
            ))}
          </View>
        ) : null}

        <Text style={[styles.label, { color: c.text, marginTop: 8 }]}>Giao diện sáng / tối</Text>
        <Row>
          {THEME_MODES.map((t) => (
            <OutlineButton
              key={t.id}
              title={t.label}
              selected={theme.mode === t.id}
              onPress={() => theme.setMode(t.id as ThemeMode)}
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

      <Text style={[styles.section, { color: c.text }]}>Dữ liệu</Text>
      <Card>
        <Text style={{ color: c.muted, lineHeight: 20 }}>
          Toàn bộ dữ liệu học nằm trên điện thoại này. Bạn có thể xóa sạch để bắt đầu lại từ đầu.
        </Text>
        <Button title="Xóa toàn bộ dữ liệu" variant="danger" onPress={confirmReset} />
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
