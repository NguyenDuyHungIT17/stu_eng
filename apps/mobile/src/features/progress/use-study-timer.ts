import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { Db } from '@/db/types';
import { addStudySeconds } from './streak';

/** Một đoạn đếm liên tục tối đa 15 phút: để máy treo ở màn học không làm phồng số phút. */
export const MAX_SEGMENT_SECONDS = 15 * 60;

/**
 * Đếm thời gian học khi màn hình đang mở và app ở foreground (S2-09).
 * Ghi vào `daily_activity.studySeconds` khi rời màn hoặc app chuyển nền.
 */
export function useStudyTimer(db: Db): void {
  useEffect(() => {
    let start: number | null = AppState.currentState === 'active' ? Date.now() : null;
    const flush = () => {
      if (start === null) return;
      const now = Date.now();
      addStudySeconds(db, Math.min((now - start) / 1000, MAX_SEGMENT_SECONDS), now);
      start = null;
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start ??= Date.now();
      else flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [db]);
}
