import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

function FloatingOrbs() {
  const o1 = useRef(new Animated.Value(0)).current;
  const o2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (v, dur, delay) => Animated.loop(Animated.sequence([
      Animated.timing(v, {toValue: -18, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(v, {toValue: 0,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
    loop(o1, 4000, 0);
    loop(o2, 5200, 600);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{position: 'absolute', width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(170,0,255,0.14)', top: -80, left: -80, transform: [{translateY: o1}]}} />
      <Animated.View style={{position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,0,112,0.1)', bottom: 120, right: -50, transform: [{translateY: o2}]}} />
    </View>
  );
}

export default function UsernameSetupScreen() {
  const {saveUsername} = useAuth();
  const [username, setUsername]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [usernameStatus, setStatus]     = useState(null); // null | 'checking' | 'available' | 'taken'
  const checkTimer                      = useRef(null);

  const slideAnim = useRef(new Animated.Value(40)).current;
  const opAnim    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {toValue: 0, tension: 180, friction: 9, useNativeDriver: true}),
      Animated.timing(opAnim,    {toValue: 1, duration: 300, useNativeDriver: true}),
    ]).start();
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, []);

  const checkUsername = useCallback((val) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val || val.length < 2) { setStatus(null); return; }
    setStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(endpoints.checkUsername(val));
        const json = await res.json();
        setStatus(json.available ? 'available' : 'taken');
      } catch {
        setStatus(null);
      }
    }, 500);
  }, []);

  async function handleSave() {
    if (!username.trim()) { Alert.alert('Required', 'Pick a fighter name'); return; }
    if (usernameStatus === 'taken')    { Alert.alert('Taken', 'That username is already taken. Choose a different one.'); return; }
    if (usernameStatus === 'checking') { Alert.alert('Hold on', 'Still checking availability...'); return; }
    setLoading(true);
    try {
      await saveUsername(username.trim());
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const btnScale = useRef(new Animated.Value(1)).current;
  function btnIn()  { Animated.spring(btnScale, {toValue: 0.96, tension: 300, friction: 8, useNativeDriver: true}).start(); }
  function btnOut() { Animated.spring(btnScale, {toValue: 1,    tension: 300, friction: 8, useNativeDriver: true}).start(); }

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingOrbs />
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <Animated.View style={[styles.container, {opacity: opAnim, transform: [{translateY: slideAnim}]}]}>

          <Text style={styles.emoji}>⚔️</Text>
          <Text style={styles.heading}>One last thing.</Text>
          <Text style={styles.sub}>
            Pick your fighter name — this is how your squad will know you in every battle.
            You can't change it later.
          </Text>

          <View style={styles.fieldLabelRow}>
            <Text style={styles.label}>FIGHTER NAME</Text>
            {usernameStatus === 'checking'  && <ActivityIndicator size="small" color={C.white40} style={{marginLeft: 8}} />}
            {usernameStatus === 'available' && <Text style={styles.available}>✓ available</Text>}
            {usernameStatus === 'taken'     && <Text style={styles.taken}>✗ already taken</Text>}
          </View>

          <TextInput
            style={[
              styles.input,
              usernameStatus === 'available' && styles.inputAvailable,
              usernameStatus === 'taken'     && styles.inputTaken,
            ]}
            placeholder="your unique alias"
            placeholderTextColor={C.white40}
            value={username}
            onChangeText={(val) => { setUsername(val); checkUsername(val); }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          <Animated.View style={{transform: [{scale: btnScale}]}}>
            <TouchableOpacity
              style={[styles.btn, (usernameStatus === 'taken' || !username) && styles.btnDisabled]}
              onPress={handleSave}
              onPressIn={btnIn}
              onPressOut={btnOut}
              disabled={loading || usernameStatus === 'taken' || !username}
              activeOpacity={1}>
              {loading
                ? <ActivityIndicator color={C.bgDeep} />
                : <Text style={styles.btnText}>Lock it in →</Text>}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.hint}>
            No spaces. Max 30 characters.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      {flex: 1, backgroundColor: C.bg},
  container: {flex: 1, paddingHorizontal: 28, paddingTop: 60},
  emoji:     {fontSize: 52, marginBottom: 16},
  heading:   {fontSize: 30, fontWeight: '900', color: C.yellow, letterSpacing: 0.5,
    textShadowColor: C.pink, textShadowRadius: 12, textShadowOffset: {width: 0, height: 0}},
  sub:       {fontSize: 15, color: C.white70, lineHeight: 23, marginTop: 10, marginBottom: 34},

  fieldLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  label:     {fontSize: 11, fontWeight: '800', color: C.white40, letterSpacing: 2},
  available: {fontSize: 11, fontWeight: '800', color: C.lime, marginLeft: 8},
  taken:     {fontSize: 11, fontWeight: '800', color: C.red,  marginLeft: 8},

  input: {
    backgroundColor: C.white08,
    borderWidth: 1.5, borderColor: C.white15,
    borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 17, color: C.white, fontWeight: '700',
    marginBottom: 24,
  },
  inputAvailable: {borderColor: C.lime, backgroundColor: 'rgba(184,255,0,0.07)'},
  inputTaken:     {borderColor: C.red,  backgroundColor: 'rgba(255,59,59,0.07)'},

  btn: {
    backgroundColor: C.pink, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.6, shadowRadius: 22,
    shadowOffset: {width: 0, height: 5}, elevation: 12,
  },
  btnDisabled: {opacity: 0.45},
  btnText:     {color: C.white, fontWeight: '900', fontSize: 16, letterSpacing: 1.5},
  hint:        {textAlign: 'center', color: C.white40, fontSize: 13, marginTop: 16},
});
