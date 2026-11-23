import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

/** Icon tab bằng emoji: không cần thêm thư viện icon hay font. */
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
}

const TABS = [
  { name: 'index', title: 'Trang chủ', glyph: '🏠' },
  { name: 'learn', title: 'Học', glyph: '📚' },
  { name: 'chat', title: 'Nói với AI', glyph: '💬' },
  { name: 'notes', title: 'Ghi chú', glyph: '📝' },
  { name: 'settings', title: 'Cài đặt', glyph: '⚙️' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarLabelStyle: { fontSize: 12 } }}>
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
