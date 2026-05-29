import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';

const PURPLE = '#7C3AED';
const GREEN = '#22C55E';
const RED = '#EF4444';
const ORANGE = '#FF6B00';

export default function MemberRow({member, rank, isMe}) {
  const profile = member.profiles || {};
  const checkedIn = member.checked_in_today;

  const medalLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
  const isMedal = rank <= 3;

  return (
    <View style={[styles.row, isMe && styles.myRow]}>
      {isMe && <View style={styles.myGlow} />}

      <View style={styles.rankWrap}>
        {isMedal ? (
          <Text style={styles.medal}>{medalLabel}</Text>
        ) : (
          <Text style={styles.rankNum}>{rank}</Text>
        )}
      </View>

      {profile.avatar_url ? (
        <Image source={{uri: profile.avatar_url}} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, isMe && {backgroundColor: PURPLE}]}>
          <Text style={styles.avatarInitial}>
            {(profile.username || '?')[0].toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {profile.username}{isMe ? ' (you)' : ''}
      </Text>

      <View style={styles.right}>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>🔥 {member.current_streak}</Text>
        </View>
        <View style={[styles.statusDot, {backgroundColor: checkedIn ? GREEN : '#E5E7EB'}]}>
          <Text style={styles.statusIcon}>{checkedIn ? '✓' : '·'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
    position: 'relative', overflow: 'hidden',
  },
  myRow: {backgroundColor: '#F5F3FF'},
  myGlow: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: PURPLE,
  },
  rankWrap: {width: 36, alignItems: 'center'},
  medal: {fontSize: 18},
  rankNum: {fontSize: 14, color: '#9CA3AF', fontWeight: '600'},
  avatar: {width: 38, height: 38, borderRadius: 19, marginRight: 12},
  avatarFallback: {backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'},
  avatarInitial: {fontSize: 15, fontWeight: '700', color: '#fff'},
  name: {flex: 1, fontSize: 14, fontWeight: '600', color: '#111827'},
  right: {flexDirection: 'row', alignItems: 'center', gap: 8},
  streakPill: {
    backgroundColor: '#FFF7ED', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  streakText: {fontSize: 12, fontWeight: '700', color: '#92400E'},
  statusDot: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  statusIcon: {color: '#fff', fontSize: 12, fontWeight: '800'},
});
