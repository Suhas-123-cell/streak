-- Add fighter_color to profiles (set by user during signup)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fighter_color TEXT DEFAULT 'pink';

-- Ensure longest_streak exists (may already be present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
