import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {endpoints} from '../constants/api';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Keychain.getGenericPassword({service: 'streakfight_token'}),
      AsyncStorage.getItem('user'),
    ]).then(([creds, u]) => {
      if (creds && u) {
        setToken(creds.password);
        setUser(JSON.parse(u));
      }
    }).catch(() => {
      // Keychain or storage unavailable — start unauthenticated
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  async function signup(email, password, username) {
    const res = await fetch(endpoints.signup, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password, username}),
    });
    if (!res.ok) {
      let msg = 'Signup failed';
      try { msg = (await res.json()).detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    await _persist(data.access_token, {id: data.user_id, email, username});
  }

  async function login(email, password) {
    const res = await fetch(endpoints.login, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
    });
    if (!res.ok) {
      let msg = 'Invalid email or password';
      try { msg = (await res.json()).detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    await _persist(data.access_token, {id: data.user_id, email});
  }

  async function _persist(t, u) {
    setToken(t);
    setUser(u);
    await Keychain.setGenericPassword('token', t, {service: 'streakfight_token'});
    await AsyncStorage.setItem('user', JSON.stringify(u));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await Keychain.resetGenericPassword({service: 'streakfight_token'});
    await AsyncStorage.removeItem('user');
  }

  return (
    <AuthContext.Provider value={{user, token, loading, signup, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
