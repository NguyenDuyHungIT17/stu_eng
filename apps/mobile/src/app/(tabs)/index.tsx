import { router } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { getDailyMinutesGoal, getDailyNewLimit, getLevel } from '@/db/settings';
import { getStats } from '@/features/progress/stats';
import { countDueToday, getNewPhrases } from '@/features/review/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/**
 * Trang chủ: thẻ cần ôn, cụm mới còn lại (FR-V-05), mục tiêu ngày (FR-P-02),
 * streak và thống kê cơ bản (FR-P-03).
 */
export default function HomeScreen() {
  const db = useDb();
  const c = useColors();
  const data = useFocusQuery(() => {
    const now = Date.now();
    const limit = getDailyNewLimit(db);
    return {
      due: countDueToday(db, now),
      // Số cụm mới thực sự còn để học (≤ mục tiêu ngày, ≤ số cụm chưa học).
      newLeft: getNewPhrases(db, now, { dailyNewLimit: limit, level: getLevel(db) }).length,
      limit,
      minutesGoal: getDailyMinutesGoal(db),
      stats: getStats(db, now),
    };
  });

  if (!data) return <Screen>{null}</Screen>;
  const { stats } = data;
  const nothing = data.due === 0 && data.newLeft === 0;
  const minutesDone = stats.todayMinutes >= data.minutesGoal;

  return (
    <Screen>
      <Title>Hôm nay</Title>
      <Text style={{ color: c.text, fontSize: 16 }}>
        🔥 {stats.streak.current} ngày liên tiếp
        {stats.streak.current > 0 && !stats.streak.todayDone ? ' — học hôm nay để giữ chuỗi!' : ''}
      </Text>
      <Row>
        <Stat label="Thẻ cần ôn" value={String(data.due)} color={c.primary} />
        <Stat
          label={`Cụm mới (mục tiêu ${data.limit})`}
          value={String(data.newLeft)}
          color={c.ok}
        />
      </Row>
      <Text style={{ color: minutesDone ? c.ok : c.muted }}>
        ⏱ {stats.todayMinutes}/{data.minutesGoal} phút hôm nay
        {minutesDone ? ' — đạt mục tiêu!' : ''}
      </Text>
      {nothing ? (
        <Body muted>Bạn đã xong việc hôm nay. Có thể xem lại cụm từ ở tab Học.</Body>
      ) : (
        <Button
          title={data.due ? 'Bắt đầu ôn tập' : 'Học cụm mới'}
          onPress={() => router.push('/review')}
        />
      )}

      <Title>Thống kê</Title>
      <Row>
        <Stat label="Cụm đã thuộc" value={`${stats.mastered}/${stats.started}`} color={c.text} />
        <Stat label="Phút đã học" value={String(stats.totalMinutes)} color={c.text} />
        <Stat label="Buổi nói" value={String(stats.chatSessions)} color={c.text} />
      </Row>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const c = useColors();
  return (
    <Card>
      <Text style={{ color, fontSize: 28, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: c.muted }}>{label}</Text>
    </Card>
  );
}
