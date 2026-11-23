import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Card, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import { listNotes, listTags, type Note } from '@/features/notes/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

const SOURCE_LABEL = { manual: '', vocab: '📚 Từ vựng', chat: '💬 Hội thoại' } as const;

/** Danh sách ghi chú: ghim lên đầu, tìm kiếm không dấu, lọc theo tag (FR-N-02…04). */
export default function NotesScreen() {
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const data = useFocusQuery(
    () => ({
      notes: listNotes(db, { query, tag: tag ?? undefined }),
      tags: listTags(db),
    }),
    `${query}|${tag}`,
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Title>Sổ tay</Title>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm ghi chú (không cần dấu)…"
          placeholderTextColor={c.muted}
          accessibilityLabel="Tìm ghi chú"
          style={[
            styles.search,
            { color: c.text, backgroundColor: c.surface, borderColor: c.border },
          ]}
          clearButtonMode="while-editing"
        />
        {data && data.tags.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row>
              <Chip label="Tất cả" selected={tag === null} onPress={() => setTag(null)} />
              {data.tags.map((t) => (
                <Chip
                  key={t.tag}
                  label={`#${t.tag} (${t.count})`}
                  selected={tag?.toLowerCase() === t.tag.toLowerCase()}
                  onPress={() => setTag(t.tag)}
                />
              ))}
            </Row>
          </ScrollView>
        ) : null}
        <Button
          title="＋ Ghi chú mới"
          variant="secondary"
          onPress={() => router.push({ pathname: '/notes/[id]', params: { id: 'new' } })}
        />
      </View>
      <FlatList
        data={data?.notes ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          data ? (
            <Text style={{ color: c.muted }}>
              {query || tag
                ? 'Không có ghi chú phù hợp.'
                : 'Chưa có ghi chú. Lưu nhanh từ thẻ từ vựng hoặc tạo mới.'}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => <NoteRow note={item} />}
      />
    </View>
  );
}

function NoteRow({ note }: { note: Note }) {
  const c = useColors();
  return (
    <Card
      accessibilityLabel={`${note.pinned ? 'Đã ghim. ' : ''}${note.body}`}
      onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
    >
      <Text numberOfLines={3} style={{ color: c.text, fontSize: 16 }}>
        {note.pinned ? '📌 ' : ''}
        {note.body}
      </Text>
      <Row>
        {SOURCE_LABEL[note.source] ? (
          <Text style={{ color: c.muted, fontSize: 13 }}>{SOURCE_LABEL[note.source]}</Text>
        ) : null}
        {note.tags.map((t) => (
          <Text key={t} style={{ color: c.primary, fontSize: 13, fontWeight: '700' }}>
            #{t}
          </Text>
        ))}
      </Row>
    </Card>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primarySoft : c.surface,
        },
      ]}
    >
      <Text style={{ color: selected ? c.primary : c.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, paddingBottom: 8, gap: 10 },
  search: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  list: { padding: 16, paddingTop: 4, gap: 10 },
});
