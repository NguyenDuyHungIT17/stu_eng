import { SseParser } from './sse-parser';

describe('SseParser', () => {
  it('tách sự kiện data đơn giản', () => {
    const p = new SseParser();
    expect(p.push('data: {"t":"Hi"}\n\n')).toEqual([{ event: 'message', data: '{"t":"Hi"}' }]);
  });

  it('ghép sự kiện bị cắt giữa hai chunk', () => {
    const p = new SseParser();
    expect(p.push('data: {"t":"Hel')).toEqual([]);
    expect(p.push('lo"}\n\ndata: {"t":"!"}\n\n')).toEqual([
      { event: 'message', data: '{"t":"Hello"}' },
      { event: 'message', data: '{"t":"!"}' },
    ]);
  });

  it('đọc tên sự kiện và hỗ trợ CRLF', () => {
    const p = new SseParser();
    expect(p.push('event: done\r\ndata: \r\n\r\n')).toEqual([{ event: 'done', data: '' }]);
  });

  it('bỏ qua dòng comment và nối nhiều dòng data', () => {
    const p = new SseParser();
    expect(p.push(': ping\ndata: a\ndata: b\n\n')).toEqual([{ event: 'message', data: 'a\nb' }]);
  });
});
