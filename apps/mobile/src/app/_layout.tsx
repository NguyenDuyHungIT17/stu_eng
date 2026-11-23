import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DbProvider, useDb } from '@/db/client';
import { syncReminders } from '@/services/notifications';
import { listEnglishVoices } from '@/services/tts';

/** Lên lịch lại nhắc học mỗi lần mở app (bỏ lời nhắc hôm nay nếu đã học). */
function ReminderSync() {
  const db = useDb();
  useEffect(() => {
    void syncReminders(db, { ask: true });
  }, [db]);
  return null;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  // Khởi động engine TTS sớm: lần đầu hỏi danh sách giọng có thể mất vài giây.
  useEffect(() => {
    void listEnglishVoices();
  }, []);
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <DbProvider>
        <ReminderSync />
        <Stack
          screenOptions={{ headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="review" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="dev/spikes" options={{ title: 'Kiểm tra kỹ thuật (spike)' }} />
        </Stack>
      </DbProvider>
    </ThemeProvider>
  );
}
