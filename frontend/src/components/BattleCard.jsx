import React, {useRef, useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';

import {C} from '../constants/theme';

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
    Animated.sequence([
      Animated.timing(btnScale, {toValue: 1.04, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(btnScale, {toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ]).start();
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
  const fillColor = pct === 1 ? C.green : checkedIn ? C.green : C.cyan;

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
            <Text style={[styles.habitName, !checkedIn && hrs <= 3 && {color: C.pink}]}>{battle.habit_name}</Text>
            <Text style={styles.meta}>
              {members.length} members
              {!checkedIn && hrs <= 12 && (
                <Text style={[styles.urgency, {color: hrs <= 3 ? C.pink : C.orange}]}> · {hrs}h left</Text>
              )}
            </Text>
          </View>
          {checkedIn
            ? <View style={styles.tagDone}><Text style={styles.tagDoneText}>done ✓</Text></View>
            : <View style={[styles.tagPending, hrs <= 3 && styles.tagCritical]}>
                <Text style={[styles.tagPendingText, hrs <= 3 && {color: C.pink}]}>
                  {hrs <= 3 ? '⚠ urgent' : 'pending'}
                </Text>
              </View>
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
            {color: checkedIn ? C.white : myStreak > 0 ? C.orange : C.white70},
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
            ? "Everyone's in today ✓"
            : `${checkedInCount} of ${members.length} checked in`}
        </Text>

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
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    shadowColor: C.cyan,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  habitName: {fontSize: 22, fontWeight: '800', color: C.white, lineHeight: 26, letterSpacing: 0.2},
  meta: {fontSize: 14, color: C.white70, marginTop: 2},
  urgency: {fontWeight: '700'},

  tagDone: {
    backgroundColor: 'rgba(57,255,20,0.12)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(57,255,20,0.4)',
  },
  tagDoneText: {fontSize: 12, fontWeight: '700', color: C.green},
  tagPending: {
    backgroundColor: 'rgba(255,140,66,0.12)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,140,66,0.4)',
  },
  tagCritical: {
    backgroundColor: 'rgba(255,56,100,0.12)',
    borderColor: 'rgba(255,56,100,0.4)',
  },
  tagPendingText: {fontSize: 12, fontWeight: '700', color: C.orange},

  dotsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14},
  dot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: {backgroundColor: 'rgba(78,201,232,0.15)', borderWidth: 2, borderColor: C.cyan},
  dotPending: {backgroundColor: C.white08, borderWidth: 1, borderColor: C.white15},
  dotText: {fontSize: 12, fontWeight: '700'},
  dotTextDone: {color: C.cyan},
  dotTextPending: {color: C.white40},
  dotCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.green, borderWidth: 1.5, borderColor: C.bgDeep,
  },
  dotOverflow: {backgroundColor: C.white08},
  dotOverflowText: {fontSize: 10, fontWeight: '600', color: C.white40},

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14,
  },
  streakLine: {fontSize: 14, fontWeight: '700', flex: 1},
  countText: {fontSize: 14, fontWeight: '800', color: C.yellow, marginLeft: 8},

  track: {
    height: 5, backgroundColor: C.white15,
    borderRadius: 3, overflow: 'hidden', marginTop: 8,
  },
  fill: {height: 5, borderRadius: 3},
  trackLabel: {fontSize: 14, color: C.white70, marginTop: 5},

  submitBtn: {
    backgroundColor: C.yellow, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
    shadowColor: C.yellow, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: {width: 0, height: 3}, elevation: 6,
  },
  submitText: {color: C.bgDeep, fontSize: 14, fontWeight: '900', letterSpacing: 0.8},
});
