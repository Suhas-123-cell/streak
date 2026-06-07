import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const ACCENT = '#7C3AED';
const SUCCESS = '#16A34A';
const PENDING = '#EA580C';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const TEXT_3 = '#A8A29E';
const BORDER = '#E7E5E4';

function MemberDot({member, isCheckedIn}) {
  const initial = (member.profiles?.username || '?')[0].toUpperCase();
  return (
    <View style={[styles.dot, isCheckedIn ? styles.dotDone : styles.dotPending]}>
      <Text style={[styles.dotText, isCheckedIn ? styles.dotTextDone : styles.dotTextPending]}>
        {initial}
      </Text>
      {isCheckedIn && <View style={styles.dotCheckmark} />}
    </View>
  );
}

function hoursLeftToday() {
  return 23 - new Date().getHours();
}

export default function BattleCard({battle, members, myStreak, checkedIn, onPress}) {
  const sorted = [...members].sort((a, b) => b.current_streak - a.current_streak);
  const top3 = sorted.slice(0, 3);
  const checkedInCount = members.filter(m => m.checked_in_today).length;
  const pct = members.length ? checkedInCount / members.length : 0;
  const hours = hoursLeftToday();

  function streakPhrase() {
    if (checkedIn) return `You're on ${myStreak} days 🔥`;
    if (myStreak > 0) return `${myStreak} days — don't break it`;
    return 'Start your streak today';
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>

      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.habitName}>{battle.habit_name}</Text>
          <Text style={styles.meta}>
            {members.length} members
            {!checkedIn && hours <= 12 && (
              <Text style={styles.urgency}> · {hours}h left</Text>
            )}
          </Text>
        </View>
        {checkedIn ? (
          <View style={styles.doneTag}>
            <Text style={styles.doneTagText}>done ✓</Text>
          </View>
        ) : (
          <View style={styles.pendingTag}>
            <Text style={styles.pendingTagText}>pending</Text>
          </View>
        )}
      </View>

      {/* Member dots — who's checked in vs not */}
      {members.length > 0 && (
        <View style={styles.dotsRow}>
          {members.slice(0, 8).map(m => (
            <MemberDot key={m.user_id} member={m} isCheckedIn={m.checked_in_today} />
          ))}
          {members.length > 8 && (
            <View style={[styles.dot, styles.dotOverflow]}>
              <Text style={styles.dotOverflowText}>+{members.length - 8}</Text>
            </View>
          )}
        </View>
      )}

      {/* Streak + group progress */}
      <View style={styles.statsRow}>
        <Text style={[styles.streakPhrase, {
          color: checkedIn ? TEXT_1 : myStreak > 0 ? PENDING : TEXT_2,
        }]}>{streakPhrase()}</Text>
        <Text style={styles.groupCount}>{checkedInCount}/{members.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {
          width: `${pct * 100}%`,
          backgroundColor: pct === 1 ? SUCCESS : checkedIn ? SUCCESS : ACCENT,
        }]} />
      </View>
      <Text style={styles.progressLabel}>
        {checkedInCount === members.length
          ? 'Everyone checked in today ✓'
          : `${checkedInCount} of ${members.length} in your group checked in`}
      </Text>

      {/* Mini leaderboard */}
      {top3.length > 0 && (
        <View style={styles.leaderboard}>
          {top3.map((m, i) => (
            <View key={m.user_id} style={styles.lbRow}>
              <Text style={styles.lbMedal}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </Text>
              <Text style={styles.lbName} numberOfLines={1}>{m.profiles?.username}</Text>
              <Text style={styles.lbStreak}>🔥 {m.current_streak}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Submit proof button — only when pending */}
      {!checkedIn && (
        <TouchableOpacity style={styles.submitBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Submit proof</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 18,
    shadowColor: '#1C1917',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  headerLeft: {flex: 1, marginRight: 12},
  habitName: {fontSize: 17, fontWeight: '700', color: TEXT_1, lineHeight: 22},
  meta: {fontSize: 13, color: TEXT_2, marginTop: 2},
  urgency: {color: PENDING, fontWeight: '600'},

  doneTag: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  doneTagText: {fontSize: 12, fontWeight: '600', color: SUCCESS},
  pendingTag: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  pendingTagText: {fontSize: 12, fontWeight: '500', color: '#92400E'},

  // Member dots
  dotsRow: {
    flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap',
  },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: {backgroundColor: '#EDE9FE', borderWidth: 2, borderColor: ACCENT},
  dotPending: {backgroundColor: '#F5F5F4', borderWidth: 1, borderColor: BORDER, opacity: 0.5},
  dotText: {fontSize: 12, fontWeight: '700'},
  dotTextDone: {color: ACCENT},
  dotTextPending: {color: TEXT_3},
  dotCheckmark: {
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
  streakPhrase: {fontSize: 14, fontWeight: '600', flex: 1},
  groupCount: {fontSize: 14, fontWeight: '700', color: TEXT_1, marginLeft: 8},

  progressTrack: {
    height: 4, backgroundColor: '#F3F4F6',
    borderRadius: 2, overflow: 'hidden', marginTop: 8,
  },
  progressFill: {height: 4, borderRadius: 2},
  progressLabel: {fontSize: 12, color: TEXT_2, marginTop: 5},

  leaderboard: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
    gap: 8,
  },
  lbRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  lbMedal: {fontSize: 16, width: 24},
  lbName: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  lbStreak: {fontSize: 13, color: TEXT_2},

  submitBtn: {
    backgroundColor: ACCENT, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 14,
  },
  submitBtnText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});
