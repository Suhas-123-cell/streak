import React, {useEffect, useState, useCallback} from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useBattles} from '../hooks/useBattles';
import {useMembers} from '../hooks/useMembers';
import BattleCard from '../components/BattleCard';
import {endpoints} from '../constants/api';

const BG = '#F8F7F4';
const ACCENT = '#7C3AED';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const BORDER = '#E7E5E4';
const SUCCESS = '#16A34A';
const PENDING = '#EA580C';

function BattleItem({battle, onPress, token, userId, onCheckinStatus}) {
  const {members} = useMembers(battle.id);
  const [checkedIn, setCheckedIn] = useState(false);
  const me = members.find(m => m.user_id === userId);

  useEffect(() => {
    fetch(endpoints.todayCheckins(battle.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        const status = Array.isArray(data) && data.some(c => c.user_id === userId);
        setCheckedIn(status);
        onCheckinStatus?.(battle.id, status);
      })
      .catch(() => {});
  }, [battle.id, token, userId]);

  return (
    <BattleCard
      battle={battle}
      members={members}
      myStreak={me?.current_streak || 0}
      checkedIn={checkedIn}
      onPress={() => onPress(battle)}
    />
  );
}

function HoursLeft() {
  const now = new Date();
  const hoursLeft = 23 - now.getHours();
  return hoursLeft;
}

function DailySummary({total, done, onCreatePress}) {
  const pending = total - done;

  if (total === 0) return null;

  if (pending === 0) {
    return (
      <View style={[styles.summaryCard, styles.summaryDone]}>
        <Text style={styles.summaryDoneTitle}>All done for today ✓</Text>
        <Text style={styles.summaryDoneSub}>You showed up. Come back tomorrow.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.summaryCard, styles.summaryPending]}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryPendingTitle}>
          {pending} battle{pending !== 1 ? 's' : ''} need{pending === 1 ? 's' : ''} proof
        </Text>
        <Text style={styles.summaryHours}>{HoursLeft()}h left</Text>
      </View>
      <View style={styles.summaryTrack}>
        <View style={[styles.summaryFill, {width: `${(done / total) * 100}%`}]} />
      </View>
      <Text style={styles.summaryCount}>{done} of {total} done today</Text>
    </View>
  );
}

function OnboardingEmpty({onPress}) {
  return (
    <View style={styles.onboarding}>
      <Text style={styles.onboardingTitle}>No battles yet.</Text>
      <Text style={styles.onboardingDesc}>
        Challenge a friend to build a habit together.{'\n'}Miss a day and they'll know.
      </Text>

      <View style={styles.steps}>
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pick a habit</Text>
            <Text style={styles.stepDesc}>Gym, reading, running — anything daily</Text>
          </View>
        </View>
        <View style={styles.stepDivider} />
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Invite your people</Text>
            <Text style={styles.stepDesc}>They'll hold you accountable, and vice versa</Text>
          </View>
        </View>
        <View style={styles.stepDivider} />
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prove it daily</Text>
            <Text style={styles.stepDesc}>Photo proof — AI verifies it's real</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.onboardingBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.onboardingBtnText}>Start your first battle</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen({navigation}) {
  const {user, token} = useAuth();
  const {battles, loading, fetchBattles} = useBattles();
  const [checkinStatus, setCheckinStatus] = useState({});

  const handleCheckinStatus = useCallback((battleId, status) => {
    setCheckinStatus(prev => ({...prev, [battleId]: status}));
  }, []);

  const doneCount = battles.filter(b => checkinStatus[b.id] === true).length;
  const pendingCount = battles.filter(b => checkinStatus[b.id] === false).length;

  // Sort: pending battles first, done after
  const sortedBattles = [...battles].sort((a, b) => {
    const aStatus = checkinStatus[a.id];
    const bStatus = checkinStatus[b.id];
    if (aStatus === false && bStatus !== false) return -1;
    if (bStatus === false && aStatus !== false) return 1;
    return 0;
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Battles</Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>
      <DailySummary
        total={battles.length}
        done={doneCount}
        onCreatePress={() => navigation.navigate('NewBattle')}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      {battles.length === 0 && !loading ? (
        <View style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.title}>Battles</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          <OnboardingEmpty onPress={() => navigation.navigate('NewBattle')} />
        </View>
      ) : (
        <FlatList
          data={sortedBattles}
          keyExtractor={b => b.id}
          renderItem={({item}) => (
            <BattleItem
              battle={item}
              token={token}
              userId={user.id}
              onCheckinStatus={handleCheckinStatus}
              onPress={b => navigation.navigate('BattleDetail', {battle: b})}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchBattles} tintColor={ACCENT} />
          }
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{paddingBottom: 110}}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewBattle')}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},

  header: {paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16},
  title: {fontSize: 28, fontWeight: '800', color: TEXT_1},
  dateText: {fontSize: 13, color: TEXT_2, marginTop: 2},

  summaryCard: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 16,
  },
  summaryDone: {backgroundColor: '#F0FDF4'},
  summaryPending: {backgroundColor: '#FEF3E2'},

  summaryDoneTitle: {fontSize: 15, fontWeight: '700', color: SUCCESS},
  summaryDoneSub: {fontSize: 13, color: '#166534', marginTop: 2},

  summaryTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryPendingTitle: {fontSize: 15, fontWeight: '700', color: '#92400E', flex: 1},
  summaryHours: {fontSize: 12, fontWeight: '600', color: PENDING},
  summaryTrack: {
    height: 4, backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2, overflow: 'hidden', marginTop: 10,
  },
  summaryFill: {height: 4, borderRadius: 2, backgroundColor: PENDING},
  summaryCount: {fontSize: 12, color: '#B45309', marginTop: 6},

  // Onboarding empty state
  onboarding: {paddingHorizontal: 24, paddingTop: 24, flex: 1},
  onboardingTitle: {fontSize: 22, fontWeight: '700', color: TEXT_1},
  onboardingDesc: {fontSize: 15, color: TEXT_2, lineHeight: 22, marginTop: 8, marginBottom: 32},

  steps: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    overflow: 'hidden', marginBottom: 28,
  },
  step: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 14, backgroundColor: '#fff',
  },
  stepDivider: {height: 1, backgroundColor: BORDER},
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {color: '#fff', fontWeight: '700', fontSize: 13},
  stepContent: {flex: 1},
  stepTitle: {fontSize: 15, fontWeight: '600', color: TEXT_1},
  stepDesc: {fontSize: 13, color: TEXT_2, marginTop: 2, lineHeight: 18},

  onboardingBtn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  onboardingBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 8,
  },
  fabText: {color: '#fff', fontSize: 26, fontWeight: '400', lineHeight: 30},
});
