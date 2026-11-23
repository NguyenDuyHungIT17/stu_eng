import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { useColors } from '@/components/theme';
import { ProgressBar } from '@/components/ui';
import { useDb } from '@/db/client';
import { useStudyTimer } from '@/features/progress/use-study-timer';
import { syncReminders } from '@/services/notifications';
import { useTts } from '@/services/use-tts';
import { pickDistractors, recordReview, shuffle } from '../review/repository';
import {
  accuracy,
  advance,
  answer,
  buildTiles,
  currentStep,
  finishedPhraseAt,
  isDone,
  type LessonState,
  progress,
  ratingFor,
  sameSentence,
  tokenize,
} from './engine';
import { BuildStep, ChoiceStep, IntroStep, SpeakButtons } from './steps';

const PRAISE = ['Tuyệt vời!', 'Chính xác!', 'Giỏi lắm!', 'Hay quá!', 'Chuẩn luôn!'];

/**
 * Chạy một bài học/phiên ôn: thanh tiến độ, từng bước, nút KIỂM TRA, dải phản hồi đúng/sai,
 * màn kết thúc. Mỗi cụm được ghi vào FSRS khi xong bước cuối của nó trong phiên.
 */
export function LessonPlayer({
  initial,
  canListen,
  finishTitle,
}: {
  initial: LessonState;
  canListen: boolean;
  finishTitle: string;
}) {
  const db = useDb();
  const c = useColors();
  const tts = useTts();
  const insets = useSafeAreaInsets();
  useStudyTimer(db);
  const startedAt = useRef(Date.now());
  const finishedAt = useRef<number | null>(null);
  const [state, setState] = useState(initial);
  const [chosen, setChosen] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<null | { correct: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  const step = currentStep(state);
  const stepKey = step ? `${state.index}-${step.phrase.id}-${step.kind}` : 'done';

  // Đáp án nhiễu / ô chữ: tính một lần cho mỗi bước.
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ tính lại khi sang bước mới
  const extras = useMemo(() => {
    if (!step || step.kind === 'intro') return { options: [], tiles: [] };
    if (step.kind === 'build_sentence') {
      const others = pickDistractors(db, step.phrase.id, 2).map((p) => p.text);
      return { options: [], tiles: buildTiles(step.phrase.text, others) };
    }
    return {
      options: shuffle([step.phrase, ...pickDistractors(db, step.phrase.id, 3)]),
      tiles: [],
    };
  }, [stepKey, db]);

  const speak = (text: string, slow?: boolean) => {
    if (canListen) tts.speak(text, { slow });
  };

  // Tự đọc ở bước giới thiệu và bài nghe.
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ đọc một lần khi sang bước mới
  useEffect(() => {
    if (step && (step.kind === 'intro' || step.kind === 'listen_choose')) speak(step.phrase.text);
  }, [stepKey]);

  const done = isDone(state);
  // biome-ignore lint/correctness/useExhaustiveDependencies: chạy một lần khi xong phiên
  useEffect(() => {
    if (done) void syncReminders(db);
  }, [done]);

  const commit = (next: LessonState) => {
    const id = finishedPhraseAt(next, state.index);
    if (id && step) {
      try {
        recordReview(db, {
          phraseId: id,
          rating: ratingFor(next.mistakes[id] ?? 0),
          exerciseType: step.kind,
          now: Date.now(),
        });
      } catch (e) {
        setError(`Không lưu được kết quả: ${String(e)}`);
      }
    }
    tts.stop();
    setState(next);
    setChosen(null);
    setPicked([]);
    setResult(null);
  };

  const check = () => {
    if (!step) return;
    const correct =
      step.kind === 'build_sentence'
        ? sameSentence(
            picked.map((i) => extras.tiles[i] ?? ''),
            tokenize(step.phrase.text),
          )
        : chosen === step.phrase.id;
    setResult({ correct });
    if (correct) speak(step.phrase.text);
  };

  const exit = () => {
    tts.stop();
    router.back();
  };

  if (done) {
    finishedAt.current ??= Date.now();
    const secs = Math.round((finishedAt.current - startedAt.current) / 1000);
    return (
      <Finish
        title={finishTitle}
        accuracy={accuracy(state)}
        phrases={new Set(state.steps.map((s) => s.phrase.id)).size}
        seconds={secs}
        onDone={exit}
        bottom={insets.bottom}
      />
    );
  }
  if (!step) return null;

  const canCheck = step.kind === 'build_sentence' ? picked.length > 0 : chosen !== null;
  let body: ReactNode;
  switch (step.kind) {
    case 'intro':
      body = <IntroStep phrase={step.phrase} onSpeak={speak} />;
      break;
    case 'build_sentence':
      body = (
        <BuildStep
          phrase={step.phrase}
          tiles={extras.tiles}
          picked={picked}
          locked={result !== null}
          onChange={setPicked}
        />
      );
      break;
    case 'choose_meaning':
      body = (
        <ChoiceStep
          title="Câu này nghĩa là gì?"
          prompt={
            <View style={styles.promptRow}>
              {canListen ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nghe"
                  onPress={() => speak(step.phrase.text)}
                >
                  <Text style={styles.inlineSpeaker}>🔊</Text>
                </Pressable>
              ) : null}
              <Text style={[styles.prompt, { color: c.text }]}>{step.phrase.text}</Text>
            </View>
          }
          options={extras.options}
          label={(p) => p.meaningVi}
          chosen={chosen}
          locked={result !== null}
          onChoose={setChosen}
          correctId={result ? step.phrase.id : undefined}
        />
      );
      break;
    case 'choose_text':
      body = (
        <ChoiceStep
          title="Chọn câu tiếng Anh đúng"
          prompt={<Text style={[styles.prompt, { color: c.text }]}>{step.phrase.meaningVi}</Text>}
          options={extras.options}
          label={(p) => p.text}
          chosen={chosen}
          locked={result !== null}
          onChoose={setChosen}
          correctId={result ? step.phrase.id : undefined}
        />
      );
      break;
    case 'listen_choose':
      body = (
        <ChoiceStep
          title="Bạn nghe thấy câu nào?"
          prompt={<SpeakButtons text={step.phrase.text} onSpeak={speak} />}
          options={extras.options}
          label={(p) => p.text}
          chosen={chosen}
          locked={result !== null}
          onChoose={setChosen}
          correctId={result ? step.phrase.id : undefined}
        />
      );
      break;
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thoát"
          onPress={exit}
          hitSlop={12}
        >
          <Text style={[styles.close, { color: c.muted }]}>✕</Text>
        </Pressable>
        <ProgressBar value={progress(state)} />
      </View>
      <ScrollView contentContainerStyle={styles.body} key={stepKey}>
        {step.retry > 0 ? (
          <Text style={{ color: c.orange, fontWeight: '800' }}>↺ LỖI TRƯỚC — THỬ LẠI NHÉ</Text>
        ) : null}
        {body}
        {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      </ScrollView>

      {result ? (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: result.correct ? c.okBg : c.dangerBg,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: result.correct ? c.ok : c.danger }]}>
            {result.correct ? `✔ ${PRAISE[state.index % PRAISE.length]}` : '✘ Chưa đúng rồi'}
          </Text>
          {!result.correct ? (
            <>
              <Text style={{ color: c.danger, fontWeight: '800' }}>Đáp án đúng:</Text>
              <Text style={{ color: c.danger, fontSize: 16 }}>
                {step.kind === 'choose_meaning' ? step.phrase.meaningVi : step.phrase.text}
              </Text>
            </>
          ) : step.kind === 'choose_meaning' || step.kind === 'build_sentence' ? null : (
            <Text style={{ color: c.ok, fontSize: 16 }}>{step.phrase.meaningVi}</Text>
          )}
          <Button
            title="Tiếp tục"
            variant={result.correct ? 'ok' : 'danger'}
            onPress={() => commit(answer(state, result.correct))}
          />
        </View>
      ) : (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderColor: c.border }]}>
          {step.kind === 'intro' ? (
            <Button title="Tiếp tục" onPress={() => commit(advance(state))} />
          ) : (
            <Button title="Kiểm tra" variant="ok" disabled={!canCheck} onPress={check} />
          )}
        </View>
      )}
    </View>
  );
}

