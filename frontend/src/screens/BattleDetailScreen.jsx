import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  RefreshControl, StatusBar, Switch, TouchableOpacity, Modal, Alert, Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../context/AuthContext';
import {useMembers} from '../hooks/useMembers';
import MemberRow from '../components/MemberRow';
import ProofSubmitter from '../components/ProofSubmitter';
import PenaltyAssigner from '../components/PenaltyAssigner';
import FreezeButton from '../components/FreezeButton';
import JuryVoteCard from '../components/JuryVoteCard';
import {endpoints} from '../constants/api';

import {C} from '../constants/theme';

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
  const [showPicker, setShowPicker] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(`reminder_enabled_${battle.id}`),
      AsyncStorage.getItem(`reminder_time_${battle.id}`),
    ]).then(([rawEnabled, rawTime]) => {
      if (rawEnabled) {
        const saved = JSON.parse(rawEnabled);
        setReminderEnabled(saved.enabled ?? false);
      }
      if (rawTime) setReminderDate(parseTimeToDate(rawTime));
    }).catch(() => {});
  }, [battle.id]);

  async function toggleReminder(val) {
    setReminderEnabled(val);
    AsyncStorage.setItem(
      `reminder_enabled_${battle.id}`,
      JSON.stringify({enabled: val}),
    ).catch(() => {});

    // Sync to backend (non-blocking)
    const fcmToken = await AsyncStorage.getItem('fcm_token').catch(() => null);
    fetchWithAuth(endpoints.reminderPrefs, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        enabled: val,
        reminder_time: formatTime(reminderDate),
        fcm_token: fcmToken || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => {});
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

  function onPickerChange(_, val) {
    if (!val) return;
    const selected = val instanceof Date ? val : new Date(val);
    setReminderDate(selected);
  }

  async function saveReminderTime() {
    setShowPicker(false);
    AsyncStorage.setItem(`reminder_time_${battle.id}`, formatTime(reminderDate)).catch(() => {});
    const fcmToken = await AsyncStorage.getItem('fcm_token').catch(() => null);
    fetchWithAuth(endpoints.reminderPrefs, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        enabled: reminderEnabled,
        reminder_time: formatTime(reminderDate),
        fcm_token: fcmToken || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => {});
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 2000);
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
  const myMember = members.find(m => m.user_id === user.id);
  const pendingJuryCheckins = todayCheckins.filter(
    c => c.ai_verified === null && c.user_id !== user.id,
  );

  const daysUntilEnd = battle.ends_at
    ? Math.max(0, Math.ceil((new Date(battle.ends_at) - new Date()) / 86400000))
    : null;

  const weeklyRate = members.length
    ? Math.round((members.reduce((s, m) => s + Math.min(m.current_streak || 0, 7), 0) / (members.length * 7)) * 100)
    : 0;

  async function shareStats() {
    const topMember = members[0];
    const msg = [
      `🔥 StreakFight — ${battle.habit_name}`,
      `${members.length} fighters · ${checkedInIds.size}/${members.length} checked in today`,
      topMember ? `👑 Leader: ${topMember.profiles?.username} (${topMember.current_streak} days)` : '',
      myMember ? `My streak: ${myMember.current_streak} days` : '',
      daysUntilEnd != null ? `${daysUntilEnd} days left in this season` : '',
    ].filter(Boolean).join('\n');
    Share.share({message: msg}).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />
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
          {daysUntilEnd != null && (
            <Text style={styles.heroCountdown}>
              {daysUntilEnd === 0 ? '🏁 Season ends today!' : `⏳ ${daysUntilEnd} days left`}
            </Text>
          )}
          {battle.habit_description ? (
            <Text style={styles.heroDesc}>{battle.habit_description}</Text>
          ) : null}
          <TouchableOpacity style={styles.shareBtn} onPress={shareStats}>
            <Text style={styles.shareBtnText}>↗ Share</Text>
          </TouchableOpacity>
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
        {myCheckin ? (
          myCheckin.ai_verified === true ? (
            <View style={styles.verifiedCard}>
              <Text style={styles.verifiedEmoji}>✅</Text>
              <View>
                <Text style={styles.verifiedTitle}>Verified — {myCheckin.ai_score}/100</Text>
                {myCheckin.ai_reasoning ? (
                  <Text style={styles.verifiedReason}>{myCheckin.ai_reasoning}</Text>
                ) : null}
              </View>
            </View>
          ) : myCheckin.ai_verified === null ? (
            <View style={styles.juryCard}>
              <Text style={styles.verifiedEmoji}>⚖️</Text>
              <View style={{flex: 1}}>
                <Text style={styles.juryTitle}>Pending Group Vote</Text>
                <Text style={styles.verifiedReason}>AI score {myCheckin.ai_score}/100 — your group decides</Text>
              </View>
            </View>
          ) : (
            <View style={styles.failedCard}>
              <Text style={styles.verifiedEmoji}>❌</Text>
              <View style={{flex: 1}}>
                <Text style={styles.failedTitle}>Proof Rejected — Comeback Time</Text>
                {myCheckin.ai_reasoning ? (
                  <Text style={styles.verifiedReason}>{myCheckin.ai_reasoning}</Text>
                ) : null}
                <Text style={styles.recoveryHint}>Complete your redemption challenge below to repair your streak 🔥</Text>
              </View>
            </View>
          )
        ) : (
          <>
            <FreezeButton
              battleId={battle.id}
              freezeTokens={myMember?.freeze_tokens}
              onUsed={loadData}
            />
            <ProofSubmitter battleId={battle.id} onSuccess={loadData} />
          </>
        )}

        {iCheckedIn && missedMembers.length > 0 && (
          <>
            <Text style={styles.section}>Assign Redemption</Text>
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

        <Text style={styles.section}>This Week</Text>
        <View style={styles.weekCard}>
          <View style={styles.weekRow}>
            <View style={styles.weekStat}>
              <Text style={styles.weekNum}>{weeklyRate}%</Text>
              <Text style={styles.weekLabel}>Group rate</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekNum}>{checkedInIds.size}/{members.length}</Text>
              <Text style={styles.weekLabel}>Today</Text>
            </View>
            <View style={styles.weekDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekNum}>{myMember?.current_streak ?? 0}</Text>
              <Text style={styles.weekLabel}>My streak</Text>
            </View>
          </View>
        </View>

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
              trackColor={{false: C.white15, true: C.cyan}}
              thumbColor={reminderEnabled ? C.cyan : '#9CA3AF'}
            />
          </View>
          {reminderEnabled && (
            <>
              <View style={styles.reminderDivider} />
              <View style={styles.reminderRow}>
                <View>
                  <Text style={styles.reminderTitle}>Reminder time</Text>
                  <Text style={[styles.reminderHint, reminderSaved && {color: C.green}]}>
                    {reminderSaved ? '✅ Saved!' : 'Tap the time to change'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.timePill} onPress={() => setShowPicker(true)}>
                  <Text style={styles.timeText}>{formatTime(reminderDate)}  ✎</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={saveReminderTime}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Set reminder time</Text>
                <TouchableOpacity onPress={saveReminderTime}>
                  <Text style={styles.pickerDone}>Save</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="spinner"
                onChange={onPickerChange}
                textColor="#111827"
              />
            </View>
          </View>
        </Modal>

        {pendingJuryCheckins.length > 0 && (
          <>
            <Text style={styles.section}>Group Jury</Text>
            <View style={{marginHorizontal: 16}}>
              {pendingJuryCheckins.map(c => (
                <JuryVoteCard key={c.id} checkin={c} onResolved={loadData} />
              ))}
            </View>
          </>
        )}

        {penalties.length > 0 && (
          <>
            <Text style={styles.section}>Redemption Challenges</Text>
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
            <Text style={styles.empty}>First one to check in sets the pace.</Text>
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
                  {c.ai_verified === true ? '✅' : c.ai_verified === null ? '⚖️' : '❌'} {c.ai_score}/100 · {c.ai_reasoning}
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
  safe: {flex: 1, backgroundColor: C.bg},
  hero: {
    backgroundColor: C.bgDeep, padding: 20,
    borderBottomWidth: 1, borderBottomColor: C.white15,
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroTitle: {fontSize: 22, fontWeight: '900', color: C.yellow, flex: 1, letterSpacing: 0.5},
  deleteBtn: {fontSize: 14, fontWeight: '700', color: C.pink},
  heroSub: {fontSize: 14, color: C.white40, marginTop: 4},
  heroDesc: {
    fontSize: 14, color: C.white70, marginTop: 10,
    backgroundColor: C.white08, borderRadius: 8, padding: 10,
    lineHeight: 18, borderWidth: 1, borderColor: C.white15,
  },
  progressCard: {
    backgroundColor: C.card, marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.cardBorder,
    shadowColor: C.cyan, shadowOpacity: 0.1, shadowRadius: 10,
    shadowOffset: {width: 0, height: 2}, elevation: 3,
  },
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  progressLabel: {fontSize: 14, color: C.white40},
  progressCount: {fontSize: 14, fontWeight: '800', color: C.yellow},
  progressTrack: {height: 10, backgroundColor: C.white15, borderRadius: 4, overflow: 'hidden'},
  progressFill: {height: 10, backgroundColor: C.cyan, borderRadius: 4},
  section: {
    fontSize: 12, fontWeight: '800', color: C.white40,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 6, marginHorizontal: 20,
  },
  listCard: {
    backgroundColor: C.card, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.cardBorder,
  },
  verifiedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(57,255,20,0.08)', marginHorizontal: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(57,255,20,0.35)',
  },
  juryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(232,245,49,0.06)', marginHorizontal: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(232,245,49,0.3)',
  },
  juryTitle: {fontWeight: '800', color: C.yellow, fontSize: 15},
  failedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,56,100,0.08)', marginHorizontal: 16, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,56,100,0.3)',
  },
  failedTitle: {fontWeight: '800', color: C.pink, fontSize: 15},
  recoveryHint: {color: C.orange, fontSize: 13, marginTop: 6, fontWeight: '600'},
  heroCountdown: {fontSize: 13, color: C.yellow, marginTop: 4, fontWeight: '700'},
  shareBtn: {
    alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(78,201,232,0.15)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(78,201,232,0.4)',
  },
  shareBtnText: {color: C.cyan, fontWeight: '700', fontSize: 13},
  weekCard: {
    backgroundColor: C.card, marginHorizontal: 16, borderRadius: 14,
    borderWidth: 1, borderColor: C.cardBorder, padding: 16,
  },
  weekRow: {flexDirection: 'row', alignItems: 'center'},
  weekStat: {flex: 1, alignItems: 'center'},
  weekNum: {fontSize: 22, fontWeight: '900', color: C.yellow},
  weekLabel: {fontSize: 12, color: C.white40, marginTop: 2},
  weekDivider: {width: 1, height: 36, backgroundColor: C.white15},
  verifiedEmoji: {fontSize: 28},
  verifiedTitle: {fontWeight: '800', color: C.green, fontSize: 15},
  verifiedReason: {color: C.white70, fontSize: 14, marginTop: 2},
  penaltyWrap: {marginHorizontal: 16, gap: 6},
  penaltyRow: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.white08,
  },
  penaltyName: {fontWeight: '700', color: C.white, fontSize: 14},
  penaltyText: {color: C.white70, fontSize: 14, marginTop: 2},
  penaltyStatus: {
    alignSelf: 'flex-start', marginTop: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,140,66,0.12)', paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,140,66,0.35)',
  },
  penaltyDone: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: 'rgba(57,255,20,0.3)',
  },
  penaltyStatusText: {fontSize: 12, fontWeight: '700', color: C.orange},
  feedRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.white08,
  },
  feedAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(78,201,232,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.cyan,
  },
  feedInitial: {fontSize: 14, fontWeight: '700', color: C.cyan},
  feedContent: {flex: 1},
  feedName: {fontWeight: '700', color: C.white, fontSize: 14},
  feedScore: {color: C.white40, fontSize: 13, marginTop: 2},
  empty: {padding: 20, color: C.white40, textAlign: 'center', fontSize: 14},
  reminderCard: {
    backgroundColor: C.bgCard || C.card, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: C.cardBorder,
  },
  reminderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  reminderTitle: {fontSize: 15, fontWeight: '600', color: C.white},
  reminderHint: {fontSize: 13, color: C.white40, marginTop: 2},
  reminderDivider: {height: 1, backgroundColor: C.white15},
  timePill: {
    backgroundColor: 'rgba(78,201,232,0.15)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: C.cyan,
  },
  timeText: {color: C.cyan, fontWeight: '700', fontSize: 15},
  timeEdit: {color: C.white40, fontWeight: '400', fontSize: 13},
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerSheet: {
    backgroundColor: C.bgDeep,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, borderTopWidth: 1, borderTopColor: C.white15,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.white15,
  },
  pickerTitle: {fontSize: 16, fontWeight: '700', color: C.white},
  pickerDone: {fontSize: 16, fontWeight: '700', color: C.yellow},
});
