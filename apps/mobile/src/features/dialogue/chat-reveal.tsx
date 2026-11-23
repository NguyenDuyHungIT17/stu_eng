import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { useTts } from '@/services/use-tts';
import { Bubble, PITCH } from './bubbles';
import type { Line, Speakers } from './repository';

/**
 * Hội thoại hiện dần như tin nhắn: đọc tới câu nào hiện câu đó, khung tự cuộn theo.
 * Hết đoạn thì giữ toàn bộ để đọc lại (kéo lên), có nút nghe lại từ đầu và hiện nghĩa.
 * Máy không có giọng đọc thì câu hiện theo nhịp thời gian.
 */
export function ChatReveal({
  lines,
  speakers,
  canListen,
  autoPlay,
  onLongPressLine,
}: {
  lines: Line[];
  speakers: Speakers;
  canListen: boolean;
  autoPlay?: boolean;
  onLongPressLine?: (l: Line) => void;
}) {
  const c = useColors();
  const tts = useTts();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealed, setRevealed] = useState(autoPlay ? 0 : 1);
  const [playing, setPlaying] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const [showMeaning, setShowMeaning] = useState(false);
  const done = revealed >= lines.length;

  const stop = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    tts.stop();
    setPlaying(null);
    setAuto(false);
  }, [tts]);

  /** Đọc câu `i` (hoặc chờ theo độ dài nếu không có giọng), xong thì gọi `next`. */
  const say = useCallback(
    (i: number, next?: () => void) => {
      const l = lines[i];
      if (!l) return;
      setPlaying(i);
      const finish = () => {
        setPlaying(null);
        next?.();
      };
      if (canListen) tts.speak(l.text, { pitch: PITCH[l.speaker ?? 'a'] }, finish);
      else timer.current = setTimeout(finish, 900 + 70 * l.text.split(' ').length);
    },
    [canListen, lines, tts],
  );

  /** Tự chạy: hiện và đọc lần lượt từ câu `from` đến hết. */
  const playFrom = useCallback(
    (from: number) => {
      stop();
      const id = run.current;
      setAuto(true);
      const step = (i: number) => {
        if (run.current !== id) return;
        if (i >= lines.length) {
          setAuto(false);
          return;
        }
        setRevealed((r) => Math.max(r, i + 1));
        say(i, () => {
          timer.current = setTimeout(() => step(i + 1), 350);
        });
      };
      step(from);
    },
    [lines.length, say, stop],
  );

  /** Hiện thêm một câu và đọc nó. */
  const nextLine = () => {
    stop();
    const i = revealed;
    setRevealed(i + 1);
    say(i);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ tự chạy một lần khi mở
  useEffect(() => {
    if (autoPlay) playFrom(0);
    return () => {
      run.current++;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const shown = lines.slice(0, revealed);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => {
          if (!done || auto) scroll.current?.scrollToEnd({ animated: true });
        }}
      >
        {shown.map((l, i) => (
          <Bubble
            key={l.id}
            line={l}
            speakers={speakers}
            active={playing === i}
            showMeaning={showMeaning}
            onPress={() => {
              stop();
              say(i);
            }}
            onLongPress={onLongPressLine ? () => onLongPressLine(l) : undefined}
          />
        ))}
        {done ? (
          <Text style={[styles.end, { color: c.muted }]}>
            Hết hội thoại · kéo lên để đọc lại từ đầu
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.controls}>
        {!done ? (
          <>
            <Pill
              label={auto ? '■ Dừng' : '▶ Tự chạy'}
              primary
              onPress={() => (auto ? stop() : playFrom(revealed))}
            />
            <Pill label="Câu tiếp ›" onPress={nextLine} />
            <Pill
              label="Hiện hết"
              onPress={() => {
                stop();
                setRevealed(lines.length);
              }}
            />
          </>
        ) : (
          <>
            <Pill
              label={auto ? '■ Dừng' : '↻ Nghe lại từ đầu'}
              primary
              onPress={() => {
                if (auto) return stop();
                setRevealed(0);
                playFrom(0);
              }}
            />
            <Pill
              label={showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
              onPress={() => setShowMeaning((v) => !v)}
            />
          </>
        )}
      </View>
    </View>
  );
}

function Pill({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: primary ? c.primary : c.primarySoft, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={{ color: primary ? c.onPrimary : c.primary, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 10 },
  thread: { paddingVertical: 8, gap: 2, flexGrow: 1, justifyContent: 'flex-end' },
  end: { textAlign: 'center', fontSize: 12, marginTop: 10 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
});
