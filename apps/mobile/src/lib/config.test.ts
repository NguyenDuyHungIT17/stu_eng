import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('dùng giá trị cấu hình và bỏ dấu / cuối', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  });

  it('mặc định trỏ tới wrangler dev qua emulator Android', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://10.0.2.2:8787');
    expect(resolveApiBaseUrl('')).toBe('http://10.0.2.2:8787');
  });

  it('báo lỗi khi URL không hợp lệ', () => {
    expect(() => resolveApiBaseUrl('not a url')).toThrow(/API_BASE_URL/);
  });
});
