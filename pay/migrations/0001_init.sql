-- 巽風收費服務（pay.xunfengtw.com）：2027 流月詳批（系統版）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ly_orders (
  id TEXT PRIMARY KEY,                  -- 24 字元隨機代碼，即報告網址
  trade_no TEXT UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('single','family')),
  persons TEXT NOT NULL,                -- JSON：[{name,y,m,d,h,s}]
  amount_twd INTEGER NOT NULL,
  email TEXT NOT NULL,
  method TEXT,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  paid_via TEXT,
  pay_info TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ly_orders_email ON ly_orders(email);

CREATE TABLE IF NOT EXISTS ly_codes (
  code TEXT PRIMARY KEY,
  batch TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'single',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_order TEXT,
  used_at TEXT
);
