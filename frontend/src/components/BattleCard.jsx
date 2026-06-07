import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import MemberAvatarStack from './MemberAvatarStack';

const PURPLE = '#7C3AED';
const ORANGE = '#F97316';
const GREEN = '#22C55E';

export default function BattleCard({battle, members, myStreak, checkedIn, onPress}) {
  const sorted = [...members].sort((a, b) => b.current_streak - a.current_streak);
  const top3 = sorted.slice(0, 3);
  const checkedInCount = members.filter(m => m.checked_in_today).length;
  const pct = members.length ? checkedInCount / members.length : 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        checkedIn ? styles.cardDone : styles.cardPending,
      ]}
      onPress={onPress}
      activeOpacity={0.9}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.habitName}>{battle.habit_name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>
        <View style={[styles.statusDot, {backgroundColor: checkedIn ? GREEN : '#E5E7EB'}]}>
          <Text style={styles.statusEmoji}>{checkedIn ? '✓' : '·'}</Text>
        </View>
      </View>

      {/* Avatar stack */}
      <View style={styles.avatarRow}>
        <MemberAvatarStack members={members} />
      </View>

      {/* Streak badge */}
      <View style={[styles.streakBox, !checkedIn && styles.streakBoxPending]}>
        <View style={styles.streakLeft}>
          <View style={styles.fireCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
          <View>
            <Text style={styles.streakNum}>{myStreak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
        {checkedIn ? (
          <View style={styles.checkinPillDone}>
            <Text style={styles.checkinPillTextDone}>✅ Done today</Text>
          </View>
        ) : (
          <View style={styles.checkinPillRisk}>
            <Text style={styles.checkinPillTextRisk}>🔥 At risk!</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Today's check-ins</Text>
          <Text style={styles.progressCount}>{checkedInCount}/{members.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${pct * 100}%`}]} />
        </View>
      </View>

      {/* Mini leaderboard */}
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

      {/* Check-in CTA strip — only shown when pending */}
      {!checkedIn && (
        <View style={styles.ctaStrip}>
          <Text style={styles.ctaText}>CHECK IN NOW →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  cardDone: {borderLeftColor: GREEN},
  cardPending: {borderLeftColor: ORANGE},

  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  headerLeft: {flex: 1, marginRight: 12},
  habitName: {fontSize: 18, fontWeight: '700', color: '#111827', lineHeight: 24},
  memberCount: {fontSize: 13, color: '#9CA3AF', marginTop: 2},
  statusDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  statusEmoji: {color: '#fff', fontWeight: '800', fontSize: 14},

  avatarRow: {marginTop: 16},

  streakBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, marginTop: 14,
  },
  streakBoxPending: {backgroundColor: '#FFF3E0'},
  streakLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  fireCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  fireEmoji: {fontSize: 20},
  streakNum: {fontSize: 28, fontWeight: '800', color: '#111827', lineHeight: 32},
  streakLabel: {fontSize: 12, color: '#9CA3AF'},

  checkinPillDone: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  checkinPillTextDone: {fontSize: 12, fontWeight: '700', color: '#15803D'},
  checkinPillRisk: {
    backgroundColor: '#FEF3C7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  checkinPillTextRisk: {fontSize: 12, fontWeight: '700', color: '#92400E'},

  progressSection: {marginTop: 14},
  progressHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6},
  progressLabel: {fontSize: 12, color: '#6B7280'},
  progressCount: {fontSize: 12, fontWeight: '700', color: '#111827'},
  progressTrack: {height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden'},
  progressFill: {height: 6, borderRadius: 3, backgroundColor: PURPLE},

  leaderboard: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 8,
  },
  lbRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  lbMedal: {fontSize: 16, width: 24},
  lbName: {flex: 1, fontSize: 13, color: '#374151', fontWeight: '500'},
  lbStreak: {fontSize: 13, color: '#6B7280'},

  ctaStrip: {
    marginTop: 14, marginHorizontal: -20, marginBottom: -20,
    backgroundColor: ORANGE,
    paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: {color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1},
});
