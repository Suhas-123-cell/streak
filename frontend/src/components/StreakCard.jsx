import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Share, ActivityIndicator, Alert} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import {C} from '../constants/theme';

const RANK_COLORS = {
  ROOKIE:      C.white70,
  FIGHTER:     C.cyan,
  CHAMP:       C.yellow,
  MASTER:      C.pink,
  LEGEND:      C.purple,
  GRANDMASTER: '#FFD400',
};

export default function StreakCard({username, streak, rank, battleName}) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const rankColor = RANK_COLORS[rank] || C.white70;

  async function share() {
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {format: 'png', quality: 0.95});
      await Share.share({
        url: uri,
        message: `${streak} days straight on StreakFight 🔥 Rank: ${rank}${battleName ? ` — "${battleName}"` : ''}\nDownload: https://streakfight.app`,
        title: 'My StreakFight Card',
      });
    } catch (e) {
      if (!e.message?.includes('cancel')) {
        Alert.alert('Share failed', 'Could not capture streak card.');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* Capturable card */}
      <View ref={cardRef} style={styles.card} collapsable={false}>
        <View style={styles.topRow}>
          <Text style={styles.appName}>STREAKFIGHT</Text>
          <Text style={[styles.rankBadge, {color: rankColor, borderColor: rankColor}]}>{rank}</Text>
        </View>
        <Text style={styles.streakNum}>{streak}</Text>
        <Text style={styles.streakLabel}>DAY STREAK</Text>
        {battleName ? <Text style={styles.battleName}>"{battleName}"</Text> : null}
        <Text style={styles.username}>@{username}</Text>
      </View>

      <TouchableOpacity
        style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
        onPress={share}
        disabled={sharing}
        activeOpacity={0.85}>
        {sharing
          ? <ActivityIndicator color="#05030a" size="small" />
          : <Text style={styles.shareBtnText}>↗ SHARE MY STREAK</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {marginHorizontal: 20, marginTop: 4},
  card: {
    backgroundColor: '#05030a',
    borderWidth: 3, borderColor: C.pink,
    padding: 20,
    shadowColor: C.pink, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 6, height: 6},
  },
  topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  appName: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: C.cyan, letterSpacing: 2, lineHeight: 14},
  rankBadge: {
    fontFamily: 'PressStart2P-Regular', fontSize: 7, letterSpacing: 1, lineHeight: 12,
    borderWidth: 2, paddingHorizontal: 6, paddingVertical: 3,
  },
  streakNum: {
    fontFamily: 'PressStart2P-Regular', fontSize: 48, color: C.yellow, lineHeight: 60,
    textShadowColor: C.pink, textShadowOffset: {width: 4, height: 4}, textShadowRadius: 0,
  },
  streakLabel: {
    fontFamily: 'PressStart2P-Regular', fontSize: 10, color: '#fff',
    letterSpacing: 3, lineHeight: 18, marginTop: 4,
  },
  battleName: {fontFamily: 'Oswald-SemiBold', fontSize: 14, color: C.white70, marginTop: 10, lineHeight: 20},
  username: {fontFamily: 'Oswald-Bold', fontSize: 13, color: C.cyan, marginTop: 12, letterSpacing: 1},
  shareBtn: {
    marginTop: 12, backgroundColor: C.pink, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 14, alignItems: 'center',
    shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
  },
  shareBtnDisabled: {opacity: 0.6},
  shareBtnText: {color: '#fff', fontFamily: 'PressStart2P-Regular', fontSize: 9, letterSpacing: 1, lineHeight: 16},
});
