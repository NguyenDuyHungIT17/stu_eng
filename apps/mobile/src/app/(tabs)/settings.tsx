import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card, OutlineButton, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import {
  getDailyMinutesGoal,
  getDailyNewLimit,
  MINUTES_GOAL_CHOICES,
  NEW_LIMIT_CHOICES,
  SettingKey,
  setSetting,
} from '@/db/settings';
import { API_BASE_URL } from '@/lib/config';

/** Cài đặt: mục tiêu học mỗi ngày (FR-P-02). Các mục khác thêm ở Sprint 2/4. */
export default function SettingsScreen() {
  const db = useDb();
  const c = useColors();
  const [newLimit, setNewLimit] = useState(() => getDailyNewLimit(db));
  const [minutes, setMinutes] = useState(() => getDailyMinutesGoal(db));

  const choose = (key: SettingKey, value: number, set: (v: number) => void) => {
    setSetting(db, key, String(value));
    set(value);
  };

  return (
    <Screen>
      <Title>Cài đặt</Title>

      <Card>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>Cụm mới mỗi ngày</Text>
        <Row>
          {NEW_LIMIT_CHOICES.map((n) => (
            <OutlineButton
              key={n}
              title={String(n)}
              accessibilityLabel={`${n} cụm mới mỗi ngày`}
              selected={newLimit === n}
              onPress={() => choose(SettingKey.dailyNewLimit, n, setNewLimit)}
            />
          ))}
        </Row>
      </Card>

      <Card>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>Số phút học mỗi ngày</Text>
        <Row>
          {MINUTES_GOAL_CHOICES.map((n) => (
            <OutlineButton
              key={n}
              title={String(n)}
              accessibilityLabel={`${n} phút mỗi ngày`}
              selected={minutes === n}
              onPress={() => choose(SettingKey.dailyMinutesGoal, n, setMinutes)}
            />
          ))}
        </Row>
      </Card>

      <Body muted>API: {API_BASE_URL}</Body>
      <Button title="Kiểm tra kỹ thuật (Sprint 0)" onPress={() => router.push('/dev/spikes')} />
    </Screen>
  );
}
