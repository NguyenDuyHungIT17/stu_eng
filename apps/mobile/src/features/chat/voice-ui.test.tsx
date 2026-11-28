import { fireEvent, render } from '@testing-library/react-native';
import { MicRationaleModal, PrivacyModal, VoiceControlBar } from './voice-ui';

describe('voice-ui', () => {
  const baseProps = {
    mode: 'idle' as const,
    interim: '',
    notice: null,
    online: true,
    outOfQuota: false,
    canSpeak: true,
    quotaLeft: 39,
    input: '',
    onChangeInput: jest.fn(),
    onSendText: jest.fn(),
    onTapMic: jest.fn(),
    onStopAi: jest.fn(),
    onToggleTyping: jest.fn(),
    bottomInset: 0,
  };

  it('hiển thị chữ đang nhận diện (interim) và trạng thái đang nghĩ', async () => {
    const r1 = await render(
      <VoiceControlBar {...baseProps} mode="listening" interim="Good morning" />,
    );
    expect(r1.getByText(/Good morning/)).toBeTruthy();

    const r2 = await render(<VoiceControlBar {...baseProps} mode="thinking" />);
    expect(r2.getByText(/AI đang nghĩ/)).toBeTruthy();
  });

  it('hiển thị nút Dừng khi speaking và gọi onStopAi / onTapMic', async () => {
    const onStopAi = jest.fn();
    const onTapMic = jest.fn();
    const { getByLabelText } = await render(
      <VoiceControlBar {...baseProps} mode="speaking" onStopAi={onStopAi} onTapMic={onTapMic} />,
    );
    await fireEvent.press(getByLabelText('Dừng AI đọc'));
    expect(onStopAi).toHaveBeenCalledTimes(1);
    await fireEvent.press(getByLabelText('Chạm để nói'));
    expect(onTapMic).toHaveBeenCalledTimes(1);
  });

  it('chuyển đổi qua lại giữa chế độ giọng nói và gõ chữ', async () => {
    const onToggleTyping = jest.fn();
    const rVoice = await render(
      <VoiceControlBar {...baseProps} mode="idle" onToggleTyping={onToggleTyping} />,
    );
    await fireEvent.press(rVoice.getByLabelText('Chuyển sang gõ chữ'));
    expect(onToggleTyping).toHaveBeenCalledTimes(1);

    const rType = await render(
      <VoiceControlBar {...baseProps} mode="typing" onToggleTyping={onToggleTyping} />,
    );
    expect(rType.getByPlaceholderText('Nhập câu tiếng Anh…')).toBeTruthy();
    await fireEvent.press(rType.getByLabelText('Chuyển sang nói'));
    expect(onToggleTyping).toHaveBeenCalledTimes(2);
  });

  it('hiện thông báo quyền riêng tư và giải thích quyền micro', async () => {
    const onAccept = jest.fn();
    const p = await render(<PrivacyModal visible onAccept={onAccept} onDecline={jest.fn()} />);
    await fireEvent.press(p.getByText('Tôi hiểu, tiếp tục'));
    expect(onAccept).toHaveBeenCalledTimes(1);

    const onUseTyping = jest.fn();
    const m = await render(
      <MicRationaleModal visible onAllow={jest.fn()} onUseTyping={onUseTyping} />,
    );
    await fireEvent.press(m.getByText('Gõ chữ thay thế'));
    expect(onUseTyping).toHaveBeenCalledTimes(1);
  });
});
