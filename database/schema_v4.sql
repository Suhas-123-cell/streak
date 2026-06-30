-- Run in Supabase SQL editor after schema_v3.sql

CREATE TABLE IF NOT EXISTS checkin_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid REFERENCES checkins(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  text       text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 200),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checkin_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Battle members can comment"
  ON checkin_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read comments"
  ON checkin_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can delete own comments"
  ON checkin_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_checkin_comments_checkin_id
  ON checkin_comments (checkin_id);

-- Public battle discovery
ALTER TABLE battles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_battles_is_public ON battles (is_public) WHERE is_public = true;
