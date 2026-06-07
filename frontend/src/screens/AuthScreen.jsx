import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
  Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';

const BG = '#F8F7F4';
const ACCENT = '#7C3AED';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const TEXT_3 = '#A8A29E';
const BORDER = '#E7E5E4';

export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Entrance animations
  const topSlide = useRef(new Animated.Value(-24)).current;
  const topOp = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(36)).current;
  const formOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(topSlide, {toValue: 0, tension: 55, friction: 9, useNativeDriver: true}),
      Animated.timing(topOp, {toValue: 1, duration: 300, useNativeDriver: true}),
      Animated.spring(formSlide, {toValue: 0, delay: 140, tension: 60, friction: 8, useNativeDriver: true}),
      Animated.timing(formOp, {toValue: 1, duration: 280, delay: 140, useNativeDriver: true}),
    ]).start();
  }, []);

  // Mode switch animation
  const modeAnim = useRef(new Animated.Value(0)).current;
  function switchMode(newMode) {
    Animated.sequence([
      Animated.timing(formOp, {toValue: 0.4, duration: 80, useNativeDriver: true}),
      Animated.timing(formOp, {toValue: 1, duration: 180, useNativeDriver: true}),
    ]).start();
    setMode(newMode);
  }

  // Submit button press feedback
  const btnScale = useRef(new Animated.Value(1)).current;
  function btnPressIn() {
    Animated.spring(btnScale, {toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10}).start();
  }
  function btnPressOut() {
    Animated.spring(btnScale, {toValue: 1, useNativeDriver: true, tension: 300, friction: 10}).start();
  }

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!username) {Alert.alert('Required', 'Choose a username'); return;}
        await signup(email, password, username);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  function inputStyle(field) {
    return [styles.input, focusedField === field && styles.inputFocused];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Animated.View style={[
            styles.top,
            {opacity: topOp, transform: [{translateY: topSlide}]},
          ]}>
            <Text style={styles.logoEmoji}>⚔️</Text>
            <Text style={styles.appName}>Streak Fight</Text>
            <Text style={styles.tagline}>Your group knows when you skip.</Text>
          </Animated.View>

          <Animated.View style={{opacity: formOp, transform: [{translateY: formSlide}]}}>
            <View style={styles.modeSwitcher}>
              <TouchableOpacity onPress={() => switchMode('login')}>
                <Text style={[styles.modeLink, mode === 'login' && styles.modeLinkActive]}>
                  Log In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => switchMode('signup')}>
                <Text style={[styles.modeLink, mode === 'signup' && styles.modeLinkActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {mode === 'signup' && (
                <View style={styles.fieldWrap}>
                  <Text style={[styles.fieldLabel, focusedField === 'username' && styles.fieldLabelFocused]}>
                    Username
                  </Text>
                  <TextInput
                    style={inputStyle('username')}
                    placeholder="your fighter name"
                    placeholderTextColor={TEXT_3}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, focusedField === 'email' && styles.fieldLabelFocused]}>
                  Email
                </Text>
                <TextInput
                  style={inputStyle('email')}
                  placeholder="you@example.com"
                  placeholderTextColor={TEXT_3}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.fieldLabel, focusedField === 'password' && styles.fieldLabelFocused]}>
                  Password
                </Text>
                <TextInput
                  style={inputStyle('password')}
                  placeholder="••••••••"
                  placeholderTextColor={TEXT_3}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <Animated.View style={{transform: [{scale: btnScale}], marginTop: 8}}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={submit}
                  onPressIn={btnPressIn}
                  onPressOut={btnPressOut}
                  disabled={loading}
                  activeOpacity={1}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>
                      {mode === 'login' ? 'Continue' : 'Join the fight'}
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
  safe: {flex: 1, backgroundColor: BG},
  kav: {flex: 1},
  scroll: {flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40},

  top: {paddingTop: 64, marginBottom: 44},
  logoEmoji: {fontSize: 36},
  appName: {fontSize: 32, fontWeight: '800', color: TEXT_1, marginTop: 10},
  tagline: {fontSize: 16, color: TEXT_2, marginTop: 8, lineHeight: 24},

  modeSwitcher: {flexDirection: 'row', gap: 24, marginBottom: 32},
  modeLink: {
    fontSize: 15, fontWeight: '400', color: TEXT_3,
    textDecorationLine: 'underline',
  },
  modeLinkActive: {fontWeight: '700', color: TEXT_1, textDecorationLine: 'none'},

  form: {gap: 20},
  fieldWrap: {},
  fieldLabel: {fontSize: 11, fontWeight: '600', color: TEXT_3, marginBottom: 6},
  fieldLabelFocused: {color: ACCENT},
  input: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 12, fontSize: 16, color: TEXT_1,
    backgroundColor: 'transparent',
  },
  inputFocused: {borderBottomColor: ACCENT},

  btn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},

  switchWrap: {marginTop: 20, alignItems: 'center'},
  switchText: {color: ACCENT, fontSize: 13},
});
