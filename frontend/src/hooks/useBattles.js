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
      setBattles(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchBattles();
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
    if (!res.ok) throw new Error((await res.json()).detail);
    await fetchBattles();
    return res.json();
  }

  return {battles, loading, fetchBattles, createBattle};
}
