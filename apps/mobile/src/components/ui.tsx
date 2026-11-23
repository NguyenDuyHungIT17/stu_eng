import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, useColors } from './theme';

/** Thẻ trắng bo góc, đổ bóng nhẹ. Có `onPress` thì thành nút bấm cả khối. */
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
  const base = [styles.card, { backgroundColor: c.surface }, cardShadow(c)];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

/** Nhãn nhỏ (trình độ…). */
export function Badge({ text, color }: { text: string; color?: string }) {
  const c = useColors();
  const tint = color ?? c.muted;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: tint }]}>{text}</Text>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

/** Ô lựa chọn (đáp án, mục tiêu…). `color` dùng để tô đúng/sai. */
export function OutlineButton({
  title,
  onPress,
  color,
  selected,
  accessibilityLabel,
  disabled,
  align = 'center',
}: {
  title: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
  align?: 'center' | 'left';
}) {
  const c = useColors();
  const tint = color ?? c.primary;
  const soft = color === c.ok ? c.okSoft : color === c.danger ? c.dangerSoft : c.primarySoft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? tint : c.border,
          backgroundColor: selected ? soft : c.surface,
          alignItems: align === 'left' ? 'flex-start' : 'center',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.optionText,
          { color: selected ? tint : c.text, textAlign: align === 'left' ? 'left' : 'center' },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** Thanh tiến độ mảnh. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` as const;
  return (
    <View style={[styles.track, { backgroundColor: c.border }]}>
      <View style={[styles.fill, { width: pct, backgroundColor: color ?? c.primary }]} />
    </View>
  );
}

/** Ảnh đại diện chữ cái đầu trong vòng tròn màu. */
export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.42 }}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  option: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  optionText: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 999 },
});
