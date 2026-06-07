import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import MemberAvatarStack from './MemberAvatarStack';

const ACCENT = '#7C3AED';
const SUCCESS = '#16A34A';
const PENDING = '#EA580C';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const BORDER = '#E7E5E4';

export default function BattleCard({battle, members, myStreak, checkedIn, onPress}) {
  const sorted = [...members].sort((a, b) => b.current_streak - a.current_streak);
  const top3 = sorted.slice(0, 3);
  const checkedInCount = members.filter(m => m.checked_in_today).length;
  const pct = members.length ? checkedInCount / members.length : 0;

  function streakPhrase() {
    if (checkedIn) return `You're on ${myStreak} days 🔥`;
    if (myStreak > 0) return `${myStreak} days — don't break it`;
    return 'Start your streak today';
  }

  function streakColor() {
    if (checkedIn) return TEXT_1;
    if (myStreak > 0) return PENDING;
    return TEXT_2;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.habitName}>{battle.habit_name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>
        {checkedIn && <View style={styles.doneDot} />}
      </View>

      <View style={styles.avatarRow}>
        <MemberAvatarStack members={members} />
      </View>

      <View style={styles.streakRow}>
        <Text style={[styles.streakPhrase, {color: streakColor()}]}>{streakPhrase()}</Text>
        {checkedIn ? (
          <View style={styles.pillDone}>
            <Text style={styles.pillDoneText}>done ✓</Text>
          </View>
        ) : (
          <View style={styles.pillPending}>
            <Text style={styles.pillPendingText}>pending</Text>
          </View>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {
          width: `${pct * 100}%`,
          backgroundColor: checkedIn ? SUCCESS : ACCENT,
        }]} />
      </View>

      {top3.length > 0 && (
        <View style={styles.leaderboard}>
          {top3.map((m, i) => (
            <View key={m.user_id} style={styles.lbRow}>
              <Text style={styles.lbMedal}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </Text>
              <Text style={styles.lbName} numberOfLines={1}>
                {m.profiles?.username}
              </Text>
              <Text style={styles.lbStreak}>🔥 {m.current_streak}</Text>
            </View>
          ))}
        </View>
      )}

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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  headerLeft: {flex: 1, marginRight: 12},
  habitName: {fontSize: 17, fontWeight: '700', color: TEXT_1, lineHeight: 22},
  memberCount: {fontSize: 13, color: TEXT_2, marginTop: 2},
  doneDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: SUCCESS, marginTop: 4,
  },

  avatarRow: {marginTop: 12},

  streakRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 14,
  },
  streakPhrase: {fontSize: 14, fontWeight: '600'},
  pillDone: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pillDoneText: {fontSize: 12, fontWeight: '600', color: SUCCESS},
  pillPending: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pillPendingText: {fontSize: 12, fontWeight: '500', color: '#92400E'},

  progressTrack: {
    height: 4, backgroundColor: '#F3F4F6',
    borderRadius: 2, overflow: 'hidden', marginTop: 12,
  },
  progressFill: {height: 4, borderRadius: 2},

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
    paddingVertical: 12, alignItems: 'center', marginTop: 14,
  },
  submitBtnText: {color: '#fff', fontSize: 14, fontWeight: '600'},
});
