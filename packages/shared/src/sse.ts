export type SseEvent = { event: string; data: string };

/**
 * Bộ đọc Server-Sent Events theo từng chunk văn bản.
 * Chunk có thể bị cắt ở bất kỳ vị trí nào; phần thừa được giữ lại cho lần push sau.
 * Hỗ trợ kết thúc dòng CRLF, LF, CR đơn và BOM ở đầu luồng.
 */
export class SseParser {
  private buffer = '';
  private eventName = '';
  private dataLines: string[] = [];
  private started = false;
  /** Chunk trước kết thúc bằng CR: nếu chunk này bắt đầu bằng LF thì đó là nửa sau của CRLF. */
  private skipLeadingLf = false;

  push(chunk: string): SseEvent[] {
    if (this.skipLeadingLf && chunk.startsWith('\n')) chunk = chunk.slice(1);
    if (chunk.length > 0) this.skipLeadingLf = false;
    if (!this.started && chunk.length > 0) {
      this.started = true;
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
    }

    this.buffer += chunk;
    if (this.buffer.endsWith('\r')) this.skipLeadingLf = true;
    const lines = this.buffer.split(/\r\n|\r|\n/);
    this.buffer = lines.pop() ?? '';

    const events: SseEvent[] = [];
    for (const line of lines) {
      if (line === '') {
        if (this.dataLines.length > 0) {
          events.push({ event: this.eventName || 'message', data: this.dataLines.join('\n') });
        }
        this.eventName = '';
        this.dataLines = [];
      } else if (line.startsWith(':')) {
        // comment / keep-alive
      } else {
        const idx = line.indexOf(':');
        const field = idx === -1 ? line : line.slice(0, idx);
        let value = idx === -1 ? '' : line.slice(idx + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'event') this.eventName = value;
        else if (field === 'data') this.dataLines.push(value);
      }
    }
    return events;
  }
}
