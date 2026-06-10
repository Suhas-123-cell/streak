import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, StatusBar, Switch, Modal, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useBattles} from '../hooks/useBattles';
import {useAuth} from '../context/AuthContext';
import {C} from '../constants/theme';

const PURPLE = C.cyan;
const TEXT_1 = C.white;
const TEXT_2 = C.white70;
const TEXT_3 = C.white40;
const BORDER = C.cardBorder;

function formatTime(date) {
  if (!date) return '21:00';
  const d = date instanceof Date ? date : new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
}

const PENALTY_PRESETS = [
  {emoji: '☕', label: 'Buy coffee', value: 'Buy coffee for everyone in the battle'},
  {emoji: '💪', label: '100 pushups', value: 'Do 100 pushups on camera'},
  {emoji: '💸', label: 'Venmo $5', value: 'Venmo $5 to whoever has the longest streak'},
  {emoji: '😬', label: 'Public apology', value: 'Post a public apology story'},
  {emoji: '🥶', label: 'Cold shower', value: 'Take a cold shower on camera'},
  {emoji: '🍕', label: 'Buy pizza', value: 'Buy the group pizza'},
];

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
  const {user} = useAuth();
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [username, setUsername] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [defaultPenalty, setDefaultPenalty] = useState('');
  const [selectedPenaltyPreset, setSelectedPenaltyPreset] = useState(null);

  // Reminder — creator sets this for the whole group
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

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
      const newBattle = await createBattle(habitName.trim(), habitDesc.trim(), members, null);
      // Persist reminder so BattleDetail knows the creator and their chosen time
      if (newBattle?.id) {
        const saves = [
          AsyncStorage.setItem(`reminder_time_${newBattle.id}`, formatTime(reminderDate)),
          AsyncStorage.setItem(`reminder_creator_${newBattle.id}`, user.id),
          AsyncStorage.setItem(
            `reminder_enabled_${newBattle.id}`,
            JSON.stringify({enabled: reminderEnabled}),
          ),
        ];
        if (defaultPenalty.trim()) {
          saves.push(AsyncStorage.setItem(`penalty_default_${newBattle.id}`, defaultPenalty.trim()));
        }
        await Promise.all(saves);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
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
          placeholderTextColor={TEXT_3}
          value={habitName}
          onChangeText={text => {setHabitName(text); setSelectedTemplate(null);}}
        />

        <Text style={styles.label}>PROOF RULES</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. Must show gym equipment or entrance selfie"
          placeholderTextColor={TEXT_3}
          value={habitDesc}
          onChangeText={setHabitDesc}
          multiline
        />

        <Text style={styles.label}>ADD MEMBERS</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1, marginBottom: 0}]}
            placeholder="Search by username"
            placeholderTextColor={TEXT_3}
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

        {/* ── Daily Reminder ── */}
        <Text style={styles.label}>DAILY REMINDER</Text>
        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View style={{flex: 1}}>
              <Text style={styles.reminderTitle}>Send daily reminder</Text>
              <Text style={styles.reminderHint}>
                Nudges everyone who has not checked in yet
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{false: C.white15, true: C.cyan}}
              thumbColor={reminderEnabled ? C.yellow : C.white40}
            />
          </View>
          {reminderEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.reminderTitle}>Reminder time</Text>
                  <Text style={styles.reminderHint}>Only you can edit this</Text>
                </View>
                <TouchableOpacity style={styles.timePill} onPress={() => setShowPicker(true)}>
                  <Text style={styles.timeText}>{formatTime(reminderDate)}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Native time picker modal ── */}
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Set reminder time</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="spinner"
                onChange={(_, val) => {if (val) setReminderDate(val instanceof Date ? val : new Date(val));}}
                textColor={C.white}
              />
            </View>
          </View>
        </Modal>

        {/* ── Default Penalty ── */}
        <Text style={styles.label}>IF THEY SKIP 💀</Text>
        <Text style={styles.penaltyHint}>Set a default punishment for missed days</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.templatesScroll}
          contentContainerStyle={[styles.templatesRow, {marginBottom: 12}]}>
          {PENALTY_PRESETS.map(p => (
            <TouchableOpacity
              key={p.label}
              style={[
                styles.penaltyChip,
                selectedPenaltyPreset === p.label && styles.penaltyChipSelected,
              ]}
              onPress={() => {
                if (selectedPenaltyPreset === p.label) {
                  setSelectedPenaltyPreset(null);
                  setDefaultPenalty('');
                } else {
                  setSelectedPenaltyPreset(p.label);
                  setDefaultPenalty(p.value);
                }
              }}
              activeOpacity={0.8}>
              <Text style={styles.penaltyChipEmoji}>{p.emoji}</Text>
              <Text style={[
                styles.penaltyChipLabel,
                selectedPenaltyPreset === p.label && styles.penaltyChipLabelSelected,
              ]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={[styles.input, styles.multiline, {minHeight: 72}]}
          placeholder="Or write a custom penalty..."
          placeholderTextColor={TEXT_3}
          value={defaultPenalty}
          onChangeText={t => {setDefaultPenalty(t); setSelectedPenaltyPreset(null);}}
          multiline
        />

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
  safe: {flex: 1, backgroundColor: C.bg},
  content: {padding: 20, paddingBottom: 60},
  heading: {fontSize: 26, fontWeight: '800', color: TEXT_1},
  headingSub: {fontSize: 14, color: TEXT_3, marginTop: 4, marginBottom: 20},
  label: {
    fontSize: 10, fontWeight: '800', color: TEXT_3,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 20,
  },
  templatesScroll: {marginHorizontal: -20, marginBottom: 4},
  templatesRow: {paddingHorizontal: 20, gap: 10},
  templateCard: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
    gap: 6,
  },
  templateCardSelected: {borderColor: C.yellow, borderWidth: 2, backgroundColor: C.card},
  templateEmoji: {fontSize: 28},
  templateName: {fontSize: 10, fontWeight: '700', color: TEXT_2},
  templateNameSelected: {color: C.yellow},
  input: {
    backgroundColor: C.card, borderRadius: 12,
    color: C.white, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, borderWidth: 1, borderColor: C.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
  },
  multiline: {height: 96, textAlignVertical: 'top', paddingTop: 13},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  addBtn: {
    backgroundColor: C.yellow, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 13,
  },
  addBtnText: {color: C.bgDeep, fontWeight: '700', fontSize: 15},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(78,201,232,0.15)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: {color: C.cyan, fontSize: 13, fontWeight: '600'},
  chipX: {color: C.cyan, fontSize: 11},

  reminderCard: {
    backgroundColor: C.card, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.cardBorder,
  },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  reminderTitle: {fontSize: 15, fontWeight: '600', color: TEXT_1},
  reminderHint: {fontSize: 12, color: TEXT_3, marginTop: 2},
  reminderDivider: {height: 1, backgroundColor: C.white08},
  timePill: {
    backgroundColor: 'rgba(78,201,232,0.15)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  timeText: {color: C.cyan, fontWeight: '700', fontSize: 15},

  submitBtn: {
    backgroundColor: C.yellow, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 36,
    shadowColor: C.yellow, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 6,
  },
  submitText: {color: C.bgDeep, fontWeight: '800', fontSize: 16},

  penaltyHint: {fontSize: 13, color: TEXT_3, marginTop: -6, marginBottom: 12},
  penaltyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,56,100,0.25)',
  },
  penaltyChipSelected: {
    backgroundColor: 'rgba(255,56,100,0.12)',
    borderColor: C.pink,
  },
  penaltyChipEmoji: {fontSize: 16},
  penaltyChipLabel: {fontSize: 13, fontWeight: '600', color: TEXT_2},
  penaltyChipLabelSelected: {color: C.pink},

  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    backgroundColor: C.bgDeep,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  pickerTitle: {fontSize: 16, fontWeight: '700', color: C.white},
  pickerDone: {fontSize: 16, fontWeight: '700', color: C.yellow},
});
