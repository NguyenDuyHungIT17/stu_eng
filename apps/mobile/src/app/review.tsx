import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useDb } from '@/db/client';
import { buildReview, type LessonState } from '@/features/lesson/engine';
import { LessonPlayer } from '@/features/lesson/player';
import { getDueCards } from '@/features/review/repository';
import { listTopics } from '@/features/vocab/repository';
import { hasEnglishVoice } from '@/services/tts';

/** Ôn tập thẻ đến hạn (FR-V-03): tối đa 20 câu một lượt, chạy offline. */
export default function ReviewScreen() {
  const db = useDb();
  const [ready, setReady] = useState<{ state: LessonState; canListen: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const due = getDueCards(db, Date.now(), 20).map((c) => c.phrase);
      const poolSize = listTopics(db).reduce((n, t) => n + t.phraseCount, 0);
      const canListen = due.length > 0 && (await hasEnglishVoice(2000));
      if (alive) setReady({ state: buildReview(due, { canListen, poolSize }), canListen });
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  if (!ready) return <Stack.Screen options={{ headerShown: false }} />;
  if (ready.state.steps.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ôn tập' }} />
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
          <Text style={{ fontSize: 72 }}>🌟</Text>
          <Title>Không có câu nào cần ôn</Title>
          <Body muted>Học thêm bài mới trên lộ trình nhé.</Body>
        </View>
        <Button title="Về trang chủ" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LessonPlayer initial={ready.state} canListen={ready.canListen} finishTitle="Ôn tập xong!" />
    </>
  );
}
