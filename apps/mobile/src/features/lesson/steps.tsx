import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { OutlineButton } from '@/components/ui';
import type { Phrase } from '../review/repository';

type Speak = (text: string, slow?: boolean) => void;

/** Nút loa tròn lớn (+ nút đọc chậm). */
export function SpeakButtons({ text, onSpeak }: { text: string; onSpeak: Speak }) {
  const c = useColors();
  return (
    <View style={styles.speakRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nghe"
        onPress={() => onSpeak(text)}
        style={[styles.speakBig, { backgroundColor: c.blue, borderBottomColor: c.blueDark }]}
      >
        <Text style={styles.speakIcon}>🔊</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nghe chậm"
        onPress={() => onSpeak(text, true)}
        style={[styles.speakSmall, { backgroundColor: c.blue, borderBottomColor: c.blueDark }]}
      >
        <Text style={styles.speakIconSmall}>🐢</Text>
      </Pressable>
    </View>
  );
}

/** Giới thiệu cụm mới. */
export function IntroStep({ phrase, onSpeak }: { phrase: Phrase; onSpeak: Speak }) {
  const c = useColors();
  return (
    <View style={styles.gap}>
      <Text style={[styles.label, { color: c.primary }]}>✨ CÂU MỚI</Text>
      <View style={styles.introRow}>
        <SpeakButtons text={phrase.text} onSpeak={onSpeak} />
      </View>
      <Text style={[styles.big, { color: c.text }]}>{phrase.text}</Text>
      {phrase.ipa ? <Text style={{ color: c.muted, fontSize: 15 }}>{phrase.ipa}</Text> : null}
      <Text style={[styles.meaning, { color: c.text }]}>{phrase.meaningVi}</Text>
      {phrase.example ? (
        <View style={[styles.example, { borderColor: c.border }]}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '700' }}>VÍ DỤ</Text>
          <Text style={{ color: c.text, fontSize: 16, lineHeight: 23 }}>{phrase.example}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Đề + 4 đáp án. `label` chọn hiển thị nghĩa hay câu tiếng Anh. */
export function ChoiceStep({
  title,
  prompt,
  options,
  label,
  chosen,
  locked,
  onChoose,
  correctId,
}: {
  title: string;
  prompt: React.ReactNode;
  options: Phrase[];
  label: (p: Phrase) => string;
  chosen: string | null;
  locked: boolean;
  onChoose: (id: string) => void;
  /** Sau khi kiểm tra: id đáp án đúng, để tô xanh đáp án đúng và đỏ đáp án sai. */
  correctId?: string;
}) {
  const c = useColors();
  const tint = (id: string) =>
    correctId === undefined
      ? undefined
      : id === correctId
        ? c.ok
        : id === chosen
          ? c.danger
          : undefined;
  return (
    <View style={styles.gap}>
      <Text style={[styles.heading, { color: c.text }]}>{title}</Text>
      {prompt}
      <View style={styles.options}>
        {options.map((o) => (
          <View key={o.id} style={styles.optionRow}>
            <OutlineButton
              title={label(o)}
              selected={chosen === o.id || (correctId !== undefined && o.id === correctId)}
              color={tint(o.id)}
              disabled={locked}
              onPress={() => onChoose(o.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ghép câu: chạm ô chữ ở dưới để đưa lên dòng trả lời; chạm ô đã chọn để bỏ. */
export function BuildStep({
  phrase,
  tiles,
  picked,
  locked,
  onChange,
}: {
  phrase: Phrase;
  tiles: string[];
  /** Vị trí các ô (trong `tiles`) đã chọn, theo thứ tự. */
  picked: number[];
  locked: boolean;
  onChange: (picked: number[]) => void;
}) {
  const c = useColors();
  const used = new Set(picked);
  const tile = (i: number, inAnswer: boolean) => (
    <Pressable
      key={`${inAnswer ? 'a' : 'b'}${i}`}
      accessibilityRole="button"
      accessibilityLabel={tiles[i]}
      disabled={locked || (!inAnswer && used.has(i))}
      onPress={() => onChange(inAnswer ? picked.filter((x) => x !== i) : [...picked, i])}
      style={[
        styles.tile,
        !inAnswer && used.has(i)
          ? { backgroundColor: c.locked, borderColor: c.locked }
          : { backgroundColor: c.card, borderColor: c.border, borderBottomColor: c.borderDark },
      ]}
    >
      <Text style={[styles.tileText, { color: !inAnswer && used.has(i) ? c.locked : c.text }]}>
        {tiles[i]}
      </Text>
    </Pressable>
  );
  return (
    <View style={styles.gap}>
      <Text style={[styles.heading, { color: c.text }]}>Dịch câu này sang tiếng Anh</Text>
      <View style={[styles.bubble, { borderColor: c.border }]}>
        <Text style={[styles.meaning, { color: c.text }]}>{phrase.meaningVi}</Text>
      </View>
      <View style={[styles.answerArea, { borderColor: c.border }]}>
        {picked.map((i) => tile(i, true))}
      </View>
      <View style={styles.bank}>{tiles.map((_, i) => tile(i, false))}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  heading: { fontSize: 22, fontWeight: '800' },
  big: { fontSize: 26, fontWeight: '800', lineHeight: 34 },
  meaning: { fontSize: 18, lineHeight: 26 },
  introRow: { flexDirection: 'row' },
  example: { borderWidth: 2, borderRadius: 16, padding: 14, gap: 4 },
  bubble: { borderWidth: 2, borderRadius: 16, padding: 14 },
  options: { gap: 10 },
  optionRow: { flexDirection: 'row' },
  speakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  speakBig: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderBottomWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakSmall: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakIcon: { fontSize: 32 },
  speakIconSmall: { fontSize: 22 },
  answerArea: {
    minHeight: 110,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    paddingVertical: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tileText: { fontSize: 17, fontWeight: '600' },
});
