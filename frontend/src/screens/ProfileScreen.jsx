import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, Animated, Easing,
} from 'react-native';
import {Alert} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

import {C} from '../constants/theme';
import RankBadge from '../components/RankBadge';
import StreakCard from '../components/StreakCard';
import {rankFromStreak} from '../utils/rank';
import {ArcadeBackdrop, ArcadeTopBar, ScreenTitle} from '../components/ArcadeUI';

// Count-up number that animates from 0 to target
function StatNum({value, style}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) {setDisplay(0); return;}
    let cur = 0;
    const step = Math.max(1, Math.ceil(value / 16));
    const t = setInterval(() => {
      cur = Math.min(cur + step, value);
      setDisplay(cur);
      if (cur >= value) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [value]);
  return <Text style={style}>{display}</Text>;
}

// Single stat column with staggered entrance
function StatCol({label, value, delay}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay, tension: 55, friction: 8, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[
      styles.stat,
      {
        opacity: anim,
        transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [12, 0]})}],
      },
    ]}>
      <StatNum value={value} style={styles.statNum} />
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function ProfileScreen({navigation}) {
  const {user, token, logout} = useAuth();

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, all battles, and streaks. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete Forever', style: 'destructive', onPress: async () => {
          try {
            await fetch(endpoints.deleteAccount, {method: 'DELETE', headers: {Authorization: `Bearer ${token}`}});
            logout();
          } catch {
            Alert.alert('Error', 'Could not delete account. Please try again.');
          }
        }},
      ]
    );
  }
  const [profile, setProfile] = useState(null);
  const [isPro, setIsPro] = useState(false);

  // Section entrance animations
  const topAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetch(endpoints.subscriptionStatus, {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => setIsPro(data?.is_pro === true))
      .catch(() => {});

    fetch(endpoints.profile(user.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        // Kick off entrance once data arrives
        Animated.parallel([
          Animated.spring(topAnim, {toValue: 1, tension: 55, friction: 9, useNativeDriver: true}),
          Animated.timing(contentAnim, {
            toValue: 1, duration: 350, delay: 120,
            easing: Easing.out(Easing.cubic), useNativeDriver: true,
          }),
        ]).start();
      })
      .catch(() => {
        Animated.parallel([
          Animated.spring(topAnim, {toValue: 1, tension: 55, friction: 9, useNativeDriver: true}),
          Animated.timing(contentAnim, {toValue: 1, duration: 350, delay: 80, useNativeDriver: true}),
        ]).start();
      });
  }, []);

  const initial = (profile?.username || user?.email || '?')[0].toUpperCase();

  const RANK_LADDER = [
    {name: 'ROOKIE', min: 0, max: 7},
    {name: 'FIGHTER', min: 7, max: 30},
    {name: 'CHAMP', min: 30, max: 50},
    {name: 'MASTER', min: 50, max: 100},
    {name: 'LEGEND', min: 100, max: 200},
    {name: 'GRANDMASTER', min: 200, max: 200},
  ];
  const longestStreak = profile?.longest_streak || 0;
  const currentRungIdx = RANK_LADDER.findIndex((r, i) =>
    longestStreak >= r.min && (i === RANK_LADDER.length - 1 || longestStreak < RANK_LADDER[i + 1].min)
  );
  const currentRung = RANK_LADDER[currentRungIdx] || RANK_LADDER[0];
  const nextRung = RANK_LADDER[currentRungIdx + 1];
  const rankProgress = nextRung
    ? (longestStreak - currentRung.min) / (nextRung.min - currentRung.min)
    : 1;
  const daysToNext = nextRung ? Math.max(0, nextRung.min - longestStreak) : 0;

  const stats = [
    {label: 'Wins', value: profile?.total_wins || 0},
    {label: 'Streak', value: profile?.active_streak || 0},
    {label: 'Battles', value: profile?.battles_count || 0},
    {label: 'Check-ins', value: profile?.total_checkins || 0},
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ArcadeBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <ArcadeTopBar center="PLAYER FILE" right="CPU" />
        <ScreenTitle subtitle={user?.email}>
          FIGHTER{'\n'}PROFILE
        </ScreenTitle>

        <Animated.View style={[
          styles.topSection,
          {
            opacity: topAnim,
            transform: [{translateX: topAnim.interpolate({inputRange: [0, 1], outputRange: [-20, 0]})}],
          },
        ]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.username}>{profile?.username || '—'}</Text>
          <RankBadge rank={rankFromStreak(profile?.longest_streak || 0)} size="lg" />
          {nextRung ? (
            <View style={styles.rankProgress}>
              <View style={styles.rankProgressTrack}>
                <View style={[styles.rankProgressFill, {width: `${Math.round(rankProgress * 100)}%`}]} />
              </View>
              <Text style={styles.rankProgressLabel}>
                {daysToNext} days to {nextRung.name}
              </Text>
            </View>
          ) : (
            <Text style={styles.rankProgressLabel}>GRANDMASTER ♛</Text>
          )}
        </Animated.View>

        <View style={styles.divider} />

        <Animated.Text style={[styles.statsHeading, {opacity: contentAnim}]}>
          {profile?.active_streak > 0 ? `${profile.active_streak} days running` : 'Your stats'}
        </Animated.Text>
        <Animated.View style={[styles.statsRow, {opacity: contentAnim}]}>
          {stats.map((s, i) => (
            <StatCol key={s.label} label={s.label} value={s.value} delay={180 + i * 60} />
          ))}
        </Animated.View>

        <View style={styles.divider} />

        {profile?.active_streak > 0 && (
          <Animated.View style={{opacity: contentAnim}}>
            <StreakCard
              username={profile.username || '—'}
              streak={profile.active_streak}
              rank={rankFromStreak(profile.longest_streak || 0)}
            />
          </Animated.View>
        )}

        <View style={styles.divider} />

        <Animated.Text style={[styles.quote, {opacity: contentAnim}]}>
          {profile?.active_streak > 0
            ? `${profile.active_streak} days in a row. Don't stop now.`
            : 'Start a battle to build your first streak.'}
        </Animated.Text>

      </ScrollView>

      <View style={styles.logoutWrap}>
        {isPro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>♛ PRO FIGHTER</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.goProBtn}
            onPress={() => navigation.navigate('Paywall')}
            activeOpacity={0.85}>
            <Text style={styles.goProText}>♛ GO PRO — UNLIMITED BATTLES</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  content: {paddingBottom: 20},

  topSection: {paddingTop: 6, paddingHorizontal: 20},
  avatar: {
    width: 72, height: 72,
    backgroundColor: 'rgba(255,45,111,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FF2D6F',
    shadowColor: '#FF2D6F', shadowOpacity: 0.55,
    shadowRadius: 18, shadowOffset: {width: 0, height: 0},
  },
  avatarText: {color: '#FF2D6F', fontFamily: 'PressStart2P-Regular', fontSize: 18, lineHeight: 24},
  username: {
    fontFamily: 'PressStart2P-Regular', fontSize: 13, color: '#FFD400', marginTop: 14,
    letterSpacing: 1, lineHeight: 22,
    textShadowColor: '#FF6600', textShadowRadius: 0, textShadowOffset: {width: 2, height: 2},
  },
  email: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 4, fontFamily: 'Oswald-SemiBold'},

  rankProgress: {marginTop: 10, width: '100%'},
  rankProgressTrack: {height: 6, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden'},
  rankProgressFill: {height: 6, backgroundColor: C.yellow},
  rankProgressLabel: {
    fontFamily: 'PressStart2P-Regular', fontSize: 7, color: C.white70,
    letterSpacing: 1, lineHeight: 13, marginTop: 5,
  },
  divider: {height: 2, backgroundColor: 'rgba(255,255,255,0.13)', marginHorizontal: 20, marginVertical: 20},

  statsRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20},
  stat: {},
  statNum: {
    fontFamily: 'PressStart2P-Regular', fontSize: 18, color: '#FFD400', lineHeight: 28,
    textShadowColor: '#FF2D6F', textShadowRadius: 0,
    textShadowOffset: {width: 2, height: 2},
  },
  statLabel: {fontFamily: 'PressStart2P-Regular', fontSize: 7, color: 'rgba(255,255,255,0.70)', marginTop: 6, letterSpacing: 1, lineHeight: 12},

  quote: {
    fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.50)',
    lineHeight: 22, paddingHorizontal: 20, marginBottom: 8, fontFamily: 'Oswald-SemiBold',
  },

  logoutWrap: {paddingHorizontal: 20, paddingVertical: 8},
  goProBtn: {
    backgroundColor: C.yellow, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 16, alignItems: 'center', marginBottom: 10,
    shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
  },
  goProText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 8, letterSpacing: 1, lineHeight: 14},
  proBadge: {
    borderWidth: 2, borderColor: C.yellow, paddingVertical: 12,
    alignItems: 'center', marginBottom: 10,
    backgroundColor: 'rgba(255,212,0,0.08)',
  },
  proBadgeText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: C.yellow, letterSpacing: 1, lineHeight: 14},
  logoutBtn: {paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)', marginTop: 8},
  logoutText: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: 'rgba(255,255,255,0.50)', letterSpacing: 1, lineHeight: 16},
  statsHeading: {
    fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.50)',
    textTransform: 'uppercase', letterSpacing: 2, lineHeight: 14,
    paddingHorizontal: 20, marginBottom: 10,
  },
});
