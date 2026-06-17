import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, PIXEL} from '../constants/theme';

export function ArcadeBackdrop({win = false}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.radialBase, win && styles.radialWin]} />
      <View style={styles.vignette} />
      <View style={styles.scanlines} />
    </View>
  );
}

export function ArcadeTopBar({left = '1P', center, right}) {
  return (
    <View style={styles.topbar}>
      <Text style={styles.topbarCyan}>{left}</Text>
      {!!center && <Text style={styles.topbarYellow}>{center}</Text>}
      {!!right && <Text style={styles.topbarCyan}>{right}</Text>}
    </View>
  );
}

export function ScreenTitle({children, subtitle, style}) {
  return (
    <View style={[styles.titleWrap, style]}>
      <Text style={styles.title}>{children}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

export function SectionLabel({children, style}) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function HardCard({children, borderColor = C.white15, shadowColor, style, innerStyle}) {
  const shadow = shadowColor || 'rgba(255,255,255,0.10)';
  return (
    <View style={[styles.cardWrap, style]}>
      <View style={[styles.cardShadow, {backgroundColor: shadow}]} />
      <View style={[styles.card, {borderColor}, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

export function ArcadeButton({children, onPress, disabled, color = C.yellow, shadowColor = C.pink, style, textStyle}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      style={[styles.button, {backgroundColor: color, shadowColor}, disabled && styles.disabled, style]}>
      <Text style={[styles.buttonText, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

export function FighterBadge({text, color = C.lime, style}) {
  return (
    <View style={[styles.badge, {borderColor: color}, style]}>
      <View style={[styles.badgeDot, {backgroundColor: color, shadowColor: color}]} />
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  radialBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    opacity: 1,
  },
  radialWin: {
    backgroundColor: '#17100d',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 56,
    borderColor: 'rgba(0,0,0,0.50)',
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.025)',
    opacity: 0.45,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topbarCyan: {fontFamily: PIXEL, fontSize: 7, color: C.cyan, letterSpacing: 1, lineHeight: 13},
  topbarYellow: {fontFamily: PIXEL, fontSize: 7, color: C.yellow, letterSpacing: 1, lineHeight: 13},
  titleWrap: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14},
  title: {
    fontFamily: PIXEL,
    fontSize: 13,
    color: C.white,
    lineHeight: 22,
    textShadowColor: C.pink,
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily: 'Oswald-SemiBold',
    fontSize: 13,
    color: C.white70,
    marginTop: 6,
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: PIXEL,
    fontSize: 8,
    color: C.white40,
    letterSpacing: 2,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  cardWrap: {position: 'relative'},
  cardShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
  },
  card: {
    backgroundColor: C.bgSurface,
    borderWidth: 2,
    overflow: 'hidden',
  },
  button: {
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowOpacity: 0.9,
    shadowRadius: 0,
    shadowOffset: {width: 5, height: 5},
  },
  disabled: {opacity: 0.55},
  buttonText: {
    fontFamily: PIXEL,
    fontSize: 10,
    color: C.ink,
    letterSpacing: 1,
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  badgeText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 12,
    color: C.white,
    letterSpacing: 0.5,
  },
});
