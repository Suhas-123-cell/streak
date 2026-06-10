import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, StatusBar,
  Animated, Easing,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import {useBattles} from '../hooks/useBattles';
import {useMembers} from '../hooks/useMembers';
import BattleCard from '../components/BattleCard';
import {endpoints} from '../constants/api';

import {C} from '../constants/theme';

const BG     = C.bg;
const ACCENT = C.cyan;
const TEXT_1 = C.white;
const TEXT_2 = C.white70;
const BORDER = C.white15;
const SUCCESS = C.green;
const PENDING = C.orange;

function BattleItem({battle, onPress, token, userId, onCheckinStatus, index, refreshKey}) {
  const {members, fetchMembers} = useMembers(battle.id);
  const [checkedIn, setCheckedIn] = useState(false);
  const me = members.find(m => m.user_id === userId);

  useEffect(() => {
    if (refreshKey === 0) return; // initial fetch handled by useMembers internally
    fetchMembers();
  }, [refreshKey]);

  useEffect(() => {
    fetch(endpoints.todayCheckins(battle.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        const status = Array.isArray(data) && data.some(c => c.user_id === userId);
        setCheckedIn(status);
        onCheckinStatus?.(battle.id, status);
      })
      .catch(() => {});
  }, [battle.id, token, userId, refreshKey]);

  return (
    <BattleCard
      battle={battle}
      members={members}
      myStreak={me?.current_streak || 0}
      checkedIn={checkedIn}
      onPress={() => onPress(battle)}
      index={index}
    />
  );
}

// ── Animated summary bar ─────────────────────────────────────────
function DailySummary({total, done}) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-16)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {toValue: 0, tension: 60, friction: 8, useNativeDriver: true}),
      Animated.timing(opacityAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
      Animated.timing(progressAnim, {
        toValue: total > 0 ? done / total : 0,
        duration: 700, delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [done, total]);

  if (total === 0) return null;

  const pending = total - done;
  const isDone = pending === 0;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[
      styles.summaryCard,
      isDone ? styles.summaryCardDone : styles.summaryCardPending,
      {opacity: opacityAnim, transform: [{translateY: slideAnim}]},
    ]}>
      {isDone ? (
        <>
          <Text style={styles.summaryDoneTitle}>All done for today ✓</Text>
          <Text style={styles.summaryDoneSub}>You showed up. Come back tomorrow.</Text>
        </>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPendingTitle}>
              {pending} battle{pending !== 1 ? 's' : ''} waiting on proof
            </Text>
            <Text style={styles.summaryHours}>{23 - new Date().getHours()}h left</Text>
          </View>
          <View style={styles.summaryTrack}>
            <Animated.View style={[styles.summaryFill, {width: progressWidth}]} />
          </View>
          <Text style={styles.summaryCount}>{done} of {total} done today</Text>
        </>
      )}
    </Animated.View>
  );
}

// ── Step row with own animation ──────────────────────────────────
function StepRow({num, title, desc, delay, showDivider}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay, tension: 60, friction: 8, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <>
      <Animated.View style={[
        styles.step,
        {
          opacity: anim,
          transform: [{translateX: anim.interpolate({inputRange: [0, 1], outputRange: [-14, 0]})}],
        },
      ]}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{num}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepDesc}>{desc}</Text>
        </View>
      </Animated.View>
      {showDivider && <View style={styles.stepDivider} />}
    </>
  );
}

// ── Animated onboarding empty state ──────────────────────────────
function OnboardingEmpty({onPress}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {toValue: -7, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(floatAnim, {toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ])
    ).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnScale, {toValue: 1.035, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(btnScale, {toValue: 1, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const steps = [
    {num: '1', title: 'Pick a habit', desc: 'Gym, reading, running — anything daily'},
    {num: '2', title: 'Invite your people', desc: "They'll keep you honest, and vice versa"},
    {num: '3', title: 'Prove it daily', desc: "Photo proof — AI verifies it's real"},
  ];

  return (
    <View style={styles.onboarding}>
      <Animated.Text style={[styles.onboardingIcon, {transform: [{translateY: floatAnim}]}]}>
        ⚔️
      </Animated.Text>
      <Text style={styles.onboardingTitle}>No battles yet.</Text>
      <Text style={styles.onboardingDesc}>
        Challenge a friend to build a habit.{'\n'}Miss a day and they'll know.
      </Text>

      <View style={styles.steps}>
        {steps.map((s, i) => (
          <StepRow
            key={s.num}
            num={s.num}
            title={s.title}
            desc={s.desc}
            delay={200 + i * 120}
            showDivider={i < steps.length - 1}
          />
        ))}
      </View>

      <Animated.View style={{transform: [{scale: btnScale}]}}>
        <TouchableOpacity style={styles.onboardingBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.onboardingBtnText}>Start your first battle →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Animated header ───────────────────────────────────────────────
function AnimatedHeader() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {toValue: 1, duration: 350, useNativeDriver: true}).start();
  }, []);
  const today = new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'short', day: 'numeric'});
  return (
    <Animated.View style={[
      styles.header,
      {opacity: anim, transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [-10, 0]})}]},
    ]}>
      <Text style={styles.title}>Battles</Text>
      <Text style={styles.dateText}>{today}</Text>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────
