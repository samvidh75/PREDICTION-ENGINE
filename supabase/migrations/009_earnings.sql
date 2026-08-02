-- Earnings calendar and sentiment data
-- Applied: Phase 5A (Day 11)

create table if not exists earnings_calendar (
  id bigserial primary key,
  ticker text not null,
  announcement_date date not null,
  fiscal_quarter text, -- Q1, Q2, Q3, Q4
  fiscal_year int,
  eps_estimate numeric,
  eps_actual numeric,
  eps_prior numeric,
  revenue_estimate numeric,
  revenue_actual numeric,
  revenue_prior numeric,
  surprise_percent numeric,
  time_of_day text, -- before_open, after_close, premarket, postmarket
  source text, -- nse, broker_api, manual
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint earnings_calendar_ticker_date_key unique (ticker, announcement_date)
);

create table if not exists earnings_sentiment (
  id bigserial primary key,
  ticker text not null,
  date date not null,
  source text, -- news, twitter, broker, analyst
  sentiment_score numeric, -- -1 to 1 (negative to positive)
  confidence numeric, -- 0 to 1
  headline text,
  url text,
  created_at timestamp with time zone default now()
);

create table if not exists earnings_playbook (
  id bigserial primary key,
  ticker text not null,
  date date not null,
  days_before int, -- -5, -4, -3, -2, -1
  days_after int, -- 1, 2, 3, 4, 5
  avg_return_percent numeric,
  volatility numeric,
  direction text, -- up, down, mixed
  sample_size int,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_earnings_calendar_ticker
  on earnings_calendar (ticker);
create index if not exists idx_earnings_calendar_announcement_date
  on earnings_calendar (announcement_date);

create index if not exists idx_earnings_sentiment_ticker_date
  on earnings_sentiment (ticker, date desc);

create index if not exists idx_earnings_playbook_ticker
  on earnings_playbook (ticker);

-- Row-level security
alter table earnings_calendar enable row level security;
alter table earnings_sentiment enable row level security;
alter table earnings_playbook enable row level security;

create policy "Public read earnings calendar" on earnings_calendar
  for select using (true);

create policy "Public read earnings sentiment" on earnings_sentiment
  for select using (true);

create policy "Public read earnings playbook" on earnings_playbook
  for select using (true);
