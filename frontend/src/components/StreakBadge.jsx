import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function StreakBadge({streak}) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>🔥 {streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {color: '#fff', fontWeight: '700', fontSize: 12},
});
