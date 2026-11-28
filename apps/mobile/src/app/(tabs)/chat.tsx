import { scenarios } from '@app/content';
import type { QuotaResponse } from '@app/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardShadow, useColors } from '@/components/theme';
import { Badge } from '@/components/ui';
import { useDb } from '@/db/client';
import { countFinishedByScenario, getOpenSession } from '@/features/chat/repository';
import { resetTimeLabel, useApi, useOnline } from '@/features/chat/use-api';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Nói với AI: danh sách kịch bản, lượt còn lại hôm nay, trạng thái mạng (FR-A-02, FR-A-07). */
export default function ChatListScreen() {
  const db = useDb();
  const c = useColors();
  const api = useApi();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const data = useFocusQuery(() => {
    if (online) api.quota().then(setQuota, () => setQuota(null));
    return {
      finished: countFinishedByScenario(db),
      open: new Set(scenarios.filter((s) => getOpenSession(db, s.id)).map((s) => s.id)),
    };
  }, String(online));

  const left = quota ? Math.max(0, quota.chat.limit - quota.chat.used) : null;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Text style={[styles.title, { color: c.text }]}>Nói với AI</Text>
      <Text style={{ color: c.muted, lineHeight: 21 }}>
        Trò chuyện tự do theo tình huống: AI đóng vai người kia, cuối buổi chấm và gợi ý cách nói
        hay hơn.
      </Text>

      {!online ? (
        <View style={[styles.banner, { backgroundColor: c.accentSoft }]}>
          <Text style={{ color: c.accent, fontWeight: '600' }}>
            📶 Cần kết nối mạng để nói với AI. Phần hội thoại mẫu vẫn học được khi không có mạng.
          </Text>
        </View>
      ) : left !== null ? (
        <View style={[styles.banner, { backgroundColor: left > 0 ? c.primarySoft : c.dangerSoft }]}>
          <Text style={{ color: left > 0 ? c.primary : c.danger, fontWeight: '600' }}>
            {left > 0
              ? `Còn ${left}/${quota?.chat.limit} lượt nói hôm nay`
              : `Hết lượt hôm nay · có lượt mới lúc ${resetTimeLabel(quota?.resetsAt)}`}
          </Text>
        </View>
      ) : null}

      {scenarios.length === 0 ? (
        <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Text style={{ color: c.muted, textAlign: 'center' }}>
            Chưa có kịch bản hội thoại. Hãy cập nhật ứng dụng.
          </Text>
        </View>
      ) : (
        scenarios.map((s) => {
          const done = data?.finished[s.id] ?? 0;
          const open = data?.open.has(s.id);
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}. ${s.goalVi}`}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: s.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 },
                cardShadow(c),
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={{ fontSize: 26 }}>🗣️</Text>
                <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                  {s.title}
                </Text>
                <Badge text={s.level} color={c.primary} />
              </View>
              <Text style={{ color: c.muted, lineHeight: 20 }}>🎯 {s.goalVi}</Text>
              <Text style={{ color: c.text, fontStyle: 'italic' }} numberOfLines={1}>
                “{s.opener}”
              </Text>
              {open || done > 0 ? (
                <Text style={{ color: open ? c.accent : c.ok, fontSize: 13, fontWeight: '600' }}>
                  {open ? 'Đang trò chuyện dở · chạm để tiếp tục' : `Đã luyện ${done} lần`}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700' },
  banner: { borderRadius: 14, padding: 12 },
  card: { borderRadius: 18, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
});
