import { router } from 'expo-router';
import { Text } from 'react-native';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Badge, Card, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { listTopics } from '@/features/vocab/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Tab Học: danh sách chủ đề (FR-V-01). */
export default function LearnScreen() {
  const db = useDb();
  const c = useColors();
  const topics = useFocusQuery(() => listTopics(db));

  return (
    <Screen>
      <Title>Chủ đề</Title>
      {topics?.length === 0 ? <Body muted>Chưa có chủ đề nào.</Body> : null}
      {topics?.map((t) => (
        <Card
          key={t.id}
          accessibilityLabel={`${t.title}, đã học ${t.learnedCount} trên ${t.phraseCount} cụm`}
          onPress={() => router.push({ pathname: '/topic/[id]', params: { id: t.id } })}
        >
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{t.title}</Text>
          <Row>
            <Badge text={t.level} />
            <Text style={{ color: c.muted }}>
              Đã học {t.learnedCount}/{t.phraseCount} cụm
            </Text>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
