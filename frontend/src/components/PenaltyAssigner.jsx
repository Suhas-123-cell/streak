import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

export default function PenaltyAssigner({battleId, missedMember, onAssigned}) {
  const {token} = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`penalty_default_${battleId}`)
      .then(val => { if (val) setText(val); })
      .catch(() => {});
  }, [battleId]);

  async function assign() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(endpoints.penalties, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
          battle_id: battleId,
          assigned_to: missedMember.user_id,
          penalty_text: text.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      onAssigned?.();
      Alert.alert('Done!', `Penalty set for ${missedMember.profiles?.username}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.skull}>💀</Text>
        <Text style={styles.name}>{missedMember.profiles?.username} missed today</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Set their punishment..."
          placeholderTextColor={C.white40}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={[styles.btn, loading && {opacity: 0.6}]} onPress={assign} disabled={loading}>
          <Text style={styles.btnText}>Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,56,100,0.08)', borderRadius: 14,
    padding: 14, marginVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,56,100,0.3)',
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10},
  skull: {fontSize: 16},
  name: {color: C.pink, fontWeight: '700', fontSize: 14},
  inputRow: {flexDirection: 'row', gap: 8},
  input: {
    flex: 1, backgroundColor: C.white08, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: C.white, borderWidth: 1, borderColor: 'rgba(255,56,100,0.3)', fontSize: 14,
  },
  btn: {
    backgroundColor: C.pink, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  btnText: {color: C.white, fontWeight: '700', fontSize: 14},
});
