import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Body, Screen } from '@/components/screen';
import { useDb } from '@/db/client';
import { buildLesson, type LessonState } from '@/features/lesson/engine';
import { getLessonPhrases } from '@/features/lesson/path';
import { LessonPlayer } from '@/features/lesson/player';
import { hasEnglishVoice } from '@/services/tts';

/** Một bài học trên lộ trình: 5 câu mới của một chủ đề (FR-V-03, FR-V-04a). */
export default function LessonScreen() {
  const { topic, n } = useLocalSearchParams<{ topic: string; n: string }>();
  const db = useDb();
  const [ready, setReady] = useState<{ state: LessonState; canListen: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const phrases = getLessonPhrases(db, topic, Number(n) || 0);
      // Engine TTS đã được khởi động lúc mở app; chờ tối đa 2 giây.
      const canListen = await hasEnglishVoice(2000);
      if (alive) setReady({ state: buildLesson(phrases, { canListen }), canListen });
    })();
    return () => {
      alive = false;
    };
  }, [db, topic, n]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {ready ? (
        ready.state.steps.length > 0 ? (
          <LessonPlayer
            initial={ready.state}
            canListen={ready.canListen}
            finishTitle="Hoàn thành bài học!"
          />
        ) : (
          <Screen>
            <Body muted>Bài học này chưa có câu nào.</Body>
          </Screen>
        )
      ) : null}
    </>
  );
}
