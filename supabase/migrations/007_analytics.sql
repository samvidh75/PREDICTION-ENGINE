-- Analytics and data warehouse
-- Applied: Phase 1B (Day 3)

create table if not exists daily_ohlc (
  id bigserial primary key,
  ticker text not null,
  date date not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint not null,
  created_at timestamp with time zone default now(),

  constraint daily_ohlc_ticker_date_key unique (ticker, date)
);

create table if not exists sector_performance (
  id bigserial primary key,
  sector text not null,
  date date not null,
  open numeric,
  close numeric,
  change_percent numeric,
  volume bigint,
  created_at timestamp with time zone default now(),

  constraint sector_performance_sector_date_key unique (sector, date)
);

create table if not exists correlation_matrix (
  id bigserial primary key,
  ticker1 text not null,
  ticker2 text not null,
  period_days int not null,
  correlation numeric,
  created_at timestamp with time zone default now(),

  constraint correlation_matrix_tickers_period_key unique (ticker1, ticker2, period_days)
);

create table if not exists technical_indicators (
  id bigserial primary key,
  ticker text not null,
  date date not null,
  sma_20 numeric,
  sma_50 numeric,
  ema_12 numeric,
  ema_26 numeric,
  rsi_14 numeric,
  macd numeric,
  macd_signal numeric,
  bollinger_upper numeric,
  bollinger_lower numeric,
  atr_14 numeric,
  created_at timestamp with time zone default now(),

  constraint technical_indicators_ticker_date_key unique (ticker, date)
);

-- Indexes
create index if not exists idx_daily_ohlc_ticker_date
  on daily_ohlc (ticker, date desc);

create index if not exists idx_sector_performance_date
  on sector_performance (date desc);

create index if not exists idx_technical_indicators_ticker_date
  on technical_indicators (ticker, date desc);

-- Row-level security
alter table daily_ohlc enable row level security;
alter table sector_performance enable row level security;
alter table correlation_matrix enable row level security;
alter table technical_indicators enable row level security;

create policy "Public read ohlc" on daily_ohlc
  for select using (true);

create policy "Public read sector performance" on sector_performance
  for select using (true);

create policy "Public read correlations" on correlation_matrix
  for select using (true);

create policy "Public read technical indicators" on technical_indicators
  for select using (true);
