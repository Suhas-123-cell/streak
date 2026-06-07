import React, {useRef, useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';

const ACCENT = '#7C3AED';
const SUCCESS = '#16A34A';
const PENDING = '#EA580C';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const TEXT_3 = '#A8A29E';
const BORDER = '#E7E5E4';

function MemberDot({member, isCheckedIn, delay}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay,
      tension: 70,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  const initial = (member.profiles?.username || '?')[0].toUpperCase();

  return (
    <Animated.View style={[
      styles.dot,
      isCheckedIn ? styles.dotDone : styles.dotPending,
      {
        opacity: anim.interpolate({inputRange: [0, 1], outputRange: [0, isCheckedIn ? 1 : 0.38]}),
        transform: [{scale: anim.interpolate({inputRange: [0, 1], outputRange: [0.5, 1]})}],
      },
    ]}>
      <Text style={[styles.dotText, isCheckedIn ? styles.dotTextDone : styles.dotTextPending]}>
        {initial}
      </Text>
      {isCheckedIn && <View style={styles.dotCheck} />}
    </Animated.View>
  );
}

function hoursLeft() {
  return 23 - new Date().getHours();
}

export default function BattleCard({battle, members, myStreak, checkedIn, onPress, index = 0}) {
  const sorted = [...members].sort((a, b) => b.current_streak - a.current_streak);
  const top3 = sorted.slice(0, 3);
  const checkedInCount = members.filter(m => m.checked_in_today).length;
  const pct = members.length ? checkedInCount / members.length : 0;
  const hrs = hoursLeft();

  // ─── Count-up streak ────────────────────────────────────────────
  const [displayStreak, setDisplayStreak] = useState(0);
  useEffect(() => {
    if (myStreak === 0) {setDisplayStreak(0); return;}
    let cur = 0;
    const step = Math.max(1, Math.ceil(myStreak / 14));
    const t = setInterval(() => {
      cur = Math.min(cur + step, myStreak);
      setDisplayStreak(cur);
      if (cur >= myStreak) clearInterval(t);
    }, 35);
    return () => clearInterval(t);
  }, [myStreak]);

  // ─── Card entrance (staggered) ───────────────────────────────────
  const enterY = useRef(new Animated.Value(28)).current;
  const enterOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = index * 90;
    Animated.parallel([
      Animated.spring(enterY, {
        toValue: 0, delay, tension: 55, friction: 8, useNativeDriver: true,
      }),
      Animated.timing(enterOp, {
        toValue: 1, duration: 260, delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Animated progress bar fill ─────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 750,
      delay: index * 90 + 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // ─── Pending CTA pulse ──────────────────────────────────────────
  const btnScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (checkedIn) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnScale, {toValue: 1.028, duration: 850, useNativeDriver: true, easing: Easing.inOut(Easing.sin)}),
        Animated.timing(btnScale, {toValue: 1, duration: 850, useNativeDriver: true, easing: Easing.inOut(Easing.sin)}),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [checkedIn]);

  // ─── Press feedback ─────────────────────────────────────────────
  const cardScale = useRef(new Animated.Value(1)).current;
  function pressIn() {
    Animated.spring(cardScale, {toValue: 0.974, useNativeDriver: true, tension: 280, friction: 10}).start();
  }
  function pressOut() {
    Animated.spring(cardScale, {toValue: 1, useNativeDriver: true, tension: 280, friction: 10}).start();
  }

  function streakLine() {
    if (checkedIn) return `🔥 ${displayStreak} day streak`;
    if (myStreak > 0) return `${displayStreak} days — don't break it`;
    return 'Start your streak today';
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });
  const fillColor = pct === 1 ? SUCCESS : checkedIn ? SUCCESS : ACCENT;

  return (
    <Animated.View style={[
      styles.wrap,
      {opacity: enterOp, transform: [{translateY: enterY}, {scale: cardScale}]},
    ]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{flex: 1, marginRight: 10}}>
            <Text style={styles.habitName}>{battle.habit_name}</Text>
            <Text style={styles.meta}>
              {members.length} members
              {!checkedIn && hrs <= 12 && (
                <Text style={styles.urgency}> · {hrs}h left</Text>
              )}
            </Text>
          </View>
          {checkedIn
            ? <View style={styles.tagDone}><Text style={styles.tagDoneText}>done ✓</Text></View>
            : <View style={styles.tagPending}><Text style={styles.tagPendingText}>pending</Text></View>
          }
        </View>

        {/* ── Member dots ── */}
        {members.length > 0 && (
          <View style={styles.dotsRow}>
            {members.slice(0, 8).map((m, i) => (
              <MemberDot
                key={m.user_id}
                member={m}
                isCheckedIn={m.checked_in_today}
                delay={index * 90 + 100 + i * 45}
              />
            ))}
            {members.length > 8 && (
              <View style={[styles.dot, styles.dotOverflow]}>
                <Text style={styles.dotOverflowText}>+{members.length - 8}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Streak + count ── */}
        <View style={styles.statsRow}>
          <Text style={[
            styles.streakLine,
            {color: checkedIn ? TEXT_1 : myStreak > 0 ? PENDING : TEXT_2},
          ]}>
            {streakLine()}
          </Text>
          <Text style={styles.countText}>{checkedInCount}/{members.length}</Text>
        </View>

        {/* ── Animated progress bar ── */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, {width: progressWidth, backgroundColor: fillColor}]} />
        </View>
        <Text style={styles.trackLabel}>
          {checkedInCount === members.length && members.length > 0
            ? 'Everyone's in today ✓'
            : `${checkedInCount} of ${members.length} checked in`}
        </Text>

        {/* ── Mini leaderboard ── */}
        {top3.length > 0 && (
          <View style={styles.leaderboard}>
            {top3.map((m, i) => (
              <View key={m.user_id} style={styles.lbRow}>
                <Text style={styles.medal}>{['🥇','🥈','🥉'][i]}</Text>
                <Text style={styles.lbName} numberOfLines={1}>{m.profiles?.username}</Text>
                <Text style={styles.lbStreak}>🔥 {m.current_streak}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Pulsing submit button ── */}
        {!checkedIn && (
          <Animated.View style={{transform: [{scale: btnScale}], marginTop: 14}}>
            <TouchableOpacity style={styles.submitBtn} onPress={onPress} activeOpacity={0.82}>
              <Text style={styles.submitText}>Submit proof →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginHorizontal: 16, marginVertical: 6},
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#1C1917',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  habitName: {fontSize: 17, fontWeight: '700', color: TEXT_1, lineHeight: 22},
  meta: {fontSize: 13, color: TEXT_2, marginTop: 2},
  urgency: {color: PENDING, fontWeight: '600'},

  tagDone: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagDoneText: {fontSize: 12, fontWeight: '600', color: SUCCESS},
  tagPending: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagPendingText: {fontSize: 12, fontWeight: '500', color: '#92400E'},

  dotsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14},
  dot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: {backgroundColor: '#EDE9FE', borderWidth: 2, borderColor: ACCENT},
  dotPending: {backgroundColor: '#F5F5F4', borderWidth: 1, borderColor: BORDER},
  dotText: {fontSize: 12, fontWeight: '700'},
  dotTextDone: {color: ACCENT},
  dotTextPending: {color: TEXT_3},
  dotCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: SUCCESS, borderWidth: 1.5, borderColor: '#fff',
  },
  dotOverflow: {backgroundColor: '#F5F5F4'},
  dotOverflowText: {fontSize: 10, fontWeight: '600', color: TEXT_3},

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14,
  },
  streakLine: {fontSize: 14, fontWeight: '600', flex: 1},
  countText: {fontSize: 14, fontWeight: '700', color: TEXT_1, marginLeft: 8},

  track: {
    height: 5, backgroundColor: '#F3F4F6',
    borderRadius: 3, overflow: 'hidden', marginTop: 8,
  },
  fill: {height: 5, borderRadius: 3},
  trackLabel: {fontSize: 12, color: TEXT_2, marginTop: 5},

  leaderboard: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: BORDER, gap: 8,
  },
  lbRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  medal: {fontSize: 16, width: 24},
  lbName: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  lbStreak: {fontSize: 13, color: TEXT_2},

  submitBtn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  submitText: {color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.2},
});
