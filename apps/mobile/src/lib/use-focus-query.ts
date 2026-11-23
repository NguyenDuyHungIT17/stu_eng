import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Chạy truy vấn đồng bộ (SQLite) mỗi khi màn hình được focus, để số liệu luôn mới
 * khi quay lại từ màn khác (ví dụ: về Trang chủ sau phiên ôn).
 * `key` đổi (ví dụ id trên URL) thì chạy lại ngay.
 */
export function useFocusQuery<T>(query: () => T, key: unknown = null): T | undefined {
  const [data, setData] = useState<T>();
  const latest = useRef(query);
  latest.current = query;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` là tín hiệu chạy lại
  const run = useCallback(() => {
    setData(latest.current());
  }, [key]);
  useFocusEffect(run);
  return data;
}
