import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useDb } from '@/db/client';
import { buildReview, type LessonState } from '@/features/lesson/engine';
import { LessonPlayer } from '@/features/lesson/player';
import { getDueCards } from '@/features/review/repository';
import { hasEnglishVoice } from '@/services/tts';

/** Ôn lại câu đến hạn trong ngữ cảnh hội thoại của nó (FR-V-03): tối đa 15 câu một lượt. */
export default function ReviewScreen() {
  const db = useDb();
  const [ready, setReady] = useState<{ state: LessonState; canListen: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const due = getDueCards(db, Date.now(), 15)
        .map((c) => c.phrase)
        .filter((p) => p.dialogueId && p.blank);
      const canListen = due.length > 0 && (await hasEnglishVoice(2000));
      if (alive) setReady({ state: buildReview(due), canListen });
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
          <Text style={{ fontSize: 64 }}>☕</Text>
          <Title>Chưa có câu nào cần ôn</Title>
          <Body muted>Luyện thêm một đoạn hội thoại mới nhé.</Body>
        </View>
        <Button title="Về trang chính" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LessonPlayer
        initial={ready.state}
        dialogue={null}
        canListen={ready.canListen}
        finishTitle="Ôn tập xong!"
      />
    </>
  );
}
