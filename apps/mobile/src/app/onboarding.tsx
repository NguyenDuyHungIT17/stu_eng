import { placement } from '@app/content';
import type { Level } from '@app/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { Badge, Card, OutlineButton, ProgressBar, Row } from '@/components/ui';
import { useDb } from '@/db/client';
import {
  DEFAULT_DAILY_MINUTES_GOAL,
  DEFAULT_REMINDER,
  getLevel,
  LEARNING_GOALS,
  type LearningGoal,
  MINUTES_GOAL_CHOICES,
  REMINDER_HOUR_CHOICES,
  SettingKey,
  setOnboardingDone,
  setPrivacyAck,
  setReminderPrefs,
  setSetting,
} from '@/db/settings';
import {
  answerPlacement,
  PLACEMENT_TOTAL,
  type PlacementState,
  SELF_ASSESS_LEVELS,
  startPlacement,
} from '@/features/onboarding/placement';
import { syncReminders } from '@/services/notifications';
import { type EnglishVoice, listEnglishVoices, speak, stop } from '@/services/tts';

type Step = 'welcome' | 'goal' | 'voice' | 'placement' | 'reminder';

/**
 * Luồng Onboarding lần đầu (S4-01..S4-06):
 * 1. Chào + quyền riêng tư (FR-U-02)
 * 2. Chọn mục tiêu & thời gian học/ngày (FR-P-02)
 * 3. Kiểm tra giọng TTS offline + hướng dẫn tải nếu thiếu (TK §6.3)
 * 4. Tự đánh giá + trắc nghiệm xếp trình độ thích ứng (FR-P-01a, TK §6.4)
 * 5. Đặt giờ nhắc học lần đầu (FR-P-04)
 */
