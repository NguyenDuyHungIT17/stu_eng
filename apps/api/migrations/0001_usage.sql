-- Bộ đếm quota theo ngày (giờ Việt Nam). Xem Thiết kế kỹ thuật §7.2.
CREATE TABLE IF NOT EXISTS usage (
  key   TEXT PRIMARY KEY,
  day   TEXT NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_day_idx ON usage(day);
