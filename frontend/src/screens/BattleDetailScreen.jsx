import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  RefreshControl, StatusBar, TouchableOpacity, Modal, Alert, Share, TextInput, KeyboardAvoidingView, Platform,
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
import FlawlessVictoryModal from '../components/FlawlessVictoryModal';
import {rankFromStreak} from '../utils/rank';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, ScreenTitle} from '../components/ArcadeUI';

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
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState(() => parseTimeToDate('21:00'));
  const [showPicker, setShowPicker] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);
  const [reward, setReward] = useState(null);

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
      // Load comments for all today's check-ins in parallel
      const commentResults = await Promise.allSettled(
        checkins.map(c =>
          fetch(endpoints.listComments(c.id), {headers}).then(r => r.json()).then(d => [c.id, d])
        )
      );
      const commentMap = {};
      commentResults.forEach(r => {
        if (r.status === 'fulfilled' && Array.isArray(r.value[1])) {
          commentMap[r.value[0]] = r.value[1];
        }
      });
      setComments(prev => ({...prev, ...commentMap}));
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
      `STREAKFIGHT — ${battle.habit_name}`,
      `${members.length} fighters · ${checkedInIds.size}/${members.length} checked in today`,
      topMember ? `Leader: ${topMember.profiles?.username} (${topMember.current_streak} days)` : '',
      myMember ? `My streak: ${myMember.current_streak} days` : '',
      daysUntilEnd != null ? `${daysUntilEnd} days left in this season` : '',
    ].filter(Boolean).join('\n');
    Share.share({message: msg}).catch(() => {});
  }

  async function shareInvite() {
    try {
      const res = await fetch(endpoints.createInviteLink(battle.id), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) throw new Error('Could not generate invite link');
      const {code} = await res.json();
      Share.share({
        message: `Join my "${battle.habit_name}" battle on StreakFight!\n\nCode: ${code}\nDownload: https://streakfight.app`,
        title: 'Join my StreakFight battle',
      }).catch(() => {});
    } catch (e) {
      Alert.alert('Invite failed', e.message || 'Please try again.');
    }
  }

  async function submitComment(checkinId) {
    const text = (commentDraft[checkinId] || '').trim();
    if (!text) return;
    setCommentDraft(prev => ({...prev, [checkinId]: ''}));
    try {
      const res = await fetch(endpoints.addComment(checkinId), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({text}),
      });
      const newComment = await res.json();
      setComments(prev => ({
        ...prev,
        [checkinId]: [...(prev[checkinId] || []), newComment],
      }));
    } catch {}
  }

  async function reactToCheckin(checkinId, emoji) {
    try {
      const res = await fetch(endpoints.reactToCheckin(checkinId), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({emoji}),
      });
      const data = await res.json();
      if (data.reactions) {
        setReactions(prev => ({...prev, [checkinId]: data.reactions}));
      }
    } catch {}
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ArcadeBackdrop />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.cyan} />
        }
        contentContainerStyle={{paddingBottom: 48}}>

        {/* Hero */}
        <View style={styles.hero}>
          <ArcadeTopBar center="BATTLE READY" right="CPU" />
          <View style={styles.heroTop}>
            <ScreenTitle subtitle={`${members.length} fighters · ${checkedInIds.size} checked in today`} style={styles.heroScreenTitle}>
              {battle.habit_name}
            </ScreenTitle>
            {battle.created_by === user.id && (
              <TouchableOpacity onPress={handleDelete} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
          {daysUntilEnd != null && (
            <Text style={styles.heroCountdown}>
              {daysUntilEnd === 0 ? '🏁 Season ends today!' : `⏳ ${daysUntilEnd} days left`}
            </Text>
          )}
          {battle.habit_description ? (
            <Text style={styles.heroDesc}>{battle.habit_description}</Text>
          ) : null}
          <View style={styles.shareBtnRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={shareStats}>
              <Text style={styles.shareBtnText}>↗ Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, styles.inviteBtn]} onPress={shareInvite}>
              <Text style={styles.shareBtnText}>+ Invite</Text>
            </TouchableOpacity>
          </View>
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
              <Text style={[styles.verifiedEmoji, styles.markOk]}>OK</Text>
              <View>
                <Text style={styles.verifiedTitle}>Verified — {myCheckin.ai_score}/100</Text>
                {myCheckin.ai_reasoning ? (
                  <Text style={styles.verifiedReason}>{myCheckin.ai_reasoning}</Text>
                ) : null}
              </View>
            </View>
          ) : myCheckin.ai_verified === null ? (
            <View style={styles.juryCard}>
              <Text style={[styles.verifiedEmoji, styles.markVote]}>JV</Text>
              <View style={{flex: 1}}>
                <Text style={styles.juryTitle}>Pending Group Vote</Text>
                <Text style={styles.verifiedReason}>AI score {myCheckin.ai_score}/100 — your group decides</Text>
              </View>
            </View>
          ) : (
            <View style={styles.failedCard}>
              <Text style={[styles.verifiedEmoji, styles.markNo]}>NO</Text>
              <View style={{flex: 1}}>
                <Text style={styles.failedTitle}>Proof Rejected</Text>
                {myCheckin.ai_reasoning ? (
                  <Text style={styles.verifiedReason}>{myCheckin.ai_reasoning}</Text>
                ) : null}
                {myMember?.freeze_tokens > 0 ? (
                  <TouchableOpacity
                    style={styles.repairBtn}
                    onPress={async () => {
                      try {
                        const res = await fetch(endpoints.repairStreak(battle.id), {
                          method: 'POST', headers: {Authorization: `Bearer ${token}`},
                        });
                        const data = await res.json();
                        if (data.ok) { Alert.alert('Streak Repaired!', `Back to ${data.new_streak} days. ${data.tokens_remaining} freeze token${data.tokens_remaining !== 1 ? 's' : ''} left.`); loadData(); }
                        else Alert.alert('Error', data.detail || 'Could not repair streak.');
                      } catch { Alert.alert('Error', 'Could not repair streak.'); }
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.repairBtnText}>❄ USE FREEZE TOKEN — SAVE STREAK</Text>
                    <Text style={styles.repairBtnSub}>{myMember.freeze_tokens} token{myMember.freeze_tokens !== 1 ? 's' : ''} available</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.recoveryHint}>Complete your redemption challenge below to repair your streak.</Text>
                )}
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
            <ProofSubmitter battleId={battle.id} onSuccess={(data) => { loadData(); if (data?.milestone_hit) setReward(data); }} />
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
            <TouchableOpacity
              style={[styles.arcadeToggle, reminderEnabled && styles.arcadeToggleOn]}
              onPress={() => toggleReminder(!reminderEnabled)}
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
                <View>
                  <Text style={styles.reminderTitle}>Reminder time</Text>
                  <Text style={[styles.reminderHint, reminderSaved && {color: C.green}]}>
                    {reminderSaved ? 'SAVED' : 'Tap the time to change'}
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
                textColor={C.white}
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
                  <Text style={styles.penaltyName}>{p.assignee?.username}</Text>
                  <Text style={styles.penaltyText}>{p.penalty_text}</Text>
                  <View style={[styles.penaltyStatus, p.completed && styles.penaltyDone]}>
                    <Text style={styles.penaltyStatusText}>
                      {p.completed ? 'DONE' : 'PENDING'}
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
                  {c.ai_verified === true ? 'OK' : c.ai_verified === null ? 'VOTE' : 'NO'} · {c.ai_score}/100
                </Text>
                {c.ai_reasoning ? (
                  <Text style={styles.feedReason} numberOfLines={2}>{c.ai_reasoning}</Text>
                ) : null}
                <View style={styles.reactionRow}>
                  {['🔥','❤️','👏','💪','😤'].map(e => {
                    const count = reactions[c.id]?.[e];
                    return (
                      <TouchableOpacity
                        key={e}
                        style={[styles.reactionBtn, count && styles.reactionBtnActive]}
                        onPress={() => reactToCheckin(c.id, e)}
                        activeOpacity={0.7}>
                        <Text style={styles.reactionEmoji}>{e}</Text>
                        {count ? <Text style={styles.reactionCount}>{count}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {(comments[c.id] || []).map(cm => (
                  <View key={cm.id} style={styles.commentRow}>
                    <Text style={styles.commentAuthor}>{cm.profiles?.username}</Text>
                    <Text style={styles.commentText}>{cm.text}</Text>
                  </View>
                ))}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Say something..."
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={commentDraft[c.id] || ''}
                    onChangeText={t => setCommentDraft(prev => ({...prev, [c.id]: t}))}
                    onSubmitEditing={() => submitComment(c.id)}
                    returnKeyType="send"
                    maxLength={200}
                  />
                  <TouchableOpacity onPress={() => submitComment(c.id)} style={styles.commentSendBtn}>
                    <Text style={styles.commentSendText}>▶</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <FlawlessVictoryModal
        visible={!!reward}
        streak={reward?.milestone_hit}
        rank={reward?.new_rank || rankFromStreak(reward?.milestone_hit || 0)}
        onClose={() => setReward(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  hero: {
    backgroundColor: 'transparent', paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: 'rgba(255,45,111,0.2)',
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 20},
  heroScreenTitle: {flex: 1, paddingRight: 12, paddingBottom: 8},
  heroTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 13, color: '#FFD400', flex: 1, letterSpacing: 1, lineHeight: 22,
    textShadowColor: '#FF6600', textShadowRadius: 0, textShadowOffset: {width: 2, height: 2}},
  deleteBtn: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FF3B3B', lineHeight: 14, marginTop: 14},
  heroSub: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 5, fontFamily: 'Oswald-SemiBold'},
  heroDesc: {
    fontSize: 14, color: C.white70, marginTop: 10, marginHorizontal: 20,
    backgroundColor: C.bgSurface, padding: 10,
    lineHeight: 18, borderWidth: 2, borderColor: C.white15,
  },
  progressCard: {
    backgroundColor: '#160f1e', marginHorizontal: 16, marginTop: 14,
    borderWidth: 2, borderColor: 'rgba(170,0,255,0.3)',
    padding: 17,
  },
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10},
  progressLabel: {fontSize: 13, color: 'rgba(255,255,255,0.50)', fontFamily: 'Oswald-SemiBold'},
  progressCount: {fontFamily: 'PressStart2P-Regular', fontSize: 11, color: '#FFD400', lineHeight: 18},
  progressTrack: {height: 11, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 0, overflow: 'hidden'},
  progressFill: {height: 11, backgroundColor: '#AA00FF', borderRadius: 0},
  section: {
    fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase', letterSpacing: 2, lineHeight: 14,
    marginTop: 22, marginBottom: 8, marginHorizontal: 20,
  },
  listCard: {
    backgroundColor: '#160f1e', marginHorizontal: 16, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
  },
  verifiedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(155,232,12,0.08)', marginHorizontal: 16,
    padding: 16, borderWidth: 2, borderColor: 'rgba(155,232,12,0.35)',
  },
  juryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(232,245,49,0.06)', marginHorizontal: 16,
    padding: 16, borderWidth: 2, borderColor: 'rgba(232,245,49,0.3)',
  },
  juryTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#FFD400', lineHeight: 18},
  failedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,56,100,0.08)', marginHorizontal: 16,
    padding: 16, borderWidth: 2, borderColor: 'rgba(255,56,100,0.3)',
  },
  failedTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#FF2D6F', lineHeight: 18},
  recoveryHint: {color: C.orange, fontSize: 13, marginTop: 6, fontFamily: 'Oswald-SemiBold'},
  repairBtn: {
    marginTop: 10, backgroundColor: 'rgba(25,224,255,0.12)',
    borderWidth: 2, borderColor: '#19E0FF',
    paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center',
  },
  repairBtnText: {fontFamily: 'PressStart2P-Regular', fontSize: 7, color: '#19E0FF', lineHeight: 13, letterSpacing: 1},
  repairBtnSub: {fontSize: 11, color: 'rgba(25,224,255,0.65)', fontFamily: 'Oswald-SemiBold', marginTop: 3},
  heroCountdown: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FFD400', marginTop: 6, marginHorizontal: 20, lineHeight: 14},
  shareBtnRow: {flexDirection: 'row', gap: 8},
  inviteBtn: {borderColor: C.yellow},
  shareBtn: {
    alignSelf: 'flex-start', marginTop: 10, marginHorizontal: 20,
    backgroundColor: 'rgba(25,224,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 2, borderColor: 'rgba(25,224,255,0.4)',
  },
  shareBtnText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#19E0FF', lineHeight: 13},
  weekCard: {
    backgroundColor: '#160f1e', marginHorizontal: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)', padding: 16,
  },
  weekRow: {flexDirection: 'row', alignItems: 'center'},
  weekStat: {flex: 1, alignItems: 'center'},
  weekNum: {fontFamily: 'PressStart2P-Regular', fontSize: 14, color: '#FFD400', lineHeight: 22},
  weekLabel: {fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 4, fontFamily: 'Oswald-SemiBold'},
  weekDivider: {width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.15)'},
  verifiedEmoji: {
    width: 42,
    height: 42,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    lineHeight: 42,
    borderWidth: 2,
  },
  markOk: {
    color: C.lime,
    backgroundColor: 'rgba(155,232,12,0.12)',
    borderColor: 'rgba(155,232,12,0.45)',
  },
  markVote: {
    color: C.yellow,
    backgroundColor: 'rgba(255,212,0,0.12)',
    borderColor: 'rgba(255,212,0,0.45)',
  },
  markNo: {
    color: C.pink,
    backgroundColor: 'rgba(255,45,111,0.12)',
    borderColor: 'rgba(255,45,111,0.45)',
  },
  verifiedTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#9BE80C', lineHeight: 18},
  verifiedReason: {color: 'rgba(255,255,255,0.80)', fontSize: 14, marginTop: 2, fontFamily: 'Oswald-SemiBold'},
  penaltyWrap: {marginHorizontal: 16, gap: 6},
  penaltyRow: {
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.white08,
  },
  penaltyName: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
  penaltyText: {color: 'rgba(255,255,255,0.70)', fontSize: 14, marginTop: 2},
  penaltyStatus: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: 'rgba(255,140,66,0.12)', paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,140,66,0.35)',
  },
  penaltyDone: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: 'rgba(57,255,20,0.3)',
  },
  penaltyStatusText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FF6600', lineHeight: 13},
  feedRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.white08,
  },
  feedAvatar: {
    width: 38, height: 38,
    backgroundColor: 'rgba(25,224,255,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#19E0FF',
  },
  feedInitial: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#19E0FF', lineHeight: 16},
  feedContent: {flex: 1},
  feedName: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
  feedScore: {color: 'rgba(255,255,255,0.50)', fontSize: 13, marginTop: 2},
  empty: {padding: 20, color: 'rgba(255,255,255,0.50)', textAlign: 'center', fontSize: 14, fontFamily: 'Oswald-SemiBold'},
  feedReason: {color: 'rgba(255,255,255,0.40)', fontSize: 12, marginTop: 2, fontFamily: 'Oswald-SemiBold', lineHeight: 16},
  reactionRow: {flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap'},
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,212,0,0.12)',
    borderColor: 'rgba(255,212,0,0.4)',
  },
  reactionEmoji: {fontSize: 14},
  reactionCount: {fontSize: 11, color: '#FFD400', fontFamily: 'PressStart2P-Regular', lineHeight: 14},
  commentRow: {flexDirection: 'row', gap: 6, marginTop: 5, paddingLeft: 2},
  commentAuthor: {fontFamily: 'PressStart2P-Regular', fontSize: 7, color: C.cyan, lineHeight: 13, minWidth: 60},
  commentText: {flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Oswald-SemiBold', lineHeight: 16},
  commentInputRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8},
  commentInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6,
    color: '#FFFFFF', fontSize: 13, fontFamily: 'Oswald-SemiBold',
  },
  commentSendBtn: {
    backgroundColor: 'rgba(25,224,255,0.15)', borderWidth: 1, borderColor: '#19E0FF',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  commentSendText: {color: '#19E0FF', fontFamily: 'PressStart2P-Regular', fontSize: 9, lineHeight: 14},
  reminderCard: {
    backgroundColor: '#160f1e', marginHorizontal: 16, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
  },
  reminderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  reminderTitle: {fontSize: 15, fontFamily: 'Oswald-Bold', color: '#FFFFFF'},
  reminderHint: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 2},
  reminderDivider: {height: 1, backgroundColor: 'rgba(255,255,255,0.15)'},
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
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#19E0FF',
  },
  timeText: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#19E0FF', lineHeight: 15},
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerSheet: {
    backgroundColor: C.bgDeep,
    paddingBottom: 32, borderTopWidth: 2, borderTopColor: C.cyan,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.white15,
  },
  pickerTitle: {fontSize: 16, fontFamily: 'Oswald-Bold', color: C.white},
  pickerDone: {fontSize: 16, fontFamily: 'Oswald-Bold', color: C.yellow},
});
