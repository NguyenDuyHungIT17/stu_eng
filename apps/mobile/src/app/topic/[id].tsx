import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Body, Screen } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card } from '@/components/ui';
import { useDb } from '@/db/client';
import { listPhrasesByTopic, listTopics } from '@/features/vocab/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Danh sách cụm của một chủ đề (FR-V-01). */
export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const c = useColors();
  const data = useFocusQuery(
    () => ({
      topic: listTopics(db).find((t) => t.id === id),
      phrases: listPhrasesByTopic(db, id),
    }),
    id,
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: data?.topic?.title ?? 'Chủ đề' }} />
      {data && data.phrases.length === 0 ? <Body muted>Chủ đề này chưa có cụm từ.</Body> : null}
      {data?.phrases.map((p) => (
        <Card
          key={p.id}
          accessibilityLabel={`${p.text}: ${p.meaningVi}`}
          onPress={() => router.push({ pathname: '/phrase/[id]', params: { id: p.id } })}
        >
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{p.text}</Text>
          <Text style={{ color: c.muted }}>{p.meaningVi}</Text>
        </Card>
      ))}
    </Screen>
  );
}
