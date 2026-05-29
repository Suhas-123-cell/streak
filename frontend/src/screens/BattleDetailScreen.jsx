import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useMembers} from '../hooks/useMembers';
import MemberRow from '../components/MemberRow';
import ProofSubmitter from '../components/ProofSubmitter';
import PenaltyAssigner from '../components/PenaltyAssigner';
import {endpoints} from '../constants/api';

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
    const [cRes, pRes] = await Promise.all([
      fetch(endpoints.todayCheckins(battle.id), {headers}).then(r => r.json()),
      fetch(endpoints.battlePenalties(battle.id), {headers}).then(r => r.json()),
    ]);
    setTodayCheckins(Array.isArray(cRes) ? cRes : []);
    setPenalties(Array.isArray(pRes) ? pRes : []);
    setMyCheckin(Array.isArray(cRes) ? cRes.find(c => c.user_id === user.id) || null : null);
    await fetchMembers();
  }, [battle.id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const checkedInIds = new Set(todayCheckins.map(c => c.user_id));
  const missedMembers = members.filter(
    m => m.status === 'active' && !checkedInIds.has(m.user_id) && m.user_id !== user.id,
  );
  const iCheckedIn = checkedInIds.has(user.id);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C47FF" />}
        contentContainerStyle={{paddingBottom: 40}}>

        <View style={styles.header}>
          <Text style={styles.title}>{battle.habit_name}</Text>
          <Text style={styles.sub}>{members.length} members</Text>
          {battle.habit_description ? (
            <Text style={styles.desc}>{battle.habit_description}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Leaderboard</Text>
        {members.map((m, i) => (
          <MemberRow key={m.user_id} member={m} rank={i + 1} />
        ))}

        <Text style={styles.sectionTitle}>Today's Check-in</Text>
        {iCheckedIn ? (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>
              ✅ Checked in — {myCheckin?.ai_score}/100
            </Text>
            {myCheckin?.ai_reasoning ? (
              <Text style={styles.reasoning}>{myCheckin.ai_reasoning}</Text>
            ) : null}
          </View>
        ) : (
          <ProofSubmitter battleId={battle.id} onSuccess={loadData} />
        )}

        {iCheckedIn && missedMembers.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Set Penalties</Text>
            {missedMembers.map(m => (
              <PenaltyAssigner
                key={m.user_id}
                battleId={battle.id}
                missedMember={m}
                onAssigned={loadData}
              />
            ))}
          </>
        )}

        {penalties.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Penalties</Text>
            {penalties.map(p => (
              <View key={p.id} style={styles.penaltyRow}>
                <Text style={styles.penaltyText}>
                  💀 {p.assignee?.username}: {p.penalty_text}
                </Text>
                <Text style={styles.penaltyStatus}>
                  {p.completed ? '✅ done' : '⏳ pending'}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Activity Feed</Text>
        {todayCheckins.map(c => (
          <View key={c.id} style={styles.feedRow}>
            <Text style={styles.feedName}>{c.profiles?.username}</Text>
            <Text style={styles.feedScore}>{c.ai_verified ? '✅' : '❌'} {c.ai_score}/100</Text>
            <Text style={styles.feedReason}>{c.ai_reasoning}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A1A'},
  header: {padding: 20, backgroundColor: '#12122A'},
  title: {color: '#fff', fontSize: 22, fontWeight: '800'},
  sub: {color: '#888', fontSize: 13, marginTop: 4},
  desc: {color: '#aaa', fontSize: 13, marginTop: 8, lineHeight: 18},
  sectionTitle: {
    color: '#A78BFF', fontSize: 13, fontWeight: '700',
    marginTop: 20, marginBottom: 6, marginHorizontal: 16,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  verifiedBadge: {
    margin: 16, backgroundColor: '#0D3320', borderRadius: 12, padding: 14,
  },
  verifiedText: {color: '#4ADE80', fontWeight: '700', fontSize: 16},
  reasoning: {color: '#ccc', fontSize: 13, marginTop: 4},
  penaltyRow: {
    marginHorizontal: 16, marginVertical: 4, backgroundColor: '#1A0A0A',
    borderRadius: 10, padding: 12,
  },
  penaltyText: {color: '#fff', fontSize: 13},
  penaltyStatus: {color: '#888', fontSize: 12, marginTop: 4},
  feedRow: {
    marginHorizontal: 16, marginVertical: 4, backgroundColor: '#12122A',
    borderRadius: 10, padding: 12,
  },
  feedName: {color: '#fff', fontWeight: '700', fontSize: 14},
  feedScore: {color: '#A78BFF', fontSize: 13, marginTop: 2},
  feedReason: {color: '#888', fontSize: 12, marginTop: 2},
});
