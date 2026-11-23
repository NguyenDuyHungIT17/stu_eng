import { router } from 'expo-router';
import { type ComponentRef, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Colors, UNIT_COLORS, useColors } from '@/components/theme';
import { useDb } from '@/db/client';
import { getDailyMinutesGoal } from '@/db/settings';
import { getPath, type LessonNode, type Unit } from '@/features/lesson/path';
import { getStats } from '@/features/progress/stats';
import { countDueToday } from '@/features/review/repository';
import { useFocusQuery } from '@/lib/use-focus-query';

/** Lệch ngang của các nút bài học: đường đi uốn lượn. */
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

/**
 * Trang chủ = lộ trình học: mỗi chủ đề là một chặng, mỗi bài 5 câu.
 * Trên cùng: chuỗi ngày, phút học hôm nay, nút ôn tập khi có câu đến hạn.
 */
export default function HomeScreen() {
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolled = useRef(false);
  const data = useFocusQuery(() => {
    const now = Date.now();
    return {
      path: getPath(db),
      due: countDueToday(db, now),
      stats: getStats(db, now),
      minutesGoal: getDailyMinutesGoal(db),
    };
  });

  if (!data) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const { path, stats } = data;
  const cur = path.current;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8, borderColor: c.border, backgroundColor: c.bg },
        ]}
      >
        <Text style={styles.topItem}>🇬🇧</Text>
        <Text
          style={[styles.topItem, { color: stats.streak.todayDone ? c.orange : c.muted }]}
          accessibilityLabel={`Chuỗi ${stats.streak.current} ngày`}
        >
          🔥 {stats.streak.current}
        </Text>
        <Text
          style={[
            styles.topItem,
            { color: stats.todayMinutes >= data.minutesGoal ? c.ok : c.blue },
          ]}
          accessibilityLabel={`${stats.todayMinutes} trên ${data.minutesGoal} phút hôm nay`}
        >
          ⏱ {stats.todayMinutes}/{data.minutesGoal}′
        </Text>
        <Text style={[styles.topItem, { color: c.gold }]} accessibilityLabel="Câu đã thuộc">
          ⭐ {stats.mastered}
        </Text>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        {data.due > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/review')}
            style={({ pressed }) => [
              styles.review,
              { backgroundColor: c.blue, borderBottomColor: c.blueDark },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.reviewIcon}>🧠</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewTitle}>Ôn tập ngay</Text>
              <Text style={styles.reviewSub}>{data.due} câu đang chờ bạn ôn lại</Text>
            </View>
            <Text style={styles.reviewArrow}>›</Text>
          </Pressable>
        ) : null}

        {path.units.map((u, ui) => (
          <UnitBlock
            key={u.id}
            unit={u}
            number={ui + 1}
            colors={c}
            current={cur}
            onCurrentLayout={(y) => {
              if (scrolled.current) return;
              scrolled.current = true;
              scroll.current?.scrollTo({ y: Math.max(0, y - 160), animated: false });
            }}
          />
        ))}
        {path.units.length > 0 && !cur ? (
          <Text style={[styles.allDone, { color: c.gold }]}>🏁 Bạn đã học hết lộ trình!</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function UnitBlock({
  unit,
  number,
  colors: c,
  current,
  onCurrentLayout,
}: {
  unit: Unit;
  number: number;
  colors: Colors;
  current: LessonNode | null;
  onCurrentLayout: (y: number) => void;
}) {
  const tone = UNIT_COLORS[(number - 1) % UNIT_COLORS.length] ?? UNIT_COLORS[0];
  const main = c[tone?.main ?? 'primary'];
  const edge = c[tone?.dark ?? 'primaryDark'];
  const unitTop = useRef(0);
  const reached = current === null || unitIndexBefore(unit, current);

  return (
    <View onLayout={(e) => (unitTop.current = e.nativeEvent.layout.y)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Chặng ${number}: ${unit.title}. Xem danh sách câu`}
        onPress={() => router.push({ pathname: '/topic/[id]', params: { id: unit.id } })}
        style={[
          styles.unitHead,
          reached
            ? { backgroundColor: main, borderBottomColor: edge }
            : { backgroundColor: c.locked, borderBottomColor: c.lockedDark },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.unitKicker, { color: reached ? '#FFFFFFCC' : c.muted }]}>
            CHẶNG {number} · {unit.level} · {unit.learned}/{unit.phraseCount} CÂU
          </Text>
          <Text style={[styles.unitTitle, { color: reached ? '#FFFFFF' : c.muted }]}>
            {unit.title}
          </Text>
        </View>
        <Text style={styles.unitBook}>📖</Text>
      </Pressable>

      <View style={styles.nodes}>
        {unit.lessons.map((l, i) => {
          const isCurrent = current?.topicId === l.topicId && current.index === l.index;
          const open = l.done || isCurrent;
          const dx = OFFSETS[i % OFFSETS.length] ?? 0;
          return (
            <View
              key={l.index}
              style={{ transform: [{ translateX: dx }], alignItems: 'center' }}
              onLayout={
                isCurrent
                  ? (e) => onCurrentLayout(unitTop.current + e.nativeEvent.layout.y)
                  : undefined
              }
            >
              {isCurrent ? (
                <View
                  style={[styles.startBubble, { borderColor: c.border, backgroundColor: c.bg }]}
                >
                  <Text style={[styles.startText, { color: main }]}>
                    {l.learned > 0 ? 'HỌC TIẾP' : 'BẮT ĐẦU'}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bài ${l.index + 1}${l.done ? ', đã xong' : isCurrent ? ', bài hiện tại' : ', chưa mở'}`}
                accessibilityState={{ disabled: !open }}
                disabled={!open}
                onPress={() =>
                  router.push({
                    pathname: '/lesson',
                    params: { topic: l.topicId, n: String(l.index) },
                  })
                }
                style={({ pressed }) => [
                  styles.node,
                  isCurrent ? styles.nodeCurrent : null,
                  l.done
                    ? { backgroundColor: c.gold, borderBottomColor: c.goldDark }
                    : isCurrent
                      ? { backgroundColor: main, borderBottomColor: edge }
                      : { backgroundColor: c.locked, borderBottomColor: c.lockedDark },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.nodeIcon}>{l.done ? '✓' : isCurrent ? '★' : '🔒'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Chặng này đã tới (có bài xong hoặc chứa bài hiện tại). */
function unitIndexBefore(unit: Unit, current: LessonNode): boolean {
  return unit.lessons.some(
    (l) => l.done || (l.topicId === current.topicId && l.index === current.index),
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  topItem: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 18, paddingBottom: 48 },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderBottomWidth: 5,
    padding: 16,
  },
  reviewIcon: { fontSize: 34 },
  reviewTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  reviewSub: { color: '#FFFFFFDD', fontSize: 14 },
  reviewArrow: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  pressed: { transform: [{ translateY: 3 }], borderBottomWidth: 2 },
  unitHead: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderBottomWidth: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  unitTitle: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  unitBook: { fontSize: 26 },
  nodes: { alignItems: 'center', gap: 18, paddingVertical: 22 },
  node: {
    width: 72,
    height: 66,
    borderRadius: 36,
    borderBottomWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCurrent: { width: 84, height: 76, borderRadius: 42 },
  nodeIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '900' },
  startBubble: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  startText: { fontWeight: '800', letterSpacing: 0.6 },
  allDone: { textAlign: 'center', fontSize: 20, fontWeight: '800' },
});