export default function HomeScreen({navigation}) {
  const {user, token} = useAuth();
  const {battles, loading, fetchBattles} = useBattles();
  const [checkinStatus, setCheckinStatus] = useState({});
  const [focusKey, setFocusKey] = useState(0);

  useFocusEffect(useCallback(() => {
    fetchBattles();
    setFocusKey(k => k + 1);
  }, [fetchBattles]));

  const handleCheckinStatus = useCallback((battleId, status) => {
    setCheckinStatus(prev => ({...prev, [battleId]: status}));
  }, []);

  const handleRefresh = useCallback(() => {
    fetchBattles();
    setFocusKey(k => k + 1);
  }, [fetchBattles]);

  const doneCount = battles.filter(b => checkinStatus[b.id] === true).length;

  const sortedBattles = [...battles].sort((a, b) => {
    const aP = checkinStatus[a.id] === false;
    const bP = checkinStatus[b.id] === false;
    if (aP && !bP) return -1;
    if (bP && !aP) return 1;
    return 0;
  });

  const ListHeader = (
    <View>
      <AnimatedHeader />
      <DailySummary total={battles.length} done={doneCount} />
    </View>
  );

  if (!loading && battles.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
        <AnimatedHeader />
        <OnboardingEmpty onPress={() => navigation.navigate('NewBattle')} />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('NewBattle')}
          activeOpacity={0.85}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <FlatList
        data={sortedBattles}
        keyExtractor={b => b.id}
        renderItem={({item, index}) => (
          <BattleItem
            battle={item}
            token={token}
            userId={user.id}
            onCheckinStatus={handleCheckinStatus}
            onPress={b => navigation.navigate('BattleDetail', {battle: b})}
            index={index}
            refreshKey={focusKey}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={ACCENT} />
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{paddingBottom: 110}}
      />
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
  title: {
    fontSize: 28, fontWeight: '900', color: C.yellow,
    letterSpacing: 1,
    textShadowColor: C.cyan, textShadowRadius: 6,
    textShadowOffset: {width: 1, height: 1},
  },
  dateText: {fontSize: 13, color: TEXT_2, marginTop: 2, letterSpacing: 0.3},

  summaryCard: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16,
    borderWidth: 1,
  },
  summaryCardDone: {
    backgroundColor: 'rgba(57,255,20,0.08)',
    borderColor: 'rgba(57,255,20,0.3)',
  },
  summaryCardPending: {
    backgroundColor: 'rgba(255,140,66,0.08)',
    borderColor: 'rgba(255,140,66,0.3)',
  },
  summaryDoneTitle: {fontSize: 15, fontWeight: '700', color: SUCCESS},
  summaryDoneSub: {fontSize: 13, color: C.white70, marginTop: 2},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryPendingTitle: {fontSize: 15, fontWeight: '700', color: C.orange, flex: 1},
  summaryHours: {fontSize: 12, fontWeight: '600', color: PENDING},
  summaryTrack: {
    height: 4, backgroundColor: C.white15,
    borderRadius: 2, overflow: 'hidden', marginTop: 10,
  },
  summaryFill: {height: 4, borderRadius: 2, backgroundColor: PENDING},
  summaryCount: {fontSize: 12, color: C.white40, marginTop: 6},

  onboarding: {flex: 1, paddingHorizontal: 24, paddingTop: 8},
  onboardingIcon: {fontSize: 48, marginBottom: 16},
  onboardingTitle: {fontSize: 22, fontWeight: '800', color: C.yellow, letterSpacing: 0.5},
  onboardingDesc: {fontSize: 15, color: TEXT_2, lineHeight: 22, marginTop: 8, marginBottom: 28},
  steps: {
    borderWidth: 1, borderColor: C.white15, borderRadius: 14,
    overflow: 'hidden', marginBottom: 28, backgroundColor: C.card,
  },
  step: {flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14},
  stepDivider: {height: 1, backgroundColor: C.white15},
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {color: C.bgDeep, fontWeight: '900', fontSize: 13},
  stepTitle: {fontSize: 15, fontWeight: '700', color: TEXT_1},
  stepDesc: {fontSize: 13, color: TEXT_2, marginTop: 2, lineHeight: 18},
  onboardingBtn: {
    backgroundColor: C.yellow, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.yellow, shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: {width: 0, height: 4}, elevation: 6,
  },
  onboardingBtnText: {color: C.bgDeep, fontWeight: '900', fontSize: 15, letterSpacing: 0.8},

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.yellow,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.yellow, shadowOpacity: 0.5, shadowRadius: 16,
    shadowOffset: {width: 0, height: 4}, elevation: 10,
  },
  fabText: {color: C.bgDeep, fontSize: 26, fontWeight: '900', lineHeight: 30},
});
