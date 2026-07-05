import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {endpoints} from '../constants/api';

const AuthContext = createContext(null);

function fetchWithTimeout(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, {...options, signal: controller.signal})
    .then(res => { clearTimeout(id); return res; })
    .catch(err => {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Check your connection and try again.');
      }
      throw err;
    });
}

export function AuthProvider({children}) {
  const [user, setUser]                   = useState(null);
  const [token, setToken]                 = useState(null);
  const [loading, setLoading]             = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  useEffect(() => {
    async function hydrate() {
      try {
        const [creds, u] = await Promise.all([
          Keychain.getGenericPassword({service: 'streakfight_token'}),
          AsyncStorage.getItem('user'),
        ]);
        if (!creds || !u) return;
        const parsed = JSON.parse(u);
        const tok = creds.password;

        if (!parsed.username) {
          // Username missing locally — validate token and fetch real profile.
          // This handles stale installs where login saved {id, email} only.
          try {
            const res = await fetchWithTimeout(
              `${endpoints.profile(parsed.id)}`,
              {headers: {Authorization: `Bearer ${tok}`}},
              8000,
            );
            if (res.status === 401) {
              // Expired/invalid token — clear and fall through to login screen
              await Keychain.resetGenericPassword({service: 'streakfight_token'});
              await AsyncStorage.removeItem('user');
              return;
            }
            if (res.ok) {
              const profile = await res.json();
              if (profile.username) {
                parsed.username = profile.username;
                await AsyncStorage.setItem('user', JSON.stringify(parsed));
              } else {
                // Valid token, user genuinely has no username yet
                setToken(tok);
                setUser(parsed);
                setNeedsUsername(true);
                return;
              }
            }
          } catch {
            // Network error — credentials may still be valid; don't clear them.
            // Fall through to AuthScreen (loading=false, user=null) so user can retry.
            return;
          }
        }

        setToken(tok);
        setUser(parsed);
      } catch {
        // ignore corrupt storage
      } finally {
        setLoading(false);
      }
    }
    hydrate();
  }, []);

  async function signup(email, password, username, fighterColor = 'pink') {
    const res = await fetchWithTimeout(endpoints.signup, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password, username, fighter_color: fighterColor}),
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
    const res = await fetchWithTimeout(endpoints.login, {
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
    const u = {id: data.user_id, email, username: data.username || null};
    await _persist(data.access_token, u);
    if (!data.has_username) setNeedsUsername(true);
  }

  async function saveUsername(username) {
    const res = await fetchWithTimeout(endpoints.setUsername, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      body: JSON.stringify({username}),
    });
    if (!res.ok) {
      let msg = 'Could not save username';
      try { msg = (await res.json()).detail || msg; } catch (_) {}
      throw new Error(msg);
    }
    const updated = {...user, username};
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    setNeedsUsername(false);
  }

  async function _persist(t, u) {
    setToken(t);
    setUser(u);
    await Keychain.setGenericPassword('token', t, {service: 'streakfight_token'});
    await AsyncStorage.setItem('user', JSON.stringify(u));
  }

  const _clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Keychain.resetGenericPassword({service: 'streakfight_token'});
    await AsyncStorage.removeItem('user');
  }, []);

  async function logout() {
    await _clearSession();
  }

  // Wraps fetch with the auth header. On 401 → clears session (sends user to login screen).
  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const res = await fetchWithTimeout(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      await _clearSession();
      throw new Error('Session expired. Please sign in again.');
    }
    return res;
  }, [token, _clearSession]);

  return (
    <AuthContext.Provider value={{user, token, loading, needsUsername, signup, login, logout, saveUsername, fetchWithAuth}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
