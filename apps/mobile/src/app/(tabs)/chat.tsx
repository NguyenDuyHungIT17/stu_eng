import { scenarios } from '@app/content';
import { Text, View } from 'react-native';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { Badge, Card } from '@/components/ui';

/** Luyện nói với AI theo tình huống (Sprint 3). Hiện mới liệt kê các tình huống. */
export default function ChatListScreen() {
  const c = useColors();
  return (
    <Screen tab>
      <Title>Luyện nói</Title>
      <Body muted>Trò chuyện với AI theo tình huống thật. Sắp ra mắt!</Body>
      {scenarios.map((s) => (
        <Card key={s.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 30 }}>🗣️</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>{s.title}</Text>
              <Text style={{ color: c.muted }}>{s.goalVi}</Text>
            </View>
            <Badge text={s.level} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
