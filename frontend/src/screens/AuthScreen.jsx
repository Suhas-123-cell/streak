import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
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

          <View style={styles.top}>
            <Text style={styles.logoEmoji}>⚔️</Text>
            <Text style={styles.appName}>Streak Fight</Text>
            <Text style={styles.tagline}>Your group knows when you skip.</Text>
          </View>

          <View style={styles.modeSwitcher}>
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={[styles.modeLink, mode === 'login' && styles.modeLinkActive]}>
                Log In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('signup')}>
              <Text style={[styles.modeLink, mode === 'signup' && styles.modeLinkActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Username</Text>
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
              <Text style={styles.fieldLabel}>Email</Text>
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
              <Text style={styles.fieldLabel}>Password</Text>
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

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {mode === 'login' ? 'Continue' : 'Join the fight'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchWrap}
            onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? 'New here? Create account' : 'Already in? Sign in'}
            </Text>
          </TouchableOpacity>

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
  input: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 12, fontSize: 16, color: TEXT_1,
    backgroundColor: 'transparent',
  },
  inputFocused: {borderBottomColor: ACCENT},

  btn: {
    backgroundColor: ACCENT, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},

  switchWrap: {marginTop: 20, alignItems: 'center'},
  switchText: {color: ACCENT, fontSize: 13},
});
