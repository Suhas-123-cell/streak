import React from 'react';
import {View, Image, Text, StyleSheet} from 'react-native';

export default function MemberAvatarStack({members, max = 4}) {
  const shown = members.slice(0, max);
  const extra = members.length - max;

  return (
    <View style={styles.row}>
      {shown.map((m, i) => (
        <View key={m.user_id} style={[styles.avatarWrap, {marginLeft: i === 0 ? 0 : -10}]}>
          {m.profiles?.avatar_url ? (
            <Image source={{uri: m.profiles.avatar_url}} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholder]}>
              <Text style={styles.initial}>
                {(m.profiles?.username || '?')[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.avatar, styles.extraBadge, {marginLeft: -10}]}>
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  avatarWrap: {borderRadius: 16, borderWidth: 2, borderColor: '#fff'},
  avatar: {width: 30, height: 30, borderRadius: 15},
  placeholder: {backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center'},
  initial: {color: '#fff', fontSize: 12, fontWeight: '700'},
  extraBadge: {backgroundColor: '#333', alignItems: 'center', justifyContent: 'center'},
  extraText: {color: '#fff', fontSize: 10, fontWeight: '700'},
});
