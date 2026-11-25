import { getScenario } from '@app/content';
import type { FeedbackResponse, QuotaResponse } from '@app/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { useDb } from '@/db/client';
import {
  addMessage,
  finishSession,
  getOpenSession,
  listMessages,
  type Message,
  type Session,
  saveExplanation,
  saveMessageToNotes,
  startSession,
  toApiMessages,
} from '@/features/chat/repository';
import { resetTimeLabel, useApi, useOnline } from '@/features/chat/use-api';
import { createNote } from '@/features/notes/repository';
import { useStudyTimer } from '@/features/progress/use-study-timer';
import { ApiError, type ClientErrorCode, errorMessage } from '@/services/api-client';
import { hasEnglishVoice } from '@/services/tts';
import { isSpeechInputAvailable, useSpeechInput } from '@/services/use-speech-input';
import { useTts } from '@/services/use-tts';

type Status = 'idle' | 'sending' | 'ending';

/**
 * Hội thoại với AI bằng chữ (Sprint 3a): stream câu trả lời, giải thích tiếng Việt, lưu câu
 * vào sổ tay, kết thúc buổi để nhận tổng kết. Có nút micro để đọc thay vì gõ (nếu máy hỗ trợ).
 */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scenario = getScenario(id);
  const db = useDb();
  const c = useColors();
  const api = useApi();
  const online = useOnline();
  const tts = useTts();
  const insets = useSafeAreaInsets();
  useStudyTimer(db);

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ClientErrorCode | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [canListen, setCanListen] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const buffer = useRef('');
  const speech = useSpeechInput();
  const canSpeak = isSpeechInputAvailable();

  // Mở buổi đang dở hoặc bắt đầu buổi mới (câu mở đầu không tốn lượt).
  useEffect(() => {
    if (!scenario) return;
    const s =
      getOpenSession(db, scenario.id) ??
      startSession(
        db,
        { scenarioId: scenario.id, level: scenario.level, opener: scenario.opener },
        Date.now(),
      );
    setSession(s);
    setMessages(listMessages(db, s.id));
    void hasEnglishVoice(2000).then(setCanListen);
    api.quota().then(setQuota, () => undefined);
  }, [db, scenario, api]);

  // Kết quả nhận diện giọng nói → điền vào ô nhập.
  useEffect(() => {
    if (speech.final) setInput((v) => (v ? `${v} ${speech.final}` : (speech.final ?? '')));
  }, [speech.final]);

  const speak = useCallback(
    (text: string) => {
      if (canListen) tts.speak(text);
    },
    [canListen, tts],
  );

  const reply = useCallback(
    async (history: Message[]) => {
      if (!session || !scenario) return;
      setStatus('sending');
      setError(null);
      buffer.current = '';
      setPending('');
      // Cập nhật giao diện theo lô ~50 ms (TK §6.2).
      const flush = setInterval(() => setPending(buffer.current), 50);
      try {
        await api.streamChat(
          {
            scenarioId: scenario.id,
            level: scenario.level as never,
            messages: toApiMessages(history),
          },
          (t) => {
            buffer.current += t;
          },
        );
        const text = buffer.current.trim();
        if (text) {
          const m = addMessage(db, session.id, 'assistant', text, Date.now());
          setMessages((prev) => [...prev, m]);
          speak(text);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.code : 'network');
      } finally {
        clearInterval(flush);
        setPending(null);
        setStatus('idle');
        api.quota().then(setQuota, () => undefined);
      }
    },
    [api, db, scenario, session, speak],
  );

  const send = () => {
    const text = input.trim();
    if (!text || !session || status !== 'idle') return;
    tts.stop();
    const m = addMessage(db, session.id, 'user', text, Date.now());
    const history = [...messages, m];
    setMessages(history);
    setInput('');
    void reply(history);
  };

  const explain = async (m: Message) => {
    if (!scenario || explaining) return;
    setExplaining(m.id);
    try {
      const idx = messages.findIndex((x) => x.id === m.id);
      const context = toApiMessages(messages.slice(Math.max(0, idx - 2), idx));
      const ex = await api.explain({
        level: scenario.level as never,
        sentence: m.content.slice(0, 1000),
        context,
      });
      saveExplanation(db, m.id, ex);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, explanation: ex } : x)));
    } catch (e) {
      Alert.alert('Chưa giải thích được', errorMessage(e instanceof ApiError ? e.code : 'network'));
    } finally {
      setExplaining(null);
    }
  };

  const userTurns = messages.filter((m) => m.role === 'user').length;

  const end = async () => {
    if (!session || !scenario) return;
    if (userTurns === 0) return router.back();
    tts.stop();
    setStatus('ending');
    setError(null);
    try {
      const fb = await api.feedback({
        scenarioId: scenario.id,
        level: scenario.level as never,
        messages: toApiMessages(messages).slice(-60),
      });
      finishSession(db, session.id, fb, Date.now());
      setFeedback(fb);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'network');
    } finally {
      setStatus('idle');
    }
  };

  if (!scenario) return <Text style={{ padding: 16, color: c.muted }}>Không có kịch bản này.</Text>;
  if (feedback) return <FeedbackView fb={feedback} bottom={insets.bottom} />;

  const outOfQuota =
    error === 'quota_device' || (quota ? quota.chat.used >= quota.chat.limit : false);
  const last = messages[messages.length - 1];
  const canRetry = error !== null && error !== 'quota_device' && last?.role === 'user';
  const disabled = !online || status !== 'idle' || outOfQuota;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="padding">
      <Stack.Screen
        options={{
          title: scenario.title,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={end}
              disabled={status !== 'idle'}
              hitSlop={8}
            >
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>Kết thúc</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <View style={[styles.goal, { backgroundColor: c.primarySoft }]}>
          <Text style={{ color: c.text, lineHeight: 20 }}>🎯 {scenario.goalVi}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>
            Gợi ý: {scenario.keywords.map((k) => `“${k}”`).join(' · ')}
          </Text>
        </View>
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            m={m}
            onSpeak={canListen ? () => speak(m.content) : undefined}
            onExplain={() => void explain(m)}
            explaining={explaining === m.id}
            onSave={() => {
              saveMessageToNotes(db, m, Date.now());
              Alert.alert('Đã lưu vào sổ tay', m.content);
            }}
          />
        ))}
        {pending !== null ? (
          <View style={styles.rowAi}>
            <Avatar name="AI" color={c.accent} size={30} />
            <View
              style={[
                styles.bubble,
                styles.bubbleAi,
                { backgroundColor: c.bubbleOther, borderColor: c.border },
              ]}
            >
              {pending ? (
                <Text style={{ color: c.text, fontSize: 16, lineHeight: 23 }}>{pending}</Text>
              ) : (
                <ActivityIndicator color={c.muted} />
              )}
            </View>
          </View>
        ) : null}
        {status === 'ending' ? (
          <Text style={{ color: c.muted, textAlign: 'center' }}>Đang tổng kết buổi nói…</Text>
        ) : null}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.dangerSoft }]}>
            <Text style={{ color: c.danger }}>
              {error === 'quota_device'
                ? `Bạn đã dùng hết lượt hôm nay. Có lượt mới lúc ${resetTimeLabel(quota?.resetsAt)}.`
                : errorMessage(error)}
            </Text>
            {canRetry ? (
              <Pressable accessibilityRole="button" onPress={() => void reply(messages)}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>↻ Thử lại</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + 8 },
          cardShadow(c),
        ]}
      >
        {!online ? (
          <Text style={{ color: c.accent, textAlign: 'center' }}>
            📶 Cần mạng để trò chuyện với AI
          </Text>
        ) : null}
        {speech.listening ? (
          <Text style={{ color: c.muted, fontStyle: 'italic' }}>
            🎙️ {speech.transcript || 'Đang nghe…'}
          </Text>
        ) : speech.error ? (
          <Text style={{ color: c.danger, fontSize: 13 }}>{speech.error}</Text>
        ) : null}
        <View style={styles.inputRow}>
          {canSpeak ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speech.listening ? 'Dừng nghe' : 'Nói'}
              disabled={disabled}
              onPress={() => {
                if (speech.listening) return speech.stop();
                tts.stop();
                void speech.start();
              }}
              style={[
                styles.round,
                {
                  backgroundColor: speech.listening ? c.accent : c.primarySoft,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 20 }}>{speech.listening ? '■' : '🎙️'}</Text>
            </Pressable>
          ) : null}
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!disabled}
            placeholder={outOfQuota ? 'Hết lượt hôm nay' : 'Nhập câu tiếng Anh…'}
            placeholderTextColor={c.muted}
            multiline
            maxLength={1000}
            style={[styles.input, { color: c.text, backgroundColor: c.bg }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gửi"
            disabled={disabled || !input.trim()}
            onPress={send}
            style={[
              styles.round,
              { backgroundColor: c.primary, opacity: disabled || !input.trim() ? 0.4 : 1 },
            ]}
          >
            <Text style={{ color: c.onPrimary, fontSize: 18, fontWeight: '700' }}>➤</Text>
          </Pressable>
        </View>
        {quota && !outOfQuota ? (
          <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>
            Còn {Math.max(0, quota.chat.limit - quota.chat.used)} lượt nói hôm nay
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({
  m,
  onSpeak,
  onExplain,
  explaining,
  onSave,
}: {
  m: Message;
  onSpeak?: () => void;
  onExplain: () => void;
  explaining: boolean;
  onSave: () => void;
}) {
  const c = useColors();
  if (m.role === 'user') {
    return (
      <View style={styles.rowMe}>
        <View
          style={[
            styles.bubble,
            styles.bubbleMe,
            { backgroundColor: c.bubbleMe, borderColor: c.bubbleMe },
          ]}
        >
          <Text style={{ color: c.onPrimary, fontSize: 16, lineHeight: 23 }}>{m.content}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.rowAi}>
      <Avatar name="AI" color={c.accent} size={30} />
      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={[
            styles.bubble,
            styles.bubbleAi,
            { backgroundColor: c.bubbleOther, borderColor: c.border },
          ]}
        >
          <Text style={{ color: c.text, fontSize: 16, lineHeight: 23 }}>{m.content}</Text>
          {m.explanation ? (
            <View style={[styles.explain, { borderColor: c.border }]}>
              <Text style={{ color: c.text, lineHeight: 21 }}>🇻🇳 {m.explanation.translation}</Text>
              {m.explanation.notes.map((n) => (
                <Text key={n.phrase} style={{ color: c.muted, fontSize: 13 }}>
                  • {n.phrase}: {n.meaning}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.actions}>
          {onSpeak ? <Action label="🔊 Nghe" onPress={onSpeak} /> : null}
          {!m.explanation ? (
            <Action label={explaining ? 'Đang dịch…' : 'Dịch & giải thích'} onPress={onExplain} />
          ) : null}
          <Action label="🔖 Lưu" onPress={onSave} />
        </View>
      </View>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6}>
      <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** Màn tổng kết cuối buổi (FR-A-04). */
function FeedbackView({ fb, bottom }: { fb: FeedbackResponse; bottom: number }) {
  const db = useDb();
  const c = useColors();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: 'Tổng kết buổi nói', headerRight: () => null }} />
      <ScrollView contentContainerStyle={styles.thread}>
        <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Text style={[styles.h, { color: c.text }]}>💬 Nhận xét</Text>
          <Text style={{ color: c.text, lineHeight: 22 }}>{fb.summary}</Text>
        </View>
        {fb.mistakes.length > 0 ? (
          <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
            <Text style={[styles.h, { color: c.text }]}>✏️ Nói thế này hay hơn</Text>
            {fb.mistakes.map((m) => (
              <View key={`${m.original}-${m.better}`} style={styles.mistake}>
                <Text style={{ color: c.danger, textDecorationLine: 'line-through' }}>
                  {m.original}
                </Text>
                <Text style={{ color: c.ok, fontWeight: '600' }}>{m.better}</Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>{m.note}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {fb.usefulPhrases.length > 0 ? (
          <View style={[styles.card, { backgroundColor: c.surface }, cardShadow(c)]}>
            <Text style={[styles.h, { color: c.text }]}>⭐ Cụm nên dùng</Text>
            {fb.usefulPhrases.map((p) => (
              <View key={p} style={styles.phraseRow}>
                <Text style={{ color: c.text, flex: 1 }}>{p}</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={saved.has(p)}
                  onPress={() => {
                    createNote(db, { body: p, source: 'chat', tags: ['nói-với-AI'] }, Date.now());
                    setSaved((s) => new Set(s).add(p));
                  }}
                >
                  <Text style={{ color: saved.has(p) ? c.ok : c.primary, fontWeight: '600' }}>
                    {saved.has(p) ? '✓ Đã lưu' : '🔖 Lưu'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={{ padding: 16, paddingBottom: bottom + 14 }}>
        <Button title="Xong" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { padding: 16, gap: 10, paddingBottom: 24 },
  goal: { borderRadius: 14, padding: 12, gap: 4 },
  rowAi: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '90%' },
  rowMe: { flexDirection: 'row', justifyContent: 'flex-end' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  bubbleAi: { borderTopLeftRadius: 6, alignSelf: 'flex-start' },
  bubbleMe: { borderBottomRightRadius: 6, maxWidth: '82%' },
  explain: { borderTopWidth: 1, paddingTop: 6, gap: 2 },
  actions: { flexDirection: 'row', gap: 14, paddingLeft: 6 },
  errorBox: { borderRadius: 12, padding: 12, gap: 6 },
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 120,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderRadius: 16, padding: 14, gap: 8 },
  h: { fontSize: 16, fontWeight: '700' },
  mistake: { gap: 2, paddingVertical: 4 },
  phraseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
