import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';
const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function ProfileScreen() {
  const {user, token, logout} = useAuth();
  const [profile, setProfile] = useState(null);
  const [prefs, setPrefs] = useState({enabled: true, reminder_time: '21:00'});

  const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'};

  useEffect(() => {
    fetch(endpoints.profile(user.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        if (data.preferences) setPrefs(p => ({...p, ...data.preferences}));
      })
      .catch(() => {});
  }, []);

  async function savePref(updates) {
    try {
      await fetch(endpoints.profile(user.id), {
        method: 'PUT', headers,
        body: JSON.stringify(updates),
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function cycleTime() {
    const idx = HOURS.indexOf(prefs.reminder_time);
    const next = HOURS[(idx + 1) % HOURS.length];
    setPrefs(p => ({...p, reminder_time: next}));
    savePref({reminder_time: next});
  }

  function toggleReminder(val) {
    setPrefs(p => ({...p, enabled: val}));
    savePref({reminders_enabled: val});
  }

  const initial = (profile?.username || user?.email || '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.username}>{profile?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{profile?.total_wins || 0}</Text>
            <Text style={styles.statLabel}>Total Wins</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Reminders</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Daily Reminder</Text>
              <Text style={styles.settingHint}>Get nudged if you haven't checked in</Text>
            </View>
            <Switch
              value={prefs.enabled}
              onValueChange={toggleReminder}
              trackColor={{false: '#E5E7EB', true: '#A78BFA'}}
              thumbColor={prefs.enabled ? PURPLE : '#9CA3AF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Reminder Time</Text>
              <Text style={styles.settingHint}>Tap to cycle through hours</Text>
            </View>
            <TouchableOpacity style={styles.timePill} onPress={cycleTime}>
              <Text style={styles.timeText}>{prefs.reminder_time}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {padding: 20, paddingBottom: 60},
  avatarWrap: {alignItems: 'center', paddingVertical: 24},
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
  },
  avatarText: {color: '#fff', fontSize: 32, fontWeight: '800'},
  username: {fontSize: 22, fontWeight: '800', color: '#111827'},
  email: {fontSize: 13, color: '#9CA3AF', marginTop: 4},
  statsRow: {flexDirection: 'row', justifyContent: 'center', marginBottom: 28},
  statCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center', minWidth: 110,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
  },
  statNum: {fontSize: 32, fontWeight: '800', color: PURPLE},
  statLabel: {fontSize: 12, color: '#9CA3AF', marginTop: 4},
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
    marginBottom: 28,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  settingTitle: {fontSize: 15, fontWeight: '600', color: '#111827'},
  settingHint: {fontSize: 12, color: '#9CA3AF', marginTop: 2},
  divider: {height: 1, backgroundColor: '#F3F4F6'},
  timePill: {
    backgroundColor: '#EDE9FE', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  timeText: {color: PURPLE, fontWeight: '700', fontSize: 15},
  logoutBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  logoutText: {color: '#EF4444', fontWeight: '700', fontSize: 15},
});
