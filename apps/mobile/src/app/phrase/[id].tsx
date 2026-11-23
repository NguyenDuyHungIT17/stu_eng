import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { PhraseCard } from '@/components/phrase-card';
import { Body, Screen } from '@/components/screen';
import { useDb } from '@/db/client';
import { getPhrase } from '@/features/vocab/repository';
import { useTts } from '@/services/use-tts';

/** Chi tiết một cụm từ (FR-V-02). */
export default function PhraseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const tts = useTts();
  const phrase = useMemo(() => getPhrase(db, id), [db, id]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Cụm từ' }} />
      {phrase ? (
        <PhraseCard phrase={phrase} onSpeak={(t, slow) => tts.speak(t, { slow })} />
      ) : (
        <Body muted>Không tìm thấy cụm từ.</Body>
      )}
    </Screen>
  );
}
