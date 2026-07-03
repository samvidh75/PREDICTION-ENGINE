-- Alert rules and notification management
-- Applied: Phase 5A (Day 10)

create table if not exists alert_rules (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  name text,
  rule_type text not null, -- price, volume, indicator, multi_leg
  condition jsonb not null, -- {operator: '>', value: 100, ...}
  enabled boolean default true,
  notify_channels text[] default array['push'], -- push, sms, email, telegram, slack
  do_not_disturb_start time,
  do_not_disturb_end time,
  max_alerts_per_hour int default 10,
  last_triggered timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists alert_triggers (
  id bigserial primary key,
  rule_id bigint not null references alert_rules (id) on delete cascade,
  trigger_time timestamp with time zone not null,
  triggered_value numeric,
  alert_sent boolean default false,
  message text,
  created_at timestamp with time zone default now()
);

create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_rule_id bigint references alert_rules (id) on delete cascade,
  channel text not null, -- push, sms, email, telegram, slack
  message text not null,
  status text default 'pending', -- pending, sent, failed, bounced
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_alert_rules_user_id
  on alert_rules (user_id);
create index if not exists idx_alert_rules_ticker
  on alert_rules (ticker);
create index if not exists idx_alert_rules_enabled
  on alert_rules (enabled);

create index if not exists idx_alert_triggers_rule_id
  on alert_triggers (rule_id);
create index if not exists idx_alert_triggers_trigger_time
  on alert_triggers (trigger_time desc);

create index if not exists idx_notifications_user_id
  on notifications (user_id);
create index if not exists idx_notifications_status
  on notifications (status);

-- Row-level security
alter table alert_rules enable row level security;
alter table alert_triggers enable row level security;
alter table notifications enable row level security;

create policy "Users see own rules" on alert_rules
  for select using (auth.uid() = user_id);

create policy "Users create rules" on alert_rules
  for insert with check (auth.uid() = user_id);

create policy "Users update own rules" on alert_rules
  for update using (auth.uid() = user_id);

create policy "Users see own triggers" on alert_triggers
  for select using (
    rule_id in (select id from alert_rules where user_id = auth.uid())
  );

create policy "Users see own notifications" on notifications
  for select using (auth.uid() = user_id);
