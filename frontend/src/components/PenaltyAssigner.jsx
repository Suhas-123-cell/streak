import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

export default function PenaltyAssigner({battleId, missedMember, onAssigned}) {
  const {token} = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  async function assign() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(endpoints.penalties, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          battle_id: battleId,
          assigned_to: missedMember.user_id,
          penalty_text: text.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setText('');
      onAssigned?.();
      Alert.alert('Penalty set!', `"${text.trim()}" assigned to ${missedMember.profiles?.username}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>💀 {missedMember.profiles?.username} missed</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Set a penalty..."
          placeholderTextColor="#666"
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.btn} onPress={assign} disabled={loading}>
          <Text style={styles.btnText}>Set</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A0A0A',
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
  },
  name: {color: '#FF4444', fontWeight: '700', marginBottom: 8},
  inputRow: {flexDirection: 'row', gap: 8},
  input: {
    flex: 1,
    backgroundColor: '#2A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
  },
  btn: {
    backgroundColor: '#FF4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  btnText: {color: '#fff', fontWeight: '700'},
});
