import { contentVersion, phrases, topics } from '@app/content';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import migrations from './migrations/migrations';
import * as schema from './schema';
import { seedContent } from './seed';
import type { Db } from './types';

/** Một kết nối duy nhất cho cả app. Migration + seed chạy lúc khởi động (TK §5, §8). */
const sqlite = openDatabaseSync('app.db');
export const db: Db = drizzle(sqlite, { schema });

const DbContext = createContext<Db | null>(null);

/** Database đã migrate và seed xong. Chỉ dùng bên trong `<DbProvider>`. */
export function useDb(): Db {
  const v = useContext(DbContext);
  if (!v) throw new Error('useDb phải nằm trong <DbProvider>');
  return v;
}

export function DbProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const [seedError, setSeedError] = useState<Error | null>(null);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!success) return;
    try {
      seedContent(db, { contentVersion, topics, phrases }, Date.now());
      setSeeded(true);
    } catch (e) {
      setSeedError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [success]);

  const failure = error ?? seedError;
  if (failure) return <Status text={`Lỗi khởi tạo dữ liệu: ${failure.message}`} />;
  if (!seeded) return <Status text="Đang chuẩn bị dữ liệu…" loading />;
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

function Status({ text, loading }: { text: string; loading?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      {loading ? <ActivityIndicator /> : null}
      <Text style={{ color: c.text, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
