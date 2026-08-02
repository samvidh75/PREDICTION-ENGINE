-- Microstructure and real-time data tables
-- Applied: Phase 1 (Day 2)

-- Order book snapshots (L2 depth)
create table if not exists order_book_snapshots (
  id bigserial primary key,
  ticker text not null,
  timestamp bigint not null,
  bid_price numeric not null,
  bid_volume numeric not null,
  ask_price numeric not null,
  ask_volume numeric not null,
  spread numeric,
  spread_percent numeric,
  mid_price numeric,
  depth10_imbalance numeric,
  total_bid_volume numeric,
  total_ask_volume numeric,
  created_at timestamp with time zone default now(),

  constraint order_book_snapshots_ticker_timestamp_key
    unique (ticker, timestamp)
);

-- Order book history (L2 + L3, for replay)
create table if not exists order_book_history (
  id bigserial primary key,
  ticker text not null,
  timestamp bigint not null,
  bid_levels jsonb not null, -- [{price, quantity, orders}, ...]
  ask_levels jsonb not null,
  last_trade jsonb, -- {price, quantity, timestamp}
  provider text,
  created_at timestamp with time zone default now(),

  constraint order_book_history_ticker_timestamp_key
    unique (ticker, timestamp)
);

-- Anomaly detections
create table if not exists anomalies (
  id bigserial primary key,
  ticker text not null,
  type text not null, -- volume_spike, spread_widening, flash_crash, order_imbalance, liquidity_crisis
  severity text not null, -- low, medium, high, critical
  timestamp bigint not null,
  description text,
  value numeric,
  threshold numeric,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Tick data (trade-by-trade)
create table if not exists ticks (
  id bigserial primary key,
  ticker text not null,
  timestamp bigint not null,
  price numeric not null,
  quantity numeric not null,
  side text, -- buy, sell
  buyer_id text,
  seller_id text,
  created_at timestamp with time zone default now()
);

-- VWAP and aggregated data
create table if not exists vwap_data (
  id bigserial primary key,
  ticker text not null,
  date date not null,
  vwap numeric not null,
  volume numeric not null,
  trades_count bigint,
  created_at timestamp with time zone default now(),

  constraint vwap_data_ticker_date_key
    unique (ticker, date)
);

-- Indexes
create index if not exists idx_order_book_snapshots_ticker_timestamp
  on order_book_snapshots (ticker, timestamp desc);
create index if not exists idx_order_book_snapshots_timestamp
  on order_book_snapshots (timestamp desc);

create index if not exists idx_order_book_history_ticker_timestamp
  on order_book_history (ticker, timestamp desc);

create index if not exists idx_anomalies_ticker_timestamp
  on anomalies (ticker, timestamp desc);
create index if not exists idx_anomalies_severity
  on anomalies (severity);

create index if not exists idx_ticks_ticker_timestamp
  on ticks (ticker, timestamp desc);

create index if not exists idx_vwap_data_ticker_date
  on vwap_data (ticker, date desc);

-- Row-level security
alter table order_book_snapshots enable row level security;
alter table order_book_history enable row level security;
alter table anomalies enable row level security;
alter table ticks enable row level security;
alter table vwap_data enable row level security;

-- Public read-only access to order book data
create policy "Public read order_book_snapshots" on order_book_snapshots
  for select using (true);

create policy "Public read order_book_history" on order_book_history
  for select using (true);

create policy "Public read anomalies" on anomalies
  for select using (true);

create policy "Public read ticks" on ticks
  for select using (true);

create policy "Public read vwap_data" on vwap_data
  for select using (true);
