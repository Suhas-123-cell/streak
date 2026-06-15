import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {C} from '../constants/theme';

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
        <View style={[styles.avatar, styles.avatarFallback, isMe && {backgroundColor: 'rgba(78,201,232,0.15)'}]}>
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
        <View style={[styles.statusDot, {backgroundColor: checkedIn ? C.green : C.white15}]}>
          <Text style={styles.statusIcon}>{checkedIn ? '✓' : '·'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1, borderBottomColor: C.white08,
    position: 'relative', overflow: 'hidden',
  },
  myRow: {backgroundColor: 'rgba(0,229,255,0.07)'},
  myGlow: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.pink,
    shadowColor: C.pink, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: {width: 0, height: 0},
  },
  rankWrap: {width: 36, alignItems: 'center'},
  medal: {fontSize: 20},
  rankNum: {fontSize: 14, color: C.white40, fontWeight: '700'},
  avatar: {width: 40, height: 40, borderRadius: 20, marginRight: 12},
  avatarFallback: {
    backgroundColor: 'rgba(170,0,255,0.14)',
    borderWidth: 1.5, borderColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {fontSize: 15, fontWeight: '800', color: C.purple},
  name: {flex: 1, fontSize: 14, fontWeight: '700', color: C.white},
  right: {flexDirection: 'row', alignItems: 'center', gap: 8},
  streakPill: {
    backgroundColor: 'rgba(255,102,0,0.12)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,102,0,0.3)',
  },
  streakText: {fontSize: 12, fontWeight: '800', color: C.orange},
  statusDot: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  statusIcon: {color: C.white, fontSize: 12, fontWeight: '900'},
});
