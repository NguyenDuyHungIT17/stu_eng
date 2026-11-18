import { scenarios } from '@app/content';
import { Body, Screen, Title } from '@/components/screen';

export default function ChatListScreen() {
  return (
    <Screen>
      <Title>Kịch bản hội thoại</Title>
      {scenarios.map((s) => (
        <Body key={s.id}>
          {s.title} · {s.level}
        </Body>
      ))}
      <Body muted>Hội thoại với AI sẽ có ở Sprint 3.</Body>
    </Screen>
  );
}
