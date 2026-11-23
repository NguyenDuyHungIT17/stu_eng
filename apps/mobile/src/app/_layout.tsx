import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DbProvider } from '@/db/client';
import { listEnglishVoices } from '@/services/tts';

export default function RootLayout() {
  const scheme = useColorScheme();
  // Khởi động engine TTS sớm: lần đầu hỏi danh sách giọng có thể mất vài giây.
  useEffect(() => {
    void listEnglishVoices();
  }, []);
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <DbProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="dev/spikes" options={{ title: 'Kiểm tra kỹ thuật (spike)' }} />
        </Stack>
      </DbProvider>
    </ThemeProvider>
  );
}
