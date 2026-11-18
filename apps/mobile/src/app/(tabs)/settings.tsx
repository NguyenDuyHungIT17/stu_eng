import { router } from 'expo-router';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { API_BASE_URL } from '@/lib/config';

export default function SettingsScreen() {
  return (
    <Screen>
      <Title>Cài đặt</Title>
      <Body muted>API: {API_BASE_URL}</Body>
      <Button title="Kiểm tra kỹ thuật (Sprint 0)" onPress={() => router.push('/dev/spikes')} />
    </Screen>
  );
}
