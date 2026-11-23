import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card } from '@/components/ui';
import { useDb } from '@/db/client';
import { getDailyNewLimit, getLevel } from '@/db/settings';
import {
  ChooseMeaningExercise,
  FlipExercise,
  ListenChooseExercise,
} from '@/features/review/exercises';
import {
  getDueCards,
  getNewPhrases,
  pickDistractors,
  recordReview,
  shuffle,
} from '@/features/review/repository';
import {
  applyRating,
  buildSession,
  currentItem,
  isFinished,
  type SessionState,
} from '@/features/review/session';
import { listTopics } from '@/features/vocab/repository';
import type { Rating } from '@/lib/fsrs';
import { listEnglishVoices } from '@/services/tts';
import { useTts } from '@/services/use-tts';

/** Phiên học/ôn (FR-V-03, FR-V-04a): thẻ đến hạn trước, cụm mới sau. Chạy hoàn toàn offline. */
export default function ReviewScreen() {
  const db = useDb();
  const tts = useTts();
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const canListen = (await listEnglishVoices()).length > 0;
      if (!alive) return;
      try {
        const now = Date.now();
        const due = getDueCards(db, now).map((c) => c.phrase);
        const fresh = getNewPhrases(db, now, {
          dailyNewLimit: getDailyNewLimit(db),
          level: getLevel(db),
        });
        const poolSize = listTopics(db).reduce((n, t) => n + t.phraseCount, 0);
        setSession(buildSession(due, fresh, { canListen, poolSize }));
      } catch (e) {
        setError(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [db]);

  const item = session ? currentItem(session) : undefined;
  const itemKey = item && session ? `${item.phrase.id}-${session.done}` : '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: tính lại đáp án khi sang thẻ mới
  const options = useMemo(
    () => (item ? shuffle([item.phrase, ...pickDistractors(db, item.phrase.id, 3)]) : []),
    [itemKey, db],
  );

  const rate = (rating: Rating) => {
    if (!session || !item) return;
    try {
      recordReview(db, {
        phraseId: item.phrase.id,
        rating,
        exerciseType: item.exercise,
        now: Date.now(),
      });
      tts.stop();
      setSession(applyRating(session, rating));
    } catch (e) {
      setError(`Không lưu được kết quả: ${String(e)}`);
    }
  };

  const speak = (text: string, slow?: boolean) => tts.speak(text, { slow });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Học và ôn tập' }} />
      {error ? <Body>{error}</Body> : null}
      {!session && !error ? <Body muted>Đang chuẩn bị phiên…</Body> : null}
      {session && isFinished(session) ? <Finished session={session} /> : null}
      {session && item ? (
        <>
          <Body muted>
            Thẻ {session.done + 1} · còn {session.queue.length} thẻ
          </Body>
          {item.exercise === 'flip' ? (
            <FlipExercise
              key={itemKey}
              phrase={item.phrase}
              isNew={item.isNew}
              onSpeak={speak}
              onRate={rate}
            />
          ) : item.exercise === 'choose_meaning' ? (
            <ChooseMeaningExercise
              key={itemKey}
              phrase={item.phrase}
              options={options}
              onSpeak={speak}
              onRate={rate}
            />
          ) : (
            <ListenChooseExercise
              key={itemKey}
              phrase={item.phrase}
              options={options}
              onSpeak={speak}
              onRate={rate}
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}

/** Màn kết thúc phiên (FR-V-03). */
function Finished({ session }: { session: SessionState }) {
  const c = useColors();
  if (session.done === 0) {
    return (
      <>
        <Title>Hôm nay đã xong!</Title>
        <Body muted>
          Không còn thẻ cần ôn và đã đủ cụm mới cho hôm nay. Quay lại vào ngày mai nhé.
        </Body>
        <Button title="Về trang chủ" onPress={() => router.back()} />
      </>
    );
  }
  const r = session.ratings;
  return (
    <>
      <Title>Hoàn thành phiên 🎉</Title>
      <Card>
        <Text style={{ color: c.text, fontSize: 17 }}>Đã làm {session.done} lượt</Text>
        <Text style={{ color: c.text }}>Cụm mới đã học: {session.newLearned}</Text>
        <Text style={{ color: c.muted }}>
          Quên {r[1]} · Khó {r[2]} · Được {r[3]} · Dễ {r[4]}
        </Text>
      </Card>
      <Button title="Về trang chủ" onPress={() => router.back()} />
    </>
  );
}
