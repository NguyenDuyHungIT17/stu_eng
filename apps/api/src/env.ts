export type Env = {
  APP_ENV: string;
  DB: D1Database;
  CHAT_PER_DEVICE: string;
  ASSIST_PER_DEVICE: string;
  REQ_PER_IP: string;
  GLOBAL_DAILY: string;
  /** JSON danh sách nhà cung cấp LLM (xem llm/providers.ts). API key ở Secrets `LLM_KEY_*`. */
  LLM_PROVIDERS?: string;
};

export type AppEnv = { Bindings: Env; Variables: { deviceId: string; quotaKey?: string } };
