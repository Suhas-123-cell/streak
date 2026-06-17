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

          {/* Diamond medallion */}
          <Animated.View style={[st.medallion, {
            borderColor: rankColor,
            transform: [{rotate: rotation}],
          }]}>
            <Animated.Text style={[st.medalIcon, {color: rankColor, opacity: glow, transform: [{rotate: counterRotation}]}]}>
              ★
            </Animated.Text>
          </Animated.View>

          <Text style={st.flawless}>FLAWLESS</Text>
          <Text style={st.victory}>VICTORY</Text>

          <View style={st.divider} />

          <Text style={[st.streakNum, {color: rankColor}]}>x{combo}</Text>

          <Text style={st.stat}>
            STREAK COMBO  ·  RANK UP TO{' '}
            <Text style={[st.statRank, {color: rankColor}]}>{rank}</Text>
          </Text>

          <TouchableOpacity
            style={st.claimBtn}
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
    width: '100%', backgroundColor: '#0a0710',
    borderWidth: 2, borderColor: '#FFD400',
    padding: 32, alignItems: 'center',
  },
  medallion: {
    width: 118, height: 118, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    backgroundColor: 'rgba(255,212,0,0.14)',
    shadowOpacity: 0.8, shadowRadius: 24, shadowOffset: {width: 0, height: 0}, elevation: 12,
  },
  medalIcon: {fontFamily: 'PressStart2P-Regular', fontSize: 38, lineHeight: 46},
  flawless: {
    fontFamily: 'PressStart2P-Regular', fontSize: 18, color: '#FFD400', lineHeight: 30,
    textShadowColor: '#FF2D6F', textShadowRadius: 0, textShadowOffset: {width: 3, height: 3},
    marginBottom: 2,
  },
  victory: {
    fontFamily: 'PressStart2P-Regular', fontSize: 18, color: '#FFD400', lineHeight: 30,
    textShadowColor: '#FF2D6F', textShadowRadius: 0, textShadowOffset: {width: 3, height: 3},
    marginBottom: 20,
  },
  divider:     {width: '60%', height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20},
  streakNum:   {
    fontFamily: 'PressStart2P-Regular', fontSize: 32, color: '#fff', lineHeight: 48,
    textShadowColor: '#FF2D6F', textShadowRadius: 0, textShadowOffset: {width: 2, height: 2},
  },
  stat: {
    fontSize: 12, color: 'rgba(255,255,255,0.80)', fontFamily: 'Oswald-Bold',
    letterSpacing: 1, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 20,
  },
  statRank: {
    fontFamily: 'PressStart2P-Regular', fontSize: 10, lineHeight: 16,
  },
  claimBtn: {
    backgroundColor: '#9BE80C',
    paddingHorizontal: 28, paddingVertical: 16,
    borderWidth: 3, borderColor: '#fff', width: '100%', alignItems: 'center',
    shadowColor: '#AA00FF', shadowOpacity: 1, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
    elevation: 8,
  },
  claimTxt: {fontFamily: 'PressStart2P-Regular', fontSize: 11, color: '#05030a', lineHeight: 18},
});
