import React, {useState} from 'react';
import {TouchableOpacity, Text, StyleSheet, Alert} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

export default function FreezeButton({battleId, freezeTokens, onUsed}) {
  const {token} = useAuth();
  const [loading, setLoading] = useState(false);

  if (!freezeTokens || freezeTokens < 1) return null;

  async function useFreeze() {
    Alert.alert(
      'Use Freeze Token?',
      `You have ${freezeTokens} freeze token${freezeTokens > 1 ? 's' : ''}. Using one protects your streak for today.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Freeze Day ❄️', onPress: async () => {
          setLoading(true);
          try {
            const res = await fetch(endpoints.useFreeze(battleId), {
              method: 'POST',
              headers: {Authorization: `Bearer ${token}`},
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed');
            onUsed?.(data);
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        }},
      ],
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, loading && {opacity: 0.6}]}
      onPress={useFreeze}
      disabled={loading}>
      <Text style={styles.text}>❄️ Freeze Day  ·  {freezeTokens} left</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(78,201,232,0.12)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(78,201,232,0.4)',
  },
  text: {color: C.cyan, fontWeight: '700', fontSize: 14},
});
