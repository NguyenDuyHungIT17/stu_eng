import { Tabs } from 'expo-router/js-tabs';
import { Text, View } from 'react-native';
import { useColors } from '@/components/theme';

/** Icon tab bằng emoji trong ô bo góc: không cần thêm thư viện icon hay font. */
function TabIcon({ glyph, focused, tint }: { glyph: string; focused: boolean; tint: string }) {
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: focused ? tint : 'transparent',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
    </View>
  );
}

const TABS = [
  { name: 'index', title: 'Học', glyph: '🏠' },
  { name: 'chat', title: 'Luyện nói', glyph: '🗣️' },
  { name: 'notes', title: 'Sổ tay', glyph: '📒' },
  { name: 'settings', title: 'Hồ sơ', glyph: '👤' },
] as const;

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.blue,
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
            tabBarIcon: ({ focused }) => (
              <TabIcon glyph={t.glyph} focused={focused} tint={c.blue} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
