export type Env = {
  APP_ENV: string;
  DB: D1Database;
  CHAT_PER_DEVICE: string;
  ASSIST_PER_DEVICE: string;
  REQ_PER_IP: string;
  GLOBAL_DAILY: string;
};

export type AppEnv = { Bindings: Env; Variables: { deviceId: string } };
