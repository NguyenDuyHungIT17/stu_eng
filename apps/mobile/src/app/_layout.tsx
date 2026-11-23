import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useColorScheme } from 'react-native';
import { DbProvider } from '@/db/client';

export default function RootLayout() {
  const scheme = useColorScheme();
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
