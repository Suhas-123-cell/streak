import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {endpoints} from '../constants/api';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'user']).then(([[, t], [, u]]) => {
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
      setLoading(false);
    });
  }, []);

  async function signup(email, password, username) {
    const res = await fetch(endpoints.signup, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password, username}),
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    const data = await res.json();
    await _persist(data.access_token, {id: data.user_id, email, username});
  }

  async function login(email, password) {
    const res = await fetch(endpoints.login, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password}),
    });
    if (!res.ok) throw new Error((await res.json()).detail);
    const data = await res.json();
    await _persist(data.access_token, {id: data.user_id, email});
  }

  async function _persist(t, u) {
    setToken(t);
    setUser(u);
    await AsyncStorage.setItem('token', t);
    await AsyncStorage.setItem('user', JSON.stringify(u));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove(['token', 'user']);
  }

  return (
    <AuthContext.Provider value={{user, token, loading, signup, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