export default function OnboardingScreen() {
  const { step: initialParam } = useLocalSearchParams<{ step?: string }>();
  const placementOnly = initialParam === 'placement';
  const db = useDb();
  const c = useColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(placementOnly ? 'placement' : 'welcome');
  const [goal, setGoal] = useState<LearningGoal>('life');
  const [minutes, setMinutes] = useState<number>(DEFAULT_DAILY_MINUTES_GOAL);
  const [voices, setVoices] = useState<EnglishVoice[] | null>(null);
  const [checkingVoice, setCheckingVoice] = useState(false);
  const [chosenVoice, setChosenVoice] = useState<string | null>(null);

  const [selfLevel, setSelfLevel] = useState<Level | null>(placementOnly ? getLevel(db) : null);
  const [quiz, setQuiz] = useState<PlacementState | null>(null);
  const [reminder, setReminder] = useState(DEFAULT_REMINDER);

  const checkVoices = async () => {
    setCheckingVoice(true);
    try {
      const list = await listEnglishVoices();
      setVoices(list);
      if (!chosenVoice && list[0]) setChosenVoice(list[0].id);
    } finally {
      setCheckingVoice(false);
    }
  };

  useEffect(() => {
    if (step === 'voice' && voices === null) void checkVoices();
  });

  useEffect(() => () => stop(), []);

  const stepIndex =
    step === 'welcome'
      ? 1
      : step === 'goal'
        ? 2
        : step === 'voice'
          ? 3
          : step === 'placement'
            ? 4
            : 5;

  const finishPlacement = (lv: Level) => {
    setSetting(db, SettingKey.level, lv);
    if (placementOnly) {
      router.back();
      return;
    }
    setStep('reminder');
  };

  const finishAll = async () => {
    setSetting(db, SettingKey.learningGoal, goal);
    setSetting(db, SettingKey.dailyMinutesGoal, String(minutes));
    if (chosenVoice) setSetting(db, SettingKey.ttsVoice, chosenVoice);
    setReminderPrefs(db, reminder);
    setOnboardingDone(db);
    await syncReminders(db, { ask: reminder.enabled });
    router.replace('/(tabs)');
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 14 },
      ]}
    >
      {!placementOnly ? (
        <View style={styles.top}>
          <ProgressBar value={stepIndex / 5} />
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{stepIndex}/5</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        {step === 'welcome' ? (
          <View style={styles.gap}>
            <Text style={{ fontSize: 52, textAlign: 'center', marginTop: 12 }}>🗣️</Text>
            <Text style={[styles.title, { color: c.text }]}>
              Luyện giao tiếp tiếng Anh tự nhiên mỗi ngày
            </Text>
            <Text style={{ color: c.muted, fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
              Học qua tình huống thật, ôn đúng lúc sắp quên, ghi chú offline và nói chuyện với AI
              không sợ sai.
            </Text>
            <Card>
              <Text style={[styles.sub, { color: c.text }]}>🔒 Quyền riêng tư của bạn</Text>
              <Text style={{ color: c.text, lineHeight: 22 }}>
                • Bài học, ôn tập, ghi chú và tiến độ được lưu hoàn toàn trên điện thoại của bạn.
              </Text>
              <Text style={{ color: c.text, lineHeight: 22 }}>
                • Chỉ tính năng <Text style={{ fontWeight: '700' }}>Nói với AI</Text> cần mạng:
                giọng nói được chuyển thành chữ trên máy; nội dung văn bản được gửi tới dịch vụ AI
                bên thứ ba (có thể được nhà cung cấp dùng để cải thiện dịch vụ). Không nên nhập
                thông tin cá nhân nhạy cảm.
              </Text>
            </Card>
          </View>
        ) : null}

        {step === 'goal' ? (
          <View style={styles.gap}>
            <Text style={[styles.title, { color: c.text }]}>Bạn học để làm gì?</Text>
            <View style={styles.gap}>
              {LEARNING_GOALS.map((g) => (
                <OutlineButton
                  key={g.id}
                  title={g.label}
                  selected={goal === g.id}
                  onPress={() => setGoal(g.id)}
                />
              ))}
            </View>
            <Text style={[styles.sub, { color: c.text, marginTop: 10 }]}>
              Thời gian luyện mỗi ngày
            </Text>
            <Row>
              {MINUTES_GOAL_CHOICES.map((m) => (
                <OutlineButton
                  key={m}
                  title={`${m} phút`}
                  selected={minutes === m}
                  onPress={() => setMinutes(m)}
                />
              ))}
            </Row>
          </View>
        ) : null}

        {step === 'voice' ? (
          <View style={styles.gap}>
            <Text style={[styles.title, { color: c.text }]}>Kiểm tra giọng đọc tiếng Anh</Text>
            <Text style={{ color: c.muted, lineHeight: 22 }}>
              App dùng giọng đọc có sẵn trên điện thoại để bạn nghe phát âm mọi lúc kể cả khi không
              có mạng.
            </Text>
            {checkingVoice ? (
              <Card>
                <Text style={{ color: c.muted }}>Đang kiểm tra giọng đọc trên máy…</Text>
              </Card>
            ) : voices && voices.length > 0 ? (
              <Card>
                <Text style={{ color: c.ok, fontWeight: '700', fontSize: 16 }}>
                  ✓ Tìm thấy {voices.length} giọng tiếng Anh trên máy
                </Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  Chọn 1 giọng và bấm nghe thử (có thể đổi lại trong Hồ sơ):
                </Text>
                <View style={styles.gap}>
                  {voices.slice(0, 4).map((v) => (
                    <OutlineButton
                      key={v.id}
                      title={`${v.name} (${v.language})`}
                      selected={chosenVoice === v.id}
                      onPress={() => {
                        setChosenVoice(v.id);
                        speak("Hi! I'm ready to help you practice English.", { voice: v.id });
                      }}
                    />
                  ))}
                </View>
              </Card>
            ) : (
              <Card>
                <Text style={{ color: c.accent, fontWeight: '700', fontSize: 16 }}>
                  Chưa phát hiện giọng tiếng Anh offline
                </Text>
                <Text style={{ color: c.text, lineHeight: 22 }}>
                  Bạn vẫn học được bình thường, nhưng để nghe phát âm offline hãy mở Cài đặt Android
                  → Trợ năng / Ngôn ngữ → Chuyển văn bản thành giọng nói → Tải gói dữ liệu giọng
                  tiếng Anh (en-US).
                </Text>
                <Row>
                  <OutlineButton
                    title="Mở cài đặt máy"
                    onPress={() => void Linking.openSettings()}
                  />
                  <OutlineButton title="Kiểm tra lại" onPress={() => void checkVoices()} />
                </Row>
              </Card>
            )}
          </View>
        ) : null}

        {step === 'placement' ? (
          quiz === null ? (
            <View style={styles.gap}>
              <Text style={[styles.title, { color: c.text }]}>Trình độ hiện tại của bạn?</Text>
              <Text style={{ color: c.muted, lineHeight: 21 }}>
                Chọn mức gần với bạn nhất, rồi làm nhanh {PLACEMENT_TOTAL} câu để app xếp trình độ
                phù hợp.
              </Text>
              {SELF_ASSESS_LEVELS.map((lv) => {
                const selected = selfLevel === lv.level;
                return (
                  <Pressable
                    key={lv.level}
                    accessibilityRole="button"
                    onPress={() => setSelfLevel(lv.level)}
                    style={[
                      styles.levelCard,
                      {
                        backgroundColor: selected ? c.primarySoft : c.surface,
                        borderColor: selected ? c.primary : c.border,
                      },
                      cardShadow(c),
                    ]}
                  >
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>
                      {lv.title}
                    </Text>
                    <Text style={{ color: c.muted, fontSize: 14 }}>{lv.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : quiz.done || !quiz.current ? (
            <View style={styles.gap}>
              <Text style={{ fontSize: 52, textAlign: 'center' }}>🎯</Text>
              <Text style={[styles.title, { color: c.text }]}>
                Trình độ gợi ý của bạn: {quiz.level}
              </Text>
              <Text style={{ color: c.muted, textAlign: 'center', lineHeight: 22 }}>
                Bạn trả lời đúng {quiz.totalCorrect}/{quiz.totalAsked} câu. Bạn có thể thay đổi
                trình độ bất cứ lúc nào trong phần Hồ sơ.
              </Text>
            </View>
          ) : (
            <View style={styles.gap}>
              <View style={styles.quizTop}>
                <Badge text={quiz.current.level} color={c.primary} />
                <Text style={{ color: c.muted, fontWeight: '700' }}>
                  Câu {quiz.totalAsked + 1}/{PLACEMENT_TOTAL}
                </Text>
              </View>
              <Card>
                <Text style={{ color: c.muted, fontSize: 13 }}>{quiz.current.questionVi}</Text>
                {quiz.current.kind === 'listen_choose' ? (
                  <View style={{ marginTop: 6 }}>
                    <OutlineButton
                      title="🔊 Nghe câu tiếng Anh"
                      onPress={() =>
                        speak(quiz.current?.prompt ?? '', { voice: chosenVoice ?? undefined })
                      }
                    />
                  </View>
                ) : (
                  <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>
                    {quiz.current.prompt}
                  </Text>
                )}
              </Card>
              <View style={styles.gap}>
                {quiz.current.options.map((opt, idx) => (
                  <Pressable
                    key={opt}
                    accessibilityRole="button"
                    onPress={() => {
                      stop();
                      setQuiz((q) => (q ? answerPlacement(q, idx, placement) : q));
                    }}
                    style={[
                      styles.opt,
                      { backgroundColor: c.surface, borderColor: c.border },
                      cardShadow(c),
                    ]}
                  >
                    <Text style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )
        ) : null}

        {step === 'reminder' ? (
          <View style={styles.gap}>
            <Text style={[styles.title, { color: c.text }]}>Đặt giờ nhắc học mỗi ngày</Text>
            <Text style={{ color: c.muted, lineHeight: 22 }}>
              Mỗi ngày chỉ cần 5–10 phút. Nếu hôm đó bạn đã học rồi thì app sẽ không làm phiền.
            </Text>
            <Card>
              <View style={styles.switchRow}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 16, flex: 1 }}>
                  Bật nhắc học hằng ngày
                </Text>
                <Switch
                  value={reminder.enabled}
                  onValueChange={(enabled) => setReminder((r) => ({ ...r, enabled }))}
                />
              </View>
              {reminder.enabled ? (
                <Row>
                  {REMINDER_HOUR_CHOICES.map((h) => (
                    <OutlineButton
                      key={h}
                      title={`${h}h`}
                      selected={reminder.hour === h}
                      onPress={() => setReminder((r) => ({ ...r, hour: h, minute: 0 }))}
                    />
                  ))}
                </Row>
              ) : null}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'welcome' ? (
          <Button
            title="Tôi hiểu, bắt đầu"
            onPress={() => {
              setPrivacyAck(db);
              setStep('goal');
            }}
          />
        ) : null}

        {step === 'goal' ? <Button title="Tiếp tục" onPress={() => setStep('voice')} /> : null}

        {step === 'voice' ? (
          <Button
            title="Tiếp tục"
            onPress={() => {
              stop();
              setStep('placement');
            }}
          />
        ) : null}

        {step === 'placement' && quiz === null ? (
          <View style={styles.gap}>
            <Button
              title="Làm bài xếp trình độ (12 câu)"
              disabled={!selfLevel}
              onPress={() => {
                if (!selfLevel) return;
                const first = startPlacement(selfLevel, placement);
                setQuiz(first);
                if (first.current?.kind === 'listen_choose') {
                  speak(first.current.prompt, { voice: chosenVoice ?? undefined });
                }
              }}
            />
            <OutlineButton
              title={placementOnly ? 'Hủy' : 'Bỏ qua, dùng mức tự chọn'}
              onPress={() => {
                if (placementOnly) router.back();
                else finishPlacement(selfLevel ?? 'A1');
              }}
            />
          </View>
        ) : null}

        {step === 'placement' && quiz !== null && (quiz.done || !quiz.current) ? (
          <Button title="Dùng trình độ này" onPress={() => finishPlacement(quiz.level)} />
        ) : null}

        {step === 'placement' && quiz !== null && !quiz.done && quiz.current ? (
          <OutlineButton
            title="Bỏ qua bài kiểm tra"
            onPress={() => {
              stop();
              if (placementOnly) router.back();
              else finishPlacement(selfLevel ?? quiz.level);
            }}
          />
        ) : null}

        {step === 'reminder' ? (
          <Button title="Hoàn tất & vào học" onPress={() => void finishAll()} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  body: { paddingVertical: 12, gap: 14, paddingBottom: 24 },
  gap: { gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 17, fontWeight: '700' },
  levelCard: { borderWidth: 2, borderRadius: 16, padding: 14, gap: 4 },
  quizTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  opt: { borderWidth: 2, borderRadius: 14, padding: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { paddingTop: 8 },
});
