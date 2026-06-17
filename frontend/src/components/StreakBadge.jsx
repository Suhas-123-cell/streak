import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {C, PIXEL} from '../constants/theme';

export default function StreakBadge({streak, large}) {
  return (
    <View style={[styles.badge, large && styles.large]}>
      <Text style={[styles.text, large && styles.largeText]}>{streak}D</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(155,232,12,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(155,232,12,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {fontFamily: 'PressStart2P-Regular', color: '#FFD400', fontSize: 9, lineHeight: 14},
  large: {paddingHorizontal: 12, paddingVertical: 7},
  largeText: {fontSize: 11, lineHeight: 17},
});