function Finish({
  title,
  accuracy: acc,
  phrases,
  seconds,
  onDone,
  bottom,
}: {
  title: string;
  accuracy: number;
  phrases: number;
  seconds: number;
  onDone: () => void;
  bottom: number;
}) {
  const c = useColors();
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const tiles = [
    { label: 'CHÍNH XÁC', value: `${Math.round(acc * 100)}%`, color: c.ok },
    { label: 'SỐ CÂU', value: String(phrases), color: c.blue },
    { label: 'THỜI GIAN', value: time, color: c.gold },
  ];
  return (
    <View
      style={[styles.root, styles.finish, { backgroundColor: c.bg, paddingBottom: bottom + 16 }]}
    >
      <View style={styles.finishCenter}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={[styles.finishTitle, { color: c.gold }]}>{title}</Text>
        <View style={styles.statRow}>
          {tiles.map((t) => (
            <View
              key={t.label}
              style={[styles.stat, { borderColor: t.color, backgroundColor: t.color }]}
            >
              <Text style={styles.statLabel}>{t.label}</Text>
              <View style={[styles.statInner, { backgroundColor: c.bg }]}>
                <Text style={[styles.statValue, { color: t.color }]}>{t.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <Button title="Tiếp tục" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  close: { fontSize: 26, fontWeight: '700' },
  body: { padding: 16, gap: 14, paddingBottom: 24 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineSpeaker: { fontSize: 28 },
  prompt: { fontSize: 22, fontWeight: '700', lineHeight: 30, flexShrink: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 2 },
  sheet: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sheetTitle: { fontSize: 22, fontWeight: '800' },
  finish: { padding: 16, justifyContent: 'space-between' },
  finishCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  trophy: { fontSize: 96 },
  finishTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderWidth: 2, borderRadius: 16, overflow: 'hidden' },
  statLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 4,
  },
  statInner: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
});
