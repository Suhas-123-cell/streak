import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {C} from '../constants/theme';

export default function StreakBadge({streak, large}) {
  return (
    <View style={[styles.badge, large && styles.large]}>
      <Text style={[styles.text, large && styles.largeText]}>🔥 {streak}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: C.badgeBg,
    borderWidth: 1,
    borderColor: C.badgeBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {color: C.yellow, fontWeight: '700', fontSize: 12},
  large: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16},
  largeText: {fontSize: 16},
});
