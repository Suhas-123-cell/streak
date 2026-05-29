import React from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';

const PURPLE = '#7C3AED';
const GREEN = '#22C55E';

export default function MemberAvatarStack({members, max = 5}) {
  const shown = members.slice(0, max);
  const extra = members.length - max;

  return (
    <View style={styles.row}>
      {shown.map((m, i) => {
        const checkedIn = m.checked_in_today;
        return (
          <View
            key={m.user_id}
            style={[
              styles.avatarWrap,
              {marginLeft: i === 0 ? 0 : -10, zIndex: shown.length - i},
              {borderColor: checkedIn ? PURPLE : '#E5E7EB'},
            ]}>
            {m.profiles?.avatar_url ? (
              <Image source={{uri: m.profiles.avatar_url}} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, {backgroundColor: checkedIn ? PURPLE : '#E5E7EB'}]}>
                <Text style={[styles.initial, {color: checkedIn ? '#fff' : '#9CA3AF'}]}>
                  {(m.profiles?.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            {checkedIn && (
              <View style={styles.checkBadge}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[styles.avatarWrap, styles.extraWrap, {marginLeft: -10}]}>
          <View style={[styles.avatar, styles.extraAvatar]}>
            <Text style={styles.extraText}>+{extra}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  avatarWrap: {
    borderRadius: 20, borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 4, shadowOffset: {width: 0, height: 2},
  },
  avatar: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  initial: {fontSize: 13, fontWeight: '700'},
  checkBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  checkMark: {color: '#fff', fontSize: 8, fontWeight: '900'},
  extraWrap: {borderColor: '#E5E7EB'},
  extraAvatar: {backgroundColor: '#F3F4F6'},
  extraText: {fontSize: 11, fontWeight: '700', color: '#6B7280'},
});
