import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar, Badge } from '@/components/ui';
import { useDb } from '@/db/client';
import { getDailyMinutesGoal } from '@/db/settings';
import { LEARNER, speakerColor } from '@/features/dialogue/bubbles';
import { type DialogueSummary, listSections, nextDialogue } from '@/features/dialogue/repository';
import { getStats } from '@/features/progress/stats';
import { countDueToday } from '@/features/review/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/**
 * Trang chính: hội thoại nên luyện tiếp, câu cần ôn, và thư viện hội thoại theo chủ đề.
 * Mọi hội thoại đều mở sẵn, người học chọn tình huống mình cần.
 */
export default function HomeScreen() {
  const db = useDb();
  const c = useColors();
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
  const doneCount = data.sections.reduce((n, s) => n + s.dialogues.filter((d) => d.done).length, 0);
  const total = data.sections.reduce((n, s) => n + s.dialogues.length, 0);

  return (
    <Screen tab>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.muted, fontSize: 14 }}>Luyện giao tiếp</Text>
          <Text style={[styles.hello, { color: c.text }]}>Hôm nay nói gì nhỉ? 👋</Text>
        </View>
      </View>
      <View style={styles.chips}>
        <Chip text={`🔥 ${stats.streak.current} ngày`} active={stats.streak.todayDone} />
        <Chip
          text={`⏱ ${stats.todayMinutes}/${data.minutesGoal} phút`}
          active={stats.todayMinutes >= data.minutesGoal}
        />
        <Chip text={`💬 ${doneCount}/${total} hội thoại`} active={false} />
      </View>

      {next ? <NextCard d={next} /> : null}

      {data.due > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/review')}
          style={[styles.review, { backgroundColor: c.surface }, cardShadow(c)]}
        >
          <View style={[styles.reviewIcon, { backgroundColor: c.accentSoft }]}>
            <Text style={{ fontSize: 22 }}>🔁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>
              Ôn lại câu đã học
            </Text>
            <Text style={{ color: c.muted }}>{data.due} câu đến hạn, luyện trong ngữ cảnh</Text>
          </View>
          <Text style={{ color: c.accent, fontSize: 22 }}>›</Text>
        </Pressable>
      ) : null}

      {data.sections.map((s) => (
        <View key={s.id} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{s.title}</Text>
            <Badge text={s.level} />
          </View>
          {s.dialogues.map((d) => (
            <DialogueRow key={d.id} d={d} />
          ))}
        </View>
      ))}
    </Screen>
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
    <View style={[styles.next, { backgroundColor: c.primary }]}>
      <Text style={{ color: '#FFFFFFB3', fontWeight: '600', fontSize: 13 }}>
        {d.learned > 0 ? 'Luyện tiếp' : 'Tình huống tiếp theo'} · {d.level}
      </Text>
      <Text style={styles.nextTitle}>{d.title}</Text>
      <Text style={styles.nextSituation} numberOfLines={3}>
        {d.situationVi}
      </Text>
      <View style={styles.pair}>
        <Avatar name={d.speakers.a.name} color={c.accent} size={30} />
        <Text style={{ color: '#FFFFFF', flexShrink: 1 }}>
          {d.speakers.a.name} và {d.speakers.b.name} (bạn)
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/lesson', params: { dialogue: d.id } })}
        style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 16 }}>Bắt đầu luyện</Text>
      </Pressable>
    </View>
  );
}

function DialogueRow({ d }: { d: DialogueSummary }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.title}${d.done ? ', đã luyện' : ''}`}
      onPress={() => router.push({ pathname: '/dialogue/[id]', params: { id: d.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, opacity: pressed ? 0.8 : 1 },
        cardShadow(c),
      ]}
    >
      <View style={styles.avatars}>
        <Avatar name={d.speakers.a.name} color={speakerColor(c, 'a')} size={30} />
        <View style={styles.avatarB}>
          <Avatar name={d.speakers.b.name} color={speakerColor(c, LEARNER)} size={30} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{d.title}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={2}>
          {d.situationVi}
        </Text>
      </View>
      <Text style={{ color: d.done ? c.ok : c.muted, fontSize: 13, fontWeight: '600' }}>
        {d.done ? '✓' : d.learned > 0 ? `${d.learned}/${d.keyLines}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  hello: { fontSize: 24, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  next: { borderRadius: 22, padding: 18, gap: 8 },
  nextTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  nextSituation: { color: '#FFFFFFE6', fontSize: 15, lineHeight: 22 },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  nextBtn: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 10, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 19, fontWeight: '700' },
  row: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatars: { width: 48, height: 40 },
  avatarB: { position: 'absolute', right: 0, bottom: 0 },
});
