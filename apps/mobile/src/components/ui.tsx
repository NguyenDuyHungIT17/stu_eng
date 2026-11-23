import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from './theme';

/** Khối bo góc có viền. Có `onPress` thì thành nút bấm cả khối. */
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
  const base = [
    styles.card,
    { backgroundColor: c.card, borderColor: c.border, borderBottomColor: c.borderDark },
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

/** Nhãn nhỏ (trình độ, sắc thái). */
export function Badge({ text, color }: { text: string; color?: string }) {
  const c = useColors();
  const tint = color ?? c.muted;
  return (
    <View style={[styles.badge, { borderColor: tint }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{text}</Text>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** Ô lựa chọn dạng khối (đáp án, mục tiêu…). */
export function OutlineButton({
  title,
  onPress,
  color,
  selected,
  accessibilityLabel,
  disabled,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const c = useColors();
  const tint = color ?? c.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outline,
        {
          borderColor: selected ? tint : c.border,
          borderBottomColor: selected ? tint : c.borderDark,
          backgroundColor: selected ? (color ? `${tint}22` : c.selectedBg) : c.card,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.outlineText, { color: selected ? tint : c.text }]}>{title}</Text>
    </Pressable>
  );
}

/** Thanh tiến độ bo tròn. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: c.locked }]}>
      <View style={[styles.fill, { width: pct, backgroundColor: color ?? c.ok }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 2, borderBottomWidth: 4, padding: 16, gap: 6 },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  badge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  outline: {
    flex: 1,
    minHeight: 52,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  track: { height: 16, borderRadius: 999, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 999 },
});
