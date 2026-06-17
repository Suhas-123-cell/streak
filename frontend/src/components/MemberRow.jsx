import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {C} from '../constants/theme';

export default function MemberRow({member, rank, isMe}) {
  const profile = member.profiles || {};
  const checkedIn = member.checked_in_today;

  const medalLabel = rank === 1 ? '01' : rank === 2 ? '02' : rank === 3 ? '03' : rank;
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
          <Text style={styles.streakText}>{member.current_streak}D</Text>
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
  medal: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: C.yellow, lineHeight: 15},
  rankNum: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: 'rgba(255,255,255,0.50)', lineHeight: 14},
  avatar: {width: 40, height: 40, borderRadius: 0, marginRight: 12},
  avatarFallback: {
    backgroundColor: 'rgba(170,0,255,0.14)',
    borderWidth: 2, borderColor: '#AA00FF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {fontFamily: 'PressStart2P-Regular', fontSize: 12, color: '#AA00FF', lineHeight: 18},
  name: {flex: 1, fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
  right: {flexDirection: 'row', alignItems: 'center', gap: 8},
  streakPill: {
    backgroundColor: 'rgba(255,102,0,0.12)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 2, borderColor: 'rgba(255,102,0,0.35)',
  },
  streakText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FF6600', lineHeight: 13},
  statusDot: {width: 24, height: 24, alignItems: 'center', justifyContent: 'center'},
  statusIcon: {color: '#FFFFFF', fontSize: 12, fontFamily: 'Oswald-Bold'},
});
