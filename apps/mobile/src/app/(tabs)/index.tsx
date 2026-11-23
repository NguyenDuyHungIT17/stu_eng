import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { getDailyNewLimit, getLevel } from '@/db/settings';
import { countDueToday, getNewPhrases } from '@/features/review/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Trang chủ: số thẻ cần ôn hôm nay, số cụm mới còn lại (FR-V-05). */
export default function HomeScreen() {
  const db = useDb();
  const c = useColors();
  const stats = useFocusQuery(() => {
    const now = Date.now();
    const limit = getDailyNewLimit(db);
    return {
      due: countDueToday(db, now),
      // Số cụm mới thực sự còn để học (≤ mục tiêu ngày, ≤ số cụm chưa học).
      newLeft: getNewPhrases(db, now, { dailyNewLimit: limit, level: getLevel(db) }).length,
      limit,
    };
  });

  const nothing = stats && stats.due === 0 && stats.newLeft === 0;
  return (
    <Screen>
      <Title>Hôm nay</Title>
      {stats ? (
        <Row>
          <Stat label="Thẻ cần ôn" value={stats.due} color={c.primary} />
          <Stat label={`Cụm mới (mục tiêu ${stats.limit})`} value={stats.newLeft} color={c.ok} />
        </Row>
      ) : null}
      {nothing ? (
        <Body muted>Bạn đã xong việc hôm nay. Có thể xem lại cụm từ ở tab Học.</Body>
      ) : (
        <Button
          title={stats?.due ? 'Bắt đầu ôn tập' : 'Học cụm mới'}
          onPress={() => router.push('/review')}
          disabled={!stats}
        />
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const c = useColors();
  return (
    <Card>
      <Text style={{ color, fontSize: 32, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: c.muted }}>{label}</Text>
    </Card>
  );
}
