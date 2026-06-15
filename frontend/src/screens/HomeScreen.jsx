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

// Ambient background orbs — simulates gradient mesh depth
function AmbientBg() {
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (val, dur, delay) => Animated.loop(
      Animated.sequence([
        Animated.timing(val, {toValue: -18, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(val, {toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ])
    ).start();
    loop(orb1, 4500, 0);
    loop(orb2, 5800, 800);
    loop(orb3, 3900, 400);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{position: 'absolute', width: 280, height: 280, borderRadius: 140,
        backgroundColor: 'rgba(170,0,255,0.1)', top: -100, left: -80, transform: [{translateY: orb1}]}} />
      <Animated.View style={{position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,0,112,0.08)', top: 200, right: -60, transform: [{translateY: orb2}]}} />
      <Animated.View style={{position: 'absolute', width: 160, height: 160, borderRadius: 80,
        backgroundColor: 'rgba(0,229,255,0.06)', bottom: 120, left: -30, transform: [{translateY: orb3}]}} />
    </View>
  );
}

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

  const fabAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabAnim, {toValue: 1, delay: 400, tension: 200, friction: 12, useNativeDriver: true}).start();
  }, []);

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
        <AmbientBg />
        <AnimatedHeader />
        <OnboardingEmpty onPress={() => navigation.navigate('NewBattle')} />
        <Animated.View style={{
          position: 'absolute', bottom: 28, right: 24,
          opacity: fabAnim,
          transform: [{scale: fabAnim}, {translateY: fabAnim.interpolate({inputRange: [0,1], outputRange: [20, 0]})}],
        }}>
          <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewBattle')} activeOpacity={0.85}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <AmbientBg />
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
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={C.cyan} />
        }
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{paddingBottom: 110}}
      />
      <Animated.View style={{
        position: 'absolute', bottom: 28, right: 24,
        opacity: fabAnim,
        transform: [{scale: fabAnim}, {translateY: fabAnim.interpolate({inputRange: [0,1], outputRange: [20, 0]})}],
      }}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewBattle')} activeOpacity={0.85}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},

  header: {paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16},
  title: {
    fontSize: 38, fontWeight: '900', color: C.yellow,
    letterSpacing: 2,
    textShadowColor: C.pink, textShadowRadius: 14,
    textShadowOffset: {width: 0, height: 0},
  },
  dateText: {fontSize: 13, color: C.white40, marginTop: 3, letterSpacing: 0.4, fontWeight: '600'},

  summaryCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 17,
    borderWidth: 1.5,
  },
  summaryCardDone: {
    backgroundColor: 'rgba(0,255,138,0.07)',
    borderColor: 'rgba(0,255,138,0.35)',
    shadowColor: C.green, shadowOpacity: 0.2, shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
  },
  summaryCardPending: {
    backgroundColor: 'rgba(170,0,255,0.07)',
    borderColor: 'rgba(170,0,255,0.3)',
    shadowColor: C.purple, shadowOpacity: 0.2, shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
  },
  summaryDoneTitle: {fontSize: 15, fontWeight: '800', color: C.lime},
  summaryDoneSub: {fontSize: 13, color: C.white70, marginTop: 3},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryPendingTitle: {fontSize: 15, fontWeight: '800', color: C.yellow, flex: 1},
  summaryHours: {fontSize: 14, fontWeight: '700', color: C.orange},
  summaryTrack: {
    height: 9, backgroundColor: C.white15,
    borderRadius: 5, overflow: 'hidden', marginTop: 11,
  },
  summaryFill: {
    height: 9, borderRadius: 5, backgroundColor: C.purple,
    shadowColor: C.purple, shadowOpacity: 0.8, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  summaryCount: {fontSize: 13, color: C.white40, marginTop: 7, fontWeight: '600'},

  onboarding: {flex: 1, paddingHorizontal: 24, paddingTop: 8},
  onboardingIcon: {fontSize: 56, marginBottom: 18},
  onboardingTitle: {fontSize: 26, fontWeight: '900', color: C.yellow, letterSpacing: 0.8,
    textShadowColor: C.pink, textShadowRadius: 12, textShadowOffset: {width: 0, height: 0}},
  onboardingDesc: {fontSize: 15, color: C.white70, lineHeight: 23, marginTop: 10, marginBottom: 30},
  steps: {
    borderWidth: 1.5, borderColor: 'rgba(170,0,255,0.25)', borderRadius: 20,
    overflow: 'hidden', marginBottom: 30, backgroundColor: 'rgba(170,0,255,0.06)',
  },
  step: {flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 14},
  stepDivider: {height: 1, backgroundColor: C.white15},
  stepNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    shadowColor: C.pink, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: {width: 0, height: 0},
  },
  stepNumText: {color: C.white, fontWeight: '900', fontSize: 13},
  stepTitle: {fontSize: 15, fontWeight: '800', color: C.white},
  stepDesc: {fontSize: 14, color: C.white70, marginTop: 3, lineHeight: 19},
  onboardingBtn: {
    backgroundColor: C.pink, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.6, shadowRadius: 22,
    shadowOffset: {width: 0, height: 6}, elevation: 12,
  },
  onboardingBtnText: {color: C.white, fontWeight: '900', fontSize: 16, letterSpacing: 1.2},

  fab: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.pink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.pink, shadowOpacity: 0.75, shadowRadius: 28,
    shadowOffset: {width: 0, height: 6}, elevation: 18,
    borderWidth: 2, borderColor: 'rgba(255,0,112,0.4)',
  },
  fabText: {color: C.white, fontSize: 30, fontWeight: '900', lineHeight: 34},
});
