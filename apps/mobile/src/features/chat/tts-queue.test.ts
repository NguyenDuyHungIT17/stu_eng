import { createTtsQueue } from './tts-queue';

describe('createTtsQueue', () => {
  it('đọc tuần tự từng câu theo thứ tự enqueue', () => {
    const spoken: string[] = [];
    const callbacks: (() => void)[] = [];
    const activeEvents: boolean[] = [];

    const q = createTtsQueue({
      speak: (text, onDone) => {
        spoken.push(text);
        callbacks.push(onDone);
      },
      stop: jest.fn(),
      onActiveChange: (a) => activeEvents.push(a),
    });

    q.enqueue('First.');
    q.enqueue('Second.');
    q.enqueue('   '); // bỏ qua câu rỗng
    expect(spoken).toEqual(['First.']);
    expect(q.isActive()).toBe(true);
    expect(q.pendingCount()).toBe(1);

    callbacks[0]?.();
    expect(spoken).toEqual(['First.', 'Second.']);
    expect(q.pendingCount()).toBe(0);

    callbacks[1]?.();
    expect(q.isActive()).toBe(false);
    expect(activeEvents).toEqual([true, false]);
  });

  it('stop xóa hàng đợi và bỏ qua callback onDone cũ', () => {
    const spoken: string[] = [];
    let staleDone: (() => void) | null = null;
    const stopMock = jest.fn(() => {
      // Giả lập expo-speech gọi onStopped → onDone đồng bộ hoặc trễ.
      staleDone?.();
    });

    const q = createTtsQueue({
      speak: (text, onDone) => {
        spoken.push(text);
        staleDone = onDone;
      },
      stop: stopMock,
    });

    q.enqueue('One.');
    q.enqueue('Two.');
    q.stop();

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(spoken).toEqual(['One.']);
    expect(q.isActive()).toBe(false);
    expect(q.pendingCount()).toBe(0);

    // Enqueue mới sau khi stop vẫn chạy bình thường.
    q.enqueue('Three.');
    expect(spoken).toEqual(['One.', 'Three.']);
    expect(q.isActive()).toBe(true);
  });
});
