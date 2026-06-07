import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar, Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const BG = '#F8F7F4';
const ACCENT = '#7C3AED';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const BORDER = '#E7E5E4';

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

export default function ProfileScreen() {
  const {user, token, logout} = useAuth();
  const [profile, setProfile] = useState(null);

  // Section entrance animations
  const topAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const stats = [
    {label: 'Wins', value: profile?.total_wins || 0},
    {label: 'Streak', value: profile?.active_streak || 0},
    {label: 'Battles', value: profile?.battles_count || 0},
    {label: 'Check-ins', value: profile?.total_checkins || 0},
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView contentContainerStyle={styles.content}>

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
          <Text style={styles.email}>{user?.email}</Text>
        </Animated.View>

        <View style={styles.divider} />

        <Animated.View style={[styles.statsRow, {opacity: contentAnim}]}>
          {stats.map((s, i) => (
            <StatCol key={s.label} label={s.label} value={s.value} delay={180 + i * 60} />
          ))}
        </Animated.View>

        <View style={styles.divider} />

        <Animated.Text style={[styles.quote, {opacity: contentAnim}]}>
          Every check-in is a vote for who you want to be.
        </Animated.Text>

      </ScrollView>

      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},
  content: {paddingBottom: 20},

  topSection: {paddingTop: 32, paddingHorizontal: 20},
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontSize: 28, fontWeight: '800'},
  username: {fontSize: 22, fontWeight: '800', color: TEXT_1, marginTop: 12},
  email: {fontSize: 13, color: TEXT_2, marginTop: 2},

  divider: {height: 1, backgroundColor: BORDER, marginHorizontal: 20, marginVertical: 20},

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  stat: {},
  statNum: {fontSize: 24, fontWeight: '800', color: TEXT_1},
  statLabel: {fontSize: 11, color: TEXT_2, marginTop: 2},

  quote: {
    fontSize: 14, fontStyle: 'italic', color: TEXT_2,
    lineHeight: 20, paddingHorizontal: 20, marginBottom: 8,
  },

  logoutWrap: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  logoutBtn: {
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  logoutText: {color: '#DC2626', fontWeight: '600', fontSize: 15},
});
