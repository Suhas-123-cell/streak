import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
} from 'react-native';
import {useAuth} from '../context/AuthContext';

const PURPLE = '#7C3AED';
const DARK_PURPLE = '#4C1D95';

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

  const inputStyle = field => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_PURPLE} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />

            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>⚔️</Text>
            </View>
            <Text style={styles.appLabel}>STREAK FIGHT</Text>
            <Text style={styles.heroHeadline}>{'Win habits.\nCrush friends.'}</Text>

            <View style={styles.pills}>
              <View style={styles.pill}><Text style={styles.pillText}>🤖 AI Verified</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>💀 Real Stakes</Text></View>
              <View style={styles.pill}><Text style={styles.pillText}>🔥 Daily Battles</Text></View>
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}>
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => setMode('signup')}>
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardSub}>
              {mode === 'login' ? 'Welcome back, warrior.' : 'Your streak journey starts now.'}
            </Text>

            <View style={styles.form}>
              {mode === 'signup' && (
                <View>
                  <Text style={styles.fieldLabel}>USERNAME</Text>
                  <TextInput
                    style={inputStyle('username')}
                    placeholder="Choose your fighter name"
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}
              <View>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <TextInput
                  style={inputStyle('email')}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TextInput
                  style={inputStyle('password')}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {mode === 'login' ? 'Enter the Arena →' : 'Start Fighting →'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.toggleWrap}
              onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.toggle}>
                {mode === 'login' ? 'New fighter? Sign up' : 'Already a fighter? Log in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: DARK_PURPLE},
  kav: {flex: 1},
  scroll: {flexGrow: 1},

  hero: {
    backgroundColor: DARK_PURPLE,
    paddingTop: 36, paddingBottom: 44,
    alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(124,58,237,0.3)', top: -60, right: -50,
  },
  circle2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(167,139,250,0.2)', bottom: 10, left: -30,
  },
  circle3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(196,181,253,0.15)', top: 20, left: 30,
  },
  iconWrap: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  iconEmoji: {fontSize: 38},
  appLabel: {
    color: 'rgba(196,181,253,0.8)', fontSize: 11, fontWeight: '800',
    letterSpacing: 4, marginBottom: 10,
  },
  heroHeadline: {
    color: '#fff', fontSize: 34, fontWeight: '900',
    textAlign: 'center', lineHeight: 40, marginBottom: 24,
  },
  pills: {flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center'},
  pill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  pillText: {color: '#fff', fontSize: 12, fontWeight: '600'},

  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
  },
  tabs: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: 14, padding: 4, marginBottom: 20,
  },
  tab: {flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center'},
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
    shadowOffset: {width: 0, height: 2}, elevation: 3,
  },
  tabText: {fontSize: 14, fontWeight: '600', color: '#9CA3AF'},
  tabTextActive: {color: '#111827'},
  cardSub: {fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center'},
  form: {gap: 14},
  fieldLabel: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF',
    letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    color: '#111827', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  inputFocused: {borderColor: PURPLE, backgroundColor: '#FAF5FF'},
  btn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: {width: 0, height: 4}, elevation: 6,
    marginTop: 4,
  },
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
  toggleWrap: {marginTop: 20, alignItems: 'center'},
  toggle: {color: PURPLE, fontSize: 14, fontWeight: '600'},
});
