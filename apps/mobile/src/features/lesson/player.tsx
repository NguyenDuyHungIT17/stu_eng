import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { ProgressBar } from '@/components/ui';
import { useDb } from '@/db/client';
import { useStudyTimer } from '@/features/progress/use-study-timer';
import { syncReminders } from '@/services/notifications';
import { useDialoguePlayback } from '../dialogue/bubbles';
import {
  blankDistractors,
  contextBefore,
  type DialogueWithLines,
  getDialogue,
  replyDistractors,
} from '../dialogue/repository';
import { recordReview, shuffle } from '../review/repository';
import {
  accuracy,
  advance,
  answer,
  buildTiles,
  currentStep,
  finishedLineAt,
  isDone,
  type LessonState,
  progress,
  ratingFor,
  sameSentence,
  tokenize,
} from './engine';
import { BuildStep, ChooseReplyStep, FillBlankStep, ListenAllStep, SceneStep } from './steps';

const PRAISE = ['Chính xác!', 'Đúng rồi!', 'Tốt lắm!', 'Chuẩn!'];

/**
 * Chạy một bài hội thoại hoặc phiên ôn. Mỗi bước hiển thị trong khung chat; nút "Kiểm tra"
 * ở dưới, kết quả hiện ngay trong khung kèm nghĩa và ghi chú cách dùng.
 * Mỗi câu được ghi vào FSRS khi xong bước cuối của nó trong phiên.
 */
export function LessonPlayer({
  initial,
  dialogue: lessonDialogue,
  canListen,
  finishTitle,
}: {
  initial: LessonState;
  /** Bài học một hội thoại; phiên ôn thì null (mỗi câu tự tra hội thoại của nó). */
  dialogue: DialogueWithLines | null;
  canListen: boolean;
  finishTitle: string;
}) {
  const db = useDb();
  const c = useColors();
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
  const stepKey = step ? `${state.index}-${step.kind}-${step.line?.id ?? ''}` : 'done';

  // Hội thoại chứa câu hiện tại (phiên ôn: tra theo dialogueId, có cache).
  const cache = useRef(new Map<string, DialogueWithLines | null>());
  const dialogue = useMemo(() => {
    if (lessonDialogue) return lessonDialogue;
    const id = step?.line?.dialogueId;
    if (!id) return null;
    if (!cache.current.has(id)) cache.current.set(id, getDialogue(db, id));
    return cache.current.get(id) ?? null;
  }, [lessonDialogue, step?.line?.dialogueId, db]);

  const lines = dialogue?.lines ?? [];
  const playback = useDialoguePlayback(lines, canListen);

  // Đáp án / ô chữ: tính một lần cho mỗi bước.
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ tính lại khi sang bước mới
  const extras = useMemo(() => {
    const l = step?.line;
    if (!l) return { blanks: [], replies: [], tiles: [] };
    if (step.kind === 'fill_blank')
      return {
        blanks: shuffle([l.blank ?? '', ...blankDistractors(db, l, 3)]),
        replies: [],
        tiles: [],
      };
    if (step.kind === 'choose_reply')
      return { blanks: [], replies: shuffle([l, ...replyDistractors(db, l, 2)]), tiles: [] };
    const others = replyDistractors(db, l, 2).map((p) => p.text);
    return { blanks: [], replies: [], tiles: buildTiles(l.text, others) };
  }, [stepKey, db]);

  const context = step?.line ? contextBefore(lines, step.line.lineNo ?? 0, 3) : [];

  // Tự phát: cả đoạn ở bước nghe; câu đích ở bài nghe-điền; câu trước ở bài nhập vai.
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ phát một lần khi sang bước mới
  useEffect(() => {
    if (!step || !canListen) return;
    if (step.kind === 'fill_blank' && step.line) playback.playLine(step.line);
    else if (step.kind === 'choose_reply') {
      const prev = context[context.length - 1];
      if (prev) playback.playLine(prev);
    }
  }, [stepKey]);

  const done = isDone(state);
  // biome-ignore lint/correctness/useExhaustiveDependencies: chạy một lần khi xong phiên
  useEffect(() => {
    if (done) void syncReminders(db);
  }, [done]);

  const commit = (next: LessonState) => {
    const id = finishedLineAt(next, state.index);
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
    playback.stop();
    setState(next);
    setChosen(null);
    setPicked([]);
    setResult(null);
  };

  const check = () => {
    const l = step?.line;
    if (!l) return;
    const correct =
      step.kind === 'build_sentence'
        ? sameSentence(
            picked.map((i) => extras.tiles[i] ?? ''),
            tokenize(l.text),
          )
        : step.kind === 'fill_blank'
          ? chosen === l.blank
          : chosen === l.id;
    setResult({ correct });
    playback.playLine(l);
  };

  const exit = () => {
    playback.stop();
    router.back();
  };

  if (done) {
    finishedAt.current ??= Date.now();
    return (
      <Finish
        title={finishTitle}
        accuracy={accuracy(state)}
        keyPhrases={[
          ...new Set(state.steps.map((s) => s.line?.blank).filter((b): b is string => !!b)),
        ]}
        seconds={Math.round((finishedAt.current - startedAt.current) / 1000)}
        onDone={exit}
        top={insets.top}
        bottom={insets.bottom}
      />
    );
  }
  if (!step) return null;

  const speakers = dialogue?.speakers ?? {
    a: { name: 'A', roleVi: '' },
    b: { name: 'B', roleVi: '' },
  };
  const line = step.line;
  let body: ReactNode = null;
  if (step.kind === 'scene' && dialogue) body = <SceneStep dialogue={dialogue} />;
  else if (step.kind === 'listen_all')
    body = <ListenAllStep lines={lines} speakers={speakers} canListen={canListen} />;
  else if (step.kind === 'fill_blank' && line)
    body = (
      <FillBlankStep
        line={line}
        context={context.slice(-1)}
        speakers={speakers}
        options={extras.blanks}
        chosen={chosen}
        correct={result ? (line.blank ?? null) : null}
        onChoose={setChosen}
        onPlay={playback.playLine}
        canListen={canListen}
      />
    );
  else if (step.kind === 'choose_reply' && line)
    body = (
      <ChooseReplyStep
        line={line}
        context={context.slice(-2)}
        speakers={speakers}
        options={extras.replies}
        chosen={chosen}
        checked={result !== null}
        onChoose={setChosen}
        onPlay={playback.playLine}
      />
    );
  else if (step.kind === 'build_sentence' && line)
    body = (
      <BuildStep
        line={line}
        context={context.slice(-1)}
        speakers={speakers}
        tiles={extras.tiles}
        picked={picked}
        locked={result !== null}
        onChange={setPicked}
        onPlay={playback.playLine}
      />
    );

  const graded = line !== null;
  const canCheck = step.kind === 'build_sentence' ? picked.length > 0 : chosen !== null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 6 }]}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thoát"
          onPress={exit}
          hitSlop={12}
        >
          <Text style={[styles.close, { color: c.muted }]}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>
            {dialogue?.title ?? 'Ôn tập'}
          </Text>
          <ProgressBar value={progress(state)} />
        </View>
      </View>
      {step.kind === 'listen_all' ? (
        <View style={[styles.body, { flex: 1 }]}>{body}</View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} key={stepKey}>
          {step.retry > 0 ? (
            <Text style={{ color: c.accent, fontWeight: '600' }}>↺ Thử lại câu bạn làm sai</Text>
          ) : null}
          {body}
          {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
        </ScrollView>
      )}

      <View
        style={[
          styles.footer,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + 14 },
          cardShadow(c),
        ]}
      >
        {result && line ? (
          <View style={styles.feedback}>
            <Text style={[styles.fbTitle, { color: result.correct ? c.ok : c.danger }]}>
              {result.correct
                ? `✓ ${PRAISE[state.index % PRAISE.length]}`
                : '✗ Chưa đúng, câu đúng là:'}
            </Text>
            {!result.correct ? (
              <Text style={{ color: c.text, fontSize: 16, lineHeight: 23, fontWeight: '600' }}>
                {line.text}
              </Text>
            ) : null}
            <Text style={{ color: c.muted, lineHeight: 21 }}>{line.meaningVi}</Text>
            {line.noteVi ? (
              <Text style={[styles.note, { color: c.text, backgroundColor: c.primarySoft }]}>
                💡 {line.noteVi}
              </Text>
            ) : null}
          </View>
        ) : null}
        {!graded ? (
          <Button title="Tiếp tục" onPress={() => commit(advance(state))} />
        ) : result ? (
          <Button
            title="Tiếp tục"
            variant={result.correct ? 'ok' : 'danger'}
            onPress={() => commit(answer(state, result.correct))}
          />
        ) : (
          <Button title="Kiểm tra" disabled={!canCheck} onPress={check} />
        )}
      </View>
    </View>
  );
}

