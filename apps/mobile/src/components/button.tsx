import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from './theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
};

export function Button({ title, onPress, disabled, variant = 'primary' }: Props) {
  const c = useColors();
  const bg = variant === 'danger' ? c.danger : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
