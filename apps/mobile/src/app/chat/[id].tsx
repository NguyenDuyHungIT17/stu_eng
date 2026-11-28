import { getScenario } from '@app/content';
import type { FeedbackResponse, QuotaResponse } from '@app/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { Avatar } from '@/components/ui';
import { useDb } from '@/db/client';
import { hasPrivacyAck, setPrivacyAck } from '@/db/settings';
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
import { SentenceSplitter } from '@/features/chat/sentence-splitter';
import { createTtsQueue } from '@/features/chat/tts-queue';
import { resetTimeLabel, useApi, useOnline } from '@/features/chat/use-api';
import { initialVoiceState, transitionVoice } from '@/features/chat/voice-controller';
import { MicRationaleModal, PrivacyModal, VoiceControlBar } from '@/features/chat/voice-ui';
import { createNote } from '@/features/notes/repository';
import { useStudyTimer } from '@/features/progress/use-study-timer';
import { ApiError, type ClientErrorCode, errorMessage } from '@/services/api-client';
import { abortStt, getMicPermission } from '@/services/stt';
import { hasEnglishVoice } from '@/services/tts';
import { isSpeechInputAvailable, useSpeechInput } from '@/services/use-speech-input';
import { useTts } from '@/services/use-tts';

/**
 * Hội thoại với AI bằng giọng nói hoặc gõ chữ (Sprint 3a + 3b):
 * - Thông báo quyền riêng tư lần đầu (S3b-09), xin quyền micro kèm giải thích (S3b-02).
 * - Máy trạng thái voice-controller (S3b-03): chạm để nói, chạm để ngắt AI (S3b-06).
 * - Đọc từng câu ngay khi AI đang stream qua SentenceSplitter + hàng đợi TTS (S3b-04, S3b-05).
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

  const canSpeak = isSpeechInputAvailable();
  const speech = useSpeechInput();

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [voice, dispatchVoice] = useReducer(transitionVoice, canSpeak, initialVoiceState);
  const [ending, setEnding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ClientErrorCode | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [canListen, setCanListen] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(() => !hasPrivacyAck(db));
  const [showMicRationale, setShowMicRationale] = useState(false);

  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const buffer = useRef('');
  const splitter = useRef(new SentenceSplitter());
  const muteReplyTts = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const canListenRef = useRef(false);
  canListenRef.current = canListen;

  const ttsQueue = useMemo(
    () =>
      createTtsQueue({
        speak: (text, onDone) => tts.speak(text, undefined, onDone),
        stop: tts.stop,
        onActiveChange: (active) => dispatchVoice({ type: active ? 'TTS_START' : 'TTS_END' }),
      }),
    [tts],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortStt();
      ttsQueue.stop();
    },
    [ttsQueue],
  );

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

  const reply = useCallback(
    async (history: Message[]) => {
      if (!session || !scenario) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      muteReplyTts.current = false;
      splitter.current.reset();
      buffer.current = '';
      setError(null);
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
            if (canListenRef.current && !muteReplyTts.current) {
              for (const sentence of splitter.current.push(t)) {
                ttsQueue.enqueue(sentence);
              }
            }
          },
          ac.signal,
        );
        const tail = splitter.current.flush();
        if (tail && canListenRef.current && !muteReplyTts.current) {
          ttsQueue.enqueue(tail);
        }
        const text = buffer.current.trim();
        if (text) {
          const m = addMessage(db, session.id, 'assistant', text, Date.now());
          setMessages((prev) => [...prev, m]);
        }
        dispatchVoice({ type: 'STREAM_DONE' });
      } catch (e) {
        if (!ac.signal.aborted) {
          setError(e instanceof ApiError ? e.code : 'network');
        }
        dispatchVoice({ type: 'STREAM_ERROR' });
      } finally {
        clearInterval(flush);
        if (abortRef.current === ac) abortRef.current = null;
        setPending(null);
        api.quota().then(setQuota, () => undefined);
      }
    },
    [api, db, scenario, session, ttsQueue],
  );

  const submitUserText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || !session) return;
      ttsQueue.stop();
      const m = addMessage(db, session.id, 'user', text, Date.now());
      const history = [...messages, m];
      setMessages(history);
      void reply(history);
    },
    [db, messages, reply, session, ttsQueue],
  );

  // Đồng bộ interim transcript từ STT (S3b-07).
  useEffect(() => {
    if (speech.listening && speech.transcript) {
      dispatchVoice({ type: 'STT_INTERIM', text: speech.transcript });
    }
  }, [speech.listening, speech.transcript]);

  // Có kết quả cuối từ STT → gửi luôn nếu đang ở chế độ listening (hoặc điền ô gõ nếu typing).
  useEffect(() => {
    if (speech.final === null) return;
    const spoken = speech.final.trim();
    speech.reset();
    if (voice.mode === 'listening') {
      if (!spoken) {
        dispatchVoice({ type: 'STT_EMPTY' });
        return;
      }
      dispatchVoice({ type: 'STT_FINAL', text: spoken });
      submitUserText(spoken);
    } else if (spoken) {
      setInput((v) => (v ? `${v} ${spoken}` : spoken));
    }
  }, [speech, speech.final, submitUserText, voice.mode]);

  // Lỗi STT → chuyển sang gõ chữ nếu do quyền/dịch vụ (S3b-02, TK §6.2).
  useEffect(() => {
    if (!speech.error) return;
    const msg = speech.error;
    const toTyping = speech.denied;
    speech.reset();
    dispatchVoice({ type: 'STT_ERROR', message: msg, toTyping });
  }, [speech, speech.denied, speech.error]);

  const startVoiceTurn = useCallback(async () => {
    // Luôn dừng TTS trước khi bật STT (S3b-06).
    muteReplyTts.current = true;
    ttsQueue.stop();
    dispatchVoice({ type: 'TAP_MIC' });
    const res = await speech.start();
    if (!res.ok) {
      speech.reset();
      if (res.denied) dispatchVoice({ type: 'MIC_DENIED', message: res.message });
      else dispatchVoice({ type: 'STT_ERROR', message: res.message, toTyping: false });
    }
  }, [speech, ttsQueue]);

  const handleTapMic = useCallback(async () => {
    if (voice.mode === 'listening') {
      speech.stop();
      return;
    }
    const perm = await getMicPermission();
    if (!perm.granted) {
      // Dừng AI đọc trước khi hiện hộp thoại giải thích quyền micro.
      muteReplyTts.current = true;
      ttsQueue.stop();
      setShowMicRationale(true);
      return;
    }
    await startVoiceTurn();
  }, [speech, startVoiceTurn, ttsQueue, voice.mode]);

  const handleStopAi = useCallback(() => {
    muteReplyTts.current = true;
    ttsQueue.stop();
    dispatchVoice({ type: 'STOP_SPEAKING' });
  }, [ttsQueue]);

  const handleToggleTyping = useCallback(() => {
    muteReplyTts.current = true;
    ttsQueue.stop();
    if (voice.mode === 'listening') speech.stop();
    dispatchVoice({ type: 'TOGGLE_TYPING' });
  }, [speech, ttsQueue, voice.mode]);

  const handleSendText = () => {
    const text = input.trim();
    if (!text || voice.streaming) return;
    setInput('');
    dispatchVoice({ type: 'SEND_TEXT' });
    submitUserText(text);
  };

  const handleRetry = () => {
    if (voice.streaming) return;
    dispatchVoice({ type: 'SEND_TEXT' });
    void reply(messages);
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
    muteReplyTts.current = true;
    abortRef.current?.abort();
    ttsQueue.stop();
    speech.stop();
    if (userTurns === 0) return router.back();
    setEnding(true);
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
      setEnding(false);
    }
  };

  if (!scenario) return <Text style={{ padding: 16, color: c.muted }}>Không có kịch bản này.</Text>;
  if (feedback) return <FeedbackView fb={feedback} bottom={insets.bottom} />;

  const outOfQuota =
    error === 'quota_device' || (quota ? quota.chat.used >= quota.chat.limit : false);
  const last = messages[messages.length - 1];
  const canRetry = error !== null && error !== 'quota_device' && last?.role === 'user';
  const quotaLeft = quota ? Math.max(0, quota.chat.limit - quota.chat.used) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="padding">
      <Stack.Screen
        options={{
          title: scenario.title,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={end}
              disabled={voice.streaming || ending}
              hitSlop={8}
            >
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>Kết thúc</Text>
            </Pressable>
          ),
        }}
      />
      <PrivacyModal
        visible={showPrivacy}
        onAccept={() => {
          setPrivacyAck(db);
          setShowPrivacy(false);
        }}
        onDecline={() => router.back()}
      />
      <MicRationaleModal
        visible={showMicRationale}
        onAllow={() => {
          setShowMicRationale(false);
          void startVoiceTurn();
        }}
        onUseTyping={() => {
          setShowMicRationale(false);
          dispatchVoice({
            type: 'MIC_DENIED',
            message: 'Bạn có thể gõ chữ hoặc bấm biểu tượng micro để bật lại bất cứ lúc nào.',
          });
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
            onSpeak={
              canListen
                ? () => {
                    ttsQueue.stop();
                    ttsQueue.enqueue(m.content);
                  }
                : undefined
            }
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
        {ending ? (
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
              <Pressable accessibilityRole="button" onPress={handleRetry}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>↻ Thử lại</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <VoiceControlBar
        mode={voice.mode}
        interim={voice.interim}
        notice={voice.notice}
        online={online}
        outOfQuota={outOfQuota}
        canSpeak={canSpeak}
        quotaLeft={quotaLeft}
        input={input}
        onChangeInput={setInput}
        onSendText={handleSendText}
        onTapMic={() => void handleTapMic()}
        onStopAi={handleStopAi}
        onToggleTyping={handleToggleTyping}
        bottomInset={insets.bottom}
      />
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
  card: { borderRadius: 16, padding: 14, gap: 8 },
  h: { fontSize: 16, fontWeight: '700' },
  mistake: { gap: 2, paddingVertical: 4 },
  phraseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
