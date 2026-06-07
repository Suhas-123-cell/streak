import {useState, useEffect, useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

export function useBattles() {
  const {user, token} = useAuth();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = {'Authorization': `Bearer ${token}`};

  const fetchBattles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(endpoints.userBattles(user.id), {headers});
      if (res.ok) setBattles(await res.json());
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchBattles().catch(() => {});
  }, [fetchBattles]);

  async function createBattle(habitName, habitDescription, memberUsernames, endsAt) {
    const res = await fetch(endpoints.battles, {
      method: 'POST',
      headers: {...headers, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        habit_name: habitName,
        habit_description: habitDescription,
        member_usernames: memberUsernames,
        ends_at: endsAt,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail);
    await fetchBattles();
    return data;
  }

  return {battles, loading, fetchBattles, createBattle};
}
