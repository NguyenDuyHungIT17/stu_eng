import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Button } from '@/components/button';
import { PhraseCard } from '@/components/phrase-card';
import { Body, Screen } from '@/components/screen';
import { useDb } from '@/db/client';
import { findNoteBySource, saveFromPhrase } from '@/features/notes/repository';
import { getPhrase } from '@/features/vocab/repository';
import { useFocusQuery } from '@/lib/use-focus-query';
import { useTts } from '@/services/use-tts';

/** Chi tiết một cụm từ (FR-V-02), lưu nhanh vào ghi chú (FR-N-05). */
export default function PhraseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const tts = useTts();
  const phrase = useMemo(() => getPhrase(db, id), [db, id]);
  const saved = useFocusQuery(() => findNoteBySource(db, 'vocab', id), id);

  const openNote = (noteId: string) =>
    router.push({ pathname: '/notes/[id]', params: { id: noteId } });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Cụm từ' }} />
      {phrase ? (
        <>
          <PhraseCard phrase={phrase} onSpeak={(t, slow) => tts.speak(t, { slow })} />
          {saved ? (
            <Button title="📝 Đã lưu — mở ghi chú" onPress={() => openNote(saved.id)} />
          ) : (
            <Button
              title="📝 Lưu vào ghi chú"
              onPress={() => openNote(saveFromPhrase(db, phrase, Date.now()).id)}
            />
          )}
        </>
      ) : (
        <Body muted>Không tìm thấy cụm từ.</Body>
      )}
    </Screen>
  );
}
