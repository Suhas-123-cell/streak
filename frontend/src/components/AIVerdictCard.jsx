import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function AIVerdictCard({checkin}) {
  if (!checkin) return null;
  const pass = checkin.ai_verified;

  return (
    <View style={[styles.card, pass ? styles.pass : styles.fail]}>
      <Text style={styles.emoji}>{pass ? '✅' : '❌'}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, {color: pass ? '#15803D' : '#B91C1C'}]}>
          {pass ? 'Verified' : 'Rejected'} — {checkin.ai_score}/100
        </Text>
        <Text style={styles.reason}>{checkin.ai_reasoning}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14,
    marginVertical: 8, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  pass: {backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0'},
  fail: {backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA'},
  emoji: {fontSize: 24},
  content: {flex: 1},
  title: {fontWeight: '700', fontSize: 14},
  reason: {color: '#6B7280', fontSize: 13, marginTop: 2},
});
