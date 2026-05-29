import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';

const PURPLE = '#7C3AED';

export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!username) { Alert.alert('Required', 'Choose a username'); return; }
        await signup(email, password, username);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}>
        <View style={styles.inner}>
          <Text style={styles.logo}>⚔️</Text>
          <Text style={styles.title}>Streak Fight</Text>
          <Text style={styles.sub}>Habit accountability battles</Text>

          <View style={styles.form}>
            {mode === 'signup' && (
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{mode === 'login' ? 'Log In' : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.toggle}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  kav: {flex: 1},
  inner: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
  logo: {textAlign: 'center', fontSize: 60, marginBottom: 8},
  title: {textAlign: 'center', fontSize: 30, fontWeight: '800', color: '#111827'},
  sub: {textAlign: 'center', fontSize: 14, color: '#9CA3AF', marginBottom: 40, marginTop: 6},
  form: {gap: 12, marginBottom: 20},
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    color: '#111827', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB',
  },
  btn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 6,
  },
  btnText: {color: '#fff', fontWeight: '800', fontSize: 16},
  toggle: {textAlign: 'center', color: PURPLE, fontSize: 14, fontWeight: '600'},
});
