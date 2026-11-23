import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { PhraseCard } from '@/components/phrase-card';
import { useColors } from '@/components/theme';
import { OutlineButton, Row } from '@/components/ui';
import type { Rating } from '@/lib/fsrs';
import type { Phrase } from './repository';
import { defaultRatingForChoice } from './session';

type Speak = (text: string, slow?: boolean) => void;

const RATING_LABELS: { rating: Rating; label: string; hint: string }[] = [
  { rating: 1, label: 'Quên', hint: 'Không nhớ' },
  { rating: 2, label: 'Khó', hint: 'Nhớ nhưng chật vật' },
  { rating: 3, label: 'Được', hint: 'Nhớ ra' },
  { rating: 4, label: 'Dễ', hint: 'Nhớ ngay' },
];

/** Bốn mức chấm Quên / Khó / Được / Dễ (FR-V-03). */
export function RatingBar({
  onRate,
  suggested,
}: {
  onRate: (r: Rating) => void;
  suggested?: Rating;
}) {
  const c = useColors();
  const colors: Record<Rating, string> = { 1: c.danger, 2: '#D97706', 3: c.ok, 4: c.primary };
  return (
    <View style={styles.gap}>
      <Text style={{ color: c.muted }}>Bạn nhớ cụm này thế nào?</Text>
      <Row>
        {RATING_LABELS.map((r) => (
          <OutlineButton
            key={r.rating}
            title={r.label}
            accessibilityLabel={`${r.label}: ${r.hint}`}
            color={colors[r.rating]}
            selected={suggested === r.rating}
            onPress={() => onRate(r.rating)}
          />
        ))}
      </Row>
    </View>
  );
}

/** Lật thẻ (FR-V-04a): xem cụm tiếng Anh, tự nhớ nghĩa, lật ra rồi tự chấm. */
export function FlipExercise({
  phrase,
  isNew,
  onSpeak,
  onRate,
}: {
  phrase: Phrase;
  isNew: boolean;
  onSpeak: Speak;
  onRate: (r: Rating) => void;
}) {
  const c = useColors();
  const [flipped, setFlipped] = useState(isNew);
  return (
    <View style={styles.gap}>
      <Text style={{ color: c.muted }}>
        {isNew ? 'Cụm mới — đọc to theo rồi chấm mức nhớ' : 'Nhớ nghĩa của cụm này rồi lật thẻ'}
      </Text>
      <PhraseCard phrase={phrase} onSpeak={onSpeak} hideMeaning={!flipped} />
      {flipped ? (
        <RatingBar onRate={onRate} />
      ) : (
        <Button title="Lật thẻ" onPress={() => setFlipped(true)} />
      )}
    </View>
  );
}

/** Đáp án trắc nghiệm: tô màu đúng/sai sau khi chọn. */
function Choices({
  options,
  correctId,
  label,
  chosen,
  onChoose,
}: {
  options: Phrase[];
  correctId: string;
  label: (p: Phrase) => string;
  chosen: string | null;
  onChoose: (id: string) => void;
}) {
  const c = useColors();
  return (
    <View style={styles.gap}>
      {options.map((o) => {
        const answered = chosen !== null;
        const isCorrect = o.id === correctId;
        const color = !answered
          ? c.primary
          : isCorrect
            ? c.ok
            : o.id === chosen
              ? c.danger
              : c.muted;
        return (
          <Row key={o.id}>
            <OutlineButton
              title={`${answered && isCorrect ? '✓ ' : answered && o.id === chosen ? '✗ ' : ''}${label(o)}`}
              color={color}
              onPress={() => (answered ? undefined : onChoose(o.id))}
            />
          </Row>
        );
      })}
    </View>
  );
}

/** Sau khi trả lời trắc nghiệm: hiện thẻ đầy đủ + chấm (mặc định theo đúng/sai, cho sửa). */
function AfterAnswer({
  phrase,
  correct,
  onSpeak,
  onRate,
}: {
  phrase: Phrase;
  correct: boolean;
  onSpeak: Speak;
  onRate: (r: Rating) => void;
}) {
  const c = useColors();
  const suggested = defaultRatingForChoice(correct);
  return (
    <View style={styles.gap}>
      <Text style={{ color: correct ? c.ok : c.danger, fontSize: 18, fontWeight: '700' }}>
        {correct ? 'Chính xác!' : 'Chưa đúng'}
      </Text>
      <PhraseCard phrase={phrase} onSpeak={onSpeak} />
      <Button title={`Tiếp tục (${correct ? 'Được' : 'Quên'})`} onPress={() => onRate(suggested)} />
      <RatingBar onRate={onRate} suggested={suggested} />
    </View>
  );
}

/** Chọn nghĩa đúng (FR-V-04a): xem cụm tiếng Anh, chọn 1 trong 4 nghĩa tiếng Việt. */
export function ChooseMeaningExercise({
  phrase,
  options,
  onSpeak,
  onRate,
}: {
  phrase: Phrase;
  options: Phrase[];
  onSpeak: Speak;
  onRate: (r: Rating) => void;
}) {
  const c = useColors();
  const [chosen, setChosen] = useState<string | null>(null);
  if (chosen !== null) {
    return (
      <AfterAnswer
        phrase={phrase}
        correct={chosen === phrase.id}
        onSpeak={onSpeak}
        onRate={onRate}
      />
    );
  }
  return (
    <View style={styles.gap}>
      <Text style={{ color: c.muted }}>Chọn nghĩa đúng</Text>
      <Text style={[styles.prompt, { color: c.text }]}>{phrase.text}</Text>
      <Choices
        options={options}
        correctId={phrase.id}
        label={(p) => p.meaningVi}
        chosen={chosen}
        onChoose={setChosen}
      />
    </View>
  );
}

/** Nghe rồi chọn (FR-V-04a): nghe TTS, chọn cụm tiếng Anh vừa nghe. */
export function ListenChooseExercise({
  phrase,
  options,
  onSpeak,
  onRate,
}: {
  phrase: Phrase;
  options: Phrase[];
  onSpeak: Speak;
  onRate: (r: Rating) => void;
}) {
  const c = useColors();
  const [chosen, setChosen] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: chỉ tự đọc một lần khi đổi cụm
  useEffect(() => {
    onSpeak(phrase.text);
  }, [phrase.id]);

  if (chosen !== null) {
    return (
      <AfterAnswer
        phrase={phrase}
        correct={chosen === phrase.id}
        onSpeak={onSpeak}
        onRate={onRate}
      />
    );
  }
  return (
    <View style={styles.gap}>
      <Text style={{ color: c.muted }}>Nghe rồi chọn cụm bạn nghe được</Text>
      <Row>
        <OutlineButton title="🔊 Nghe lại" onPress={() => onSpeak(phrase.text)} />
        <OutlineButton title="🐢 Nghe chậm" onPress={() => onSpeak(phrase.text, true)} />
      </Row>
      <Choices
        options={options}
        correctId={phrase.id}
        label={(p) => p.text}
        chosen={chosen}
        onChoose={setChosen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 12 },
  prompt: { fontSize: 26, fontWeight: '700', paddingVertical: 8 },
});
