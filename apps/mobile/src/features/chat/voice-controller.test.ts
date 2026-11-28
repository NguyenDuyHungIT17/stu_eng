import { initialVoiceState, transitionVoice } from './voice-controller';

describe('voice-controller', () => {
  it('luồng chuẩn: idle → listening → thinking → speaking → idle', () => {
    let s = initialVoiceState(true);
    expect(s.mode).toBe('idle');

    s = transitionVoice(s, { type: 'TAP_MIC' });
    expect(s.mode).toBe('listening');

    s = transitionVoice(s, { type: 'STT_INTERIM', text: 'Hello' });
    expect(s.interim).toBe('Hello');

    s = transitionVoice(s, { type: 'STT_FINAL', text: 'Hello there' });
    expect(s).toMatchObject({ mode: 'thinking', streaming: true, interim: '' });

    s = transitionVoice(s, { type: 'TTS_START' });
    expect(s).toMatchObject({ mode: 'speaking', ttsActive: true, streaming: true });

    // Stream xong trước khi TTS đọc xong: vẫn giữ speaking.
    s = transitionVoice(s, { type: 'STREAM_DONE' });
    expect(s).toMatchObject({ mode: 'speaking', streaming: false, ttsActive: true });

    // TTS đọc xong: quay về idle.
    s = transitionVoice(s, { type: 'TTS_END' });
    expect(s).toMatchObject({ mode: 'idle', ttsActive: false });
  });

  it('lỗi STT hoặc từ chối micro → chuyển sang typing', () => {
    let s = transitionVoice(initialVoiceState(true), { type: 'TAP_MIC' });
    s = transitionVoice(s, { type: 'MIC_DENIED', message: 'Không có quyền' });
    expect(s).toMatchObject({ mode: 'typing', notice: 'Không có quyền' });

    // Vẫn gửi được tin nhắn bằng gõ chữ từ typing.
    s = transitionVoice(s, { type: 'SEND_TEXT' });
    expect(s).toMatchObject({ mode: 'thinking', streaming: true });
  });

  it('chạm mic khi AI đang nói → chuyển sang listening và tắt ttsActive', () => {
    let s = initialVoiceState(true);
    s = transitionVoice(s, { type: 'SEND_TEXT' });
    s = transitionVoice(s, { type: 'TTS_START' });
    s = transitionVoice(s, { type: 'STREAM_DONE' });
    expect(s.mode).toBe('speaking');

    s = transitionVoice(s, { type: 'TAP_MIC' });
    expect(s).toMatchObject({ mode: 'listening', ttsActive: false });
  });

  it('chạm Dừng khi đang speaking → idle (hoặc thinking nếu vẫn stream)', () => {
    let s = initialVoiceState(true);
    s = transitionVoice(s, { type: 'SEND_TEXT' });
    s = transitionVoice(s, { type: 'TTS_START' });
    s = transitionVoice(s, { type: 'STOP_SPEAKING' });
    expect(s).toMatchObject({ mode: 'thinking', ttsActive: false, streaming: true });

    s = transitionVoice(s, { type: 'STREAM_DONE' });
    expect(s.mode).toBe('idle');
  });

  it('chuyển qua lại giữa giọng nói và gõ chữ trong cùng buổi', () => {
    let s = initialVoiceState(true);
    s = transitionVoice(s, { type: 'TOGGLE_TYPING' });
    expect(s.mode).toBe('typing');
    s = transitionVoice(s, { type: 'TOGGLE_TYPING' });
    expect(s.mode).toBe('idle');
  });
});
