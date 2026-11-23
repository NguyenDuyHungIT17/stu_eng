import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar, Badge, OutlineButton } from '@/components/ui';
import { Bubble, LEARNER, speakerColor } from '../dialogue/bubbles';
import type { Dialogue, Line, Speakers } from '../dialogue/repository';
import { TurnViewer } from '../dialogue/turn-viewer';
import { splitBlank } from './engine';

type PlayLine = (l: Line, slow?: boolean) => void;

function Heading({ text }: { text: string }) {
  const c = useColors();
  return <Text style={[styles.heading, { color: c.text }]}>{text}</Text>;
}

/** Hàng nút nghe lại / nghe chậm cho một câu. */
export function ListenRow({ line, onPlay }: { line: Line; onPlay: PlayLine }) {
  const c = useColors();
  return (
    <View style={styles.listenRow}>
      {[
        { label: '🔊 Nghe', slow: false },
        { label: '🐢 Chậm', slow: true },
      ].map((b) => (
        <Pressable
          key={b.label}
          accessibilityRole="button"
          onPress={() => onPlay(line, b.slow)}
          style={[styles.pill, { backgroundColor: c.primarySoft }]}
        >
          <Text style={{ color: c.primary, fontWeight: '600' }}>{b.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Bước 1: tình huống và hai nhân vật. */
export function SceneStep({ dialogue }: { dialogue: Dialogue }) {
  const c = useColors();
  const people = [
    { key: 'a', ...dialogue.speakers.a },
    { key: 'b', ...dialogue.speakers.b },
  ];
  return (
    <View style={styles.gap}>
      <Text style={[styles.kicker, { color: c.accent }]}>Tình huống</Text>
      <Text style={[styles.title, { color: c.text }]}>{dialogue.title}</Text>
      <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
        <Text style={{ color: c.text, fontSize: 16, lineHeight: 24 }}>
          📍 {dialogue.situationVi}
        </Text>
      </View>
      {people.map((p) => (
        <View key={p.key} style={[styles.person, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Avatar name={p.name} color={speakerColor(c, p.key)} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>
              {p.name}
              {p.key === LEARNER ? ' (bạn)' : ''}
            </Text>
            <Text style={{ color: c.muted }}>{p.roleVi}</Text>
          </View>
        </View>
      ))}
      <View style={styles.levelRow}>
        <Badge text={dialogue.level} color={c.primary} />
        <Text style={{ color: c.muted, flexShrink: 1 }}>
          Bạn sẽ nghe cả đoạn, rồi luyện từng câu trong ngữ cảnh.
        </Text>
      </View>
    </View>
  );
}

/** Bước 2: nghe trọn hội thoại, từng lượt một (không cần cuộn). */
export function ListenAllStep({
  lines,
  speakers,
  canListen,
}: {
  lines: Line[];
  speakers: Speakers;
  canListen: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Heading text="Nghe đoạn hội thoại" />
      <TurnViewer lines={lines} speakers={speakers} canListen={canListen} autoPlay />
    </View>
  );
}

/** Câu có chỗ trống, điền bằng đáp án đang chọn (nếu có). */
function BlankText({ line, filled, me }: { line: Line; filled: string | null; me: boolean }) {
  const c = useColors();
  const { before, after } = splitBlank(line.text, line.blank ?? '');
  const fg = me ? c.onPrimary : c.text;
  return (
    <Text style={{ color: fg, fontSize: 16, lineHeight: 26 }}>
      {before}
      <Text
        style={{
          fontWeight: '700',
          color: filled ? fg : me ? '#FFFFFFAA' : c.muted,
          textDecorationLine: 'underline',
        }}
      >
        {filled ?? ' ______ '}
      </Text>
      {after}
    </Text>
  );
}

/** Nghe-điền: nghe câu trong ngữ cảnh, chọn cụm còn thiếu. */
export function FillBlankStep({
  line,
  context,
  speakers,
  options,
  chosen,
  correct,
  onChoose,
  onPlay,
  canListen,
}: {
  line: Line;
  context: Line[];
  speakers: Speakers;
  options: string[];
  chosen: string | null;
  /** Sau khi kiểm tra: đáp án đúng (để tô màu). */
  correct: string | null;
  onChoose: (o: string) => void;
  onPlay: PlayLine;
  canListen: boolean;
}) {
  const c = useColors();
  const tint = (o: string) =>
    correct === null ? undefined : o === correct ? c.ok : o === chosen ? c.danger : undefined;
  return (
    <View style={styles.gap}>
      <Heading text={canListen ? 'Nghe và điền vào chỗ trống' : 'Điền vào chỗ trống'} />
      {context.map((l) => (
        <Bubble key={l.id} line={l} speakers={speakers} dim onPress={() => onPlay(l)} />
      ))}
      <Bubble line={line} speakers={speakers}>
        <BlankText line={line} filled={chosen} me={line.speaker === LEARNER} />
      </Bubble>
      {canListen ? <ListenRow line={line} onPlay={onPlay} /> : null}
      <View style={styles.optionGrid}>
        {options.map((o) => (
          <View key={o} style={styles.optionCell}>
            <OutlineButton
              title={o}
              selected={chosen === o || (correct !== null && o === correct)}
              color={tint(o)}
              disabled={correct !== null}
              onPress={() => onChoose(o)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Nhập vai: chọn câu đáp phù hợp với lượt nói trước. */
export function ChooseReplyStep({
  line,
  context,
  speakers,
  options,
  chosen,
  checked,
  onChoose,
  onPlay,
}: {
  line: Line;
  context: Line[];
  speakers: Speakers;
  options: Line[];
  chosen: string | null;
  checked: boolean;
  onChoose: (id: string) => void;
  onPlay: PlayLine;
}) {
  const c = useColors();
  const who = line.speaker === 'a' ? speakers.a : speakers.b;
  const tint = (id: string) =>
    !checked ? undefined : id === line.id ? c.ok : id === chosen ? c.danger : undefined;
  return (
    <View style={styles.gap}>
      <Heading text={`Bạn là ${who.name}. Bạn sẽ nói gì?`} />
      {context.map((l, i) => (
        <Bubble
          key={l.id}
          line={l}
          speakers={speakers}
          dim={i < context.length - 1}
          onPress={() => onPlay(l)}
        />
      ))}
      <View style={styles.gap}>
        {options.map((o) => (
          <View key={o.id} style={{ flexDirection: 'row' }}>
            <OutlineButton
              title={o.text}
              align="left"
              selected={chosen === o.id || (checked && o.id === line.id)}
              color={tint(o.id)}
              disabled={checked}
              onPress={() => onChoose(o.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ghép câu: chạm ô chữ để đưa lên dòng trả lời; chạm ô đã chọn để bỏ. */
export function BuildStep({
  line,
  context,
  speakers,
  tiles,
  picked,
  locked,
  onChange,
  onPlay,
}: {
  line: Line;
  context: Line[];
  speakers: Speakers;
  tiles: string[];
  picked: number[];
  locked: boolean;
  onChange: (picked: number[]) => void;
  onPlay: PlayLine;
}) {
  const c = useColors();
  const used = new Set(picked);
  const tile = (i: number, inAnswer: boolean) => {
    const ghost = !inAnswer && used.has(i);
    return (
      <Pressable
        key={`${inAnswer ? 'a' : 'b'}${i}`}
        accessibilityRole="button"
        accessibilityLabel={tiles[i]}
        disabled={locked || ghost}
        onPress={() => onChange(inAnswer ? picked.filter((x) => x !== i) : [...picked, i])}
        style={[
          styles.tile,
          ghost
            ? { backgroundColor: c.border, borderColor: c.border }
            : { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={{ fontSize: 16, color: ghost ? c.border : c.text }}>{tiles[i]}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.gap}>
      <Heading text="Ghép câu bạn sẽ nói" />
      {context.map((l) => (
        <Bubble key={l.id} line={l} speakers={speakers} dim onPress={() => onPlay(l)} />
      ))}
      <View style={[styles.card, { backgroundColor: c.primarySoft }]}>
        <Text style={{ color: c.muted, fontSize: 13 }}>Ý bạn muốn nói</Text>
        <Text style={{ color: c.text, fontSize: 17, lineHeight: 24 }}>{line.meaningVi}</Text>
      </View>
      <View style={[styles.answerArea, { borderColor: c.border }]}>
        {picked.map((i) => tile(i, true))}
      </View>
      <View style={styles.bank}>{tiles.map((_, i) => tile(i, false))}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700' },
  card: { borderRadius: 16, padding: 14, gap: 4 },
  person: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listenRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionCell: { width: '48%', flexGrow: 1, flexDirection: 'row' },
  answerArea: {
    minHeight: 96,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
