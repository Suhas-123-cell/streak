import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function AIVerdictCard({checkin}) {
  if (!checkin) return null;
  const pass = checkin.ai_verified;

  return (
    <View style={[styles.card, pass ? styles.pass : styles.fail]}>
      <Text style={styles.emoji}>{pass ? '✅' : '❌'}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>
          {pass ? 'Verified' : 'Rejected'} — {checkin.ai_score}/100
        </Text>
        <Text style={styles.reason}>{checkin.ai_reasoning}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    gap: 10,
  },
  pass: {backgroundColor: '#0D3320'},
  fail: {backgroundColor: '#3A0D0D'},
  emoji: {fontSize: 24},
  content: {flex: 1},
  title: {color: '#fff', fontWeight: '700', fontSize: 15},
  reason: {color: '#ccc', fontSize: 13, marginTop: 2},
});
