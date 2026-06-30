-- Migration v3: subscriptions + invite codes

-- Subscriptions: one row per user, updated by Stripe webhook
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text DEFAULT 'free' CHECK (status IN ('free', 'active', 'canceled', 'past_due')),
  plan text CHECK (plan IN ('pro_monthly', 'pro_yearly')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (
  user_id = (SELECT auth.uid())
);

-- Invite codes: shareable short codes to join a battle
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid REFERENCES battles(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id),
  code text UNIQUE NOT NULL,
  max_uses integer DEFAULT 50,
  uses_count integer DEFAULT 0,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone with the code can read it (needed for invite flow)
CREATE POLICY "invite_codes_select_all" ON invite_codes FOR SELECT USING (true);

CREATE POLICY "invite_codes_insert_member" ON invite_codes FOR INSERT WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM battle_members
    WHERE battle_members.battle_id = invite_codes.battle_id
      AND battle_members.user_id = (SELECT auth.uid())
      AND battle_members.status = 'active'
  )
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Add subscription status shortcut to profiles for cheap checks
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;
-- Profiles longest_streak field (used by rewards.py)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
-- Fighter color chosen at signup (missing causes 500 on every new account)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fighter_color text DEFAULT 'pink'
  CHECK (fighter_color IN ('pink', 'cyan', 'yellow', 'lime', 'purple'));
