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
import {ArcadeBackdrop, ArcadeTopBar, FighterBadge, HardCard, ScreenTitle} from '../components/ArcadeUI';

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
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
      <ScreenTitle subtitle="Challenge a friend to build a habit. Miss a day and they'll know.">
        SELECT YOUR{'\n'}FIRST FIGHT
      </ScreenTitle>

      <HardCard
        borderColor={C.pink}
        shadowColor="rgba(255,45,111,0.30)"
        style={styles.steps}
        innerStyle={{backgroundColor: C.bgSurface}}>
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
      </HardCard>

      <Animated.View style={{transform: [{scale: btnScale}]}}>
        <TouchableOpacity style={styles.onboardingBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.onboardingBtnText}>NEW CHALLENGER ▶</Text>
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
      <ArcadeTopBar center="STREAK FIGHT" right="CPU" />
      <ScreenTitle subtitle={today}>
        SELECT YOUR{'\n'}BATTLE
      </ScreenTitle>
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────
export default function HomeScreen({navigation}) {
  const {user, token} = useAuth();
  const {battles, loading, fetchBattles} = useBattles();
  const [checkinStatus, setCheckinStatus] = useState({});
  const [focusKey, setFocusKey] = useState(0);
  const [publicBattles, setPublicBattles] = useState([]);
  const [joiningId, setJoiningId] = useState(null);

  const fabAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabAnim, {toValue: 1, delay: 400, tension: 200, friction: 12, useNativeDriver: true}).start();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchBattles();
    setFocusKey(k => k + 1);
    fetch(endpoints.discoverBattles, {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(d => setPublicBattles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchBattles, token]));

  async function joinPublicBattle(battleId) {
    if (joiningId) return;
    setJoiningId(battleId);
    try {
      await fetch(endpoints.accept(battleId), {method: 'POST', headers: {Authorization: `Bearer ${token}`}});
      setPublicBattles(prev => prev.filter(b => b.id !== battleId));
      fetchBattles();
    } catch {}
    setJoiningId(null);
  }

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
        <ArcadeBackdrop />
        <ArcadeTopBar center="STREAK FIGHT" right="CPU" />
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
      <ArcadeBackdrop />
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
        ListFooterComponent={publicBattles.length > 0 ? (
          <View style={styles.discoverSection}>
            <Text style={styles.discoverTitle}>DISCOVER BATTLES</Text>
            {publicBattles.map(b => (
              <View key={b.id} style={styles.discoverCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.discoverHabit}>{b.habit_name}</Text>
                  {b.habit_description ? <Text style={styles.discoverDesc}>{b.habit_description}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.discoverJoinBtn, joiningId === b.id && {opacity: 0.5}]}
                  onPress={() => joinPublicBattle(b.id)}
                  disabled={joiningId === b.id}
                  activeOpacity={0.8}>
                  <Text style={styles.discoverJoinText}>{joiningId === b.id ? '...' : 'JOIN'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
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

  header: {paddingBottom: 2},
  title: {
    fontFamily: 'PressStart2P-Regular', fontSize: 16, color: '#FFD400',
    letterSpacing: 2, lineHeight: 28,
    textShadowColor: '#FF2D6F', textShadowRadius: 0,
    textShadowOffset: {width: 2, height: 2},
  },
  dateText: {fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 3, letterSpacing: 0.4, fontFamily: 'Oswald-SemiBold'},

  summaryCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 0, padding: 17,
    borderWidth: 2,
  },
  summaryCardDone: {
    backgroundColor: 'rgba(155,232,12,0.07)',
    borderColor: 'rgba(155,232,12,0.35)',
  },
  summaryCardPending: {
    backgroundColor: C.bgSurface,
    borderColor: 'rgba(25,224,255,0.45)',
  },
  summaryDoneTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#9BE80C', lineHeight: 18},
  summaryDoneSub: {fontSize: 13, color: C.white70, marginTop: 3},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  summaryPendingTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFD400', flex: 1, lineHeight: 17},
  summaryHours: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FF6600', lineHeight: 17},
  summaryTrack: {
    height: 9, backgroundColor: C.white15,
    borderRadius: 0, overflow: 'hidden', marginTop: 11,
  },
  summaryFill: {
    height: 9, borderRadius: 0, backgroundColor: C.purple,
    shadowColor: C.purple, shadowOpacity: 0.8, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  summaryCount: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 7, fontFamily: 'Oswald-SemiBold'},

  onboarding: {flex: 1, paddingTop: 4},
  onboardingIcon: {fontSize: 56, marginBottom: 18},
  onboardingTitle: {fontFamily: 'PressStart2P-Regular', fontSize: 14, color: '#FFD400', letterSpacing: 1, lineHeight: 26,
    textShadowColor: '#FF2D6F', textShadowRadius: 0, textShadowOffset: {width: 2, height: 2}},
  onboardingDesc: {fontSize: 15, color: C.white70, lineHeight: 23, marginTop: 10, marginBottom: 30},
  onlineBadge: {marginLeft: 20, marginBottom: 16},
  steps: {marginHorizontal: 20, marginBottom: 28},
  step: {flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 14},
  stepDivider: {height: 1, backgroundColor: C.white15},
  stepNum: {
    width: 30, height: 30,
    backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    shadowColor: C.pink, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: {width: 0, height: 0},
  },
  stepNumText: {color: '#FFFFFF', fontFamily: 'PressStart2P-Regular', fontSize: 10, lineHeight: 16},
  stepTitle: {fontSize: 15, fontFamily: 'Oswald-Bold', color: '#FFFFFF'},
  stepDesc: {fontSize: 14, color: C.white70, marginTop: 3, lineHeight: 19},
  onboardingBtn: {
    backgroundColor: '#FF2D6F', borderWidth: 3, borderColor: '#fff',
    paddingVertical: 16, alignItems: 'center', marginHorizontal: 20,
    shadowColor: '#AA00FF', shadowOpacity: 0.9, shadowRadius: 0,
    shadowOffset: {width: 5, height: 5},
  },
  onboardingBtnText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 10, letterSpacing: 1, lineHeight: 18},

  discoverSection: {marginHorizontal: 16, marginTop: 8, marginBottom: 8},
  discoverTitle: {
    fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.40)',
    letterSpacing: 2, lineHeight: 14, marginBottom: 10,
  },
  discoverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#160f1e', borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)',
    padding: 14, marginBottom: 8,
  },
  discoverHabit: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFD400', lineHeight: 15},
  discoverDesc: {fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 3, fontFamily: 'Oswald-SemiBold'},
  discoverJoinBtn: {
    backgroundColor: 'rgba(25,224,255,0.15)', borderWidth: 2, borderColor: '#19E0FF',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  discoverJoinText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#19E0FF', lineHeight: 13},

  fab: {
    width: 64, height: 64, borderRadius: 0,
    backgroundColor: C.pink,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.pink, shadowOpacity: 0.9, shadowRadius: 0,
    shadowOffset: {width: 5, height: 5}, elevation: 18,
    borderWidth: 3, borderColor: C.white,
  },
  fabText: {color: '#FFFFFF', fontSize: 30, fontFamily: 'Oswald-Bold', lineHeight: 34},
});
