import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Colors, useColors } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { useTts } from '@/services/use-tts';
import type { Line, Speakers } from './repository';

/** Vai của người học trong hội thoại (bong bóng bên phải). */
export const LEARNER = 'b' as const;

/** Hai giọng khác nhau cho hai người nói (cùng giọng máy, khác cao độ). */
export const PITCH: Record<string, number> = { a: 1.08, b: 0.88 };

export const speakerColor = (c: Colors, speaker: string | null) =>
  speaker === LEARNER ? c.primary : c.accent;

/**
 * Một lượt nói dạng bong bóng chat. Người kia bên trái (nền trắng), bạn bên phải (nền chàm).
 * `children` thay cho phần chữ (dùng cho câu có chỗ trống).
 */
export function Bubble({
  line,
  speakers,
  showMeaning,
  active,
  dim,
  onPress,
  onLongPress,
  children,
}: {
  line: Line;
  speakers: Speakers;
  showMeaning?: boolean;
  active?: boolean;
  dim?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
}) {
  const c = useColors();
  const me = line.speaker === LEARNER;
  const who = line.speaker === 'a' ? speakers.a : speakers.b;
  const fg = me ? c.onPrimary : c.text;
  return (
    <View style={[styles.row, me ? styles.rowMe : null, dim ? { opacity: 0.55 } : null]}>
      {!me ? <Avatar name={who.name} color={speakerColor(c, line.speaker)} size={32} /> : null}
      <View style={[styles.col, me ? { alignItems: 'flex-end' } : null]}>
        <Text style={[styles.name, { color: c.muted }]}>{who.name}</Text>
        <Pressable
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${who.name}: ${line.text}`}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={400}
          disabled={!onPress && !onLongPress}
          style={[
            styles.bubble,
            me ? styles.bubbleMe : styles.bubbleOther,
            {
              backgroundColor: me ? c.bubbleMe : c.bubbleOther,
              borderColor: active ? c.gold : me ? c.bubbleMe : c.border,
            },
          ]}
        >
          {children ?? <Text style={[styles.text, { color: fg }]}>{line.text}</Text>}
          {showMeaning ? (
            <Text style={[styles.meaning, { color: me ? '#FFFFFFCC' : c.muted }]}>
              {line.meaningVi}
            </Text>
          ) : null}
        </Pressable>
      </View>
      {me ? <Avatar name={who.name} color={speakerColor(c, line.speaker)} size={32} /> : null}
    </View>
  );
}

/**
 * Phát hội thoại bằng TTS: từng câu một, mỗi người một giọng. `playing` = câu đang đọc.
 * `enabled=false` (máy không có giọng tiếng Anh) thì không làm gì.
 */
export function useDialoguePlayback(lines: Line[], enabled: boolean) {
  const tts = useTts();
  const [playing, setPlaying] = useState<number | null>(null);
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    tts.stop();
    setPlaying(null);
  }, [tts]);

  const playFrom = useCallback(
    (start: number, onFinish?: () => void) => {
      if (!enabled) return onFinish?.();
      const id = ++run.current;
      const step = (i: number) => {
        if (run.current !== id) return;
        const l = lines[i];
        if (!l) {
          setPlaying(null);
          onFinish?.();
          return;
        }
        setPlaying(i);
        tts.speak(l.text, { pitch: PITCH[l.speaker ?? 'a'] }, () => step(i + 1));
      };
      step(start);
    },
    [enabled, lines, tts],
  );

  const playLine = useCallback(
    (l: Line, slow?: boolean) => {
      if (!enabled) return;
      run.current++;
      setPlaying(null);
      tts.speak(l.text, { slow, pitch: PITCH[l.speaker ?? 'a'] });
    },
    [enabled, tts],
  );

  useEffect(() => () => void run.current++, []);
  return { playing, playFrom, playLine, stop };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
  rowMe: { justifyContent: 'flex-end' },
  col: { maxWidth: '78%', gap: 2 },
  name: { fontSize: 12, fontWeight: '600', marginHorizontal: 6 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  bubbleOther: { borderBottomLeftRadius: 6 },
  bubbleMe: { borderBottomRightRadius: 6 },
  text: { fontSize: 16, lineHeight: 23 },
  meaning: { fontSize: 14, lineHeight: 20 },
});
