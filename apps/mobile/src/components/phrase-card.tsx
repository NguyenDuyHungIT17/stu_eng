import { StyleSheet, Text, View } from 'react-native';
import type { phrases } from '@/db/schema';
import { useColors } from './theme';
import { Badge, OutlineButton, Row } from './ui';

type Phrase = typeof phrases.$inferSelect;

const REGISTER_VI: Record<string, string> = {
  formal: 'Trang trọng',
  neutral: 'Trung tính',
  casual: 'Thân mật',
};

/**
 * Thẻ cụm từ: cụm tiếng Anh, IPA, nghĩa tiếng Việt, ví dụ, sắc thái, nút phát âm (FR-V-02).
 * `hideMeaning` dùng cho mặt trước khi lật thẻ.
 */
export function PhraseCard({
  phrase,
  onSpeak,
  hideMeaning,
}: {
  phrase: Phrase;
  onSpeak?: (text: string, slow?: boolean) => void;
  hideMeaning?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <Text style={[styles.text, { color: c.text }]} accessibilityRole="header">
        {phrase.text}
      </Text>
      {phrase.ipa ? <Text style={[styles.ipa, { color: c.muted }]}>{phrase.ipa}</Text> : null}
      <Row>
        <Badge text={phrase.level} />
        {phrase.register ? <Badge text={REGISTER_VI[phrase.register] ?? phrase.register} /> : null}
      </Row>
      {onSpeak ? (
        <Row>
          <OutlineButton
            title="🔊 Nghe"
            accessibilityLabel={`Nghe phát âm: ${phrase.text}`}
            onPress={() => onSpeak(phrase.text)}
          />
          <OutlineButton
            title="🐢 Nghe chậm"
            accessibilityLabel={`Nghe chậm: ${phrase.text}`}
            onPress={() => onSpeak(phrase.text, true)}
          />
        </Row>
      ) : null}
      {hideMeaning ? null : (
        <View style={styles.back}>
          <Text style={[styles.meaning, { color: c.text }]}>{phrase.meaningVi}</Text>
          {phrase.example ? (
            <View style={styles.example}>
              <Text style={[styles.exampleText, { color: c.muted }]}>Ví dụ: {phrase.example}</Text>
              {onSpeak ? (
                <OutlineButton
                  title="🔊 Nghe ví dụ"
                  accessibilityLabel="Nghe câu ví dụ"
                  onPress={() => onSpeak(phrase.example ?? '')}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 18, gap: 10 },
  text: { fontSize: 26, fontWeight: '700' },
  ipa: { fontSize: 16 },
  back: { gap: 10, marginTop: 4 },
  meaning: { fontSize: 20, fontWeight: '600' },
  example: { gap: 8 },
  exampleText: { fontSize: 16, fontStyle: 'italic', lineHeight: 22 },
});
