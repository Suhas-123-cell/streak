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
      setMembers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [battleId, token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {members, loading, fetchMembers};
}
