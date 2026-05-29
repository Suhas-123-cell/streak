import React from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import StreakBadge from './StreakBadge';

export default function MemberRow({member, rank}) {
  const profile = member.profiles || {};
  const checkedIn = member.checked_in_today;

  return (
    <View style={styles.row}>
      <Text style={styles.rank}>{rank}</Text>
      {profile.avatar_url ? (
        <Image source={{uri: profile.avatar_url}} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]}>
          <Text style={styles.initial}>{(profile.username || '?')[0].toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{profile.username}</Text>
      <View style={styles.right}>
        <StreakBadge streak={member.current_streak} />
        <Text style={styles.status}>{checkedIn ? '✅' : '❌'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  rank: {color: '#888', width: 24, fontSize: 13},
  avatar: {width: 36, height: 36, borderRadius: 18, marginRight: 10},
  placeholder: {backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center'},
  initial: {color: '#fff', fontWeight: '700'},
  name: {flex: 1, color: '#fff', fontSize: 15, fontWeight: '600'},
  right: {flexDirection: 'row', alignItems: 'center', gap: 8},
  status: {fontSize: 18},
});
