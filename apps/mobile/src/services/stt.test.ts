import { getMicPermission, isSttAvailable, mapSttError, startStt, stopStt } from './stt';

const mockMod = {
  isRecognitionAvailable: jest.fn(() => true),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => mockMod.isRecognitionAvailable(),
    getPermissionsAsync: () => mockMod.getPermissionsAsync(),
    requestPermissionsAsync: () => mockMod.requestPermissionsAsync(),
    start: (opts: unknown) => mockMod.start(opts),
    stop: () => mockMod.stop(),
    abort: () => mockMod.abort(),
  },
}));

describe('services/stt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMod.isRecognitionAvailable.mockReturnValue(true);
    mockMod.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockMod.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  });

  it('kiểm tra khả dụng và xử lý ngoại lệ an toàn', () => {
    expect(isSttAvailable()).toBe(true);
    mockMod.isRecognitionAvailable.mockImplementation(() => {
      throw new Error('no module');
    });
    expect(isSttAvailable()).toBe(false);
  });

  it('ánh xạ lỗi rõ ràng và đánh dấu lỗi cần chuyển sang gõ chữ', () => {
    expect(mapSttError('not-allowed')).toMatchObject({ fallbackToTyping: true });
    expect(mapSttError('service-not-allowed')).toMatchObject({ fallbackToTyping: true });
    expect(mapSttError('no-speech')).toMatchObject({ fallbackToTyping: false });
    expect(mapSttError('unknown-code').message).toMatch(/unknown-code/);
  });

  it('đọc quyền micro và xử lý khi từ chối', async () => {
    mockMod.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await getMicPermission()).toEqual({ granted: false, canAskAgain: true });

    mockMod.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const res = await startStt();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.denied).toBe(true);
    expect(mockMod.start).not.toHaveBeenCalled();
  });

  it('bắt đầu và dừng STT khi có quyền', async () => {
    const res = await startStt('en-US');
    expect(res).toEqual({ ok: true });
    expect(mockMod.start).toHaveBeenCalledWith({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
    stopStt();
    expect(mockMod.stop).toHaveBeenCalled();
  });
});
