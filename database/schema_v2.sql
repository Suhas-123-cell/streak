-- Migration v2: freeze tokens + jury votes

-- Freeze tokens: earned every 7 perfect days, protect streak on a missed day
ALTER TABLE battle_members ADD COLUMN IF NOT EXISTS freeze_tokens integer DEFAULT 0;

-- Jury votes: resolve borderline AI decisions (score 30–59) by group vote
CREATE TABLE IF NOT EXISTS jury_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id uuid REFERENCES checkins(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id),
  vote boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(checkin_id, voter_id)
);

ALTER TABLE jury_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jury_votes_select_member" ON jury_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checkins c
    JOIN battle_members bm ON bm.battle_id = c.battle_id
    WHERE c.id = jury_votes.checkin_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
);

CREATE POLICY "jury_votes_insert_member" ON jury_votes FOR INSERT WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM checkins c
    JOIN battle_members bm ON bm.battle_id = c.battle_id
    WHERE c.id = jury_votes.checkin_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
);
