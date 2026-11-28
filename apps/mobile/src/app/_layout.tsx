import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { ThemePreferenceProvider, useThemePreference } from '@/components/theme';
import { DbProvider, useDb } from '@/db/client';
import { getThemeMode, hasOnboardingDone, SettingKey, setSetting } from '@/db/settings';
import { syncReminders } from '@/services/notifications';
import { listEnglishVoices } from '@/services/tts';

/** Lên lịch lại nhắc học mỗi lần mở app (chỉ sau khi hoàn thành onboarding). */
function ReminderSync() {
  const db = useDb();
  useEffect(() => {
    if (hasOnboardingDone(db)) void syncReminders(db, { ask: true });
  }, [db]);
  return null;
}

/** Điều hướng người dùng mới vào màn onboarding lần đầu mở app. */
function OnboardingGate() {
  const db = useDb();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hasOnboardingDone(db) && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [db, router, segments]);

  return null;
}

function ThemedShell({ children }: { children: ReactNode }) {
  const db = useDb();
  const initialMode = getThemeMode(db);
  return (
    <ThemePreferenceProvider
      initialMode={initialMode}
      onChangeMode={(m) => setSetting(db, SettingKey.themeMode, m)}
    >
      <ThemedNavigation>{children}</ThemedNavigation>
    </ThemePreferenceProvider>
  );
}

function ThemedNavigation({ children }: { children: ReactNode }) {
  const { resolved } = useThemePreference();
  return (
    <ThemeProvider value={resolved === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Khởi động engine TTS sớm: lần đầu hỏi danh sách giọng có thể mất vài giây.
  useEffect(() => {
    void listEnglishVoices();
  }, []);
  return (
    <DbProvider>
      <ThemedShell>
        <ReminderSync />
        <OnboardingGate />
        <Stack
          screenOptions={{ headerTitleStyle: { fontWeight: '800' }, headerShadowVisible: false }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="lesson" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="review" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="dev/spikes" options={{ title: 'Kiểm tra kỹ thuật (spike)' }} />
        </Stack>
      </ThemedShell>
    </DbProvider>
  );
}
