import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from './theme';

/** Khối nền xám bo góc. Có `onPress` thì thành nút bấm cả khối. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  if (!onPress) return <View style={[styles.card, { backgroundColor: c.card }]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Nhãn nhỏ (trình độ, sắc thái). */
export function Badge({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { borderColor: c.muted }]}>
      <Text style={[styles.badgeText, { color: c.muted }]}>{text}</Text>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** Nút phụ dạng viền. */
export function OutlineButton({
  title,
  onPress,
  color,
  selected,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const tint = color ?? c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outline,
        {
          borderColor: tint,
          backgroundColor: selected ? tint : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={[styles.outlineText, { color: selected ? '#FFFFFF' : tint }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  outline: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
