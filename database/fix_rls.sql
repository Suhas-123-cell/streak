-- Fix: infinite recursion in battle_members RLS policy
-- The select policy was querying battle_members from within itself.
-- Solution: security definer function runs as superuser, bypasses RLS entirely.

drop policy if exists "battle_members_select_member" on battle_members;
drop policy if exists "battles_select_member" on battles;
drop policy if exists "checkins_select_member" on checkins;
drop policy if exists "penalties_select_member" on penalties;

create or replace function is_battle_member(p_battle_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from battle_members
    where battle_members.battle_id = p_battle_id
      and battle_members.user_id = auth.uid()
  );
$$;

create policy "battle_members_select_member" on battle_members
  for select using (is_battle_member(battle_id));

create policy "battles_select_member" on battles
  for select using (is_battle_member(id));

create policy "checkins_select_member" on checkins
  for select using (is_battle_member(battle_id));

create policy "penalties_select_member" on penalties
  for select using (is_battle_member(battle_id));
