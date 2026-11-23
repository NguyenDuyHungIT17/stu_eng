import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Bubble, LEARNER, speakerColor, useDialoguePlayback } from './bubbles';
import type { Line, Speakers } from './repository';

/**
 * Xem hội thoại từng lượt một, không cần cuộn: câu trước (mờ) + câu hiện tại (nổi bật),
 * nút ◀ ▶ chuyển câu, chấm tiến độ, nghe cả đoạn (tự chuyển câu theo giọng đọc).
 */
export function TurnViewer({
  lines,
  speakers,
  canListen,
  onLongPressLine,
  autoPlay,
}: {
  lines: Line[];
  speakers: Speakers;
  canListen: boolean;
  /** Nhấn giữ câu hiện tại (vd. lưu vào sổ tay). */
  onLongPressLine?: (l: Line) => void;
  /** Tự nghe cả đoạn khi mở. */
  autoPlay?: boolean;
}) {
  const c = useColors();
  const playback = useDialoguePlayback(lines, canListen);
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const shown = playback.playing ?? index;
  const current = lines[shown];
  const prev = shown > 0 ? lines[shown - 1] : undefined;

  const go = (i: number) => {
    const next = Math.max(0, Math.min(lines.length - 1, i));
    playback.stop();
    setIndex(next);
    const l = lines[next];
    if (l) playback.playLine(l);
  };

  const playAll = () => {
    if (playback.playing !== null) {
      setIndex(playback.playing);
      playback.stop();
      return;
    }
    const start = index >= lines.length - 1 ? 0 : index;
    playback.playFrom(start, () => setIndex(lines.length - 1));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ tự phát một lần khi mở
  useEffect(() => {
    if (autoPlay && canListen) playback.playFrom(0, () => setIndex(lines.length - 1));
  }, [canListen]);

  if (!current) return null;
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        {prev ? (
          <View style={styles.prev}>
            <Bubble line={prev} speakers={speakers} dim onPress={() => go(shown - 1)} />
          </View>
        ) : (
          <Text style={[styles.start, { color: c.muted }]}>Bắt đầu cuộc trò chuyện</Text>
        )}
        <Bubble
          key={current.id}
          line={current}
          speakers={speakers}
          active={playback.playing !== null}
          showMeaning={showMeaning}
          onPress={() => playback.playLine(current)}
          onLongPress={onLongPressLine ? () => onLongPressLine(current) : undefined}
        />
        {current.noteVi && showMeaning ? (
          <Text style={[styles.note, { color: c.text, backgroundColor: c.primarySoft }]}>
            💡 {current.noteVi}
          </Text>
        ) : null}
      </View>

      <View style={styles.dots}>
        {lines.map((l, i) => (
          <Pressable
            key={l.id}
            accessibilityLabel={`Câu ${i + 1}`}
            hitSlop={6}
            onPress={() => go(i)}
            style={[
              styles.dot,
              {
                backgroundColor: i <= shown ? speakerColor(c, l.speaker) : c.border,
                width: i === shown ? 18 : 8,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.counter, { color: c.muted }]}>
        Câu {shown + 1}/{lines.length} ·{' '}
        {current.speaker === LEARNER ? `${speakers.b.name} (bạn)` : speakers.a.name}
      </Text>

      <View style={styles.controls}>
        <RoundButton
          label="◀"
          a11y="Câu trước"
          disabled={shown === 0}
          onPress={() => go(shown - 1)}
        />
        {canListen ? (
          <Pressable
            accessibilityRole="button"
            onPress={playAll}
            style={[styles.play, { backgroundColor: c.primary }]}
          >
            <Text style={{ color: c.onPrimary, fontWeight: '600', fontSize: 15 }}>
              {playback.playing === null ? '▶ Nghe cả đoạn' : '■ Dừng'}
            </Text>
          </Pressable>
        ) : null}
        <RoundButton
          label="▶"
          a11y="Câu sau"
          disabled={shown >= lines.length - 1}
          onPress={() => go(shown + 1)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: showMeaning }}
        onPress={() => setShowMeaning((v) => !v)}
        style={styles.meaningToggle}
      >
        <Text style={{ color: c.primary, fontWeight: '600' }}>
          {showMeaning ? 'Ẩn nghĩa tiếng Việt' : 'Hiện nghĩa tiếng Việt'}
        </Text>
      </Pressable>
    </View>
  );
}

function RoundButton({
  label,
  a11y,
  disabled,
  onPress,
}: {
  label: string;
  a11y: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.round, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <Text style={{ color: disabled ? c.border : c.primary, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },
  stage: { flex: 1, justifyContent: 'center', gap: 10 },
  prev: { opacity: 0.9 },
  start: { textAlign: 'center', fontSize: 13 },
  note: { borderRadius: 12, padding: 10, fontSize: 14, lineHeight: 20, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  counter: { textAlign: 'center', fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: { borderRadius: 999, paddingHorizontal: 20, minHeight: 48, justifyContent: 'center' },
  meaningToggle: { alignSelf: 'center', paddingVertical: 4 },
});
