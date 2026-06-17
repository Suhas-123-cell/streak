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
      Alert.alert('Done!', `Redemption challenge set for ${missedMember.profiles?.username}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.skull}>P1</Text>
        <Text style={styles.name}>{missedMember.profiles?.username} MISSED TODAY</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Set their redemption challenge..."
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
    backgroundColor: 'rgba(255,45,111,0.08)',
    padding: 14, marginVertical: 4,
    borderWidth: 2, borderColor: 'rgba(255,45,111,0.35)',
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10},
  skull: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: C.pink,
    lineHeight: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,45,111,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  name: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FF2D6F', lineHeight: 15},
  inputRow: {flexDirection: 'row', gap: 8},
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#FFFFFF', borderWidth: 2, borderColor: 'rgba(255,45,111,0.35)', fontSize: 14, fontFamily: 'Oswald-SemiBold',
  },
  btn: {
    backgroundColor: '#FF2D6F',
    paddingHorizontal: 14, justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  btnText: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
});
