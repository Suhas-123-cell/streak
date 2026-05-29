create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  avatar_url text,
  total_wins integer default 0,
  created_at timestamptz default now()
);

create table battles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id),
  habit_name text not null,
  habit_description text,
  status text default 'active',
  ends_at timestamptz,
  created_at timestamptz default now()
);

create table battle_members (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id) on delete cascade,
  user_id uuid references profiles(id),
  status text default 'pending',
  current_streak integer default 0,
  longest_streak integer default 0,
  joined_at timestamptz default now(),
  unique(battle_id, user_id)
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id),
  user_id uuid references profiles(id),
  proof_type text not null,
  proof_url text not null,
  ai_verified boolean,
  ai_score integer,
  ai_reasoning text,
  checked_in_at timestamptz default now(),
  date date default current_date
);

create table penalties (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid references battles(id),
  assigned_by uuid references profiles(id),
  assigned_to uuid references profiles(id),
  penalty_text text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

create table reminder_preferences (
  user_id uuid references profiles(id) primary key,
  reminder_time time not null default '21:00',
  timezone text not null default 'Asia/Kolkata',
  fcm_token text,
  enabled boolean default true
);
