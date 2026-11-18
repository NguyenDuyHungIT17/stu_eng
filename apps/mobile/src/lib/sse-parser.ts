export type SseEvent = { event: string; data: string };

/**
 * Bộ đọc Server-Sent Events theo từng chunk văn bản.
 * Chunk có thể bị cắt ở bất kỳ vị trí nào; phần thừa được giữ lại cho lần push sau.
 */
export class SseParser {
  private buffer = '';
  private eventName = 'message';
  private dataLines: string[] = [];

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line === '') {
        if (this.dataLines.length > 0 || this.eventName !== 'message') {
          events.push({ event: this.eventName, data: this.dataLines.join('\n') });
        }
        this.eventName = 'message';
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