function Finish({
  title,
  accuracy: acc,
  keyPhrases,
  seconds,
  onDone,
  top,
  bottom,
}: {
  title: string;
  accuracy: number;
  keyPhrases: string[];
  seconds: number;
  onDone: () => void;
  top: number;
  bottom: number;
}) {
  const c = useColors();
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: top + 24 }]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>💬</Text>
        <Text style={[styles.finishTitle, { color: c.text }]}>{title}</Text>
        <View style={styles.stats}>
          {[
            { label: 'Chính xác', value: `${Math.round(acc * 100)}%`, color: c.ok },
            { label: 'Thời gian', value: time, color: c.primary },
          ].map((s) => (
            <View
              key={s.label}
              style={[styles.stat, { backgroundColor: c.surface }, cardShadow(c)]}
            >
              <Text style={{ color: s.color, fontSize: 26, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: c.muted }}>{s.label}</Text>
            </View>
          ))}
        </View>
        {keyPhrases.length > 0 ? (
          <View style={[styles.recap, { backgroundColor: c.surface }, cardShadow(c)]}>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>
              Cụm giao tiếp bạn vừa luyện
            </Text>
            {keyPhrases.map((p) => (
              <Text key={p} style={{ color: c.text, fontSize: 15 }}>
                • {p}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: bottom + 14 }}>
        <Button title="Xong" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  close: { fontSize: 22, fontWeight: '600' },
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  feedback: { gap: 6 },
  fbTitle: { fontSize: 18, fontWeight: '700' },
  note: { borderRadius: 12, padding: 10, fontSize: 14, lineHeight: 20, overflow: 'hidden' },
  finishTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 2 },
  recap: { borderRadius: 16, padding: 16, gap: 6 },
});
