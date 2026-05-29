import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function StreakBadge({streak, large}) {
  return (
    <View style={[styles.badge, large && styles.large]}>
      <Text style={[styles.text, large && styles.largeText]}>🔥 {streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {color: '#92400E', fontWeight: '700', fontSize: 12},
  large: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16},
  largeText: {fontSize: 16},
});
