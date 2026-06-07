import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import {useBattles} from '../hooks/useBattles';

const PURPLE = '#7C3AED';

const TEMPLATES = [
  {emoji: '🏋️', name: 'Gym', desc: 'Show gym equipment or entrance selfie'},
  {emoji: '📚', name: 'Reading', desc: "Show the page you're on with timestamp"},
  {emoji: '🧘', name: 'Meditation', desc: 'Show a meditation app timer or peaceful space'},
  {emoji: '💧', name: 'Hydration', desc: 'Show your water bottle — must be at least half empty'},
  {emoji: '🏃', name: 'Running', desc: "Show GPS tracking app with today's run"},
  {emoji: '✏️', name: 'Study', desc: 'Show your notes or textbook with timestamp'},
];

export default function NewBattleScreen({navigation}) {
  const {createBattle} = useBattles();
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [username, setUsername] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  function pickTemplate(t) {
    setSelectedTemplate(t.name);
    setHabitName(t.name);
    setHabitDesc(t.desc);
  }

  function addMember() {
    const u = username.trim();
    if (!u || members.includes(u)) return;
    setMembers(prev => [...prev, u]);
    setUsername('');
  }

  async function submit() {
    if (!habitName.trim()) {
      Alert.alert('Required', 'Enter a habit name');
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>New Battle</Text>
        <Text style={styles.headingSub}>Set the habit and invite your crew</Text>

        <Text style={styles.label}>POPULAR HABITS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.templatesScroll}
          contentContainerStyle={styles.templatesRow}>
          {TEMPLATES.map(t => (
            <TouchableOpacity
              key={t.name}
              style={[
                styles.templateCard,
                selectedTemplate === t.name && styles.templateCardSelected,
              ]}
              onPress={() => pickTemplate(t)}
              activeOpacity={0.8}>
              <Text style={styles.templateEmoji}>{t.emoji}</Text>
              <Text style={[
                styles.templateName,
                selectedTemplate === t.name && styles.templateNameSelected,
              ]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>HABIT NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Go to the gym"
          placeholderTextColor="#9CA3AF"
          value={habitName}
          onChangeText={text => {setHabitName(text); setSelectedTemplate(null);}}
        />

        <Text style={styles.label}>PROOF RULES</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. Must show gym equipment or entrance selfie"
          placeholderTextColor="#9CA3AF"
          value={habitDesc}
          onChangeText={setHabitDesc}
          multiline
        />

        <Text style={styles.label}>ADD MEMBERS</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1, marginBottom: 0}]}
            placeholder="Search by username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            onSubmitEditing={addMember}
            returnKeyType="done"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addMember}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {members.length > 0 && (
          <View style={styles.chips}>
            {members.map(m => (
              <TouchableOpacity
                key={m}
                style={styles.chip}
                onPress={() => setMembers(prev => prev.filter(x => x !== m))}>
                <Text style={styles.chipText}>{m}</Text>
                <Text style={styles.chipX}>✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && {opacity: 0.7}]}
          onPress={submit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>⚔️  Send Challenge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {padding: 20, paddingBottom: 60},
  heading: {fontSize: 26, fontWeight: '800', color: '#111827'},
  headingSub: {fontSize: 14, color: '#9CA3AF', marginTop: 4, marginBottom: 20},
  label: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 20,
  },
  templatesScroll: {marginHorizontal: -20, marginBottom: 4},
  templatesRow: {paddingHorizontal: 20, gap: 10},
  templateCard: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
    gap: 6,
  },
  templateCardSelected: {borderColor: PURPLE, borderWidth: 2, backgroundColor: '#EDE9FE'},
  templateEmoji: {fontSize: 28},
  templateName: {fontSize: 10, fontWeight: '700', color: '#6B7280'},
  templateNameSelected: {color: PURPLE},
  input: {
    backgroundColor: '#fff', borderRadius: 12,
    color: '#111827', paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
  multiline: {height: 96, textAlignVertical: 'top', paddingTop: 13},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  addBtn: {
    backgroundColor: PURPLE, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 13,
  },
  addBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: {color: PURPLE, fontSize: 13, fontWeight: '600'},
  chipX: {color: '#A78BFA', fontSize: 11},
  submitBtn: {
    backgroundColor: PURPLE, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 36,
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 6,
  },
  submitText: {color: '#fff', fontWeight: '800', fontSize: 16},
});
