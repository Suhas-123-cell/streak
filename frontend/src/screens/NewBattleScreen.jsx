import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import {useBattles} from '../hooks/useBattles';

export default function NewBattleScreen({navigation}) {
  const {createBattle} = useBattles();
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [username, setUsername] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  function addMember() {
    const u = username.trim();
    if (!u || members.includes(u)) return;
    setMembers(prev => [...prev, u]);
    setUsername('');
  }

  function removeMember(u) {
    setMembers(prev => prev.filter(m => m !== u));
  }

  async function submit() {
    if (!habitName.trim()) {
      Alert.alert('Required', 'Habit name is required');
      return;
    }
    setLoading(true);
    try {
      await createBattle(habitName.trim(), habitDesc.trim(), members, null);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>New Battle</Text>

        <Text style={styles.label}>Habit Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Go to the gym"
          placeholderTextColor="#555"
          value={habitName}
          onChangeText={setHabitName}
        />

        <Text style={styles.label}>Proof Rules</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. Must show gym equipment or entrance selfie"
          placeholderTextColor="#555"
          value={habitDesc}
          onChangeText={setHabitDesc}
          multiline
        />

        <Text style={styles.label}>Add Members</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1}]}
            placeholder="Search by username"
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={addMember}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chips}>
          {members.map(m => (
            <TouchableOpacity key={m} style={styles.chip} onPress={() => removeMember(m)}>
              <Text style={styles.chipText}>{m} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>⚔️ Send Challenge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A1A'},
  content: {padding: 20, paddingBottom: 60},
  heading: {color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 24},
  label: {color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16},
  input: {
    backgroundColor: '#12122A',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E1E3F',
  },
  multiline: {height: 90, textAlignVertical: 'top'},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  addBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  addBtnText: {color: '#fff', fontWeight: '700'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  chip: {
    backgroundColor: '#1E1E3F',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {color: '#A78BFF', fontSize: 13},
  submitBtn: {
    backgroundColor: '#6C47FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitText: {color: '#fff', fontWeight: '800', fontSize: 17},
});
