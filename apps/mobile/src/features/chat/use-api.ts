import { useNetworkState } from 'expo-network';
import { useMemo } from 'react';
import { useDb } from '@/db/client';
import { getDeviceId } from '@/lib/device-id';
import { createApi } from '@/services/api-client';

/** API client gắn định danh thiết bị của máy này. */
export function useApi() {
  const db = useDb();
  return useMemo(() => createApi(getDeviceId(db)), [db]);
}

/** Máy đang có mạng không (null = chưa biết, coi như có). */
export function useOnline(): boolean {
  const s = useNetworkState();
  return s.isConnected !== false && s.isInternetReachable !== false;
}

/** "0 giờ" hoặc giờ làm mới theo giờ máy, ví dụ "07:00". */
export function resetTimeLabel(iso: string | undefined): string {
  if (!iso) return '0 giờ';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '0 giờ';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
