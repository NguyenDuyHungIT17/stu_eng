/**
 * Máy trạng thái hội thoại bằng giọng nói (S3b-03, TK §6.2).
 *
 *   idle ──chạm mic──▶ listening ──kết quả cuối──▶ thinking ──câu đầu──▶ speaking
 *     ▲                    │ lỗi STT / từ chối           │                 │
 *     │                    ▼                             ▼                 │
 *     │                 typing (gõ chữ) ───gửi──▶ thinking                 │
 *     └──────────── AI đọc xong / chạm "Dừng" ◀────────────────────────────┘
 */

export type VoiceMode = 'idle' | 'listening' | 'thinking' | 'speaking' | 'typing';

export type VoiceState = {
  mode: VoiceMode;
  streaming: boolean;
  ttsActive: boolean;
  interim: string;
  notice: string | null;
};

export type VoiceEvent =
  | { type: 'TAP_MIC' }
  | { type: 'STT_INTERIM'; text: string }
  | { type: 'STT_FINAL'; text: string }
  | { type: 'STT_EMPTY' }
  | { type: 'STT_ERROR'; message: string; toTyping: boolean }
  | { type: 'MIC_DENIED'; message?: string }
  | { type: 'SEND_TEXT' }
  | { type: 'TTS_START' }
  | { type: 'TTS_END' }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_ERROR' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'TOGGLE_TYPING' }
  | { type: 'CLEAR_NOTICE' };

export function initialVoiceState(voiceAvailable: boolean): VoiceState {
  return {
    mode: voiceAvailable ? 'idle' : 'typing',
    streaming: false,
    ttsActive: false,
    interim: '',
    notice: null,
  };
}

export function transitionVoice(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (event.type) {
    case 'TAP_MIC':
      if (state.mode === 'thinking') return state;
      return {
        ...state,
        mode: 'listening',
        ttsActive: false,
        interim: '',
        notice: null,
      };

    case 'STT_INTERIM':
      if (state.mode !== 'listening') return state;
      return { ...state, interim: event.text };

    case 'STT_FINAL': {
      const clean = event.text.trim();
      if (!clean) return { ...state, mode: 'idle', interim: '' };
      return {
        ...state,
        mode: 'thinking',
        streaming: true,
        ttsActive: false,
        interim: '',
        notice: null,
      };
    }

    case 'STT_EMPTY':
      return state.mode === 'listening' ? { ...state, mode: 'idle', interim: '' } : state;

    case 'STT_ERROR':
      return {
        ...state,
        mode: event.toTyping ? 'typing' : 'idle',
        interim: '',
        notice: event.message,
      };

    case 'MIC_DENIED':
      return {
        ...state,
        mode: 'typing',
        ttsActive: false,
        interim: '',
        notice:
          event.message ??
          'Chưa dùng được micro. Đã chuyển sang chế độ gõ chữ để bạn tiếp tục buổi nói.',
      };

    case 'SEND_TEXT':
      if (state.streaming) return state;
      return {
        ...state,
        mode: 'thinking',
        streaming: true,
        ttsActive: false,
        interim: '',
        notice: null,
      };

    case 'TTS_START':
      return {
        ...state,
        ttsActive: true,
        mode: state.mode === 'thinking' || state.mode === 'idle' ? 'speaking' : state.mode,
      };

    case 'TTS_END':
      return {
        ...state,
        ttsActive: false,
        mode: state.streaming
          ? state.mode === 'speaking'
            ? 'thinking'
            : state.mode
          : state.mode === 'speaking'
            ? 'idle'
            : state.mode,
      };

    case 'STREAM_DONE':
    case 'STREAM_ERROR':
      return {
        ...state,
        streaming: false,
        mode: state.ttsActive ? 'speaking' : state.mode === 'thinking' ? 'idle' : state.mode,
      };

    case 'STOP_SPEAKING':
      return {
        ...state,
        ttsActive: false,
        mode: state.streaming ? 'thinking' : state.mode === 'speaking' ? 'idle' : state.mode,
      };

    case 'TOGGLE_TYPING':
      if (state.streaming) return state;
      return {
        ...state,
        mode: state.mode === 'typing' ? 'idle' : 'typing',
        ttsActive: false,
        interim: '',
        notice: null,
      };

    case 'CLEAR_NOTICE':
      return state.notice ? { ...state, notice: null } : state;
  }
}
