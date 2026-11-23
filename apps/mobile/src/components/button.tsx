import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Colors, useColors } from './theme';

type Variant = 'primary' | 'danger' | 'ok' | 'blue' | 'secondary';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  accessibilityLabel?: string;
};

function palette(c: Colors, v: Variant) {
  switch (v) {
    case 'danger':
      return { bg: c.danger, edge: c.dangerDark, fg: '#FFFFFF' };
    case 'ok':
      return { bg: c.ok, edge: c.okDark, fg: '#FFFFFF' };
    case 'blue':
      return { bg: c.blue, edge: c.blueDark, fg: '#FFFFFF' };
    case 'secondary':
      return { bg: c.card, edge: c.borderDark, fg: c.blue, border: c.border };
    default:
      return { bg: c.primary, edge: c.primaryDark, fg: '#FFFFFF' };
  }
}

/** Nút chính dạng "khối": chữ in hoa, viền dưới đậm, nhấn thì lún xuống. */
export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
  accessibilityLabel,
}: Props) {
  const c = useColors();
  const p = disabled ? { bg: c.locked, edge: c.lockedDark, fg: c.muted } : palette(c, variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.btn,
            {
              backgroundColor: p.bg,
              borderColor: 'border' in p ? p.border : p.bg,
              borderBottomColor: p.edge,
              borderBottomWidth: pressed ? 2 : 5,
              marginTop: pressed ? 3 : 0,
            },
          ]}
        >
          <Text style={[styles.text, { color: p.fg }]}>{title.toUpperCase()}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '800', letterSpacing: 0.8 },
});
