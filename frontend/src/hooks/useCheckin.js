import {useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

export function useCheckin() {
  const {token} = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function submitCheckin(battleId, proofType, fileUri, fileName, mimeType) {
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('battle_id', battleId);
      form.append('proof_type', proofType);
      form.append('proof_file', {uri: fileUri, name: fileName, type: mimeType});

      const res = await fetch(endpoints.checkins, {
        method: 'POST',
        headers: {'Authorization': `Bearer ${token}`},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  return {submitCheckin, loading, result};
}
