create table if not exists profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  avatar_url text,
  total_wins integer default 0,
  created_at timestamptz default now()
);

create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  habit_name text not null,
  habit_description text,
  status text default 'active',
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists battle_members (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id) on delete cascade,
  user_id uuid references profiles(id),
  status text default 'pending',
  current_streak integer default 0,
  longest_streak integer default 0,
  joined_at timestamptz default now(),
  unique(battle_id, user_id)
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id),
  user_id uuid references profiles(id),
  proof_type text not null check (proof_type in ('photo', 'voice')),
  proof_url text not null,
  ai_verified boolean,
  ai_score integer,
  ai_reasoning text,
  checked_in_at timestamptz default now(),
  date date default current_date
);

create table if not exists penalties (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id),
  assigned_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  penalty_text text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists reminder_preferences (
  user_id uuid references profiles(id) primary key,
  reminder_time time not null default '21:00',
  timezone text not null default 'Asia/Kolkata',
  fcm_token text,
  enabled boolean default true
);

alter table profiles enable row level security;
alter table battles enable row level security;
alter table battle_members enable row level security;
alter table checkins enable row level security;
alter table penalties enable row level security;
alter table reminder_preferences enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
drop policy if exists "battles_select_member" on battles;
drop policy if exists "battles_insert_authenticated" on battles;
drop policy if exists "battles_delete_own" on battles;
drop policy if exists "battle_members_select_member" on battle_members;
drop policy if exists "battle_members_insert_own" on battle_members;
drop policy if exists "battle_members_update_own" on battle_members;
drop policy if exists "battle_members_delete_own" on battle_members;
drop policy if exists "checkins_select_member" on checkins;
drop policy if exists "checkins_insert_own" on checkins;
drop policy if exists "penalties_select_member" on penalties;
drop policy if exists "penalties_insert_authenticated" on penalties;
drop policy if exists "penalties_update_own" on penalties;
drop policy if exists "reminder_preferences_select_own" on reminder_preferences;
drop policy if exists "reminder_preferences_update_own" on reminder_preferences;

create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());

create policy "battles_select_member" on battles for select using (
  exists (select 1 from battle_members where battle_members.battle_id = battles.id and battle_members.user_id = auth.uid())
);
create policy "battles_insert_authenticated" on battles for insert with check (auth.uid() is not null);
create policy "battles_delete_own" on battles for delete using (created_by = auth.uid());

create policy "battle_members_select_member" on battle_members for select using (
  exists (select 1 from battle_members bm where bm.battle_id = battle_members.battle_id and bm.user_id = auth.uid())
);
create policy "battle_members_insert_own" on battle_members for insert with check (user_id = auth.uid());
create policy "battle_members_update_own" on battle_members for update using (user_id = auth.uid());
create policy "battle_members_delete_own" on battle_members for delete using (user_id = auth.uid());

create policy "checkins_select_member" on checkins for select using (
  exists (select 1 from battle_members where battle_members.battle_id = checkins.battle_id and battle_members.user_id = auth.uid())
);
create policy "checkins_insert_own" on checkins for insert with check (user_id = auth.uid());

create policy "penalties_select_member" on penalties for select using (
  exists (select 1 from battle_members where battle_members.battle_id = penalties.battle_id and battle_members.user_id = auth.uid())
);
create policy "penalties_insert_authenticated" on penalties for insert with check (auth.uid() is not null);
create policy "penalties_update_own" on penalties for update using (assigned_to = auth.uid());

create policy "reminder_preferences_select_own" on reminder_preferences for select using (user_id = auth.uid());
create policy "reminder_preferences_update_own" on reminder_preferences for update using (user_id = auth.uid());

grant all on profiles to service_role;
grant all on battles to service_role;
grant all on battle_members to service_role;
grant all on checkins to service_role;
grant all on penalties to service_role;
grant all on reminder_preferences to service_role;

notify pgrst, 'reload schema';
