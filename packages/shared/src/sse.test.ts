import { describe, expect, it } from 'vitest';
import { SseParser } from './sse';

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

  it('hỗ trợ CR đơn, kể cả khi CRLF bị cắt giữa hai chunk', () => {
    const p = new SseParser();
    expect(p.push('data: a\r')).toEqual([]);
    expect(p.push('\ndata: b\r\r')).toEqual([{ event: 'message', data: 'a\nb' }]);
    expect(p.push('data: c\r')).toEqual([]);
    expect(p.push('\r')).toEqual([{ event: 'message', data: 'c' }]);
  });

  it('bỏ BOM ở đầu luồng', () => {
    const p = new SseParser();
    expect(p.push('﻿data: x\n\n')).toEqual([{ event: 'message', data: 'x' }]);
  });

  it('không phát sự kiện khi không có dòng data; event rỗng thành message', () => {
    const p = new SseParser();
    expect(p.push('event: ping\n\n')).toEqual([]);
    expect(p.push('event:\ndata: y\n\n')).toEqual([{ event: 'message', data: 'y' }]);
  });

  it('bỏ qua dòng comment và nối nhiều dòng data', () => {
    const p = new SseParser();
    expect(p.push(': ping\ndata: a\ndata: b\n\n')).toEqual([{ event: 'message', data: 'a\nb' }]);
  });
});
