import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {C, PIXEL} from '../constants/theme';

const {height} = Dimensions.get('window');

// ── Scanlines Overlay ──────────────────────────────────────────────────
export function Scanlines() {
  // Screen is roughly 900px tall. Each scanline + gap = 4px.
  // 900 / 4 = 225 lines. We render 250 just to be safe for tall devices.
  const lines = Array.from({length: 250});
  
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lines.map((_, i) => (
        <View 
          key={i} 
          style={{
            height: 1, 
            backgroundColor: 'rgba(0,0,0,0.20)', 
            marginBottom: 3
          }} 
        />
      ))}
    </View>
  );
}

// ── Vignette & Screen Glow Overlay ─────────────────────────────────────
export function Vignette() {
  return (
    <View pointerEvents="none" style={st.vignetteWrap}>
      {/* Fake radial glow in the center-ish */}
      <View style={st.stageGlow} />
      {/* Heavy vignette borders */}
      <View style={st.vignetteBorders} />
    </View>
  );
}

// ── Arcade Screen Topbar ───────────────────────────────────────────────
export function ScreenTopbar({left, center, right}) {
  return (
    <View style={st.topBar}>
      <Text style={st.tbCyan}>{left}</Text>
      {center ? <Text style={st.tbYellow}>{center}</Text> : <View/>}
      {right ? <Text style={st.tbCyan}>{right}</Text> : <View/>}
    </View>
  );
}

const st = StyleSheet.create({
  vignetteWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  stageGlow: {
    position: 'absolute',
    width: '100%',
    height: '60%',
    borderRadius: 300,
    backgroundColor: 'rgba(25,224,255,0.03)',
    shadowColor: C.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 80,
    shadowOffset: {width: 0, height: 0},
    top: '20%',
  },
  vignetteBorders: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 72,
    borderColor: 'rgba(0,0,0,0.65)',
  },
  
  topBar: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 8, 
    paddingBottom: 12,
    backgroundColor: 'transparent',
    zIndex: 40,
  },
  tbCyan:   {fontFamily: PIXEL, fontSize: 7, color: '#19E0FF', letterSpacing: 1},
  tbYellow: {fontFamily: PIXEL, fontSize: 7, color: '#FFD400', letterSpacing: 1},
});
