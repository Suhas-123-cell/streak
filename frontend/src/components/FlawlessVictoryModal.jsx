import React, {useEffect, useRef} from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import {C, PIXEL} from '../constants/theme';
import {RANK_COLOR, RANK_COMBO} from '../utils/rank';

export default function FlawlessVictoryModal({visible, streak, rank, onClose}) {
  const scale  = useRef(new Animated.Value(0.6)).current;
  const op     = useRef(new Animated.Value(0)).current;
  const spin   = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.6);
    op.setValue(0);
    spin.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {toValue: 1, tension: 60, friction: 7, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 220, useNativeDriver: true}),
      Animated.loop(
        Animated.timing(spin, {toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true})
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glow, {toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ])
      ),
    ]).start();
  }, [visible]);

  const rankColor = RANK_COLOR[rank] || C.yellow;
  const combo     = RANK_COMBO[rank] || 1;
  const rotation  = spin.interpolate({inputRange: [0, 1], outputRange: ['0deg', '360deg']});
  const counterRotation = spin.interpolate({inputRange: [0, 1], outputRange: ['0deg', '-360deg']});

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <Animated.View style={[st.card, {opacity: op, transform: [{scale}]}]}>

          <Animated.View style={[st.medallion, {
            borderColor: rankColor, shadowColor: rankColor,
            transform: [{rotate: rotation}],
          }]}>
            <Animated.Text style={[st.medalIcon, {color: rankColor, opacity: glow, transform: [{rotate: counterRotation}]}]}>
              ◆
            </Animated.Text>
          </Animated.View>

          <Text style={[st.flawless, {color: rankColor}]}>FLAWLESS</Text>
          <Text style={st.victory}>VICTORY</Text>

          <View style={st.divider} />

          <Text style={[st.streakNum, {color: rankColor}]}>{streak}</Text>
          <Text style={st.streakLabel}>DAY STREAK</Text>

          <View style={[st.comboBadge, {borderColor: rankColor}]}>
            <Text style={[st.comboTxt, {color: rankColor}]}>x{combo} COMBO</Text>
          </View>

          <Text style={[st.rankTxt, {color: rankColor}]}>{rank}</Text>
          <Text style={st.rankSub}>RANK UNLOCKED</Text>

          <TouchableOpacity
            style={[st.claimBtn, {backgroundColor: rankColor}]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={st.claimTxt}>CLAIM REWARD ▶</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', backgroundColor: '#0d0019',
    borderWidth: 2, borderColor: C.yellow,
    padding: 32, alignItems: 'center',
  },
  medallion: {
    width: 80, height: 80, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: {width: 0, height: 0}, elevation: 12,
  },
  medalIcon:   {fontSize: 32},
  flawless:    {fontFamily: PIXEL, fontSize: 13, letterSpacing: 2, marginBottom: 2},
  victory:     {fontFamily: PIXEL, fontSize: 22, color: '#fff', letterSpacing: 3, marginBottom: 20},
  divider:     {width: '60%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20},
  streakNum:   {fontFamily: PIXEL, fontSize: 40, lineHeight: 48},
  streakLabel: {fontFamily: PIXEL, fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 16},
  comboBadge:  {borderWidth: 2, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16},
  comboTxt:    {fontFamily: PIXEL, fontSize: 11, letterSpacing: 2},
  rankTxt:     {fontFamily: PIXEL, fontSize: 13, letterSpacing: 2, marginBottom: 2},
  rankSub:     {fontFamily: PIXEL, fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, marginBottom: 28},
  claimBtn:    {paddingHorizontal: 28, paddingVertical: 16, borderWidth: 3, borderColor: '#fff', width: '100%', alignItems: 'center'},
  claimTxt:    {fontFamily: PIXEL, fontSize: 12, color: '#000', letterSpacing: 1},
});
