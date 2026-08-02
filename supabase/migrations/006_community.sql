-- Community features: idea sharing, voting, leaderboards
-- Applied: Phase 5A (Day 10)

create table if not exists community_ideas (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  conviction int not null check (conviction >= 1 and conviction <= 10),
  entry_price numeric,
  target_price numeric,
  stop_loss numeric,
  time_horizon text, -- short, medium, long
  thesis text,
  tags text[],
  public boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists idea_votes (
  id bigserial primary key,
  idea_id bigint not null references community_ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote int not null check (vote = 1 or vote = -1), -- upvote or downvote
  created_at timestamp with time zone default now(),

  constraint idea_votes_idea_user_unique unique (idea_id, user_id)
);

create table if not exists idea_comments (
  id bigserial primary key,
  idea_id bigint not null references community_ideas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_comment_id bigint references idea_comments (id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists user_followers (
  id bigserial primary key,
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamp with time zone default now(),

  constraint followers_unique unique (follower_id, following_id),
  constraint not_self_follow check (follower_id != following_id)
);

create table if not exists idea_performance (
  id bigserial primary key,
  idea_id bigint not null references community_ideas (id) on delete cascade,
  date date not null,
  entry_price numeric,
  current_price numeric,
  return_percent numeric,
  target_hit boolean,
  stop_hit boolean,
  created_at timestamp with time zone default now(),

  constraint idea_performance_idea_date_key unique (idea_id, date)
);

-- Leaderboard view (materialized, refreshed daily)
create table if not exists leaderboard_cache (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text,
  ideas_count bigint,
  avg_conviction numeric,
  winning_ideas bigint,
  total_ideas bigint,
  win_rate numeric,
  followers_count bigint,
  rank int,
  period text, -- weekly, monthly, all_time
  created_at timestamp with time zone default now(),

  constraint leaderboard_cache_user_period_key unique (user_id, period)
);

-- Indexes
create index if not exists idx_community_ideas_user_id
  on community_ideas (user_id);
create index if not exists idx_community_ideas_ticker
  on community_ideas (ticker);
create index if not exists idx_community_ideas_public
  on community_ideas (public);

create index if not exists idx_idea_votes_idea_id
  on idea_votes (idea_id);
create index if not exists idx_idea_votes_user_id
  on idea_votes (user_id);

create index if not exists idx_idea_comments_idea_id
  on idea_comments (idea_id);

create index if not exists idx_user_followers_follower_id
  on user_followers (follower_id);
create index if not exists idx_user_followers_following_id
  on user_followers (following_id);

-- Row-level security
alter table community_ideas enable row level security;
alter table idea_votes enable row level security;
alter table idea_comments enable row level security;
alter table user_followers enable row level security;
alter table leaderboard_cache enable row level security;

create policy "Public read public ideas" on community_ideas
  for select using (public = true);

create policy "Users see own ideas" on community_ideas
  for select using (auth.uid() = user_id or public = true);

create policy "Users create ideas" on community_ideas
  for insert with check (auth.uid() = user_id);

create policy "Users update own ideas" on community_ideas
  for update using (auth.uid() = user_id);

create policy "Public read votes" on idea_votes
  for select using (true);

create policy "Users vote" on idea_votes
  for insert with check (auth.uid() = user_id);

create policy "Public read comments" on idea_comments
  for select using (true);

create policy "Users comment" on idea_comments
  for insert with check (auth.uid() = user_id);

create policy "Users follow" on user_followers
  for insert with check (auth.uid() = follower_id);

create policy "Public read leaderboard" on leaderboard_cache
  for select using (true);
