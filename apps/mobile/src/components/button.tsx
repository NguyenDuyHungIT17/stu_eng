import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from './theme';

type Variant = 'primary' | 'ok' | 'danger' | 'secondary';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  accessibilityLabel?: string;
};

/** Nút phẳng bo tròn. `secondary`: nền trong, viền mảnh. */
export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
  accessibilityLabel,
}: Props) {
  const c = useColors();
  const bg =
    variant === 'ok'
      ? c.ok
      : variant === 'danger'
        ? c.danger
        : variant === 'secondary'
          ? 'transparent'
          : c.primary;
  const fg = variant === 'secondary' ? c.primary : c.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: disabled && variant !== 'secondary' ? c.border : bg,
          borderColor: variant === 'secondary' ? c.primary : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.text, { color: disabled ? c.muted : fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '600' },
});
