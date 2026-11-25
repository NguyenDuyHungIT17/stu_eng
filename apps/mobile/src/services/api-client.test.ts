import { errorMessage, toApiError } from './api-client';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

const res = (status: number, body: unknown) => ({ status, json: async () => body });

describe('toApiError', () => {
  it('đọc mã lỗi từ body', async () => {
    expect((await toApiError(res(429, { error: 'global_budget' }))).code).toBe('global_budget');
    expect((await toApiError(res(400, { error: 'missing_device_id' }))).code).toBe(
      'missing_device_id',
    );
  });

  it('body lạ: 429 → quota_device, còn lại → internal', async () => {
    expect((await toApiError(res(429, 'x'))).code).toBe('quota_device');
    const broken = { status: 500, json: async () => Promise.reject(new Error('no json')) };
    expect((await toApiError(broken)).code).toBe('internal');
  });

  it('mỗi mã có thông báo tiếng Việt', () => {
    expect(errorMessage('network')).toMatch(/mạng/);
    expect(errorMessage('quota_device')).toMatch(/hết lượt/);
  });
});
