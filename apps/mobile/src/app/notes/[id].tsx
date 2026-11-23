import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen } from '@/components/screen';
import { useColors } from '@/components/theme';
import { OutlineButton, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { createNote, deleteNote, getNote, updateNote } from '@/features/notes/repository';
import { useTts } from '@/services/use-tts';

const SOURCE_VI = { manual: null, vocab: 'Lưu từ thẻ từ vựng', chat: 'Lưu từ hội thoại AI' };

/** Tạo/sửa ghi chú, gắn tag, ghim, xóa (FR-N-01, FR-N-02, FR-N-04); đọc lại bằng TTS (FR-N-05). */
export default function NoteEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const db = useDb();
  const c = useColors();
  const tts = useTts();
  const existing = useMemo(() => (isNew ? undefined : getNote(db, id)), [db, id, isNew]);

  const [body, setBody] = useState(existing?.body ?? '');
  const [tagsText, setTagsText] = useState(existing?.tags.join(', ') ?? '');
  const [pinned, setPinned] = useState(existing?.pinned ?? false);
  const [error, setError] = useState<string | null>(null);

  if (!isNew && !existing) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ghi chú' }} />
        <Body muted>Không tìm thấy ghi chú (có thể đã bị xóa).</Body>
      </Screen>
    );
  }

  const save = () => {
    const tags = tagsText.split(/[,\n]/);
    try {
      if (existing) updateNote(db, existing.id, { body, tags, pinned }, Date.now());
      else createNote(db, { body, tags, pinned }, Date.now());
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Xóa ghi chú?', 'Không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          deleteNote(db, existing.id);
          router.back();
        },
      },
    ]);
  };

  // Ghi chú có nguồn: dòng đầu là câu tiếng Anh → đọc lại bằng TTS.
  const englishLine = existing && existing.source !== 'manual' ? body.split('\n')[0]?.trim() : '';
  const sourceLabel = existing ? SOURCE_VI[existing.source] : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Ghi chú mới' : 'Sửa ghi chú' }} />
      {sourceLabel ? <Body muted>{sourceLabel}</Body> : null}
      {englishLine ? (
        <Row>
          <OutlineButton title="🔊 Nghe lại" onPress={() => tts.speak(englishLine)} />
          <OutlineButton
            title="🐢 Nghe chậm"
            onPress={() => tts.speak(englishLine, { slow: true })}
          />
        </Row>
      ) : null}
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        autoFocus={isNew}
        placeholder="Nội dung ghi chú…"
        placeholderTextColor={c.muted}
        accessibilityLabel="Nội dung ghi chú"
        style={[styles.input, styles.body, { color: c.text, backgroundColor: c.surface }]}
      />
      <TextInput
        value={tagsText}
        onChangeText={setTagsText}
        placeholder="Tag, cách nhau bằng dấu phẩy (vd: du lịch, công việc)"
        placeholderTextColor={c.muted}
        accessibilityLabel="Tag"
        autoCapitalize="none"
        style={[styles.input, { color: c.text, backgroundColor: c.surface }]}
      />
      <View style={styles.pinRow}>
        <Text style={{ color: c.text, fontSize: 16 }}>📌 Ghim lên đầu</Text>
        <Switch value={pinned} onValueChange={setPinned} accessibilityLabel="Ghim ghi chú" />
      </View>
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      <Button title="Lưu" onPress={save} disabled={!body.trim()} />
      {existing ? <Button title="Xóa ghi chú" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  body: { minHeight: 160, textAlignVertical: 'top' },
  pinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
