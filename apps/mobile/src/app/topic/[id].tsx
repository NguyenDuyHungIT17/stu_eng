import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar, Badge } from '@/components/ui';
import { useDb } from '@/db/client';
import { LEARNER, speakerColor } from '@/features/dialogue/bubbles';
import { type DialogueSummary, listSections } from '@/features/dialogue/repository';
import { topicIcon } from '@/features/dialogue/topic-icons';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Một chủ đề: các tình huống (thường 4) gọn trong một màn hình. */
export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const c = useColors();
  const topic = useFocusQuery(() => listSections(db).find((s) => s.id === id) ?? null, id);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <Stack.Screen options={{ title: topic ? `${topicIcon(topic.id)} ${topic.title}` : '' }} />
      {topic ? (
        <>
          <View style={styles.head}>
            <Badge text={topic.level} color={c.primary} />
            <Text style={{ color: c.muted }}>
              {topic.dialogues.length} tình huống · chọn một để xem và luyện
            </Text>
          </View>
          {topic.dialogues.map((d, i) => (
            <Situation key={d.id} d={d} n={i + 1} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function Situation({ d, n }: { d: DialogueSummary; n: number }) {
  const c = useColors();
  const status = d.done ? '✓ Đã luyện' : d.learned > 0 ? `${d.learned}/${d.keyLines} câu` : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.title}${d.done ? ', đã luyện' : ''}`}
      onPress={() => router.push({ pathname: '/dialogue/[id]', params: { id: d.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
        cardShadow(c),
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.num, { color: c.primary, backgroundColor: c.primarySoft }]}>{n}</Text>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {d.title}
        </Text>
        {status ? (
          <Text style={{ color: d.done ? c.ok : c.primary, fontSize: 12, fontWeight: '700' }}>
            {status}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
        {d.situationVi}
      </Text>
      <View style={styles.people}>
        <Avatar name={d.speakers.a.name} color={speakerColor(c, 'a')} size={22} />
        <Text style={{ color: c.muted, fontSize: 13 }}>{d.speakers.a.name}</Text>
        <Avatar name={d.speakers.b.name} color={speakerColor(c, LEARNER)} size={22} />
        <Text style={{ color: c.muted, fontSize: 13 }}>{d.speakers.b.name} (bạn)</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { borderRadius: 18, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '700',
    overflow: 'hidden',
  },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
