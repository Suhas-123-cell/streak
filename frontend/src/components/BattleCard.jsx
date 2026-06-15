import React, {useRef, useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import {C} from '../constants/theme';

// Shimmer sweep — looping highlight across the card
function Shimmer() {
  const x = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(x, {toValue: 440, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(x, {toValue: -120, duration: 0, useNativeDriver: true}),
      ])
    ).start();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: 90,
        backgroundColor: 'rgba(255,255,255,0.05)',
        transform: [{translateX: x}, {skewX: '-18deg'}],
      }} />
    </View>
  );
}

function MemberDot({member, isCheckedIn, delay}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {toValue: 1, delay, tension: 220, friction: 7, useNativeDriver: true}).start();
  }, []);

  const initial = (member.profiles?.username || '?')[0].toUpperCase();

  return (
    <Animated.View style={[
      styles.dot,
      isCheckedIn ? styles.dotDone : styles.dotPending,
      {
        opacity: anim.interpolate({inputRange: [0, 1], outputRange: [0, isCheckedIn ? 1 : 0.4]}),
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
  const isCritical = !checkedIn && hrs <= 3;

  // ─── Count-up streak ─────────────────────────────────────────────
  const [displayStreak, setDisplayStreak] = useState(0);
  useEffect(() => {
    if (myStreak === 0) {setDisplayStreak(0); return;}
    let cur = 0;
    const step = Math.max(1, Math.ceil(myStreak / 14));
    const t = setInterval(() => {
      cur = Math.min(cur + step, myStreak);
      setDisplayStreak(cur);
      if (cur >= myStreak) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [myStreak]);

  // ─── Card entrance — snappier spring ─────────────────────────────
  const enterY = useRef(new Animated.Value(40)).current;
  const enterOp = useRef(new Animated.Value(0)).current;
  const enterScale = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    const delay = index * 75;
    Animated.parallel([
      Animated.spring(enterY,     {toValue: 0, delay, tension: 300, friction: 9, useNativeDriver: true}),
      Animated.spring(enterScale, {toValue: 1, delay, tension: 300, friction: 9, useNativeDriver: true}),
      Animated.timing(enterOp,    {toValue: 1, duration: 220, delay, useNativeDriver: true}),
    ]).start();
  }, []);

  // ─── Progress bar ────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 900,
      delay: index * 75 + 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // ─── Submit button pulse ─────────────────────────────────────────
  const btnScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (checkedIn) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnScale, {toValue: 1.05, duration: 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(btnScale, {toValue: 1,    duration: 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [checkedIn]);

  // ─── Glow ring ──────────────────────────────────────────────────
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (checkedIn) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOp,    {toValue: 0.1,  duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {toValue: 1,   duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOp,    {toValue: 0.5, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [checkedIn]);

  // ─── Press feedback ─────────────────────────────────────────────
  const cardScale = useRef(new Animated.Value(1)).current;
  function pressIn() {
    Animated.spring(cardScale, {toValue: 0.966, useNativeDriver: true, tension: 400, friction: 8}).start();
  }
  function pressOut() {
    Animated.spring(cardScale, {toValue: 1, useNativeDriver: true, tension: 400, friction: 8}).start();
  }

  function streakLine() {
    if (checkedIn) return `🔥 ${displayStreak} day streak`;
    if (myStreak > 0) return `⚡ ${displayStreak} days — keep it alive`;
    return '✦ Start your streak today';
  }

  const progressWidth = progressAnim.interpolate({inputRange: [0, 1], outputRange: ['0%', '100%']});
  const fillColor = pct === 1 ? C.lime : checkedIn ? C.cyan : isCritical ? C.pink : C.purple;
  const borderCol = isCritical ? C.pink : checkedIn ? 'rgba(0,255,138,0.4)' : C.cardBorder;

  return (
    <Animated.View style={[
      styles.wrap,
      {opacity: enterOp, transform: [{translateY: enterY}, {scale: cardScale}]},
    ]}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            borderColor: borderCol,
            shadowColor: isCritical ? C.pink : checkedIn ? C.cyan : C.purple,
            shadowOpacity: isCritical ? 0.5 : 0.22,
            shadowRadius: 26,
            transform: [{scale: enterScale}],
          },
        ]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}>

        <Shimmer />

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{flex: 1, marginRight: 10}}>
            <Text style={[styles.habitName, isCritical && {color: C.pink}]} numberOfLines={1}>
              {battle.habit_name}
            </Text>
            <Text style={styles.meta}>
              {members.length} fighters
              {!checkedIn && hrs <= 12 && (
                <Text style={[styles.urgency, {color: isCritical ? C.pink : C.orange}]}> · {hrs}h left</Text>
              )}
            </Text>
          </View>
          {checkedIn
            ? <View style={styles.tagDone}><Text style={styles.tagDoneText}>done ✓</Text></View>
            : <View style={[styles.tagPending, isCritical && styles.tagCritical]}>
                <Text style={[styles.tagPendingText, isCritical && {color: C.pink}]}>
                  {isCritical ? '⚠ NOW' : 'pending'}
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
                delay={index * 75 + 100 + i * 40}
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
            {color: checkedIn ? C.lime : myStreak > 0 ? C.orange : C.white70},
          ]}>
            {streakLine()}
          </Text>
          <View style={[styles.countBadge, checkedIn && styles.countBadgeDone]}>
            <Text style={[styles.countText, checkedIn && {color: C.lime}]}>{checkedInCount}/{members.length}</Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.track}>
          <Animated.View style={[
            styles.fill,
            {
              width: progressWidth,
              backgroundColor: fillColor,
              shadowColor: fillColor,
              shadowOpacity: 0.85,
              shadowRadius: 8,
              shadowOffset: {width: 0, height: 0},
            },
          ]} />
        </View>
        <Text style={styles.trackLabel}>
          {checkedInCount === members.length && members.length > 0
            ? '🎉 Everyone showed up today'
            : `${checkedInCount} of ${members.length} checked in`}
        </Text>

        {/* ── Pulsing submit ── */}
        {!checkedIn && (
          <View style={styles.submitContainer}>
            <Animated.View style={[
              styles.submitGlow,
              {
                opacity: glowOp,
                transform: [{scale: glowScale}],
                backgroundColor: isCritical ? C.pink : C.yellow,
              },
            ]} />
            <Animated.View style={{transform: [{scale: btnScale}]}}>
              <TouchableOpacity
                style={[styles.submitBtn, isCritical && styles.submitBtnCritical]}
                onPress={onPress}
                activeOpacity={0.82}>
                <Text style={styles.submitText}>
                  {isCritical ? '⚡ Submit NOW →' : 'Submit proof →'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginHorizontal: 16, marginVertical: 9},
  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 19,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    shadowColor: C.purple,
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: 5},
    elevation: 10,
    overflow: 'hidden',
  },

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  habitName: {fontSize: 22, fontWeight: '900', color: C.white, lineHeight: 27, letterSpacing: 0.1},
  meta: {fontSize: 13, color: C.white40, marginTop: 3},
  urgency: {fontWeight: '800'},

  tagDone: {
    backgroundColor: 'rgba(0,255,138,0.12)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1.5, borderColor: 'rgba(0,255,138,0.45)',
  },
  tagDoneText: {fontSize: 12, fontWeight: '800', color: C.green},
  tagPending: {
    backgroundColor: 'rgba(170,0,255,0.12)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1.5, borderColor: 'rgba(170,0,255,0.4)',
  },
  tagCritical: {
    backgroundColor: 'rgba(255,0,112,0.14)',
    borderColor: 'rgba(255,0,112,0.55)',
  },
  tagPendingText: {fontSize: 12, fontWeight: '800', color: C.purple},

  dotsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16},
  dot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: 'rgba(0,229,255,0.18)', borderWidth: 2, borderColor: C.cyan,
    shadowColor: C.cyan, shadowOpacity: 0.6, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0}, elevation: 4,
  },
  dotPending: {backgroundColor: C.white08, borderWidth: 1, borderColor: C.white15},
  dotText: {fontSize: 13, fontWeight: '800'},
  dotTextDone: {color: C.cyan},
  dotTextPending: {color: C.white40},
  dotCheck: {
    position: 'absolute', bottom: -2, right: -2,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: C.green, borderWidth: 1.5, borderColor: C.bgDeep,
  },
  dotOverflow: {backgroundColor: C.white08},
  dotOverflowText: {fontSize: 10, fontWeight: '700', color: C.white40},

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16,
  },
  streakLine: {fontSize: 14, fontWeight: '800', flex: 1},
  countBadge: {
    backgroundColor: 'rgba(255,224,0,0.12)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,224,0,0.4)',
  },
  countBadgeDone: {
    backgroundColor: 'rgba(0,255,138,0.1)',
    borderColor: 'rgba(0,255,138,0.4)',
  },
  countText: {fontSize: 13, fontWeight: '900', color: C.yellow},

  track: {
    height: 9, backgroundColor: C.white15,
    borderRadius: 5, overflow: 'hidden', marginTop: 9,
  },
  fill: {height: 9, borderRadius: 5},
  trackLabel: {fontSize: 13, color: C.white40, marginTop: 7},

  submitContainer: {position: 'relative', marginTop: 18},
  submitGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
  },
  submitBtn: {
    backgroundColor: C.yellow, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.yellow, shadowOpacity: 0.6, shadowRadius: 20,
    shadowOffset: {width: 0, height: 5}, elevation: 12,
  },
  submitBtnCritical: {
    backgroundColor: C.pink,
    shadowColor: C.pink, shadowOpacity: 0.7, shadowRadius: 24,
  },
  submitText: {color: C.bgDeep, fontSize: 15, fontWeight: '900', letterSpacing: 1.2},
});
