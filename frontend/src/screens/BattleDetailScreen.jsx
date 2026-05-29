import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  RefreshControl, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useMembers} from '../hooks/useMembers';
import MemberRow from '../components/MemberRow';
import ProofSubmitter from '../components/ProofSubmitter';
import PenaltyAssigner from '../components/PenaltyAssigner';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';

export default function BattleDetailScreen({route}) {
  const {battle} = route.params;
  const {user, token} = useAuth();
  const {members, fetchMembers} = useMembers(battle.id);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [myCheckin, setMyCheckin] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
          <Text style={styles.heroTitle}>{battle.habit_name}</Text>
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
  heroTitle: {fontSize: 22, fontWeight: '800', color: '#111827'},
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
});
