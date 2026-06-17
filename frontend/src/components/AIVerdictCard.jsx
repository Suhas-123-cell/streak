import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {C} from '../constants/theme';

export default function AIVerdictCard({checkin}) {
  if (!checkin) return null;
  const pass = checkin.ai_verified;

  return (
    <View style={[styles.card, pass ? styles.pass : styles.fail]}>
      <View style={[styles.statusBox, pass ? styles.statusPass : styles.statusFail]}>
        <Text style={[styles.statusText, {color: pass ? C.lime : C.pink}]}>
          {pass ? 'OK' : 'NO'}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, {color: pass ? C.green : C.pink}]}>
          {pass ? 'VERIFIED' : 'REJECTED'} · {checkin.ai_score}/100
        </Text>
        <Text style={styles.reason}>{checkin.ai_reasoning}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
    marginVertical: 8, gap: 10,
    borderWidth: 2,
  },
  pass: {backgroundColor: 'rgba(155,232,12,0.08)', borderColor: 'rgba(155,232,12,0.40)'},
  fail: {backgroundColor: 'rgba(255,45,111,0.08)', borderColor: 'rgba(255,45,111,0.35)'},
  statusBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    transform: [{rotate: '45deg'}],
  },
  statusPass: {
    backgroundColor: 'rgba(155,232,12,0.12)',
    borderColor: 'rgba(155,232,12,0.55)',
  },
  statusFail: {
    backgroundColor: 'rgba(255,45,111,0.12)',
    borderColor: 'rgba(255,45,111,0.55)',
  },
  statusText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    lineHeight: 13,
    transform: [{rotate: '-45deg'}],
  },
  content: {flex: 1},
  title: {fontFamily: 'PressStart2P-Regular', fontSize: 9, lineHeight: 15},
  reason: {color: 'rgba(255,255,255,0.80)', fontSize: 13, marginTop: 2, fontFamily: 'Oswald-SemiBold'},
});
