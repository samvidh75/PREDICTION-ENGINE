-- Backtest results and strategy performance tracking
-- Applied: Phase 2 (Day 4)

create table if not exists strategies (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  parameters jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists backtest_results (
  id bigserial primary key,
  strategy_id bigint not null references strategies (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  start_price numeric,
  end_price numeric,
  total_return numeric,
  annual_return numeric,
  sharpe_ratio numeric,
  sortino_ratio numeric,
  max_drawdown numeric,
  calmar_ratio numeric,
  win_rate numeric,
  profit_factor numeric,
  trades_count bigint,
  winning_trades bigint,
  losing_trades bigint,
  avg_win numeric,
  avg_loss numeric,
  equity_curve jsonb, -- [{date, value}, ...]
  trades jsonb, -- [{entry_date, exit_date, entry_price, exit_price, qty, return}, ...]
  created_at timestamp with time zone default now()
);

create table if not exists walk_forward_results (
  id bigserial primary key,
  strategy_id bigint not null references strategies (id) on delete cascade,
  period_number int not null,
  train_start_date date not null,
  train_end_date date not null,
  test_start_date date not null,
  test_end_date date not null,
  train_sharpe numeric,
  test_sharpe numeric,
  test_return numeric,
  parameters_used jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists montecarlo_results (
  id bigserial primary key,
  strategy_id bigint not null references strategies (id) on delete cascade,
  simulation_count int not null,
  confidence_level numeric,
  min_return numeric,
  max_return numeric,
  mean_return numeric,
  std_return numeric,
  percentile_5 numeric,
  percentile_25 numeric,
  percentile_50 numeric,
  percentile_75 numeric,
  percentile_95 numeric,
  paths jsonb, -- sample paths [{values: [...]}, ...]
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_strategies_user_id
  on strategies (user_id);

create index if not exists idx_backtest_results_strategy_id
  on backtest_results (strategy_id);

create index if not exists idx_walk_forward_results_strategy_id
  on walk_forward_results (strategy_id);

create index if not exists idx_montecarlo_results_strategy_id
  on montecarlo_results (strategy_id);

-- Row-level security
alter table strategies enable row level security;
alter table backtest_results enable row level security;
alter table walk_forward_results enable row level security;
alter table montecarlo_results enable row level security;

-- Users can only see their own strategies
create policy "Users see own strategies" on strategies
  for select using (auth.uid() = user_id);

create policy "Users insert own strategies" on strategies
  for insert with check (auth.uid() = user_id);

create policy "Users update own strategies" on strategies
  for update using (auth.uid() = user_id);

-- Cascade delete: users can see results for their strategies
create policy "Users see own backtest results" on backtest_results
  for select using (
    strategy_id in (select id from strategies where user_id = auth.uid())
  );

create policy "Users see own walk_forward results" on walk_forward_results
  for select using (
    strategy_id in (select id from strategies where user_id = auth.uid())
  );

create policy "Users see own montecarlo results" on montecarlo_results
  for select using (
    strategy_id in (select id from strategies where user_id = auth.uid())
  );
