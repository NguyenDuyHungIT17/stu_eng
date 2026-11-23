import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardShadow, useColors } from '@/components/theme';
import { ProgressBar } from '@/components/ui';
import { useDb } from '@/db/client';
import { getDailyMinutesGoal } from '@/db/settings';
import {
  type DialogueSummary,
  listSections,
  nextDialogue,
  type TopicSection,
} from '@/features/dialogue/repository';
import { topicIcon } from '@/features/dialogue/topic-icons';
import { getStats } from '@/features/progress/stats';
import { countDueToday } from '@/features/review/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;

/**
 * Trang chính gọn trong một màn hình: luyện tiếp, ôn lại, rồi chọn trình độ → lưới chủ đề.
 * Danh sách tình huống của từng chủ đề nằm ở màn chủ đề.
 */
export default function HomeScreen() {
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState<string | null>(null);
  const data = useFocusQuery(() => {
    const now = Date.now();
    const sections = listSections(db);
    return {
      sections,
      next: nextDialogue(sections),
      due: countDueToday(db, now),
      stats: getStats(db, now),
      minutesGoal: getDailyMinutesGoal(db),
    };
  });

  if (!data) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const { stats, next } = data;
  const nextLevel = data.sections.find((s) => s.id === next?.topicId)?.level ?? 'A1';
  const current = level ?? nextLevel;
  const topics = data.sections.filter((s) => s.level === current);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <Text style={[styles.hello, { color: c.text }]}>Hôm nay nói gì nhỉ? 👋</Text>
        <View style={styles.chips}>
          <Chip text={`🔥 ${stats.streak.current}`} active={stats.streak.todayDone} />
          <Chip
            text={`⏱ ${stats.todayMinutes}/${data.minutesGoal}′`}
            active={stats.todayMinutes >= data.minutesGoal}
          />
        </View>
      </View>

      {next ? <NextCard d={next} /> : null}

      {data.due > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/review')}
          style={[styles.review, { backgroundColor: c.surface }, cardShadow(c)]}
        >
          <Text style={{ fontSize: 20 }}>🔁</Text>
          <Text style={{ color: c.text, fontWeight: '600', flex: 1 }}>
            Ôn lại {data.due} câu đã học
          </Text>
          <Text style={{ color: c.accent, fontSize: 20 }}>›</Text>
        </Pressable>
      ) : null}

      <View style={styles.levelRow}>
        {LEVELS.map((l) => {
          const on = l === current;
          return (
            <Pressable
              key={l}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setLevel(l)}
              style={[styles.level, { backgroundColor: on ? c.primary : c.surface }]}
            >
              <Text style={{ color: on ? c.onPrimary : c.muted, fontWeight: '700' }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {topics.map((t) => (
          <TopicTile key={t.id} t={t} />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ text, active }: { text: string; active: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: active ? c.okSoft : c.surface }]}>
      <Text style={{ color: active ? c.ok : c.text, fontWeight: '600', fontSize: 13 }}>{text}</Text>
    </View>
  );
}

function NextCard({ d }: { d: DialogueSummary }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Luyện: ${d.title}`}
      onPress={() => router.push({ pathname: '/lesson', params: { dialogue: d.id } })}
      style={({ pressed }) => [
        styles.next,
        { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.nextKicker}>
          {topicIcon(d.topicId)} {d.learned > 0 ? 'Luyện tiếp' : 'Tình huống tiếp theo'}
        </Text>
        <Text style={styles.nextTitle} numberOfLines={1}>
          {d.title}
        </Text>
        <Text style={styles.nextSituation} numberOfLines={2}>
          {d.situationVi}
        </Text>
      </View>
      <View style={styles.playCircle}>
        <Text style={{ color: c.primary, fontSize: 20, marginLeft: 3 }}>▶</Text>
      </View>
    </Pressable>
  );
}

function TopicTile({ t }: { t: TopicSection }) {
  const c = useColors();
  const done = t.dialogues.filter((d) => d.done).length;
  const started = t.dialogues.some((d) => d.learned > 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.title}, ${done} trên ${t.dialogues.length} tình huống`}
      onPress={() => router.push({ pathname: '/topic/[id]', params: { id: t.id } })}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: c.surface, opacity: pressed ? 0.8 : 1 },
        cardShadow(c),
      ]}
    >
      <Text style={styles.tileIcon}>{topicIcon(t.id)}</Text>
      <Text style={[styles.tileTitle, { color: c.text }]} numberOfLines={2}>
        {t.title}
      </Text>
      <View style={styles.tileFoot}>
        <ProgressBar
          value={t.dialogues.length ? done / t.dialogues.length : 0}
          color={done === t.dialogues.length && done > 0 ? c.ok : c.primary}
        />
        <Text style={{ color: started ? c.primary : c.muted, fontSize: 12, fontWeight: '600' }}>
          {done}/{t.dialogues.length}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hello: { fontSize: 22, fontWeight: '700', flex: 1 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  next: { borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextKicker: { color: '#FFFFFFB3', fontWeight: '600', fontSize: 13 },
  nextTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  nextSituation: { color: '#FFFFFFE0', fontSize: 14, lineHeight: 20 },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelRow: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12, paddingTop: 2 },
  tile: { width: '31.5%', borderRadius: 16, padding: 12, gap: 6, minHeight: 112 },
  tileIcon: { fontSize: 26 },
  tileTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19, flex: 1 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
