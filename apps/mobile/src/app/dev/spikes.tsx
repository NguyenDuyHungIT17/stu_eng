// Màn hình kiểm tra kỹ thuật cho Sprint 0 (TK §11.1). Chạy trên máy thật, ghi kết quả vào PLAN.md.
// Gỡ màn hình này trước bản gửi người thử (S4-15).
import { fetch } from 'expo/fetch';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as SQLite from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Body, Screen, Title } from '@/components/screen';
import { useColors } from '@/components/theme';
import { API_BASE_URL } from '@/lib/config';
import { SseParser } from '@/lib/sse-parser';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { backgroundColor: c.card }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Log({ lines }: { lines: string[] }) {
  const c = useColors();
  if (lines.length === 0) return null;
  return <Text style={[styles.log, { color: c.muted }]}>{lines.join('\n')}</Text>;
}

/** S8: gọi /health. */
function HealthSpike() {
  const [log, setLog] = useState<string[]>([]);
  const run = async () => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      setLog([`HTTP ${res.status} sau ${Date.now() - t0}ms`, await res.text()]);
    } catch (e) {
      setLog([`LỖI: ${String(e)}`]);
    }
  };
  return (
    <Section title="S8 – Gọi /health">
      <Body muted>{API_BASE_URL}</Body>
      <Button title="Gọi /health" onPress={run} />
      <Log lines={log} />
    </Section>
  );
}

/** S1: đọc stream SSE bằng expo/fetch, đo thời gian token đầu. */
function SseSpike() {
  const [text, setText] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const run = async () => {
    setText('');
    const t0 = Date.now();
    let first = 0;
    let chunks = 0;
    try {
      const res = await fetch(`${API_BASE_URL}/dev/stream`, {
        headers: { Accept: 'text/event-stream' },
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = new SseParser();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks++;
        for (const ev of parser.push(decoder.decode(value, { stream: true }))) {
          if (ev.event === 'message') {
            if (!first) first = Date.now() - t0;
            const { t } = JSON.parse(ev.data) as { t: string };
            setText((prev) => prev + t);
          }
        }
      }
      setLog([
        `Token đầu: ${first}ms`,
        `Tổng: ${Date.now() - t0}ms`,
        `Số chunk mạng: ${chunks}`,
        chunks > 1 ? 'ĐẠT: nhận dần' : 'CHƯA ĐẠT: chỉ 1 chunk (bị gom cả cục)',
      ]);
    } catch (e) {
      setLog([`LỖI: ${String(e)}`]);
    }
  };
  return (
    <Section title="S1 – Stream SSE (expo/fetch)">
      <Button title="Bắt đầu stream" onPress={run} />
      <Body>{text}</Body>
      <Log lines={log} />
    </Section>
  );
}

/** S2: nhận diện giọng nói tiếng Anh. */
function SttSpike() {
  const [interim, setInterim] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const add = (l: string) => setLog((prev) => [...prev.slice(-8), l]);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (ev) => {
    const t = ev.results[0]?.transcript ?? '';
    if (ev.isFinal) add(`KẾT QUẢ: "${t}" (độ tin cậy ${ev.results[0]?.confidence ?? '?'})`);
    else setInterim(t);
  });
  useSpeechRecognitionEvent('error', (ev) => add(`LỖI: ${ev.error} – ${ev.message}`));

  const start = async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) return add('Không có quyền micro');
    add(`Engine sẵn sàng: ${ExpoSpeechRecognitionModule.isRecognitionAvailable()}`);
    add(
      `Dịch vụ: ${ExpoSpeechRecognitionModule.getSpeechRecognitionServices().join(', ') || '(không có)'}`,
    );
    setInterim('');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false });
  };

  return (
    <Section title="S2 – Nhận diện giọng nói (STT)">
      <Body muted>Đọc thử: "Could I get the bill, please?"</Body>
      <Button
        title={listening ? 'Đang nghe… (chạm để dừng)' : 'Bắt đầu nói'}
        onPress={listening ? () => ExpoSpeechRecognitionModule.stop() : start}
      />
      <Body>{interim}</Body>
      <Log lines={log} />
    </Section>
  );
}

/** S3: giọng đọc TTS tiếng Anh. Bật chế độ máy bay rồi bấm "Đọc thử" để kiểm tra offline. */
function TtsSpike() {
  const [log, setLog] = useState<string[]>([]);
  const listVoices = async () => {
    const voices = await Speech.getAvailableVoicesAsync();
    const en = voices.filter((v) => v.language.toLowerCase().startsWith('en'));
    setLog([
      `Tổng số giọng: ${voices.length}, tiếng Anh: ${en.length}`,
      ...en.slice(0, 12).map((v) => `${v.language} · ${v.quality} · ${v.identifier}`),
    ]);
  };
  const speak = () =>
    Speech.speak('Hi! Could I get the bill, please?', {
      language: 'en-US',
      onDone: () => setLog((p) => [...p, 'Đọc xong']),
      onError: (e) => setLog((p) => [...p, `LỖI TTS: ${String(e)}`]),
    });
  return (
    <Section title="S3 – Đọc văn bản (TTS)">
      <Button title="Liệt kê giọng tiếng Anh" onPress={listVoices} />
      <Button title="Đọc thử" onPress={speak} />
      <Log lines={log} />
    </Section>
  );
}

/** S6 (phần FTS5): kiểm tra build expo-sqlite có FTS5. */
function SqliteSpike() {
  const [log, setLog] = useState<string[]>([]);
  const run = async () => {
    try {
      const db = await SQLite.openDatabaseAsync(':memory:');
      await db.execAsync(
        "CREATE VIRTUAL TABLE t USING fts5(body); INSERT INTO t(body) VALUES ('hello world'), ('good morning');",
      );
      const row = await db.getFirstAsync<{ n: number }>(
        "SELECT count(*) AS n FROM t WHERE t MATCH 'hello'",
      );
      const ver = await db.getFirstAsync<{ v: string }>('SELECT sqlite_version() AS v');
      await db.closeAsync();
      setLog([
        `SQLite ${ver?.v}`,
        row?.n === 1 ? 'ĐẠT: FTS5 hoạt động' : `CHƯA ĐẠT: kết quả ${row?.n}`,
      ]);
    } catch (e) {
      setLog([`CHƯA ĐẠT: ${String(e)}`, '→ Dùng LIKE cho tìm kiếm ghi chú']);
    }
  };
  return (
    <Section title="S6 – SQLite FTS5">
      <Button title="Kiểm tra FTS5" onPress={run} />
      <Log lines={log} />
    </Section>
  );
}

export default function SpikesScreen() {
  return (
    <Screen>
      <Title>Kiểm tra kỹ thuật</Title>
      <Body muted>
        Chạy trên máy thật (APK release cho S1, S8). Ghi kết quả vào bảng "Kết quả spike" trong
        PLAN.md.
      </Body>
      <HealthSpike />
      <SseSpike />
      <SttSpike />
      <TtsSpike />
      <SqliteSpike />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { padding: 12, borderRadius: 12, gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  log: { fontFamily: 'monospace', fontSize: 12 },
});
