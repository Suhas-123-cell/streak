# StreakFight — Production Quality Verification Plan

## Step 1 — Backend API logic audit

Review new backend files for correctness, edge cases, and logic errors.
Files: backend/routers/jury.py, backend/routers/checkins.py (modified), backend/routers/penalties.py (modified), backend/routers/members.py (modified).
Check: jury resolution logic, freeze token award, streak repair, borderline score routing.

## Step 2 — Frontend component audit

Review new React Native components for hook correctness, render performance, and integration.
Files: frontend/src/components/FreezeButton.jsx, frontend/src/components/JuryVoteCard.jsx, frontend/src/screens/BattleDetailScreen.jsx.
Check: state management, API calls, error handling, null safety.

## Step 3 — Security audit

Audit all modified files for new vulnerabilities: injection, auth bypass, insecure state, OWASP Top 10.
Files: all modified backend routers and new frontend components.

## Step 4 — Design quality audit

Check all frontend screens and components for AI-generated design patterns, inconsistency, and production readiness.
Files: all JSX screen and component files in frontend/src/.
Check: visual consistency, non-generic copy, spacing, authentic feel vs template-like UI.

## Step 5 — Database schema review

Review database/schema_v2.sql for correctness, RLS policy completeness, and migration safety.
