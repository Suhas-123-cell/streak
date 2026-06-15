import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
  Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

// ── Floating ambient orbs ─────────────────────────────────────────
function FloatingOrbs() {
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;
  const orb4Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (val, dur, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {toValue: -20, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(val, {toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ])
      ).start();

    makeLoop(orb1Y, 3400, 0);
    makeLoop(orb2Y, 4200, 600);
    makeLoop(orb3Y, 2900, 1100);
    makeLoop(orb4Y, 3800, 300);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', width: 320, height: 320, borderRadius: 160,
        backgroundColor: 'rgba(170,0,255,0.15)',
        top: -120, left: -120,
        transform: [{translateY: orb1Y}],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(255,0,112,0.12)',
        top: 80, right: -80,
        transform: [{translateY: orb2Y}],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(0,229,255,0.09)',
        bottom: 180, left: -40,
        transform: [{translateY: orb3Y}],
      }} />
      <Animated.View style={{
        position: 'absolute', width: 130, height: 130, borderRadius: 65,
        backgroundColor: 'rgba(184,255,0,0.08)',
        bottom: 60, right: 10,
        transform: [{translateY: orb4Y}],
      }} />
    </View>
  );
}

export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [mode, setMode]           = useState('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [username, setUsername]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const checkTimer = useRef(null);

  const checkUsername = useCallback((val) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val || val.length < 2) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(endpoints.checkUsername(val));
        const json = await res.json();
        setUsernameStatus(json.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  }, []);

  useEffect(() => () => { if (checkTimer.current) clearTimeout(checkTimer.current); }, []);

  const topSlide  = useRef(new Animated.Value(-30)).current;
  const topOp     = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const formOp    = useRef(new Animated.Value(0)).current;
  const blobScale = useRef(new Animated.Value(0.85)).current;
  const drip1     = useRef(new Animated.Value(0)).current;
  const drip2     = useRef(new Animated.Value(0)).current;
  const drip3     = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(blobScale, {toValue: 1, tension: 70, friction: 7, useNativeDriver: true}),
      Animated.spring(topSlide, {toValue: 0, tension: 55, friction: 9, useNativeDriver: true}),
      Animated.timing(topOp, {toValue: 1, duration: 300, useNativeDriver: true}),
      Animated.spring(formSlide, {toValue: 0, delay: 180, tension: 60, friction: 8, useNativeDriver: true}),
      Animated.timing(formOp, {toValue: 1, duration: 280, delay: 180, useNativeDriver: true}),
      Animated.timing(drip1, {toValue: 1, duration: 400, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(drip2, {toValue: 1, duration: 460, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(drip3, {toValue: 1, duration: 380, delay: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {toValue: 1.09, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOp, {toValue: 0.15, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {toValue: 1, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
          Animated.timing(glowOp, {toValue: 0.4, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        ]),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, []);

  function switchMode(newMode) {
    Animated.sequence([
      Animated.timing(formOp, {toValue: 0, duration: 100, useNativeDriver: true}),
      Animated.timing(formOp, {toValue: 1, duration: 200, useNativeDriver: true}),
    ]).start();
    setMode(newMode);
  }

  const btnScale = useRef(new Animated.Value(1)).current;
  function btnIn() {
    Animated.spring(btnScale, {toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10}).start();
  }
  function btnOut() {
    Animated.spring(btnScale, {toValue: 1, useNativeDriver: true, tension: 300, friction: 10}).start();
  }

  async function submit() {
    if (!email || !password) return;
    if (mode === 'signup') {
      if (!username) { Alert.alert('Required', 'Pick a fighter name'); return; }
      if (usernameStatus === 'taken') { Alert.alert('Taken', 'That username is already taken. Choose a different one.'); return; }
      if (usernameStatus === 'checking') { Alert.alert('Hold on', 'Still checking username availability...'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, username);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  const dripTY = (a, dist) => a.interpolate({inputRange: [0, 1], outputRange: [0, dist]});

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingOrbs />
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Logo ── */}
          <Animated.View style={[styles.top, {opacity: topOp, transform: [{translateY: topSlide}]}]}>
            <Animated.View style={[styles.blobWrap, {transform: [{scale: blobScale}]}]}>
              <Animated.View style={[styles.drip, styles.drip1, {transform: [{translateY: dripTY(drip1, 22)}]}]} />
              <Animated.View style={[styles.drip, styles.drip2, {transform: [{translateY: dripTY(drip2, 28)}]}]} />
              <Animated.View style={[styles.drip, styles.drip3, {transform: [{translateY: dripTY(drip3, 20)}]}]} />
              <Text style={styles.logoLine}>STREAK</Text>
              <Text style={[styles.logoLine, styles.logoLineTwo]}>FIGHT</Text>
            </Animated.View>
            <Text style={styles.tagline}>your group knows when you skip.</Text>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View style={{opacity: formOp, transform: [{translateY: formSlide}]}}>
            <View style={styles.modeSwitcher}>
              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => switchMode('signup')}>
                <Text style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'signup' && (
                <View>
                  <View style={styles.fieldLabelRow}>
                    <Text style={[styles.fieldLabel, focusedField === 'username' && styles.fieldLabelFocused]}>
                      FIGHTER NAME
                    </Text>
                    {usernameStatus === 'checking' && (
                      <ActivityIndicator size="small" color={C.white40} style={{marginLeft: 8}} />
                    )}
                    {usernameStatus === 'available' && (
                      <Text style={styles.usernameAvailable}>✓ available</Text>
                    )}
                    {usernameStatus === 'taken' && (
                      <Text style={styles.usernameTaken}>✗ already taken</Text>
                    )}
                  </View>
                  <Text style={styles.fieldSubLabel}>Your unique display name in battles</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'username' && styles.inputFocused,
                      usernameStatus === 'available' && styles.inputAvailable,
                      usernameStatus === 'taken' && styles.inputTaken,
                    ]}
                    placeholder="pick something unique"
                    placeholderTextColor={C.white40}
                    value={username}
                    onChangeText={(val) => { setUsername(val); checkUsername(val); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}
              <View>
                <Text style={[styles.fieldLabel, focusedField === 'email' && styles.fieldLabelFocused]}>
                  EMAIL
                </Text>
                <TextInput
                  style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor={C.white40}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View>
                <Text style={[styles.fieldLabel, focusedField === 'password' && styles.fieldLabelFocused]}>
                  PASSWORD
                </Text>
                <TextInput
                  style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                  placeholder="••••••••"
                  placeholderTextColor={C.white40}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* ── Glowing CTA ── */}
              <View style={styles.btnContainer}>
                <Animated.View style={[styles.btnGlow, {opacity: glowOp, transform: [{scale: glowScale}]}]} />
                <Animated.View style={{transform: [{scale: btnScale}]}}>
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={submit}
                    onPressIn={btnIn}
                    onPressOut={btnOut}
                    disabled={loading}
                    activeOpacity={1}>
                    {loading ? (
                      <ActivityIndicator color={C.bgDeep} />
                    ) : (
                      <Text style={styles.btnText}>
                        {mode === 'login' ? "Let's Go →" : "Join the Fight →"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.switchWrap}
              onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.switchText}>
                {mode === 'login' ? 'New here? Create account' : 'Already in? Sign in'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  scroll: {flexGrow: 1, paddingHorizontal: 26, paddingBottom: 48},

  top: {paddingTop: 52, marginBottom: 40},

  blobWrap: {
    backgroundColor: C.bgDeep,
    borderRadius: 24,
    paddingHorizontal: 30, paddingVertical: 20,
    marginBottom: 30,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(255,0,112,0.6)',
    shadowColor: C.pink,
    shadowOpacity: 0.65, shadowRadius: 38,
    shadowOffset: {width: 0, height: 0},
    elevation: 24,
  },
  logoLine: {
    fontSize: 50, fontWeight: '900', color: C.yellow,
    letterSpacing: 7,
    textShadowColor: C.orange, textShadowRadius: 12,
    textShadowOffset: {width: 0, height: 0},
    lineHeight: 56,
  },
  logoLineTwo: {
    color: C.pink,
    textShadowColor: C.purple,
    textShadowRadius: 16,
    textShadowOffset: {width: 0, height: 0},
  },
  drip: {
    position: 'absolute', bottom: -8,
    width: 12, height: 20, borderRadius: 7, backgroundColor: C.pink,
  },
  drip1: {left: '18%'},
  drip2: {left: '44%'},
  drip3: {left: '70%'},
  tagline: {fontSize: 14, color: C.white40, fontWeight: '600', letterSpacing: 0.6},

  modeSwitcher: {
    flexDirection: 'row', gap: 20, marginBottom: 28,
    borderBottomWidth: 1, borderBottomColor: C.white15, paddingBottom: 14,
  },
  modeTab: {fontSize: 15, fontWeight: '700', color: C.white40, paddingBottom: 4},
  modeTabActive: {
    color: C.pink, fontWeight: '900',
    borderBottomWidth: 2.5, borderBottomColor: C.pink,
  },

  form: {gap: 18},
  fieldLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: C.white40,
    letterSpacing: 2,
  },
  fieldSubLabel: {fontSize: 12, color: C.white40, marginBottom: 6, marginTop: 2},
  fieldLabelFocused: {color: C.pink},
  usernameAvailable: {fontSize: 11, fontWeight: '800', color: C.lime, marginLeft: 8},
  usernameTaken: {fontSize: 11, fontWeight: '800', color: C.red, marginLeft: 8},
  inputAvailable: {borderColor: C.lime, backgroundColor: 'rgba(184,255,0,0.07)'},
  inputTaken: {borderColor: C.red, backgroundColor: 'rgba(255,59,59,0.07)'},
  input: {
    backgroundColor: C.white08,
    borderWidth: 1.5, borderColor: C.white15,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 15, color: C.white,
  },
  inputFocused: {
    borderColor: C.pink,
    backgroundColor: 'rgba(255,0,112,0.09)',
    shadowColor: C.pink,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 6,
  },

  btnContainer: {position: 'relative', marginTop: 10},
  btnGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18, backgroundColor: C.pink,
  },
  btn: {
    backgroundColor: C.pink, borderRadius: 18,
    paddingVertical: 19, alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.65,
    shadowRadius: 24, shadowOffset: {width: 0, height: 6},
    elevation: 14,
  },
  btnText: {color: C.white, fontWeight: '900', fontSize: 17, letterSpacing: 2},

  switchWrap: {marginTop: 26, alignItems: 'center'},
  switchText: {color: C.cyan, fontSize: 14, fontWeight: '700'},
});
