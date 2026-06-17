import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert, ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useBattles} from '../hooks/useBattles';
import {useAuth} from '../context/AuthContext';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, ScreenTitle} from '../components/ArcadeUI';

function formatTime(date) {
  if (!date) return '21:00';
  const d = date instanceof Date ? date : new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
}

const PENALTY_PRESETS = [
  {emoji: 'CF', label: 'Buy coffee', value: 'Buy coffee for everyone in the battle'},
  {emoji: 'PU', label: '100 pushups', value: 'Do 100 pushups on camera'},
  {emoji: '$5', label: 'Venmo $5', value: 'Venmo $5 to whoever has the longest streak'},
  {emoji: 'AP', label: 'Public apology', value: 'Post a public apology story'},
  {emoji: 'CS', label: 'Cold shower', value: 'Take a cold shower on camera'},
  {emoji: 'PZ', label: 'Buy pizza', value: 'Buy the group pizza'},
];

const TEMPLATES = [
  {emoji: 'GYM', name: 'Gym', desc: 'Show gym equipment or entrance selfie'},
  {emoji: 'RD', name: 'Reading', desc: "Show the page you're on with timestamp"},
  {emoji: 'ZEN', name: 'Meditation', desc: 'Show a meditation app timer or peaceful space'},
  {emoji: 'H2O', name: 'Hydration', desc: 'Show your water bottle — must be at least half empty'},
  {emoji: 'RUN', name: 'Running', desc: "Show GPS tracking app with today's run"},
  {emoji: 'STU', name: 'Study', desc: 'Show your notes or textbook with timestamp'},
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
      <ArcadeBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBleed}>
          <ArcadeTopBar center="NEW FIGHT" right="CPU" />
          <ScreenTitle subtitle="Set the habit and invite your crew">
            CREATE{'\n'}BATTLE
          </ScreenTitle>
        </View>

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
          placeholderTextColor={C.white40}
          value={habitName}
          onChangeText={text => {setHabitName(text); setSelectedTemplate(null);}}
        />

        <Text style={styles.label}>PROOF RULES</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="e.g. Must show gym equipment or entrance selfie"
          placeholderTextColor={C.white40}
          value={habitDesc}
          onChangeText={setHabitDesc}
          multiline
        />

        <Text style={styles.label}>ADD MEMBERS</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1, marginBottom: 0}]}
            placeholder="Search by username"
            placeholderTextColor={C.white40}
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
            <TouchableOpacity
              style={[styles.arcadeToggle, reminderEnabled && styles.arcadeToggleOn]}
              onPress={() => setReminderEnabled(v => !v)}
              activeOpacity={0.82}>
              <Text style={[styles.arcadeToggleText, reminderEnabled && styles.arcadeToggleTextOn]}>
                {reminderEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
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
        <Text style={styles.label}>IF THEY SKIP</Text>
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
          placeholderTextColor={C.white40}
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
            <Text style={styles.submitText}>SEND CHALLENGE ▶</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  content: {padding: 20, paddingBottom: 60},
  headerBleed: {marginHorizontal: -20, marginBottom: 4},
  heading: {fontFamily: 'PressStart2P-Regular', fontSize: 13, color: '#FFFFFF', lineHeight: 22},
  headingSub: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 8, marginBottom: 20, fontFamily: 'Oswald-SemiBold'},
  label: {
    fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 14,
    marginBottom: 10, marginTop: 20,
  },
  templatesScroll: {marginHorizontal: -20, marginBottom: 4},
  templatesRow: {paddingHorizontal: 20, gap: 10},
  templateCard: {
    width: 80, height: 80, borderRadius: 0,
    backgroundColor: '#160f1e', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
    gap: 6,
  },
  templateCardSelected: {borderColor: '#FFD400', borderWidth: 2, backgroundColor: '#160f1e'},
  templateEmoji: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: C.cyan, lineHeight: 16},
  templateName: {fontFamily: 'PressStart2P-Regular', fontSize: 7, color: 'rgba(255,255,255,0.70)', lineHeight: 12},
  templateNameSelected: {color: C.yellow},
  input: {
    backgroundColor: '#160f1e',
    color: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: 'Oswald-SemiBold', borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
  },
  multiline: {height: 96, textAlignVertical: 'top', paddingTop: 13},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  addBtn: {
    backgroundColor: '#FFD400',
    paddingHorizontal: 18, paddingVertical: 13,
  },
  addBtnText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 9, lineHeight: 16},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14},
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(25,224,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 2, borderColor: 'rgba(25,224,255,0.4)',
  },
  chipText: {color: C.cyan, fontSize: 13, fontFamily: 'Oswald-SemiBold'},
  chipX: {color: C.cyan, fontSize: 11},

  reminderCard: {
    backgroundColor: '#160f1e', overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
  },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  reminderTitle: {fontSize: 15, fontFamily: 'Oswald-Bold', color: '#FFFFFF'},
  reminderHint: {fontSize: 12, color: C.white40, marginTop: 2},
  reminderDivider: {height: 1, backgroundColor: C.white08},
  arcadeToggle: {
    minWidth: 58,
    alignItems: 'center',
    backgroundColor: C.bgDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: C.white15,
  },
  arcadeToggleOn: {
    backgroundColor: 'rgba(25,224,255,0.16)',
    borderColor: C.cyan,
  },
  arcadeToggleText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: C.white40,
    lineHeight: 13,
  },
  arcadeToggleTextOn: {color: C.cyan},
  timePill: {
    backgroundColor: 'rgba(25,224,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 2, borderColor: '#19E0FF',
  },
  timeText: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#19E0FF', lineHeight: 15},

  submitBtn: {
    backgroundColor: '#FFD400', borderWidth: 3, borderColor: '#fff',
    paddingVertical: 17, alignItems: 'center', marginTop: 36,
    shadowColor: '#FF2D6F', shadowOpacity: 0.9, shadowRadius: 0,
    shadowOffset: {width: 5, height: 5}, elevation: 0,
  },
  submitText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 10, letterSpacing: 1, lineHeight: 18},

  penaltyHint: {fontSize: 13, color: C.white40, marginTop: -6, marginBottom: 12},
  penaltyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#160f1e',
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 2, borderColor: 'rgba(255,56,100,0.25)',
  },
  penaltyChipSelected: {
    backgroundColor: 'rgba(255,56,100,0.12)',
    borderColor: C.pink,
  },
  penaltyChipEmoji: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: C.pink, lineHeight: 13},
  penaltyChipLabel: {fontSize: 13, fontFamily: 'Oswald-SemiBold', color: 'rgba(255,255,255,0.70)'},
  penaltyChipLabelSelected: {color: C.pink},

  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    backgroundColor: C.bgDeep,
    paddingBottom: 32,
    borderTopWidth: 2,
    borderTopColor: C.cyan,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.cardBorder,
  },
  pickerTitle: {fontSize: 16, fontFamily: 'Oswald-Bold', color: C.white},
  pickerDone: {fontSize: 16, fontFamily: 'Oswald-Bold', color: C.yellow},
});
