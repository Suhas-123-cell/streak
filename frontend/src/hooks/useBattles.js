import {useState, useEffect, useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

export function useBattles() {
  const {user, fetchWithAuth} = useAuth();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBattles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(endpoints.userBattles(user.id));
      if (res.ok) setBattles(await res.json());
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user, fetchWithAuth]);

  useEffect(() => {
    fetchBattles().catch(() => {});
  }, [fetchBattles]);

  async function createBattle(habitName, habitDescription, memberUsernames, endsAt) {
    const res = await fetchWithAuth(endpoints.battles, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        habit_name: habitName,
        habit_description: habitDescription,
        member_usernames: memberUsernames,
        ends_at: endsAt,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create battle');
    await fetchBattles();
    return data;
  }

  return {battles, loading, fetchBattles, createBattle};
}
