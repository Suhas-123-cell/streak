import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch, TouchableOpacity, Alert, Platform,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function ProfileScreen() {
  const {user, token, logout} = useAuth();
  const [profile, setProfile] = useState(null);
  const [prefs, setPrefs] = useState({enabled: true, reminder_time: '21:00', timezone: 'Asia/Kolkata'});
  const [saving, setSaving] = useState(false);

  const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'};

  useEffect(() => {
    fetch(endpoints.profile(user.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        if (data.preferences) setPrefs(p => ({...p, ...data.preferences}));
      });
  }, []);

  async function save(updates) {
    setSaving(true);
    try {
      await fetch(endpoints.profile(user.id), {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function cycleTime() {
    const idx = HOURS.indexOf(prefs.reminder_time);
    const next = HOURS[(idx + 1) % HOURS.length];
    const updated = {...prefs, reminder_time: next};
    setPrefs(updated);
    save({reminder_time: next});
  }

  function toggleReminder(val) {
    const updated = {...prefs, enabled: val};
    setPrefs(updated);
    save({reminders_enabled: val});
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.username || user?.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{profile?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.total_wins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Daily Reminder</Text>
            <Switch
              value={prefs.enabled}
              onValueChange={toggleReminder}
              trackColor={{true: '#6C47FF'}}
              thumbColor={prefs.enabled ? '#fff' : '#888'}
            />
          </View>
          <View style={[styles.row, {marginTop: 16}]}>
            <Text style={styles.rowLabel}>Reminder Time</Text>
            <TouchableOpacity style={styles.timePill} onPress={cycleTime}>
              <Text style={styles.timeText}>{prefs.reminder_time}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tap the time to cycle through hours</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A1A'},
  content: {padding: 20, alignItems: 'center', paddingBottom: 60},
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {color: '#fff', fontSize: 32, fontWeight: '800'},
  username: {color: '#fff', fontSize: 22, fontWeight: '800'},
  email: {color: '#888', fontSize: 13, marginTop: 4, marginBottom: 16},
  statsRow: {flexDirection: 'row', gap: 24, marginBottom: 24},
  stat: {alignItems: 'center'},
  statNum: {color: '#6C47FF', fontSize: 28, fontWeight: '800'},
  statLabel: {color: '#888', fontSize: 12, marginTop: 2},
  sectionTitle: {
    color: '#A78BFF', fontSize: 13, fontWeight: '700',
    alignSelf: 'flex-start', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  card: {
    backgroundColor: '#12122A', borderRadius: 14, padding: 16,
    width: '100%', marginBottom: 20,
  },
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  rowLabel: {color: '#ccc', fontSize: 15},
  timePill: {
    backgroundColor: '#6C47FF', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  timeText: {color: '#fff', fontWeight: '700', fontSize: 15},
  hint: {color: '#555', fontSize: 11, marginTop: 8},
  logoutBtn: {
    backgroundColor: '#1A0A0A', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 40, borderWidth: 1, borderColor: '#FF4444',
  },
  logoutText: {color: '#FF4444', fontWeight: '700', fontSize: 15},
});
