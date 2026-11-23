import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { useColors } from '@/components/theme';

/** Icon tab bằng emoji: không cần thêm thư viện icon hay font. */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, lineHeight: 26, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>;
}

const TABS = [
  { name: 'index', title: 'Hội thoại', glyph: '💬' },
  { name: 'chat', title: 'Nói với AI', glyph: '🎙️' },
  { name: 'notes', title: 'Sổ tay', glyph: '📒' },
  { name: 'settings', title: 'Hồ sơ', glyph: '👤' },
] as const;

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border, borderTopWidth: 2 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <TabIcon glyph={t.glyph} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
