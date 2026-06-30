import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, HardCard} from '../components/ArcadeUI';

export default function InviteJoinScreen({navigation, route}) {
  const {code} = route.params || {};
  const {token} = useAuth();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    fetch(endpoints.inviteInfo(code))
      .then(r => r.json())
      .then(data => setBattle(data))
      .catch(() => Alert.alert('Invalid invite', 'This invite link is expired or invalid.'))
      .finally(() => setLoading(false));
  }, [code]);

  async function join() {
    setJoining(true);
    try {
      const res = await fetch(endpoints.joinViaCode(code), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not join battle');
      }
      Alert.alert('Joined!', `You are now fighting in "${battle?.habit_name}".`, [
        {text: "Let's go!", onPress: () => navigation.replace('Main')},
      ]);
    } catch (e) {
      Alert.alert('Join failed', e.message || 'Please try again.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ArcadeBackdrop />
      <ArcadeTopBar center="CHALLENGE RECEIVED" right="CPU" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.cyan} size="large" />
        </View>
      ) : !battle ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Invite expired or invalid.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.headline}>YOU HAVE BEEN{'\n'}CHALLENGED</Text>
          <HardCard borderColor={C.pink} shadowColor="rgba(255,45,111,0.3)" style={styles.card}>
            <Text style={styles.habitLabel}>HABIT</Text>
            <Text style={styles.habitName}>{battle.habit_name}</Text>
            {battle.habit_description ? (
              <Text style={styles.habitDesc}>{battle.habit_description}</Text>
            ) : null}
            <View style={styles.divider} />
            <Text style={styles.membersText}>
              {battle.members_count || '?'} fighter{battle.members_count !== 1 ? 's' : ''} already in
            </Text>
          </HardCard>

          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
            onPress={join}
            disabled={joining}
            activeOpacity={0.85}>
            {joining
              ? <ActivityIndicator color="#05030a" />
              : <Text style={styles.joinBtnText}>ACCEPT CHALLENGE ▶</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.declineBtn}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  content: {flex: 1, padding: 20},
  headline: {
    fontFamily: 'PressStart2P-Regular', fontSize: 16, color: C.yellow,
    lineHeight: 28, letterSpacing: 1, marginBottom: 28,
    textShadowColor: C.pink, textShadowOffset: {width: 3, height: 3}, textShadowRadius: 0,
  },
  card: {marginBottom: 28},
  habitLabel: {
    fontFamily: 'PressStart2P-Regular', fontSize: 7, color: C.white70,
    letterSpacing: 2, paddingHorizontal: 16, paddingTop: 16, marginBottom: 6,
  },
  habitName: {
    fontFamily: 'PressStart2P-Regular', fontSize: 13, color: '#fff',
    lineHeight: 22, paddingHorizontal: 16, marginBottom: 4,
  },
  habitDesc: {
    fontSize: 14, fontFamily: 'Oswald-SemiBold', color: C.white70,
    paddingHorizontal: 16, lineHeight: 20, marginBottom: 4,
  },
  divider: {height: 1, backgroundColor: C.white15, marginHorizontal: 16, marginVertical: 12},
  membersText: {
    fontSize: 13, fontFamily: 'Oswald-Bold', color: C.cyan,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  joinBtn: {
    backgroundColor: C.pink, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
  },
  joinBtnDisabled: {opacity: 0.6},
  joinBtnText: {color: '#fff', fontFamily: 'PressStart2P-Regular', fontSize: 11, letterSpacing: 1, lineHeight: 18},
  declineBtn: {alignItems: 'center', marginTop: 16, padding: 12},
  declineBtnText: {fontFamily: 'Oswald-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.35)'},
  errorText: {fontFamily: 'Oswald-SemiBold', fontSize: 16, color: C.white70, marginBottom: 20},
  backBtn: {borderWidth: 2, borderColor: C.white15, paddingHorizontal: 20, paddingVertical: 12},
  backBtnText: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: C.white70, letterSpacing: 1, lineHeight: 16},
});
