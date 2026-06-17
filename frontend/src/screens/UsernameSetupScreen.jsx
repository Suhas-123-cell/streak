import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, Animated,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, HardCard, ScreenTitle} from '../components/ArcadeUI';

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
      <ArcadeBackdrop />
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <Animated.View style={[styles.container, {opacity: opAnim, transform: [{translateY: slideAnim}]}]}>

          <ArcadeTopBar center="NEW FIGHTER" right="CPU" />
          <ScreenTitle subtitle="Pick the name your squad sees in every battle. You can't change it later.">
            CREATE{'\n'}FIGHTER
          </ScreenTitle>

          <HardCard
            borderColor={C.pink}
            shadowColor="rgba(255,45,111,0.30)"
            style={styles.dossier}
            innerStyle={styles.dossierInner}>
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
              placeholder="neon_striker"
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
                  : <Text style={styles.btnText}>LOCK IT IN ▶</Text>}
              </TouchableOpacity>
            </Animated.View>
          </HardCard>

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
  container: {flex: 1, paddingTop: 12},
  emoji:     {fontSize: 52, marginBottom: 16},
  heading:   {
    fontFamily: 'PressStart2P-Regular', fontSize: 13, color: '#FFD400', letterSpacing: 1, lineHeight: 24,
    textShadowColor: '#FF2D6F', textShadowRadius: 0, textShadowOffset: {width: 2, height: 2},
  },
  sub:       {fontSize: 15, color: 'rgba(255,255,255,0.80)', lineHeight: 24, marginTop: 12, marginBottom: 34, fontFamily: 'Oswald-SemiBold'},

  dossier: {marginHorizontal: 20, marginTop: 6},
  dossierInner: {padding: 16},
  fieldLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  label:     {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.50)', letterSpacing: 2, lineHeight: 14},
  available: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#9BE80C', marginLeft: 8, lineHeight: 14},
  taken:     {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FF3B3B', marginLeft: 8, lineHeight: 14},

  input: {
    backgroundColor: '#160f1e',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 14, color: '#FFFFFF', fontFamily: 'Oswald-SemiBold',
    marginBottom: 24,
  },
  inputAvailable: {borderColor: '#9BE80C', backgroundColor: 'rgba(155,232,12,0.07)'},
  inputTaken:     {borderColor: '#FF3B3B', backgroundColor: 'rgba(255,59,59,0.07)'},

  btn: {
    backgroundColor: '#FF2D6F', borderWidth: 3, borderColor: '#fff',
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#FF2D6F', shadowOpacity: 0.6, shadowRadius: 0,
    shadowOffset: {width: 5, height: 5}, elevation: 0,
  },
  btnDisabled: {opacity: 0.45},
  btnText:     {color: '#FFFFFF', fontFamily: 'PressStart2P-Regular', fontSize: 11, letterSpacing: 1, lineHeight: 20},
  hint:        {textAlign: 'center', color: 'rgba(255,255,255,0.50)', fontSize: 13, marginTop: 16, fontFamily: 'Oswald-SemiBold'},
});
