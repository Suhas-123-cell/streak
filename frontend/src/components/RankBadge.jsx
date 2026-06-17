import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {RANK_COLOR} from '../utils/rank';
import {PIXEL} from '../constants/theme';

export default function RankBadge({rank, size = 'md'}) {
  const color = RANK_COLOR[rank] || '#fff';
  const isLg = size === 'lg';
  const medalSize = isLg ? 56 : 36;
  const fontSize  = isLg ? 18 : 11;
  const labelSize = isLg ? 9 : 7;

  return (
    <View style={st.wrap}>
      <View style={[
        st.medal,
        {width: medalSize, height: medalSize, borderColor: color},
        isLg && {shadowColor: color, shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: {width: 0, height: 0}},
      ]}>
        <Text style={[st.icon, {fontSize, color}]}>◆</Text>
      </View>
      <Text style={[st.label, {fontSize: labelSize, color}]}>{rank}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:  {alignItems: 'center', gap: 6},
  medal: {
    borderWidth: 2, transform: [{rotate: '45deg'}],
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  icon:  {transform: [{rotate: '-45deg'}]},
  label: {fontFamily: PIXEL, letterSpacing: 1},
});
