import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from './theme';

/** Màn cuộn được. `tab`: màn trong tab không có thanh tiêu đề, chừa chỗ thanh trạng thái. */
export function Screen({ children, tab }: { children: ReactNode; tab?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.content, tab ? { paddingTop: insets.top + 12 } : null]}
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.muted : c.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32, flexGrow: 1 },
  title: { fontSize: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
});
