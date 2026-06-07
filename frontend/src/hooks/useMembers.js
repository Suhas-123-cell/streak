import {useState, useEffect, useCallback} from 'react';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

export function useMembers(battleId) {
  const {token} = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = {'Authorization': `Bearer ${token}`};

  const fetchMembers = useCallback(async () => {
    if (!battleId) return;
    setLoading(true);
    try {
      const res = await fetch(endpoints.members(battleId), {headers});
      if (res.ok) setMembers(await res.json());
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [battleId, token]);

  useEffect(() => {
    fetchMembers().catch(() => {});
  }, [fetchMembers]);

  return {members, loading, fetchMembers};
}
