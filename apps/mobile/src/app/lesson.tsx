import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Body, Screen } from '@/components/screen';
import { useDb } from '@/db/client';
import { type DialogueWithLines, getDialogue } from '@/features/dialogue/repository';
import { buildDialogueLesson, type LessonState } from '@/features/lesson/engine';
import { LessonPlayer } from '@/features/lesson/player';
import { hasEnglishVoice } from '@/services/tts';

/** Luyện một đoạn hội thoại: tình huống → nghe → điền → nhập vai. */
export default function LessonScreen() {
  const { dialogue: id } = useLocalSearchParams<{ dialogue: string }>();
  const db = useDb();
  const [ready, setReady] = useState<{
    dialogue: DialogueWithLines | null;
    state: LessonState;
    canListen: boolean;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const dialogue = getDialogue(db, id);
      // Engine TTS đã được khởi động lúc mở app; chờ tối đa 2 giây.
      const canListen = await hasEnglishVoice(2000);
      if (alive)
        setReady({ dialogue, state: buildDialogueLesson(dialogue?.lines ?? []), canListen });
    })();
    return () => {
      alive = false;
    };
  }, [db, id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {ready ? (
        ready.dialogue && ready.dialogue.lines.length > 0 ? (
          <LessonPlayer
            initial={ready.state}
            dialogue={ready.dialogue}
            canListen={ready.canListen}
            finishTitle="Bạn đã luyện xong đoạn hội thoại!"
          />
        ) : (
          <Screen>
            <Body muted>Không tìm thấy đoạn hội thoại này.</Body>
          </Screen>
        )
      ) : null}
    </>
  );
}
