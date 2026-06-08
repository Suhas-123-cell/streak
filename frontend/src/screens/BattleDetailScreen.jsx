import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  RefreshControl, StatusBar, Switch, TouchableOpacity, Modal, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../context/AuthContext';
import {useMembers} from '../hooks/useMembers';
import MemberRow from '../components/MemberRow';
import ProofSubmitter from '../components/ProofSubmitter';
import PenaltyAssigner from '../components/PenaltyAssigner';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';

function parseTimeToDate(timeStr) {
  const [h, m] = (timeStr || '21:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function formatTime(date) {
  if (!date) return '21:00';
  const d = date instanceof Date ? date : new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
}

export default function BattleDetailScreen({route, navigation}) {
  const {battle} = route.params;
  const {user, token, fetchWithAuth} = useAuth();
  const {members, fetchMembers} = useMembers(battle.id);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [myCheckin, setMyCheckin] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => parseTimeToDate('21:00'));
  const [reminderCreatorId, setReminderCreatorId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const isCreator = reminderCreatorId === user.id;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(`reminder_enabled_${battle.id}`),
      AsyncStorage.getItem(`reminder_time_${battle.id}`),
      AsyncStorage.getItem(`reminder_creator_${battle.id}`),
    ]).then(([rawEnabled, rawTime, rawCreator]) => {
      if (rawEnabled) {
        const saved = JSON.parse(rawEnabled);
        setReminderEnabled(saved.enabled ?? false);
      }
      if (rawTime) setReminderDate(parseTimeToDate(rawTime));
      if (rawCreator) setReminderCreatorId(rawCreator);
    }).catch(() => {});
  }, [battle.id]);

  function toggleReminder(val) {
    setReminderEnabled(val);
    AsyncStorage.setItem(
      `reminder_enabled_${battle.id}`,
      JSON.stringify({enabled: val}),
    ).catch(() => {});
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Battle',
      'This will permanently delete the battle for everyone. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const res = await fetchWithAuth(endpoints.battle(battle.id), {method: 'DELETE'});
            if (res.ok) navigation.goBack();
            else Alert.alert('Error', 'Could not delete battle.');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }},
      ],
    );
  }

  function onPickerChange(val) {
    if (!val || !isCreator) return;
    const selected = val instanceof Date ? val : new Date(val);
    setReminderDate(selected);
    AsyncStorage.setItem(`reminder_time_${battle.id}`, formatTime(selected)).catch(() => {});
  }

  const headers = {Authorization: `Bearer ${token}`};

  const loadData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(endpoints.todayCheckins(battle.id), {headers}).then(r => r.json()),
        fetch(endpoints.battlePenalties(battle.id), {headers}).then(r => r.json()),
      ]);
      const checkins = Array.isArray(cRes) ? cRes : [];
      const pens = Array.isArray(pRes) ? pRes : [];
      setTodayCheckins(checkins);
      setPenalties(pens);
      setMyCheckin(checkins.find(c => c.user_id === user.id) || null);
      await fetchMembers();
    } catch {}
  }, [battle.id, token]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const checkedInIds = new Set(todayCheckins.map(c => c.user_id));
  const iCheckedIn = checkedInIds.has(user.id);
  const missedMembers = members.filter(
    m => m.status === 'active' && !checkedInIds.has(m.user_id) && m.user_id !== user.id,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
        contentContainerStyle={{paddingBottom: 48}}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>{battle.habit_name}</Text>
            {battle.created_by === user.id && (
              <TouchableOpacity onPress={handleDelete} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.heroSub}>{members.length} members · {checkedInIds.size} checked in today</Text>
          {battle.habit_description ? (
            <Text style={styles.heroDesc}>{battle.habit_description}</Text>
          ) : null}
        </View>

        {/* Progress bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Today's progress</Text>
            <Text style={styles.progressCount}>{checkedInIds.size}/{members.length}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {
              width: members.length ? `${(checkedInIds.size / members.length) * 100}%` : '0%',
            }]} />
          </View>
        </View>

        <Text style={styles.section}>Leaderboard</Text>
        <View style={styles.listCard}>
          {members.map((m, i) => (
            <MemberRow
              key={m.user_id}
              member={m}
              rank={i + 1}
              isMe={m.user_id === user.id}
            />
          ))}
        </View>

        <Text style={styles.section}>Today's Check-in</Text>
        {iCheckedIn ? (
          <View style={styles.verifiedCard}>
            <Text style={styles.verifiedEmoji}>✅</Text>
            <View>
              <Text style={styles.verifiedTitle}>Verified — {myCheckin?.ai_score}/100</Text>
              {myCheckin?.ai_reasoning ? (
                <Text style={styles.verifiedReason}>{myCheckin.ai_reasoning}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <ProofSubmitter battleId={battle.id} onSuccess={loadData} />
        )}

        {iCheckedIn && missedMembers.length > 0 && (
          <>
            <Text style={styles.section}>Set Penalties</Text>
            <View style={styles.penaltyWrap}>
              {missedMembers.map(m => (
                <PenaltyAssigner
                  key={m.user_id}
                  battleId={battle.id}
                  missedMember={m}
                  onAssigned={loadData}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.section}>Reminders</Text>
        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <View>
              <Text style={styles.reminderTitle}>Daily Reminder</Text>
              <Text style={styles.reminderHint}>Nudge me if I haven't checked in</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              trackColor={{false: '#E5E7EB', true: '#A78BFA'}}
              thumbColor={reminderEnabled ? PURPLE : '#9CA3AF'}
            />
          </View>
          {reminderEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <View>
                  <Text style={styles.reminderTitle}>Reminder time</Text>
                  <Text style={styles.reminderHint}>
                    {isCreator ? 'Tap to change' : 'Set by group creator'}
                  </Text>
                </View>
                {isCreator ? (
                  <TouchableOpacity style={styles.timePill} onPress={() => setShowPicker(true)}>
                    <Text style={styles.timeText}>{formatTime(reminderDate)}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.timePillReadOnly}>
                    <Text style={styles.timeTextReadOnly}>{formatTime(reminderDate)}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Native time picker — creator only */}
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
                onChange={(_, val) => onPickerChange(val)}
                textColor="#111827"
              />
            </View>
          </View>
        </Modal>

        {penalties.length > 0 && (
          <>
            <Text style={styles.section}>Penalties</Text>
            <View style={styles.listCard}>
              {penalties.map(p => (
                <View key={p.id} style={styles.penaltyRow}>
                  <Text style={styles.penaltyName}>💀 {p.assignee?.username}</Text>
                  <Text style={styles.penaltyText}>{p.penalty_text}</Text>
                  <View style={[styles.penaltyStatus, p.completed && styles.penaltyDone]}>
                    <Text style={styles.penaltyStatusText}>
                      {p.completed ? '✅ done' : '⏳ pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.section}>Activity Feed</Text>
        <View style={styles.listCard}>
          {todayCheckins.length === 0 && (
            <Text style={styles.empty}>No check-ins yet today</Text>
          )}
          {todayCheckins.map(c => (
            <View key={c.id} style={styles.feedRow}>
              <View style={styles.feedAvatar}>
                <Text style={styles.feedInitial}>
                  {(c.profiles?.username || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.feedContent}>
                <Text style={styles.feedName}>{c.profiles?.username}</Text>
                <Text style={styles.feedScore}>
                  {c.ai_verified ? '✅' : '❌'} {c.ai_score}/100 · {c.ai_reasoning}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  hero: {
    backgroundColor: '#fff', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroTitle: {fontSize: 22, fontWeight: '800', color: '#111827', flex: 1},
  deleteBtn: {fontSize: 14, fontWeight: '600', color: '#DC2626'},
  heroSub: {fontSize: 13, color: '#9CA3AF', marginTop: 4},
  heroDesc: {
    fontSize: 13, color: '#6B7280', marginTop: 10,
    backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10,
    lineHeight: 18,
  },
  progressCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
  },
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  progressLabel: {fontSize: 13, color: '#6B7280'},
  progressCount: {fontSize: 13, fontWeight: '700', color: '#111827'},
  progressTrack: {height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden'},
  progressFill: {height: 8, backgroundColor: PURPLE, borderRadius: 4},
  section: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 20, marginBottom: 6, marginHorizontal: 20,
  },
  listCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
  },
  verifiedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', marginHorizontal: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#BBF7D0',
  },
  verifiedEmoji: {fontSize: 28},
  verifiedTitle: {fontWeight: '700', color: '#15803D', fontSize: 15},
  verifiedReason: {color: '#6B7280', fontSize: 13, marginTop: 2},
  penaltyWrap: {marginHorizontal: 16, gap: 6},
  penaltyRow: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  penaltyName: {fontWeight: '700', color: '#111827', fontSize: 14},
  penaltyText: {color: '#6B7280', fontSize: 13, marginTop: 2},
  penaltyStatus: {
    alignSelf: 'flex-start', marginTop: 6, borderRadius: 8,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3,
  },
  penaltyDone: {backgroundColor: '#F0FDF4'},
  penaltyStatusText: {fontSize: 11, fontWeight: '600', color: '#92400E'},
  feedRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  feedAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  feedInitial: {fontSize: 13, fontWeight: '700', color: PURPLE},
  feedContent: {flex: 1},
  feedName: {fontWeight: '700', color: '#111827', fontSize: 14},
  feedScore: {color: '#6B7280', fontSize: 12, marginTop: 2},
  empty: {padding: 20, color: '#9CA3AF', textAlign: 'center'},
  reminderCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
  },
  reminderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  reminderTitle: {fontSize: 15, fontWeight: '600', color: '#111827'},
  reminderHint: {fontSize: 12, color: '#9CA3AF', marginTop: 2},
  reminderDivider: {height: 1, backgroundColor: '#F3F4F6'},
  timePill: {
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  timeText: {color: PURPLE, fontWeight: '700', fontSize: 15},
  timePillReadOnly: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  timeTextReadOnly: {color: '#9CA3AF', fontWeight: '600', fontSize: 15},
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
  pickerDone: {fontSize: 16, fontWeight: '700', color: PURPLE},
});
