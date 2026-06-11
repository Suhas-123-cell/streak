import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
  Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {C} from '../constants/theme';

export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const topSlide  = useRef(new Animated.Value(-30)).current;
  const topOp     = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(40)).current;
  const formOp    = useRef(new Animated.Value(0)).current;
  const blobScale = useRef(new Animated.Value(0.85)).current;
  const drip1     = useRef(new Animated.Value(0)).current;
  const drip2     = useRef(new Animated.Value(0)).current;
  const drip3     = useRef(new Animated.Value(0)).current;

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
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!username) {Alert.alert('Required', 'Pick a fighter name'); return;}
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
              <Animated.View style={[styles.drip, styles.drip1, {transform: [{translateY: dripTY(drip1, 20)}]}]} />
              <Animated.View style={[styles.drip, styles.drip2, {transform: [{translateY: dripTY(drip2, 26)}]}]} />
              <Animated.View style={[styles.drip, styles.drip3, {transform: [{translateY: dripTY(drip3, 18)}]}]} />
              <Text style={styles.logoLine}>STREAK</Text>
              <Text style={styles.logoLine}>FIGHT</Text>
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
                  <Text style={[styles.fieldLabel, focusedField === 'username' && styles.fieldLabelFocused]}>
                    FIGHTER NAME
                  </Text>
                  <Text style={styles.fieldSubLabel}>Your display name in battles</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'username' && styles.inputFocused]}
                    placeholder="your alias"
                    placeholderTextColor={C.white40}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
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

              <Animated.View style={{transform: [{scale: btnScale}], marginTop: 10}}>
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
    backgroundColor: '#EEEDF8',
    borderRadius: 70,
    paddingHorizontal: 28, paddingVertical: 18,
    marginBottom: 18,
    alignSelf: 'flex-start',
    shadowColor: C.cyan,
    shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: {width: 0, height: 0},
    elevation: 16, overflow: 'visible',
  },
  logoLine: {
    fontSize: 40, fontWeight: '900', color: C.yellow,
    letterSpacing: 4,
    textShadowColor: C.cyan, textShadowRadius: 8,
    textShadowOffset: {width: 2, height: 2},
    lineHeight: 46,
  },
  drip: {
    position: 'absolute', bottom: -6,
    width: 10, height: 16, borderRadius: 5, backgroundColor: C.yellow,
  },
  drip1: {left: '20%'},
  drip2: {left: '45%'},
  drip3: {left: '68%'},
  tagline: {fontSize: 14, color: C.white40, fontWeight: '500', letterSpacing: 0.4},

  modeSwitcher: {
    flexDirection: 'row', gap: 20, marginBottom: 28,
    borderBottomWidth: 1, borderBottomColor: C.white15, paddingBottom: 14,
  },
  modeTab: {fontSize: 15, fontWeight: '600', color: C.white40, paddingBottom: 4},
  modeTabActive: {
    color: C.yellow, fontWeight: '800',
    borderBottomWidth: 2, borderBottomColor: C.yellow,
  },

  form: {gap: 18},
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.white40,
    letterSpacing: 1.5, marginBottom: 8,
  },
  fieldSubLabel: {fontSize: 12, color: C.white40, marginBottom: 6, marginTop: -4},
  fieldLabelFocused: {color: C.cyan},
  input: {
    backgroundColor: C.white08,
    borderWidth: 1, borderColor: C.white15,
    borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: C.white,
  },
  inputFocused: {
    borderColor: C.cyan,
    backgroundColor: 'rgba(78,201,232,0.08)',
  },

  btn: {
    backgroundColor: C.yellow, borderRadius: 14,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: C.yellow, shadowOpacity: 0.4,
    shadowRadius: 14, shadowOffset: {width: 0, height: 4},
    elevation: 8,
  },
  btnText: {color: C.bgDeep, fontWeight: '900', fontSize: 15, letterSpacing: 1.5},

  switchWrap: {marginTop: 22, alignItems: 'center'},
  switchText: {color: C.cyan, fontSize: 14, fontWeight: '600'},
});
