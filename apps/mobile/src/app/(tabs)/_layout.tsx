import { Tabs } from 'expo-router/js-tabs';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarLabelStyle: { fontSize: 12 } }}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="learn" options={{ title: 'Học' }} />
      <Tabs.Screen name="chat" options={{ title: 'Nói với AI' }} />
      <Tabs.Screen name="notes" options={{ title: 'Ghi chú' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}
