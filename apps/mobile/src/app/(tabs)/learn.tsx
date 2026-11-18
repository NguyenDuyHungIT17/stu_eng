import { topics } from '@app/content';
import { Body, Screen, Title } from '@/components/screen';

export default function LearnScreen() {
  return (
    <Screen>
      <Title>Chủ đề</Title>
      {topics.map((t) => (
        <Body key={t.id}>
          {t.title} · {t.level}
        </Body>
      ))}
    </Screen>
  );
}
