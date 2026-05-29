import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import MemberAvatarStack from './MemberAvatarStack';
import StreakBadge from './StreakBadge';

export default function BattleCard({battle, members, myStreak, checkedIn, onPress}) {
  const top3 = members.slice(0, 3);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.habit}>{battle.habit_name}</Text>
        <Text style={styles.checkin}>{checkedIn ? '✅' : '❌'}</Text>
      </View>
      <Text style={styles.sub}>{members.length} players</Text>

      <View style={styles.row}>
        <MemberAvatarStack members={members} />
        <StreakBadge streak={myStreak} />
      </View>

      {top3.length > 0 && (
        <View style={styles.mini}>
          {top3.map((m, i) => (
            <Text key={m.user_id} style={styles.miniRow}>
              {i + 1}. {m.profiles?.username} 🔥{m.current_streak}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#12122A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  habit: {color: '#fff', fontSize: 17, fontWeight: '700', flex: 1},
  checkin: {fontSize: 22},
  sub: {color: '#888', fontSize: 12, marginTop: 2, marginBottom: 10},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  mini: {marginTop: 12, borderTopWidth: 1, borderTopColor: '#1E1E3F', paddingTop: 8},
  miniRow: {color: '#aaa', fontSize: 12, lineHeight: 20},
});
