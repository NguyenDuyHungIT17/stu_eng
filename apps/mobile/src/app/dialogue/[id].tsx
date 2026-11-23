import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { useDb } from '@/db/client';
import { Bubble, LEARNER, speakerColor, useDialoguePlayback } from '@/features/dialogue/bubbles';
import { getDialogue } from '@/features/dialogue/repository';
import { saveFromPhrase } from '@/features/notes/repository';
import { hasEnglishVoice } from '@/services/tts';

/** Xem trọn một đoạn hội thoại: tình huống, nghe cả đoạn, lưu câu vào sổ tay, bắt đầu luyện. */
export default function DialogueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const dialogue = useMemo(() => getDialogue(db, id), [db, id]);
  const [canListen, setCanListen] = useState(false);
  const [showMeaning, setShowMeaning] = useState(true);
  const playback = useDialoguePlayback(dialogue?.lines ?? [], canListen);

  useEffect(() => {
    void hasEnglishVoice(2000).then(setCanListen);
  }, []);

  if (!dialogue) {
    return <Text style={{ padding: 16, color: c.muted }}>Không tìm thấy hội thoại.</Text>;
  }

  const save = (lineId: string) => {
    const l = dialogue.lines.find((x) => x.id === lineId);
    if (!l) return;
    saveFromPhrase(
      db,
      { id: l.id, text: l.text, meaningVi: l.meaningVi, example: null },
      Date.now(),
    );
    Alert.alert('Đã lưu vào sổ tay', l.text);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: dialogue.title }} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Text style={{ color: c.text, fontSize: 16, lineHeight: 24 }}>
            📍 {dialogue.situationVi}
          </Text>
          <View style={styles.people}>
            {(['a', 'b'] as const).map((k) => (
              <View key={k} style={styles.person}>
                <Avatar name={dialogue.speakers[k].name} color={speakerColor(c, k)} size={28} />
                <Text style={{ color: c.muted, flexShrink: 1 }}>
                  {dialogue.speakers[k].name}
                  {k === LEARNER ? ' (bạn)' : ''} · {dialogue.speakers[k].roleVi}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.controls}>
          {canListen ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => (playback.playing === null ? playback.playFrom(0) : playback.stop())}
              style={[styles.pill, { backgroundColor: c.primary }]}
            >
              <Text style={{ color: c.onPrimary, fontWeight: '600' }}>
                {playback.playing === null ? '▶ Nghe cả đoạn' : '■ Dừng'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowMeaning((v) => !v)}
            style={[styles.pill, { backgroundColor: c.primarySoft }]}
          >
            <Text style={{ color: c.primary, fontWeight: '600' }}>
              {showMeaning ? 'Ẩn nghĩa' : 'Hiện nghĩa'}
            </Text>
          </Pressable>
        </View>
        {dialogue.lines.map((l, i) => (
          <Bubble
            key={l.id}
            line={l}
            speakers={dialogue.speakers}
            showMeaning={showMeaning}
            active={playback.playing === i}
            onPress={() => playback.playLine(l)}
            onLongPress={() => save(l.id)}
          />
        ))}
        <Text style={{ color: c.muted, textAlign: 'center', marginTop: 4 }}>
          Chạm để nghe lại · Nhấn giữ để lưu câu vào sổ tay
        </Text>
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: insets.bottom + 14 }}>
        <Button
          title="Luyện hội thoại này"
          onPress={() => {
            playback.stop();
            router.push({ pathname: '/lesson', params: { dialogue: dialogue.id } });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 10, paddingBottom: 24 },
  card: { borderRadius: 18, padding: 16, gap: 12 },
  people: { gap: 6 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controls: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
