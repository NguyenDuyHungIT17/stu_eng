import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { cardShadow, useColors } from '@/components/theme';
import { OutlineButton } from '@/components/ui';
import type { VoiceMode } from './voice-controller';

/** Thông báo quyền riêng tư lần đầu dùng hội thoại AI (FR-U-02, S3b-09). */
export function PrivacyModal({
  visible,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Text style={[styles.dialogTitle, { color: c.text }]}>
            🔒 Quyền riêng tư khi nói với AI
          </Text>
          <Text style={{ color: c.text, lineHeight: 22 }}>
            • Giọng nói được nhận diện trực tiếp trên điện thoại, ứng dụng không gửi file ghi âm lên
            máy chủ.
          </Text>
          <Text style={{ color: c.text, lineHeight: 22 }}>
            • Nội dung <Text style={{ fontWeight: '700' }}>văn bản</Text> hội thoại được gửi tới
            dịch vụ AI bên thứ ba để tạo phản hồi và có thể được nhà cung cấp dùng để cải thiện dịch
            vụ.
          </Text>
          <Text style={{ color: c.muted, fontSize: 13, lineHeight: 19 }}>
            Lưu ý: không nên nhập thông tin cá nhân nhạy cảm (số điện thoại, mật khẩu, giấy tờ).
          </Text>
          <View style={styles.dialogActions}>
            <Button title="Tôi hiểu, tiếp tục" onPress={onAccept} />
            <OutlineButton title="Quay lại" onPress={onDecline} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Giải thích trước khi xin quyền micro (FR-U-02, S3b-02). */
export function MicRationaleModal({
  visible,
  onAllow,
  onUseTyping,
}: {
  visible: boolean;
  onAllow: () => void;
  onUseTyping: () => void;
}) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onUseTyping}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: c.surface }, cardShadow(c)]}>
          <Text style={[styles.dialogTitle, { color: c.text }]}>🎙️ Cho phép dùng micro?</Text>
          <Text style={{ color: c.text, lineHeight: 22 }}>
            Ứng dụng cần quyền micro để nghe bạn nói tiếng Anh khi trò chuyện với AI. Giọng nói được
            xử lý trên máy; nếu từ chối, bạn vẫn có thể gõ chữ thay thế trong cùng buổi nói.
          </Text>
          <View style={styles.dialogActions}>
            <Button title="Cho phép micro" onPress={onAllow} />
            <OutlineButton title="Gõ chữ thay thế" onPress={onUseTyping} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Thanh điều khiển giọng nói ↔ gõ chữ ở cuối màn hình chat (S3b-06, S3b-07, S3b-08). */
export function VoiceControlBar({
  mode,
  interim,
  notice,
  online,
  outOfQuota,
  canSpeak,
  quotaLeft,
  input,
  onChangeInput,
  onSendText,
  onTapMic,
  onStopAi,
  onToggleTyping,
  bottomInset,
}: {
  mode: VoiceMode;
  interim: string;
  notice: string | null;
  online: boolean;
  outOfQuota: boolean;
  canSpeak: boolean;
  quotaLeft: number | null;
  input: string;
  onChangeInput: (v: string) => void;
  onSendText: () => void;
  onTapMic: () => void;
  onStopAi: () => void;
  onToggleTyping: () => void;
  bottomInset: number;
}) {
  const c = useColors();
  const busy = mode === 'thinking';
  const disabled = !online || outOfQuota || busy;

  const statusText =
    mode === 'listening'
      ? `🎙️ ${interim || 'Đang nghe… nói xong chạm để gửi'}`
      : mode === 'thinking'
        ? '💭 AI đang nghĩ…'
        : mode === 'speaking'
          ? '🔊 AI đang nói… chạm để ngắt hoặc chạm mic để nói tiếp'
          : 'Chạm micro để nói tiếng Anh';

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: c.surface, paddingBottom: bottomInset + 8 },
        cardShadow(c),
      ]}
    >
      {!online ? (
        <Text style={{ color: c.accent, textAlign: 'center', fontWeight: '600' }}>
          📶 Cần mạng để trò chuyện với AI
        </Text>
      ) : null}

      {notice ? (
        <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center' }}>{notice}</Text>
      ) : null}

      {mode === 'typing' ? (
        <View style={styles.typingWrap}>
          <View style={styles.inputRow}>
            {canSpeak ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chuyển sang nói"
                disabled={!online || outOfQuota || busy}
                onPress={onToggleTyping}
                style={[
                  styles.round,
                  {
                    backgroundColor: c.primarySoft,
                    opacity: !online || outOfQuota || busy ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>🎙️</Text>
              </Pressable>
            ) : null}
            <TextInput
              value={input}
              onChangeText={onChangeInput}
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
              onPress={onSendText}
              style={[
                styles.round,
                { backgroundColor: c.primary, opacity: disabled || !input.trim() ? 0.4 : 1 },
              ]}
            >
              <Text style={{ color: c.onPrimary, fontSize: 18, fontWeight: '700' }}>➤</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.voiceWrap}>
          <Text
            style={{
              color: mode === 'listening' ? c.text : c.muted,
              fontStyle: mode === 'listening' ? 'italic' : 'normal',
              textAlign: 'center',
              fontSize: 14,
            }}
          >
            {statusText}
          </Text>
          <View style={styles.voiceRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang gõ chữ"
              disabled={busy}
              onPress={onToggleTyping}
              style={[styles.sideBtn, { backgroundColor: c.bg, opacity: busy ? 0.5 : 1 }]}
            >
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>⌨️ Gõ chữ</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'listening' ? 'Dừng nghe' : 'Chạm để nói'}
              disabled={disabled}
              onPress={onTapMic}
              style={[
                styles.bigMic,
                {
                  backgroundColor: mode === 'listening' ? c.accent : c.primary,
                  opacity: disabled ? 0.45 : 1,
                },
                cardShadow(c),
              ]}
            >
              <Text style={{ fontSize: 26, color: c.onPrimary }}>
                {mode === 'listening' ? '■' : '🎙️'}
              </Text>
            </Pressable>

            {mode === 'speaking' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dừng AI đọc"
                onPress={onStopAi}
                style={[styles.sideBtn, { backgroundColor: c.dangerSoft }]}
              >
                <Text style={{ color: c.danger, fontWeight: '700', fontSize: 13 }}>⏹ Dừng</Text>
              </Pressable>
            ) : (
              <View style={styles.sideSpacer} />
            )}
          </View>
        </View>
      )}

      {quotaLeft !== null && !outOfQuota ? (
        <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>
          Còn {quotaLeft} lượt nói hôm nay
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: { borderRadius: 20, padding: 18, gap: 12 },
  dialogTitle: { fontSize: 18, fontWeight: '700' },
  dialogActions: { gap: 8, marginTop: 4 },
  bar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  typingWrap: { gap: 6 },
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
  voiceWrap: { gap: 10, alignItems: 'center' },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  bigMic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtn: {
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  sideSpacer: { minWidth: 88 },
});
