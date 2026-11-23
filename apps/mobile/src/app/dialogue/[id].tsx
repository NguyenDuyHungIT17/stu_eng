import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { useDb } from '@/db/client';
import { LEARNER, speakerColor } from '@/features/dialogue/bubbles';
import { ChatReveal } from '@/features/dialogue/chat-reveal';
import { getDialogue, type Line } from '@/features/dialogue/repository';
import { saveFromPhrase } from '@/features/notes/repository';
import { hasEnglishVoice, stop } from '@/services/tts';

/**
 * Xem một đoạn hội thoại: tình huống tóm tắt, câu hiện dần như tin nhắn (hết đoạn thì đọc lại
 * được cả bài), nhấn giữ câu để lưu vào sổ tay, rồi bắt đầu luyện.
 */
export default function DialogueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const dialogue = useMemo(() => getDialogue(db, id), [db, id]);
  const [canListen, setCanListen] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void hasEnglishVoice(2000).then(setCanListen);
  }, []);

  if (!dialogue) {
    return <Text style={{ padding: 16, color: c.muted }}>Không tìm thấy hội thoại.</Text>;
  }

  const save = (l: Line) => {
    saveFromPhrase(
      db,
      { id: l.id, text: l.text, meaningVi: l.meaningVi, example: null },
      Date.now(),
    );
    Alert.alert('Đã lưu vào sổ tay', l.text);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingBottom: insets.bottom + 14 }]}>
      <Stack.Screen options={{ title: dialogue.title }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tình huống, chạm để xem đầy đủ"
        onPress={() => setExpanded((v) => !v)}
        style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}
      >
        <Text
          numberOfLines={expanded ? undefined : 2}
          style={{ color: c.text, fontSize: 15, lineHeight: 22 }}
        >
          📍 {dialogue.situationVi}
        </Text>
        <View style={styles.people}>
          {(['a', 'b'] as const).map((k) => (
            <View key={k} style={styles.person}>
              <Avatar name={dialogue.speakers[k].name} color={speakerColor(c, k)} size={24} />
              <Text numberOfLines={1} style={{ color: c.muted, fontSize: 13, flexShrink: 1 }}>
                {dialogue.speakers[k].name}
                {k === LEARNER ? ' (bạn)' : ''}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      {canListen === null ? (
        <View style={{ flex: 1 }} />
      ) : (
        <ChatReveal
          lines={dialogue.lines}
          speakers={dialogue.speakers}
          canListen={canListen}
          autoPlay
          onLongPressLine={save}
        />
      )}
      <Text style={{ color: c.muted, textAlign: 'center', fontSize: 12 }}>
        Chạm câu để nghe lại · Nhấn giữ để lưu vào sổ tay
      </Text>
      <Button
        title="Luyện hội thoại này"
        onPress={() => {
          stop();
          router.push({ pathname: '/lesson', params: { dialogue: dialogue.id } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10 },
  card: { borderRadius: 16, padding: 12, gap: 8 },
  people: { flexDirection: 'row', gap: 16 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
});
